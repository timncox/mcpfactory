#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as fs from "fs/promises";
import * as path from "path";

// ─── Types ───────────────────────────────────────────────────────────────────

interface VariantEntry {
  name: string;
  file: string;
  created: string;
}

interface VariantManifest {
  variants: VariantEntry[];
}

interface ContentManifest {
  meta: {
    title?: string;
    description?: string;
    extractedFrom?: string;
    extractedAt?: string;
  };
  hero: {
    headline?: string;
    subheadline?: string;
    cta?: string;
  };
  about: {
    heading?: string;
    paragraphs: string[];
  };
  services: Array<{
    name: string;
    description?: string;
  }>;
  projects: Array<{
    name: string;
    description?: string;
    url?: string;
    tags?: string[];
  }>;
  clients: Array<{
    name: string;
    url?: string;
  }>;
  socialLinks: Array<{
    platform: string;
    url: string;
    label?: string;
  }>;
  contact: {
    email?: string;
    phone?: string;
    address?: string;
  };
  navigation: Array<{
    label: string;
    href: string;
  }>;
  footer: {
    text?: string;
    copyright?: string;
  };
  custom: Record<string, string>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MANIFEST_FILE = "variants.json";
const CONTENT_FILE = "content.json";
const VARIANTS_DIR = "variants";

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readManifest(projectDir: string): Promise<VariantManifest> {
  const manifestPath = path.join(projectDir, MANIFEST_FILE);
  try {
    const raw = await fs.readFile(manifestPath, "utf-8");
    return JSON.parse(raw) as VariantManifest;
  } catch {
    return { variants: [] };
  }
}

async function writeManifest(
  projectDir: string,
  manifest: VariantManifest
): Promise<void> {
  const manifestPath = path.join(projectDir, MANIFEST_FILE);
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
}

async function readContentManifest(
  projectDir: string
): Promise<ContentManifest | null> {
  const contentPath = path.join(projectDir, CONTENT_FILE);
  try {
    const raw = await fs.readFile(contentPath, "utf-8");
    return JSON.parse(raw) as ContentManifest;
  } catch {
    return null;
  }
}

async function writeContentManifest(
  projectDir: string,
  content: ContentManifest
): Promise<void> {
  const contentPath = path.join(projectDir, CONTENT_FILE);
  await fs.writeFile(contentPath, JSON.stringify(content, null, 2), "utf-8");
}

function makeDefaultContent(): ContentManifest {
  return {
    meta: {},
    hero: {},
    about: { heading: undefined, paragraphs: [] },
    services: [],
    projects: [],
    clients: [],
    socialLinks: [],
    contact: {},
    navigation: [],
    footer: {},
    custom: {},
  };
}

/** Simple HTML text extraction — strips tags and decodes basic entities */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

/** Extract inner text from an HTML element string (first match) */
function extractInnerText(html: string, tagPattern: RegExp): string | undefined {
  const match = html.match(tagPattern);
  if (!match) return undefined;
  return stripHtml(match[1] || match[0]);
}

/** Extract all matches of a pattern, returning the captured group */
function extractAll(html: string, pattern: RegExp): string[] {
  const results: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g");
  while ((m = re.exec(html)) !== null) {
    const text = stripHtml(m[1] || m[0]);
    if (text) results.push(text);
  }
  return results;
}

/** Extract sections from HTML by id or class */
function extractSection(
  html: string,
  sectionId: string
): string | undefined {
  // Try matching by id
  const idPattern = new RegExp(
    `<(?:section|div|article)[^>]*\\bid\\s*=\\s*["']${sectionId}["'][^>]*>([\\s\\S]*?)</(?:section|div|article)>`,
    "i"
  );
  const idMatch = html.match(idPattern);
  if (idMatch) return idMatch[1];

  // Try matching by class
  const classPattern = new RegExp(
    `<(?:section|div|article)[^>]*\\bclass\\s*=\\s*["'][^"']*\\b${sectionId}\\b[^"']*["'][^>]*>([\\s\\S]*?)</(?:section|div|article)>`,
    "i"
  );
  const classMatch = html.match(classPattern);
  if (classMatch) return classMatch[1];

  // Try matching by data-section attribute
  const dataPattern = new RegExp(
    `<(?:section|div|article)[^>]*\\bdata-section\\s*=\\s*["']${sectionId}["'][^>]*>([\\s\\S]*?)</(?:section|div|article)>`,
    "i"
  );
  const dataMatch = html.match(dataPattern);
  if (dataMatch) return dataMatch[1];

  return undefined;
}

/** Extract links (anchors) from an HTML string */
function extractLinks(
  html: string
): Array<{ href: string; text: string }> {
  const results: Array<{ href: string; text: string }> = [];
  const re = /<a\s[^>]*href\s*=\s*["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    results.push({
      href: m[1],
      text: stripHtml(m[2]),
    });
  }
  return results;
}

