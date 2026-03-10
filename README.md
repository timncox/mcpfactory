# MCP Factory

An MCP server that creates, manages, and tests other MCP servers. Built to work with both Claude Desktop and Claude Code agent teams.

## How It Works

MCP Factory is itself an MCP server. When invoked by Claude, it spawns a Claude agent (via `@anthropic-ai/claude-agent-sdk`) that writes, builds, tests, and installs a new MCP server — all from a natural language description.

Each generated server uses stdio transport, so multiple agent team members can use the same server simultaneously (each spawns its own process).

## Tools

| Tool | Description |
|------|-------------|
| `create_mcp` | Create a new MCP server from a description. Spawns an agent to write, build, test, and install it. |
| `list_mcps` | List all factory-created servers with installation status for both Claude Desktop and Claude Code. |
| `remove_mcp` | Remove a server from both configs and delete its directory. |
| `test_mcp` | Run the MCP JSON-RPC protocol handshake against an existing server. |

## Installation

Add to your Claude Code settings (`~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "mcp-factory": {
      "command": "node",
      "args": ["/path/to/mcpfactory/dist/index.js"]
    }
  }
}
```

Or to Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "mcp-factory": {
      "command": "node",
      "args": ["/path/to/mcpfactory/dist/index.js"]
    }
  }
}
```

## Building

```bash
npm install
npm run build
```

## Creating a Server

Ask Claude to create an MCP server:

> "Create an MCP server called weather-lookup that fetches current weather for a city using the OpenWeatherMap API"

The factory will:
1. Scaffold the project in `~/mcpfactory/servers/<name>/`
2. Spawn a Claude agent to write the implementation
3. Run `npm install` and `npx tsc` to verify compilation
4. Test the server via JSON-RPC protocol handshake
5. Install to both Claude Desktop and Claude Code settings

You can also specify tools explicitly:

```json
{
  "name": "weather-lookup",
  "description": "Fetch current weather data",
  "tools": [
    {
      "name": "get_weather",
      "description": "Get current weather for a city",
      "parameters": {
        "city": { "type": "string", "description": "City name", "required": true }
      }
    }
  ],
  "env_vars": {
    "OPENWEATHERMAP_API_KEY": "your-key-here"
  }
}
```

## Agent Team Support

Created servers are installed to `~/.claude/settings.json` under the `mcp-factory-` prefix, making them available to Claude Code agent teams. Since each server uses stdio transport, every team member spawns its own isolated process — no concurrency issues.

## Project Structure

```
mcpfactory/
  src/
    index.ts              # MCP server entry point (4 tools)
    agent/
      spawn.ts            # Claude agent spawning via SDK
      prompts.ts          # System/user prompt templates
    config/
      desktop-config.ts   # Claude Desktop config management
      claude-code-config.ts  # Claude Code settings management
    tools/
      create-mcp.ts       # Create server handler
      list-mcps.ts        # List servers handler
      remove-mcp.ts       # Remove server handler
      test-mcp.ts         # Test server handler
    testing/
      mcp-tester.ts       # JSON-RPC protocol test runner
  servers/                # Generated MCP servers live here
```

## Generated Server Conventions

Every server created by the factory follows these conventions:

- TypeScript with ES2022 target and Node16 module resolution
- `@modelcontextprotocol/sdk` for MCP protocol
- `zod` for input schema validation
- `StdioServerTransport` for communication
- No `console.log` (stdout is reserved for JSON-RPC protocol)
- Compiled output in `dist/`, source in `src/`
