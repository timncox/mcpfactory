/**
 * ASCII art templates organized by subject.
 * Each template includes multiple size variants and the art lines.
 */

export interface ArtTemplate {
  lines: string[];
  width: number;
  tags: string[];
}

export interface ArtCollection {
  [subject: string]: ArtTemplate[];
}

// ─── RETRO GAME ARTS ──────────────────────────────────────────

const spaceInvaderLarge: ArtTemplate = {
  width: 40,
  tags: ["retro-game", "space-invader", "alien"],
  lines: [
    "        ▄▄      ▄▄        ",
    "      ▄████▄  ▄████▄      ",
    "    ▄██████████████████▄    ",
    "  ▄████████████████████████▄  ",
    "  ██▀▀████████████████▀▀██  ",
    "  ██  ▀▀██████████▀▀  ██  ",
    "  ████████████████████████  ",
    "    ██▀▀▀██    ██▀▀▀██    ",
    "  ▄██    ██▄  ▄██    ██▄  ",
    "  ████▄▄████  ████▄▄████  ",
    "  ▀██████▀      ▀██████▀  ",
    "    ▀▀              ▀▀    ",
  ],
};

const spaceInvaderMedium: ArtTemplate = {
  width: 24,
  tags: ["retro-game", "space-invader", "alien"],
  lines: [
    "    ▄ ▀▄  ▄▀ ▄    ",
    "  ▄█████████████▄  ",
    "  ███▀███████▀███  ",
    "  █████████████████  ",
    "    ▀█▀     ▀█▀    ",
    "   ▄▀ ▀▄ ▄▀ ▀▄   ",
  ],
};

const spaceInvaderSmall: ArtTemplate = {
  width: 15,
  tags: ["retro-game", "space-invader", "alien"],
  lines: [
    "  ▄ ▀▀▀ ▄  ",
    " █▀█████▀█ ",
    " █████████ ",
    "  ▀█ ▀ █▀  ",
    " ▀ ▀   ▀ ▀ ",
  ],
};

const streetFighterLarge: ArtTemplate = {
  width: 48,
  tags: ["retro-game", "street-fighter", "fighter"],
  lines: [
    "              ╔══════╗              ",
    "             ║ ●  ● ║             ",
    "             ║  ▄▄  ║             ",
    "          ╔══╩══════╩══╗          ",
    "         ║  ╔══════╗  ║         ",
    "    ╔════╝  ║ FIGHT║  ╚════╗    ",
    "   ║ ████  ╚══════╝  ████ ║   ",
    "   ║ █  █    ║  ║    █  █ ║   ",
    "   ║ ████  ╔═╝  ╚═╗  ████ ║   ",
    "   ╚═╗  ╔══╝      ╚══╗  ╔═╝   ",
    "     ║  ║    ▄██▄    ║  ║     ",
    "     ║  ║   ██████   ║  ║     ",
    "     ╚══╝  ▀██  ██▀  ╚══╝     ",
    "           ██▀  ▀██           ",
    "          ▄█▀    ▀█▄          ",
    "         ▄█▀      ▀█▄         ",
    "        ██▀        ▀██        ",
    "       ▄█▀          ▀█▄       ",
    "      ███            ███      ",
    "     ▀▀▀▀            ▀▀▀▀     ",
  ],
};

const streetFighterSmall: ArtTemplate = {
  width: 28,
  tags: ["retro-game", "street-fighter", "fighter"],
  lines: [
    "      ╔════╗      ",
    "     ║ ●● ║     ",
    "     ║ ▄▄ ║     ",
    "    ╔╩════╩╗    ",
    "   ██ FIGHT ██   ",
    "   █ ║    ║ █   ",
    "   █ ╚═╗╔═╝ █   ",
    "    ▀█▄▀▀▄█▀    ",
    "     █▀  ▀█     ",
    "    ██    ██    ",
    "   ▀▀▀    ▀▀▀   ",
  ],
};

