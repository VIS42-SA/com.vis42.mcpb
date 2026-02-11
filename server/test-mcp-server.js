/**
 * Minimal test to reproduce the MCP server initialization timeout
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const log = (msg) => process.stderr.write(`[test] ${msg}\n`);

async function main() {
  log("Creating server...");
  
  const server = new Server(
    { name: "test-server", version: "1.0.0" },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    }
  );

  server.onerror = (error) => log(`SERVER ERROR: ${error.message}`);
  server.onclose = () => log("Server closed");

  // Set up a simple tool handler
  server.setRequestHandler({ method: "tools/list" }, async () => {
    log("tools/list called");
    return { tools: [] };
  });

  log("Connecting to stdio transport...");
  const transport = new StdioServerTransport();
  
  await server.connect(transport);
  
  log("Server connected and ready!");
}

main().catch((error) => {
  log(`FATAL: ${error.message}\n${error.stack}`);
  process.exit(1);
});
