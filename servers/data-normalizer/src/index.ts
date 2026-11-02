#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  similarityScore,
  autoGroupValues,
  matchToCanonical,
  type CategoryGroup,
} from "./fuzzy.js";

const server = new McpServer({
  name: "data-normalizer",
  version: "1.0.0",
});

// ---------------------------------------------------------------------------
// Helper: parse a JSON string into an array of objects
// ---------------------------------------------------------------------------
function parseDataArray(raw: string): Record<string, unknown>[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON in 'data' parameter. Expected a JSON array of objects.");
  }
  if (!Array.isArray(parsed)) {
    throw new Error("'data' must be a JSON array of objects.");
  }
  return parsed as Record<string, unknown>[];
}

// ---------------------------------------------------------------------------
// Helper: parse optional rules JSON
// ---------------------------------------------------------------------------
function parseRules(raw: string | undefined): Record<string, string[]> | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      "Invalid JSON in 'rules' parameter. Expected an object mapping canonical names to arrays of synonyms."
    );
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("'rules' must be a JSON object, e.g. {\"Female\": [\"F\", \"female\", \"f\"]}.");
  }
  // Validate structure
  const rules: Record<string, string[]> = {};
  for (const [key, val] of Object.entries(parsed as Record<string, unknown>)) {
    if (!Array.isArray(val) || !val.every((v) => typeof v === "string")) {
      throw new Error(
        `Rule for "${key}" must be an array of strings. Got: ${JSON.stringify(val)}`
      );
    }
    rules[key] = val as string[];
  }
  return rules;
}

// ---------------------------------------------------------------------------
// Helper: extract unique value counts for a field
// ---------------------------------------------------------------------------
function extractFieldValues(
  data: Record<string, unknown>[],
  field: string
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of data) {
    const val = row[field];
    if (val === undefined || val === null) continue;
    const str = String(val).trim();
    if (str === "") continue;
    counts.set(str, (counts.get(str) ?? 0) + 1);
  }
  return counts;
}

// ---------------------------------------------------------------------------
// Tool: normalize_categories
// ---------------------------------------------------------------------------
server.tool(
  "normalize_categories",
  "Normalize inconsistent categorical values in a dataset. Uses fuzzy matching and synonym grouping to clean messy labels into consistent categories. For example, maps 'F', 'Female', 'female' all to 'Female'.",
  {
    data: z
      .string()
      .describe("JSON array of objects (the dataset rows)"),
    field: z
      .string()
      .describe("The field/column name to normalize"),
    rules: z
      .string()
      .optional()
      .describe(
        'Optional JSON object mapping canonical category names to arrays of synonyms. e.g. {"Female": ["F", "female", "f"], "Male": ["M", "male", "m"]}. If omitted, uses fuzzy matching to auto-group similar values.'
      ),
  },
  async ({ data: dataStr, field, rules: rulesStr }) => {
    try {
      const data = parseDataArray(dataStr);

      if (data.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  normalized_data: [],
                  field,
                  mappings_applied: {},
                  summary: { total_rows: 0, normalized_count: 0, unmatched_count: 0, unmatched_values: [] },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Validate that field exists in at least one row
      const hasField = data.some((row) => field in row);
      if (!hasField) {
        throw new Error(
          `Field "${field}" not found in any row of the dataset. Available fields: ${[
            ...new Set(data.flatMap((r) => Object.keys(r))),
          ].join(", ")}`
        );
      }

      const userRules = parseRules(rulesStr);

      // Build the mapping: original value -> canonical value
      const valueMapping = new Map<string, string>();
      const valueCounts = extractFieldValues(data, field);

      if (userRules) {
        // Rule-based normalization
        for (const originalValue of valueCounts.keys()) {
          const canonical = matchToCanonical(originalValue, userRules);
          if (canonical) {
            valueMapping.set(originalValue, canonical);
          }
        }
      } else {
        // Auto-group using fuzzy matching (default threshold 80)
        const groups = autoGroupValues(valueCounts, 80);
        for (const group of groups) {
          for (const member of group.members) {
            valueMapping.set(member, group.canonical);
          }
        }
      }

      // Apply normalization to dataset
      let normalizedCount = 0;
      const unmatchedValues = new Set<string>();

      const normalizedData = data.map((row) => {
        const newRow = { ...row };
        const val = row[field];
        if (val === undefined || val === null) return newRow;

        const str = String(val).trim();
        if (str === "") return newRow;

        const mapped = valueMapping.get(str);
        if (mapped && mapped !== str) {
          newRow[field] = mapped;
          normalizedCount++;
        } else if (mapped) {
          // Already canonical
          newRow[field] = mapped;
        } else {
          // No mapping found
          unmatchedValues.add(str);
        }
        return newRow;
      });

      // Build readable mapping summary
      const mappingsApplied: Record<string, string[]> = {};
      for (const [original, canonical] of valueMapping.entries()) {
        if (original !== canonical) {
          if (!mappingsApplied[canonical]) {
            mappingsApplied[canonical] = [];
          }
          mappingsApplied[canonical].push(original);
        }
      }

      const result = {
        normalized_data: normalizedData,
        field,
        mappings_applied: mappingsApplied,
        summary: {
          total_rows: data.length,
          normalized_count: normalizedCount,
          unique_categories_before: valueCounts.size,
          unique_categories_after: new Set(
            normalizedData
              .map((r) => r[field])
              .filter((v) => v !== undefined && v !== null)
              .map((v) => String(v))
          ).size,
          unmatched_count: unmatchedValues.size,
          unmatched_values: [...unmatchedValues],
        },
      };

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text" as const, text: `Error: ${message}` }],
      };
    }
  }
);

