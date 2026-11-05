# Global input placeholder removal — design

Date: 2026-11-05
Scope: `619-erp-frontend` only. UI copy and form composition. No API, schema, validation, option list or submit behaviour.

## Intent

An input's visible cue is its label. Nothing inside the control repeats the label, shows a sample
value, states a format rule, offers a search cue or describes a default. The result is the same
minimal, Apple-like surface the helper-text removal already established, applied to the control
itself.

## Decisions taken with the user

- Search boxes, chat composers and AI prompt inputs are in scope. They lose their placeholder text;
  their icon, button, `aria-label` and visually-hidden label remain.
- Selects keep an empty first option so an unset field still looks unset. The option carries no
  text.
- No redesign: dimensions, radius, spacing, typography, colours and responsive layout are untouched.

## Removal policy

Delete:

1. Every `placeholder` attribute on a native `input`, `textarea` or `select`.
2. Every `placeholder` passed to `TextField`, `NumberField`, `TextAreaField`, `FloatInput`,
   `SoftInput` and `SearchField`.
3. Every `placeholderOption` string and every instructional first `<option>` (`Select client…`,
   `Select gender`, `Choose a lift`).
4. Data-driven placeholders: interview questions, trainer-stated fields, builder field configs,
   billing field configs, profile section fields.
5. The closed-state `Select ${label}` fallback in `SearchableSelect`, and `SearchableSelect`'s
   in-panel `Search...` cue.
6. The `placeholder` prop from the shared component APIs, so the compiler finds every remaining
   call site rather than relying on grep.

## Retention policy

Keep, and list in the report:

- `—` as the neutral empty marker in dense numeric logging grids. It is not an example, an
  instruction or a sample value; it marks a cell with no reading.
- `kg` where it is the only unit cue on an unlabelled training-max input. Unit, not example.
- `Loading…` where an input is disabled while its panel loads. Status, not instruction.
- `{{name}}` automation tokens. Template syntax, not input placeholder text.
- CSS `placeholder:` utilities, comments, labels, `aria-label`, descriptions, errors and every
  `aria-describedby` relation.

## Approach

**Chosen: remove at the call sites, and narrow the shared APIs so the defect cannot return.**

- `BoundFieldProps`, `FloatInput`, `SoftField` and `SearchField` stop accepting `placeholder`.
- `SelectField` stops accepting `placeholderOption` and always renders `<option value="" disabled />`
  before its real options. The empty value, required marker and validation are unchanged.
- `SearchableSelect` renders an empty closed state and keeps its search input labelled by
  `aria-label`.
- `AiCoachPanel`'s labelled select keeps its `aria-label` but renders an empty first option.
- Every page and feature component loses its placeholder attributes and the dead strings/props
  they leave behind.

Rejected:

- *CSS-hide placeholders centrally.* The strings stay in source, the audit never reaches zero, and
  a search box would still be announced by a stale string in some browsers.
- *Leave the component APIs and only delete attributes.* Callers keep passing dead props and the
  next form reintroduces the pattern.

## Tests and verification

- Update `form-field.test.tsx`: `SearchField` no longer defaults its placeholder to the label.
- Add one source guardrail: no `placeholder=` or `placeholderOption=` in `src`, with the retained
  glyph and unit values allowlisted. This is the definition-of-done made mechanical.
- Keep the existing `placeholderOnly` ratchet; removal can only lower it.
- `npx tsc --noEmit`.
- Targeted lint on changed files.
- Full `npm test` once, because the shared field primitives and 130 files are genuinely
  cross-cutting; this is the stated exception in `RULES.md` §8, not a default.
- `npm run build` if the test run leaves time; otherwise state it as unrun.
- Second grep for `placeholder=`, `placeholderOption`, `placeholder:` and `placeholder: '`;
  every survivor classified against the retention policy.

## Risks

- The working tree has many unrelated uncommitted changes. All edits are line-targeted; nothing is
  reset.
- Search boxes lose their only visible cue by design. The magnifier icon and accessible name stay.
- A field whose label was carried only by its placeholder would become anonymous. The existing
  accessible-name audit catches that; any such field is fixed by giving it a real label, not by
  restoring the placeholder.
- No seeded stack or trainer login is assumed. If browser verification is unavailable, layout and
  behaviour are source- and test-verified and the limitation is stated.
