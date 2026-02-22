# VIS42 MCP Bundle — Claude Code Instructions

## What This Repo Is

This is **`com.vis42.mcpb`** — a distributable MCP Bundle (`.mcpb` file) that packages a Node.js proxy server for Claude Desktop. It bridges Claude Desktop's local stdio MCP interface to the remote VIS42 API at `https://vis42.com/api/mcp`.

A `.mcpb` file is a ZIP archive (spec: [MANIFEST.md](https://github.com/anthropics/mcpb/blob/main/MANIFEST.md)) containing:
- `manifest.json` — extension metadata and capability declarations
- `server/` — the Node.js MCP proxy implementation
- `node_modules/` — bundled dependencies (produced by CI)

## Architecture: Lazy-Connect Proxy

`server/index.js` implements a **lazy connection** pattern:
1. A local stdio `Server` starts **immediately** — Claude Desktop's `initialize` handshake is answered without delay
2. The remote connection to `https://vis42.com/api/mcp` is deferred until the **first real request** (`tools/list`, `tools/call`, etc.)
3. All seven MCP operations are transparently proxied: `tools/list`, `tools/call`, `resources/list`, `resources/read`, `resources/templates/list`, `prompts/list`, `prompts/get`
4. Transport negotiation: tries `StreamableHTTPClientTransport` first; if `client.connect()` **throws** (not the constructor — constructors don't throw), falls back to `SSEClientTransport`

**Do not change the proxy architecture.** The lazy connection is critical — a blocking connect on startup causes Claude Desktop to timeout.

## manifest.json Constraints (v0.3)

The `@anthropic-ai/mcpb pack` tool validates `manifest.json` strictly. Know what is and isn't allowed:

| Field | Allowed | Notes |
|---|---|---|
| `tools` | ✅ | Array of `{ name, description }` only — no input schemas, no runtime hints |
| `prompts` | ✅ | Array of `{ name, description, arguments?: string[] }` — arguments are names only |
| `resources` | ❌ | **Not a valid manifest field** — pack fails with "Unrecognized key" |
| `tools_generated` | ✅ | Boolean — set true if server adds tools dynamically |
| `prompts_generated` | ✅ | Boolean — set true if server adds prompts dynamically |

**Critical**: Never add a `resources` key to `manifest.json`. The proxy handles `resources/list` and `resources/read` transparently at runtime — no static declaration needed.

**Tools stripping**: The upstream payload includes runtime hints (`readOnlyHint`, `destructiveHint`, etc.). These must be stripped when writing to manifest — only `name` and `description` are written.

**Prompts arguments**: The upstream payload sends argument objects `{ name, description, required }`. The manifest spec only stores argument names as strings. Map accordingly: `p.arguments.map(a => a.name)`.

## Key Files

| File | Purpose |
|---|---|
| `manifest.json` | Machine-maintained by CI — do not hand-edit tool/prompt/version fields |
| `server/index.js` | Runtime proxy — runs on end-user machines inside Claude Desktop |
| `server/lib.js` | Testable core logic (SSE fallback, withLogging, warnIfNoToken) — imported by index.js |
| `server/lib.test.js` | Unit tests — run with `npm test` inside `server/` |
| `server/package.json` | Version kept in sync with `manifest.json` by CI |
| `package.json` | Root — only has the `pack` script |
| `.github/workflows/sync-tools.yml` | Primary CI — triggers on `sync_mcp_server` dispatch, updates manifest, builds, releases |
| `.github/workflows/release.yml` | Manual release fallback — version bump + pack only |

## CI Workflow: `sync_mcp_server`

The upstream VIS42 app dispatches `repository_dispatch` with `event_type: sync_mcp_server` after each release. The payload is:
```json
{
  "version": "1.2.3",
  "tag": "v1.2.3",
  "tools": [{ "name", "description", "readOnlyHint", ... }],
  "resources": [{ "name", "title", "description", "uri", "mimeType" }],
  "prompts": [{ "name", "title", "description", "arguments": [{ "name", "description", "required" }] }]
}
```

The workflow:
1. Strips tools to `{ name, description }` → writes to `manifest.tools`
2. Maps prompts to `{ name, description, arguments?: string[] }` → writes to `manifest.prompts`
3. Skips `resources` entirely (not valid in manifest; proxy handles at runtime)
4. Bumps `manifest.json` and `server/package.json` versions
5. Regenerates the `| Tool | Description |` table in `README.md`
6. Commits and pushes those three files
7. Runs `npm install --production` in `server/`
8. Runs `npx @anthropic-ai/mcpb pack .` to produce `vis42.mcpb`
9. Creates a GitHub Release with the `.mcpb` as the downloadable artifact

## Development Commands

```bash
# Run unit tests
cd server && npm test

# Validate and pack the bundle locally
npx @anthropic-ai/mcpb pack .

# Install server dependencies (mirrors what CI does)
cd server && npm install --production
```

To test end-to-end: open the resulting `vis42.mcpb` in Claude Desktop → Settings → Extensions.

## Common Pitfalls

- **Do not add `resources` to `manifest.json`** — the schema rejects it; the proxy handles resources at runtime
- **Do not block on startup in `server/index.js`** — the lazy connect is intentional
- **Version is in two places**: `manifest.json` and `server/package.json` — CI keeps them in sync; never bump one without the other
- **`manifest.json` is machine-generated** for `tools`, `prompts`, and `version` — edits to those fields will be overwritten on next CI run
- **All logging in `server/index.js` must go to `stderr`** — stdout is the MCP stdio channel; mixing them corrupts the protocol
- **SSE fallback triggers on `client.connect()` failure, not constructor failure** — `new StreamableHTTPClientTransport()` never throws; the error surfaces when `connect()` is awaited. The fallback try/catch must wrap `client.connect()`, not the constructor call
