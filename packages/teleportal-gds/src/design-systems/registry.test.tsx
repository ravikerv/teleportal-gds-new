/**
 * Proves the engine is design-system agnostic: renderField resolves field
 * components through the active adapter, so swapping the adapter swaps
 * every rendered component with no engine changes.
 */

import type { ReactElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { Input } from '../components/Input';
import { renderField, componentRegistry } from '../engine/componentRegistry';
import type { InputProps } from '../components/Input';
import type { FormField } from '../shared/types/schema.types';
import { govukDesignSystem } from './govuk';
import { configureDesignSystem, getDesignSystem, resetDesignSystem } from './registry';
import type { DesignSystem } from './types';

function AcmeInput(props: InputProps): ReactElement {
  return <input data-ds="acme" id={props.id} name={props.name} />;
}

const acmeDesignSystem: DesignSystem = {
  ...govukDesignSystem,
  name: 'acme',
  components: { ...govukDesignSystem.components, Input: AcmeInput },
  tokens: { ...govukDesignSystem.tokens, headingL: 'acme-heading-lg' },
};

const inputField: FormField = {
  id: 'firstName',
  type: 'input',
  label: 'First name',
};

afterEach(() => {
  resetDesignSystem();
});

describe('design-system registry', () => {
  it('defaults to the GOV.UK design system', () => {
    expect(getDesignSystem().name).toBe('govuk');
    const el = renderField(inputField, { values: {}, errors: {} });
    expect(el.type).toBe(Input);
  });

  it('renderField resolves components through a configured adapter', () => {
    configureDesignSystem(acmeDesignSystem);
    const el = renderField(inputField, { values: {}, errors: {} });
    expect(el.type).toBe(AcmeInput);
    // Non-overridden contracts fall through to the adapter's other slots.
    expect(componentRegistry().select).toBe(govukDesignSystem.components.Select);
  });

  it('resetDesignSystem restores the GOV.UK default', () => {
    configureDesignSystem(acmeDesignSystem);
    resetDesignSystem();
    const el = renderField(inputField, { values: {}, errors: {} });
    expect(el.type).toBe(Input);
    expect(getDesignSystem().tokens.headingL).toBe('govuk-heading-l');
  });
});
