/**
 * Decorative ASCII divider generators organized by style.
 */

export type DividerStyle = "retro-game" | "synth" | "terminal" | "editorial" | "minimal";

/**
 * Generate a themed divider line.
 */
export function generateDivider(style: DividerStyle, width: number, label?: string): string[] {
  switch (style) {
    case "retro-game":
      return retroGameDivider(width, label);
    case "synth":
      return synthDivider(width, label);
    case "terminal":
      return terminalDivider(width, label);
    case "editorial":
      return editorialDivider(width, label);
    case "minimal":
      return minimalDivider(width, label);
    default:
      return terminalDivider(width, label);
  }
}

function retroGameDivider(width: number, label?: string): string[] {
  const pixelRow1 = repeatToWidth("▓▒░▒", width);
  const pixelRow2 = repeatToWidth("░▒▓▒", width);
  const starRow = repeatToWidth("★ · ✦ · ", width);

  if (label) {
    const labelStr = ` ${label} `;
    const labelLine = insertLabel(repeatToWidth("█", width), labelStr);
    return [
      pixelRow1,
      starRow,
      labelLine,
      starRow,
      pixelRow2,
    ];
  }

  return [
    pixelRow1,
    starRow,
    pixelRow2,
  ];
}

function synthDivider(width: number, label?: string): string[] {
  const wave1 = repeatToWidth("╱╲", width);
  const wave2 = repeatToWidth("∿∿", width);
  const knobRow = repeatToWidth("─◉──◉─", width);

  if (label) {
    const labelStr = ` ${label} `;
    const mid = insertLabel(repeatToWidth("─", width), labelStr);
    return [
      wave1,
      "┌" + repeatToWidth("─", width - 2) + "┐",
      "│" + insertLabel(repeatToWidth(" ", width - 2), labelStr) + "│",
      "└" + repeatToWidth("─", width - 2) + "┘",
      wave2,
    ];
  }

  return [
    wave1,
    knobRow,
    wave2,
  ];
}

function terminalDivider(width: number, label?: string): string[] {
  if (label) {
    const labelStr = ` ${label} `;
    const side = Math.max(0, Math.floor((width - labelStr.length) / 2));
    const right = Math.max(0, width - side - labelStr.length);
    const line = "═".repeat(side) + labelStr + "═".repeat(right);
    return [
      "╔" + "═".repeat(width - 2) + "╗",
      "║" + insertLabel(repeatToWidth(" ", width - 2), labelStr) + "║",
      "╚" + "═".repeat(width - 2) + "╝",
    ];
  }

  return [
    "╔" + "═".repeat(width - 2) + "╗",
    "╚" + "═".repeat(width - 2) + "╝",
  ];
}

function editorialDivider(width: number, label?: string): string[] {
  const ornamentRow = repeatToWidth("✦ ◆ ◊ • ", width);
  const ruleTop = repeatToWidth("═", width);

  if (label) {
    const labelStr = ` ${label} `;
    const diamondLabel = insertLabel(ruleTop, `✦${labelStr}✦`);
    return [
      ornamentRow,
      diamondLabel,
      ornamentRow,
    ];
  }

  return [
    ornamentRow,
    ruleTop,
    ornamentRow,
  ];
}

function minimalDivider(width: number, label?: string): string[] {
  const dots = repeatToWidth("· ", width);

  if (label) {
    const labelStr = ` ${label} `;
    const side = Math.max(0, Math.floor((width - labelStr.length) / 2));
    const right = Math.max(0, width - side - labelStr.length);
    return [
      "·".repeat(side) + labelStr + "·".repeat(right),
    ];
  }

  return [dots];
}

// ─── HELPERS ────────────────────────────────────────────────

function repeatToWidth(pattern: string, width: number): string {
  if (pattern.length === 0) return " ".repeat(width);
  let result = "";
  while (result.length < width) {
    result += pattern;
  }
  return result.slice(0, width);
}

function insertLabel(line: string, label: string): string {
  if (label.length >= line.length) return label.slice(0, line.length);
  const start = Math.floor((line.length - label.length) / 2);
  return line.slice(0, start) + label + line.slice(start + label.length);
}
