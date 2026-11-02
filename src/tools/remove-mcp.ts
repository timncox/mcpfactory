/**
 * Tool handler for removing an MCP server managed by MCP Factory.
 *
 * Removes the server from the Claude Desktop config and deletes the
 * server directory on disk.
 */

import { removeServer } from "../config/desktop-config.js";
import { removeServerFromClaudeCode } from "../config/claude-code-config.js";
import { removeServerFromCodex } from "../config/codex-config.js";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";

/**
 * Arguments accepted by {@link handleRemoveMcp}.
 */
export interface RemoveMcpArgs {
  /** The name of the MCP server to remove. */
  name: string;
}

/**
 * Remove an MCP server.
 *
 * 1. Remove from Claude Desktop config
 * 2. Delete the server directory at ~/mcpfactory/servers/{name}/
 * 3. Return a confirmation content array
 */
export async function handleRemoveMcp(
  args: RemoveMcpArgs,
): Promise<Array<{ type: "text"; text: string }>> {
  const { name } = args;
  const serversBase = join(homedir(), "mcpfactory", "servers");
  const serverDir = join(serversBase, name);

  const results: string[] = [];

  // 1. Remove from Claude Desktop config and Claude Code settings
  try {
    await removeServer(name);
    results.push(`Removed "${name}" from Claude Desktop config.`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    results.push(
      `Warning: Failed to remove "${name}" from Claude Desktop config: ${message}`,
    );
  }

  try {
    await removeServerFromClaudeCode(name);
    results.push(`Removed "${name}" from Claude Code settings.`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    results.push(
      `Warning: Failed to remove "${name}" from Claude Code settings: ${message}`,
    );
  }

  try {
    await removeServerFromCodex(name);
    results.push(`Removed "${name}" from Codex config.`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    results.push(
      `Warning: Failed to remove "${name}" from Codex config: ${message}`,
    );
  }

  // 2. Delete the server directory
  try {
    await rm(serverDir, { recursive: true, force: true });
    results.push(`Deleted server directory: ${serverDir}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    results.push(
      `Warning: Failed to delete server directory at ${serverDir}: ${message}`,
    );
  }

  results.push(
    "",
    "Restart Claude Desktop / Codex / start a new Claude Code session to complete the removal.",
  );

  return [
    {
      type: "text" as const,
      text: results.join("\n"),
    },
  ];
}
