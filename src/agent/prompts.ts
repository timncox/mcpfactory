/**
 * System and user prompt templates for the MCP server generation agent.
 *
 * These prompts instruct Claude Code on MCP server conventions so that
 * the generated servers are consistent, correct, and ready to use.
 */

/**
 * Describes a single parameter for a tool.
 */
export interface ToolParamSpec {
  type: string;
  description: string;
  required?: boolean;
}

/**
 * Describes a tool that the generated MCP server should expose.
 */
export interface ToolSpec {
  name: string;
  description: string;
  parameters?: Record<string, ToolParamSpec>;
}

/**
 * Build the system prompt that teaches the agent how to create MCP servers.
 *
 * @param serverName  - The name of the MCP server being created.
 * @param description - A human-readable description of what the server does.
 * @param tools       - Optional array of tool specifications to include.
 * @returns The full system prompt string.
 */
export function getSystemPrompt(
  serverName: string,
  description: string,
  tools?: ToolSpec[],
): string {
  const toolSection = tools && tools.length > 0
    ? buildToolSection(tools)
    : "";

  return `You are an expert MCP (Model Context Protocol) server developer. Your job is to create a fully working MCP server called "${serverName}".

Description: ${description}

## MCP Server Conventions

### Imports
- Use \`McpServer\` from \`@modelcontextprotocol/sdk/server/mcp.js\`
- Use \`StdioServerTransport\` from \`@modelcontextprotocol/sdk/server/stdio.js\`
- Use \`zod\` (import \`z\` from \`zod\`) for defining input schemas

### Project Structure
- \`src/index.ts\` is the entry point
- \`package.json\` with \`"type": "module"\`
- \`tsconfig.json\` targeting ES2022 with Node16 module resolution

### Critical Rules
1. **NEVER use \`console.log\`** — MCP communicates over stdout using JSON-RPC. Any stray \`console.log\` output will corrupt the protocol. Use \`console.error\` for debugging only.
2. Tool handlers must return objects in this shape:
   \`\`\`typescript
   { content: [{ type: "text", text: "..." }] }
   \`\`\`
3. After writing all source files, run \`npm install\` and then \`npx tsc\` to compile and verify the code.

### package.json Requirements
The generated \`package.json\` must include:
- \`"type": "module"\`
- \`"main": "dist/index.js"\`
- \`"bin"\` pointing to \`"dist/index.js"\`
- Dependencies:
  - \`@modelcontextprotocol/sdk\` (latest)
  - \`zod\` (latest)
- Dev dependencies:
  - \`typescript\`
  - \`@types/node\`

### tsconfig.json Requirements
\`\`\`json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "strict": true,
    "outDir": "dist",
    "rootDir": "src",
    "esModuleInterop": true,
    "declaration": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
\`\`\`

### src/index.ts Template
The entry point should follow this pattern:

\`\`\`typescript
#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "${serverName}",
  version: "1.0.0",
});

// Register tools here using server.tool(name, description, schema, handler)

const transport = new StdioServerTransport();
await server.connect(transport);
\`\`\`
${toolSection}
## Instructions
1. Create the \`package.json\`, \`tsconfig.json\`, and \`src/index.ts\` files.
2. Implement all tools with proper Zod schemas and handler logic.
3. Run \`npm install\` to install dependencies.
4. Run \`npx tsc\` to compile and verify there are no type errors.
5. Fix any compilation errors before finishing.
`;
}

/**
 * Build a section of the system prompt describing the tools to implement.
 */
function buildToolSection(tools: ToolSpec[]): string {
  const toolDescriptions = tools.map((tool) => {
    let desc = `### Tool: \`${tool.name}\`\n${tool.description}\n`;
    if (tool.parameters && Object.keys(tool.parameters).length > 0) {
      desc += "\nParameters:\n";
      for (const [paramName, param] of Object.entries(tool.parameters)) {
        const requiredTag = param.required ? " (required)" : " (optional)";
        desc += `- \`${paramName}\`: ${param.type}${requiredTag} — ${param.description}\n`;
      }
    }
    return desc;
  });

  return `\n## Tools to Implement\n\n${toolDescriptions.join("\n")}\n`;
}

/**
 * Build the user prompt that tells the agent what to create.
 *
 * @param description - A human-readable description of what the server does.
 * @param tools       - Optional array of tool specifications.
 * @returns The user message string.
 */
export function getUserPrompt(
  description: string,
  tools?: ToolSpec[],
): string {
  let prompt = `Create an MCP server with the following description:\n\n${description}\n`;

  if (tools && tools.length > 0) {
    prompt += "\nThe server should expose these tools:\n\n";
    for (const tool of tools) {
      prompt += `- **${tool.name}**: ${tool.description}\n`;
      if (tool.parameters && Object.keys(tool.parameters).length > 0) {
        for (const [paramName, param] of Object.entries(tool.parameters)) {
          const requiredTag = param.required ? "required" : "optional";
          prompt += `  - \`${paramName}\` (${param.type}, ${requiredTag}): ${param.description}\n`;
        }
      }
    }
  }

  prompt += `\nPlease create all necessary files (package.json, tsconfig.json, src/index.ts, and any helper modules), install dependencies, and verify the project compiles with \`npx tsc\`.`;

  return prompt;
}
