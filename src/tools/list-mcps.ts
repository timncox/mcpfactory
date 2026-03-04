/**
 * Tool handler for listing all MCP servers managed by MCP Factory.
 *
 * Reads the servers directory and cross-references with the Claude Desktop
 * config to show installation status.
 */

import { listFactoryServers } from "../config/desktop-config.js";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";

/**
 * List all MCP servers created by MCP Factory.
 *
 * 1. Read the ~/mcpfactory/servers/ directory for subdirectories
 * 2. Cross-reference with Claude Desktop config to determine install status
 * 3. Return a formatted content array
 */
export async function handleListMcps(): Promise<
  Array<{ type: "text"; text: string }>
> {
  const serversBase = join(homedir(), "mcpfactory", "servers");

  // 1. Read server directories
  let serverDirs: string[];
  try {
    const entries = await readdir(serversBase, { withFileTypes: true });
    serverDirs = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch (err: unknown) {
    // If the directory doesn't exist, there are no servers
    if (isNodeError(err) && err.code === "ENOENT") {
      return [
        {
          type: "text" as const,
          text: "No MCP servers found. The servers directory does not exist yet.\n\nUse the create_mcp tool to create your first server.",
        },
      ];
    }
    const message = err instanceof Error ? err.message : String(err);
    return [
      {
        type: "text" as const,
        text: `Failed to read servers directory: ${message}`,
      },
    ];
  }

  if (serverDirs.length === 0) {
    return [
      {
        type: "text" as const,
        text: "No MCP servers found.\n\nUse the create_mcp tool to create your first server.",
      },
    ];
  }

  // 2. Cross-reference with Claude Desktop config
  let installedServers: Record<string, unknown>;
  try {
    installedServers = await listFactoryServers();
  } catch {
    installedServers = {};
  }

  // The config keys are prefixed with "mcp-factory-"
  const installedNames = new Set(
    Object.keys(installedServers).map((key) =>
      key.replace(/^mcp-factory-/, ""),
    ),
  );

  // 3. Format output
  const lines: string[] = [`MCP Factory Servers (${serverDirs.length}):\n`];

  for (const name of serverDirs.sort()) {
    const installed = installedNames.has(name);
    const status = installed ? "installed" : "not installed";
    const dir = join(serversBase, name);
    lines.push(`  - ${name} [${status}]`);
    lines.push(`    Directory: ${dir}`);
  }

  return [
    {
      type: "text" as const,
      text: lines.join("\n"),
    },
  ];
}

/**
 * Type guard for Node.js system errors.
 */
function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && "code" in err;
}
