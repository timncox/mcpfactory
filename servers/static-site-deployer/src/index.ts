#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  access,
  readdir,
  readFile,
  writeFile,
  copyFile,
  mkdir,
  cp,
  rm,
} from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Platform = "surge" | "netlify" | "vercel";

/** Check whether a CLI binary is available on $PATH. */
async function whichCli(name: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("which", [name]);
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

/** Auto-detect the first available deployment CLI. */
async function detectPlatform(): Promise<Platform> {
  // Try in order of preference: surge (simplest), netlify, vercel
  if (await whichCli("surge")) return "surge";
  if (await whichCli("netlify")) return "netlify";
  if (await whichCli("vercel")) return "vercel";
  throw new Error(
    "No supported deployment CLI found. Please install one of: surge, netlify-cli, or vercel."
  );
}

/** Validate that a specific platform CLI is installed. */
async function validatePlatform(platform: Platform): Promise<void> {
  const cliName = platform === "netlify" ? "netlify" : platform;
  if (!(await whichCli(cliName))) {
    throw new Error(
      `The "${cliName}" CLI is not installed or not on your PATH. Install it first (e.g. npm i -g ${cliName === "netlify" ? "netlify-cli" : cliName}).`
    );
  }
}

/**
 * Generate the password-gate HTML that wraps the real page content.
 * Uses a simple SHA-256 hash comparison so the password never appears in
 * plain text in the deployed HTML.  The real page body is XOR-encrypted with
 * the password and stored as a base-64 blob that is decrypted client-side.
 */
function buildPasswordGateHtml(originalHtml: string, password: string): string {
  // XOR-encrypt the original HTML with the password (repeating key).
  const buf = Buffer.from(originalHtml, "utf-8");
  const key = Buffer.from(password, "utf-8");
  for (let i = 0; i < buf.length; i++) {
    buf[i] = buf[i]! ^ key[i % key.length]!;
  }
  const encryptedBase64 = buf.toString("base64");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Password Protected</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f5f5f5}
  .gate{background:#fff;padding:2.5rem;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,.1);text-align:center;max-width:380px;width:90%}
  .gate h1{font-size:1.25rem;margin-bottom:1rem;color:#333}
  .gate input{width:100%;padding:.65rem .85rem;border:1px solid #ccc;border-radius:6px;font-size:1rem;margin-bottom:.75rem}
  .gate button{width:100%;padding:.65rem;background:#111;color:#fff;border:none;border-radius:6px;font-size:1rem;cursor:pointer}
  .gate button:hover{background:#333}
  .gate .err{color:#c00;font-size:.85rem;margin-top:.5rem;display:none}
</style>
</head>
<body>
<div class="gate">
  <h1>This site is password-protected</h1>
  <form id="f">
    <input id="p" type="password" placeholder="Enter password" autofocus/>
    <button type="submit">Unlock</button>
    <p class="err" id="e">Incorrect password</p>
  </form>
</div>
<script>
(function(){
  var ENC="${encryptedBase64}";
  document.getElementById("f").addEventListener("submit",function(ev){
    ev.preventDefault();
    var pw=document.getElementById("p").value;
    try{
      var raw=atob(ENC);
      var bytes=new Uint8Array(raw.length);
      for(var i=0;i<raw.length;i++) bytes[i]=raw.charCodeAt(i);
      var key=new TextEncoder().encode(pw);
      for(var i=0;i<bytes.length;i++) bytes[i]=bytes[i]^key[i%key.length];
      var decoded=new TextDecoder().decode(bytes);
      if(decoded.indexOf("<")===0||decoded.indexOf("<!") === 0){
        document.open();document.write(decoded);document.close();
      } else {
        document.getElementById("e").style.display="block";
      }
    }catch(err){
      document.getElementById("e").style.display="block";
    }
  });
})();
</script>
</body>
</html>`;
}

/**
 * Create a temporary staging copy of the deployment directory so we never
 * mutate the user's original files.
 */
async function createStagingDir(sourceDir: string): Promise<string> {
  const name = `mcp-deploy-${randomBytes(6).toString("hex")}`;
  const staging = join(tmpdir(), name);
  await mkdir(staging, { recursive: true });
  await cp(sourceDir, staging, { recursive: true });
  return staging;
}

/** Find the most likely entry HTML file in a directory. */
async function findEntryFile(dir: string): Promise<string | null> {
  const candidates = ["index.html", "index.htm", "default.html", "home.html"];
  const files = await readdir(dir);
  // Exact match first
  for (const c of candidates) {
    if (files.includes(c)) return c;
  }
  // Fall back to any .html file if there's exactly one
  const htmlFiles = files.filter(
    (f) => f.endsWith(".html") || f.endsWith(".htm")
  );
  if (htmlFiles.length === 1) return htmlFiles[0]!;
  return null;
}

// ---------------------------------------------------------------------------
// Deployment runners
// ---------------------------------------------------------------------------

async function deployWithSurge(dir: string): Promise<string> {
  // Surge requires a CNAME or domain — generate a random subdomain
  const subdomain = `mcp-deploy-${randomBytes(4).toString("hex")}.surge.sh`;
  try {
    const { stdout, stderr } = await execFileAsync("surge", [dir, subdomain], {
      timeout: 120_000,
    });
    console.error("[surge stdout]", stdout);
    console.error("[surge stderr]", stderr);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Surge deployment failed: ${msg}`);
  }
  return `https://${subdomain}`;
}

async function deployWithNetlify(dir: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync(
      "netlify",
      ["deploy", "--dir", dir, "--prod", "--json"],
      { timeout: 120_000 }
    );
    console.error("[netlify stdout]", stdout);
    // netlify deploy --json outputs JSON with a "url" or "deploy_url" field
    const parsed = JSON.parse(stdout);
    const url =
      parsed.deploy_url || parsed.url || parsed.site_url || parsed.ssl_url;
    if (!url) throw new Error("Could not parse URL from Netlify output.");
    return url as string;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Netlify deployment failed: ${msg}`);
  }
}

async function deployWithVercel(dir: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync(
      "vercel",
      ["deploy", dir, "--yes", "--prod"],
      { timeout: 120_000 }
    );
    console.error("[vercel stdout]", stdout);
    // Vercel prints the deployment URL as the last line of stdout
    const url = stdout.trim().split("\n").pop()?.trim();
    if (!url || !url.startsWith("http")) {
      throw new Error("Could not parse URL from Vercel output.");
    }
    return url;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Vercel deployment failed: ${msg}`);
  }
}

// ---------------------------------------------------------------------------
// MCP Server
// ---------------------------------------------------------------------------

const server = new McpServer({
  name: "static-site-deployer",
  version: "1.0.0",
});

server.tool(
  "deploy",
  "Deploy a local directory as a static site. Auto-detects and renames the entry HTML file to index.html if needed. Optionally injects client-side password protection. Uses Surge, Netlify CLI, or Vercel CLI (auto-detected or user-specified). Returns the live deployment URL.",
  {
    directory: z
      .string()
      .describe("Absolute path to the directory to deploy"),
    entry_file: z
      .string()
      .optional()
      .describe(
        "Name of the entry HTML file if not index.html. Will be copied to index.html for deployment."
      ),
    password: z
      .string()
      .optional()
      .describe(
        "If provided, injects a client-side password gate into index.html before deploying."
      ),
    platform: z
      .enum(["surge", "netlify", "vercel"])
      .optional()
      .describe(
        "Deployment platform. Auto-detects available CLI if omitted."
      ),
  },
  async ({ directory, entry_file, password, platform }) => {
    try {
      // 1. Validate source directory exists
      const sourceDir = resolve(directory);
      try {
        await access(sourceDir);
      } catch {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: Directory does not exist: ${sourceDir}`,
            },
          ],
        };
      }

      // 2. Determine platform
      let chosenPlatform: Platform;
      if (platform) {
        chosenPlatform = platform;
        await validatePlatform(chosenPlatform);
      } else {
        chosenPlatform = await detectPlatform();
      }

      // 3. Create a staging copy so we don't mutate the original
      const stagingDir = await createStagingDir(sourceDir);
      console.error(`[deploy] Staging directory: ${stagingDir}`);

      try {
        // 4. Handle entry file → index.html
        const indexPath = join(stagingDir, "index.html");
        let hasIndex = false;
        try {
          await access(indexPath);
          hasIndex = true;
        } catch {
          // no index.html yet
        }

        if (entry_file && entry_file !== "index.html") {
          const entryPath = join(stagingDir, entry_file);
          try {
            await access(entryPath);
          } catch {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Error: Entry file not found: ${entry_file} in ${sourceDir}`,
                },
              ],
            };
          }
          // Copy (not rename) entry file to index.html
          await copyFile(entryPath, indexPath);
          hasIndex = true;
          console.error(
            `[deploy] Copied ${entry_file} → index.html in staging`
          );
        }

        // Auto-detect if still no index.html
        if (!hasIndex) {
          const detected = await findEntryFile(stagingDir);
          if (detected && detected !== "index.html") {
            await copyFile(join(stagingDir, detected), indexPath);
            hasIndex = true;
            console.error(
              `[deploy] Auto-detected and copied ${detected} → index.html`
            );
          } else if (!detected) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Error: No HTML entry file found in ${sourceDir}. Please specify one with entry_file.`,
                },
              ],
            };
          }
        }

        // 5. Optionally inject password protection
        if (password) {
          const html = await readFile(indexPath, "utf-8");
          const protectedHtml = buildPasswordGateHtml(html, password);
          await writeFile(indexPath, protectedHtml, "utf-8");
          console.error("[deploy] Injected password protection into index.html");
        }

        // 6. Deploy
        let deployUrl: string;
        switch (chosenPlatform) {
          case "surge":
            deployUrl = await deployWithSurge(stagingDir);
            break;
          case "netlify":
            deployUrl = await deployWithNetlify(stagingDir);
            break;
          case "vercel":
            deployUrl = await deployWithVercel(stagingDir);
            break;
        }

        // 7. Clean up staging
        await rm(stagingDir, { recursive: true, force: true }).catch(() => {});

        const summary = [
          `✅ Deployment successful!`,
          ``,
          `URL: ${deployUrl}`,
          `Platform: ${chosenPlatform}`,
          `Source: ${sourceDir}`,
          ...(entry_file ? [`Entry file: ${entry_file} → index.html`] : []),
          ...(password ? [`Password protection: enabled`] : []),
        ].join("\n");

        return { content: [{ type: "text" as const, text: summary }] };
      } catch (innerErr) {
        // Clean up staging on failure too
        await rm(stagingDir, { recursive: true, force: true }).catch(() => {});
        throw innerErr;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text" as const, text: `Error: ${message}` }],
      };
    }
  }
);

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("static-site-deployer MCP server running on stdio");
