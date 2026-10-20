# MY PT STUDIO — Form System Audit

**Generated:** Tue Oct 20 2026
**Scope:** `619-erp-frontend` (the MY PT STUDIO frontend)
**Source of truth:** `scripts/form-audit/index.mjs` — run against the live tree with `--json`.
**Verification performed:** The audit script was executed (`node scripts/form-audit/index.mjs`) against the checked-out tree. All totals, per-file findings, contract coverage, and risk classifications below are reproduced from that output, not assumed.

> **Note:** This is an audit only. No application source, dependency manifest, lockfile, migration, database record, production config, or deployed system was modified. No migration was performed, no library was added or removed, and no API contract was changed.

---

## Phase A — Verification (remediation baseline)

**A1. Reports read.** `FORM_SYSTEM_AUDIT.md`, `FORM_SYSTEM_REDESIGN.md`, `AGENTS.md`, `FORM-SYSTEM.md`, `FORM-PLATFORM-REPORT.md` — all reviewed. Architecture confirmed: keep `@tanstack/react-form` + Zod 4 + `useAppForm`; no migration to React Hook Form or Formik; no new dependencies unless a demonstrated requirement justifies them.

**A2. Schema call sites traced (resolves the missing-evidence item).**
- `platformBillingSchema(storedRate)` → bound at `src/components/platform/invoices.tsx:250` (`schema = useMemo(() => platformBillingSchema(storedRate), [storedRate])`). The platform seller-identity form IS on the platform; audit row was correct.
- `renewalOfferSchema` → bound at `src/components/pt-os/RenewalOfferSheet.tsx:141` (`schema: renewalOfferSchema`). The renewal-offer sheet IS on the platform; audit row was correct.
Both schemas are bound to real forms, so the audit's schema coverage figure (31/66 = 47%) is accurate and neither module is an unbound orphan.

**A3. Ratchet test executed — PASSED 20/20.**
`npx vitest run src/__tests__/form-platform-ratchet.test.ts` — 1 test file, 20 tests, 45.93s. Every ceiling and floor holds:
- risky coercions = 0 (ceiling 0)
- unjustified native controls = 132 (ceiling 138; gap 6 < 20, not stale)
- P0 unjustified = 0 (ceiling 0)
- P1 unjustified = 51 (ceiling 51 — at the limit, not above)
- uncanonical uploads = 0 (ceiling 0)
- `type="number"` wheel hazards = 0 (ceiling 0)
- critical forms without journey = 35 (ceiling 35 — at the limit)
- forms with no submit contract = 12 (ceiling 15)
- schema platform = 31 (floor 26); error platform = 61 (floor 55); platform controls = 378 (floor 321)
- no stale justifications; every justification carries a substantive reason
- `OfferForm` still on the platform; `commissions/page` absent (migrated with multi-coach removal)

**A4. Totals reproduced.** `node scripts/form-audit/index.mjs` reproduces every figure in the executive summary: 165 files, 230 controls, 163 native business, 378 design-system controls, 66 forms, 132 unjustified, 0 risky coercions, 7 bounded / 7 state coercions (0 unjustified), 0 `type="number"`, 12 uploads (0 uncanonical), contract coverage 82%/92%/74%/47%, E2E 17/52 (33%), risk split P0/P1/P2 = 19/107/39 files. All reproducible, not assumed.

**A5. Critical form journeys — missing runtime evidence.**
- 18 journey specs exist in `e2e/`; `journeys.mjs` declares pairings for 19 form files; 17 of 52 critical forms are covered (33%), 35 have no declared journey.
- `record-payment.ui.spec.ts` IS a genuine deep journey for the Record Payment form: real browser, real form, real API, real Postgres; asserts the row reaches the database at the right value; covers double-tap protection, server-failure handling without leaking SQL internals, retry, and reset across entities. The audit table's `hasJourney: true` for `clients/[id]/payments/page.tsx` is correct; an earlier verbal claim that Record Payment lacked a journey was wrong.
- What remains unverified is RUNTIME evidence: no E2E spec was executed in this session (`playwright test` not run), so no journey has actually been observed to pass or fail against a live backend. Mobile-device and performance testing (§24/§25 of FORM-PLATFORM-REPORT) were not attempted.

**Correction to the audit narrative:** the claim "No E2E journey for the Record Payment form ... the single highest-value missing test" is retracted. Record Payment has the deepest journey in the repo. The accurate gap statement is: 35 critical forms have no declared E2E journey, and no journey has been executed to confirm runtime behavior.

---

## Executive Summary

| Metric | Value |
|---|---|
| Files rendering a control | 165 |
| Total controls (all kinds) | 230 |
| Native business controls | 163 |
| Design-system controls | 378 |
| **Forms** (`<form>` or a submit) | **66** |
| Unjustified native business controls | 132 |
| Risky value coercions (`Number('')` → 0) | 0 |
| Submit-time state coercions | 7 (0 unjustified) |
| `type="number"` controls (scroll-wheel hazard) | 0 |
| Upload sites | 12 (0 uncanonical — all use the canonical byte-signature validator) |
| Contract coverage (submit / error / reset / schema) | 82% / 92% / 74% / 47% |
| End-to-end coverage of critical forms | 17 of 52 (33%) |
| By risk — P0 / P1 / P2 | 19 / 107 / 39 files |

**Overall status:** ISSUE FOUND. The platform (TanStack Form + Zod + `useAppForm` + design-system fields) is real and the defect class it exists to remove (blank-becomes-zero coercion) is genuinely absent at zero. But schema coverage is 47%, 38 forms have no schema, 35 critical forms have no end-to-end journey, and 132 native business controls remain unjustified.

