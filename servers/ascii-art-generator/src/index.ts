#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { findArt, generateFreeformArt, artCollection } from "./art-data.js";
import { renderBanner, type FontStyle } from "./banner-fonts.js";
import { generateDivider, type DividerStyle } from "./dividers.js";
import { wrapInHtml, getCssSuggestion, getTheme } from "./themes.js";

// ─── MCP Server Setup ───────────────────────────────────────

const server = new McpServer({
  name: "ascii-art-generator",
  version: "1.0.0",
});

// ─── Tool: generate_ascii ───────────────────────────────────

server.tool(
  "generate_ascii",
  "Generates themed ASCII art for a given subject. Returns detailed multi-line art using Unicode box-drawing characters, block elements, and standard ASCII. Includes HTML/CSS styling suggestions for embedding in web pages. Supports themes: retro-game, synth, terminal, editorial, minimal.",
  {
    subject: z.string().describe(
      "What to draw: 'space-invader', 'street-fighter', 'game-controller', 'health-bar', 'modular-synth', 'oscilloscope', 'keyboard', 'skull', 'circuit-board', 'matrix', 'system-diagnostics', 'monogram', 'ornament', or a freeform description"
    ),
    style: z
      .enum(["retro-game", "synth", "terminal", "editorial", "minimal"])
      .optional()
      .default("retro-game")
      .describe("Visual style affecting character choices, density, and HTML/CSS theming"),
    max_width: z
      .number()
      .optional()
      .default(60)
      .describe("Maximum character width for the art (default 60)"),
  },
  async ({ subject, style, max_width }) => {
    const maxWidth = max_width;
    let artLines: string[];
    let artSource: string;

    // Try to find a pre-built template
    const template = findArt(subject, maxWidth);

    if (template) {
      artLines = template.lines;
      artSource = "template";
    } else {
      // Generate freeform art
      artLines = generateFreeformArt(subject, style, maxWidth);
      artSource = "generated";
    }

    const artString = artLines.join("\n");
    const htmlWrapped = wrapInHtml(artString, style);
    const cssSuggestion = getCssSuggestion(style);
    const theme = getTheme(style);

    const availableSubjects = Object.keys(artCollection).join(", ");

    const output = [
      `# ASCII Art: ${subject}`,
      `**Style:** ${style} | **Source:** ${artSource} | **Width:** ${Math.max(...artLines.map(l => l.length))} chars`,
      "",
      "## Art",
      "```",
      artString,
      "```",
      "",
      "## HTML Embed",
      "```html",
      htmlWrapped,
      "```",
      "",
      "## CSS Suggestion",
      "```css",
      cssSuggestion,
      "```",
      "",
      `## Theme: ${theme.description}`,
      "",
      `**Available subjects:** ${availableSubjects}`,
    ].join("\n");

    return {
      content: [{ type: "text", text: output }],
    };
  }
);

// ─── Tool: generate_divider ─────────────────────────────────

server.tool(
  "generate_divider",
  "Generates a decorative ASCII divider/separator for use between sections. Can be themed to match different site aesthetics: retro-game (pixel patterns), synth (waveforms), terminal (═══ lines), editorial (ornamental rules with ✦◊•), minimal (simple dots/dashes).",
  {
    style: z
      .enum(["retro-game", "synth", "terminal", "editorial", "minimal"])
      .describe("Divider style theme"),
    width: z
      .number()
      .optional()
      .default(60)
      .describe("Character width of the divider (default 60)"),
    label: z
      .string()
      .optional()
      .describe("Optional centered label text within the divider"),
  },
  async ({ style, width, label }) => {
    const dividerLines = generateDivider(style as DividerStyle, width, label);
    const dividerString = dividerLines.join("\n");
    const htmlWrapped = wrapInHtml(dividerString, style);

    const output = [
      `# Divider (${style}${label ? ` — "${label}"` : ""})`,
      "",
      "## Art",
      "```",
      dividerString,
      "```",
      "",
      "## HTML Embed",
      "```html",
      htmlWrapped,
      "```",
    ].join("\n");

    return {
      content: [{ type: "text", text: output }],
    };
  }
);

// ─── Tool: generate_banner ──────────────────────────────────