/** Detect social platforms from URL */
function detectPlatform(url: string): string {
  const platforms: Record<string, string> = {
    "twitter.com": "Twitter",
    "x.com": "Twitter/X",
    "github.com": "GitHub",
    "linkedin.com": "LinkedIn",
    "instagram.com": "Instagram",
    "facebook.com": "Facebook",
    "youtube.com": "YouTube",
    "dribbble.com": "Dribbble",
    "behance.net": "Behance",
    "codepen.io": "CodePen",
    "medium.com": "Medium",
    "dev.to": "Dev.to",
    "tiktok.com": "TikTok",
    "mastodon": "Mastodon",
    "threads.net": "Threads",
    "discord": "Discord",
    "slack": "Slack",
  };
  const lower = url.toLowerCase();
  for (const [domain, name] of Object.entries(platforms)) {
    if (lower.includes(domain)) return name;
  }
  return "Website";
}

function generateBoilerplateHtml(variantName: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title data-content="meta.title">Site Title</title>
  <meta name="description" data-content="meta.description" content="Site description">
  <style>
    /* ${variantName} variant styles */
    :root {
      --primary: #333;
      --accent: #0066cc;
      --bg: #ffffff;
      --text: #1a1a1a;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; color: var(--text); background: var(--bg); }
  </style>
</head>
<body>

  <nav data-section="navigation">
    <!-- Navigation links will be injected here -->
  </nav>

  <section id="hero" data-section="hero">
    <h1 data-content="hero.headline">Welcome</h1>
    <p data-content="hero.subheadline">Your tagline here</p>
    <a data-content="hero.cta" href="#">Get Started</a>
  </section>

  <section id="about" data-section="about">
    <h2 data-content="about.heading">About</h2>
    <div data-content="about.paragraphs">
      <p>About text goes here.</p>
    </div>
  </section>

  <section id="services" data-section="services">
    <h2>Services</h2>
    <!-- Service items will be injected here -->
  </section>

  <section id="projects" data-section="projects">
    <h2>Projects</h2>
    <!-- Project items will be injected here -->
  </section>

  <section id="clients" data-section="clients">
    <h2>Clients</h2>
    <!-- Client items will be injected here -->
  </section>

  <section id="contact" data-section="contact">
    <h2>Contact</h2>
    <p data-content="contact.email"></p>
    <p data-content="contact.phone"></p>
    <p data-content="contact.address"></p>
  </section>

  <footer data-section="footer">
    <div data-section="social">
      <!-- Social links will be injected here -->
    </div>
    <p data-content="footer.text"></p>
    <p data-content="footer.copyright"></p>
  </footer>

</body>
</html>`;
}

function generateRouterHtml(
  variants: VariantEntry[],
  strategy: string
): string {
  const variantFiles = JSON.stringify(variants.map((v) => v.file));

  let strategyScript = "";

  switch (strategy) {
    case "random":
      strategyScript = `
      // Pure random — pick a new variant every page load
      var variants = ${variantFiles};
      var pick = variants[Math.floor(Math.random() * variants.length)];
      window.location.replace(pick);`;
      break;

    case "sequential":
      strategyScript = `
      // Sequential — cycle through variants in order using localStorage
      var variants = ${variantFiles};
      var key = 'dvm_sequential_index';
      var idx = parseInt(localStorage.getItem(key) || '0', 10);
      if (isNaN(idx) || idx < 0 || idx >= variants.length) idx = 0;
      var pick = variants[idx];
      localStorage.setItem(key, String((idx + 1) % variants.length));
      window.location.replace(pick);`;
      break;

    case "session":
    default:
      strategyScript = `
      // Session-based — same variant per browser session, random on new session
      var variants = ${variantFiles};
      var key = 'dvm_session_variant';
      var pick = sessionStorage.getItem(key);
      if (!pick || variants.indexOf(pick) === -1) {
        pick = variants[Math.floor(Math.random() * variants.length)];
        sessionStorage.setItem(key, pick);
      }
      window.location.replace(pick);`;
      break;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Loading...</title>
  <style>
    body {
      margin: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      font-family: system-ui, -apple-system, sans-serif;
      background: #111;
      color: #888;
    }
  </style>
</head>
<body>
  <p>Loading design&hellip;</p>
  <script>
    (function() {
      ${strategyScript.trim()}
    })();
  </script>
  <noscript>
    <h2>Choose a design:</h2>
    <ul>
${variants.map((v) => `      <li><a href="${v.file}">${v.name}</a></li>`).join("\n")}
    </ul>
  </noscript>
</body>
</html>`;
}

// ─── Content sync helpers ────────────────────────────────────────────────────

/**
 * Replaces content in an HTML string by matching data-content attributes
 * and semantic section IDs, while preserving the variant's markup structure.
 */
function syncContentIntoHtml(
  html: string,
  content: ContentManifest
): string {
  let result = html;

  // ── Sync simple data-content text fields ──
  const simpleFields: Array<{ path: string; value: string | undefined }> = [
    { path: "meta.title", value: content.meta.title },
    { path: "meta.description", value: content.meta.description },
    { path: "hero.headline", value: content.hero.headline },
    { path: "hero.subheadline", value: content.hero.subheadline },
    { path: "hero.cta", value: content.hero.cta },
    { path: "about.heading", value: content.about.heading },
    { path: "footer.text", value: content.footer.text },
    { path: "footer.copyright", value: content.footer.copyright },
    { path: "contact.email", value: content.contact.email },
    { path: "contact.phone", value: content.contact.phone },
    { path: "contact.address", value: content.contact.address },
  ];

  for (const field of simpleFields) {
    if (field.value === undefined || field.value === null) continue;

    // Handle <title> tag with data-content
    if (field.path === "meta.title") {
      result = result.replace(
        /(<title[^>]*data-content\s*=\s*["']meta\.title["'][^>]*>)([\s\S]*?)(<\/title>)/i,
        `$1${escapeHtml(field.value)}$3`
      );
      // Also replace plain <title> tags
      result = result.replace(
        /(<title>)([\s\S]*?)(<\/title>)/i,
        `$1${escapeHtml(field.value)}$3`
      );
    }

    // Handle meta description
    if (field.path === "meta.description") {
      result = result.replace(
        /(<meta[^>]*name\s*=\s*["']description["'][^>]*content\s*=\s*["'])[^"']*?(["'])/i,
        `$1${escapeHtml(field.value)}$2`
      );
    }

    // Replace data-content tagged elements
    const dcPattern = new RegExp(
      `(<[^>]*data-content\\s*=\\s*["']${escapeRegex(field.path)}["'][^>]*>)([\\s\\S]*?)(</[^>]+>)`,
      "gi"
    );
    result = result.replace(dcPattern, `$1${escapeHtml(field.value)}$3`);
  }

  // ── Sync about paragraphs ──
  if (content.about.paragraphs.length > 0) {
    const aboutParagraphsHtml = content.about.paragraphs
      .map((p) => `      <p>${escapeHtml(p)}</p>`)
      .join("\n");

    const aboutDcPattern =
      /(<[^>]*data-content\s*=\s*["']about\.paragraphs["'][^>]*>)([\s\S]*?)(<\/[^>]+>)/gi;
    result = result.replace(aboutDcPattern, `$1\n${aboutParagraphsHtml}\n    $3`);
  }

  // ── Sync services section ──
  if (content.services.length > 0) {
    const servicesHtml = content.services
      .map(
        (s) =>
          `    <div class="service-item" data-item="service">\n      <h3>${escapeHtml(s.name)}</h3>${s.description ? `\n      <p>${escapeHtml(s.description)}</p>` : ""}\n    </div>`
      )
      .join("\n");

    result = replaceSectionContent(result, "services", servicesHtml);
  }

  // ── Sync projects section ──
  if (content.projects.length > 0) {
    const projectsHtml = content.projects
      .map((p) => {
        const tagsHtml =
          p.tags && p.tags.length > 0
            ? `\n      <div class="tags">${p.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join(" ")}</div>`
            : "";
        const urlHtml = p.url ? ` data-url="${escapeHtml(p.url)}"` : "";
        return `    <div class="project-item" data-item="project"${urlHtml}>\n      <h3>${escapeHtml(p.name)}</h3>${p.description ? `\n      <p>${escapeHtml(p.description)}</p>` : ""}${tagsHtml}\n    </div>`;
      })
      .join("\n");

    result = replaceSectionContent(result, "projects", projectsHtml);
  }

  // ── Sync clients section ──
  if (content.clients.length > 0) {
    const clientsHtml = content.clients
      .map((c) => {
        if (c.url) {
          return `    <div class="client-item" data-item="client"><a href="${escapeHtml(c.url)}">${escapeHtml(c.name)}</a></div>`;
        }
        return `    <div class="client-item" data-item="client"><span>${escapeHtml(c.name)}</span></div>`;
      })
      .join("\n");

    result = replaceSectionContent(result, "clients", clientsHtml);
  }

  // ── Sync navigation ──
  if (content.navigation.length > 0) {
    const navHtml = content.navigation
      .map(
        (n) =>
          `    <a href="${escapeHtml(n.href)}">${escapeHtml(n.label)}</a>`
      )
      .join("\n");

    result = replaceSectionContent(result, "navigation", navHtml);
  }

  // ── Sync social links ──
  if (content.socialLinks.length > 0) {
    const socialHtml = content.socialLinks
      .map(
        (s) =>
          `      <a href="${escapeHtml(s.url)}" data-platform="${escapeHtml(s.platform)}" aria-label="${escapeHtml(s.label || s.platform)}">${escapeHtml(s.label || s.platform)}</a>`
      )
      .join("\n");

    result = replaceSectionContent(result, "social", socialHtml);
  }

  return result;
}

/**
 * Replace inner content of a section matched by data-section, id, or class,
 * while preserving the opening heading (h2/h3) if present.
 */
function replaceSectionContent(
  html: string,
  sectionName: string,
  newInnerHtml: string
): string {
  // Match by data-section attribute
  const patterns = [
    new RegExp(
      `(<(?:section|div|article|nav|footer)[^>]*\\bdata-section\\s*=\\s*["']${escapeRegex(sectionName)}["'][^>]*>)([\\s\\S]*?)(</(?:section|div|article|nav|footer)>)`,
      "i"
    ),
    new RegExp(
      `(<(?:section|div|article|nav|footer)[^>]*\\bid\\s*=\\s*["']${escapeRegex(sectionName)}["'][^>]*>)([\\s\\S]*?)(</(?:section|div|article|nav|footer)>)`,
      "i"
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      const openTag = match[1];
      const existingContent = match[2];
      const closeTag = match[3];

      // Preserve the heading if it exists
      const headingMatch = existingContent.match(
        /(\s*<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>)/i
      );
      const heading = headingMatch ? headingMatch[1] : "";

      return html.replace(
        pattern,
        `${openTag}${heading}\n${newInnerHtml}\n  ${closeTag}`
      );
    }
  }

  return html;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ─── Server Setup ────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "design-variant-manager",
  version: "1.0.0",
});

// ─── Tool: create_variant ────────────────────────────────────────────────────

server.tool(
  "create_variant",
  "Scaffolds a new design variant HTML file. Takes a variant name and an optional base template path to copy from. Registers the variant in the project's variant manifest.",
  {
    name: z
      .string()
      .describe(
        "Name for the variant (e.g. 'glitch', 'editorial', 'terminal')"
      ),
    project_dir: z
      .string()
      .describe(
        "Absolute path to the project directory containing the site files"
      ),
    base_template: z
      .string()
      .optional()
      .describe(
        "Optional absolute path to an existing HTML file to copy as the starting point"
      ),
  },
  async ({ name, project_dir, base_template }) => {
    try {
      // Ensure variants directory exists
      const variantsDir = path.join(project_dir, VARIANTS_DIR);
      await ensureDir(variantsDir);

      // Read existing manifest
      const manifest = await readManifest(project_dir);

      // Check for duplicate
      if (manifest.variants.some((v) => v.name === name)) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: A variant named "${name}" already exists in this project.`,
            },
          ],
        };
      }

      // Determine file content
      const fileName = `${name}.html`;
      const filePath = path.join(variantsDir, fileName);
      const relativeFile = path.join(VARIANTS_DIR, fileName);

      let htmlContent: string;
      if (base_template) {
        try {
          htmlContent = await fs.readFile(base_template, "utf-8");
        } catch {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error: Could not read base template at "${base_template}". File not found or not readable.`,
              },
            ],
          };
        }
      } else {
        htmlContent = generateBoilerplateHtml(name);
      }

      // Write the variant file
      await fs.writeFile(filePath, htmlContent, "utf-8");

      // Register in manifest
      manifest.variants.push({
        name,
        file: relativeFile,
        created: new Date().toISOString(),
      });
      await writeManifest(project_dir, manifest);

      return {
        content: [
          {
            type: "text" as const,
            text: [
              `✓ Created variant "${name}"`,
              `  File: ${filePath}`,
              `  Manifest: ${path.join(project_dir, MANIFEST_FILE)}`,
              base_template
                ? `  Copied from: ${base_template}`
                : `  Template: default boilerplate with data-content markers`,
              ``,
              `Total variants: ${manifest.variants.length}`,
            ].join("\n"),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error creating variant: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
      };
    }
  }
);

// ─── Tool: list_variants ─────────────────────────────────────────────────────

server.tool(
  "list_variants",
  "Lists all registered design variants for a project, showing their file paths and last modified timestamps.",
  {
    project_dir: z
      .string()
      .describe("Absolute path to the project directory"),
  },
  async ({ project_dir }) => {
    try {
      const manifest = await readManifest(project_dir);

      if (manifest.variants.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No variants registered for this project. Use create_variant to add one.",
            },
          ],
        };
      }

      const lines: string[] = [
        `Design Variants (${manifest.variants.length}):`,
        "",
      ];

      for (const variant of manifest.variants) {
        const absPath = path.join(project_dir, variant.file);
        let lastModified = "unknown";
        let fileSize = "unknown";
        try {
          const stat = await fs.stat(absPath);
          lastModified = stat.mtime.toISOString();
          fileSize = `${(stat.size / 1024).toFixed(1)}KB`;
        } catch {
          lastModified = "file missing";
          fileSize = "—";
        }

        lines.push(`  • ${variant.name}`);
        lines.push(`    File: ${variant.file}`);
        lines.push(`    Path: ${absPath}`);
        lines.push(`    Size: ${fileSize}`);
        lines.push(`    Created: ${variant.created}`);
        lines.push(`    Last modified: ${lastModified}`);
        lines.push("");
      }

      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error listing variants: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
      };
    }
  }
);