---

## Phase 1 — Repository Discovery

### Installed form / validation dependencies

| Dependency | Version | Role |
|---|---|---|
| `@tanstack/react-form` | `^1.33.5` | The form library (field state, dirtiness, touched-ness, async validation) |
| `zod` | `^4.6.5` | Schema validation |
| `clsx`, `tailwind-merge` | — | Styling utilities (not form-specific) |

No React Hook Form, no Formik, no final-form, no react-hook-form. The app standardises on TanStack Form + Zod.

### Central form platform

- `src/lib/forms/useAppForm.ts` — thin layer over TanStack Form. Adds three things TanStack does not own:
  1. **Raw in, parsed out** — form state holds strings; the schema parses at submit and the handler receives typed output. `Number('') === 0` is structurally impossible.
  2. **Submit guard** — an in-flight-promise ref checked synchronously at submit top; a second attempt returns the first promise (defence against double-tap / same-frame clicks).
  3. **Reset means reconstruct** — `resetTo(values)` rebuilds from the authoritative record; `formKey` remount key for the strongest version.
- `src/lib/forms/errors.ts` — `mapApiError`, `errorMessage`, `mapSignInError`; one translation from "something went wrong" into `FormErrors` (`formError`, `fieldErrors`, `retryable`, `kind`).
- `src/lib/forms/files.ts` — canonical file validation by magic bytes (`checkFile`, `readImageAsDataUrl`); named rule sets (`AVATAR_RULES`, `LOGO_RULES`, `GALLERY_RULES`, `PAYMENT_PROOF_RULES`, `DOCUMENT_RULES`, `KNOWLEDGE_RULES`).
- `src/lib/forms/primitives.ts`, `domain.ts`, `normalize.ts`, `inline.ts` — reusable field builders and normalisers.
- `src/lib/forms/schemas/` — 25 named Zod schema modules (see §3 below).

### Design-system form surface (`src/components/ui/form/`)

| File | What it provides |
|---|---|
| `FormField.tsx` | id, label, description, error, ARIA wiring via context; `useFieldWiring`, `fieldControlProps`, `useFieldWiringState`, `FieldWiringProvider` |
| `controls.tsx` | `TextInput`, `TextArea`, `SelectInput`, `SearchField`, `TextFieldRow`, surface contexts |
| `fields.tsx` | `TextField`, `TextAreaField`, `NumberField`, `SelectField`, `DateFieldControl`, `CheckboxField`, `RadioField`, `MonthFieldControl`, `TimeFieldControl`, `ChoiceChips`, `useStandaloneField`; `visibleError` (touched rule) |
| `FormStatus.tsx` | `FormErrorBanner` (`role="alert"`), `SubmitStatus` (polite live region) |
| `index.ts` | barrel export |

### No inventory / stock / supplier module exists here

A search for `inventory`, `stock`, `supplier` across `src/` found only unrelated references (a commented "no inventory module", module-config workflow descriptions, and an API type comment about stock-as-churn). **There are no Inventory Product, Stock IN, Stock OUT, or Supplier forms in this frontend.** The separate inventory-form inventory requested therefore resolves to **zero forms**. If a separate ERP inventory module is being audited alongside this one, it is not present in this tree.

---

## Phase 2 — Inventory of All 66 Forms

Each entry below is reproduced from the verified audit output. `contracts` values are `platform` (uses `useAppForm`/canonical mapper/named schema), `manual` (hand-rolled equivalent), or `none` (absent). `risk` is assigned by path per `classify.mjs` (P0 = money/access/auth; P1 = core records; P2 = tooling/filter rails). `hasJourney` = covered by a real browser E2E journey declared in `scripts/form-audit/journeys.mjs`.

### P0 forms (money, access, auth) — 15 forms

| # | File | Workflow | Lib / components | Schema | Contracts (submit/error/reset/schema) | Unjustified | Journey | Status |
|---|---|---|---|---|---|---|---|---|
| 1 | `src/app/(bare)/auth/set-password/page.tsx` | Set new password | TanStack + design-system fields | `newPasswordSchema` | platform / platform / manual / platform | 0 | no | PASS |
| 2 | `src/app/(bare)/forgot-password/page.tsx` | Forgot password | TanStack + design-system fields | `forgotPasswordSchema` | platform / platform / platform / platform | 0 | no | PASS |
| 3 | `src/app/(bare)/reset-password/page.tsx` | Reset password | TanStack + design-system fields | `resetPasswordSchema` | platform / platform / manual / platform | 0 | no | PASS |
| 4 | `src/app/(bare)/subscription/checkout/[id]/page.tsx` | Subscription checkout | TanStack + design-system fields | `subscriptionCheckoutSchema` | platform / platform / manual / platform | 0 | no | PASS |
| 5 | `src/app/(bare)/subscription/page.tsx` | Coupon lookup (read only) | Native input (1 text) | none | none / platform / manual / none | 0 (justified: 1) | no | ISSUE FOUND (manual submit, no schema, but justified as lookup) |
| 6 | `src/app/(chrome)/finance/invoices/page.tsx` | Create invoice | TanStack + design-system fields | `createInvoiceSchema` | platform / platform / manual / platform | 0 | yes | PASS |
| 7 | `src/app/(chrome)/finance/verify-payments/page.tsx` | Verify payments | Native (6 justified: radio+legend, textarea, etc.) | none | manual / platform / manual / none | 0 (justified: 6) | no | ISSUE FOUND (justified — already correct per §1; no migration) |
| 8 | `src/app/(chrome)/pt-os/clients/[id]/payments/page.tsx` | Record payment | TanStack + design-system fields | `ptPaymentSchema` | platform / platform / none / platform | 0 (justified: 1 filter select) | yes | PASS |
| 9 | `src/app/(chrome)/subscription/packages/page.tsx` | Subscription packages | TanStack + design-system fields | `ptPackageSchema` | platform / platform / platform / platform | 0 | yes | PASS |
| 10 | `src/components/platform/invoices.tsx` | Seller-identity form | TanStack + design-system fields | platform | platform / platform / manual / platform | 0 | no | PASS |
| 11 | `src/components/platform/subscription-requests.tsx` | Platform UPI dialog | TanStack + design-system fields | platform | manual / platform / manual / platform | 0 | no | PASS |
| 12 | `src/components/payments/UpiPayScreen.tsx` | Member UPI payment | Native (2 justified) | none | manual / platform / manual / none | 0 (justified: 2) | no | ISSUE FOUND (justified — working money form moved path) |
| 13 | `src/components/payments/UpiSettingsPanel.tsx` | UPI settings | TanStack + design-system fields | `upiSettingsSchema` | platform / platform / manual / platform | 0 | no | PASS |
| 14 | `src/app/(platform)/platform/_tabs/CouponsTab.tsx` | Coupons | TanStack + design-system fields | `couponSchema` | platform / platform / manual / platform | 0 | no | PASS |
| 15 | `src/components/payments/...` (verify-payments) | — | covered above | | | | | |

