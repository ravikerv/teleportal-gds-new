---
sidebar_position: 4
title: Designing journeys in Mural
---

# Designing journeys in Mural (AI import conventions)

You can design a journey on a Mural board and have AI convert it into
Journey Builder schemas automatically (via the `/mural-import` skill in
Claude Code with the [Mural MCP server](https://www.mural.co/ai/mcp)
connected). The AI copes with messy boards, but following these
conventions makes the result reliable enough to import on the first try.

**The flow:** design in Mural → ask AI to import → review the generated
journey visually in the Journey Builder (Journey map, Validation drawer,
Preview) → Export. The board is *design intent*; the reviewed export is
the source of truth. Nothing goes live without your review.

## Board structure

| You draw | It becomes |
|---|---|
| A **frame/area** titled "Your details" | A journey (`your-details`) |
| A **card/sticky** inside the frame | A page in that journey |
| An **arrow** between two cards | The `next` navigation |
| An arrow **labelled** `hasParking = yes` | A conditional branch (`nextWhen`) |
| An arrow **into another frame** | Cross-journey navigation |
| A frame tagged **`loop`** | A looping journey (add-another entries), parented to the journey linking into it |
| One card with the **application name + task sections** | The master task list |

## Page cards

The **first line** of a card is the page title. Mark the page kind with a
prefix tag (preferred — colors survive less reliably than text):

- `[form]` — a question page (default when no tag)
- `[hub]` — a "manage" page at the journey root
- `[task-list]` — a sub-task list inside the journey
- `[summary]` — the check-your-answers page

If you prefer colors, match the builder's canvas: blue = form,
green = hub, amber = task list, violet = summary.

## Field grammar (inside a `[form]` card)

One bullet line per field:

```
[form] What are your details?
- First name — input, required
- Email address — input:email, required
- Date of birth — date
- Do you need parking? — radio (yes / no), required
- Anything else? — textarea
- Region — select (North / South / East / West)
```

- `Label — type` with flags after a comma. Types: `input` (or
  `input:email`, `input:tel`, `input:number`), `radio`, `checkbox`,
  `select`, `date`, `textarea`.
- Options in parentheses separated by `/`.
- `required` marks required fields; add plain-language rules
  ("max 50 chars", "UK postcode format") and the AI translates them into
  validation.

## Branching

Give each page **one unlabelled arrow** (the default next). Add labelled
arrows for branches, using `field = value`:

```
[Do you need parking?] --- hasParking = yes ---> [Parking details]
[Do you need parking?] ------------------------> [Summary]
```

The AI derives a camelCase field id from the question if you don't name
one; naming the field in the label removes the guesswork.

## What the AI will and won't do

- It **reports every assumption** it made (unclear arrows, guessed field
  types) — read that list.
- It validates references (broken `next` targets, missing fields on the
  summary) before handing you the bundle.
- It will **not** invent pages that aren't on the board, and the import
  never overwrites anything irreversibly — one undo in the builder
  restores your previous project.

## Importing

Ask, in Claude Code with the Mural MCP connected:

> /mural-import https://app.mural.co/t/yourworkspace/m/yourboard

Then in the Journey Builder: **Import zip** → review the **Journey map** →
fix anything the **Validation** drawer flags → walk it in **Preview** →
**Export zip**.
