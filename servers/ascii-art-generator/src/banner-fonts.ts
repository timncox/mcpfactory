/**
 * Block-letter font definitions for ASCII banners.
 * Each character is defined as an array of strings (rows).
 * All characters are 5 rows tall for consistency.
 */

type FontMap = Record<string, string[]>;

// ─── BLOCK FONT (filled █ characters) ────────────────────────

const blockFont: FontMap = {
  A: [
    " ████ ",
    "██  ██",
    "██████",
    "██  ██",
    "██  ██",
  ],
  B: [
    "█████ ",
    "██  ██",
    "█████ ",
    "██  ██",
    "█████ ",
  ],
  C: [
    " █████",
    "██    ",
    "██    ",
    "██    ",
    " █████",
  ],
  D: [
    "████  ",
    "██  ██",
    "██  ██",
    "██  ██",
    "████  ",
  ],
  E: [
    "██████",
    "██    ",
    "████  ",
    "██    ",
    "██████",
  ],
  F: [
    "██████",
    "██    ",
    "████  ",
    "██    ",
    "██    ",
  ],
  G: [
    " █████",
    "██    ",
    "██ ███",
    "██  ██",
    " █████",
  ],
  H: [
    "██  ██",
    "██  ██",
    "██████",
    "██  ██",
    "██  ██",
  ],
  I: [
    "██████",
    "  ██  ",
    "  ██  ",
    "  ██  ",
    "██████",
  ],
  J: [
    "██████",
    "    ██",
    "    ██",
    "██  ██",
    " ████ ",
  ],
  K: [
    "██  ██",
    "██ ██ ",
    "████  ",
    "██ ██ ",
    "██  ██",
  ],
  L: [
    "██    ",
    "██    ",
    "██    ",
    "██    ",
    "██████",
  ],
  M: [
    "██   ██",
    "███ ███",
    "██ █ ██",
    "██   ██",
    "██   ██",
  ],
  N: [
    "██   ██",
    "███  ██",
    "██ █ ██",
    "██  ███",
    "██   ██",
  ],
  O: [
    " ████ ",
    "██  ██",
    "██  ██",
    "██  ██",
    " ████ ",
  ],
  P: [
    "█████ ",
    "██  ██",
    "█████ ",
    "██    ",
    "██    ",
  ],
  Q: [
    " ████ ",
    "██  ██",
    "██  ██",
    "██ ███",
    " ████▄",
  ],
  R: [
    "█████ ",
    "██  ██",
    "█████ ",
    "██ ██ ",
    "██  ██",
  ],
  S: [
    " █████",
    "██    ",
    " ████ ",
    "    ██",
    "█████ ",
  ],
  T: [
    "██████",
    "  ██  ",
    "  ██  ",
    "  ██  ",
    "  ██  ",
  ],
  U: [
    "██  ██",
    "██  ██",
    "██  ██",
    "██  ██",
    " ████ ",
  ],
  V: [
    "██  ██",
    "██  ██",
    "██  ██",
    " ████ ",
    "  ██  ",
  ],
  W: [
    "██   ██",
    "██   ██",
    "██ █ ██",
    "███ ███",
    "██   ██",
  ],
  X: [
    "██  ██",
    " ████ ",
    "  ██  ",
    " ████ ",
    "██  ██",
  ],
  Y: [
    "██  ██",
    " ████ ",
    "  ██  ",
    "  ██  ",
    "  ██  ",
  ],
  Z: [
    "██████",
    "   ██ ",
    "  ██  ",
    " ██   ",
    "██████",
  ],
  "0": [
    " ████ ",
    "██  ██",
    "██  ██",
    "██  ██",
    " ████ ",
  ],
  "1": [
    "  ██  ",
    " ███  ",
    "  ██  ",
    "  ██  ",
    "██████",
  ],
  "2": [
    " ████ ",
    "██  ██",
    "   ██ ",
    "  ██  ",
    "██████",
  ],
  "3": [
    "█████ ",
    "    ██",
    "  ███ ",
    "    ██",
    "█████ ",
  ],
  "4": [
    "██  ██",
    "██  ██",
    "██████",
    "    ██",
    "    ██",
  ],
  "5": [
    "██████",
    "██    ",
    "█████ ",
    "    ██",
    "█████ ",
  ],
  "6": [
    " █████",
    "██    ",
    "██████",
    "██  ██",
    " ████ ",
  ],
  "7": [
    "██████",
    "    ██",
    "   ██ ",
    "  ██  ",
    "  ██  ",
  ],
  "8": [
    " ████ ",
    "██  ██",
    " ████ ",
    "██  ██",
    " ████ ",
  ],
  "9": [
    " ████ ",
    "██  ██",
    " █████",
    "    ██",
    "█████ ",
  ],
  " ": [
    "      ",
    "      ",
    "      ",
    "      ",
    "      ",
  ],
  "!": [
    "  ██  ",
    "  ██  ",
    "  ██  ",
    "      ",
    "  ██  ",
  ],
  ".": [
    "      ",
    "      ",
    "      ",
    "      ",
    "  ██  ",
  ],
  "-": [
    "      ",
    "      ",
    "██████",
    "      ",
    "      ",
  ],
  ":": [
    "      ",
    "  ██  ",
    "      ",
    "  ██  ",
    "      ",
  ],
  "/": [
    "    ██",
    "   ██ ",
    "  ██  ",
    " ██   ",
    "██    ",
  ],
  "?": [
    " ████ ",
    "██  ██",
    "   ██ ",
    "      ",
    "  ██  ",
  ],
  "#": [
    " █ █  ",
    "██████",
    " █ █  ",
    "██████",
    " █ █  ",
  ],
};

