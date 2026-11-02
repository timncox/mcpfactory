#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { writeFile } from "node:fs/promises";

// ---------------------------------------------------------------------------
// Theme definitions
// ---------------------------------------------------------------------------

interface ThemeColors {
  bg: string;
  surface: string;
  text: string;
  textSecondary: string;
  primary: string;
  primaryLight: string;
  accent: string;
  border: string;
  heroGradient: string;
  cardShadow: string;
  trendUp: string;
  trendDown: string;
}

const THEMES: Record<string, ThemeColors> = {
  default: {
    bg: "#f5f7fa",
    surface: "#ffffff",
    text: "#1a1a2e",
    textSecondary: "#6b7280",
    primary: "#4f46e5",
    primaryLight: "#e0e7ff",
    accent: "#06b6d4",
    border: "#e5e7eb",
    heroGradient: "linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)",
    cardShadow: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)",
    trendUp: "#10b981",
    trendDown: "#ef4444",
  },
  dark: {
    bg: "#0f172a",
    surface: "#1e293b",
    text: "#f1f5f9",
    textSecondary: "#94a3b8",
    primary: "#818cf8",
    primaryLight: "#312e81",
    accent: "#22d3ee",
    border: "#334155",
    heroGradient: "linear-gradient(135deg, #312e81 0%, #164e63 100%)",
    cardShadow: "0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)",
    trendUp: "#34d399",
    trendDown: "#f87171",
  },
  corporate: {
    bg: "#f8f9fa",
    surface: "#ffffff",
    text: "#212529",
    textSecondary: "#6c757d",
    primary: "#0d6efd",
    primaryLight: "#cfe2ff",
    accent: "#198754",
    border: "#dee2e6",
    heroGradient: "linear-gradient(135deg, #0d47a1 0%, #1565c0 50%, #1976d2 100%)",
    cardShadow: "0 0.125rem 0.25rem rgba(0,0,0,0.075)",
    trendUp: "#198754",
    trendDown: "#dc3545",
  },
  vibrant: {
    bg: "#fefce8",
    surface: "#ffffff",
    text: "#1c1917",
    textSecondary: "#78716c",
    primary: "#e11d48",
    primaryLight: "#ffe4e6",
    accent: "#f59e0b",
    border: "#e7e5e4",
    heroGradient: "linear-gradient(135deg, #e11d48 0%, #f59e0b 50%, #10b981 100%)",
    cardShadow: "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)",
    trendUp: "#10b981",
    trendDown: "#e11d48",
  },
};

// ---------------------------------------------------------------------------
// Section renderers
// ---------------------------------------------------------------------------

let chartCounter = 0;

function resetChartCounter(): void {
  chartCounter = 0;
}

function renderHero(data: { title?: string; subtitle?: string }): string {
  return `
    <section class="hero">
      <h1>${escapeHtml(data.title ?? "")}</h1>
      ${data.subtitle ? `<p>${escapeHtml(data.subtitle)}</p>` : ""}
    </section>`;
}

function renderMetrics(
  data: Array<{ label: string; value: string | number; change?: string; trend?: string }>
): string {
  const cards = data
    .map((m) => {
      const trendClass = m.trend === "up" ? "trend-up" : m.trend === "down" ? "trend-down" : "";
      const trendArrow = m.trend === "up" ? "&#9650;" : m.trend === "down" ? "&#9660;" : "";
      return `
      <div class="metric-card">
        <div class="metric-label">${escapeHtml(m.label)}</div>
        <div class="metric-value">${escapeHtml(String(m.value))}</div>
        ${
          m.change
            ? `<div class="metric-change ${trendClass}">${trendArrow} ${escapeHtml(m.change)}</div>`
            : ""
        }
      </div>`;
    })
    .join("\n");
  return `<section class="metrics-grid">${cards}</section>`;
}

function renderBarChart(data: {
  title?: string;
  labels: string[];
  values: number[];
  color?: string;
}): string {
  const id = `bar_chart_${chartCounter++}`;
  const color = data.color ?? "var(--color-primary)";
  return `
    <section class="chart-section">
      ${data.title ? `<h2 class="section-title">${escapeHtml(data.title)}</h2>` : ""}
      <div class="chart-container"><canvas id="${id}"></canvas></div>
      <script>
        (function(){
          const ctx = document.getElementById('${id}').getContext('2d');
          new Chart(ctx, {
            type: 'bar',
            data: {
              labels: ${JSON.stringify(data.labels)},
              datasets: [{
                label: ${JSON.stringify(data.title ?? "")},
                data: ${JSON.stringify(data.values)},
                backgroundColor: '${color}',
                borderRadius: 6,
                maxBarThickness: 60
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.06)' } },
                x: { grid: { display: false } }
              }
            }
          });
        })();
      </script>
    </section>`;
}

