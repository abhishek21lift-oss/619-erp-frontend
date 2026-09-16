# The form platform: where it actually landed

`FORM-SYSTEM.md` is the specification, written before any component existed.
This is the report against it. Every number below is produced by
`node scripts/form-audit/index.mjs` and pinned by
`src/__tests__/form-platform-ratchet.test.ts`, which fails if any of them moves
the wrong way.

## FORM PLATFORM SCORE: 7/10

Not 10, and the gap is not modesty. Two of the five things a 10 would need are
solidly in place — the defect class is gone and the platform underneath is
real. The other three are coverage (40%), untested journeys, and a measurement
that was itself incomplete until this report was written.

**What a 10 would require, and where each stands:**

| | Required | Actual |
|---|---|---|
| The defect class is gone | `Number('')` cannot become a business value anywhere | **Met.** 0 risky coercions, 0 unjustified submit-time coercions, held as an invariant |
| The platform is real | One field contract, one schema layer, one error mapper, one submit machine | **Met.** 322 design-system controls, 20 schemas, 94% error coverage |
| Every form uses it | Schema coverage ~100% | **Not met. 40%** — 25 of 63 forms |
| The journeys are tested | End-to-end coverage of the forms that take money and record facts | **Not met.** No E2E form journeys exist |
| The measurement is complete | The audit asks every question that matters | **Not met until this report.** It was blind to `type="number"` — see below |

A platform two fifths adopted is a good platform, not a finished migration.
Calling that 10/10 would mean the number was measuring the library rather than
the product, which is the metric-gaming §23 forbids.

The last row is the one worth dwelling on. Writing this report meant checking
a claim I was about to make — "every numeric field uses `inputMode`" — and it
was false by 93. A score computed from an audit that does not ask a question
cannot be trusted on that question, which is the strongest argument in this
document for why the number is 7 and not higher.

---

## The numbers

```
Controls (all kinds)               248
  of which native business         181
  of which UNJUSTIFIED             142
Design-system controls             322
Forms (a <form> or a submit)        63

Risky value coercions                0   ← invariant
Submit-time state coercions          7   of which UNJUSTIFIED 0
type="number" controls              93   ← a wheel over a focused field
Upload sites                         9   uncanonical 0   ← invariant

Contract coverage, over the 63 forms:
  submit    76%      error    94%
  reset     71%      schema   40%

By risk:   P0 unjustified 0   ·   P1 55   ·   P2 87
```

### Movement across the migration

| | Start | Now |
|---|---|---|
| Unjustified native controls | 321 | 142 |
| P0 unjustified | 49 | **0** |
| P1 unjustified | 167 | 55 |
| Risky coercions | — | **0** |
| Uploads not checking magic bytes | 7 | **0** |
| Error-contract coverage | 52% | 94% |
| Schema coverage | 5% | 40% |

### What the invariants mean

Four figures are zero and are asserted as zero rather than as a ceiling, so
loosening one means deleting an assertion and explaining why in a diff:

- **Risky coercions.** No clearable control's value reaches `Number()` without
  a validator in front of it. This is the defect the whole platform exists to
  remove: `Number('')` is `0`, and a `0` written where a person left a box
  empty is indistinguishable from a `0` they meant.
- **P0 unjustified controls.** Nothing on a money, payment or billing screen
  is a raw control without a stated, checkable reason.
- **Uncanonical uploads.** Every upload site reads the file's leading bytes.
  `accept` and `File.type` are both derived from the extension and prove
  nothing.
- **Unjustified submit-time coercions.** The seven that remain each have a
  named reason in `scripts/form-audit/justifications.mjs`.

---

## What was found, not just what was built

The migration's value is mostly in defects it surfaced. These were all live in
`main`, and each is fixed with a test that fails without the fix.

**Data that was quietly wrong**

- A coach's bio, philosophy, training style and every achievement detail were
  run through `cleanText`, which collapses *all* whitespace including
  newlines. Multi-paragraph text written in a four-row textarea was stored as
  one block. Nothing the user could type would avoid it — the destruction was
  server-side, after the browser had shown them what they meant.
- The campaigns page held `{ Active: '#10b981', … }` and filtered with
  `c.status === 'Active'`, against a column whose vocabulary is lower case.
  The Active KPI read 0 however many were running, and every campaign's status
  pill fell back to the grey that means Draft. `textTransform: capitalize`
  made the *text* read "Active" while the colour said draft.
- `leave_requests.leave_type` has a CHECK allowing six values. The route
  validated seven and the dropdown offered seven. Picking "Personal" — the
  natural choice for the example the Reason box itself suggests — passed the
  browser, passed the route, and violated the constraint on INSERT: a 500 with
  no field marked.
