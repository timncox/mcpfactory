/**
 * Tool handler for testing an existing MCP server.
 *
 * Locates the server directory and exercises the MCP JSON-RPC protocol
 * to verify the server starts and responds correctly.
 */

import { testMcpServer } from "../testing/mcp-tester.js";
import { join } from "node:path";
import { homedir } from "node:os";

/**
 * Arguments accepted by {@link handleTestMcp}.
 */
export interface TestMcpArgs {
  /** The name of the MCP server to test. */
  name: string;
}

/**
 * Test an MCP server by spawning it and exercising its JSON-RPC interface.
 *
 * 1. Find the server directory at ~/mcpfactory/servers/{name}/
 * 2. Run the MCP tester against it
 * 3. Return a content array with the test results
 */
export async function handleTestMcp(
  args: TestMcpArgs,
): Promise<Array<{ type: "text"; text: string }>> {
  const { name } = args;
  const serversBase = join(homedir(), "mcpfactory", "servers");
  const serverDir = join(serversBase, name);

  console.error(`[test-mcp] Testing MCP server "${name}" at ${serverDir}...`);

  const result = await testMcpServer(serverDir);

  if (!result.success) {
    const errorDetails =
      result.errors.length > 0
        ? `\nErrors:\n${result.errors.map((e) => `  - ${e}`).join("\n")}`
        : "";

    return [
      {
        type: "text" as const,
        text: `Test FAILED for MCP server "${name}".${errorDetails}\n\nServer directory: ${serverDir}`,
      },
    ];
  }

  // Format tool list
  const toolsSummary =
    result.tools.length > 0
      ? `\nTools (${result.tools.length}):\n${result.tools.map((t) => `  - ${t.name}: ${t.description}`).join("\n")}`
      : "\nNo tools detected.";

  // Include warnings if any errors were collected despite success
  const warnings =
    result.errors.length > 0
      ? `\nWarnings:\n${result.errors.map((e) => `  - ${e}`).join("\n")}`
      : "";

  return [
    {
      type: "text" as const,
      text: `Test PASSED for MCP server "${name}".${toolsSummary}${warnings}\n\nServer directory: ${serverDir}`,
    },
  ];
}
