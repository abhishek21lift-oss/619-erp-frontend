# The form system

Audit and specification. Written before any component, because the interesting
findings changed what the component needed to be.

---

## 1. What is already there

### The one shared abstraction

`src/components/ui/FloatInput.tsx` is the only form-field component exported
from the design system. It is a **floating-label** control: the caption starts
inside the box and lifts to a 10px line above the value on focus or when the
field is non-empty. It handles input and textarea, prefix/suffix, `required`,
`error`, `disabled`, and auto-grow.

It is not a general field abstraction. It renders its own control, so it cannot
wrap a select, a date picker, a file input or a segmented control — which is
why sixteen other wrappers exist.

### Everything else

Seventeen components across the app take a `label` prop and render a control,
none of them shared:

| Component | Control | a11y wiring it has |
|---|---|---|
| `start-free/page.tsx` `TextField` | input | label, htmlFor, error, `aria-describedby`, `aria-invalid`, hint |
| `settings/page.tsx` `FloatInput` | input | label, htmlFor, useId, required |
| `settings/profile/page.tsx` `FloatInput` | input | label, htmlFor, useId, required |
| `finance/payment-settings` `Field` | children | label, htmlFor, hint, invalid |
| `trainers/[id]/edit` `FInput` / `FSelect` | input / select | required only |
| `trainers/add` `Input` / `Select` | input / select | required only |
| `insights/traffic` `DateField` | input | label (wrapping) |
| `insights/sessions` `HeroDate` | input | label (wrapping) |
| `settings/profile` `SelectRow` | select | **none** — caption is a sibling `<p>` |
| `exercise-library` `ToggleRow` | input | label, hint |
| `profile/AboutSection` `LongText` | textarea | hint |
| `analytics/LandmarkEditor` `Num` | input | none |
| `builder/ExerciseCard` `InlineField` | input | label |
| `ExerciseEditor` `ListField` | input | none |
| `PortfolioSection` `FilePick` | input | none |
| `ProfessionalSection` `DayRow` | input | none |
| `trainers/add` `DragDropUpload` | input | none |

Plus six child-wrapping label components — `Field` in `platform/_shared/ui.tsx`,
`ai/diet-generator`, `ai/workout-generator` and `fitness/AiCoachPanel`, and
`FloatLabel` in `trainers/add` and `trainers/[id]/edit`.

**`FloatInput` is implemented three times**: once in `components/ui`, and again
locally in `settings/page.tsx` and `settings/profile/page.tsx`. The two local
copies are 49 lines each and are not the same as the shared one.

### The best existing implementation

`start-free/page.tsx`'s `TextField` is already almost the specification: label
with `htmlFor`, `aria-invalid`, `aria-describedby` pointing at either the error
or the hint, `role="alert"` on the error, `inputMode`, `autoComplete`, and a
comment explaining that `h-12` is used rather than padding because
`html{font-size:14px}` makes padding-derived heights land under 44px.

It exists in exactly one file and is used by exactly one form.

### Validation patterns

There is no shared validation. Each form does its own, in one of three shapes:

- an `error` string in local state, rendered under the field (`start-free`,
  `FloatInput`);
- a boolean `invalid` flipping a border colour with the message in the hint slot
  (`payment-settings`);
- inline `onFocus`/`onBlur` handlers writing `style.borderColor` directly
  (`pt-os/clients/[id]/payments`).

No form uses a validation library. Nothing here changes that — the system takes
`error` as a string and renders it; deciding *when* a field is invalid stays
where it is.

### Accessibility patterns

After the previous phase, all 389 controls have an accessible name. The routes
are: 74 `aria-label`, 156 wrapped in a `<label>`, 54 `htmlFor`/`id`, and **105
whose only name is their placeholder**.

`aria-describedby` appears in **one** component. `aria-invalid` in **one**.
`role="alert"` on an error message, in **one**. All three are `start-free`'s
`TextField`.

### Styling tokens

Everything the system needs already exists and none of it needs adding:

```
radius   --radius-xs 6 · --radius-sm 10 · --radius 14 · --radius-md 16
         --radius-lg 20 · --radius-xl 24 · --radius-full
border   --border · --border-2 · --border-3 · --border-focus
surface  --bg-base · --bg-subtle · --bg-card · --bg-elevated · --bg-hover
text     --text-primary · --text-secondary · --text-muted · --text-disabled
state    --danger · --danger-text · --danger-bg · --danger-border
         --success · --success-text · --brand · --brand-soft
focus    :focus-visible in globals.css — 2px --brand outline + 4px --brand-soft
```

Type sizes come from the half-step ladder pinned in `scale.test.ts`
(9.5 · 10.5 · 11.5 · 12.5 · 13.5 plus whole steps). No new sizes.

---

## 2. The 105 placeholder-only fields are two different problems

This is the finding that shaped the design. Reading the actual placeholder text
of all 105 splits them cleanly:

### 45 are search and command inputs

`"Search clients…"`, `"Search invoices…"`, `"Filter by message…"`,
`"Search members, jump to pages, run actions"`.

