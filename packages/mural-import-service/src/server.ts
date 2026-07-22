/**
 * Mural import companion service.
 *
 *   POST /import { muralUrl?: string, extract?: unknown }
 *     → { applicationId, files: {path: json}, assumptions, issues, provider }
 *   GET /health
 *
 * Pipeline: fetch board (Mural MCP, or the posted extract) → LLM provider
 * generates the schema bundle → referential validation → one repair round
 * if errors remain → respond. The browser-side Journey Builder turns the
 * files map into a Project via its existing import machinery, where the
 * BA reviews it before exporting anything.
 *
 * Env: PORT (8787), LLM_PROVIDER (anthropic|mock), ANTHROPIC_API_KEY (or
 * an `ant auth login` profile), MURAL_MCP_URL/TOKEN, ALLOWED_ORIGIN.
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

import { fetchBoardExtract } from './mural.js';
import { AnthropicProvider } from './providers/anthropic.js';
import { MockProvider } from './providers/mock.js';
import type { ImportResult, LlmProvider } from './types.js';
import { validateBundle } from './validate.js';

export function createProvider(): LlmProvider {
  return process.env.LLM_PROVIDER === 'mock'
    ? new MockProvider()
    : new AnthropicProvider();
}

export async function handleImport(
  body: { muralUrl?: string; extract?: unknown },
  provider: LlmProvider,
): Promise<ImportResult> {
  const extract =
    body.extract !== undefined
      ? body.extract
      : provider.requiresBoardExtract === false
        ? {}
        : await fetchBoardExtract(assertMuralUrl(body.muralUrl));

  let bundle = await provider.generateBundle(extract);
  let issues = validateBundle(bundle);

  if (issues.some((issue) => issue.severity === 'error')) {
    bundle = await provider.repairBundle(bundle, issues);
    issues = validateBundle(bundle);
  }

  const files: Record<string, unknown> = {};
  for (const file of bundle.files) {
    files[file.path] = JSON.parse(file.json);
  }
  return {
    applicationId: bundle.applicationId,
    files,
    assumptions: bundle.assumptions,
    issues,
  };
}

function assertMuralUrl(muralUrl: string | undefined): string {
  if (!muralUrl) {
    throw new Error('Provide either `muralUrl` or `extract` in the request body.');
  }
  return muralUrl;
}

// ---------------------------------------------------------------------------
// HTTP plumbing
// ---------------------------------------------------------------------------

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? '*';

function cors(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: Buffer) => {
      data += chunk.toString();
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

export function startServer(port: number): ReturnType<typeof createServer> {
  const provider = createProvider();

  const server = createServer(async (req, res) => {
    cors(res);
    if (req.method === 'OPTIONS') {
      res.writeHead(204).end();
      return;
    }
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, provider: provider.name }));
      return;
    }
    if (req.method === 'POST' && req.url === '/import') {
      try {
        const body = JSON.parse((await readBody(req)) || '{}') as {
          muralUrl?: string;
          extract?: unknown;
        };
        const result = await handleImport(body, provider);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ...result, provider: provider.name }));
      } catch (error) {
        res.writeHead(500, { 'content-type': 'application/json' });
        res.end(
          JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      }
      return;
    }
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
  });

  server.listen(port, () => {
    console.log(
      `mural-import-service listening on :${port} (provider: ${provider.name})`,
    );
  });
  return server;
}

// Only start listening when run directly (not when imported by tests).
if (process.argv[1] && process.argv[1].endsWith('server.ts')) {
  startServer(Number(process.env.PORT ?? 8787));
}
