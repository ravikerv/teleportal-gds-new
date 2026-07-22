/**
 * Active design-system registry. A module-level singleton by design:
 * state lives on the server (Server Components, no Context API), so the
 * adapter is configured once per process at app startup — e.g. in the
 * consuming app's root layout module or an instrumentation file:
 *
 *   import { configureDesignSystem } from 'teleportal-gds';
 *   import { acmeDesignSystem } from '@acme/teleportal-ds';
 *   configureDesignSystem(acmeDesignSystem);
 *
 * Every engine renderer resolves components/tokens through
 * `getDesignSystem()` at render time, so configuration order relative to
 * imports does not matter.
 */

import { govukDesignSystem } from './govuk';
import type { DesignSystem } from './types';

let active: DesignSystem = govukDesignSystem;

/** Replace the active design system (call once at app startup). */
export function configureDesignSystem(designSystem: DesignSystem): void {
  active = designSystem;
}

/** The design system the engine is currently rendering with. */
export function getDesignSystem(): DesignSystem {
  return active;
}

/** Restore the GOV.UK default (used by tests). */
export function resetDesignSystem(): void {
  active = govukDesignSystem;
}
