/**
 * Fetch a board's widgets from a Mural MCP server.
 *
 * Config (env):
 *   MURAL_MCP_URL   — the MCP server's streamable-HTTP endpoint
 *   MURAL_MCP_TOKEN — bearer token (from the Mural workspace's MCP setup)
 *
 * The tool surface differs between the official Mural MCP server and
 * community ones, so tool discovery is heuristic: we list tools and pick
 * the one that reads widgets/content for a mural. If nothing matches, we
 * fail with the tool list so the operator can map it explicitly via
 * MURAL_MCP_WIDGETS_TOOL.
 *
 * Requests can also bypass this entirely by POSTing an `extract` payload
 * (used by tests and by clients that already hold the board JSON).
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

import type { BoardExtract } from './types.js';

/** Pull a board id out of a Mural URL like .../m/<workspace>/<id>/... */
export function muralIdFromUrl(muralUrl: string): string {
  const m = /\/m\/([^/]+\/[0-9]+)/.exec(muralUrl);
  return m?.[1] ?? muralUrl;
}

export async function fetchBoardExtract(muralUrl: string): Promise<BoardExtract> {
  const serverUrl = process.env.MURAL_MCP_URL;
  if (!serverUrl) {
    throw new Error(
      'MURAL_MCP_URL is not configured. Either set it (plus MURAL_MCP_TOKEN) or POST an `extract` payload directly.',
    );
  }

  const token = process.env.MURAL_MCP_TOKEN;
  const transport = new StreamableHTTPClientTransport(new URL(serverUrl), {
    requestInit: token
      ? { headers: { Authorization: `Bearer ${token}` } }
      : undefined,
  });
  const client = new Client({ name: 'teleportal-mural-import', version: '0.0.1' });
  await client.connect(transport);

  try {
    const { tools } = await client.listTools();
    const preferred = process.env.MURAL_MCP_WIDGETS_TOOL;
    const tool =
      (preferred ? tools.find((t) => t.name === preferred) : undefined) ??
      tools.find((t) => /widget/i.test(t.name)) ??
      tools.find((t) => /(mural|board).*(content|read)|read.*(mural|board)/i.test(t.name));
    if (!tool) {
      throw new Error(
        `No widget-reading tool found on the Mural MCP server. Available tools: ${tools
          .map((t) => t.name)
          .join(', ')}. Set MURAL_MCP_WIDGETS_TOOL to the right one.`,
      );
    }

    const muralId = muralIdFromUrl(muralUrl);
    const result = await client.callTool({
      name: tool.name,
      arguments: { muralId, murals: muralId, id: muralId, url: muralUrl },
    });
    return result.structuredContent ?? result.content;
  } finally {
    await client.close();
  }
}