// ─── SHADOW FONT (block + drop shadow) ──────────────────────

function makeShadowFont(base: FontMap): FontMap {
  const shadow: FontMap = {};
  for (const [char, rows] of Object.entries(base)) {
    shadow[char] = rows.map((row, i) => {
      if (i === rows.length - 1) {
        // Bottom shadow
        return row + " " + row.replace(/█/g, "▄").replace(/[^▄]/g, " ").trim();
      }
      // Right shadow
      return row + row.slice(-1).replace(/█/g, "▌").replace(/[^▌]/g, " ");
    });
  }
  return shadow;
}

// ─── OUTLINE FONT (hollow letters) ──────────────────────────

function makeOutlineFont(base: FontMap): FontMap {
  const outline: FontMap = {};
  for (const [char, rows] of Object.entries(base)) {
    outline[char] = rows.map((row, rowIdx) => {
      return row.split("").map((ch, colIdx) => {
        if (ch !== "█") return ch;
        // Check if this is an interior block
        const above = rowIdx > 0 ? rows[rowIdx - 1][colIdx] : " ";
        const below = rowIdx < rows.length - 1 ? rows[rowIdx + 1][colIdx] : " ";
        const left = colIdx > 0 ? row[colIdx - 1] : " ";
        const right = colIdx < row.length - 1 ? row[colIdx + 1] : " ";
        if (above === "█" && below === "█" && left === "█" && right === "█") {
          return " ";
        }
        return "█";
      }).join("");
    });
  }
  return outline;
}

// ─── SMALL FONT (compact 3-row) ─────────────────────────────

const smallFont: FontMap = {
  A: ["▄█▄", "█▀█", "▀ ▀"],
  B: ["██▄", "██▀", "▀▀ "],
  C: ["▄█▀", "█  ", "▀█▄"],
  D: ["██▄", "█ █", "▀▀ "],
  E: ["██▀", "██▄", "▀▀▀"],
  F: ["██▀", "██▄", "▀  "],
  G: ["▄█▀", "█ █", "▀█▀"],
  H: ["█ █", "███", "▀ ▀"],
  I: ["███", " █ ", "▀▀▀"],
  J: ["▀▀█", "  █", "▀█▀"],
  K: ["█▄▀", "██ ", "▀ ▀"],
  L: ["█  ", "█  ", "▀▀▀"],
  M: ["█▄█", "█▀█", "▀ ▀"],
  N: ["█▄█", "█▀█", "▀ ▀"],
  O: ["▄█▄", "█ █", "▀█▀"],
  P: ["██▄", "██▀", "▀  "],
  Q: ["▄█▄", "█ █", "▀█▄"],
  R: ["██▄", "██▀", "▀ ▀"],
  S: ["▄█▀", "▀█▄", "▀█▀"],
  T: ["███", " █ ", " ▀ "],
  U: ["█ █", "█ █", "▀█▀"],
  V: ["█ █", "█ █", " ▀ "],
  W: ["█ █", "█▀█", "▀▄▀"],
  X: ["▀▄▀", " █ ", "▀ ▀"],
  Y: ["█ █", " █ ", " ▀ "],
  Z: ["▀▀█", " █ ", "█▀▀"],
  " ": ["   ", "   ", "   "],
  "!": [" █ ", " █ ", " ▀ "],
  ".": ["   ", "   ", " ▀ "],
  "-": ["   ", "▀▀▀", "   "],
  "0": ["▄█▄", "█ █", "▀█▀"],
  "1": [" █ ", " █ ", " ▀ "],
  "2": ["▀█▄", " █ ", "▀▀▀"],
  "3": ["▀█▄", "▀█▄", "▀▀ "],
  "4": ["█ █", "▀██", "  ▀"],
  "5": ["██▀", "▀█▄", "▀▀ "],
  "6": ["▄█▀", "██▄", "▀█▀"],
  "7": ["▀▀█", " █ ", " ▀ "],
  "8": ["▄█▄", "▄█▄", "▀█▀"],
  "9": ["▄█▄", "▀██", "▀▀ "],
};

// ─── PUBLIC API ──────────────────────────────────────────────

export type FontStyle = "block" | "shadow" | "outline" | "small";

const fontHeight: Record<FontStyle, number> = {
  block: 5,
  shadow: 5,
  outline: 5,
  small: 3,
};

function getFont(style: FontStyle): FontMap {
  switch (style) {
    case "block":
      return blockFont;
    case "shadow":
      return makeShadowFont(blockFont);
    case "outline":
      return makeOutlineFont(blockFont);
    case "small":
      return smallFont;
    default:
      return blockFont;
  }
}

export function renderBanner(text: string, style: FontStyle = "block"): string[] {
  const font = getFont(style);
  const height = fontHeight[style];
  const chars = text.toUpperCase().split("");

  // Initialize output rows
  const rows: string[] = Array.from({ length: height }, () => "");

  for (const char of chars) {
    const glyph = font[char] || font[" "] || Array.from({ length: height }, () => "      ");
    for (let row = 0; row < height; row++) {
      rows[row] += (glyph[row] || "") + " ";
    }
  }

  return rows;
}
