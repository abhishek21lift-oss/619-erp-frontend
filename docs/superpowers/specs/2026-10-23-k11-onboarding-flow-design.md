# K11 Client Onboarding Flow — Design

- **Date:** 2026-10-23
- **Status:** Proposed (awaiting approval)
- **Repos:** `619-erp-frontend`, `619-erp-backend`
- **Chosen approach:** A — K11 onboarding (steps 1–6) plus ongoing tools (steps 7–8)

## 1. Intent

Align the client intake journey with the K11 “Complete Client Onboarding & Handling Sequence”, while reusing the modules already built. The journey card becomes a K11 onboarding checklist for steps 1–6. Steps 7–8 become ongoing tools after onboarding, because they never finish.

## 2. What exists today

- Journey order: `registration → consent → parq → interview → assessment → goals → enrolment → workout_plan`.
- `619-erp-backend/src/modules/pt-os/client-journey.service.js` owns the order and step states.
- `619-erp-frontend/src/lib/journey.ts` mirrors the order, labels and step URLs.
- `ClientJourneyCard` renders the journey on the client profile; `JourneyNextButton` offers the next outstanding step after each screen.
- Fitness Assessment is already the K11 seven-step order: BP → anthropometric → body composition → YMCA step test → strength (1RM optional for beginners) → endurance → flexibility.
- Module 5 already owns retest scheduling, reminders and completion (`/pt-os/progress`).
- Workout Log, Workout Plans/Generator, Diet Plans, Nutrition Assessment and the Karvonen cardio calculator already exist.
- There is no Welcome & Gym Tour feature and no TDEE calculator.
- First PT enrolment is hard-gated on a completed Informed Consent and a fully answered PAR-Q (`lib/screeningGate.enrolmentScreeningBlock`).

## 3. Goals

- Show the K11 order in the journey card.
- Track the Welcome & Gym Tour as step 1.
- Allow PT enrolment before screening, without allowing training or assessment before screening.
- Move Goal Setting before Fitness Assessment.
- Add a Program Design hub covering BMR/TDEE, calories, macros, workout split and Karvonen THR.
- Surface Workout Log and Progress & Retest after onboarding.
- Preserve all existing data and modules.

## 4. Non-goals

- Rebuilding the fitness assessment, retest system, workout log, diet plans or cardio calculator.
- A new teaching-skills tracker or session-execution module. Step 7 is represented by the existing Workout Log and session flow.
- Persisting TDEE, macro, split or THR values. The hub is a calculator and guide; the saved artifacts remain the workout plan and diet plan.
- A full eight-step journey checklist. Steps 7–8 are ongoing.
- Changing the K11 goal-setting module.

## 5. Anti-goals

- A journey progress bar that can never reach 100%.
- Letting an unscreened client train because enrolment moved earlier.
- Locking out existing enrolled clients who lack screening records.
- Showing a “done” state for a behavioural step nobody recorded.

## 6. Constraints

- No destructive SQL. Exactly one additive nullable column.
- The two repos deploy separately; deploy the backend first.
- Preserve tenant isolation and existing audit logging.
- Existing clients must not be forced back through onboarding.
- Local PostgreSQL may be unavailable; database integration tests must remain skippable as they are today.

## 7. Approaches considered

### A — K11 onboarding (steps 1–6) + ongoing tools (steps 7–8) — chosen

The journey tracks only record-producing onboarding steps:

`welcome_tour → enrolment → consent → parq → interview → goals → assessment → program_design`

After `program_design` is done, the journey completes and the profile shows links to Workout Log and Progress & Retest. This matches K11 where the app can record something, keeps the checklist completable, and reuses the existing assessment, retest, workout-log, diet and cardio modules.

### B — Full eight-step journey card — rejected

Steps 7–8 would never become `done`, so the progress bar would never reach 100% and `next` would point at an ongoing phase forever. More code, no new capability.

### C — Reorder only — rejected

Would fix the order but omit K11 step 1 (Welcome & Tour) and step 6 (Program Design). It also leaves enrolment after screening, which contradicts the requested sequence.

## 8. Journey model

### 8.1 Order and keys

```
welcome_tour → enrolment → consent → parq → interview → goals → assessment → program_design
```

- `registration` is the prerequisite (the client record exists), not a journey step.
- `workout_plan` is renamed `program_design`.
- Consent → PAR-Q → Interview is already the K11 phase order and does not change.

### 8.2 Step states

