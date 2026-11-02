#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { execSync, execFileSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { PDFParse } from "pdf-parse";

const server = new McpServer({
  name: "menu-parser",
  version: "1.0.0",
});

const EXTRACTION_PROMPT = `You are a precise menu data extractor. Analyze the provided restaurant menu PDF and extract ALL menu items into structured JSON.

Requirements:
- Extract EVERY menu item with its exact name, price (as a number in dollars), and description/ingredients
- Group items into logical sections as they appear on the menu (e.g., "Signature Cocktails", "Bar Snacks", "Beer - Draft", "Spirits - Tequila", "Appetizers", "Entrees", "Desserts", etc.)
- Extract restaurant information: name, address, phone, hours, email, and website
- Use null for any restaurant info fields not found in the PDF
- If an item has no description, use an empty string
- If an item has no price listed, use 0

Output ONLY valid JSON with no markdown formatting, no code fences, no explanation. The JSON must match this exact structure:

{
  "restaurant": "Restaurant Name",
  "sections": [
    {
      "name": "Section Name",
      "items": [
        {
          "name": "Item Name",
          "price": 12.50,
          "description": "Description or ingredients"
        }
      ]
    }
  ],
  "info": {
    "address": "123 Main St or null",
    "phone": "(555) 123-4567 or null",
    "hours": "Mon-Fri 11am-10pm or null",
    "email": "info@restaurant.com or null",
    "website": "https://restaurant.com or null"
  }
}

Output ONLY the JSON. No other text.`;

function findClaudeCli(): string {
  const candidates = ["/usr/local/bin/claude", "claude"];

  for (const candidate of candidates) {
    try {
      execSync(`which ${candidate}`, { stdio: "pipe" });
      return candidate;
    } catch {
      // Try next candidate
    }
  }

  // Try running claude directly as a last resort
  try {
    execSync("claude --version", { stdio: "pipe" });
    return "claude";
  } catch {
    throw new Error(
      "Claude CLI not found. Please install it from https://docs.anthropic.com/en/docs/claude-cli and ensure it is available on your PATH."
    );
  }
}

function extractJsonFromOutput(raw: string): unknown {
  const trimmed = raw.trim();

  // Try parsing the raw output directly
  try {
    return JSON.parse(trimmed);
  } catch {
    // Continue to fallback strategies
  }

  // Try to extract JSON from markdown code fences
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {
      // Continue to next strategy
    }
  }

  // Try to find the first { ... } block
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    } catch {
      // Give up on parsing
    }
  }

  throw new Error("Failed to parse JSON from Claude CLI output");
}

server.tool(
  "parse_menu",
  "Parse a restaurant menu PDF into structured JSON with sections, items (name/price/description), and restaurant info",
  {
    file_path: z
      .string()
      .describe("Absolute path to the PDF menu file"),
  },
  async ({ file_path }) => {
    // Resolve and validate the file path
    const resolvedPath = resolve(file_path);

    if (!existsSync(resolvedPath)) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                error: true,
                message: `File not found: ${resolvedPath}`,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Verify it looks like a PDF
    if (!resolvedPath.toLowerCase().endsWith(".pdf")) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                error: true,
                message: `File does not appear to be a PDF: ${resolvedPath}`,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Find the claude CLI
    let claudePath: string;
    try {
      claudePath = findClaudeCli();
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                error: true,
                message:
                  err instanceof Error
                    ? err.message
                    : "Claude CLI not found on PATH",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Extract text from the PDF
    let pdfText: string;
    try {
      const pdfBuffer = readFileSync(resolvedPath);
      const parser = new PDFParse({ data: new Uint8Array(pdfBuffer) });
      const textResult = await parser.getText();
      pdfText = textResult.text;
      await parser.destroy();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error reading PDF";
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                error: true,
                message: `Failed to extract text from PDF: ${message}`,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    if (!pdfText.trim()) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                error: true,
                message:
                  "PDF appears to contain no extractable text (it may be image-based). Text-based PDFs are required.",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Build the prompt with the extracted menu text
    const fullPrompt = `${EXTRACTION_PROMPT}\n\n--- MENU TEXT ---\n${pdfText}\n--- END MENU TEXT ---`;

    // Shell out to claude CLI to parse the menu text
    // Use execFileSync to avoid shell argument length limits with large PDFs
    let rawOutput: string;
    try {
      rawOutput = execFileSync(
        claudePath,
        ["-p", fullPrompt, "--output-format", "text"],
        {
          encoding: "utf-8",
          maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large outputs
          timeout: 120_000, // 2 minute timeout
          stdio: ["pipe", "pipe", "pipe"],
        }
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error running Claude CLI";
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                error: true,
                message: `Failed to run Claude CLI: ${message}`,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Parse the JSON output from Claude
    try {
      const parsed = extractJsonFromOutput(rawOutput);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(parsed, null, 2),
          },
        ],
      };
    } catch {
      // Return raw output with error flag if JSON parsing fails
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                error: true,
                message:
                  "Failed to parse structured JSON from Claude CLI output",
                raw_output: rawOutput,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