A magnifier icon next to a box that says *Search clients…* is not an
unlabelled field — it is the correct, conventional presentation of a search
control, and stacking a visible **Search** caption above every one of them
would be a visual regression across 45 screens for no gain.

What these actually need is a name that survives typing, for a screen reader
only. The brief's own §9 says not to force every control through the same
visual structure, and lists Search as a special type.

**Treatment:** a visually-hidden `<label>`, properly associated, plus
`type="search"`. The visible design does not change at all; the name stops
disappearing when the user types.

### 60 are data-entry fields

`"Weight (kg)"`, `"Total sessions"`, `"e.g. Fat Loss Starter"`,
`"Rule name (e.g., Welcome Message)"`, `"TXN / UTR"`, `"Protein (g)"`.

These are the real problem, and they are the ones the brief describes: the
field's identity vanishes the moment it has a value, so a half-filled form
becomes a column of anonymous boxes and nobody re-reading it can tell what
the third number was.

**Treatment:** a persistent visible label. Where the placeholder carries
genuinely secondary information — a format, an example, a unit — it stays as a
placeholder. Where the placeholder *was* the label, it goes.

Note that five of the 60 are not fields at all but the `placeholder` prop of a
wrapper (`SearchInput`, `ExerciseEditor`'s `ListField`, `AboutSection`'s
`LongText`, `invoices`' field map). Fixing the wrapper fixes every call site.

---

## 3. What the system has to be

Given the above, the thing that is missing is **not another input component**.
There are already eighteen. What is missing is the layer underneath them: the
label/description/error/id wiring that seventeen of the eighteen get wrong or
skip.

So the foundation is a **layout and accessibility primitive that wraps any
control**, not a control itself:

```
FormField                     owns the id, the wiring and the vertical rhythm
├── <label htmlFor>           always present, always persistent
├── control                   any element — provided by the caller
├── description               optional, id'd, referenced
├── error                     optional, id'd, referenced, role="alert"
└── required indicator        marked aria-hidden; `required` carries the meaning
```

The id, `aria-describedby`, `aria-invalid`, `required` and `disabled` reach the
control through **React context**, not through the caller repeating them. That
is deliberate:

- a call site cannot forget `aria-describedby`, so the description cannot go
  unannounced;
- a call site cannot give a control a second name, so the "duplicate accessible
  name" failure is impossible by construction rather than by review;
- `aria-describedby` has to point at an id that exists, and generating both ends
  in one place is the only way to keep that true.

Three thin controls consume the context — `TextInput`, `TextArea`,
`SelectInput` — plus `SearchField`, which is a `FormField` with its label
visually hidden and `type="search"`.

### What it does not do

- It does not replace `FloatInput`. A floating label lifts, so the name does not
  disappear and the hard rule in §3 of the brief is already satisfied. Rewriting
  the auth and hero forms that use it would be a visual redesign of exactly the
  screens a new user sees first. Both patterns stay; the doc below says which to
  use where.
- It does not own validation. It renders an `error` string when given one.
- It does not wrap checkbox, radio, switch or segmented controls in the same
  vertical label-above-control shape. Those read as *control then caption*, and
  forcing them into the text-field shape is the mistake §9 warns about.

### When to use which

| Situation | Use |
|---|---|
| Any labelled field on a dense admin form | `FormField` |
| Search, filter, command palette | `SearchField` |
| Auth, onboarding, hero forms already using it | `FloatInput` |
| Checkbox / switch / radio | native control + its own `<label>` |

---

## 4. States

Rendered by the field, styled from existing tokens only:

| State | Treatment |
|---|---|
| default | `--bg-subtle`, `1px --border-2`, `--radius-sm` |
| hover | `--border-3` |
| focus | the global `:focus-visible` ring. The field sets no `outline` of its own |
| filled | no separate treatment — the label is always visible, so there is nothing to signal |
| disabled | 55% opacity, `not-allowed`, `--bg-base` |
| read-only | default border, `--bg-base`, no hover |
| error | `--danger-border`, message in `--danger-text`, `aria-invalid` |
| loading | control disabled, a spinner in the suffix slot |
| success | optional tick in the suffix slot, `--success-text` |

The error slot is **reserved**, not conditionally inserted, on fields that
declare they can error — otherwise the message appearing pushes every field
below it down, which is the layout jump §7 rules out.

No transitions beyond the 150ms border/background fade the app already uses, and
that one is dropped under `prefers-reduced-motion`.

---

## 5. Guardrails

The existing `accessible-name.ts` audit already resolves label-by-wrapping and
label-by-id across a component boundary, so it recognises `FormField`-labelled
controls with no change. Added on top:

- placeholder-only count ratchets **downward only**;
- no new field-wrapper component may render a `<label>` next to a control
  without associating them;
- `FormField`'s own contract — id generated, description and error referenced,
  `aria-invalid` tracking the error — is asserted directly rather than inferred
  from call sites.

---

## 6. Migration order

Prove it on one representative form per area before touching the rest:
Clients, Training, Revenue, Attendance, Settings. Then the remaining fields in
batches, search inputs separately from data-entry ones, because they are
different changes with different review criteria.
