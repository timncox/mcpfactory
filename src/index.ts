#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "mcp-factory",
  version: "1.0.0",
  description: "Create, manage, and test MCP servers from conversations",
});

// Tool 1: create_mcp
server.tool(
  "create_mcp",
  "Create a new MCP server from a description. Spawns a Claude Code agent to write, build, test, and install the server.",
  {
    name: z
      .string()
      .describe("Name for the MCP server (alphanumeric + hyphens)"),
    description: z.string().describe("What the MCP server should do"),
    tools: z
      .array(
        z.object({
          name: z.string(),
          description: z.string(),
          parameters: z
            .record(
              z.string(),
              z.object({
                type: z.string(),
                description: z.string(),
                required: z.boolean().optional(),
              }),
            )
            .optional(),
        }),
      )
      .optional()
      .describe("Optional tool specifications"),
    env_vars: z
      .record(z.string(), z.string())
      .optional()
      .describe("Optional environment variables"),
  },
  async (args) => {
    const { handleCreateMcp } = await import("./tools/create-mcp.js");
    const content = await handleCreateMcp(args);
    return { content };
  },
);

// Tool 2: list_mcps
server.tool(
  "list_mcps",
  "List all MCP servers created by MCP Factory",
  {},
  async () => {
    const { handleListMcps } = await import("./tools/list-mcps.js");
    const content = await handleListMcps();
    return { content };
  },
);

// Tool 3: remove_mcp
server.tool(
  "remove_mcp",
  "Remove an MCP server created by MCP Factory",
  {
    name: z.string().describe("Name of the MCP server to remove"),
  },
  async (args) => {
    const { handleRemoveMcp } = await import("./tools/remove-mcp.js");
    const content = await handleRemoveMcp(args);
    return { content };
  },
);

// Tool 4: test_mcp
server.tool(
  "test_mcp",
  "Test an MCP server by running its JSON-RPC protocol handshake",
  {
    name: z.string().describe("Name of the MCP server to test"),
  },
  async (args) => {
    const { handleTestMcp } = await import("./tools/test-mcp.js");
    const content = await handleTestMcp(args);
    return { content };
  },
);

// Connect via stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