- The leave form's day count parsed bare dates with `new Date()`, which reads
  them as UTC midnight. Any range crossing a daylight-saving change came out a
  day short.

**Things sent to a person**

- `domain.ts` held a `TEMPLATE_VARIABLES` list — `client_name`, `studio_name`,
  `due_amount` and five more — that nothing in the product substitutes. Only
  its own tests imported it. Wired into the automation editor as it stood it
  would have rejected `{{name}}`, the one placeholder every trigger provides,
  and accepted `{{client_name}}`, which reaches a member's WhatsApp as literal
  braces. The real vocabulary is per trigger event and is now read from
  `automation.triggers.js`.
- The AI generators posted whatever was typed. A weight of `750` or an age of
  `9999` went into the prompt verbatim and the model wrote a training
  programme, or a day's calories, around it. Bounded on both sides now,
  against one shared table.

**Things that took the user's work away**

- A failed profile save replaced the Save and Discard buttons with the error
  message, and nothing else cleared it. The first server rejection left the
  page permanently unsavable with several screens of edits still in memory —
  recoverable only by a reload that discarded them.
- A profile row with a degree and a year but no institution was silently
  dropped by the server. The coach's typing vanished on save with no message.

---

## What is left, and why

**38 forms with no schema** — the honest headline. They break down as:

- **P2, 87 unjustified controls across ~26 files.** Internal tooling, module
  workspaces, filter rails. `ModuleWorkspace.tsx` alone holds 12. These write
  configuration rather than records about people or money, which is why they
  are last, not because they are done.
- **P1, 55 unjustified controls.** The largest are
  `engagement/notifications` (4), `pt-os/schedule-session` (4) and
  `trainers/[id]/edit` (4). Nothing above 4 remains anywhere.

**No E2E form journeys (§21).** `e2e/` covers tenancy isolation, revenue
separation and visual polish. There is no test that fills the Record Payment
form and asserts a payment exists, and that is the single highest-value
missing test in this repo. The schema tests prove a value is rejected; they do
not prove the screen that collects it reaches the server.

**93 `type="number"` controls, 60 of them in the assessment steps.** This is
the figure the audit could not see until writing this report forced the check,
and it is the most useful thing in it.

Every other measure asks "is the control on the design system" and "is there a
schema behind it". For the assessment steps — goal, mobility, lifestyle,
fitness-testing — both answers are **yes**. They render through `FloatInput`,
a design-system component with a real label, and `FloatInput` passes `type`
straight through. So sixty-odd numeric inputs recording a person's body
measurements, feeding `calc1RM` and a Novice/Intermediate/Advanced label about
them, were counted as platform controls and never questioned.

A scroll wheel over a focused `type="number"` silently changes the value. That
is the same class of defect as `Number('')` becoming `0`: a number nobody
typed, indistinguishable afterwards from one they did. `NumberField` uses
`inputMode` for exactly this reason and says so in its own comment — the
comment was there while 93 controls did the opposite.

The audit now counts it and the ratchet pins it at 93, so the next numeric
field written cannot be one more. Migrating the assessment cluster is the
highest-value remaining work in this repo after the E2E gap.

**§24 performance and §25 mobile-device testing** were not attempted in this
arc. Controls carry a 44px minimum, which is the mobile work that was in scope
for a form platform — but no measurement was taken on a device.

**The `reset` contract sits at 71%.** Lower than submit or error because it
only matters on forms that stay mounted across entities, and most do not.
The ones that do — the rule editor, the attendance modal, the profile
sections — use `resetTo`, which also clears the previous entity's errors.

---

## How to read these numbers next time

The audit deliberately does not count "raw inputs". A filter, a table search
box and a per-row bulk-select checkbox are all native controls and all
correct; §1 says so. What it counts is **unjustified** native *business*
controls, and every exception is a named entry in
`scripts/form-audit/justifications.mjs` with a reason that can be checked
against the file. The audit reports a justification as **stale** when the file
no longer has the controls it excuses — which is how the diet generator's
entry was caught, along with its reasoning, which had argued that values
"going to the model rather than into a record" were not a payload worth
validating.

The ratchet's ceilings only fall and its floors only rise, with two
exceptions that are documented where they sit: `audit.total` and
`audit.wrapped` in `label-association.test.ts` count *raw* controls and
therefore fall as the migration proceeds. Pinning them tightly would make the
migration fail a test it is improving. The invariant with teeth on that file
is `audit.nameless` being empty, and it has no threshold at all.
