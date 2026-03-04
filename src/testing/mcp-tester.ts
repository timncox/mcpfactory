import { spawn, type ChildProcess } from "node:child_process";
import { join } from "node:path";
import { access } from "node:fs/promises";

/**
 * Information about a single tool exposed by an MCP server.
 */
export interface ToolInfo {
  name: string;
  description: string;
}

/**
 * Result of testing an MCP server.
 */
export interface TestResult {
  success: boolean;
  tools: ToolInfo[];
  errors: string[];
}

/** How long to wait for a JSON-RPC response before giving up (ms). */
const RESPONSE_TIMEOUT_MS = 10_000;

/**
 * Send a JSON-RPC request to a child process over stdin and wait for the
 * matching response (by `id`) on stdout.
 *
 * The function buffers stdout data and scans each complete line for a JSON
 * object whose `id` field matches the request id.
 *
 * Returns the parsed JSON-RPC response object.
 */
function sendRequest(
  proc: ChildProcess,
  id: number,
  method: string,
  params?: Record<string, unknown>
): Promise<any> {
  return new Promise((resolve, reject) => {
    const request: Record<string, unknown> = {
      jsonrpc: "2.0",
      id,
      method,
    };
    if (params !== undefined) {
      request.params = params;
    }

    let buffer = "";

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Timeout waiting for response to request id=${id}, method="${method}"`));
    }, RESPONSE_TIMEOUT_MS);

    function onData(chunk: Buffer) {
      buffer += chunk.toString();

      // Process complete lines
      const lines = buffer.split("\n");
      // Keep the last (possibly incomplete) segment in the buffer
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
          const parsed = JSON.parse(trimmed);
          if (parsed && typeof parsed === "object" && parsed.id === id) {
            cleanup();
            resolve(parsed);
            return;
          }
        } catch {
          // Not valid JSON — skip (could be log output or partial data)
        }
      }
    }

    function onError(err: Error) {
      cleanup();
      reject(new Error(`Process error while waiting for response id=${id}: ${err.message}`));
    }

    function onClose(code: number | null) {
      cleanup();
      reject(
        new Error(
          `Process exited with code ${code} before response id=${id} was received`
        )
      );
    }

    function cleanup() {
      clearTimeout(timeout);
      proc.stdout?.off("data", onData);
      proc.off("error", onError);
      proc.off("close", onClose);
    }

    proc.stdout?.on("data", onData);
    proc.on("error", onError);
    proc.on("close", onClose);

    // Write the request followed by a newline
    proc.stdin?.write(JSON.stringify(request) + "\n");
  });
}

/**
 * Send a JSON-RPC notification (a message with no `id` that expects no response).
 */
function sendNotification(
  proc: ChildProcess,
  method: string,
  params?: Record<string, unknown>
): void {
  const notification: Record<string, unknown> = {
    jsonrpc: "2.0",
    method,
  };
  if (params !== undefined) {
    notification.params = params;
  }
  proc.stdin?.write(JSON.stringify(notification) + "\n");
}

/**
 * Forcefully kill a child process and ignore errors if it is already dead.
 */
function killProcess(proc: ChildProcess): void {
  try {
    proc.kill("SIGKILL");
  } catch {
    // Process may already be dead — that is fine.
  }
}

/**
 * Test an MCP server by spawning it as a child process and exercising the
 * JSON-RPC 2.0 protocol over stdio.
 *
 * Steps:
 * 1. Verify that `dist/index.js` exists in `serverDir`.
 * 2. Spawn the server with `node dist/index.js`.
 * 3. Send `initialize` request and wait for response.
 * 4. Send `notifications/initialized` notification.
 * 5. Send `tools/list` request and collect tool information.
 * 6. Kill the child process and return the results.
 *
 * @param serverDir - Absolute path to the root of the MCP server project.
 * @returns A `TestResult` describing whether the server started and responded
 *          correctly, the tools it exposes, and any errors encountered.
 */
export async function testMcpServer(serverDir: string): Promise<TestResult> {
  const errors: string[] = [];
  const tools: ToolInfo[] = [];
  const entryPoint = join(serverDir, "dist", "index.js");

  // 1. Verify that the entry point exists
  try {
    await access(entryPoint);
  } catch {
    return {
      success: false,
      tools: [],
      errors: [`Entry point not found: ${entryPoint}`],
    };
  }

  // 2. Spawn the server
  let proc: ChildProcess;
  try {
    proc = spawn("node", ["dist/index.js"], {
      cwd: serverDir,
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      tools: [],
      errors: [`Failed to spawn server process: ${message}`],
    };
  }

  // Collect stderr for diagnostics
  let stderrOutput = "";
  proc.stderr?.on("data", (chunk: Buffer) => {
    stderrOutput += chunk.toString();
  });

  // Handle the case where spawn itself fails asynchronously (e.g., ENOENT for node)
  const spawnError = new Promise<Error>((resolve) => {
    proc.on("error", (err) => resolve(err));
  });

  // Give a brief moment for spawn errors to surface before proceeding
  const earlyError = await Promise.race([
    spawnError,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 200)),
  ]);

  if (earlyError) {
    killProcess(proc);
    return {
      success: false,
      tools: [],
      errors: [`Server process failed to start: ${earlyError.message}`],
    };
  }

  try {
    // 3. Send initialize request
    const initResponse = await sendRequest(proc, 1, "initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "mcp-factory-tester", version: "1.0.0" },
    });

    if (initResponse.error) {
      errors.push(
        `Initialize error: ${initResponse.error.message ?? JSON.stringify(initResponse.error)}`
      );
      killProcess(proc);
      return { success: false, tools, errors };
    }

    // 4. Send initialized notification
    sendNotification(proc, "notifications/initialized");

    // 5. Send tools/list request
    const toolsResponse = await sendRequest(proc, 2, "tools/list");

    if (toolsResponse.error) {
      errors.push(
        `tools/list error: ${toolsResponse.error.message ?? JSON.stringify(toolsResponse.error)}`
      );
      killProcess(proc);
      return { success: false, tools, errors };
    }

    // 6. Collect tool information
    const toolList = toolsResponse.result?.tools;
    if (Array.isArray(toolList)) {
      for (const tool of toolList) {
        tools.push({
          name: tool.name ?? "(unknown)",
          description: tool.description ?? "",
        });
      }
    }

    // 7. Kill the child process
    killProcess(proc);

    return { success: true, tools, errors };
  } catch (err: unknown) {
    killProcess(proc);

    const message = err instanceof Error ? err.message : String(err);
    errors.push(message);

    // Append stderr if there is any, to aid debugging
    if (stderrOutput.trim()) {
      errors.push(`Server stderr: ${stderrOutput.trim()}`);
    }

    return { success: false, tools, errors };
  }
}
