/**
 * Tool handler for creating a new MCP server.
 *
 * Orchestrates the full lifecycle: create directory, spawn the Claude Code
 * agent to generate the server, test it, and install it into Claude Desktop.
 */

import { spawnAgent, type ToolSpec } from "../agent/spawn.js";
import { testMcpServer } from "../testing/mcp-tester.js";
import { addServer } from "../config/desktop-config.js";
import { addServerToClaudeCode } from "../config/claude-code-config.js";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";

/**
 * Arguments accepted by {@link handleCreateMcp}.
 */
export interface CreateMcpArgs {
  /** MCP server name (alphanumeric + hyphens). */
  name: string;
  /** Human-readable description of what the MCP should do. */
  description: string;
  /** Optional tool specifications the server should expose. */
  tools?: ToolSpec[];
  /** Optional environment variables for the server at runtime. */
  env_vars?: Record<string, string>;
}

/**
 * Create a new MCP server end-to-end.
 *
 * 1. Create the server directory at ~/mcpfactory/servers/{name}/
 * 2. Spawn a Claude Code agent to generate the server code
 * 3. Test the generated server via the MCP tester
 * 4. If tests pass, install into Claude Desktop config
 * 5. Return an MCP content array with status details
 */
export async function handleCreateMcp(
  args: CreateMcpArgs,
): Promise<Array<{ type: "text"; text: string }>> {
  const { name, description, tools, env_vars } = args;

  // Validate server name to prevent path traversal and invalid config keys
  if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*$/.test(name)) {
    return [
      {
        type: "text" as const,
        text: `Invalid server name: "${name}". Name must contain only alphanumeric characters and hyphens, and start with an alphanumeric character.`,
      },
    ];
  }

  const serversBase = join(homedir(), "mcpfactory", "servers");
  const serverDir = join(serversBase, name);

  // 1. Create server directory
  try {
    await mkdir(serverDir, { recursive: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return [
      {
        type: "text" as const,
        text: `Failed to create server directory at ${serverDir}: ${message}`,
      },
    ];
  }

  // 2. Spawn agent to generate the server
  console.error(`[create-mcp] Spawning agent to create MCP server "${name}"...`);
  const agentResult = await spawnAgent({
    serverDir,
    serverName: name,
    description,
    tools,
    envVars: env_vars,
  });

  if (!agentResult.success) {
    return [
      {
        type: "text" as const,
        text: `Agent failed to create MCP server "${name}".\nError: ${agentResult.error ?? "Unknown error"}\n\nAgent messages:\n${formatAgentMessages(agentResult.messages)}`,
      },
    ];
  }

  console.error(`[create-mcp] Agent completed successfully. Testing server...`);

  // 3. Test the generated server
  const testResult = await testMcpServer(serverDir);

  if (!testResult.success) {
    return [
      {
        type: "text" as const,
        text: `MCP server "${name}" was created but failed testing.\nErrors:\n${testResult.errors.map((e) => `  - ${e}`).join("\n")}\n\nServer directory: ${serverDir}\nYou may need to fix the server manually and re-test.`,
      },
    ];
  }

  console.error(`[create-mcp] Tests passed. Installing to Claude Desktop...`);

  // 4. Install to Claude Desktop config and Claude Code settings
  const entryPoint = join(serverDir, "dist", "index.js");
  const installErrors: string[] = [];

  try {
    await addServer(name, "node", [entryPoint], env_vars);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    installErrors.push(`Claude Desktop: ${message}`);
  }

  try {
    await addServerToClaudeCode(name, "node", [entryPoint], env_vars);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    installErrors.push(`Claude Code: ${message}`);
  }

  if (installErrors.length === 2) {
    return [
      {
        type: "text" as const,
        text: `MCP server "${name}" was created and tested successfully, but failed to install to configs.\nErrors:\n${installErrors.map((e) => `  - ${e}`).join("\n")}\n\nServer directory: ${serverDir}\nTools: ${formatToolList(testResult.tools)}`,
      },
    ];
  }

  // 5. Return success
  const toolsSummary =
    testResult.tools.length > 0
      ? `\nTools:\n${formatToolList(testResult.tools)}`
      : "\nNo tools were detected.";

  const installStatus = installErrors.length > 0
    ? `\nInstall warnings:\n${installErrors.map((e) => `  - ${e}`).join("\n")}`
    : "";

  return [
    {
      type: "text" as const,
      text: `Successfully created and installed MCP server "${name}".\n\nDirectory: ${serverDir}\nClaude Desktop: ${installErrors.some((e) => e.startsWith("Claude Desktop:")) ? "failed" : "installed"}\nClaude Code: ${installErrors.some((e) => e.startsWith("Claude Code:")) ? "failed" : "installed (available to agent teams)"}${installStatus}${toolsSummary}\n\nRestart Claude Desktop / start a new Claude Code session to activate.`,
    },
  ];
}

/**
 * Format agent messages into a readable string for diagnostics.
 */
function formatAgentMessages(
  messages: Array<{ type: string; text?: string }>,
): string {
  return messages
    .filter((m) => m.text)
    .map((m) => `  [${m.type}] ${m.text}`)
    .join("\n");
}

/**
 * Format a list of tool info objects into a readable bullet list.
 */
function formatToolList(
  tools: Array<{ name: string; description: string }>,
): string {
  return tools.map((t) => `  - ${t.name}: ${t.description}`).join("\n");
}
