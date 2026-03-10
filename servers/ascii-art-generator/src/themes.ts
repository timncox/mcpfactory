/**
 * HTML/CSS theme configurations for different art styles.
 * Each theme provides styling suggestions for embedding ASCII art in web pages.
 */

export interface ThemeConfig {
  fontFamily: string;
  fontSize: string;
  lineHeight: string;
  color: string;
  backgroundColor: string;
  additionalCss: string;
  description: string;
}

export type StyleName = "retro-game" | "synth" | "terminal" | "editorial" | "minimal";

const themes: Record<StyleName, ThemeConfig> = {
  "retro-game": {
    fontFamily: "'Press Start 2P', 'Courier New', monospace",
    fontSize: "12px",
    lineHeight: "1.2",
    color: "#00ff41",
    backgroundColor: "#0a0a0a",
    additionalCss: "text-shadow: 0 0 5px #00ff41, 0 0 10px #00ff41; border: 2px solid #00ff41; padding: 16px; border-radius: 4px;",
    description: "Retro gaming terminal with green phosphor glow effect",
  },
  "synth": {
    fontFamily: "'Space Mono', 'Fira Code', 'Courier New', monospace",
    fontSize: "13px",
    lineHeight: "1.3",
    color: "#ff6ec7",
    backgroundColor: "#1a0a2e",
    additionalCss: "text-shadow: 0 0 8px #ff6ec7, 0 0 20px #7b2ff7; border: 1px solid #7b2ff7; padding: 20px; border-radius: 8px; background: linear-gradient(180deg, #1a0a2e 0%, #0d0221 100%);",
    description: "Synthwave/vaporwave aesthetic with neon pink and purple glow",
  },
  "terminal": {
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Source Code Pro', monospace",
    fontSize: "14px",
    lineHeight: "1.4",
    color: "#00ff00",
    backgroundColor: "#000000",
    additionalCss: "text-shadow: 0 0 3px #00ff00; border: 1px solid #333; padding: 16px; border-radius: 4px; box-shadow: inset 0 0 30px rgba(0,255,0,0.05);",
    description: "Classic hacker terminal with subtle green glow",
  },
  "editorial": {
    fontFamily: "'Courier Prime', 'Courier New', monospace",
    fontSize: "14px",
    lineHeight: "1.5",
    color: "#2c2c2c",
    backgroundColor: "#faf8f0",
    additionalCss: "border-top: 2px solid #2c2c2c; border-bottom: 2px solid #2c2c2c; padding: 24px 16px; letter-spacing: 0.02em;",
    description: "Editorial/typographic style with warm paper-like background",
  },
  "minimal": {
    fontFamily: "'SF Mono', 'Monaco', 'Inconsolata', monospace",
    fontSize: "13px",
    lineHeight: "1.4",
    color: "#666666",
    backgroundColor: "transparent",
    additionalCss: "padding: 12px 0; opacity: 0.8;",
    description: "Minimal, understated style for subtle decorative elements",
  },
};

export function getTheme(style: string): ThemeConfig {
  return themes[style as StyleName] || themes["terminal"];
}

/**
 * Wrap ASCII art in a styled HTML <pre> tag.
 */
export function wrapInHtml(art: string, style: string): string {
  const theme = getTheme(style);
  const escapedArt = art
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return `<pre style="
  font-family: ${theme.fontFamily};
  font-size: ${theme.fontSize};
  line-height: ${theme.lineHeight};
  color: ${theme.color};
  background-color: ${theme.backgroundColor};
  ${theme.additionalCss}
  overflow-x: auto;
  white-space: pre;
  margin: 0;
">${escapedArt}</pre>`;
}

/**
 * Generate CSS suggestion text (not embedded, for reference).
 */
export function getCssSuggestion(style: string): string {
  const theme = getTheme(style);
  return [
    `/* ${theme.description} */`,
    `.ascii-art {`,
    `  font-family: ${theme.fontFamily};`,
    `  font-size: ${theme.fontSize};`,
    `  line-height: ${theme.lineHeight};`,
    `  color: ${theme.color};`,
    `  background-color: ${theme.backgroundColor};`,
    `  ${theme.additionalCss}`,
    `  overflow-x: auto;`,
    `  white-space: pre;`,
    `}`,
  ].join("\n");
}
