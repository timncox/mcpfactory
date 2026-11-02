#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import * as XLSX from "xlsx";

const server = new McpServer({
  name: "spreadsheet-reader",
  version: "1.0.0",
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Validate that a file exists and has a supported extension.
 * Returns the resolved absolute path or throws a descriptive error.
 */
function validateFilePath(filePath: string): string {
  const resolved = path.resolve(filePath);

  if (!fs.existsSync(resolved)) {
    throw new Error(`File not found: ${resolved}`);
  }

  const ext = path.extname(resolved).toLowerCase();
  const supported = [".xlsx", ".xls", ".csv"];
  if (!supported.includes(ext)) {
    throw new Error(
      `Unsupported file type "${ext}". Supported types: ${supported.join(", ")}`
    );
  }

  return resolved;
}

/**
 * Read a workbook from disk. Handles .xlsx, .xls, and .csv transparently.
 */
function readWorkbook(filePath: string): XLSX.WorkBook {
  return XLSX.readFile(filePath, {
    cellDates: true,
    cellNF: true,
    cellText: true,
  });
}

/**
 * Convert a worksheet to an array of plain JSON objects.
 * The first row is treated as column headers.
 * If `maxRows` is provided, only that many data rows (excluding header) are returned.
 */
function sheetToJSON(
  sheet: XLSX.WorkSheet,
  maxRows?: number
): Record<string, unknown>[] {
  const allRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
    defval: null,
    raw: false,
  });

  if (maxRows !== undefined && maxRows > 0) {
    return allRows.slice(0, maxRows);
  }
  return allRows;
}

/**
 * Return the dimensions of a worksheet as { rows, columns }.
 */
function sheetDimensions(sheet: XLSX.WorkSheet): {
  rows: number;
  columns: number;
} {
  const ref = sheet["!ref"];
  if (!ref) {
    return { rows: 0, columns: 0 };
  }
  const range = XLSX.utils.decode_range(ref);
  return {
    rows: range.e.r - range.s.r + 1,
    columns: range.e.c - range.s.c + 1,
  };
}

// ---------------------------------------------------------------------------
// Tool: read_spreadsheet
// ---------------------------------------------------------------------------

server.tool(
  "read_spreadsheet",
  "Read a spreadsheet file and return structured JSON rows. Supports .xlsx, .xls, and .csv files. The first row is used as column headers.",
  {
    path: z.string().describe("Absolute path to the spreadsheet file"),
    sheet: z
      .string()
      .optional()
      .describe(
        "Optional sheet name to read. If omitted, reads the first sheet."
      ),
    max_rows: z
      .number()
      .int()
      .positive()
      .optional()
      .describe(
        "Optional maximum number of data rows to return (excludes the header row). Useful for previewing large files."
      ),
  },
  async ({ path: filePath, sheet: sheetName, max_rows: maxRows }) => {
    try {
      const resolved = validateFilePath(filePath);
      const workbook = readWorkbook(resolved);

      // Determine which sheet to read
      let targetSheetName: string;
      if (sheetName) {
        if (!workbook.SheetNames.includes(sheetName)) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    error: `Sheet "${sheetName}" not found. Available sheets: ${workbook.SheetNames.join(", ")}`,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }
        targetSheetName = sheetName;
      } else {
        targetSheetName = workbook.SheetNames[0];
      }

      const worksheet = workbook.Sheets[targetSheetName];
      if (!worksheet) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { error: "Worksheet could not be loaded." },
                null,
                2
              ),
            },
          ],
        };
      }

      const rows = sheetToJSON(worksheet, maxRows);
      const dims = sheetDimensions(worksheet);

      const result = {
        file: resolved,
        sheet: targetSheetName,
        total_rows_in_sheet: dims.rows > 0 ? dims.rows - 1 : 0, // subtract header row
        columns: dims.columns,
        rows_returned: rows.length,
        ...(maxRows !== undefined && { max_rows_requested: maxRows }),
        data: rows,
      };

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ error: message }, null, 2),
          },
        ],
      };
    }
  }
);

// ---------------------------------------------------------------------------
// Tool: list_sheets
// ---------------------------------------------------------------------------

server.tool(
  "list_sheets",
  "List all sheet names and their dimensions (rows × columns) in a spreadsheet file. For CSV files this returns a single sheet named \"Sheet1\".",
  {
    path: z.string().describe("Absolute path to the spreadsheet file"),
  },
  async ({ path: filePath }) => {
    try {
      const resolved = validateFilePath(filePath);
      const workbook = readWorkbook(resolved);

      const sheets = workbook.SheetNames.map((name) => {
        const ws = workbook.Sheets[name];
        const dims = ws ? sheetDimensions(ws) : { rows: 0, columns: 0 };
        return {
          name,
          rows: dims.rows,
          columns: dims.columns,
        };
      });

      const result = {
        file: resolved,
        total_sheets: sheets.length,
        sheets,
      };

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ error: message }, null, 2),
          },
        ],
      };
    }
  }
);

// ---------------------------------------------------------------------------
// Start the server
// ---------------------------------------------------------------------------

const transport = new StdioServerTransport();
await server.connect(transport);