server.tool(
  "generate_banner",
  "Generates large block-letter ASCII text banners (like figlet/toilet). Renders text in big, stylized characters for hero sections or section headers. Supports font styles: block (█ characters), shadow (with drop shadow), outline (hollow letters), small (compact 3-row).",
  {
    text: z.string().describe("Text to render as a large banner"),
    font: z
      .enum(["block", "shadow", "outline", "small"])
      .optional()
      .default("block")
      .describe("Font style for the banner (default 'block')"),
  },
  async ({ text, font }) => {
    const bannerLines = renderBanner(text, font as FontStyle);
    const bannerString = bannerLines.join("\n");
    const bannerWidth = Math.max(...bannerLines.map(l => l.length));

    // Use terminal theme for banners by default
    const htmlWrapped = wrapInHtml(bannerString, "terminal");
    const cssSuggestion = getCssSuggestion("terminal");

    const output = [
      `# Banner: "${text}" (${font} font)`,
      `**Width:** ${bannerWidth} chars | **Height:** ${bannerLines.length} rows`,
      "",
      "## Art",
      "```",
      bannerString,
      "```",
      "",
      "## HTML Embed",
      "```html",
      htmlWrapped,
      "```",
      "",
      "## CSS Suggestion",
      "```css",
      cssSuggestion,
      "```",
    ].join("\n");

    return {
      content: [{ type: "text", text: output }],
    };
  }
);

// ─── Tool: fit_ascii ────────────────────────────────────────

server.tool(
  "fit_ascii",
  "Takes existing ASCII art and adapts it for a target width. Scales down by trimming or truncating lines, scales up by adding padding or decorative borders. Can optionally wrap the result in a styled HTML <pre> tag with appropriate CSS.",
  {
    art: z.string().describe("The ASCII art string to adapt"),
    target_width: z.number().describe("Target character width"),
    wrap_html: z
      .boolean()
      .optional()
      .default(false)
      .describe("If true, wraps output in a styled HTML <pre> tag (default false)"),
  },
  async ({ art, target_width, wrap_html }) => {
    const lines = art.split("\n");
    const currentWidth = Math.max(...lines.map(l => l.length));
    let resultLines: string[];

    if (target_width >= currentWidth) {
      // Scale up: center with padding and add decorative border
      const padding = Math.floor((target_width - currentWidth) / 2);
      const paddedLines = lines.map(line => {
        const rightPad = target_width - line.length - padding;
        return " ".repeat(padding) + line + " ".repeat(Math.max(0, rightPad));
      });

      // Add a simple border
      const borderTop = "┌" + "─".repeat(target_width) + "┐";
      const borderBot = "└" + "─".repeat(target_width) + "┘";
      resultLines = [
        borderTop,
        ...paddedLines.map(l => "│" + l.padEnd(target_width) + "│"),
        borderBot,
      ];
    } else {
      // Scale down: truncate lines and add ellipsis indicator
      resultLines = lines.map(line => {
        if (line.length <= target_width) {
          return line;
        }
        if (target_width > 3) {
          return line.slice(0, target_width - 1) + "…";
        }
        return line.slice(0, target_width);
      });
    }

    const resultString = resultLines.join("\n");
    const resultWidth = Math.max(...resultLines.map(l => l.length));

    let output: string;
    if (wrap_html) {
      // Detect most likely style from the art content
      const detectedStyle = detectStyle(art);
      const htmlWrapped = wrapInHtml(resultString, detectedStyle);
      output = [
        `# Fitted ASCII Art`,
        `**Original width:** ${currentWidth} | **Target width:** ${target_width} | **Result width:** ${resultWidth}`,
        `**Action:** ${target_width >= currentWidth ? "padded & bordered" : "truncated"}`,
        `**Detected style:** ${detectedStyle}`,
        "",
        "## Art",
        "```",
        resultString,
        "```",
        "",
        "## HTML Embed",
        "```html",
        htmlWrapped,
        "```",
      ].join("\n");
    } else {
      output = [
        `# Fitted ASCII Art`,
        `**Original width:** ${currentWidth} | **Target width:** ${target_width} | **Result width:** ${resultWidth}`,
        `**Action:** ${target_width >= currentWidth ? "padded & bordered" : "truncated"}`,
        "",
        "## Art",
        "```",
        resultString,
        "```",
      ].join("\n");
    }

    return {
      content: [{ type: "text", text: output }],
    };
  }
);

// ─── Helpers ────────────────────────────────────────────────

function detectStyle(art: string): string {
  // Simple heuristic to detect art style from content
  if (art.includes("╔") || art.includes("║") || art.includes("═")) return "terminal";
  if (art.includes("✦") || art.includes("◆") || art.includes("◊")) return "editorial";
  if (art.includes("◉") || art.includes("∿")) return "synth";
  if (art.includes("▓") || art.includes("▒") || art.includes("░")) return "retro-game";
  return "minimal";
}

// ─── Start Server ───────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
