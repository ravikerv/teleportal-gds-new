'use client';

/**
 * Mounts GOVUKFrontend's progressive-enhancement JS once after hydration.
 * Required for client-side behaviours that the static Server-Component
 * markup can't deliver on its own — chiefly the conditional-reveal toggle
 * on Radio / Checkbox options, plus error-summary auto-focus,
 * accordion, character-count and the GovUK button double-click guard.
 *
 * This is the only `'use client'` boundary in the library. Per the
 * architecture rules, it qualifies as a "leaf interactive widget"
 * (pure DOM enhancement, no state — state still lives on the server
 * and round-trips via Server Actions).
 *
 * Mount once in the root layout; it renders nothing.
 */

import { useEffect } from 'react';

export function GovukInit(): null {
  useEffect(() => {
    let cancelled = false;
    void import('govuk-frontend')
      .then((mod) => {
        if (cancelled) return;
        const initAll = (mod as { initAll?: () => void }).initAll;
        if (typeof initAll === 'function') initAll();
      })
      .catch(() => {
        // govuk-frontend not installed — leave components as static markup.
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
