/**
 * "Import from Mural" — calls the AI companion service
 * (packages/mural-import-service), which fetches the board via the Mural
 * MCP server, generates schema JSON with an LLM, and validates it. The
 * BA reviews the returned assumptions/issues here, then Apply loads the
 * project onto the canvas (undo restores the previous project).
 *
 * Service URL: VITE_MURAL_IMPORT_SERVICE (default http://localhost:8787).
 */

import { useState } from 'react';

import { importProjectFromEntries } from '../persistence/import';
import { useBuilderStore } from '../store';

const SERVICE_URL: string =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ?.VITE_MURAL_IMPORT_SERVICE ?? 'http://localhost:8787';

type ServiceResult = {
  applicationId: string;
  files: Record<string, unknown>;
  assumptions: string[];
  issues: { severity: 'error' | 'warning'; message: string }[];
  provider: string;
};

export function MuralImportDialog({ onClose }: { onClose: () => void }) {
  const loadProject = useBuilderStore((s) => s.loadProject);
  const [muralUrl, setMuralUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ServiceResult | null>(null);

  const runImport = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${SERVICE_URL}/import`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ muralUrl }),
      });
      const data = (await res.json()) as ServiceResult & { error?: string };
      if (!res.ok || data.error) {
        throw new Error(data.error ?? `Service responded ${res.status}`);
      }
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const apply = () => {
    if (!result) return;
    const entries = Object.entries(result.files).map(([path, data]) => ({
      path,
      text: JSON.stringify(data),
    }));
    loadProject(importProjectFromEntries(entries));
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40"
      role="dialog"
      aria-modal="true"
      aria-label="Import from Mural"
    >
      <div className="w-[520px] max-w-[92vw] rounded-lg bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">Import from Mural</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-0.5 text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {!result ? (
          <>
            <p className="mb-3 text-sm text-slate-600">
              AI reads your Mural board and drafts the journey schemas. You review the
              result on the canvas before exporting — and one undo restores the current
              project.
            </p>
            <label
              htmlFor="mural-url"
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Mural board link
            </label>
            <input
              id="mural-url"
              type="url"
              value={muralUrl}
              onChange={(e) => setMuralUrl(e.target.value)}
              placeholder="https://app.mural.co/t/workspace/m/…"
              className="mb-3 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
            {error ? (
              <p className="mb-3 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void runImport()}
                disabled={loading || muralUrl.trim() === ''}
                className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-default disabled:bg-slate-300"
              >
                {loading ? 'Generating…' : 'Generate journey'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mb-2 text-sm text-slate-700">
              Generated <strong>{result.applicationId}</strong> (
              {Object.keys(result.files).length} schema file
              {Object.keys(result.files).length === 1 ? '' : 's'}) via{' '}
              <code className="text-xs">{result.provider}</code>.
            </p>
            {result.issues.length > 0 ? (
              <div className="mb-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-red-600">
                  Unresolved issues
                </h3>
                <ul className="mt-1 max-h-24 list-disc overflow-y-auto pl-5 text-xs text-red-700">
                  {result.issues.map((issue, i) => (
                    <li key={i}>
                      [{issue.severity}] {issue.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                AI assumptions — review these
              </h3>
              {result.assumptions.length > 0 ? (
                <ul className="mt-1 max-h-36 list-disc overflow-y-auto pl-5 text-xs text-slate-600">
                  {result.assumptions.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-xs text-slate-500">
                  None reported — the board was unambiguous.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setResult(null)}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={apply}
                className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
              >
                Apply to canvas
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
