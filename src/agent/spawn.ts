/**
 * Agent spawner — wraps the Claude Code SDK to create new MCP servers.
 *
 * The `spawnAgent` function builds system and user prompts from the provided
 * options, then delegates to Claude Code's `query()` to do the actual work
 * (scaffolding files, installing deps, compiling TypeScript).
 */

import { query } from "@anthropic-ai/claude-code";
import { getSystemPrompt, getUserPrompt } from "./prompts.js";
import type { ToolSpec } from "./prompts.js";

/**
 * Options accepted by {@link spawnAgent}.
 */
export interface SpawnAgentOptions {
  /** Absolute path to the working directory for the generated server. */
  serverDir: string;
  /** Name of the MCP server to create (used in package.json, server metadata, etc.). */
  serverName: string;
  /** Human-readable description of what the MCP server should do. */
  description: string;
  /** Optional tool specifications the server should expose. */
  tools?: ToolSpec[];
  /** Optional environment variables the generated MCP server will need at runtime. */
  envVars?: Record<string, string>;
}

/**
 * A single message collected from the Claude Code agent.
 */
export interface AgentMessage {
  type: string;
  text?: string;
}

/**
 * Result returned by {@link spawnAgent}.
 */
export interface SpawnAgentResult {
  /** Whether the agent completed without throwing. */
  success: boolean;
  /** Collected output messages from the agent session. */
  messages: AgentMessage[];
  /** If the agent threw, the error message is captured here. */
  error?: string;
}

/**
 * Spawn a Claude Code agent to generate an MCP server.
 *
 * The agent receives a detailed system prompt covering MCP conventions and a
 * user prompt describing the server to build. It runs inside `serverDir` with
 * full permissions so it can create files, run npm install, and compile.
 *
 * @param options - Configuration for the agent session.
 * @returns A result object indicating success/failure and collected messages.
 */
export async function spawnAgent(
  options: SpawnAgentOptions,
): Promise<SpawnAgentResult> {
  const { serverDir, serverName, description, tools, envVars } = options;

  const systemPrompt = getSystemPrompt(serverName, description, tools);
  const userPrompt = getUserPrompt(description, tools);

  const messages: AgentMessage[] = [];

  try {
    const conversation = query({
      prompt: userPrompt,
      options: {
        systemPrompt,
        maxTurns: 20,
        cwd: serverDir,
        permissionMode: "bypassPermissions",
        allowDangerouslySkipPermissions: true,
        ...(envVars ? { env: { ...process.env, ...envVars } } : {}),
      },
    });

    for await (const message of conversation) {
      messages.push({
        type: message.type,
        text: message.type === "text" ? message.text : undefined,
      });
    }

    return { success: true, messages };
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : String(err);
    return { success: false, messages, error: errorMessage };
  }
}

export type { ToolSpec } from "./prompts.js";
