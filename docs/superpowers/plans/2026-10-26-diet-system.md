# Diet System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the six verified high-severity diet findings and add the minimum lifecycle needed for the feature to work end to end: real intake logging, truthful rings, template validation, assignment supersede/end, trainer visibility of the assigned plan, and a generator that can save what it generated.

**Architecture:** The backend stays route → repository/service. `routes/diet.js` keeps auth, tenant guards and HTTP shapes; SQL that is new or rewritten moves into `modules/nutrition/diet.repository.js`. AI plan saving stays in `modules/nutrition/ai-diet.service.js`. The frontend keeps its existing page structure and API client; the diet hub reads `tracker.today` instead of the meal library and the generator gains a save action.

**Tech Stack:** Node/Express + PostgreSQL (backend), Next.js App Router + React + TypeScript + Vitest (frontend).

---

## Scope

**In:** audit findings H1–H6 plus assignment lifecycle (supersede on assign, end a plan, one active per template/client), real tracker writes, template validation, save-from-generator.

**Out (deferred, do not add):** diet generation ledger, member self-logging, assessment calorie/macro targets, meal/template edit-delete UI, diet PDF/export.

---

## Backend

### Task 1: Migration — one active assignment per template/client

**Files:**
- Create: `619-erp-backend/src/db/migrations/238_diet_assignment_active_unique.sql`

- [ ] Replace the three-column unique constraint with a partial unique index. The old constraint also prevented re-assigning a template after its previous row was completed, which the "End plan" lifecycle now needs.

```sql
-- 238_diet_assignment_active_unique.sql
-- A client may hold one ACTIVE assignment per template, but history rows for
-- the same template must be allowed to repeat. The old
-- UNIQUE (diet_template_id, client_id, status) made re-assigning a template
-- after ending it collide with the completed row.
ALTER TABLE diet_assignments
  DROP CONSTRAINT IF EXISTS diet_assignments_diet_template_id_client_id_status_key;

CREATE UNIQUE INDEX IF NOT EXISTS diet_assignments_active_unique
  ON diet_assignments (diet_template_id, client_id)
  WHERE status = 'active';
```

- [ ] `ON CONFLICT` inference in the route must use the same predicate:
  `ON CONFLICT (diet_template_id, client_id) WHERE status = 'active'`.

### Task 2: Repository — template create, tracker upsert, assignment end

**Files:**
- Create: `619-erp-backend/src/modules/nutrition/diet.repository.js`
- Modify: `619-erp-backend/src/routes/diet.js`

- [ ] Export `DietInputError` (status 400), `createTemplate`, `upsertTracker`, `updateAssignmentStatus`.

**`createTemplate`** runs one transaction:
1. Validate name (required, trimmed, ≤120), goal (default `maintenance`, must be one of `weight_loss|muscle_gain|maintenance|keto|vegan|custom`), calories (absent → 2000; integer 0–20000), macros (absent/blank → `NULL`; numeric 0–1000; negative → 400), meals array (≤50).
2. Reject any meal id not visible to the studio:
   `SELECT id FROM meals WHERE id = ANY($1::text[]) AND is_active = true AND (organization_id IS NULL OR organization_id = $2)`.
   Count mismatch → 400 `meal not found or not available`.
3. Insert template, then links (`day_of_week` integer 1–7 or null; `sort_order` integer ≥0, default index), `COMMIT`. Any failure rolls back.

**`upsertTracker({ clientId, orgId, logDate, values })`** is a PARTIAL upsert. `values` contains only keys the caller supplied:
- `calories_consumed` integer 0–20000; `water_glasses` integer 0–100; macros numeric 0–2000; `notes` trimmed text.
- A supplied `null`/blank clears the column; an absent key is untouched on update and `NULL` on insert.
- Dynamic column list for both INSERT and `DO UPDATE`; never write a default `0` for a field the caller did not send.
- `ON CONFLICT (client_id, log_date) DO UPDATE` sets `updated_at = NOW()` and preserves `organization_id` with `COALESCE`.

**`updateAssignmentStatus({ id, orgId, status })`**:
- status must be `completed|cancelled|paused`.
- `UPDATE diet_assignments SET status=$1, end_date = CASE WHEN $1 IN ('completed','cancelled') THEN CURRENT_DATE ELSE end_date END, updated_at=NOW() WHERE id=$2 AND organization_id=$3 RETURNING *`.
- No row → `null`, route answers 404.

### Task 3: Routes — tracker, templates, assign, end

**Files:**
- Modify: `619-erp-backend/src/routes/diet.js`

