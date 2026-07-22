---
sidebar_position: 3
title: React Components Library
---

# React Components Library

`packages/teleportal-gds/src/components/` is the wrapper component library — thin, stable React components over design-system markup. Raw GOV.UK (or NHS.UK) HTML never leaks out of this folder: the **Props contracts are the library's public API**, and everything above them (engine, consumers) is markup-agnostic.

## The components

| Component | Kind | Used by | Notes |
| --- | --- | --- | --- |
| `Input` | Field | `type: "input"` | Text/email/number/tel/url/password; hint + error + autocomplete support. |
| `Select` | Field | `type: "select"` | Static or provider-resolved options, placeholder support. |
| `Radio` | Field | `type: "radio"` | Option hints and conditionally revealed child fields. |
| `Checkbox` | Field | `type: "checkbox"` | Multi-select; array values; conditional reveals. |
| `DatePicker` | Field | `type: "datepicker"` | GOV.UK day/month/year three-input pattern. |
| `TextArea` | Field | `type: "textarea"` | Configurable rows. |
| `Button` | Page | All renderers | Variants: primary, secondary, warning, inverse. |
| `BackLink` | Page | Pages with `back` | Token-resolved href. |
| `ErrorSummary` | Page | Form pages | The top-of-page error box, linking to each field. |
| `SummaryList` | Page | Summary + hub pages | Rows with values and Change/Remove actions. |
| `TaskList` | Page | Task-list pages | Status tags, `cannot-start` unlinked rendering, sections. |
| `Panel` | Page | Confirmation page | The green confirmation panel. |
| `Header` | Chrome | Consumer layouts | Service header. |
| `Footer` | Chrome | Consumer layouts | Standard footer. |
| `CookieBanner` | Chrome | Consumer layouts | Cookie consent banner. |

Each component folder holds the implementation, its Props type, and a **Storybook story** — run `npm run storybook -w teleportal-gds` to browse them.

## Design rules

1. **Wrappers only.** A component renders the design system's documented markup for one pattern and nothing else.
2. **Props are the contract.** The Props types are what design-system adapters implement — changing a Props shape is a breaking API change; changing internal markup is not.
3. **Server-component compatible.** No hooks, no client state. Anything interactive is native HTML behaviour (forms, details/summary) or a progressive-enhancement leaf.
4. **Accessibility is inherited, not reinvented** — by rendering the design system's exact documented markup, the components keep its tested a11y behaviour (fieldset/legend structure, error association via `aria-describedby`, etc.).

## Design-system adapters

The components double as the **GOV.UK implementation** of the design-system contract in `src/design-systems/`:

```
design-systems/
├── types.ts        # DesignSystem = { name, components (15 slots), tokens (7 classes) }
├── govuk.ts        # default adapter — wires the wrappers above
├── nhsuk/          # complete NHS.UK adapter (the worked example)
└── registry.ts     # configureDesignSystem / getDesignSystem / resetDesignSystem
```

- The registry is a **module singleton** — server-safe, no React Context — so Server Components and Server Actions resolve the same adapter.
- The engine asks `getDesignSystem()` at render time and destructures `{ components, tokens }`; it never imports a concrete component directly.
- **NHS.UK as proof:** `nhsuk-frontend` is historically a GOV.UK fork, so the adapter is mostly a class-prefix swap with a small exceptions map — a realistic template for "client X has their own design system". The Journey Builder's preview exposes a live GOV.UK ↔ NHS.UK switcher on top of this exact mechanism.

### Writing a new adapter

1. Implement the 15 component contracts with your design system's markup (start by copying `nhsuk/`).
2. Fill the 7-token class map.
3. `configureDesignSystem(myDesignSystem)` once at app startup.

Everything else — schemas, engine, storage, navigation, existing journeys — works unchanged.
