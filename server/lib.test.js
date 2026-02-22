/**
 * Tests for server/lib.js — the extracted, testable proxy logic.
 * Run with: node --test lib.test.js
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { warnIfNoToken, withLogging, buildGetRemoteClient } from './lib.js';

// ── warnIfNoToken ─────────────────────────────────────────────────────────────

describe('warnIfNoToken', () => {
  test('logs a WARNING message when token is absent', () => {
    const logs = [];
    warnIfNoToken(undefined, (msg) => logs.push(msg));
    assert.strictEqual(logs.length, 1);
    assert.match(logs[0], /WARNING.*VIS42_API_TOKEN/i);
  });

  test('logs a WARNING message when token is empty string', () => {
    const logs = [];
    warnIfNoToken('', (msg) => logs.push(msg));
    assert.strictEqual(logs.length, 1);
    assert.match(logs[0], /WARNING/i);
  });

  test('logs nothing when token is present', () => {
    const logs = [];
    warnIfNoToken('secret-token', (msg) => logs.push(msg));
    assert.strictEqual(logs.length, 0);
  });
});

// ── withLogging ───────────────────────────────────────────────────────────────

describe('withLogging', () => {
  test('returns the result on success', async () => {
    const handler = withLogging('tools/list', async () => ({ tools: [1, 2] }), () => {});
    const result = await handler({});
    assert.deepEqual(result, { tools: [1, 2] });
  });

  test('re-throws the error on handler failure', async () => {
    const handler = withLogging('op/test', async () => { throw new Error('boom'); }, () => {});
    await assert.rejects(() => handler({}), /boom/);
  });

  test('logs "Proxying <operation>" at start', async () => {
    const logs = [];
    const handler = withLogging('resources/list', async () => ({}), (m) => logs.push(m));
    await handler({});
    assert.ok(
      logs.some(l => l.includes('Proxying') && l.includes('resources/list')),
      `expected start log, got: ${JSON.stringify(logs)}`
    );
  });

  test('logs operation name and duration in ms on success', async () => {
    const logs = [];
    const handler = withLogging('resources/read', async () => ({}), (m) => logs.push(m));
    await handler({});
    const successLog = logs.find(l => l.includes('resources/read') && /\d+ms/.test(l));
    assert.ok(successLog, `expected success log with operation and duration, got: ${JSON.stringify(logs)}`);
  });

  test('logs "FAILED", operation name, and duration on error', async () => {
    const logs = [];
    const handler = withLogging('prompts/get', async () => { throw new Error('err'); }, (m) => logs.push(m));
    try { await handler({}); } catch {}
    const failLog = logs.find(l => l.includes('FAILED') && l.includes('prompts/get') && /\d+ms/.test(l));
    assert.ok(failLog, `expected failure log with FAILED/operation/duration, got: ${JSON.stringify(logs)}`);
  });

  test('passes request argument through to the handler fn', async () => {
    let received;
    const handler = withLogging('op', async (req) => { received = req; return {}; }, () => {});
    await handler({ params: { id: 42 } });
    assert.deepEqual(received, { params: { id: 42 } });
  });
});

// ── buildGetRemoteClient ──────────────────────────────────────────────────────

/** Minimal mock deps — override individual fields as needed */
function makeDeps(overrides = {}) {
  const MockStreamableHTTP = class { constructor() {} };
  const MockSSE = class { constructor() {} };
  const MockClient = class {
    constructor() { this.onerror = null; this.onclose = null; }
    async connect() {}
  };
  return {
    Client: MockClient,
    StreamableHTTPClientTransport: MockStreamableHTTP,
    SSEClientTransport: MockSSE,
    serverUrl: 'http://test.example',
    apiToken: 'test-token',
    log: () => {},
    connectTimeoutMs: 5000,
    clientVersion: '1.2.3',
    ...overrides,
  };
}

