/**
 * Minimal ambient declaration for `govuk-frontend`'s top-level export.
 * The package ships ESM at `dist/govuk/all.mjs` without TypeScript types.
 * We only call `initAll()` from this library, so a one-function shape
 * is enough.
 */
declare module 'govuk-frontend' {
  export function initAll(): void;
}