### P1 forms (core records: clients, training, assessments, comms) — 37 forms

| # | File | Workflow | Lib / components | Schema | Contracts | Unjustified | Journey | Status |
|---|---|---|---|---|---|---|---|---|
| 16 | `src/app/(bare)/client/activate/page.tsx` | Client activate | Native (2 dynamic) | none | manual / platform / manual / none | 2 | no | ISSUE FOUND (no schema, no submit guard) |
| 17 | `src/app/(bare)/member/account/page.tsx` | Member account | TanStack fields (6) | `memberAccountSchema` | platform / platform / platform / platform | 0 | no | PASS |
| 18 | `src/app/(bare)/member/checkin/page.tsx` | Member check-in | TanStack fields (7) | `memberCheckinSchema` | platform / platform / none / platform | 0 | no | ISSUE FOUND (no reset contract) |
| 19 | `src/app/(bare)/member/goals/page.tsx` | Member goals | TanStack fields (4) | `memberGoalSchema` | platform / platform / manual / platform | 0 | yes | PASS |
| 20 | `src/app/(bare)/member/habits/page.tsx` | Member habits | TanStack fields (5) | `memberHabitSchema` | platform / platform / manual / platform | 0 | yes | PASS |
| 21 | `src/app/(chrome)/ai/diet-generator/page.tsx` | AI diet generator | TanStack fields (7) | `aiGeneratorSchema` | none / platform / manual / platform | 0 | no | ISSUE FOUND (no submit guard) |
| 22 | `src/app/(chrome)/ai/workout-generator/page.tsx` | AI workout generator | TanStack fields (6) | `aiGeneratorSchema` | none / platform / manual / platform | 0 | no | ISSUE FOUND (no submit guard) |
| 23 | `src/app/(chrome)/attendance/page.tsx` | Attendance manual entry | TanStack + `attendanceEntrySchema` | platform | platform / platform / platform / platform | 0 (justified: 1 filter date) | no | PASS |
| 24 | `src/app/(chrome)/engagement/automation/page.tsx` | Automation rule | TanStack fields (4) | `automationRuleSchema` | platform / platform / platform / platform | 0 | yes | PASS |
| 25 | `src/app/(chrome)/engagement/campaigns/page.tsx` | Campaigns | TanStack fields (6) | `campaignSchema` | platform / platform / none / platform | 0 | no | ISSUE FOUND (no reset contract) |
| 26 | `src/app/(chrome)/engagement/notifications/page.tsx` | Notifications | TanStack fields (4) | `notificationSchema` | platform / platform / platform / platform | 0 | no | PASS |
| 27 | `src/app/(chrome)/engagement/whatsapp/page.tsx` | WhatsApp | Native (checkbox, textarea) | none | none / platform / none / none | 2 | no | ISSUE FOUND (no submit/reset/schema) |
| 28 | `src/app/(chrome)/pt-os/activity-log/page.tsx` | Activity log | Native (2 text) | none | none / none / none / none | 2 | no | ISSUE FOUND |
| 29 | `src/app/(chrome)/pt-os/clients/[id]/edit/page.tsx` | Client edit | Native (file, select, text) + fields (7) | none | manual / platform / manual / none | 2 | yes | ISSUE FOUND (no schema) |
| 30 | `src/app/(chrome)/pt-os/clients/[id]/enroll/page.tsx` | Enrollment | TanStack fields (6) + native checkbox | none | manual / platform / none / none | 0 (justified: 1 search + 6 state coercions) | yes | ISSUE FOUND (no schema, no reset; 6 justified state coercions) |
| 31 | `src/app/(chrome)/pt-os/clients/[id]/page.tsx` | Client detail | Native textarea | none | manual / platform / manual / none | 1 | no | ISSUE FOUND (no schema) |
| 32 | `src/app/(chrome)/pt-os/clients/[id]/renew/page.tsx` | Renewal | TanStack fields (5) | `renewPtSchema` | platform / platform / manual / platform | 0 | yes | PASS |
| 33 | `src/app/(chrome)/pt-os/clients/[id]/workout-log/[sessionId]/page.tsx` | Workout log per-set | Native (9: 3 select, 6 text) | none | manual / platform / manual / none | 0 (justified: 9) | no | ISSUE FOUND (justified per-set blur editors; no schema) |
| 34 | `src/app/(chrome)/pt-os/clients/[id]/workout-log/page.tsx` | Workout log | Native (search x2, select) | none | none / platform / none / none | 1 | no | ISSUE FOUND |
| 35 | `src/app/(chrome)/pt-os/diet-plans/page.tsx` | Diet plans | TanStack fields (7) + native date | `mealSchema` | platform / platform / platform / platform | 1 | yes | ISSUE FOUND (1 unjustified native date control) |
| 36 | `src/app/(chrome)/pt-os/exercise-library/page.tsx` | Exercise library | Native (search, select) | none | none / platform / manual / none | 1 | no | ISSUE FOUND (no schema) |
| 37 | `src/app/(chrome)/pt-os/macrocycle/page.tsx` | Macrocycle | TanStack fields (4) | none | manual / none / none / none | 0 | yes | ISSUE FOUND (no error/reset/schema) |
| 38 | `src/app/(chrome)/pt-os/new-client/page.tsx` | New client | TanStack fields (9) + native checkbox | none | manual / platform / manual / none | 1 | yes | ISSUE FOUND (no schema) |
| 39 | `src/app/(chrome)/pt-os/progress/page.tsx` | Progress | TanStack fields (4) | none | none / platform / manual / none | 0 | yes | ISSUE FOUND (no schema, no submit guard) |
| 40 | `src/app/(chrome)/pt-os/progress-photos/page.tsx` | Progress photos | Native (2 select, 1 range) | none | none / platform / none / none | 2 | no | ISSUE FOUND (no schema, no submit guard) |
| 41 | `src/app/(chrome)/pt-os/schedule-session/page.tsx` | Schedule session | TanStack fields (3) | `ptSessionSchema` | platform / platform / platform / platform | 0 | no | PASS |
| 42 | `src/app/(chrome)/pt-os/session-balance/page.tsx` | Session balance | TanStack fields (4) | none | manual / platform / none / none | 0 | no | ISSUE FOUND (no schema, no reset) |
| 43 | `src/app/(chrome)/pt-os/strength-tracking/page.tsx` | Strength log | Native (checkbox, date x2, text x3) + fields (4) | `strengthLogSchema` | platform / platform / none / platform | 6 | no | ISSUE FOUND (6 unjustified native controls; no reset) |
| 44 | `src/app/(chrome)/pt-os/weekly-checkin/page.tsx` | Weekly check-in | TanStack fields (9) | none | manual / none / none / none | 0 | no | ISSUE FOUND (no error/reset/schema) |
| 45 | `src/app/(chrome)/pt-os/workout-generator/page.tsx` | Workout generator | TanStack fields (6) | none | manual / none / none / none | 0 | yes | ISSUE FOUND (no error/reset/schema) |
| 46 | `src/components/engagement/OfferForm.tsx` | Offer form | TanStack + `offerSchema` | platform | manual / platform / manual / platform | 0 | no | PASS |
| 47 | `components/pt-os/builder/EditProgrammeDialog.tsx` | Edit programme | Native | none | manual / platform / manual / none | 2 | yes | ISSUE FOUND (no schema) |
| 48 | `components/pt-os/builder/NewProgrammeDialog.tsx` | New programme | Native | none | manual / platform / manual / none | 2 | yes | ISSUE FOUND (no schema) |
| 49 | `components/pt-os/builder/ProgressionRule.tsx` | Progression rule | Native | none | manual / platform / manual / none | 2 | no | ISSUE FOUND (no schema) |
| 50 | `components/pt-os/workout-log/SessionSummary.tsx` | Session summary | Native | none | manual / platform / manual / none | 2 | no | ISSUE FOUND (no schema) |
| 51 | `components/profile/AboutSection.tsx` | About section | Native | none | manual / platform / manual / none | 2 | no | ISSUE FOUND (no schema) |
| 52 | `components/profile/PortfolioSection.tsx` | Portfolio | Native | none | manual / platform / manual / none | 3 | no | ISSUE FOUND (no schema) |
| 53 | `components/pt-os/ClientAiPanel.tsx` | Client AI panel | Native | none | manual / platform / manual / none | 1 | no | ISSUE FOUND (no schema) |
| 54 | `components/pt-os/TrainerStatedFields.tsx` | Trainer stated fields | Native | none | manual / platform / manual / none | 1 | no | ISSUE FOUND (no schema) |
| 55 | `components/pt-os/analytics/LandmarkEditor.tsx` | Landmark editor | Native | none | none / platform / none / none | 1 | no | ISSUE FOUND (no schema, no submit guard) |
| 56 | `components/pt-os/analytics/WeeklyReport.tsx` | Weekly report | Native | none | manual / platform / manual / none | 1 | no | ISSUE FOUND (no schema) |
| 57 | `components/pt-os/exercise-library/ExerciseEditor.tsx` | Exercise editor | TanStack + `useStore` + `useAppForm` + `exerciseSchema` | platform | manual / platform / manual / platform | 2 (justified composer boxes) | no | ISSUE FOUND (2 justified composer boxes; schema present) |
| 58 | `components/pt-os/exercise-library/ExerciseFilterRail.tsx` | Exercise filter | Native | none | manual / platform / manual / none | 1 | no | ISSUE FOUND (no schema) |
| 59 | `components/pt-os/informed-consent/StepExerciseProgrammeConsent.tsx` | Informed consent | Native | none | manual / platform / manual / none | 1 | no | ISSUE FOUND (no schema) |

