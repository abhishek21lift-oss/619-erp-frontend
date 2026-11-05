# Global form helper-text removal — design

Date: 2026-11-05
Scope: `619-erp-frontend` only. UI copy and form-field composition. No API, schema, validation or submit behaviour.

## Intent

Every form field currently carries a second line of explanatory copy under the control: ranges,
units, format rules and restatements of the label. The goal is a minimal, Apple-like form surface
where the label, the placeholder, the validation message and (where genuinely needed) a safety
notice are the only text a user sees.

## Decisions taken with the user

- Units move into the label when the label alone is ambiguous (`Water (glasses)`, `Weight (kg)`).
- `1–10` scale directions stay, because a score entered against the wrong end is wrong data.
- The sweep stops at form controls. `EmptyState`, chart-empty, KPI and settings-row descriptions
  are not input helper text and stay.

## Removal rules

Delete a `description` when it is one of:

1. An allowed range or limit (`0–40`, `15–240`, `1 to 60`, `5 to 1800`, `Minutes, 5 to 1440`).
2. A unit restatement already carried by the label, suffix or placeholder (`hours per night`,
   `glasses per day`, `Per serving`).
3. A format rule the validator already reports (`Numbers only.`, `Letters, numbers, hyphens and
   underscores`, `At least N characters`).
4. A restatement of the label or of something visible on the same screen (`Your target body
   weight`, `The weight you want to lift`, `Shown to members on the package card`).
5. Encouragement or framing with no decision in it (`We'll tell you if you're on pace for it.`,
   `Written the way you say it`).

The same rules apply to hand-written hint paragraphs directly under a control
(`InterviewControls` occupation note, `PortfolioSection` media-kind hint).

## Retention rules

Keep, and say so in the report:

- Measurement technique and assessment-integrity notes in fitness testing (flexibility positioning,
  invalid-attempt conditions, reference degrees). These change the recorded number.
- Safety, consent, destructive-action and visibility warnings. `Internal — never shown to clients`
  stays because it is a data-exposure fact.
- Payment and money behaviour: `Exactly as it appears in your UPI app…`, `What this term is worth,
  before anything is paid`, `Leave blank if nothing is being collected today`, `GST is added
  automatically…`.
- Behavioural timing: `0 sends immediately. A week is the most this can be held for.`
- `Leave blank for unlimited / no expiry` where a blank has a distinct meaning.
- Caps Lock and 2FA recovery-code guidance in sign-in, where losing it can lock a user out.
- Character counters, error text, `required` markers, labels, placeholders and every ARIA relation.

## Approach

**Chosen: call-site removal, shared API unchanged.**

`FormField` keeps `description` for the retained notices. Every routine string is deleted where it
is written. `aria-describedby` therefore keeps pointing only at text that still exists; no dead ids,
no hidden strings, no CSS suppression.

Rejected:

- *Stop rendering `description` centrally.* One-line diff, but the strings stay in source, the
  retained notices disappear from the accessibility tree, and this is hiding, not removal.
- *Delete the `description` API entirely.* Forces every call site through the compiler, but pushes
  safety and measurement notices into ad-hoc paragraphs and duplicates the ARIA wiring `FormField`
  exists to own.

## Units and scale policy

- `Weight (kg)`, `Sleep (hours)`, `Water (glasses)`, `Workouts (this week)`, `Adherence (%)`.
- `Stress (10 = worst)`, `Energy (10 = best)`, `Soreness (10 = worst)`.
- Ranges are deleted even where they match `min`/`max`; the control still enforces them and the
  validator still explains a rejection.

## Spacing and accessibility

- The message row in `FormField`, `fields.tsx` and `SoftField` renders only when text exists, so
  deleting the string removes the gap. No CSS changes.
- `reserveMessageSpace` stays: the 16px row prevents layout shift when an error appears. It is
  functional space, not leftover space.
- Error-replaces-description wiring is untouched; retained notices keep `aria-describedby`.

## Files

Roughly 35 files. Main groups:

- `pt-os`: weekly-checkin, availability, cardio-calculator, clients/[id]/renew, session-balance,
  diet-plans, exercise-library (+ `ExerciseEditor`), leads.
- `member`: goals, account, subscription/checkout.
- `finance`: invoices, verify-payments.
- `engagement`: automation, notifications, OfferForm.
- `payments`: UpiSettingsPanel, UpiPayScreen.
- `platform`: CouponsTab, invoices, subscription-requests, ai-control.
- `profile`: PortfolioSection; `packages`: PackageForm; `pt-os/interview`: InterviewControls.
- landing/auth: Start Free hints, SignInScreen (retain 2FA + Caps Lock).

## Verification

- `npx tsc --noEmit`.
- Targeted Vitest: `forms-foundation`, `form-field`, `form-system-guardrails`,
  `form-platform-ratchet`, plus page tests for every touched page that has one.
- Targeted ESLint on changed files.
- Second grep for `description=` and `hint=` on form components; every survivor classified as
  retained and listed in the report.

## Risks

- The working tree already has 76 unrelated changes. All edits are line-targeted; nothing is reset.
- No seeded stack or trainer login, so no browser pass. Layout and spacing are source-verified.
- Some retained `description` values remain by design; the report lists them so the decision is
  visible rather than silent.
