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

Baseline from the task-start scan of the working tree:

| Item | Found | Removed | Retained |
|---|---:|---:|---:|
| `placeholder=` attributes | 296 | 287 | 9 |
| `placeholderOption=` props | 5 | 5 | 0 |
| Data-driven `placeholder` keys/values | 23 | 23 | 0 |

The 130 files that carried a placeholder attribute were inspected; every one was either swept or is listed under retained lines below. Current source scan (`rg` over `src`, excluding tests) finds 9 attributes in 5 files, all intentional.

## Retained lines

| File | Line | Why |
|---|---|---|
| `src/app/(chrome)/pt-os/diet-plans/page.tsx` | 508 | `placeholder="—"` in a dense macro numeric grid; a neutral empty marker, not instruction. |
| `src/app/(chrome)/pt-os/clients/[id]/workout-log/[sessionId]/page.tsx` | 1075, 1098, 1167, 1180 | `placeholder="—"` in the set/RPE/RIR numeric grid. |
| `src/app/(chrome)/pt-os/workout-generator/page.tsx` | 394 | `placeholder="kg"` is the only unit cue on an otherwise unlabelled training-max input. |
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

| Check | Result |
|---|---|
| `npx tsc --noEmit` | Pass (re-run after every task and after dead-prop removal). |
| Targeted ESLint on structurally changed files | 0 errors, 3 pre-existing warnings in `GlobalSearch.tsx` (non-interactive click handlers at 204/1012, unrelated to placeholders). |
| Task 1 tests: `form-field`, `chat-thread`, `ai-coach-panel` | 3 files, 47 tests — pass. |
| Task 2+3 area tests (19 files) | 187 tests — pass. |
| Task 4 area tests (8 files) | 69 tests — pass. |
| Task 5 area tests (9 files) | 78 tests — pass. |
| Task 6 area tests (5 files) | 63 tests — pass. |
| Guardrail `form-system-guardrails.test.tsx` | 50 tests — pass, including the new source scan and the existing accessible-name audit. |
| Full `npm test` (final, JSON reporter) | 309 of 310 files pass; 5,721 of 5,722 tests pass. The one failure is `api-shape.test.ts`: the committed snapshot does not include the uncommitted `superAdmin.aiHealth` endpoint in `src/lib/api/endpoints/platform.ts`. That endpoint is unrelated to this work; the snapshot was deliberately not updated. |
| Final source scan | Only the 9 retained attributes above; no `placeholderOption`; no data-driven placeholder keys. |

Tests that previously found controls by placeholder now use labels/roles: `ai-coach-panel`, `cardio-fitt-page`, `new-programme-numbers`, `SignaturePad`, `weekly-report-ai-draft`, `client-ai-generate-card`, `workout-programme-create` and `workout-plan-flow`. The `cardio-fitt-page` FormField mock now renders a real `<label>`, so its inputs remain queryable by accessible name. `whatsapp-card` keeps its `queryByPlaceholderText(/api key/i)` assertion because it is a negative check that the removed field stays removed.

The `silent-catch-ratchet` fixture pins file:line positions, so its five `settings/profile` and `hosting-centre` entries were shifted by the two lines removed above each one; no catch was added or deleted.

Removing `placeholder="0"` from the weight and reps inputs in the workout log exposed that they had no programmatic name: the uppercase caption above them was a `<p>`, not a label. Both received `aria-label`s. The existing accessible-name audit now passes, which is the evidence that no other control lost its only name.

## Exceptions and limitations

- The plan listed `src/app/(chrome)/pt-os/attendance/page.tsx`; that path does not exist. The attendance screen lives at `src/app/(chrome)/attendance/page.tsx` and was swept there (two attributes). No other page was added.
- No browser or visual-regression run was performed. Behavioural coverage comes from the Vitest/Testing Library suites and the source guardrail; responsive layout and mobile keyboards were not exercised in a real browser.
- The working tree already contained unrelated uncommitted user changes. Edits were line-targeted; nothing was reset, cleaned, committed or pushed. The final diff therefore mixes this work with pre-existing changes, and `git diff --stat` is not a clean measure of this task.
- The full suite's only failure is the `api-shape` snapshot: the working tree adds `superAdmin.aiHealth` in `src/lib/api/endpoints/platform.ts` without updating the snapshot. This predates the placeholder work and was left untouched rather than accepted by rewriting the snapshot.
- Three ESLint warnings in `GlobalSearch.tsx` predate this task; no new lint errors were introduced.
