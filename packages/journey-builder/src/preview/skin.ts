/**
 * Preview design-system skins. The builder's preview panes and the
 * whole-journey walkthrough author their markup against GOV.UK classes;
 * a skin transforms those class strings for the selected design system.
 *
 * This mirrors the runtime adapters in teleportal-gds (govukDesignSystem /
 * nhsukDesignSystem): nhsuk-frontend is a govuk-frontend fork, so classes
 * map by prefix with a handful of exceptions. The selection is shared
 * between the drawer preview and the walkthrough tab via localStorage.
 */

import { createContext, useContext } from 'react';

export type PreviewSkinId = 'govuk' | 'nhsuk';

export const SKIN_OPTIONS: { id: PreviewSkinId; label: string }[] = [
  { id: 'govuk', label: 'GOV.UK' },
  { id: 'nhsuk', label: 'NHS.UK' },
];

const STORAGE_KEY = 'teleportal-builder-preview-skin';

export function loadSkin(): PreviewSkinId {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === 'nhsuk' ? 'nhsuk' : 'govuk';
  } catch {
    return 'govuk';
  }
}

export function saveSkin(id: PreviewSkinId): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* no-op */
  }
}

/** GOV.UK → NHS.UK class exceptions (everything else is a prefix swap). */
const NHS_EXCEPTIONS: Record<string, string> = {
  'govuk-visually-hidden': 'nhsuk-u-visually-hidden',
  'govuk-tag--light-blue': 'nhsuk-tag--white',
  // NHS panel is confirmation-styled by default; drop the modifier.
  'govuk-panel--confirmation': '',
  'govuk-template__body': 'nhsuk-template__body',
};

/** Pure transform of a space-separated GOV.UK class string. */
export function skinClass(skin: PreviewSkinId, govukClasses: string): string {
  if (skin === 'govuk') return govukClasses;
  return govukClasses
    .split(' ')
    .map((cls) => {
      if (!cls.startsWith('govuk-')) return cls;
      const mapped = NHS_EXCEPTIONS[cls];
      if (mapped !== undefined) return mapped;
      return `nhsuk-${cls.slice('govuk-'.length)}`;
    })
    .filter(Boolean)
    .join(' ');
}

export const SkinContext = createContext<PreviewSkinId>('govuk');

/** Returns a transformer bound to the active skin: s('govuk-body') → class string. */
export function useSkinClass(): (govukClasses: string) => string {
  const skin = useContext(SkinContext);
  return (govukClasses: string) => skinClass(skin, govukClasses);
}
