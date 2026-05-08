/**
 * Pattern registry. Add new patterns here so the palette picks them up
 * via dragstart payload `pattern:{id}`.
 */

import { addressLookupPattern } from './addressLookup';
import { loopingCollectionPattern } from './loopingCollection';
import type { Pattern } from './types';
import { yesNoBranchPattern } from './yesNoBranch';

export const PATTERNS: Pattern[] = [
  yesNoBranchPattern,
  addressLookupPattern,
  loopingCollectionPattern,
];

export const PATTERNS_BY_ID: Record<string, Pattern> = Object.fromEntries(
  PATTERNS.map((p) => [p.id, p]),
);

export type { Pattern, PatternResult } from './types';
