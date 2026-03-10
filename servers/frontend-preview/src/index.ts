#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as http from "node:http";
import * as fs from "node:fs";
import * as path from "node:path";
import puppeteer, { type Browser, type Page } from "puppeteer";

// ---------------------------------------------------------------------------
// Helpers – local HTTP server
// ---------------------------------------------------------------------------

interface LocalServer {
  server: http.Server;
  port: number;
  baseDir: string;
}

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
  ".otf": "font/otf",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

/** Start a disposable static file server rooted at `baseDir`. */
function startServer(baseDir: string): Promise<LocalServer> {
  return new Promise((resolve, reject) => {
    const srv = http.createServer((req, res) => {
      const url = new URL(req.url ?? "/", `http://localhost`);
      let filePath = path.join(baseDir, decodeURIComponent(url.pathname));

      // Default to index.html for directory requests
      if (filePath.endsWith("/") || !path.extname(filePath)) {
        const tryIndex = filePath.endsWith("/")
          ? path.join(filePath, "index.html")
          : filePath + ".html";
        if (fs.existsSync(tryIndex)) filePath = tryIndex;
        else if (
          !path.extname(filePath) &&
          fs.existsSync(filePath + "/index.html")
        )
          filePath = filePath + "/index.html";
      }

      // Security: prevent directory traversal
      if (!filePath.startsWith(baseDir)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }
        const ext = path.extname(filePath).toLowerCase();
        const mime = MIME_TYPES[ext] ?? "application/octet-stream";
        res.writeHead(200, { "Content-Type": mime });
        res.end(data);
      });
    });

    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      if (addr && typeof addr === "object") {
        resolve({ server: srv, port: addr.port, baseDir });
      } else {
        reject(new Error("Failed to start server"));
      }
    });
    srv.on("error", reject);
  });
}

// ---------------------------------------------------------------------------
// Helpers – Puppeteer
// ---------------------------------------------------------------------------

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.connected) return browserInstance;
  browserInstance = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });
  return browserInstance;
}

/** JS to inject into pages that forces all scroll-reveal elements visible. */
const RESOLVE_SCROLL_ANIMATIONS_JS = `
(async () => {
  // 1. Add common reveal classes to every element that looks hidden via
  //    opacity:0 or translateY and has a transition/animation property.
  const revealClasses = ['visible', 'vis', 'revealed', 'active', 'show', 'in-view', 'is-visible', 'animate', 'animated', 'fade-in', 'loaded'];

  const allEls = document.querySelectorAll('*');
  for (const el of allEls) {
    const style = window.getComputedStyle(el);
    const hasTransition = style.transition && style.transition !== 'all 0s ease 0s' && style.transition !== 'none';
    const hasAnimation = style.animationName && style.animationName !== 'none';
    const isHidden = parseFloat(style.opacity) === 0 ||
                     (style.transform && style.transform !== 'none' && style.transform.includes('matrix'));

    if (isHidden && (hasTransition || hasAnimation)) {
      for (const cls of revealClasses) {
        el.classList.add(cls);
      }
      el.style.opacity = '1';
      el.style.transform = 'none';
      el.style.visibility = 'visible';
    }
  }

  // 2. Also force-fire all IntersectionObserver callbacks with isIntersecting=true.
  //    We override IntersectionObserver before any scripts run (see page.evaluateOnNewDocument),
  //    but for elements already hidden we still force-show them above.

  // 3. Scroll the entire page to trigger any scroll-event-based reveals, then return to top.
  const scrollHeight = document.body.scrollHeight;
  const viewportHeight = window.innerHeight;
  for (let y = 0; y < scrollHeight; y += viewportHeight) {
    window.scrollTo(0, y);
    await new Promise(r => setTimeout(r, 100));
  }
  window.scrollTo(0, 0);
  await new Promise(r => setTimeout(r, 300));

  // 4. Final pass: force any remaining hidden elements visible.
  const allEls2 = document.querySelectorAll('*');
  for (const el of allEls2) {
    const style = window.getComputedStyle(el);
    if (parseFloat(style.opacity) === 0) {
      const hasTransition = style.transition && style.transition !== 'all 0s ease 0s' && style.transition !== 'none';
      const hasAnimation = style.animationName && style.animationName !== 'none';
      if (hasTransition || hasAnimation) {
        el.style.opacity = '1';
        el.style.transform = 'none';
        el.style.visibility = 'visible';
      }
    }
  }
  await new Promise(r => setTimeout(r, 200));
})();
`;