const gameControllerLarge: ArtTemplate = {
  width: 52,
  tags: ["retro-game", "game-controller", "gamepad"],
  lines: [
    "          ╔══════════════════════╗          ",
    "      ╔═══╝                      ╚═══╗      ",
    "    ╔═╝    ┌───┐          ╔═══╗    ╚═╗    ",
    "   ║     ┌─┤ ▲ ├─┐      ║ X ║     ║   ",
    "   ║     │ ◄ █ ► │    ╔═╝   ╚═╗     ║   ",
    "   ║     └─┤ ▼ ├─┘   ║ Y     A ║     ║   ",
    "   ║       └───┘      ╚═╗   ╔═╝     ║   ",
    "   ║                     ║ B ║       ║   ",
    "   ║    ┌──┐    ┌──┐    ╚═══╝       ║   ",
    "   ║    │SE│    │ST│                 ║   ",
    "   ║    └──┘    └──┘                 ║   ",
    "    ╚═╗                          ╔═╝    ",
    "      ╚═══╗                  ╔═══╝      ",
    "          ╚══════════════════╝          ",
  ],
};

const gameControllerSmall: ArtTemplate = {
  width: 32,
  tags: ["retro-game", "game-controller", "gamepad"],
  lines: [
    "      ╔══════════════╗      ",
    "   ╔══╝              ╚══╗   ",
    "  ║  ┌─┐      (X)  ║  ",
    "  ║ ◄ █ ►  (Y) (A) ║  ",
    "  ║  └─┘      (B)  ║  ",
    "  ║   [SE] [ST]     ║  ",
    "   ╚══╗          ╔══╝   ",
    "      ╚══════════╝      ",
  ],
};

const healthBarLarge: ArtTemplate = {
  width: 50,
  tags: ["retro-game", "health-bar", "hud"],
  lines: [
    "  ╔═══════════════════════════════════════════╗  ",
    "  ║ ♥ PLAYER 1          LVL 99     ★★★★★ ║  ",
    "  ║ HP ████████████████████████████░░░░░░ ║  ",
    "  ║    ├──────────────────────────┤  85%  ║  ",
    "  ║ MP ██████████████████░░░░░░░░░░░░░░░ ║  ",
    "  ║    ├──────────────┤          45%  ║  ",
    "  ║ XP ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░ ║  ",
    "  ║    ├─────────────────────┤    67%  ║  ",
    "  ╠═══════════════════════════════════════════╣  ",
    "  ║  ATK: 156  DEF: 89  SPD: 72  LCK: 44  ║  ",
    "  ╚═══════════════════════════════════════════╝  ",
  ],
};

// ─── SYNTH / MUSIC ARTS ──────────────────────────────────────

const modularSynthLarge: ArtTemplate = {
  width: 56,
  tags: ["synth", "modular-synth", "music"],
  lines: [
    "  ┌──────────────────────────────────────────────┐  ",
    "  │  ╔═══╗  ╔═══╗  ╔═══╗  ╔═══╗  ╔═══╗  │  ",
    "  │  ║VCO║  ║VCF║  ║VCA║  ║ENV║  ║LFO║  │  ",
    "  │  ╚═══╝  ╚═══╝  ╚═══╝  ╚═══╝  ╚═══╝  │  ",
    "  │ ┌─────┐┌─────┐┌─────┐┌─────┐┌─────┐ │  ",
    "  │ │(◉)  ││(◉)  ││(◉)  ││(◉)  ││(◉)  │ │  ",
    "  │ │FREQ ││CUTOF││LEVEL││ATTCK││RATE │ │  ",
    "  │ └─────┘└─────┘└─────┘└─────┘└─────┘ │  ",
    "  │ ┌─────┐┌─────┐┌─────┐┌─────┐┌─────┐ │  ",
    "  │ │(◉)  ││(◉)  ││(◉)  ││(◉)  ││(◉)  │ │  ",
    "  │ │FINE ││RESO ││PAN  ││DECAY││DEPTH│ │  ",
    "  │ └─────┘└─────┘└─────┘└─────┘└─────┘ │  ",
    "  │                                        │  ",
    "  │  ○──○  ○──○  ○──○  ○──○  ○──○  │  ",
    "  │  ○  ○  ○──○  ○  ○  ○──○  ○  ○  │  ",
    "  │  ○──○  ○  ○  ○──○  ○  ○  ○──○  │  ",
    "  │  IN OUT IN OUT IN OUT IN OUT IN OUT │  ",
    "  └──────────────────────────────────────────────┘  ",
  ],
};