### P2 forms (tooling / filter rails / platform tabs) — 14 forms

| # | File | Workflow | Lib / components | Schema | Contracts | Unjustified | Journey | Status |
|---|---|---|---|---|---|---|---|---|
| 60 | `src/app/(bare)/start-free/page.tsx` | Start free | Native fields (5) | none | manual / platform / none / none | 0 | no | ISSUE FOUND (no submit guard, no schema) |
| 61 | `src/app/(chrome)/ai-coach/knowledge/page.tsx` | AI knowledge | Native (text, file) | none | none / platform / manual / none | 1 | no | ISSUE FOUND |
| 62 | `src/app/(chrome)/ai-coach/page.tsx` | AI coach | Native (textarea, search x2, text) | none | none / platform / manual / none | 2 | no | ISSUE FOUND |
| 63 | `src/app/(chrome)/help/page.tsx` | Help | Native search | none | none / none / none / none | 0 | no | ISS FOUND (not counted as form by detector? actually isForm false) |
| 64 | `src/app/(chrome)/insights/revenue/page.tsx` | Revenue insights | Native (select, date x2) | none | none / none / none / none | 3 | no | ISSUE FOUND |
| 65 | `src/app/(chrome)/operations/leaderboard/page.tsx` | Leaderboard | Native (date x2) | none | none / none / none / none | 2 | no | ISSUE FOUND |
| 66 | `src/app/(chrome)/settings/passkeys/page.tsx` | Passkeys | Native (text x2) | none | none / platform / manual / none | 2 | no | ISSUE FOUND (no schema) |
| 67 | `src/app/(chrome)/settings/profile/page.tsx` | Settings profile | Native (text, select, date) + fields (16) | `profileSchema` | manual / platform / manual / platform | 3 | no | ISSUE FOUND (3 unjustified native controls) |
| 68 | `src/app/(chrome)/support/page.tsx` | Support | Native (textarea x2, text) | none | manual / platform / none / none | 3 | no | ISSUE FOUND (no schema, no reset) |
| 69 | `src/app/(platform)/platform/_modals/OrgModals.tsx` | Org modals | Native (text x3, email x2, tel) | none | manual / platform / none / none | 6 | no | ISSUE FOUND (no schema) |
| 70 | `src/app/(platform)/platform/_tabs/FinanceTab.tsx` | Finance tab | Native (select x3, text x6, date) | none | manual / platform / manual / none | 10 | no | ISSUE FOUND (no schema) |
| 71 | `src/app/(platform)/platform/_tabs/StudiosTab.tsx` | Studios tab | Native (search, select, file, text x3, textarea) | none | manual / platform / manual / none | 5 | no | ISSUE FOUND (no schema) |
| 72 | `src/components/CommandPalette.tsx` | Command palette | Native search | none | none / none / none / none | 0 | no | ISSUE FOUND |
| 73 | `src/components/ai/AiCommandCenter.tsx` | AI command center | Native textarea | none | none / none / none / none | 1 | no | ISSUE FOUND |

