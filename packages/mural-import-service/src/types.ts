/**
 * Wire types for the Mural import pipeline.
 *
 * The LLM provider is deliberately abstracted: `LlmProvider` is the only
 * seam that talks to a model. The default implementation uses the Claude
 * API; any provider that can take (system prompt, board extract) and
 * return the GeneratedBundle JSON can replace it — e.g. an
 * OpenAI-compatible endpoint such as GitHub Models — without touching the
 * prompt, the Mural fetch, the validator, or the HTTP surface.
 */

/** Whatever the Mural MCP server returned for the board — passed to the
 *  model verbatim. We normalise nothing: the prompt teaches the model the
 *  conventions, not a rigid widget schema. */
export type BoardExtract = unknown;

/** One generated schema file within the bundle. */
export type GeneratedFile = {
  /** Repo-relative path in the builder's Export layout, e.g.
   *  `applications/my-app/your-details/form-schemas.json`. */
  path: string;
  /** The file's JSON content, serialised as a string. */
  json: string;
};

export type GeneratedBundle = {
  applicationId: string;
  files: GeneratedFile[];
  /** Every assumption/ambiguity the model resolved — surfaced to the BA. */
  assumptions: string[];
};

export type ValidationIssue = {
  severity: 'error' | 'warning';
  message: string;
};

export type ImportResult = {
  applicationId: string;
  /** path → parsed JSON content. */
  files: Record<string, unknown>;
  assumptions: string[];
  issues: ValidationIssue[];
};

export interface LlmProvider {
  readonly name: string;
  /** False for providers that ignore the board (the mock). Defaults true. */
  readonly requiresBoardExtract?: boolean;
  /** Generate a schema bundle from the raw board extract. */
  generateBundle(extract: BoardExtract): Promise<GeneratedBundle>;
  /** One repair round: fix the reported issues in a previous bundle. */
  repairBundle(
    previous: GeneratedBundle,
    issues: ValidationIssue[],
  ): Promise<GeneratedBundle>;
}