const modularSynthSmall: ArtTemplate = {
  width: 36,
  tags: ["synth", "modular-synth", "music"],
  lines: [
    "  ┌────────────────────────────┐  ",
    "  │ [VCO] [VCF] [VCA] [ENV]  │  ",
    "  │ (◉)   (◉)   (◉)   (◉)   │  ",
    "  │ FREQ  CUT   LVL   ATK   │  ",
    "  │ (◉)   (◉)   (◉)   (◉)   │  ",
    "  │ FINE  RES   PAN   DEC   │  ",
    "  │ ○─○  ○─○  ○─○  ○─○  │  ",
    "  │ ○ ○  ○─○  ○ ○  ○─○  │  ",
    "  └────────────────────────────┘  ",
  ],
};

const oscilloscopeLarge: ArtTemplate = {
  width: 52,
  tags: ["synth", "oscilloscope", "waveform", "music"],
  lines: [
    "  ╔════════════════════════════════════════════╗  ",
    "  ║  ┌────────────────────────────────────┐  ║  ",
    "  ║  │                 ╱╲                 │  ║  ",
    "  ║  │      ╱╲       ╱  ╲       ╱╲      │  ║  ",
    "  ║  │     ╱  ╲     ╱    ╲     ╱  ╲     │  ║  ",
    "  ║  │    ╱    ╲   ╱      ╲   ╱    ╲    │  ║  ",
    "  ║  │───╱──────╲─╱────────╲─╱──────╲───│  ║  ",
    "  ║  │  ╱        ╲          ╲        ╲  │  ║  ",
    "  ║  │ ╱          ╲          ╲        ╲ │  ║  ",
    "  ║  │╱            ╲╱         ╲╱       ╲│  ║  ",
    "  ║  └────────────────────────────────────┘  ║  ",
    "  ║  FREQ: 440Hz   AMP: 0.8   WAVE: SINE   ║  ",
    "  ║  ═══════════════════════════════════════  ║  ",
    "  ║  [SINE] [SAW] [SQR] [TRI] [NOISE]      ║  ",
    "  ╚════════════════════════════════════════════╝  ",
  ],
};

const oscilloscopeSmall: ArtTemplate = {
  width: 34,
  tags: ["synth", "oscilloscope", "waveform", "music"],
  lines: [
    "  ╔══════════════════════════╗  ",
    "  ║ ┌──────────────────────┐ ║  ",
    "  ║ │     ╱╲     ╱╲      │ ║  ",
    "  ║ │  ╱╱  ╲╲  ╱╱  ╲╲   │ ║  ",
    "  ║ │──╱────╲──╱────╲────│ ║  ",
    "  ║ │╱╱      ╲╲╱      ╲╲ │ ║  ",
    "  ║ └──────────────────────┘ ║  ",
    "  ║ 440Hz  SINE  AMP:0.8   ║  ",
    "  ╚══════════════════════════╝  ",
  ],
};