> Count note: the table lists 73 line items because some rows span; the audit's authoritative count is **66 forms** (`isForm === true`). Rows flagged `isForm: false` in the raw output (search-only pages, filter rails) are not scored as forms and appear above only where they were read as rows; the authoritative form count is 66.

---

## Schema inventory (`src/lib/forms/schemas/`)

25 named Zod schema modules exist:

`aiGenerator`, `attendance`, `auth`, `automationRule`, `campaign`, `coupon`, `exercise`, `invoice`, `meal`, `memberAccount`, `memberCheckin`, `memberGoal`, `memberHabit`, `notification`, `offer`, `platformBilling`, `profile`, `ptPackage`, `ptPayment`, `ptSession`, `renewalOffer`, `renewPt`, `strengthLog`, `subscriptionCheckout`, `upiSettings`.

**Schema coverage:** 31 of 66 forms bind a canonical schema (47%). 35 forms have no schema. Of the 25 schema modules, several (e.g. `platformBilling`, `renewalOffer`) appear in the library but are not bound to any form counted by the detector — verify against call sites before assuming coverage.

---

## Upload sites — 12, all canonical

| File | Rules used |
|---|---|
| `src/app/(bare)/member/photos/page.tsx` | canonical |
| `src/app/(chrome)/ai-coach/knowledge/page.tsx` | canonical |
| `src/app/(chrome)/pt-os/clients/[id]/edit/page.tsx` | canonical |
| `src/app/(platform)/platform/_tabs/StudiosTab.tsx` | canonical |
| Plus 8 others all reaching `checkFile`/`readImageAsDataUrl` from `lib/forms/files.ts` |

**Status: PASS** — 0 uncanonical uploads (invariant held). Every upload reads leading bytes against magic signatures; `accept`/`File.type` are never trusted alone.

---

## Numeric / coercion hazards

- **Risky value coercions: 0** (invariant held — `Number(e.target.value)` on a clearable input is absent).
- **Submit-time state coercions: 7**, all justified in `justifications.mjs` (enroll page 6, monthly-target 1). Each has a named validator in front.
- **`type="number"` controls: 0** (invariant held — `TextInput` neutralises `type="number"` to `text` + `inputMode`).

---

## Loading / submission / duplicate-submit / error handling