// ─── Tool: generate_router ───────────────────────────────────────────────────

server.tool(
  "generate_router",
  "Generates or updates the index.html router file that randomly serves one of the registered design variants. Supports strategies: 'random', 'session', or 'sequential'.",
  {
    project_dir: z
      .string()
      .describe("Absolute path to the project directory"),
    strategy: z
      .enum(["random", "session", "sequential"])
      .optional()
      .default("session")
      .describe(
        "Routing strategy: 'random' (pure random each visit), 'session' (same per session), or 'sequential' (cycles in order). Defaults to 'session'."
      ),
  },
  async ({ project_dir, strategy }) => {
    try {
      const manifest = await readManifest(project_dir);

      if (manifest.variants.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Error: No variants registered. Create at least one variant before generating a router.",
            },
          ],
        };
      }

      const routerHtml = generateRouterHtml(manifest.variants, strategy);
      const routerPath = path.join(project_dir, "index.html");
      await fs.writeFile(routerPath, routerHtml, "utf-8");

      return {
        content: [
          {
            type: "text" as const,
            text: [
              `✓ Router generated at ${routerPath}`,
              `  Strategy: ${strategy}`,
              `  Variants (${manifest.variants.length}):`,
              ...manifest.variants.map((v) => `    - ${v.name} → ${v.file}`),
              ``,
              `The router will redirect visitors to one of the variant files using the "${strategy}" strategy.`,
              strategy === "session"
                ? "Each browser session gets a consistent variant; new sessions get a random one."
                : strategy === "sequential"
                  ? "Each visit advances to the next variant in order, cycling back to the start."
                  : "Each visit picks a completely random variant.",
            ].join("\n"),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error generating router: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
      };
    }
  }
);

