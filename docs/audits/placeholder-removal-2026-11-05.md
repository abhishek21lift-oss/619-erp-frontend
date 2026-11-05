# Input placeholder removal — audit report

Date: 2026-11-05
Scope: `619-erp-frontend` only
Design: `docs/superpowers/specs/2026-11-05-global-input-placeholder-removal-design.md`
Plan: `docs/superpowers/plans/2026-11-05-global-input-placeholder-removal.md`

## What was done

Every instructional, example, default-value and search placeholder was removed from form controls across the frontend: text, number, email, tel, password, textarea, search, date/time, select, custom pickers, modals, drawers, chat composers and AI prompt inputs.

Removal was staged. The shared controls stopped emitting placeholder text first, so no shared input could display one even if a caller still passed the prop. Call sites were then swept area by area, with the now-dead props and data keys removed last. A source guardrail now fails the test suite if an instructional placeholder returns.

Nothing else changed: labels, section headings, required markers, validation/error/success messages, helper text outside controls, ARIA attributes, names, IDs, types, values, option values, defaults, search behaviour, date pickers, submission logic, empty states and button text are untouched. Selects still render a blank empty option and required validation still fires. No backend, API, schema or business-logic change.

## Counts

Baseline from this branch's base, `origin/main` (`dba16329`), scanning `src` without tests:

| Item | Found | Removed | Retained |
|---|---:|---:|---:|
| `placeholder=` attributes | 293 | 284 | 9 |
| `placeholderOption=` usages | 6 | 6 | 0 |
| Data-driven `placeholder` keys/values | 24 | 24 | 0 |

The 130 files that carried a placeholder attribute were inspected; every one was either swept or is listed under retained lines below. Current source scan (`rg` over `src`, excluding tests) finds 9 attributes in 5 files, all intentional.

## Retained lines

| File | Line | Why |
|---|---|---|
| `src/app/(chrome)/pt-os/diet-plans/page.tsx` | 508 | `placeholder="—"` in a dense macro numeric grid; a neutral empty marker, not instruction. |
| `src/app/(chrome)/pt-os/clients/[id]/workout-log/[sessionId]/page.tsx` | 1075, 1098, 1167, 1180 | `placeholder="—"` in the set/RPE/RIR numeric grid. |
| `src/app/(chrome)/pt-os/workout-generator/page.tsx` | 391 | `placeholder="kg"` is the only unit cue on an otherwise unlabelled training-max input. |
| `src/components/pt-os/builder/ExerciseCard.tsx` | 669, 906 | `placeholder="—"` in the builder's numeric set grid. |
| `src/components/pt-os/analytics/LandmarkEditor.tsx` | 242 | `placeholder="—"` in the landmark measurement grid. |

CSS `placeholder:` utility classes are untouched (they style the empty state if a future control ever has one, and removing them would change no visible text). Comments that merely mention the word `placeholder` were left or rewritten where they had become stale.

## Shared components modified

- `src/components/ui/form/fields.tsx` — `BoundFieldProps.placeholder` removed; text/textarea/number fields no longer forward it; `SelectField.placeholderOption` removed and a blank `<option value="" disabled />` is rendered only when no supplied option already has an empty value.
- `src/components/ui/form/controls.tsx` — `SearchFieldProps.placeholder` removed; `SearchField` no longer accepts or renders one.
- `src/components/ui/FloatInput.tsx` — `placeholder` removed from props and from the input/textarea.
- `src/components/landing/SoftField.tsx` — `SoftTextField` no longer accepts `placeholder`.
- `src/components/pt-os/SearchableSelect.tsx` — `placeholder` removed; the closed field falls back to the selected label or freeform value, never to instruction text; the in-panel filter placeholder was removed.
- `src/components/chat/ChatComposer.tsx` and `ChatThread.tsx` — `placeholder` removed from both APIs and the pass-through.
- `src/components/search/GlobalSearch.tsx` — placeholder rotation state/helper removed; desktop and mobile inputs keep their magnifiers and accessible names.
- `src/components/fitness/AiCoachPanel.tsx` — inner select split into `ariaLabel` plus a blank option; chat, client-search and training-days placeholders removed.

