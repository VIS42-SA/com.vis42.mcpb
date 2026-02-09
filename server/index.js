/**
 * VIS42 MCP Proxy — stdio-to-StreamableHTTP bridge.
 *
 * Reads JSON-RPC messages from stdin (Claude Desktop),
 * forwards them to the remote VIS42 MCP server over Streamable HTTP,
 * and relays responses back to stdout.
 */

import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const SERVER_URL = "https://vis42.com/api/mcp";
const API_TOKEN = process.env.VIS42_API_TOKEN;

let transport;
let buffer = "";

/**
 * Create the remote transport, trying Streamable HTTP first, falling back to SSE.
 */
async function createTransport() {
  const url = new URL(SERVER_URL);
  const headers = {};

  if (API_TOKEN) {
    headers["Authorization"] = `Bearer ${API_TOKEN}`;
  }

  try {
    const httpTransport = new StreamableHTTPClientTransport(url, {
      requestInit: { headers },
    });

    httpTransport.onmessage = (message) => {
      writeMessage(message);
    };

    httpTransport.onerror = (error) => {
      process.stderr.write(`Remote transport error: ${error.message}\n`);
    };

    httpTransport.onclose = () => {
      process.stderr.write("Remote transport closed.\n");
      process.exit(0);
    };

    await httpTransport.start();
    return httpTransport;
  } catch (error) {
    process.stderr.write(
      `Streamable HTTP failed, trying SSE fallback: ${error.message}\n`
    );

    const sseTransport = new SSEClientTransport(url, {
      requestInit: { headers },
    });

    sseTransport.onmessage = (message) => {
      writeMessage(message);
    };

    sseTransport.onerror = (error) => {
      process.stderr.write(`Remote SSE transport error: ${error.message}\n`);
    };

    sseTransport.onclose = () => {
      process.stderr.write("Remote SSE transport closed.\n");
      process.exit(0);
    };

    await sseTransport.start();
    return sseTransport;
  }
}

/**
 * Write a JSON-RPC message to stdout following the MCP stdio framing protocol.
 */
function writeMessage(message) {
  const json = JSON.stringify(message);
  const header = `Content-Length: ${Buffer.byteLength(json)}\r\n\r\n`;
  process.stdout.write(header + json);
}

/**
 * Parse incoming stdin data using Content-Length framing.
 */
function processBuffer() {
  while (true) {
    const headerEnd = buffer.indexOf("\r\n\r\n");
    if (headerEnd === -1) break;

    const header = buffer.substring(0, headerEnd);
    const match = header.match(/Content-Length:\s*(\d+)/i);
    if (!match) {
      process.stderr.write(`Invalid header: ${header}\n`);
      buffer = buffer.substring(headerEnd + 4);
      continue;
    }

    const contentLength = parseInt(match[1], 10);
    const bodyStart = headerEnd + 4;

    if (buffer.length < bodyStart + contentLength) {
      break; // Wait for more data
    }

    const body = buffer.substring(bodyStart, bodyStart + contentLength);
    buffer = buffer.substring(bodyStart + contentLength);

    try {
      const message = JSON.parse(body);
      transport.send(message).catch((error) => {
        process.stderr.write(`Failed to send message: ${error.message}\n`);
      });
    } catch (error) {
      process.stderr.write(`Failed to parse JSON-RPC message: ${error.message}\n`);
    }
  }
}

async function main() {
  transport = await createTransport();

  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => {
    buffer += chunk;
    processBuffer();
  });

  process.stdin.on("end", async () => {
    if (transport) {
      await transport.close();
    }
    process.exit(0);
  });
}

main().catch((error) => {
  process.stderr.write(`Fatal error: ${error.message}\n`);
  process.exit(1);
});
