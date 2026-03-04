import { readFile, writeFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join, dirname } from "node:path";

/**
 * Prefix used to namespace MCP Factory-managed servers in the Claude Desktop config.
 */
const SERVER_PREFIX = "mcp-factory-";

/**
 * Structure for a single MCP server entry in the config.
 */
export interface McpServerEntry {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

/**
 * Structure of the Claude Desktop configuration file.
 */
export interface ClaudeDesktopConfig {
  mcpServers: Record<string, McpServerEntry>;
  [key: string]: unknown;
}

/**
 * Returns the path to the Claude Desktop configuration file.
 */
function getConfigPath(): string {
  return join(
    homedir(),
    "Library",
    "Application Support",
    "Claude",
    "claude_desktop_config.json"
  );
}

/**
 * Read and parse the Claude Desktop configuration file.
 * If the file doesn't exist, returns a default config with an empty mcpServers property.
 */
export async function readConfig(): Promise<ClaudeDesktopConfig> {
  const configPath = getConfigPath();
  try {
    const content = await readFile(configPath, "utf-8");
    const parsed = JSON.parse(content) as ClaudeDesktopConfig;
    // Ensure mcpServers exists even if the file was missing it
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
 * Write the config back to the file, preserving formatting with 2-space indent.
 * Creates the parent directory if it doesn't exist.
 */
export async function writeConfig(config: ClaudeDesktopConfig): Promise<void> {
  const configPath = getConfigPath();
  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

/**
 * Add a server entry to the config under mcpServers.
 * The key is prefixed with `mcp-factory-`.
 */
export async function addServer(
  name: string,
  command: string,
  args: string[],
  env?: Record<string, string>
): Promise<void> {
  const config = await readConfig();
  const key = `${SERVER_PREFIX}${name}`;
  const entry: McpServerEntry = { command, args };
  if (env !== undefined) {
    entry.env = env;
  }
  config.mcpServers[key] = entry;
  await writeConfig(config);
}

/**
 * Remove a server entry from the config.
 * Uses the `mcp-factory-` prefix to find the key.
 */
export async function removeServer(name: string): Promise<void> {
  const config = await readConfig();
  const key = `${SERVER_PREFIX}${name}`;
  delete config.mcpServers[key];
  await writeConfig(config);
}

/**
 * Check if a server with the prefixed name exists in the config.
 */
export async function isServerInstalled(name: string): Promise<boolean> {
  const config = await readConfig();
  const key = `${SERVER_PREFIX}${name}`;
  return key in config.mcpServers;
}

/**
 * Return all servers whose keys start with `mcp-factory-`.
 * Returns a record mapping the full prefixed key to the server entry.
 */
export async function listFactoryServers(): Promise<
  Record<string, McpServerEntry>
> {
  const config = await readConfig();
  const result: Record<string, McpServerEntry> = {};
  for (const [key, value] of Object.entries(config.mcpServers)) {
    if (key.startsWith(SERVER_PREFIX)) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Type guard for Node.js system errors (which include a `code` property).
 */
function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && "code" in err;
}