## Modules affected

- PT-OS clients, enrolment, payments, renewal, edit, birthdays, new client.
- PT-OS scheduling: schedule-session, sessions, attendance, availability, session balance, weekly check-in.
- PT-OS finance/analytics/ops: balance sheet, cardio calculator, progress, form checks, activity log, leads, messages.
- PT-OS training: workout generator, workout plans, exercise library/editor, diet plans, workout log, builder, goal assessment, interview, fitness testing, PARQ.
- Member area: account, check-in, form check, goals, habits, messages.
- Auth and subscription: sign-in, forgot/reset password, subscription and checkout, packages.
- Studio chrome: finance (invoices, dues, collected/record/verify payments), engagement (automation, campaigns, feedback, notifications, WhatsApp), settings (integrations, passkeys, profile), support, help, AI coach/knowledge, AI diet and workout generators, transformations.
- Platform: org modals, command bar, shared UI, coupons, finance, knowledge, studios, users, AI control, audit centre, feature manager, hosting assistant/centre/shared/VPS, invitations, invoices, live logs, mission-control AI operations and silences, notification centre, security centre, subscription requests, support centre, billing schema.

## Verification

Run in the clean branch worktree (`.worktrees/placeholder-removal`), based on `origin/main` at `dba16329`.

| Check | Result |
|---|---|
| `npx tsc --noEmit` | Pass. |
| Targeted ESLint on all 142 changed `.ts`/`.tsx` files | 0 errors, 74 warnings. They are the existing `jsx-a11y` and `no-explicit-any` warnings in those files; none sits on a placeholder-removal line. |
| Targeted tests: `form-system-guardrails`, `form-field`, `ai-coach-panel`, `cardio-fitt-page`, `silent-catch-ratchet` | 5 files, 105 tests — pass. |
| Guardrail `form-system-guardrails.test.tsx` | Passes, including the new source scan that fails on any `placeholder=` other than `—`/`kg`, on `placeholderOption=`, and on data-driven `placeholder: '…'` keys. |
| Full `npx vitest run` | 311 of 314 files pass; 5,727 of 5,730 tests pass. The 3 failures are 5-second timeouts in `today-sessions-card`, `workout-session-refresh` and `payment-request-dialog` — files this branch does not touch. All 20 tests in those three files pass when re-run alone on this branch, and the same three files pass on pristine `origin/main`; the timeouts only appear under full-suite load on this machine. |
| Final source scan | Only the 9 retained attributes above; no `placeholderOption`; no data-driven placeholder keys. |

Tests that previously found controls by placeholder now use labels/roles: `ai-coach-panel`, `cardio-fitt-page`, `new-programme-numbers`, `SignaturePad`, `weekly-report-ai-draft`, `client-ai-generate-card`, `workout-programme-create` and `workout-plan-flow`. The `cardio-fitt-page` FormField mock now renders a real `<label>`, so its inputs remain queryable by accessible name. `whatsapp-card` keeps its `queryByPlaceholderText(/api key/i)` assertion because it is a negative check that the removed field stays removed.

The `silent-catch-ratchet` fixture pins file:line positions, so its `settings/profile`, `clients/[id]` and `hosting-centre` entries were shifted by the lines removed above each one; file set and per-file counts are unchanged, so no catch was added or deleted.

Removing `placeholder="0"` from the weight and reps inputs in the workout log exposed that they had no programmatic name: the uppercase caption above them was a `<p>`, not a label. Both received `aria-label`s. The existing accessible-name audit now passes, which is the evidence that no other control lost its only name.

## Exceptions and limitations

- The plan listed `src/app/(chrome)/pt-os/attendance/page.tsx`; that path does not exist. The attendance screen lives at `src/app/(chrome)/attendance/page.tsx` and was swept there. No other page was added.
- No browser or visual-regression run was performed. Behavioural coverage comes from the Vitest/Testing Library suites and the source guardrail; responsive layout and mobile keyboards were not exercised in a real browser.
- The branch starts from `origin/main` (`dba16329`). The development working tree contained unrelated uncommitted work; none of it was copied here, and the isolated diff contains placeholder work only.