function renderDonutChart(data: {
  title?: string;
  labels: string[];
  values: number[];
  colors?: string[];
}): string {
  const id = `donut_chart_${chartCounter++}`;
  const defaultColors = ["#4f46e5", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
  const colors = data.colors ?? defaultColors.slice(0, data.labels.length);
  return `
    <section class="chart-section">
      ${data.title ? `<h2 class="section-title">${escapeHtml(data.title)}</h2>` : ""}
      <div class="chart-container chart-container--donut"><canvas id="${id}"></canvas></div>
      <script>
        (function(){
          const ctx = document.getElementById('${id}').getContext('2d');
          new Chart(ctx, {
            type: 'doughnut',
            data: {
              labels: ${JSON.stringify(data.labels)},
              datasets: [{
                data: ${JSON.stringify(data.values)},
                backgroundColor: ${JSON.stringify(colors)},
                borderWidth: 2,
                borderColor: 'var(--color-surface)'
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              cutout: '60%',
              plugins: {
                legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, pointStyle: 'circle' } }
              }
            }
          });
        })();
      </script>
    </section>`;
}

function renderTable(data: {
  title?: string;
  headers: string[];
  rows: (string | number)[][];
}): string {
  const headerCells = data.headers.map((h) => `<th>${escapeHtml(String(h))}</th>`).join("");
  const bodyRows = data.rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${escapeHtml(String(cell))}</td>`).join("")}</tr>`
    )
    .join("\n");
  return `
    <section class="table-section">
      ${data.title ? `<h2 class="section-title">${escapeHtml(data.title)}</h2>` : ""}
      <div class="table-wrapper">
        <table>
          <thead><tr>${headerCells}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div>
    </section>`;
}

function renderInsights(
  data: Array<{ title: string; body: string; icon?: string }>
): string {
  const cards = data
    .map(
      (ins) => `
      <div class="insight-card">
        ${ins.icon ? `<div class="insight-icon">${escapeHtml(ins.icon)}</div>` : ""}
        <h3>${escapeHtml(ins.title)}</h3>
        <p>${escapeHtml(ins.body)}</p>
      </div>`
    )
    .join("\n");
  return `
    <section class="insights-section">
      <div class="insights-grid">${cards}</div>
    </section>`;
}