// ─── Tool: extract_content ───────────────────────────────────────────────────

server.tool(
  "extract_content",
  "Parses an existing HTML file and extracts all text content into a structured JSON manifest (projects, services, clients, social links, hero text, about text, etc.). Saves it as content.json in the project directory.",
  {
    file_path: z
      .string()
      .describe("Absolute path to an HTML file to extract content from"),
    project_dir: z
      .string()
      .describe(
        "Absolute path to the project directory to save content.json"
      ),
  },
  async ({ file_path, project_dir }) => {
    try {
      const html = await fs.readFile(file_path, "utf-8");
      const content = makeDefaultContent();

      content.meta.extractedFrom = file_path;
      content.meta.extractedAt = new Date().toISOString();

      // ── Title ──
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      if (titleMatch) content.meta.title = stripHtml(titleMatch[1]);

      // ── Meta description ──
      const descMatch = html.match(
        /<meta[^>]*name\s*=\s*["']description["'][^>]*content\s*=\s*["']([^"']*)["']/i
      );
      if (descMatch) content.meta.description = descMatch[1];

      // ── Hero section ──
      const heroHtml = extractSection(html, "hero");
      if (heroHtml) {
        content.hero.headline = extractInnerText(
          heroHtml,
          /<h1[^>]*>([\s\S]*?)<\/h1>/i
        );
        // Get the first <p> as subheadline
        const subMatch = heroHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
        if (subMatch) content.hero.subheadline = stripHtml(subMatch[1]);
        // CTA from links
        const ctaLinks = extractLinks(heroHtml);
        if (ctaLinks.length > 0) content.hero.cta = ctaLinks[0].text;
      } else {
        // Fallback: grab first h1 as headline
        content.hero.headline = extractInnerText(
          html,
          /<h1[^>]*>([\s\S]*?)<\/h1>/i
        );
      }

      // ── About section ──
      const aboutHtml = extractSection(html, "about");
      if (aboutHtml) {
        const heading = extractInnerText(
          aboutHtml,
          /<h[2-3][^>]*>([\s\S]*?)<\/h[2-3]>/i
        );
        if (heading) content.about.heading = heading;
        content.about.paragraphs = extractAll(
          aboutHtml,
          /<p[^>]*>([\s\S]*?)<\/p>/gi
        );
      }

      // ── Services section ──
      const servicesHtml = extractSection(html, "services");
      if (servicesHtml) {
        const serviceItems = extractAll(
          servicesHtml,
          /<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/gi
        );
        const serviceDescs = extractAll(
          servicesHtml,
          /<p[^>]*>([\s\S]*?)<\/p>/gi
        );
        // Skip first heading if it's the section title
        const startIdx = serviceItems.length > serviceDescs.length ? 1 : 0;
        for (let i = startIdx; i < serviceItems.length; i++) {
          content.services.push({
            name: serviceItems[i],
            description: serviceDescs[i - startIdx] || undefined,
          });
        }
      }

      // ── Projects section ──
      const projectsHtml = extractSection(html, "projects") || extractSection(html, "work") || extractSection(html, "portfolio");
      if (projectsHtml) {
        const projectNames = extractAll(
          projectsHtml,
          /<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/gi
        );
        const projectDescs = extractAll(
          projectsHtml,
          /<p[^>]*>([\s\S]*?)<\/p>/gi
        );
        const startIdx = projectNames.length > projectDescs.length ? 1 : 0;
        for (let i = startIdx; i < projectNames.length; i++) {
          content.projects.push({
            name: projectNames[i],
            description: projectDescs[i - startIdx] || undefined,
          });
        }
      }

      // ── Clients section ──
      const clientsHtml = extractSection(html, "clients");
      if (clientsHtml) {
        const clientLinks = extractLinks(clientsHtml);
        if (clientLinks.length > 0) {
          for (const link of clientLinks) {
            content.clients.push({
              name: link.text,
              url: link.href || undefined,
            });
          }
        } else {
          // Try list items
          const clientItems = extractAll(
            clientsHtml,
            /<li[^>]*>([\s\S]*?)<\/li>/gi
          );
          for (const item of clientItems) {
            content.clients.push({ name: item });
          }
        }
      }

      // ── Navigation ──
      const navHtml =
        extractSection(html, "navigation") ||
        html.match(/<nav[^>]*>([\s\S]*?)<\/nav>/i)?.[1];
      if (navHtml) {
        const navLinks = extractLinks(navHtml);
        for (const link of navLinks) {
          content.navigation.push({
            label: link.text,
            href: link.href,
          });
        }
      }

      // ── Social links ──
      const socialHtml =
        extractSection(html, "social") || extractSection(html, "socials");
      if (socialHtml) {
        const socialLinks = extractLinks(socialHtml);
        for (const link of socialLinks) {
          content.socialLinks.push({
            platform: detectPlatform(link.href),
            url: link.href,
            label: link.text || undefined,
          });
        }
      } else {
        // Fallback: scan footer or whole doc for known social URLs
        const footerHtml =
          html.match(/<footer[^>]*>([\s\S]*?)<\/footer>/i)?.[1] || "";
        const allLinks = extractLinks(footerHtml || html);
        for (const link of allLinks) {
          const platform = detectPlatform(link.href);
          if (platform !== "Website") {
            content.socialLinks.push({
              platform,
              url: link.href,
              label: link.text || undefined,
            });
          }
        }
      }

      // ── Contact section ──
      const contactHtml = extractSection(html, "contact");
      if (contactHtml) {
        // Try to find email
        const emailMatch = contactHtml.match(
          /[\w.+-]+@[\w-]+\.[\w.]+/
        );
        if (emailMatch) content.contact.email = emailMatch[0];

        // Try to find phone
        const phoneMatch = contactHtml.match(
          /[\+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{7,}/
        );
        if (phoneMatch) content.contact.phone = phoneMatch[0].trim();
      }

      // ── Footer ──
      const footerHtml = extractSection(html, "footer") || html.match(/<footer[^>]*>([\s\S]*?)<\/footer>/i)?.[1];
      if (footerHtml) {
        const footerParagraphs = extractAll(
          footerHtml,
          /<p[^>]*>([\s\S]*?)<\/p>/gi
        );
        if (footerParagraphs.length > 0) {
          const copyrightP = footerParagraphs.find(
            (p) => p.includes("©") || p.toLowerCase().includes("copyright")
          );
          if (copyrightP) {
            content.footer.copyright = copyrightP;
            content.footer.text = footerParagraphs
              .filter((p) => p !== copyrightP)
              .join(" ");
          } else {
            content.footer.text = footerParagraphs.join(" ");
          }
        }
      }

      // Save content manifest
      await ensureDir(project_dir);
      await writeContentManifest(project_dir, content);

      // Summary
      const stats = [
        content.meta.title ? `Title: "${content.meta.title}"` : null,
        content.hero.headline
          ? `Hero: "${content.hero.headline}"`
          : null,
        `About: ${content.about.paragraphs.length} paragraphs`,
        `Services: ${content.services.length}`,
        `Projects: ${content.projects.length}`,
        `Clients: ${content.clients.length}`,
        `Social links: ${content.socialLinks.length}`,
        `Navigation items: ${content.navigation.length}`,
      ].filter(Boolean);

      return {
        content: [
          {
            type: "text" as const,
            text: [
              `✓ Content extracted from ${file_path}`,
              `  Saved to: ${path.join(project_dir, CONTENT_FILE)}`,
              ``,
              `Extracted:`,
              ...stats.map((s) => `  • ${s}`),
              ``,
              `Edit content.json to update any values, then use sync_content to push changes to all variants.`,
            ].join("\n"),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error extracting content: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
      };
    }
  }
);

// ─── Tool: sync_content ──────────────────────────────────────────────────────

server.tool(
  "sync_content",
  "Takes the content.json manifest and updates all registered variant HTML files with the current content. Matches sections by semantic markers (headings, section IDs, data attributes) and replaces text content while preserving each variant's unique markup and styling.",
  {
    project_dir: z
      .string()
      .describe(
        "Absolute path to the project directory containing content.json and variant files"
      ),
    variants: z
      .string()
      .optional()
      .describe(
        "Optional comma-separated list of variant names to sync. If omitted, syncs all variants."
      ),
  },
  async ({ project_dir, variants: variantFilter }) => {
    try {
      // Load content manifest
      const content = await readContentManifest(project_dir);
      if (!content) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: No content.json found in "${project_dir}". Run extract_content first to create one.`,
            },
          ],
        };
      }

      // Load variant manifest
      const manifest = await readManifest(project_dir);
      if (manifest.variants.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Error: No variants registered. Use create_variant to add variants first.",
            },
          ],
        };
      }

      // Determine which variants to sync
      let targetVariants = manifest.variants;
      if (variantFilter) {
        const filterNames = variantFilter
          .split(",")
          .map((s) => s.trim().toLowerCase());
        targetVariants = manifest.variants.filter((v) =>
          filterNames.includes(v.name.toLowerCase())
        );

        if (targetVariants.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error: No matching variants found for filter "${variantFilter}". Available: ${manifest.variants.map((v) => v.name).join(", ")}`,
              },
            ],
          };
        }
      }

      const results: string[] = [];
      let successCount = 0;
      let errorCount = 0;

      for (const variant of targetVariants) {
        const absPath = path.join(project_dir, variant.file);
        try {
          const html = await fs.readFile(absPath, "utf-8");
          const updatedHtml = syncContentIntoHtml(html, content);
          await fs.writeFile(absPath, updatedHtml, "utf-8");
          results.push(`  ✓ ${variant.name} (${variant.file})`);
          successCount++;
        } catch (err) {
          results.push(
            `  ✗ ${variant.name}: ${err instanceof Error ? err.message : String(err)}`
          );
          errorCount++;
        }
      }

      return {
        content: [
          {
            type: "text" as const,
            text: [
              `Content sync complete:`,
              `  Synced: ${successCount}/${targetVariants.length}${errorCount > 0 ? ` (${errorCount} errors)` : ""}`,
              ``,
              `Results:`,
              ...results,
              ``,
              `Content from ${CONTENT_FILE} has been injected into the variant files.`,
              `Each variant's unique markup and styling has been preserved.`,
            ].join("\n"),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error syncing content: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
      };
    }
  }
);

// ─── Start Server ────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