| Step | State rules |
|---|---|
| `welcome_tour` | `done` if `pt_clients.welcome_tour_completed_at` is set, or the client already has a PT term (grandfathering). Otherwise `todo`. No API gate. |
| `enrolment` | `renew` if the term has ended/expired (even when `status = 'pending'`). `blocked` if frozen or inactive, with detail. `done` if the client has a PT term and is `active` or `pending` (activation pending screening). Otherwise `todo`. Screening no longer blocks this step. |
| `consent` | Unchanged: `done`, `in_progress`, `todo`, or `blocked` from `screeningSummary`. |
| `parq` | Unchanged: `done`, `in_progress`, `todo`, or `blocked` from `screeningSummary`. |
| `interview` | Unchanged; remains `optional: true`. |
| `goals` | `done` if any `pt_goals` row exists. Otherwise `todo`. |
| `assessment` | `done` if any `pt_assessments` row exists. Otherwise `todo`. |
| `program_design` | `done` if an active `workout_assignments` row exists. `blocked` if enrolment is not done, or the client is enrolled but not activated (`pending`). `todo` only when the client may train. Detail guides missing goals/assessment but does not hard-block. |

`next` remains the first step whose state is not `done`.

### 8.3 Existing clients

- No backfill. `welcome_tour` is treated as done for anyone with a PT term.
- Existing active clients keep their current status and warn-only screening behaviour.
- Existing clients with no PT term see `welcome_tour` as `todo`; that is accurate, they have not completed this onboarding.
- Existing clients with an active workout assignment see `program_design` as `done`.

## 9. Welcome & Gym Tour

### 9.1 Data

Migration `237_client_welcome_tour.sql`:

```sql
ALTER TABLE pt_clients
  ADD COLUMN IF NOT EXISTS welcome_tour_completed_at TIMESTAMPTZ;

COMMENT ON COLUMN pt_clients.welcome_tour_completed_at IS
  'When the trainer completed the K11 welcome and gym tour (step 1). NULL for not recorded.';
```

Additive, nullable, no backfill.

### 9.2 API

`POST /api/pt-os/clients/:id/welcome-tour` in `client-journey.routes.js`, behind `auth + requireTrainer`:

- Org-scoped update of a live client.
- Sets `welcome_tour_completed_at = COALESCE(welcome_tour_completed_at, NOW())`.
- Returns `{ data: { id, welcome_tour_completed_at } }`.
- Writes `client.welcome_tour.complete` to the activity log.
- 404 for a missing or cross-tenant client.
- No undo in v1.

Service function `markWelcomeTour(orgId, clientId)` in `client-journey.service.js`.

### 9.3 UI

New page `/pt-os/welcome-tour?client_id=...`.

- Uses the existing page shell (`Guard`, `PageContainer`, `PageHero`, `Card`).
- Shows the client name/avatar and the K11 checklist in three groups:
  1. **Professional preparation** — arrive 15 minutes early, clean sporty uniform, fresh breath, phone on silent.
  2. **Ice-breaking** — greet with a smile; ask about well-being, sleep quality and last meal.
  3. **Gym tour** — floor tour, equipment introduction, safety protocols, reduce first-visit anxiety.
- Primary button “Mark tour complete” calls the API, shows success, and renders `JourneyNextButton current="welcome_tour"` (next is PT Enrolment).
- If already completed, show a read-only completed state and the next button.
- If the client is missing, show the standard not-found state.

### 9.4 Journey state

`done` when the timestamp is set or the client has a PT term; otherwise `todo`. The tour is required by the checklist but is not an API gate: a trainer can still open enrolment directly, and the journey card will keep pointing at the tour.

## 10. PT enrolment before screening

### 10.1 The problem

`enrolmentScreeningBlock` rejects first enrolment until consent and PAR-Q are complete. Removing that block alone would create a safety hole: `checkTrainingEligibility` is warn-only for clients who already have a PT term, so a newly enrolled, unscreened client could train.

### 10.2 Provisional enrolment

- First enrolment may set term dates, package and payment without screening.
- If screening is incomplete or hard-blocked, the server forces `pt_clients.status = 'pending'`, even if the caller sends `active`.
- The client stays `pending` until consent is completed and the PAR-Q is fully answered with no hard medical block.
- Existing active/renewed clients are unchanged: the warn-only screening policy stays.
- `pending` + `has_pt_term` means “Activation pending”, not “Not Enrolled”.

### 10.3 Activation

New helper `maybeActivateClient(req, clientId)` in `lib/screeningGate.js`:

1. Load the client, org-scoped.
2. Return unless the client has a PT term and `status = 'pending'`.
3. Re-evaluate screening (`evaluate`).
4. Return if there is a hard block or if consent is not completed or the PAR-Q is not fully answered.
5. Set `status = 'active'`, stamp `updated_at`, and write `client.activated` to the activity log.

Called after:

- Informed Consent completion (`POST /informed-consent/:id/sign`, when `completeConsent` succeeds).
- PAR-Q submit/update (`POST /parq/forms`, `PATCH /parq/forms/:id`, when status is not `draft`).
- Medical clearance create/update (`POST /parq/forms/:formId/clearance`, `PATCH /parq/clearance/:id`).

Wiring: export `maybeActivateClient` from `lib/screeningGate.js`; import it in `informed-consent.routes.js` and `parq.routes.js`. Call it after `completeConsent` succeeds in the sign route, and after `recomputeGateStatus` in the PAR-Q create/update and clearance create/update routes. The helper re-reads the database; it never trusts the route's in-memory row.

### 10.4 Training gate

`statusBlock` in `lib/screeningGate.js` gains:

- `has_pt_term && status === 'pending'` → `CLIENT_PENDING_ACTIVATION` (HTTP 409, matching `CLIENT_NOT_ENROLLED`).

Message: “This client is enrolled but not active yet. Complete their Informed Consent and PAR-Q to activate them.”

All training, assessment, session-booking and workout-assignment routes already call `checkTrainingEligibility`, so they inherit the block. Existing active clients keep the warn-only behaviour.

### 10.5 Route and UI changes

- `PATCH /api/pt-os/clients/:id`: replace `enrolmentScreeningBlock` with a screening summary check. If establishing a first term and screening is incomplete/blocked, force `status = 'pending'`. The PATCH response (`{ data }`) adds:
  - `activation_pending: boolean` — true when the client has a PT term and `status = 'pending'`.
  - `screening_missing: ('informed_consent' | 'parq')[]` — the same list `missingScreening` returns.
  - `screening_block: { code: string; message: string } | null` — the hard medical stop, when one exists.
  The same fields are returned by `POST /api/pt-os/clients` when it establishes a term for an existing client.
- `POST /api/pt-os/clients` with `client_id` and a term: same provisional rule.
- `POST /api/pt-os/clients` without `client_id` and a term: keep the refusal (a client must exist first), but update the message to “Add the client first, then enrol them from their profile.”
- Enrol page: remove the screening hard-stop screen. Show a warning banner when screening is missing (“Client will be enrolled but activated only after consent and PAR-Q”), allow the form, and after save show “Enrolled — activation pending screening” with links to consent/PAR-Q.
- Client list: add `has_pt_term` to the list query/type. Label `pending + has_pt_term` as “Activation Pending”; keep `pending` without a term as “Not Enrolled”. Rename the filter label to “Pending”.
- Client profile status chip: same derivation.
- Journey `enrolment` state: `pending + term` is `done` with detail “PT enrolled — activation pending screening.”
- Reports that count active clients will not count a provisional enrolment until activation. This is intentional and must be called out in release notes.

## 11. Goals before Assessment

- Swap the order only.
- The Goals page already tolerates a missing assessment: it loads the latest assessment if present and leaves the baseline card empty otherwise.
- A trainer can enter the current weight/lift manually for SMART targets.
- After the assessment is recorded, the Goals page picks up the latest baseline on the next load.
- No data migration.
- The Interview page’s hard-coded “Continue to Fitness Assessment” becomes `JourneyNextButton current="interview"`, which will offer Goals.

## 12. Program Design hub

### 12.1 Route and data

New page `/pt-os/program-design?client_id=...`.

Reads existing endpoints only:

- `api.pt.client(id)` — name, gender, DOB, weight, goal, training days, experience level.
- `api.progress.assessments.list({ client_id, limit: 1 })` — BMR, resting HR, weight, height, body fat, scores.
- `api.pt.interviews.list(id)` — lifestyle training days.
- `api.progress.goals.list({ client_id })` — active SMART goals.
- `api.training.assignments.list({ client_id })` — active workout plan.

No new backend endpoint.

### 12.2 Sections