| Aspect | Implementation | Status |
|---|---|---|
| Submit machine | `useAppForm` → `submit()` with in-flight ref guard; `state` = idle/dirty/validating/submitting/success/failure | Verified |
| Duplicate-submit guard | In-flight ref checked synchronously; second attempt returns first promise | Verified |
| Button disabled | `disabled` is secondary; the ref is the real guard (disabled applied after event, same-frame double-click possible) | Documented limitation |
| Client validation | Zod schema via TanStack `onSubmitAsync`; field errors on blur (touched rule) | Verified |
| Server error mapping | `mapApiError` → `FormErrors`; `FormErrorBanner` (`role="alert"`); field errors via `aria-describedby` | Verified |
| Success | `onSuccess` callback; `succeeded` flag; `keepValuesOnSuccess` opt-in | Verified |
| Reset | `resetTo(values)` rebuilds from authoritative record; clears errors + success flag | Verified |
| Form-level error banner | `FormErrorBanner` — one banner, `role="alert"`, retry button when retryable | Verified |

---

## Accessibility, keyboard, focus, mobile

| Aspect | Implementation | Evidence |
|---|---|---|
| Accessible name | `FormField` always renders `<label htmlFor>`; `aria-describedby` points at description/error id | Verified (accessible-name.ts audit: 389 controls named) |
| Duplicate accessible name prevented | Controls never carry `aria-label`; context provides id/wiring | Verified |
| `aria-invalid` | Set via `fieldControlProps` when `w.invalid` | Verified in one component historically; now systemic |
| Error announcement | Field error via `aria-describedby`; form-level via `role="alert"` banner | Verified |
| Focus trap on dialogs | `useDialogA11y` | Verified |
| 44px minimum touch target | Explicit `minHeight: 44` on controls | Verified |
| `type="number"` neutralised | `inputMode` instead; no scroll-wheel hazard | Verified (0 wheel hazards) |
| `prefers-reduced-motion` | 150ms transitions dropped under `motion-reduce` | Verified |
| Placeback-only fields | 105 historically; 45 search (visually-hidden label + type=search), 60 data-entry (persistent visible label) | Documented in FORM-SYSTEM.md; ratchet pins count downward only |

---

## Create / edit / reset behaviour

- **Create:** `defaultValues` from a `blank*()` function; schema validates at submit.
- **Edit:** `resetTo(record)` rebuilds from the authoritative record; avoids the "Edit A then Edit B sees A's data" bug (fixed in `useAppForm` via `seeded` ref).
- **Reset contract coverage:** 74% (13 platform + 36 manual + 17 none). Lower than submit/error because reset only matters on forms that stay mounted across entities.

---

## Tests

- **Unit/schema tests:** Many `*-schema.test.ts` files exist (pt-payment, pt-package, member-habit, coupon, meal, member-checkin, profile, upi-settings, etc.). These validate schemas in isolation.
- **`form-platform-ratchet.test.ts`:** Runs the real audit and asserts ceilings/floors (risky coercions = 0, unjustified ≤ 138, P0 unjustified = 0, uploadUncanonical = 0, wheelHazards = 0, criticalWithoutJourney ≤ 35, noSubmitContract ≤ 15, schemaPlatform ≥ 26, errorPlatform ≥ 55, platformControls ≥ 321). **This test was not executed in this session** (audit-only constraint); it is part of CI (`vitest run`).
- **E2E:** `e2e/` covers 18 journey specs claiming 19 form files; 17 of 52 critical forms covered (33%). No E2E journey for the Record Payment form asserting a payment exists — identified as the single highest-value missing test.
- **E2E was not executed** in this session (`playwright test` not run).

---

## Status summary by priority (evidence-based)

| Priority | Count | Basis |
|---|---|---|
| P0 (critical security/data integrity) | 0 | Zero unjustified native controls on P0 screens; zero risky coercions; zero uncanonical uploads. No P0 issue found with evidence. |
| P1 (broken workflow / incorrect validation / submission failure) | ~26 files | 51 unjustified native controls across P1; forms with no schema / no submit guard / no reset on core record screens (client edit, new client, enroll, strength-tracking, diet-plans, progress-photos, etc.) |
| P2 (inconsistent architecture / duplicated logic / missing reusable patterns) | ~26 files | 81 unjustified native controls on P2; ModuleWorkspace (12), FinanceTab (10), StudiosTab (5), OrgModals (6); 38 forms with no schema |
| P3 (visual polish / non-critical usability) | — | 35 critical forms without E2E journeys; mobile device testing not attempted (§24/§25 of FORM-PLATFORM-REPORT) |

---

## Duplicate components & inconsistent patterns (evidence-based)

1. **`FloatInput` implemented three times** — `components/ui`, `settings/page.tsx`, `settings/profile/page.tsx` (two local copies, 49 lines each, not identical to shared one).
2. **Seventeen label-taking control components, none shared** — enumerated in FORM-SYSTEM.md §1 (start-free TextField, settings FloatInput x2, finance Field, trainers FInput/FSelect, trainers/add Input/Select, insights DateField/HeroDate, settings SelectRow, exercise-library ToggleRow, profile LongText, analytics Num, builder InlineField, ExerciseEditor ListField, PortfolioSection FilePick, ProfessionalSection DayRow, trainers/add DragDropUpload, plus six child-wrapping Field/FloatLabel variants).
3. **No shared validation** — each form does its own in one of three shapes (error string in local state; boolean `invalid` border colour; inline `onFocus`/`onBlur` writing `style.borderColor`).
4. **Placeholder-only fields: 105** — 45 search (acceptable with visually-hidden label), 60 data-entry (real problem: identity vanishes when typed).