- [ ] **GET `/tracker`**: validate `date` with `cleanDate`; malformed → 400. Return `today: rows[0] || null` (never a fabricated zero row).
- [ ] **PUT `/tracker`**: keep `clientInOrg` 404. Validate `log_date` with `cleanDate`; default to today. Collect only present body keys and call `upsertTracker`. Negative/non-numeric → 400. This is what stops a water-only tap wiping calories and macros.
- [ ] **POST `/templates`**: replace inline SQL with `createTemplate`; catch `DietInputError` → 400.
- [ ] **GET `/templates`**: add the org predicate to the meal subqueries so a template cannot count or return another studio's meals:
  - count: `JOIN meals m ON m.id = dpm.meal_id ... AND (m.organization_id IS NULL OR m.organization_id = $1)`
  - agg: same predicate; `JOIN` (not `LEFT JOIN`) so a dangling link is not a meal.
- [ ] **POST `/assign`**: one data-modifying CTE. `ins` keeps the existing template guard and `ON CONFLICT (diet_template_id, client_id) WHERE status='active' DO UPDATE`; `closed` completes the client's other active plans **only when `ins` produced a row** (`AND EXISTS (SELECT 1 FROM ins)`), so a foreign template still 404s without closing anything.
- [ ] **PATCH `/assignments/:id`**: trainer-only, `clientInOrg` is not needed because the row carries `organization_id`; call `updateAssignmentStatus` with `orgIdOf(req)`. 400 on bad status, 404 when no row, 200 with the row.

### Task 4: H1 — missing allergy/preference is not "none"

**Files:**
- Modify: `619-erp-backend/src/routes/ai.js` (`resolveDietInputs`, diet prompt)
- Modify: `619-erp-backend/src/lib/ai/prompts/system.js` (`buildDietSystemPrompt`)

- [ ] In `resolveDietInputs`, remove `|| 'none'` from `dietary_preferences` and `allergies`; leave `null` when the record and body are both silent.
- [ ] In the diet user prompt, print `NOT RECORDED` for either null value.
- [ ] In the system prompt:
  - replace the stale `CLIENT AUTHORITATIVE DATA` wording with `CLIENT DATA` and the actual end line `End of CLIENT DATA.`;
  - add: a field marked `NOT RECORDED` means the studio has no record — it is not "none"; never assume no allergies or restrictions, design conservatively and state what must be confirmed.

### Task 5: H2/H3 — saveable plan and shared validator

**Files:**
- Modify: `619-erp-backend/src/routes/ai.js`
- Modify: `619-erp-backend/src/modules/nutrition/ai-diet.service.js`

- [ ] `dietPlanNeedsWork` calls `normalisePlan(plan)` and returns `null` when it succeeds, otherwise the `DietPlanError` message. This makes `grounding.structure_ok` mean "the save button will accept it", not merely "three fields exist".
- [ ] Keep the revision instruction generic and containing `"total_calories"` (existing test pins it).
- [ ] `saveAiDietPlan`: inside the existing transaction, before inserting the new assignment:
  `UPDATE diet_assignments SET status='completed', end_date=COALESCE(end_date, CURRENT_DATE), updated_at=NOW() WHERE client_id=$1 AND organization_id=$2 AND status='active'`.
  Then insert the new active row. This supersedes the previous plan atomically.

### Task 6: Backend tests

**Files:**
- Modify: `619-erp-backend/src/__tests__/diet.routeScoping.test.js`
- Modify: `619-erp-backend/src/__tests__/diet.saveFromAi.test.js`
- Modify: `619-erp-backend/src/__tests__/ai.generators.test.js`
- Modify: `619-erp-backend/src/__tests__/mpts.grounding.gate.test.js`
- Modify: `619-erp-backend/src/__tests__/diet.tenancy.integration.test.js`
- Create: `619-erp-backend/src/__tests__/diet.tracker.test.js`

- [ ] Tracker: water-only PUT emits only `water_glasses` in `DO UPDATE`; absent calories stay absent; blank clears to NULL; negative → 400; bad date → 400; GET no row → `today: null`.
- [ ] Templates: bad goal → 400; negative macro → 400; blank macro → NULL param; blank calories → 2000; foreign meal id → 400 and no template insert; `BEGIN`/`ROLLBACK` on failure.
- [ ] Assign: partial-index conflict target; `closed` CTE references `ins`; failed guard leaves prior actives alone; PATCH scopes by org and 404s.
- [ ] Save: prior active rows are completed before the new insert; a rollback still releases the client.
- [ ] Prompt: `NOT RECORDED` lines for silent prefs/allergies; system prompt names `CLIENT DATA` and contains the NOT RECORDED rule; no `CLIENT AUTHORITATIVE DATA`.
- [ ] Grounding gate: a plan that fails `normalisePlan` (e.g. `total_calories: 100`) triggers the one revision; a saveable plan does not.
- [ ] Integration copy: update the assignment SQL to the partial-index form; add a test that the partial unique index exists.

---

## Frontend

### Task 7: API types and client

