# VIS42 MCP Bundle — Agent Instructions

## Project Summary

`com.vis42.mcpb` packages a Node.js MCP proxy server as a distributable `.mcpb` bundle (MCP Bundle format). When installed into Claude Desktop, it bridges the local stdio MCP interface to `https://vis42.com/api/mcp` over StreamableHTTP/SSE.

### Runtime Flow
```
Claude Desktop (stdio) → server/index.js (local proxy) → https://vis42.com/api/mcp (remote)
```

The proxy uses a **lazy connection** — the local stdio server starts immediately so Claude Desktop's `initialize` handshake succeeds, and the remote HTTP connection is only established on the first actual MCP request.

## Repository Layout

```
com.vis42.mcpb/
├── manifest.json              # Extension manifest (machine-maintained for tools/prompts/version)
├── package.json               # Root package — only contains the pack script
├── server/
│   ├── index.js               # MCP proxy implementation (entry point)
│   ├── lib.js                 # Testable core logic: SSE fallback, withLogging, warnIfNoToken
│   ├── lib.test.js            # Unit tests (node --test)
│   └── package.json           # Server dependencies + version (kept in sync with manifest)
└── .github/workflows/
    ├── sync-tools.yml         # Primary: triggered by upstream repository_dispatch
    └── release.yml            # Secondary: manual version bump + release
```

## manifest.json Rules

The bundle uses [MCPB manifest spec v0.3](https://github.com/anthropics/mcpb/blob/main/MANIFEST.md). The `@anthropic-ai/mcpb pack` validator enforces a strict schema.

**What you can write to manifest.json:**
- `tools`: `[{ "name": "string", "description": "string" }]` — strip everything else
- `prompts`: `[{ "name": "string", "description": "string", "arguments": ["string"] }]` — arguments are name strings only
- `tools_generated` / `prompts_generated`: booleans

**What you must NOT write to manifest.json:**
- `resources` — not in the schema; pack fails with "Unrecognized key(s) in object: 'resources'"
- Tool input schemas, `readOnlyHint`, `destructiveHint`, or any other MCP runtime annotations
- Prompt argument objects — the manifest only stores argument name strings, not `{ name, description, required }` objects

Resources are handled silently by the proxy at runtime via `resources/list`, `resources/read`, and `resources/templates/list` handlers.

## CI Workflow Trigger

**Event type**: `sync_mcp_server` (repository_dispatch from the VIS42 app)

**Payload shape**:
```json
{
  "version": "1.2.3",
  "tag": "v1.2.3",
  "tools": [{ "name": "...", "description": "...", "readOnlyHint": true, ... }],
  "resources": [{ "name": "...", "title": "...", "description": "...", "uri": "...", "mimeType": "..." }],
  "prompts": [{ "name": "...", "title": "...", "description": "...", "arguments": [{ "name": "...", "description": "...", "required": true }] }]
}
```

**What the workflow writes to manifest.json**:
- `tools` → stripped to `{ name, description }`
- `prompts` → mapped to `{ name, description, arguments?: [string names] }`
- `resources` → not written (counted for log only)
- `version` → written as-is

## Tasks an Agent May Be Asked to Do

### Adding a new manifest field
Check [MANIFEST.md](https://github.com/anthropics/mcpb/blob/main/MANIFEST.md) first. If the field is in the spec, add it to `manifest.json`. If it involves CI-generated data, update the Node.js script in `sync-tools.yml`.

### Modifying the proxy (`server/index.js`)
- Never block the startup path — all remote I/O must happen lazily inside request handlers
- All logging must use `process.stderr` — stdout is the MCP protocol channel
- Testable logic lives in `server/lib.js`; `index.js` wires it to the real SDK classes
- Follow the existing pattern: `getRemoteClient()` → call the SDK method → return the result
- **SSE fallback**: the transport constructors never throw — errors surface at `client.connect()`. The try/catch for the SSE fallback must therefore wrap the `connect()` call, not the constructor

### Bumping the version manually
Update both `manifest.json` (`.version`) and `server/package.json` (`.version`) to the same semver string. They must always match.

### Updating the CI workflow
- The dispatch event type is `sync_mcp_server` (underscore, not hyphen)
- All payload data is read via `env:` variables — never interpolate `${{ github.event.client_payload.* }}` directly inside `run:` scripts
- Resources and prompts env vars must use `JSON.parse(process.env.VAR || 'null') || []` for null-safe parsing

### Testing the bundle
```bash
cd server && npm test                  # Run unit tests (node --test lib.test.js)
npx @anthropic-ai/mcpb pack .          # Validates manifest and produces vis42.mcpb
cd server && npm install --production  # Install runtime deps
```
Then install `vis42.mcpb` into Claude Desktop → Settings → Extensions.

## Constraints

- Node.js ≥ 18.0.0 required (declared in `compatibility.runtimes.node`)
- Supported platforms: `darwin`, `win32` (no Linux in current manifest)
- Single runtime dependency: `@modelcontextprotocol/sdk`
- Unit tests live in `server/lib.test.js`; run with `cd server && npm test`
