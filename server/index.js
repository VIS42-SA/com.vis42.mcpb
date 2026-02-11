/**
 * VIS42 MCP Proxy — stdio-to-StreamableHTTP bridge.
 *
 * Architecture: LAZY CONNECTION
 * 1. Start local stdio server IMMEDIATELY (so Claude Desktop's "initialize" is answered)
 * 2. Connect to remote VIS42 server only on first actual request (tools/list, tools/call, etc.)
 * 3. Cache the remote connection for subsequent requests
 */

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

// ---------------------------------------------------------------------------
// Lazy remote client — connects on first use
// ---------------------------------------------------------------------------
let remoteClient = null;
let connectPromise = null;

async function getRemoteClient() {
  if (remoteClient) return remoteClient;
  if (connectPromise) return connectPromise;

  connectPromise = (async () => {
    const url = new URL(SERVER_URL);
    const headers = {};
    if (API_TOKEN) headers["Authorization"] = `Bearer ${API_TOKEN}`;

    log("Lazy-connecting to remote server...");

    let transport;
    try {
      transport = new StreamableHTTPClientTransport(url, {
        requestInit: { headers },
      });
      log("Using StreamableHTTP transport.");
    } catch (err) {
      log(`StreamableHTTP init failed (${err.message}), falling back to SSE...`);
      transport = new SSEClientTransport(url, {
        requestInit: { headers },
      });
      log("Using SSE transport.");
    }

    const client = new Client({ name: "vis42-proxy", version: "1.0.0" });

    client.onerror = (error) =>
      log(`CLIENT ERROR: ${error.message}\n${error.stack || ""}`);
    client.onclose = () => {
      log("Remote client connection closed.");
      remoteClient = null;
      connectPromise = null;
    };

    try {
      await client.connect(transport);
    } catch (err) {
      log(`FAILED to connect to remote: ${err.message}\n${err.stack}`);
      connectPromise = null;
      throw err;
    }

    log("Connected to remote server.");
    remoteClient = client;
    return client;
  })();

  return connectPromise;
}

// ---------------------------------------------------------------------------
// Local MCP Server — starts IMMEDIATELY on stdio
// ---------------------------------------------------------------------------
async function main() {
  log("Setting up local stdio server...");

  const localTransport = new StdioServerTransport();
  const server = new Server(
    { name: "vis42", version: "1.0.0" },
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
  server.setRequestHandler(ListToolsRequestSchema, async (request) => {
    log("Proxying tools/list...");
    try {
      const client = await getRemoteClient();
      const result = await client.listTools(request.params);
      log(`tools/list returned ${result.tools?.length ?? 0} tools.`);
      return result;
    } catch (error) {
      log(`tools/list FAILED: ${error.message}`);
      throw error;
    }
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    log(`Proxying tools/call: ${request.params?.name}...`);
    try {
      const client = await getRemoteClient();
      const result = await client.callTool(request.params, undefined, {
        timeout: 120_000,
      });
      log(`tools/call ${request.params?.name} completed.`);
      return result;
    } catch (error) {
      log(`tools/call ${request.params?.name} FAILED: ${error.message}`);
      throw error;
    }
  });

  // --- Proxy: resources ---
  server.setRequestHandler(ListResourcesRequestSchema, async (request) => {
    log("Proxying resources/list...");
    const client = await getRemoteClient();
    return await client.listResources(request.params);
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    log("Proxying resources/read...");
    const client = await getRemoteClient();
    return await client.readResource(request.params);
  });

  server.setRequestHandler(ListResourceTemplatesRequestSchema, async (request) => {
    log("Proxying resources/templates/list...");
    const client = await getRemoteClient();
    return await client.listResourceTemplates(request.params);
  });

  // --- Proxy: prompts ---
  server.setRequestHandler(ListPromptsRequestSchema, async (request) => {
    log("Proxying prompts/list...");
    const client = await getRemoteClient();
    return await client.listPrompts(request.params);
  });

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    log("Proxying prompts/get...");
    const client = await getRemoteClient();
    return await client.getPrompt(request.params);
  });

  // --- Shutdown ---
  server.onclose = async () => {
    log("Local server closed, shutting down...");
    if (remoteClient) {
      try {
        await remoteClient.close();
      } catch (_) {}
    }
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