const keyboardLarge: ArtTemplate = {
  width: 58,
  tags: ["synth", "keyboard", "piano", "music"],
  lines: [
    "  ┌──────────────────────────────────────────────────┐  ",
    "  │  ┌──┐┌──┐  ┌──┐┌──┐┌──┐  ┌──┐┌──┐  ┌──┐┌──┐  │  ",
    "  │  │▓▓││▓▓│  │▓▓││▓▓││▓▓│  │▓▓││▓▓│  │▓▓││▓▓│  │  ",
    "  │  │▓▓││▓▓│  │▓▓││▓▓││▓▓│  │▓▓││▓▓│  │▓▓││▓▓│  │  ",
    "  │  │▓▓││▓▓│  │▓▓││▓▓││▓▓│  │▓▓││▓▓│  │▓▓││▓▓│  │  ",
    "  │  └┬─┘└─┬┘  └┬─┘└┬─┘└─┬┘  └┬─┘└─┬┘  └┬─┘└─┬┘  │  ",
    "  │  ┌┴──┬─┴─┬──┴┬──┴─┬──┴┬──┴─┬──┴┬──┴─┬──┴┬──┴─┐  │  ",
    "  │  │ C │ D │ E │ F │ G │ A │ B │ C │ D │ E │  │  ",
    "  │  │   │   │   │   │   │   │   │   │   │   │  │  ",
    "  │  └───┴───┴───┴───┴───┴───┴───┴───┴───┴───┘  │  ",
    "  └──────────────────────────────────────────────────┘  ",
  ],
};

// ─── TERMINAL / HACKER ARTS ──────────────────────────────────

const skullLarge: ArtTemplate = {
  width: 44,
  tags: ["terminal", "skull", "hacker"],
  lines: [
    "              ▄▄▄████████▄▄▄              ",
    "          ▄▄██████████████████▄▄          ",
    "        ▄████████████████████████▄        ",
    "      ▄██████████████████████████████▄      ",
    "     ████████████████████████████████     ",
    "    ██████████████████████████████████    ",
    "    ██████▀▀          ▀▀██████████████    ",
    "    █████    ▄████▄    ▄████▄    █████    ",
    "    █████   ████████  ████████   █████    ",
    "    █████   ████████  ████████   █████    ",
    "    █████    ▀████▀    ▀████▀    █████    ",
    "    ██████▄▄          ▄▄██████████████    ",
    "    ████████████▄▄▄▄████████████████████    ",
    "     ████████████████████████████████     ",
    "      ██████▀█▀█▀██▀█▀█▀██████████      ",
    "       ████  ▀ ▀  ▀▀  ▀ ▀  ████       ",
    "        ▀████████████████████████▀        ",
    "          ▀▀██████████████████▀▀          ",
    "              ▀▀▀████████▀▀▀              ",
  ],
};

const skullSmall: ArtTemplate = {
  width: 24,
  tags: ["terminal", "skull", "hacker"],
  lines: [
    "     ▄▄████████▄▄     ",
    "   ▄██████████████▄   ",
    "  ████ ▄██▄▄██▄ ████  ",
    "  ████ ████████ ████  ",
    "  ████  ▀██▀▀██▀ ████  ",
    "  ██████▄▄▄▄▄▄██████  ",
    "   ██▀█▀█▀▀█▀█▀██   ",
    "    ▀████████████▀    ",
    "      ▀▀██████▀▀      ",
  ],
};

const circuitBoardLarge: ArtTemplate = {
  width: 56,
  tags: ["terminal", "circuit-board", "tech", "hacker"],
  lines: [
    "  ┌─────────────────────────────────────────────────┐  ",
    "  │  ┌──┐     ┌──────┐     ┌──┐     ┌──────┐     │  ",
    "  │──┤IC├──┬──┤ CPU  ├──┬──┤IC├──┬──┤ RAM  ├──── │  ",
    "  │  └──┘  │  └──┬───┘  │  └──┘  │  └──┬───┘     │  ",
    "  │        │     │      │        │     │          │  ",
    "  │  ──────┴─────┴──────┴────────┴─────┴────────  │  ",
    "  │  ═══════════════ DATA BUS ═══════════════════  │  ",
    "  │  ──────┬─────┬──────┬────────┬─────┬────────  │  ",
    "  │        │     │      │        │     │          │  ",
    "  │  ┌──┐  │  ┌──┴──┐  │  ┌──┐  │  ┌──┴──┐     │  ",
    "  │──┤R1├──┴──┤FLASH├──┴──┤C1├──┴──┤ I/O ├──── │  ",
    "  │  └──┘     └─────┘     └──┘     └─────┘     │  ",
    "  │  ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○  │  ",
    "  │  │ │ │ │ │ │ │ │ │ │ │ │ │ │ │ │ │ │ │  │  ",
    "  └──┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴──┘  ",
  ],
};

