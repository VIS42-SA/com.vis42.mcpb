/**
 * VIS42 MCP Proxy — stdio-to-StreamableHTTP bridge.
 *
 * Reads JSON-RPC messages from stdin (Claude Desktop),
 * forwards them to the remote VIS42 MCP server over Streamable HTTP,
 * and relays responses back to stdout.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const SERVER_URL = "https://vis42.com/api/mcp";
const API_TOKEN = process.env.VIS42_API_TOKEN;

const log = (msg) => process.stderr.write(`[vis42-proxy] ${msg}\n`);

/**
 * Create the remote client transport, trying Streamable HTTP first, falling back to SSE.
 */
function createRemoteTransport() {
  const url = new URL(SERVER_URL);
  const headers = {};

  if (API_TOKEN) {
    headers["Authorization"] = `Bearer ${API_TOKEN}`;
  }

  // Try Streamable HTTP first
  try {
    return new StreamableHTTPClientTransport(url, {
      requestInit: { headers },
    });
  } catch (error) {
    log(`StreamableHTTP init failed, using SSE fallback: ${error.message}`);
    return new SSEClientTransport(url, {
      requestInit: { headers },
    });
  }
}

async function main() {
  // --- Remote side: MCP Client connecting to VIS42 server ---
  const remoteTransport = createRemoteTransport();
  const client = new Client({ name: "vis42-proxy", version: "1.0.0" });

  log("Connecting to remote server...");
  await client.connect(remoteTransport);
  log("Connected to remote server.");

  const remoteCapabilities = client.getServerCapabilities();
  log(`Remote capabilities: ${JSON.stringify(remoteCapabilities)}`);

  // --- Local side: MCP Server exposed to Claude Desktop via stdio ---
  const localTransport = new StdioServerTransport();
  const server = new Server(
    { name: "vis42", version: "1.0.0" },
    { capabilities: remoteCapabilities ?? {} }
  );

  // Proxy: tools/list
  if (remoteCapabilities?.tools) {
    server.setRequestHandler(
      { method: "tools/list" },
      async (request) => {
        const result = await client.listTools(request.params);
        return result;
      }
    );

    // Proxy: tools/call
    server.setRequestHandler(
      { method: "tools/call" },
      async (request) => {
        const result = await client.callTool(
          request.params,
          undefined,
          { timeout: 120_000 }
        );
        return result;
      }
    );
  }

  // Proxy: resources/list
  if (remoteCapabilities?.resources) {
    server.setRequestHandler(
      { method: "resources/list" },
      async (request) => {
        const result = await client.listResources(request.params);
        return result;
      }
    );

    // Proxy: resources/read
    server.setRequestHandler(
      { method: "resources/read" },
      async (request) => {
        const result = await client.readResource(request.params);
        return result;
      }
    );

    // Proxy: resources/templates/list
    server.setRequestHandler(
      { method: "resources/templates/list" },
      async (request) => {
        const result = await client.listResourceTemplates(request.params);
        return result;
      }
    );
  }

  // Proxy: prompts/list
  if (remoteCapabilities?.prompts) {
    server.setRequestHandler(
      { method: "prompts/list" },
      async (request) => {
        const result = await client.listPrompts(request.params);
        return result;
      }
    );

    // Proxy: prompts/get
    server.setRequestHandler(
      { method: "prompts/get" },
      async (request) => {
        const result = await client.getPrompt(request.params);
        return result;
      }
    );
  }

  // Handle shutdown
  server.onclose = async () => {
    log("Local server closed, shutting down...");
    await client.close();
    process.exit(0);
  };

  client.onclose = () => {
    log("Remote client disconnected.");
    process.exit(0);
  };

  log("Starting local stdio server...");
  await server.connect(localTransport);
  log("Proxy ready — bridging stdio ↔ remote server.");
}

main().catch((error) => {
  log(`Fatal error: ${error.message}`);
  process.exit(1);
});