describe('buildGetRemoteClient', () => {
  test('returns a client after successful StreamableHTTP connect', async () => {
    const getClient = buildGetRemoteClient(makeDeps());
    const client = await getClient();
    assert.ok(client, 'expected a client object to be returned');
  });

  test('passes clientVersion to Client constructor', async () => {
    let receivedOpts;
    const MockClient = class {
      constructor(opts) { receivedOpts = opts; this.onerror = null; this.onclose = null; }
      async connect() {}
    };
    const getClient = buildGetRemoteClient(makeDeps({ Client: MockClient, clientVersion: '9.8.7' }));
    await getClient();
    assert.strictEqual(receivedOpts.version, '9.8.7');
  });

  test('sets Authorization header when apiToken is present', async () => {
    const capturedHeaders = [];
    const MockStreamableHTTP = class {
      constructor(_url, opts) { capturedHeaders.push(opts?.requestInit?.headers); }
    };
    const getClient = buildGetRemoteClient(makeDeps({
      StreamableHTTPClientTransport: MockStreamableHTTP,
      apiToken: 'my-secret',
    }));
    await getClient();
    assert.ok(
      capturedHeaders.some(h => h?.Authorization === 'Bearer my-secret'),
      `expected Authorization header, got: ${JSON.stringify(capturedHeaders)}`
    );
  });

  test('omits Authorization header when apiToken is absent', async () => {
    const capturedHeaders = [];
    const MockStreamableHTTP = class {
      constructor(_url, opts) { capturedHeaders.push(opts?.requestInit?.headers); }
    };
    const getClient = buildGetRemoteClient(makeDeps({
      StreamableHTTPClientTransport: MockStreamableHTTP,
      apiToken: null,
    }));
    await getClient();
    assert.ok(
      capturedHeaders.every(h => !h?.Authorization),
      `expected no Authorization header, got: ${JSON.stringify(capturedHeaders)}`
    );
  });

  test('caches connection — connect() is called only once on repeated calls', async () => {
    let connectCount = 0;
    const MockClient = class {
      constructor() { this.onerror = null; this.onclose = null; }
      async connect() { connectCount++; }
    };
    const getClient = buildGetRemoteClient(makeDeps({ Client: MockClient }));
    await getClient();
    await getClient();
    assert.strictEqual(connectCount, 1, 'expected connect() to be called only once');
  });

  test('falls back to SSE when StreamableHTTP connect() throws', async () => {
    const connected = [];
    const MockStreamableHTTP = class { constructor() {} };
    const MockSSE = class { constructor() {} };
    const MockClient = class {
      constructor() { this.onerror = null; this.onclose = null; }
      async connect(transport) {
        if (transport instanceof MockStreamableHTTP) throw new Error('StreamableHTTP not supported');
        connected.push('sse');
      }
    };
    const logs = [];
    const getClient = buildGetRemoteClient(makeDeps({
      Client: MockClient,
      StreamableHTTPClientTransport: MockStreamableHTTP,
      SSEClientTransport: MockSSE,
      log: (m) => logs.push(m),
    }));
    await getClient();
    assert.ok(connected.includes('sse'), 'expected SSE connect to be called');
    assert.ok(
      logs.some(l => /SSE|fallback/i.test(l)),
      `expected SSE/fallback in logs, got: ${JSON.stringify(logs)}`
    );
  });

  test('rejects with a timeout error when connect() never resolves', async () => {
    const MockClient = class {
      constructor() { this.onerror = null; this.onclose = null; }
      connect() { return new Promise(() => {}); } // never resolves
    };
    const getClient = buildGetRemoteClient(makeDeps({ Client: MockClient, connectTimeoutMs: 50 }));
    await assert.rejects(
      () => getClient(),
      (err) => {
        assert.match(err.message, /timed?\s*out/i);
        return true;
      }
    );
  });

  test('resets cached connection when onclose fires', async () => {
    const clients = [];
    const MockClient = class {
      constructor() { this.onerror = null; this.onclose = null; clients.push(this); }
      async connect() {}
    };
    const getClient = buildGetRemoteClient(makeDeps({ Client: MockClient }));
    const c1 = await getClient();
    clients[clients.length - 1].onclose?.(); // simulate remote disconnect
    const c2 = await getClient();
    assert.notEqual(c1, c2, 'expected a new client after close');
  });

  test('allows retry after a failed connection attempt', async () => {
    let attempt = 0;
    const MockClient = class {
      constructor() { this.onerror = null; this.onclose = null; }
      async connect() {
        attempt++;
        if (attempt === 1) throw new Error('first attempt fails');
        // second attempt (SSE) succeeds
      }
    };
    const getClient = buildGetRemoteClient(makeDeps({ Client: MockClient }));
    // First call: StreamableHTTP fails → SSE succeeds
    await getClient();
    // Second call: cached client returned (no extra connect)
    await getClient();
    assert.ok(attempt <= 2, `connect() called ${attempt} times, expected ≤ 2`);
  });
});