const circuitBoardSmall: ArtTemplate = {
  width: 34,
  tags: ["terminal", "circuit-board", "tech", "hacker"],
  lines: [
    "  ┌──────────────────────────┐  ",
    "  │ ┌──┐  ┌────┐  ┌──┐    │  ",
    "  │─┤IC├──┤CPU ├──┤IC├──── │  ",
    "  │ └──┘  └──┬─┘  └──┘    │  ",
    "  │ ═══ DATA BUS ═════════ │  ",
    "  │ ┌──┐  ┌──┴─┐  ┌──┐    │  ",
    "  │─┤R1├──┤FLSH├──┤C1├──── │  ",
    "  │ └──┘  └────┘  └──┘    │  ",
    "  │ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○  │  ",
    "  └──┴─┴─┴─┴─┴─┴─┴─┴─┴───┘  ",
  ],
};

const matrixRainLarge: ArtTemplate = {
  width: 52,
  tags: ["terminal", "matrix", "hacker", "rain"],
  lines: [
    "  ╔════════════════════════════════════════════╗  ",
    "  ║ 0 1 0   1 0 1   0 1 1   1 0 0   0 1 0  ║  ",
    "  ║ 1 0 1   0 1 0   1 0 0   0 1 1   1 0 1  ║  ",
    "  ║ ┃ │ ┃   │ ┃ │   ┃ │ │   │ ┃ ┃   │ ┃ │  ║  ",
    "  ║ ▓ ░ ▓   ░ ▓ ░   ▓ ░ ░   ░ ▓ ▓   ░ ▓ ░  ║  ",
    "  ║ █ ▒ █   ▒ █ ▒   █ ▒ ▒   ▒ █ █   ▒ █ ▒  ║  ",
    "  ║ ┃ │ ┃   │ ┃ │   ┃ │ │   │ ┃ ┃   │ ┃ │  ║  ",
    "  ║ ▓ ░ ▓   ░ ▓ ░   ▓ ░ ░   ░ ▓ ▓   ░ ▓ ░  ║  ",
    "  ║ ░ ▒ ░   ▒ ░ ▒   ░ ▒ ▒   ▒ ░ ░   ▒ ░ ▒  ║  ",
    "  ║ │ │ │   │ │ │   │ │ │   │ │ │   │ │ │  ║  ",
    "  ║ ░   ░     ░       ░ ░     ░       ░    ║  ",
    "  ║                                          ║  ",
    "  ╚════════════════════════════════════════════╝  ",
  ],
};

const systemDiagnosticsLarge: ArtTemplate = {
  width: 52,
  tags: ["terminal", "system", "diagnostics", "hacker"],
  lines: [
    "  ╔════════════════════════════════════════════╗  ",
    "  ║  ┌─ SYSTEM DIAGNOSTICS ──────────────┐   ║  ",
    "  ║  │                                    │   ║  ",
    "  ║  │  CPU  [████████████░░░░] 75.2%    │   ║  ",
    "  ║  │  MEM  [██████████░░░░░░] 62.8%    │   ║  ",
    "  ║  │  DISK [████████░░░░░░░░] 51.3%    │   ║  ",
    "  ║  │  NET  [██████████████░░] 88.1%    │   ║  ",
    "  ║  │  GPU  [██████░░░░░░░░░░] 38.5%    │   ║  ",
    "  ║  │                                    │   ║  ",
    "  ║  │  UPTIME: 42d 13h 37m 04s          │   ║  ",
    "  ║  │  LOAD:   2.45 1.87 1.23           │   ║  ",
    "  ║  │  PROCS:  347 running               │   ║  ",
    "  ║  │  TEMP:   67°C ▲                    │   ║  ",
    "  ║  │                                    │   ║  ",
    "  ║  │  STATUS: ● OPERATIONAL             │   ║  ",
    "  ║  └────────────────────────────────────┘   ║  ",
    "  ╚════════════════════════════════════════════╝  ",
  ],
};