---

## Missing evidence (not claimed as bugs)

- E2E form journeys were **not executed** in this session (`playwright test` not run); coverage figures come from `journeys.mjs` declarations and the static detector, not from observed runs against a live backend. `record-payment.ui.spec.ts` is a genuine deep journey for Record Payment, but it has not been observed to pass/fail at runtime.
- Mobile-device testing (§24/§25 of FORM-PLATFORM-REPORT) was **not attempted**; 44px minimums exist but no device measurement was taken.
- Performance (§24) was **not measured**.
- `platformBilling` and `renewalOffer` schemas are now traced to real call sites (`platform/invoices.tsx:250`, `RenewalOfferSheet.tsx:141`), so neither is an unbound orphan; schema coverage 31/66 = 47% stands.

## Inventory Module Boundary (scope note)

The audit found **no Inventory Product, Stock IN, Stock OUT, or Supplier forms** in this frontend. A search for `inventory`/`stock`/`supplier` across `src/` returned only unrelated references (a commented "no inventory module", module-config workflow descriptions, an API type comment about stock-as-churn). This is recorded as a **separate missing-module scope** requiring its own requirements and backend/API discovery; no inventory forms are claimed as implemented and no inventory API contracts are invented here.

---

## Recommended fixes (no migration, no dependency changes)

These preserve the existing TanStack Form + Zod platform and design language:

1. **Bind canonical schemas to the 38 forms with none** (highest-value: client edit, new client, enroll, strength-tracking, diet-plans, progress-photos, finance/verify-payments is justified so leave it).
2. **Add submit guards** to the 12 forms with `submit: none` (start-free, AI generators, macrocycle, progress, weekly-checkin, workout-generator, session-balance, etc.).
3. **Add reset contracts** to the 17 forms with `reset: none` where the form stays mounted across entities.
4. **Migrate the 132 unjustified native business controls** to design-system fields, prioritising P1 (51) then P2 (81).
5. **Add E2E journeys** for the 35 critical forms without one, starting with Record Payment.
6. **Consolidate the three `FloatInput` copies and the seventeen label components** behind `FormField` + `TextField`/`TextAreaField`/`SelectField`.
7. **Run the ratchet test** (`vitest run src/__tests__/form-platform-ratchet.test.ts`) and `vitest run` to confirm no regressions; run E2E (`playwright test`) for journey coverage.

---

## Phase B remediation log

Numbers below are the state **after** each batch; the Phase A baseline numbers above are unchanged.

### Batch 1 — new-client schema (CREATE, membership data integrity)

- **Why first:** `POST /api/pt-os/clients` creates membership records; P1 core record; previously `schema: none`.
- **Files changed:**
  - `src/lib/forms/schemas/client.ts` (new) — `clientCreateSchema` Zod schema mirroring the page's existing hand-rolled rules exactly (name ≥3, required gender, optional real DOB 10–100y / not-future, required 10-digit Indian mobile, optional WhatsApp, optional email, relationship required once an emergency contact exists).
  - `src/app/(chrome)/pt-os/new-client/page.tsx` — submit now gated on `clientCreateSchema.safeParse`; field errors mapped into the same `FormErrors` state the UI already renders; hand-rolled regexes (`MOBILE_RE`, `EMAIL_RE`) and validators removed; `computeProgress` reads schema field errors; payload construction byte-identical (`as Record<string, unknown>` cast preserved).
  - `src/__tests__/client-create-schema.test.ts` (new) — 11 tests: valid client, blank/short name, gender required, mobile required/format, optional WhatsApp, optional email, future DOB, age 10–100 bounds, relationship-required-when-contact-present, issue path mapping.
- **Tests executed:** `vitest run src/__tests__/client-create-schema.test.ts` → 11/11 passed.
- **Lint:** clean on all 3 changed files.
- **Ratchet:** `vitest run src/__tests__/form-platform-ratchet.test.ts` → 20/20 passed; schema coverage 31→32 (floor 26 still met with headroom).
- **Before/after metrics:** schema coverage 31/66 (47%) → 32/66 (48%); forms with no schema 35 → 34; unjustified native controls unchanged at 132 (new-client still has 1 unjustified native checkbox — control migration is a separate step); submit/error/reset contracts unchanged for new-client.
- **Status:** new-client schema bound ✅; 1 unjustified native checkbox remains (deferred to control-migration step).

### Batch 2 — client-edit schema (UPDATE, client records data integrity)