1. **Baseline** — latest assessment date and key results; active SMART goals. If either is missing, show a “complete this first” link rather than blocking the page.
2. **Nutrition targets** — BMR, activity factor, TDEE, goal adjustment, calorie target, protein/fat/carb grams. A link opens the existing Diet Plans page for the saved plan.
3. **Workout schedule** — recommended split by available days; K11 beginner note (15–20 RM, sets short of muscular failure); links to Workout Generator and Workout Plans.
4. **Cardio target zone** — Karvonen THR ranges from age and resting HR; link to the existing cardio calculator.
5. **Completion** — an active workout assignment marks the step done. Primary CTA opens Workout Generator/Workout Plans. `JourneyNextButton current="program_design"` shows the journey-complete state.

### 12.3 Calculations

Put pure functions in `src/lib/program-design.ts`, unit tested:

- **BMR:** use the latest assessment BMR when present; otherwise Mifflin-St Jeor:
  - male: `10w + 6.25h − 5a + 5`
  - female: `10w + 6.25h − 5a − 161`
- **Activity factor:** 1.2 sedentary, 1.375 light, 1.55 moderate, 1.725 very active, 1.9 extra active. Default from interview training days: 0–1 → 1.2, 2–3 → 1.375, 4–5 → 1.55, 6+ → 1.725.
- **TDEE:** `round(BMR × factor)`.
- **Goal adjustment:** fat loss −500 kcal, maintenance 0, muscle gain +300 kcal. Default from the client/SMART goal text.
- **Calorie floor:** 1200 kcal female, 1500 kcal male. Do not show a target below the floor.
- **Macros:** protein `1.8 g/kg`, fat `25% of calories / 9`, carbs `remaining calories / 4`.
- **Split:** ≤3 days full body, 4 days upper/lower, ≥5 days push/pull/legs.
- **Karvonen:** `THR = ((MHR − RHR) × intensity) + RHR`, with `MHR = 220 − age` unless a measured MHR exists. Show 50–60%, 60–70%, 70–80% and 80–90% ranges.

All values are display-only; nothing is persisted.

### 12.4 Journey state

- `done` if an active workout assignment exists.
- `todo` if enrolment is done, with detail when goals or assessment are missing.
- `blocked` if enrolment is not done, with the existing “Enrol the client in PT before assigning a plan” message.

## 13. Ongoing tools (steps 7–8)

- No new journey steps.
- When `journey.next === null`, `ClientJourneyCard` renders a footer:
  - “Onboarding complete — client is active.”
  - **Workout Log** → `/pt-os/clients/:id/workout-log`
  - **Progress & Retest** → `/pt-os/progress?client_id=:id`
- Retest scheduling, reminders and completion stay in Module 5.
- Workout Log stays the floor-execution record.
- No new tables or pages.

## 14. Frontend changes

- `src/lib/journey.ts` — keys, labels, hrefs, order, `stepAfter`.
- `src/components/pt-os/client/ClientJourneyCard.tsx` — icon/colour maps, completed footer.
- `src/app/(chrome)/pt-os/welcome-tour/page.tsx` — new.
- `src/app/(chrome)/pt-os/program-design/page.tsx` — new.
- `src/lib/program-design.ts` — new pure calculations.
- `src/app/(chrome)/pt-os/new-client/page.tsx` — success CTA to Welcome & Tour; update the screening comment.
- `src/app/(chrome)/pt-os/clients/[id]/enroll/page.tsx` — remove hard stop, add pending banner and post-save state.
- `src/app/(chrome)/pt-os/interview/page.tsx` — replace hard-coded assessment link with `JourneyNextButton`.
- `src/app/(chrome)/pt-os/clients/page.tsx` — pending/activation label and filter copy.
- `src/app/(chrome)/pt-os/clients/[id]/page.tsx` — pending/activation status label.
- `src/lib/api/endpoints/ptOs.ts` — `completeWelcomeTour(id: string) => http<{ data: { id: string; welcome_tour_completed_at: string } }>(`/api/pt-os/clients/${id}/welcome-tour`, { method: 'POST' })`.
- `src/lib/api/types.ts` — `has_pt_term: boolean` on the client list type.
- Tests under `src/__tests__/`.

## 15. Backend changes

- `src/db/migrations/237_client_welcome_tour.sql` — new nullable column.
- `src/modules/pt-os/client-journey.service.js` — new order, states, `markWelcomeTour`.
- `src/modules/pt-os/client-journey.routes.js` — `POST /clients/:id/welcome-tour`.
- `src/lib/screeningGate.js` — `CLIENT_PENDING_ACTIVATION`, `maybeActivateClient`.
- `src/modules/pt-os/pt-os.routes.js` — provisional enrolment in `PATCH /clients/:id` and `POST /clients`; create-with-package message.
- `src/modules/pt-os/informed-consent.routes.js` — activation after consent completion.
- `src/modules/pt-os/parq.routes.js` — activation after PAR-Q submit/update and clearance changes.
- `src/modules/pt-os/pt-os.service.js` — select `${hasPtTermSql('c')} AS has_pt_term` in `getActiveClients`.
- Tests under `src/__tests__/`.