// ---------------------------------------------------------------------------
// Tool: detect_categories
// ---------------------------------------------------------------------------
server.tool(
  "detect_categories",
  "Analyze a field in a dataset and detect distinct categories, suggesting groupings based on fuzzy similarity. Useful for previewing normalization before applying it.",
  {
    data: z
      .string()
      .describe("JSON array of objects (the dataset rows)"),
    field: z
      .string()
      .describe("The field/column name to analyze"),
    threshold: z
      .number()
      .min(0)
      .max(100)
      .optional()
      .describe("Fuzzy match similarity threshold 0-100. Default 80."),
  },
  async ({ data: dataStr, field, threshold }) => {
    try {
      const data = parseDataArray(dataStr);
      const effectiveThreshold = threshold ?? 80;

      if (data.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  field,
                  threshold: effectiveThreshold,
                  total_rows: 0,
                  unique_values: 0,
                  values: {},
                  suggested_groups: [],
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Validate field existence
      const hasField = data.some((row) => field in row);
      if (!hasField) {
        throw new Error(
          `Field "${field}" not found in any row of the dataset. Available fields: ${[
            ...new Set(data.flatMap((r) => Object.keys(r))),
          ].join(", ")}`
        );
      }

      const valueCounts = extractFieldValues(data, field);

      // Count null / missing
      const missingCount = data.filter((row) => {
        const val = row[field];
        return val === undefined || val === null || String(val).trim() === "";
      }).length;

      // Auto-group using the threshold
      const groups = autoGroupValues(valueCounts, effectiveThreshold);

      // Build a similarity matrix for unique values (only if not too many)
      const uniqueValues = [...valueCounts.keys()];
      let similarityPairs: { a: string; b: string; score: number }[] | undefined;
      if (uniqueValues.length <= 50) {
        similarityPairs = [];
        for (let i = 0; i < uniqueValues.length; i++) {
          for (let j = i + 1; j < uniqueValues.length; j++) {
            const score = similarityScore(uniqueValues[i], uniqueValues[j]);
            if (score >= 50) {
              // Only include somewhat similar pairs
              similarityPairs.push({
                a: uniqueValues[i],
                b: uniqueValues[j],
                score,
              });
            }
          }
        }
        similarityPairs.sort((x, y) => y.score - x.score);
      }

      // Format suggested groups
      const suggestedGroups = groups.map((group: CategoryGroup) => ({
        suggested_canonical: group.canonical,
        members: group.members.map((m) => ({
          value: m,
          count: valueCounts.get(m) ?? 0,
        })),
        total_count: group.count,
      }));

      // Build value frequency distribution
      const valueDistribution: Record<string, number> = {};
      for (const [val, count] of valueCounts.entries()) {
        valueDistribution[val] = count;
      }

      const result: Record<string, unknown> = {
        field,
        threshold: effectiveThreshold,
        total_rows: data.length,
        missing_or_empty: missingCount,
        unique_values: valueCounts.size,
        value_counts: valueDistribution,
        suggested_groups: suggestedGroups,
        groups_would_reduce_to: groups.length,
      };

      if (similarityPairs && similarityPairs.length > 0) {
        result.similarity_pairs = similarityPairs.slice(0, 20); // top 20
      }

      // Generate a suggested rules object that could be passed to normalize_categories
      const suggestedRules: Record<string, string[]> = {};
      for (const group of groups) {
        const synonyms = group.members.filter((m) => m !== group.canonical);
        if (synonyms.length > 0) {
          suggestedRules[group.canonical] = synonyms;
        }
      }
      if (Object.keys(suggestedRules).length > 0) {
        result.suggested_rules = suggestedRules;
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text" as const, text: `Error: ${message}` }],
      };
    }
  }
);

// ---------------------------------------------------------------------------
// Start the server
// ---------------------------------------------------------------------------
const transport = new StdioServerTransport();
await server.connect(transport);