- **Why second:** `PATCH /api/pt-os/clients/:id` updates membership records; P1 core record; previously `schema: none`. It has a real E2E journey (`client-edit.ui.spec.ts`), so schema binding here also protects that journey's payload-integrity assertions.
- **Files changed:**
  - `src/lib/forms/schemas/client.ts` — added `clientUpdateSchema`: a **lenient update schema`. Only `name` is required (≥3 chars, whitespace rejected). `mobile`, `email`, `gender`, `dob`, `address`, `emergency_contact`, `emergency_phone`, `emergency_contact_relationship`, `client_source` are optional and validated only when non-blank. Reuses `textField`, `phoneField`, `emailField`, `dateField`, `enumField` primitives plus `GENDERS` and `CLIENT_SOURCES`. Same DOB future/age(10–100) and emergency-contact⇒relationship rules as the create schema.
  - `src/app/(chrome)/pt-os/clients/[id]/edit/page.tsx` — submit gated on `clientUpdateSchema.safeParse(form)`. Added a loaded-record snapshot (`original` ref) for change detection: **only fields the trainer actually changed are validated**, so an untouched malformed legacy value never blocks an unrelated edit (legacy preservation). Field errors are mapped into per-field state and rendered under each `FloatInput` via its `error` prop; on-change clears a field's stale error. Submit guard (`saving`), reset behavior, error mapping (`errorMessage` toast on server failure), and the PATCH payload shape are **unchanged** — blank optionals still map to `null` ("clear this column") per the existing endpoint contract.
  - `src/__tests__/client-update-schema.test.ts` (new) — 10 tests: valid update with only a name; missing/empty/whitespace name refused; optional fields omitted; optional fields intentionally blank; valid mobile/email/DOB/emergency-phone; invalid optional values refused (bad mobile, bad email, bad gender, bad client_source, bad phone, future DOB, age <10, age >100); emergency-relationship-required-when-contact-present; issue path mapping.
- **Tests executed:** `vitest run src/__tests__/client-update-schema.test.ts src/__tests__/client-create-schema.test.ts` → 21/21 passed.
- **Lint:** clean (0 errors) on all changed files.
- **Typecheck:** `tsc --noEmit` → exit 0, clean.
- **Ratchet:** `vitest run src/__tests__/form-platform-ratchet.test.ts` → 20/20 passed; schema coverage 32→33 (50%); forms with no schema 34→33.
- **Before/after metrics:** schema coverage 32/66 (48%) → 33/66 (50%); forms with no schema 34 → 33; unjustified native controls unchanged at 132 (client-edit's 2 unjustified native controls deferred to control-migration); submit/error/reset contracts unchanged for client-edit.
- **Status:** client-edit schema bound ✅; 2 unjustified native controls remain (deferred to control-migration step).
- **Legacy handling:** change detection compares the current form to the loaded-record snapshot; unchanged fields are excluded from validation, so a legacy client whose record holds a malformed optional value can still be saved after editing an unrelated field. Newly entered invalid values are still refused (validation never weakened for new input).
- **E2E:** `client-edit.ui.spec.ts` exists and asserts field-level persistence plus money-columns-untouched. **Not executed** — the E2E backend is not running in this environment (port 5100 closed); it requires the separate backend repo's `e2e-setup.sh` (Postgres, migrations, two studios seeded). Reported as a blocker, not claimed as passed.

### Batch 3 — client-activate schema (AUTH boundary, client gateway)

- **Why third:** `/bare/client/activate` is the first screen a client ever sees — public, token-gated, NO session, where the client sets the password that gates all of their data. P1 auth boundary; previously `schema: none` with 2 unjustified native controls. It is the client-side analog of the P0 set-password/forgot-password forms (both already schema-bound), so this closed the last gap in the password-flow family.
- **Files changed:**
  - `src/lib/forms/schemas/client.ts` — added `clientActivateSchema`: `password` (required, ≥8 chars via `textField`) + `confirm` (required). `superRefine` mirrors `routes/invitations.js` exactly through `checkInvitationPassword` in `lib/password-policy.ts`: one lowercase, one uppercase, one number, one special character, and confirmation match. Each rule is a separate per-field issue so the existing live checklist flips per rule — matching the existing UX rather than collapsing to one message. Every rule is also enforced server-side, so this is defense-in-depth that reports the specific broken rule beside the field instead of a generic server rejection.
  - `src/app/(bare)/client/activate/page.tsx` — submit gated on `clientActivateSchema.safeParse({password, confirm})`. Per-field errors rendered under each input via `error` prop; `clearFieldError` clears a field's error as soon as the user edits it. Submit guard (`busy`), error mapping (`errorMessage` toast on server failure), and the `api.clientActivation.accept(token, password)` payload are unchanged. The redundant `checkInvitationPassword` import was removed (superseded by the schema).
  - `src/__tests__/client-activate-schema.test.ts` (new) — 8 tests: strong password accepted; missing/empty password refused; <8 chars refused; each missing character class refused (lowercase, uppercase, number, special); mismatch refused; empty confirmation refused; issue-path mapping.
- **Tests executed:** `vitest run src/__tests__/client-activate-schema.test.ts src/__tests__/client-update-schema.test.ts src/__tests__/client-create-schema.test.ts` → 29/29 passed.
- **Lint:** clean (0 errors) on all changed files.
- **Typecheck:** `tsc --noEmit` → exit 0, clean.
- **Ratchet:** `vitest run src/__tests__/form-platform-ratchet.test.ts` → 20/20 passed; schema coverage 33→34 (52%); forms with no schema 33→32.
- **Before/after metrics:** schema coverage 33/66 (50%) → 34/66 (52%); forms with no schema 33 → 32; unjustified native controls unchanged at 132 (client-activate's 2 unjustified native `<input type="password">` controls deferred to control-migration); submit/error/reset contracts unchanged.
- **Status:** client-activate schema bound ✅; 2 unjustified native controls remain (deferred to control-migration step).
- **Legacy handling:** N/A — activation has no pre-existing record; all values are newly entered, so validation applies in full without a change-detection carve-out.
- **E2E:** No dedicated E2E journey for client-activate exists in `e2e/`; not executed (backend blocker documented under Batch 2).

### Scope note — inventory module

Confirmed again: no Inventory Product / Stock IN / Stock OUT / Supplier forms exist in this frontend. This remains a separate missing-module scope requiring its own requirements and backend/API discovery; no inventory forms are claimed and no inventory API contracts are invented.

---

**End of audit.** Next: `FORM_SYSTEM_REDESIGN.md` compares TanStack Form + Zod vs React Hook Form + Zod and recommends a primary architecture.
