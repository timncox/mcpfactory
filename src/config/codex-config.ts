/**
 * Manages MCP server entries in the Codex CLI configuration file
 * (~/.codex/config.toml) so that factory-created servers are
 * available to Codex.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import * as TOML from "smol-toml";

/**
 * Prefix used to namespace MCP Factory-managed servers in Codex config.
 */
const SERVER_PREFIX = "mcp-factory-";

/**
 * Structure for a single MCP server entry in Codex config.
 */
export interface CodexMcpEntry {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  enabled?: boolean;
}

/**
 * Structure of the Codex configuration file (partial — only fields we touch).
 */
export interface CodexConfig {
  mcp_servers?: Record<string, CodexMcpEntry>;
  [key: string]: unknown;
}

/**
 * Returns the path to the Codex configuration file.
 * Respects the CODEX_HOME environment variable if set.
 */
function getConfigPath(): string {
  const codexHome = process.env.CODEX_HOME || join(homedir(), ".codex");
  return join(codexHome, "config.toml");
}

/**
 * Read and parse the Codex configuration file.
 * If the file doesn't exist, returns a default config.
 */
export async function readConfig(): Promise<CodexConfig> {
  const configPath = getConfigPath();
  try {
    const content = await readFile(configPath, "utf-8");
    const parsed = TOML.parse(content) as CodexConfig;
    if (!parsed.mcp_servers) {
      parsed.mcp_servers = {};
    }
    return parsed;
  } catch (err: unknown) {
    if (isNodeError(err) && err.code === "ENOENT") {
      return { mcp_servers: {} };
    }
    throw err;
  }
}

/**
 * Write the config back to the file.
 * Creates the parent directory if it doesn't exist.
 */
export async function writeConfig(config: CodexConfig): Promise<void> {
  const configPath = getConfigPath();
  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, TOML.stringify(config as Record<string, unknown>) + "\n", "utf-8");
}

/**
 * Add a server entry to the Codex config under mcp_servers.
 * The key is prefixed with `mcp-factory-`.
 */
export async function addServerToCodex(
  name: string,
  command: string,
  args: string[],
  env?: Record<string, string>,
): Promise<void> {
  const config = await readConfig();
  if (!config.mcp_servers) {
    config.mcp_servers = {};
  }
  const key = `${SERVER_PREFIX}${name}`;
  const entry: CodexMcpEntry = { command, args, enabled: true };
  if (env !== undefined) {
    entry.env = env;
  }
  config.mcp_servers[key] = entry;
  await writeConfig(config);
}

/**
 * Remove a server entry from the Codex config.
 */
export async function removeServerFromCodex(name: string): Promise<void> {
  const config = await readConfig();
  if (!config.mcp_servers) return;
  const key = `${SERVER_PREFIX}${name}`;
  delete config.mcp_servers[key];
  await writeConfig(config);
}

/**
 * Check if a server with the prefixed name exists in the Codex config.
 */
export async function isServerInCodex(name: string): Promise<boolean> {
  const config = await readConfig();
  const key = `${SERVER_PREFIX}${name}`;
  return key in (config.mcp_servers ?? {});
}

/**
 * Return all factory-managed servers from the Codex config.
 */
export async function listFactoryServersInCodex(): Promise<
  Record<string, CodexMcpEntry>
> {
  const config = await readConfig();
  const result: Record<string, CodexMcpEntry> = {};
  for (const [key, value] of Object.entries(config.mcp_servers ?? {})) {
    if (key.startsWith(SERVER_PREFIX)) {
      result[key] = value as CodexMcpEntry;
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
