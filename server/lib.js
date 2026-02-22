/**
 * Testable core logic extracted from the VIS42 MCP proxy.
 * All functions accept their dependencies as arguments for unit-testability.
 */

/**
 * Log a WARNING to stderr if the API token is absent.
 * @param {string|undefined} apiToken
 * @param {(msg: string) => void} log
 */
export function warnIfNoToken(apiToken, log) {
  if (!apiToken) {
    log('WARNING: VIS42_API_TOKEN is not set — requests will be rejected by the remote server');
  }
}

/**
 * Wrap an async MCP request handler with:
 *   - start/success/failure logs including the operation name and duration
 *   - try/catch that re-throws so the local server still signals an error to the client
 *
 * @param {string} operation  human-readable operation name, e.g. "resources/list"
 * @param {(request: any) => Promise<any>} fn  the handler body
 * @param {(msg: string) => void} log
 * @returns {(request: any) => Promise<any>}
 */
export function withLogging(operation, fn, log) {
  return async (request) => {
    const start = Date.now();
    log(`Proxying ${operation}...`);
    try {
      const result = await fn(request);
      log(`${operation} completed in ${Date.now() - start}ms`);
      return result;
    } catch (error) {
      log(`${operation} FAILED in ${Date.now() - start}ms: ${error.message}`);
      throw error;
    }
  };
}

/**
 * Build a lazy getRemoteClient() function with dependency injection.
 *
 * Behaviour:
 *  - First call: attempts StreamableHTTP; on connect() error falls back to SSE.
 *  - The entire attempt races against `connectTimeoutMs`.
 *  - On success the client is cached; subsequent calls return the cached instance.
 *  - When the remote closes, the cache is cleared so the next call reconnects.
 *  - On failure, the cache is cleared so the caller can retry.
 *
 * @param {{
 *   Client: any,
 *   StreamableHTTPClientTransport: any,
 *   SSEClientTransport: any,
 *   serverUrl: string,
 *   apiToken: string|null,
 *   log: (msg: string) => void,
 *   connectTimeoutMs?: number,
 *   clientVersion?: string,
 * }} deps
 * @returns {() => Promise<any>}
 */
export function buildGetRemoteClient({
  Client,
  StreamableHTTPClientTransport,
  SSEClientTransport,
  serverUrl,
  apiToken,
  log,
  connectTimeoutMs = 30_000,
  clientVersion = '1.0.0',
}) {
  let remoteClient = null;
  let connectPromise = null;

  function makeClient() {
    const client = new Client({ name: 'vis42-proxy', version: clientVersion });
    client.onerror = (error) =>
      log(`CLIENT ERROR: ${error.message}\n${error.stack || ''}`);
    client.onclose = () => {
      log('Remote client connection closed.');
      remoteClient = null;
      connectPromise = null;
    };
    return client;
  }

  async function connect() {
    const url = new URL(serverUrl);
    const headers = {};
    if (apiToken) headers['Authorization'] = `Bearer ${apiToken}`;

    log('Lazy-connecting to remote server...');

    let timeoutId;
    const timeout = new Promise((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error(`Connection timed out after ${connectTimeoutMs}ms`)),
        connectTimeoutMs
      );
    });
    const cleanup = () => clearTimeout(timeoutId);

    try {
      // Attempt 1 — StreamableHTTP
      let client;
      try {
        const transport = new StreamableHTTPClientTransport(url, { requestInit: { headers } });
        client = makeClient();
        await Promise.race([client.connect(transport), timeout]);
        log('Using StreamableHTTP transport.');
      } catch (err) {
        if (/timed?\s*out/i.test(err.message)) {
          cleanup();
          throw err;
        }
        // connect() threw a real error — fall back to SSE
        log(`StreamableHTTP connect failed (${err.message}), falling back to SSE...`);
        const sseTransport = new SSEClientTransport(url, { requestInit: { headers } });
        client = makeClient();
        await Promise.race([client.connect(sseTransport), timeout]);
        log('Using SSE transport.');
      }

      cleanup();
      log('Connected to remote server.');
      return client;
    } catch (err) {
      cleanup();
      throw err;
    }
  }

  return async function getRemoteClient() {
    if (remoteClient) return remoteClient;
    if (connectPromise) return connectPromise;

    connectPromise = connect()
      .then((client) => {
        remoteClient = client;
        return client;
      })
      .catch((err) => {
        connectPromise = null;
        throw err;
      });

    return connectPromise;
  };
}