/** Override IntersectionObserver so callbacks fire immediately with isIntersecting=true. */
const OVERRIDE_INTERSECTION_OBSERVER_JS = `
if (typeof window.IntersectionObserver !== 'undefined') {
  const OrigIO = window.IntersectionObserver;
  window.IntersectionObserver = class extends OrigIO {
    constructor(callback, options) {
      super((entries, observer) => {
        const fakeEntries = entries.map(e => ({
          ...e,
          isIntersecting: true,
          intersectionRatio: 1.0,
        }));
        callback(fakeEntries, observer);
      }, options);
    }
  };
}
`;

interface ViewportConfig {
  width: number;
  height: number;
}

function getViewport(viewport?: string): ViewportConfig {
  if (viewport === "mobile") return { width: 390, height: 844 };
  return { width: 1280, height: 800 };
}

async function openPageAndResolve(
  url: string,
  viewport: ViewportConfig
): Promise<Page> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setViewport(viewport);

  // Override IntersectionObserver before page scripts run
  await page.evaluateOnNewDocument(OVERRIDE_INTERSECTION_OBSERVER_JS);

  await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

  // Resolve scroll animations
  await page.evaluate(RESOLVE_SCROLL_ANIMATIONS_JS);

  return page;
}

/** Serve a file and return the URL + server handle. */
async function serveFile(filePath: string): Promise<{ url: string; local: LocalServer }> {
  const absPath = path.resolve(filePath);
  if (!fs.existsSync(absPath)) throw new Error(`File not found: ${absPath}`);
  const baseDir = path.dirname(absPath);
  const local = await startServer(baseDir);
  const fileName = path.basename(absPath);
  const url = `http://127.0.0.1:${local.port}/${fileName}`;
  return { url, local };
}

// ---------------------------------------------------------------------------
// Helpers – contrast checking
// ---------------------------------------------------------------------------

function hexToRgb(hex: string): [number, number, number] {
  hex = hex.replace("#", "");
  if (hex.length === 3)
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  return [
    parseInt(hex.substring(0, 2), 16),
    parseInt(hex.substring(2, 4), 16),
    parseInt(hex.substring(4, 6), 16),
  ];
}

function parseColor(color: string): [number, number, number, number] {
  // rgba(r, g, b, a) or rgb(r, g, b)
  const rgbaMatch = color.match(
    /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/
  );
  if (rgbaMatch) {
    return [
      parseFloat(rgbaMatch[1]),
      parseFloat(rgbaMatch[2]),
      parseFloat(rgbaMatch[3]),
      rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1,
    ];
  }
  if (color.startsWith("#")) {
    const [r, g, b] = hexToRgb(color);
    return [r, g, b, 1];
  }
  // Fallback: assume black
  return [0, 0, 0, 1];
}

