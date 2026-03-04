/**
 * Type declarations for @anthropic-ai/claude-code SDK.
 *
 * The claude-code package exposes a `query` function that spawns a Claude Code
 * agent process and streams back messages. This declaration covers the subset
 * of the API that MCP Factory uses.
 */
declare module "@anthropic-ai/claude-code" {
  /** A single text content block inside a message. */
  export interface TextContent {
    type: "text";
    text: string;
  }

  /** A message emitted by the query generator. */
  export interface SDKMessage {
    type: string;
    /** Present on text messages. */
    text?: string;
    /** Some messages carry structured content blocks. */
    content?: TextContent[];
    [key: string]: unknown;
  }

  /** Permission mode options. */
  export type PermissionMode = "default" | "acceptEdits" | "bypassPermissions";

  /** Options passed to the query function. */
  export interface QueryOptions {
    systemPrompt?: string;
    maxTurns?: number;
    cwd?: string;
    permissionMode?: PermissionMode;
    allowDangerouslySkipPermissions?: boolean;
    env?: Record<string, string | undefined>;
    [key: string]: unknown;
  }

  /** The Query object returned by query(). It is an async generator of SDKMessage. */
  export interface Query extends AsyncGenerator<SDKMessage, void> {
    close(): void;
  }

  /** Invoke Claude Code as a sub-agent. */
  export function query(args: {
    prompt: string;
    options?: QueryOptions;
  }): Query;
}
