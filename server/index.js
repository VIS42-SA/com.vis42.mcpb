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

// Catch everything — these will appear in Claude Desktop logs
process.on("uncaughtException", (err) => {
  log(`UNCAUGHT EXCEPTION: ${err.message}\n${err.stack}`);
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  log(`UNHANDLED REJECTION: ${reason instanceof Error ? `${reason.message}\n${reason.stack}` : String(reason)}`);
  process.exit(1);
});

log(`Starting proxy — SERVER_URL=${SERVER_URL}`);
log(`API_TOKEN=${API_TOKEN ? "set (" + API_TOKEN.length + " chars)" : "NOT SET"}`);
log(`Node.js ${process.version}`);

async function main() {
  // --- Remote side: MCP Client connecting to VIS42 server ---
  const url = new URL(SERVER_URL);
  const headers = {};
  if (API_TOKEN) {
    headers["Authorization"] = `Bearer ${API_TOKEN}`;
  }

  log("Creating remote transport...");
  let remoteTransport;
  try {
    remoteTransport = new StreamableHTTPClientTransport(url, {
      requestInit: { headers },
    });
    log("Using StreamableHTTP transport.");
  } catch (error) {
    log(`StreamableHTTP init failed: ${error.message}\n${error.stack}`);
    log("Falling back to SSE transport...");
    remoteTransport = new SSEClientTransport(url, {
      requestInit: { headers },
    });
    log("Using SSE transport.");
  }

  const client = new Client({ name: "vis42-proxy", version: "1.0.0" });

  client.onerror = (error) => {
    log(`CLIENT ERROR: ${error.message}\n${error.stack || ""}`);
  };

  client.onclose = () => {
    log("Remote client connection closed.");
  };

  log("Connecting to remote server...");
  try {
    await client.connect(remoteTransport);
  } catch (error) {
    log(`FAILED to connect to remote server: ${error.message}\n${error.stack}`);
    process.exit(1);
  }
  log("Connected to remote server.");

  const remoteCapabilities = client.getServerCapabilities();
  log(`Remote capabilities: ${JSON.stringify(remoteCapabilities)}`);

  // --- Local side: MCP Server exposed to Claude Desktop via stdio ---
  log("Setting up local stdio server...");
  const localTransport = new StdioServerTransport();
  const server = new Server(
    { name: "vis42", version: "1.0.0" },
    { capabilities: remoteCapabilities ?? {} }
  );

  server.onerror = (error) => {
    log(`SERVER ERROR: ${error.message}\n${error.stack || ""}`);
  };

  // Proxy: tools/list
  if (remoteCapabilities?.tools) {
    log("Registering tools proxy handlers...");
    server.setRequestHandler(
      { method: "tools/list" },
      async (request) => {
        log("Proxying tools/list...");
        try {
          const result = await client.listTools(request.params);
          log(`tools/list returned ${result.tools?.length ?? 0} tools.`);
          return result;
        } catch (error) {
          log(`tools/list FAILED: ${error.message}\n${error.stack || ""}`);
          throw error;
        }
      }
    );

    server.setRequestHandler(
      { method: "tools/call" },
      async (request) => {
        log(`Proxying tools/call: ${request.params?.name}...`);
        try {
          const result = await client.callTool(
            request.params,
            undefined,
            { timeout: 120_000 }
          );
          log(`tools/call ${request.params?.name} completed.`);
          return result;
        } catch (error) {
          log(`tools/call ${request.params?.name} FAILED: ${error.message}\n${error.stack || ""}`);
          throw error;
        }
      }
    );
  } else {
    log("Remote server has NO tools capability.");
  }

  // Proxy: resources
  if (remoteCapabilities?.resources) {
    log("Registering resources proxy handlers...");
    server.setRequestHandler(
      { method: "resources/list" },
      async (request) => {
        const result = await client.listResources(request.params);
        return result;
      }
    );
    server.setRequestHandler(
      { method: "resources/read" },
      async (request) => {
        const result = await client.readResource(request.params);
        return result;
      }
    );
    server.setRequestHandler(
      { method: "resources/templates/list" },
      async (request) => {
        const result = await client.listResourceTemplates(request.params);
        return result;
      }
    );
  }

  // Proxy: prompts
  if (remoteCapabilities?.prompts) {
    log("Registering prompts proxy handlers...");
    server.setRequestHandler(
      { method: "prompts/list" },
      async (request) => {
        const result = await client.listPrompts(request.params);
        return result;
      }
    );
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

  log("Connecting local stdio server...");
  try {
    await server.connect(localTransport);
  } catch (error) {
    log(`FAILED to start local server: ${error.message}\n${error.stack}`);
    process.exit(1);
  }
  log("Proxy ready — bridging stdio ↔ remote server.");
}

main().catch((error) => {
  log(`FATAL: ${error.message}\n${error.stack}`);
  process.exit(1);
});
