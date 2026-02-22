/**
 * VIS42 MCP Proxy — stdio-to-StreamableHTTP bridge.
 *
 * Architecture: LAZY CONNECTION
 * 1. Start local stdio server IMMEDIATELY (so Claude Desktop's "initialize" is answered)
 * 2. Connect to remote VIS42 server only on first actual request (tools/list, tools/call, etc.)
 * 3. Cache the remote connection for subsequent requests
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { warnIfNoToken, withLogging, buildGetRemoteClient } from './lib.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const { version } = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8'));

const SERVER_URL = "https://vis42.com/api/mcp";
const API_TOKEN = process.env.VIS42_API_TOKEN;

const log = (msg) => process.stderr.write(`[vis42-proxy] ${msg}\n`);

// Global error handlers — these appear in Claude Desktop logs
process.on("uncaughtException", (err) => {
  log(`UNCAUGHT EXCEPTION: ${err.message}\n${err.stack}`);
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  log(
    `UNHANDLED REJECTION: ${reason instanceof Error ? `${reason.message}\n${reason.stack}` : String(reason)}`
  );
  process.exit(1);
});

log(`Starting proxy — SERVER_URL=${SERVER_URL}`);
log(`API_TOKEN=${API_TOKEN ? "set (" + API_TOKEN.length + " chars)" : "NOT SET"}`);
log(`Node.js ${process.version}`);
log(`vis42-proxy v${version}`);
warnIfNoToken(API_TOKEN, log);

// ---------------------------------------------------------------------------
// Lazy remote client
// ---------------------------------------------------------------------------
const getRemoteClient = buildGetRemoteClient({
  Client,
  StreamableHTTPClientTransport,
  SSEClientTransport,
  serverUrl: SERVER_URL,
  apiToken: API_TOKEN,
  log,
  connectTimeoutMs: 30_000,
  clientVersion: version,
});

// ---------------------------------------------------------------------------
// Local MCP Server — starts IMMEDIATELY on stdio
// ---------------------------------------------------------------------------
async function main() {
  log("Setting up local stdio server...");

  const localTransport = new StdioServerTransport();
  const server = new Server(
    { name: "vis42", version },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    }
  );

  server.onerror = (error) =>
    log(`SERVER ERROR: ${error.message}\n${error.stack || ""}`);

  // --- Proxy: tools ---
  server.setRequestHandler(ListToolsRequestSchema, withLogging('tools/list', async (request) => {
    const client = await getRemoteClient();
    const result = await client.listTools(request.params);
    log(`tools/list: ${result.tools?.length ?? 0} tools`);
    return result;
  }, log));

  server.setRequestHandler(CallToolRequestSchema, withLogging('tools/call', async (request) => {
    const name = request.params?.name;
    log(`tools/call: invoking ${name}`);
    const client = await getRemoteClient();
    return await client.callTool(request.params, undefined, { timeout: 120_000 });
  }, log));

  // --- Proxy: resources ---
  server.setRequestHandler(ListResourcesRequestSchema, withLogging('resources/list', async (request) => {
    const client = await getRemoteClient();
    return await client.listResources(request.params);
  }, log));

  server.setRequestHandler(ReadResourceRequestSchema, withLogging('resources/read', async (request) => {
    const client = await getRemoteClient();
    return await client.readResource(request.params);
  }, log));

  server.setRequestHandler(ListResourceTemplatesRequestSchema, withLogging('resources/templates/list', async (request) => {
    const client = await getRemoteClient();
    return await client.listResourceTemplates(request.params);
  }, log));

  // --- Proxy: prompts ---
  server.setRequestHandler(ListPromptsRequestSchema, withLogging('prompts/list', async (request) => {
    const client = await getRemoteClient();
    return await client.listPrompts(request.params);
  }, log));

  server.setRequestHandler(GetPromptRequestSchema, withLogging('prompts/get', async (request) => {
    const client = await getRemoteClient();
    return await client.getPrompt(request.params);
  }, log));

  // --- Shutdown ---
  server.onclose = () => {
    log("Local server closed, shutting down...");
    process.exit(0);
  };

  // Connect local stdio — this answers Claude Desktop's "initialize" IMMEDIATELY
  log("Connecting local stdio server...");
  await server.connect(localTransport);
  log("Proxy ready — stdio server running. Remote connection will be established on first request.");
}

main().catch((error) => {
  log(`FATAL: ${error.message}\n${error.stack}`);
  process.exit(1);
});
