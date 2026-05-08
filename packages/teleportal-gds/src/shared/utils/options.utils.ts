/**
 * Options provider registry. Schemas can declare a select field whose
 * options are computed server-side (e.g. address lookup keyed by an
 * earlier postcode answer) by referencing a `providerId`. Consumer apps
 * register the implementations once at boot, typically alongside the
 * storage adapter.
 *
 * Registry is shared across bundle chunks via a Symbol on globalThis,
 * mirroring the storage-adapter pattern, so split chunks emitted by tsup
 * see the same map.
 */

import type { FieldOption } from '../types/schema.types';

export type OptionsProvider = (
  param: string,
) => FieldOption[] | Promise<FieldOption[]>;

const REGISTRY_KEY = Symbol.for('teleportal-gds.optionsProviders');
type GlobalWithRegistry = {
  [REGISTRY_KEY]?: Map<string, OptionsProvider>;
};
const g = globalThis as unknown as GlobalWithRegistry;
if (!g[REGISTRY_KEY]) g[REGISTRY_KEY] = new Map();
const registry: Map<string, OptionsProvider> = g[REGISTRY_KEY];

export function registerOptionsProvider(
  id: string,
  provider: OptionsProvider,
): void {
  registry.set(id, provider);
}

export function getOptionsProvider(id: string): OptionsProvider | undefined {
  return registry.get(id);
}

/**
 * Look up `providerId` in the registry and call it with `param`. Throws
 * if the provider isn't registered — fail loud so missing wiring shows
 * up at first render rather than as silently empty dropdowns.
 */
export async function resolveOptions(
  providerId: string,
  param: string,
): Promise<FieldOption[]> {
  const provider = registry.get(providerId);
  if (!provider) {
    throw new Error(
      `Unknown options provider: '${providerId}'. Register it via registerOptionsProvider().`,
    );
  }
  return await Promise.resolve(provider(param));
}