function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r / 255, g / 255, b / 255].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(fg: [number, number, number], bg: [number, number, number]): number {
  const l1 = relativeLuminance(...fg);
  const l2 = relativeLuminance(...bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Blend foreground RGBA over background RGB. */
function blendColors(
  fg: [number, number, number, number],
  bg: [number, number, number]
): [number, number, number] {
  const a = fg[3];
  return [
    Math.round(fg[0] * a + bg[0] * (1 - a)),
    Math.round(fg[1] * a + bg[1] * (1 - a)),
    Math.round(fg[2] * a + bg[2] * (1 - a)),
  ];
}

// ---------------------------------------------------------------------------
// MCP Server setup
// ---------------------------------------------------------------------------

const server = new McpServer({
  name: "frontend-preview",
  version: "1.0.0",
});

// ---- Tool: preview_full_page -----------------------------------------------

server.tool(
  "preview_full_page",
  "Serves an HTML file locally and takes a full-page screenshot with all scroll-reveal animations resolved. Returns the screenshot as an image. Supports desktop (1280px) and mobile (390px) viewports.",
  {
    file_path: z.string().describe("Absolute path to the HTML file to preview"),
    viewport: z
      .enum(["desktop", "mobile"])
      .optional()
      .describe("Viewport size: 'desktop' (1280x800) or 'mobile' (390x844). Defaults to desktop."),
  },
  async ({ file_path, viewport }) => {
    let local: LocalServer | null = null;
    let page: Page | null = null;
    try {
      const { url, local: srv } = await serveFile(file_path);
      local = srv;
      const vp = getViewport(viewport);
      page = await openPageAndResolve(url, vp);

      const screenshotBuffer = await page.screenshot({
        fullPage: true,
        type: "png",
        encoding: "binary",
      });
      const base64 = Buffer.from(screenshotBuffer).toString("base64");

      return {
        content: [
          {
            type: "image" as const,
            data: base64,
            mimeType: "image/png",
          },
          {
            type: "text" as const,
            text: `Full-page screenshot of ${path.basename(file_path)} (${viewport ?? "desktop"} viewport)`,
          },
        ],
      };
    } finally {
      if (page) await page.close().catch(() => {});
      if (local) local.server.close();
    }
  }
);

// ---- Tool: preview_section -------------------------------------------------

server.tool(
  "preview_section",
  "Takes a screenshot of a specific section of an HTML page at 1:1 scale. Identifies sections by CSS selector, heading text, or section index (0-based). Resolves scroll animations first.",
  {
    file_path: z.string().describe("Absolute path to the HTML file"),
    selector: z
      .string()
      .describe(
        "CSS selector, heading text (e.g. 'Services'), or section index (e.g. '0' for first section)"
      ),
  },
  async ({ file_path, selector }) => {
    let local: LocalServer | null = null;
    let page: Page | null = null;
    try {
      const { url, local: srv } = await serveFile(file_path);
      local = srv;
      const vp = getViewport("desktop");
      page = await openPageAndResolve(url, vp);

      // Try to locate the element by different strategies
      const elementHandle = await page.evaluateHandle((sel: string) => {
        // 1. Try as CSS selector
        try {
          const el = document.querySelector(sel);
          if (el) return el;
        } catch {
          // Not a valid CSS selector, continue
        }

        // 2. Try as numeric index into major sections
        const indexNum = parseInt(sel, 10);
        if (!isNaN(indexNum)) {
          const sections = document.querySelectorAll(
            "section, [class*='section'], header, footer, main, article, .hero, [class*='hero'], nav"
          );
          if (sections[indexNum]) return sections[indexNum];
        }

        // 3. Try as heading text
        const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
        for (const h of headings) {
          if (
            h.textContent &&
            h.textContent.trim().toLowerCase().includes(sel.toLowerCase())
          ) {
            // Return the closest section-like parent, or the heading's parent
            const sectionParent = h.closest(
              "section, [class*='section'], article, main, header, footer, div"
            );
            return sectionParent ?? h.parentElement ?? h;
          }
        }

        return null;
      }, selector);

      const element = elementHandle.asElement();
      if (!element) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Could not find element matching "${selector}". Try a CSS selector like "#hero", a heading text like "Services", or a section index like "0".`,
            },
          ],
        };
      }

      const screenshotBuffer = await element.screenshot({
        type: "png",
        encoding: "binary",
      });
      const base64 = Buffer.from(screenshotBuffer).toString("base64");

      return {
        content: [
          {
            type: "image" as const,
            data: base64,
            mimeType: "image/png",
          },
          {
            type: "text" as const,
            text: `Section screenshot for selector "${selector}" from ${path.basename(file_path)}`,
          },
        ],
      };
    } finally {
      if (page) await page.close().catch(() => {});
      if (local) local.server.close();
    }
  }
);

// ---- Tool: check_contrast --------------------------------------------------

server.tool(
  "check_contrast",
  "Scans all visible text elements in an HTML file and checks their color contrast ratios against WCAG AA standards (4.5:1 for normal text, 3:1 for large text). Returns failing elements with details.",
  {
    file_path: z.string().describe("Absolute path to the HTML file to check"),
  },
  async ({ file_path }) => {
    let local: LocalServer | null = null;
    let page: Page | null = null;
    try {
      const { url, local: srv } = await serveFile(file_path);
      local = srv;
      const vp = getViewport("desktop");
      page = await openPageAndResolve(url, vp);

      // Extract text element info from the page
      const elements = await page.evaluate(() => {
        const results: Array<{
          selector: string;
          text: string;
          fgColor: string;
          bgColor: string;
          fontSize: string;
          fontWeight: string;
        }> = [];

        const textTags = [
          "p", "span", "a", "h1", "h2", "h3", "h4", "h5", "h6",
          "li", "td", "th", "label", "button", "div", "strong", "em",
          "b", "i", "small", "blockquote", "figcaption", "dt", "dd",
        ];

        // Build a CSS-like selector for the element
        function getSelector(el: Element): string {
          if (el.id) return `#${el.id}`;
          let sel = el.tagName.toLowerCase();
          if (el.className && typeof el.className === "string") {
            const classes = el.className.trim().split(/\s+/).slice(0, 2).join(".");
            if (classes) sel += "." + classes;
          }
          return sel;
        }

        // Walk up the tree to find the effective background color
        function getEffectiveBgColor(el: Element): string {
          let current: Element | null = el;
          while (current) {
            const style = window.getComputedStyle(current);
            const bg = style.backgroundColor;
            if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
              return bg;
            }
            current = current.parentElement;
          }
          return "rgb(255, 255, 255)"; // default white
        }

        for (const tag of textTags) {
          const els = document.querySelectorAll(tag);
          for (const el of els) {
            // Only check elements with direct text content
            const text = el.textContent?.trim() ?? "";
            if (!text || text.length > 200) continue;

            // Check visibility
            const style = window.getComputedStyle(el);
            if (
              style.display === "none" ||
              style.visibility === "hidden" ||
              parseFloat(style.opacity) === 0
            )
              continue;

            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) continue;

            results.push({
              selector: getSelector(el),
              text: text.substring(0, 80),
              fgColor: style.color,
              bgColor: getEffectiveBgColor(el),
              fontSize: style.fontSize,
              fontWeight: style.fontWeight,
            });
          }
        }
        return results;
      });

      // Check contrast ratios
      interface FailingElement {
        selector: string;
        text: string;
        ratio: string;
        required: string;
        fgColor: string;
        bgColor: string;
        fontSize: string;
      }

      const failures: FailingElement[] = [];

      for (const el of elements) {
        const fgParsed = parseColor(el.fgColor);
        const bgParsed = parseColor(el.bgColor);
        const bgRgb: [number, number, number] = [bgParsed[0], bgParsed[1], bgParsed[2]];
        const blended = blendColors(fgParsed, bgRgb);
        const ratio = contrastRatio(blended, bgRgb);

        // Determine if large text: >=18px or >=14px bold
        const fontSizePx = parseFloat(el.fontSize);
        const fontWeight = parseInt(el.fontWeight, 10);
        const isLarge = fontSizePx >= 18 || (fontSizePx >= 14 && fontWeight >= 700);
        const required = isLarge ? 3 : 4.5;

        if (ratio < required) {
          failures.push({
            selector: el.selector,
            text: el.text,
            ratio: ratio.toFixed(2),
            required: `${required}:1`,
            fgColor: el.fgColor,
            bgColor: el.bgColor,
            fontSize: el.fontSize,
          });
        }
      }

      if (failures.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `✅ All ${elements.length} text elements pass WCAG AA contrast requirements in ${path.basename(file_path)}.`,
            },
          ],
        };
      }

      // Deduplicate by selector+colors
      const seen = new Set<string>();
      const unique = failures.filter((f) => {
        const key = `${f.selector}|${f.fgColor}|${f.bgColor}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      let report = `⚠️ Found ${unique.length} contrast issue(s) in ${path.basename(file_path)}:\n\n`;
      for (const f of unique) {
        report += `• ${f.selector}\n`;
        report += `  Text: "${f.text}"\n`;
        report += `  Ratio: ${f.ratio}:1 (needs ${f.required})\n`;
        report += `  FG: ${f.fgColor} | BG: ${f.bgColor}\n`;
        report += `  Font size: ${f.fontSize}\n\n`;
      }

      return {
        content: [{ type: "text" as const, text: report }],
      };
    } finally {
      if (page) await page.close().catch(() => {});
      if (local) local.server.close();
    }
  }
);

// ---- Tool: compare_designs -------------------------------------------------

server.tool(
  "compare_designs",
  "Takes full-page screenshots of multiple HTML files and returns them for side-by-side comparison. Resolves scroll animations on all files. Useful for comparing design variants.",
  {
    file_paths: z
      .string()
      .describe("Comma-separated absolute paths to HTML files to compare"),
    viewport: z
      .enum(["desktop", "mobile"])
      .optional()
      .describe("Viewport size: 'desktop' or 'mobile'. Defaults to desktop."),
  },
  async ({ file_paths, viewport }) => {
    const paths = file_paths
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);

    if (paths.length < 2) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Please provide at least 2 comma-separated file paths to compare.",
          },
        ],
      };
    }

    const vp = getViewport(viewport);
    const content: Array<{ type: "image"; data: string; mimeType: "image/png" } | { type: "text"; text: string }> = [];

    for (const filePath of paths) {
      let local: LocalServer | null = null;
      let page: Page | null = null;
      try {
        const { url, local: srv } = await serveFile(filePath);
        local = srv;
        page = await openPageAndResolve(url, vp);

        const screenshotBuffer = await page.screenshot({
          fullPage: true,
          type: "png",
          encoding: "binary",
        });
        const base64 = Buffer.from(screenshotBuffer).toString("base64");

        content.push({
          type: "text" as const,
          text: `--- ${path.basename(filePath)} (${viewport ?? "desktop"}) ---`,
        });
        content.push({
          type: "image" as const,
          data: base64,
          mimeType: "image/png" as const,
        });
      } catch (err) {
        content.push({
          type: "text" as const,
          text: `Error processing ${filePath}: ${err instanceof Error ? err.message : String(err)}`,
        });
      } finally {
        if (page) await page.close().catch(() => {});
        if (local) local.server.close();
      }
    }

    return { content };
  }
);

// ---- Tool: list_elements ---------------------------------------------------

server.tool(
  "list_elements",
  "Lists all major sections and their key properties (background color, text color, font, approximate height) for an HTML file. Useful for understanding visual structure without a screenshot.",
  {
    file_path: z.string().describe("Absolute path to the HTML file"),
  },
  async ({ file_path }) => {
    let local: LocalServer | null = null;
    let page: Page | null = null;
    try {
      const { url, local: srv } = await serveFile(file_path);
      local = srv;
      const vp = getViewport("desktop");
      page = await openPageAndResolve(url, vp);

      const sections = await page.evaluate(() => {
        const sectionSelectors = [
          "nav",
          "header",
          "section",
          "[class*='section']",
          "[class*='hero']",
          "main",
          "article",
          "footer",
          "[class*='banner']",
          "[class*='cta']",
        ];

        const elements = new Set<Element>();
        for (const sel of sectionSelectors) {
          document.querySelectorAll(sel).forEach((el) => elements.add(el));
        }

        // Sort by document position
        const sorted = Array.from(elements).sort((a, b) => {
          const pos = a.compareDocumentPosition(b);
          if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
          if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
          return 0;
        });

        // Filter out nested sections (keep outermost only)
        const topLevel: Element[] = [];
        for (const el of sorted) {
          const isNested = topLevel.some((parent) => parent.contains(el));
          if (!isNested) topLevel.push(el);
        }

        return topLevel.map((el, index) => {
          const style = window.getComputedStyle(el);
          const rect = el.getBoundingClientRect();

          // Build identifier
          let id = el.tagName.toLowerCase();
          if (el.id) id += `#${el.id}`;
          if (el.className && typeof el.className === "string") {
            const classes = el.className.trim().split(/\s+/).slice(0, 3).join(".");
            if (classes) id += `.${classes}`;
          }

          // Get first heading inside
          const heading = el.querySelector("h1, h2, h3, h4, h5, h6");
          const headingText = heading?.textContent?.trim().substring(0, 60) ?? "";

          // Background color: walk up if transparent
          let bgColor = style.backgroundColor;
          let current: Element | null = el;
          while (
            bgColor === "rgba(0, 0, 0, 0)" ||
            bgColor === "transparent"
          ) {
            current = current.parentElement;
            if (!current) {
              bgColor = "rgb(255, 255, 255)";
              break;
            }
            bgColor = window.getComputedStyle(current).backgroundColor;
          }

          return {
            index,
            element: id,
            heading: headingText,
            bgColor,
            textColor: style.color,
            font: style.fontFamily.substring(0, 60),
            height: Math.round(rect.height),
            width: Math.round(rect.width),
          };
        });
      });

      if (sections.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No major sections found in ${path.basename(file_path)}. The page may use non-semantic markup.`,
            },
          ],
        };
      }

      let report = `Sections in ${path.basename(file_path)}:\n\n`;
      for (const s of sections) {
        report += `[${s.index}] ${s.element}\n`;
        if (s.heading) report += `    Heading: "${s.heading}"\n`;
        report += `    Background: ${s.bgColor}\n`;
        report += `    Text color: ${s.textColor}\n`;
        report += `    Font: ${s.font}\n`;
        report += `    Size: ${s.width}×${s.height}px\n\n`;
      }

      return {
        content: [{ type: "text" as const, text: report }],
      };
    } finally {
      if (page) await page.close().catch(() => {});
      if (local) local.server.close();
    }
  }
);

// ---------------------------------------------------------------------------
// Start the server
// ---------------------------------------------------------------------------

const transport = new StdioServerTransport();
await server.connect(transport);