// ─── EDITORIAL / TYPOGRAPHIC ARTS ────────────────────────────

const monogramFrameLarge: ArtTemplate = {
  width: 40,
  tags: ["editorial", "monogram", "frame", "ornament"],
  lines: [
    "       ✦ ═══════════════════ ✦       ",
    "      ╔╩═══════════════════════╩╗      ",
    "      ║  ┌─────────────────┐  ║      ",
    "      ║  │                 │  ║      ",
    "      ║  │    ◆  ✦  ◆    │  ║      ",
    "      ║  │   ╱ ╲   ╱ ╲   │  ║      ",
    "      ║  │  ◊   ◊ ◊   ◊  │  ║      ",
    "      ║  │   ╲ ╱   ╲ ╱   │  ║      ",
    "      ║  │    ◆  ✦  ◆    │  ║      ",
    "      ║  │                 │  ║      ",
    "      ║  └─────────────────┘  ║      ",
    "      ╚╦═══════════════════════╦╝      ",
    "       ✦ ═══════════════════ ✦       ",
  ],
};

const typographicOrnamentLarge: ArtTemplate = {
  width: 48,
  tags: ["editorial", "ornament", "typographic", "decorative"],
  lines: [
    "                 ✦                 ",
    "              ◆     ◆              ",
    "           ◊     ●     ◊           ",
    "        ✦     ◆     ◆     ✦        ",
    "     ◆     ◊     ✦     ◊     ◆     ",
    "  ═══◊═════●═════◆═════●═════◊═══  ",
    "     ◆     ◊     ✦     ◊     ◆     ",
    "        ✦     ◆     ◆     ✦        ",
    "           ◊     ●     ◊           ",
    "              ◆     ◆              ",
    "                 ✦                 ",
  ],
};

// ─── COLLECTION ─────────────────────────────────────────────

export const artCollection: ArtCollection = {
  "space-invader": [spaceInvaderLarge, spaceInvaderMedium, spaceInvaderSmall],
  "street-fighter": [streetFighterLarge, streetFighterSmall],
  "game-controller": [gameControllerLarge, gameControllerSmall],
  "health-bar": [healthBarLarge],
  "modular-synth": [modularSynthLarge, modularSynthSmall],
  "oscilloscope": [oscilloscopeLarge, oscilloscopeSmall],
  "keyboard": [keyboardLarge],
  "skull": [skullLarge, skullSmall],
  "circuit-board": [circuitBoardLarge, circuitBoardSmall],
  "matrix": [matrixRainLarge],
  "system-diagnostics": [systemDiagnosticsLarge],
  "monogram": [monogramFrameLarge],
  "ornament": [typographicOrnamentLarge],
};

/**
 * Get the best-fit art for a given subject and max width.
 */
export function findArt(subject: string, maxWidth: number): ArtTemplate | null {
  const key = subject.toLowerCase().trim();

  // Direct match
  if (artCollection[key]) {
    return selectByWidth(artCollection[key], maxWidth);
  }

  // Fuzzy match: search tags
  for (const [, templates] of Object.entries(artCollection)) {
    for (const tpl of templates) {
      if (tpl.tags.some(tag => key.includes(tag) || tag.includes(key))) {
        // Found a match in this category, select best width from all templates in same category
        const category = Object.entries(artCollection).find(([, ts]) => ts.includes(tpl));
        if (category) {
          return selectByWidth(category[1], maxWidth);
        }
        return tpl;
      }
    }
  }

  return null;
}