function renderRoadmap(
  data: Array<{ step: number | string; title: string; description: string }>
): string {
  const steps = data
    .map(
      (r) => `
      <div class="roadmap-step">
        <div class="roadmap-marker">${escapeHtml(String(r.step))}</div>
        <div class="roadmap-content">
          <h3>${escapeHtml(r.title)}</h3>
          <p>${escapeHtml(r.description)}</p>
        </div>
      </div>`
    )
    .join("\n");
  return `
    <section class="roadmap-section">
      <div class="roadmap-timeline">${steps}</div>
    </section>`;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ---------------------------------------------------------------------------
// Section type → renderer dispatch
// ---------------------------------------------------------------------------

interface Section {
  type: string;
  data: unknown;
}

function renderSection(section: Section): string {
  switch (section.type) {
    case "hero":
      return renderHero(section.data as Parameters<typeof renderHero>[0]);
    case "metrics":
      return renderMetrics(section.data as Parameters<typeof renderMetrics>[0]);
    case "bar_chart":
      return renderBarChart(section.data as Parameters<typeof renderBarChart>[0]);
    case "donut_chart":
      return renderDonutChart(section.data as Parameters<typeof renderDonutChart>[0]);
    case "table":
      return renderTable(section.data as Parameters<typeof renderTable>[0]);
    case "insights":
      return renderInsights(section.data as Parameters<typeof renderInsights>[0]);
    case "roadmap":
      return renderRoadmap(section.data as Parameters<typeof renderRoadmap>[0]);
    default:
      return `<section class="unknown-section"><p>Unknown section type: ${escapeHtml(section.type)}</p></section>`;
  }
}

// ---------------------------------------------------------------------------
// HTML document builder
// ---------------------------------------------------------------------------

function buildHtml(
  title: string,
  sections: Section[],
  theme: ThemeColors,
  password?: string
): string {
  resetChartCounter();

  const sectionHtml = sections.map(renderSection).join("\n");

  const passwordGate = password
    ? `
    <div id="pw-gate" style="position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:var(--color-bg);">
      <div style="background:var(--color-surface);padding:2.5rem;border-radius:12px;box-shadow:var(--card-shadow);text-align:center;max-width:360px;width:90%;">
        <h2 style="margin:0 0 0.5rem;color:var(--color-text);">🔒 Protected Report</h2>
        <p style="margin:0 0 1.5rem;color:var(--color-text-secondary);font-size:0.9rem;">Enter the password to view this report.</p>
        <input id="pw-input" type="password" placeholder="Password" style="width:100%;padding:0.6rem 0.8rem;border:1px solid var(--color-border);border-radius:6px;font-size:1rem;margin-bottom:0.75rem;box-sizing:border-box;" onkeydown="if(event.key==='Enter')document.getElementById('pw-btn').click()">
        <button id="pw-btn" onclick="checkPw()" style="width:100%;padding:0.6rem;background:var(--color-primary);color:#fff;border:none;border-radius:6px;font-size:1rem;cursor:pointer;">Unlock</button>
        <p id="pw-err" style="color:var(--color-trend-down);margin:0.75rem 0 0;display:none;font-size:0.85rem;">Incorrect password. Try again.</p>
      </div>
    </div>
    <script>
      function checkPw(){
        if(document.getElementById('pw-input').value===${JSON.stringify(password)}){
          document.getElementById('pw-gate').remove();
          document.getElementById('report-content').style.display='block';
        } else {
          document.getElementById('pw-err').style.display='block';
        }
      }
    </script>`
    : "";

  const reportContentStyle = password ? ' style="display:none"' : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"><\/script>
  <style>
    :root {
      --color-bg: ${theme.bg};
      --color-surface: ${theme.surface};
      --color-text: ${theme.text};
      --color-text-secondary: ${theme.textSecondary};
      --color-primary: ${theme.primary};
      --color-primary-light: ${theme.primaryLight};
      --color-accent: ${theme.accent};
      --color-border: ${theme.border};
      --hero-gradient: ${theme.heroGradient};
      --card-shadow: ${theme.cardShadow};
      --color-trend-up: ${theme.trendUp};
      --color-trend-down: ${theme.trendDown};
    }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: var(--color-bg);
      color: var(--color-text);
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }

    .report-wrapper { max-width: 1100px; margin: 0 auto; padding: 2rem 1.5rem 4rem; }

    /* Hero */
    .hero {
      background: var(--hero-gradient);
      color: #ffffff;
      padding: 3rem 2.5rem;
      border-radius: 16px;
      margin-bottom: 2rem;
      text-align: center;
    }
    .hero h1 { font-size: 2.25rem; font-weight: 700; margin-bottom: 0.5rem; }
    .hero p { font-size: 1.1rem; opacity: 0.9; }

    /* Section title */
    .section-title {
      font-size: 1.35rem;
      font-weight: 600;
      margin-bottom: 1rem;
      color: var(--color-text);
    }

    /* Metrics */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .metric-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: var(--card-shadow);
    }
    .metric-label { font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.03em; }
    .metric-value { font-size: 1.75rem; font-weight: 700; color: var(--color-text); }
    .metric-change { font-size: 0.85rem; margin-top: 0.35rem; }
    .trend-up { color: var(--color-trend-up); }
    .trend-down { color: var(--color-trend-down); }

    /* Charts */
    .chart-section { margin-bottom: 2rem; }
    .chart-container {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: var(--card-shadow);
      height: 340px;
      position: relative;
    }
    .chart-container--donut { max-width: 480px; margin: 0 auto; height: 380px; }

    /* Tables */
    .table-section { margin-bottom: 2rem; }
    .table-wrapper {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 12px;
      box-shadow: var(--card-shadow);
      overflow: auto;
    }
    table { width: 100%; border-collapse: collapse; font-size: 0.95rem; }
    thead { background: var(--color-primary-light); }
    th { text-align: left; padding: 0.85rem 1rem; font-weight: 600; color: var(--color-text); white-space: nowrap; }
    td { padding: 0.75rem 1rem; border-top: 1px solid var(--color-border); }
    tbody tr:hover { background: var(--color-primary-light); }

    /* Insights */
    .insights-section { margin-bottom: 2rem; }
    .insights-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1rem;
    }
    .insight-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: var(--card-shadow);
    }
    .insight-icon { font-size: 1.75rem; margin-bottom: 0.5rem; }
    .insight-card h3 { font-size: 1.05rem; font-weight: 600; margin-bottom: 0.4rem; }
    .insight-card p { font-size: 0.9rem; color: var(--color-text-secondary); }

    /* Roadmap */
    .roadmap-section { margin-bottom: 2rem; }
    .roadmap-timeline { position: relative; padding-left: 3rem; }
    .roadmap-timeline::before {
      content: '';
      position: absolute;
      left: 1.1rem;
      top: 0;
      bottom: 0;
      width: 3px;
      background: var(--color-border);
      border-radius: 2px;
    }
    .roadmap-step {
      position: relative;
      margin-bottom: 1.5rem;
      display: flex;
      align-items: flex-start;
    }
    .roadmap-marker {
      position: absolute;
      left: -3rem;
      width: 2.2rem;
      height: 2.2rem;
      background: var(--color-primary);
      color: #fff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.85rem;
      z-index: 1;
      box-shadow: 0 0 0 4px var(--color-bg);
    }
    .roadmap-content {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 12px;
      padding: 1.25rem 1.5rem;
      box-shadow: var(--card-shadow);
      flex: 1;
    }
    .roadmap-content h3 { font-size: 1rem; font-weight: 600; margin-bottom: 0.25rem; }
    .roadmap-content p { font-size: 0.9rem; color: var(--color-text-secondary); }

    /* Unknown section fallback */
    .unknown-section {
      background: var(--color-surface);
      border: 1px dashed var(--color-border);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 2rem;
      color: var(--color-text-secondary);
    }

    /* Footer */
    .report-footer {
      text-align: center;
      padding: 2rem 0 0;
      color: var(--color-text-secondary);
      font-size: 0.8rem;
      border-top: 1px solid var(--color-border);
      margin-top: 1rem;
    }

    /* Responsive */
    @media (max-width: 640px) {
      .hero { padding: 2rem 1.5rem; }
      .hero h1 { font-size: 1.5rem; }
      .report-wrapper { padding: 1rem; }
      .metrics-grid { grid-template-columns: 1fr 1fr; }
    }

    /* Print styles */
    @media print {
      body { background: #fff; }
      .hero { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .metric-card, .chart-container, .table-wrapper, .insight-card, .roadmap-content {
        break-inside: avoid;
        box-shadow: none;
        border: 1px solid #ddd;
      }
      .chart-container { height: auto; }
      #pw-gate { display: none !important; }
      #report-content { display: block !important; }
    }
  </style>
</head>
<body>
  ${passwordGate}
  <div id="report-content" class="report-wrapper"${reportContentStyle}>
    ${sectionHtml}
    <footer class="report-footer">
      Generated on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
    </footer>
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// MCP Server
// ---------------------------------------------------------------------------

const server = new McpServer({
  name: "html-report-builder",
  version: "1.0.0",
});

server.tool(
  "create_report",
  "Generate a complete single-file HTML report from structured sections. Returns the full HTML string. Sections are rendered in order. Supports: hero (title banner), metrics (KPI cards), bar_chart, donut_chart, table, insights (card grid), and roadmap (stepped timeline). Includes Chart.js via CDN, responsive CSS, and print styles.",
  {
    title: z.string().describe("Report title displayed in hero section and page title"),
    sections: z
      .string()
      .describe(
        "JSON array of section objects. Each has 'type' and 'data'. Types: 'hero' (data: {title, subtitle}), 'metrics' (data: [{label, value, change?, trend?}]), 'bar_chart' (data: {title, labels[], values[], color?}), 'donut_chart' (data: {title, labels[], values[], colors?[]}), 'table' (data: {title, headers[], rows[][]}), 'insights' (data: [{title, body, icon?}]), 'roadmap' (data: [{step, title, description}])"
      ),
    theme: z
      .string()
      .optional()
      .describe("Optional color theme: 'default', 'dark', 'corporate', 'vibrant'. Default is 'default'."),
    password: z
      .string()
      .optional()
      .describe(
        "Optional password to gate the report behind a simple client-side password prompt."
      ),
    output_path: z
      .string()
      .optional()
      .describe(
        "Optional file path to write the HTML file. If omitted, returns HTML as string."
      ),
  },
  async ({ title, sections: sectionsJson, theme, password, output_path }) => {
    // Parse sections JSON
    let sections: Section[];
    try {
      const parsed: unknown = JSON.parse(sectionsJson);
      if (!Array.isArray(parsed)) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Error: 'sections' must be a JSON array of section objects.",
            },
          ],
        };
      }
      sections = parsed as Section[];
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error parsing 'sections' JSON: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
      };
    }

    // Resolve theme
    const themeName = theme && theme in THEMES ? theme : "default";
    const themeColors = THEMES[themeName];

    // Build the HTML
    const html = buildHtml(title, sections, themeColors, password);

    // Optionally write to file
    if (output_path) {
      try {
        await writeFile(output_path, html, "utf-8");
        return {
          content: [
            {
              type: "text" as const,
              text: `Report successfully written to: ${output_path}\n\nThe file is ${html.length.toLocaleString()} bytes and contains ${sections.length} section(s).`,
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error writing file to ${output_path}: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    }

    // Return HTML as string
    return {
      content: [
        {
          type: "text" as const,
          text: html,
        },
      ],
    };
  }
);

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

const transport = new StdioServerTransport();
await server.connect(transport);
