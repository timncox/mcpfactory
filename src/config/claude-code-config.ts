/**
 * Manages MCP server entries in the Claude Code settings file
 * (~/.claude/settings.json) so that factory-created servers are
 * available to Claude Code agent teams.
 */

import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Prefix used to namespace MCP Factory-managed servers in Claude Code settings.
 */
const SERVER_PREFIX = "mcp-factory-";

/**
 * Structure for a single MCP server entry in Claude Code settings.
 */
export interface ClaudeCodeMcpEntry {
  command: string;
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
}

/**
 * Structure of the Claude Code settings file.
 */
export interface ClaudeCodeSettings {
  mcpServers?: Record<string, ClaudeCodeMcpEntry>;
  [key: string]: unknown;
}

/**
 * Returns the path to the Claude Code settings file.
 */
function getSettingsPath(): string {
  return join(homedir(), ".claude", "settings.json");
}

/**
 * Read and parse the Claude Code settings file.
 * If the file doesn't exist, returns a default config.
 */
export async function readSettings(): Promise<ClaudeCodeSettings> {
  const settingsPath = getSettingsPath();
  try {
    const content = await readFile(settingsPath, "utf-8");
    const parsed = JSON.parse(content) as ClaudeCodeSettings;
    if (!parsed.mcpServers) {
      parsed.mcpServers = {};
    }
    return parsed;
  } catch (err: unknown) {
    if (isNodeError(err) && err.code === "ENOENT") {
      return { mcpServers: {} };
    }
    throw err;
  }
}

/**
 * Write the settings back to the file, preserving formatting with 2-space indent.
 */
export async function writeSettings(settings: ClaudeCodeSettings): Promise<void> {
  const settingsPath = getSettingsPath();
  await writeFile(settingsPath, JSON.stringify(settings, null, 2) + "\n", "utf-8");
}

/**
 * Add a server entry to Claude Code settings under mcpServers.
 * The key is prefixed with `mcp-factory-`.
 */
export async function addServerToClaudeCode(
  name: string,
  command: string,
  args: string[],
  env?: Record<string, string>,
): Promise<void> {
  const settings = await readSettings();
  if (!settings.mcpServers) {
    settings.mcpServers = {};
  }
  const key = `${SERVER_PREFIX}${name}`;
  const entry: ClaudeCodeMcpEntry = { command, args };
  if (env !== undefined) {
    entry.env = env;
  }
  settings.mcpServers[key] = entry;
  await writeSettings(settings);
}

/**
 * Remove a server entry from Claude Code settings.
 */
export async function removeServerFromClaudeCode(name: string): Promise<void> {
  const settings = await readSettings();
  if (!settings.mcpServers) return;
  const key = `${SERVER_PREFIX}${name}`;
  delete settings.mcpServers[key];
  await writeSettings(settings);
}

/**
 * Check if a server with the prefixed name exists in Claude Code settings.
 */
export async function isServerInClaudeCode(name: string): Promise<boolean> {
  const settings = await readSettings();
  const key = `${SERVER_PREFIX}${name}`;
  return key in (settings.mcpServers ?? {});
}

/**
 * Return all factory-managed servers from Claude Code settings.
 */
export async function listFactoryServersInClaudeCode(): Promise<
  Record<string, ClaudeCodeMcpEntry>
> {
  const settings = await readSettings();
  const result: Record<string, ClaudeCodeMcpEntry> = {};
  for (const [key, value] of Object.entries(settings.mcpServers ?? {})) {
    if (key.startsWith(SERVER_PREFIX)) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Type guard for Node.js system errors.
 */
function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && "code" in err;
}