function selectByWidth(templates: ArtTemplate[], maxWidth: number): ArtTemplate {
  // Sort by width descending
  const sorted = [...templates].sort((a, b) => b.width - a.width);
  // Find the largest that fits
  for (const tpl of sorted) {
    if (tpl.width <= maxWidth) {
      return tpl;
    }
  }
  // Return smallest if none fit
  return sorted[sorted.length - 1];
}

/**
 * Generate freeform art for subjects not in the collection.
 */
export function generateFreeformArt(subject: string, style: string, maxWidth: number): string[] {
  const w = Math.min(maxWidth, 60);
  const innerW = w - 4;
  const label = subject.toUpperCase();
  const padLabel = centerText(label, innerW);

  switch (style) {
    case "retro-game":
      return generateRetroFrame(padLabel, innerW);
    case "synth":
      return generateSynthFrame(padLabel, innerW);
    case "terminal":
      return generateTerminalFrame(padLabel, innerW);
    case "editorial":
      return generateEditorialFrame(padLabel, innerW);
    case "minimal":
      return generateMinimalFrame(padLabel, innerW);
    default:
      return generateRetroFrame(padLabel, innerW);
  }
}

function centerText(text: string, width: number): string {
  if (text.length >= width) return text.slice(0, width);
  const left = Math.floor((width - text.length) / 2);
  const right = width - text.length - left;
  return " ".repeat(left) + text + " ".repeat(right);
}

function generateRetroFrame(label: string, w: number): string[] {
  const border = "█".repeat(w + 2);
  const empty = "█" + " ".repeat(w) + "█";
  const labelLine = "█" + label + "█";
  const pixelRow = "█" + "▓▒░".repeat(Math.floor(w / 3)).slice(0, w) + "█";
  return [border, empty, pixelRow, empty, labelLine, empty, pixelRow, empty, border];
}

function generateSynthFrame(label: string, w: number): string[] {
  const top = "┌" + "─".repeat(w) + "┐";
  const bot = "└" + "─".repeat(w) + "┘";
  const empty = "│" + " ".repeat(w) + "│";
  const labelLine = "│" + label + "│";
  const wave = "│" + generateWaveString(w) + "│";
  const knobs = "│" + " (◉)  ".repeat(Math.floor(w / 6)).slice(0, w) + "│";
  return [top, empty, wave, empty, labelLine, empty, knobs, empty, bot];
}

function generateTerminalFrame(label: string, w: number): string[] {
  const top = "╔" + "═".repeat(w) + "╗";
  const bot = "╚" + "═".repeat(w) + "╝";
  const empty = "║" + " ".repeat(w) + "║";
  const labelLine = "║" + label + "║";
  const prompt = "║" + centerText("root@localhost:~# _", w) + "║";
  return [top, empty, labelLine, empty, prompt, empty, bot];
}

function generateEditorialFrame(label: string, w: number): string[] {
  const ornament = "✦" + " ◆ ".repeat(Math.floor(w / 4)).slice(0, w - 2) + " ✦";
  const rule = "═".repeat(w + 2);
  const empty = "  " + " ".repeat(w) + "  ";
  const labelLine = "  " + label + "  ";
  return [rule, ornament, empty, labelLine, empty, ornament, rule];
}

function generateMinimalFrame(label: string, w: number): string[] {
  const dots = "· ".repeat(Math.floor((w + 2) / 2)).slice(0, w + 2);
  const empty = "  " + " ".repeat(w) + "  ";
  const labelLine = "  " + label + "  ";
  return [dots, empty, labelLine, empty, dots];
}

function generateWaveString(w: number): string {
  const wave = "╱╲";
  let result = "";
  for (let i = 0; i < w; i++) {
    result += wave[i % wave.length];
  }
  return result;
}