## 16. Edge cases

- **Existing enrolled client:** welcome tour auto-done, status unchanged, warn-only screening unchanged.
- **Pending + term:** enrolment done, training/assessment blocked with `CLIENT_PENDING_ACTIVATION`, activation on completed screening.
- **High-risk PAR-Q:** stays pending until an approved, unexpired medical clearance exists.
- **Consent revoked after activation:** status stays active; the existing hard stop blocks training. Do not silently return them to pending.
- **Frozen/expired/inactive:** journey states as before; program design blocked until the client can train.
- **No goals or assessment:** program design is still reachable and shows guidance; no new hard block.
- **No workout plan:** program design stays todo; the journey does not complete.
- **Deleted client:** 404 on journey and welcome-tour routes.
- **Cross-tenant id:** 404, never a partial read.
- **Missing DOB/gender/height/weight:** BMR/TDEE show “—” and a prompt to complete the profile; no crash.
- **Old backend with new frontend:** deploy backend first. Do not remove legacy key handling from the frontend until the backend is live.

## 17. Testing

### Backend

- Journey order and states for a new client, an enrolled client, a pending client, an expired client and a frozen client.
- Welcome-tour endpoint: marks once, org-scoped, 404 for another studio.
- Provisional enrolment: first enrolment without screening succeeds with `status = 'pending'`.
- Activation: pending + completed consent + fully answered PAR-Q → active.
- Activation blocked: missing consent, incomplete PAR-Q, high-risk PAR-Q without clearance.
- Training gate: pending + term returns `CLIENT_PENDING_ACTIVATION`; existing active clients keep warn-only behaviour.
- Existing journey tests updated for the new order and keys.
- `node --check` on changed backend files.

### Frontend

- Journey order, labels, hrefs and `stepAfter`.
- `ClientJourneyCard` renders the new order, the pending enrolment detail and the completed footer.
- Welcome-tour page calls the API and offers the next step.
- Program-design calculations: BMR, TDEE, calorie floor, macros, split, Karvonen.
- Enrol page no longer hard-stops on missing screening and shows the pending state.
- New-client success CTA points to Welcome & Tour.
- Interview next button points to Goals.
- `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.

Database integration tests use the existing real-DB harness and remain skippable when PostgreSQL is unavailable.

## 18. Rollout

1. Backend: migration 237, journey service/routes, screening gate, provisional enrolment, activation hooks.
2. Frontend: journey keys/UI, welcome-tour page, program-design page, enrol/new-client/interview updates.
3. No backfill.
4. Monitor `client.activated` audit rows and the pending-with-term count after release.
5. Release note: provisional enrolments count as pending, not active, until screening completes.

## 19. What is left to the builder

- Exact UI copy and styling within the existing design system.
- Whether to add an undo for “Mark tour complete” (not in v1).
- Whether to persist program-design targets (explicitly out of scope).
- Exact test file names and fixtures.
- Whether to add a second entry point to Welcome & Tour outside the journey card.

## 20. Builder-check calls

The builder check raised six points. All are settled here as implementation calls; none changes the product behaviour above.

1. **Client list `has_pt_term`** — add it to `getActiveClients` with `hasPtTermSql('c')` and to `PtClientBase`. Do not derive it in the browser.
2. **`CLIENT_PENDING_ACTIVATION` status** — 409 Conflict, matching `CLIENT_NOT_ENROLLED`.
3. **PATCH response shape** — `PATCH` returns `{ data }` (it never carried `screening`; `GET /clients/:id` does). Add `activation_pending: boolean`, `screening_missing: ('informed_consent' | 'parq')[]`, and `screening_block: { code, message } | null` to `data`.
4. **Activation wiring** — export `maybeActivateClient` from `screeningGate.js`; import and call it after `completeConsent` and after each `recomputeGateStatus` that follows a PAR-Q or clearance write. The helper re-reads the database.
5. **`completeWelcomeTour` signature** — `(id: string) => http<{ data: { id: string; welcome_tour_completed_at: string } }>('/api/pt-os/clients/${id}/welcome-tour', { method: 'POST' })`.
6. **Pending + ended term** — `renew` wins over `done`; check ended/expired before pending/active.