**Files:**
- Modify: `619-erp-frontend/src/lib/api/types.ts`
- Modify: `619-erp-frontend/src/lib/api/endpoints/training.ts`
- Modify: `619-erp-frontend/src/__tests__/__snapshots__/api-shape.test.ts.snap`

- [ ] `Meal` macros `number | null`; `DietTemplate` daily macros `number | null`; `DietAssignment` daily macros `number | null`; `NutritionLog` numerics `number | null`.
- [ ] `tracker.get` returns `today: NutritionLog | null`.
- [ ] Add `assignments.update: (id, status) => PATCH /api/diet/assignments/:id`.
- [ ] Add the snapshot entry `diet.assignments.update → /api/diet/assignments/`.

### Task 8: Diet hub — truthful intake, active plan, end plan

**Files:**
- Modify: `619-erp-frontend/src/app/(chrome)/pt-os/diet-plans/page.tsx`
- Modify: `619-erp-frontend/src/components/fitness/MealCard.tsx` (accept nullable macros)

- [ ] Remove the Grocery tab, `GroceryList` import and the empty `GroceryList onGenerate` dead end.
- [ ] Remove the "Calories by Meal" library bar chart and its now-unused imports/state.
- [ ] Add `today: NutritionLog | null` state. Rings read `today.calories_consumed/protein_g/carbs_g/fats_g`, not the meal library.
- [ ] Goals come only from `activeAssignment`; no `2400/160/260/65` defaults. When there is no goal, the ring shows `—` and zero progress.
- [ ] Add a compact "Log intake" card: four number fields (calories, protein, carbs, fats) prefilled from `today`, one Save button calling `tracker.update` with all four. Clear fields = clear the value, not zero.
- [ ] Add an "Active plan" card when an assignment exists: template name, its `meals` list (`DietTemplateMeal[]` already returned by GET /templates; add `mealList` to the local mapping), and an "End plan" button calling `assignments.update(id, 'completed')`, then refresh.
- [ ] `meals.list()` no longer sends `date`.
- [ ] Keep water partial updates; they are now safe.

### Task 9: Generator — save and assign

**Files:**
- Modify: `619-erp-frontend/src/app/(chrome)/ai/diet-generator/page.tsx`

- [ ] On client switch, clear `plan`, `meta`, `error`, `saved` and field errors alongside the existing form reset.
- [ ] Add `saving`, `saved`, `saveError`. A "Save & assign to client" button calls `api.diet.saveFromAi({ client_id, plan })`.
- [ ] Disable it when `meta?.grounding?.structure_ok === false` or no client, and explain why: the generated plan is not saveable as-is; regenerate or fix it first.
- [ ] After success show "Saved and assigned" plus a link to `/pt-os/diet-plans?client_id=...`.

### Task 10: AI Coach — diet is chat-only

**Files:**
- Modify: `619-erp-frontend/src/components/fitness/AiCoachPanel.tsx`

- [ ] `type="diet"` opens in chat mode and hides the Generate toggle. Remove the diet generation branch, diet-only state (`dietaryPrefs`, `allergies`, `DIET_GOALS`) and the `aiDietInputSchema` import.
- [ ] Add a diet-only link to `/ai/diet-generator?client_id=<selected>` ("Generate & save a full diet plan").
- [ ] Rename "Plan Generated & Saved" to "Plan Generated" — this panel never saved.

### Task 11: Frontend tests

**Files:**
- Modify: `619-erp-frontend/src/__tests__/page-shell.test.ts`
- Modify: `619-erp-frontend/src/__tests__/silent-catch-ratchet.test.ts`

- [ ] Replace the old "diet page adds macros" source assertions with: rings read `tracker.today`; no `?? 2400/160/260/65`; no `grocery` tab; `assignments.update`/`End plan` present; `meals.list()` without `date`.
- [ ] Update silent-catch line pins if edits shift them.
- [ ] Keep the API snapshot green.

---

## Verification

- [ ] Backend: `npm test -- --runInBand` (or the repo's documented command), architecture/layering/tenant conventions included.
- [ ] Frontend: `npm test -- --run`, `npx tsc --noEmit`, lint.
- [ ] Real-DB suites need `RLS_TEST_DATABASE_URL`; they run in CI.
- [ ] Commit backend and frontend separately; push and open PRs only if the user asks.

## Risks

- The partial unique index assumes no existing duplicate active rows. Migration 238 will fail on duplicates; check production before applying (`SELECT diet_template_id, client_id, COUNT(*) ... WHERE status='active' GROUP BY 1,2 HAVING COUNT(*)>1`).
- `normalisePlan` is stricter than the old structural gate; plans that used to stream with `structure_ok:true` may now be flagged. That is intentional: `structure_ok` now predicts saveability.
- The generator save still trusts the request body because there is no diet generation ledger. The route is trainer-only and validates the same shapes as template/meal writes.
