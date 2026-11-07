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
| 47 | `components/pt-os/builder/EditProgrammeDialog.tsx` | Edit programme | Design-system fields (1 text, 2 chips, 1 number) | `programmeDetailsSchema` | platform / platform / none / platform | 0 | yes | PASS (modal reset by unmount) |
| 48 | `components/pt-os/builder/NewProgrammeDialog.tsx` | New programme | Design-system fields (4 counted: radio, text, number, search) + 2 chip groups | `programmeCreateSchema` | platform / platform / platform / platform | 0 | no | PASS |
| 49 | `components/pt-os/builder/ProgressionRule.tsx` | Progression rule | Native | none | manual / platform / manual / none | 2 | no | ISSUE FOUND (no schema) |
| 50 | `components/pt-os/workout-log/SessionSummary.tsx` | Session summary | Native | none | manual / platform / manual / none | 2 | no | ISSUE FOUND (no schema) |
| 51 | `components/profile/AboutSection.tsx` | About section | Native | none | manual / platform / manual / none | 2 | no | ISSUE FOUND (no schema) |
| 52 | `components/profile/PortfolioSection.tsx` | Portfolio | TanStack + design-system fields (2 text, 1 textarea) | `portfolioUploadSchema` | platform / platform / platform / platform | 0 | no | PASS |
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

### Batch 4 — client-enroll schema (MONEY + MEMBERSHIP boundary)

- **Why fourth:** `PATCH /api/pt-os/clients/:id` from `/pt-os/clients/[id]/enroll` is the **only** form in the product that both writes the enrolment ledger (`final_amount`, `paid_amount`) and flips `status: 'active'`, establishing the PT term (`pt_start_date`, `pt_end_date`, `duration_months`). P1 core record; previously `schema: none`. It already carried 6 state coercions, all justified.
- **Alternatives considered and why they lose:**
  - `finance/verify-payments` is P0 and financial, but it is a 937-line approval console with four distinct mutations (approve, reject-with-reason, correct amount, add payment) — several forms, not one. Deferred as its own dedicated batch (recommended next).
  - `clients/[id]/page.tsx`, `workout-log*`, `exercise-library`, `progress-photos`: record/media edits with no ledger or membership-status write.
  - `session-balance`: money-adjacent but does not post a payment or change membership.
  - `weekly-checkin`, `macrocycle`, `workout-generator`, `progress`: no money or membership write.
- **Files changed:**
  - `src/lib/forms/schemas/client.ts` — added `clientEnrollSchema` with **exactly the eight fields the page validates and sends**: `startDate` (required, real calendar date), `duration` (required whole number 1–60 — the backend range, so a legacy term longer than the 12-month select remains re-saveable), `trainingMode` (required), `workoutTime` (required, normalises `6:05` → `06:05`), `trainingDays` (≥1 entry), `sessionsPerWeek` (closed set 1–7), `finalAmount` (required money), `amountPaid` (required money). `superRefine` preserves the existing financial rules: **Final Selling Price > 0** and **Amount Paid ≤ Final Selling Price**. `trainerId`, `trainerName`, `workoutExperienceLevel`, `previousTrainerExperience` and `paymentMethod` are deliberately **outside the schema shape**: they are not covered by the page's existing validators, and a malformed legacy value the trainer never touched must not block an enrolment. Added `blankClientEnroll`.
  - `src/app/(chrome)/pt-os/clients/[id]/enroll/page.tsx` — submit now gated on `clientEnrollSchema.safeParse(form)`; schema issues mapped into the same per-field `FormErrors` state the UI already renders; first invalid field still drives the toast and smooth scroll. `validateAll`/`hasErrors` and the four validators only they used were removed (single submit rule set); the four on-blur validators the UI calls remain. **Payload construction is byte-identical** (`status: 'active'`, same keys, same `Number()`/`money()` reads, conditional `payment_method`/agreement spread). Submit guard (`saving`), cold-start retry, `errorMessage` server-error mapping, draft save/restore and post-save "enrolled" state are unchanged.
  - `src/__tests__/client-enroll-schema.test.ts` (new) — 12 tests: valid enrolment; **extra form fields (trainer/experience/payment) ignored even when malformed** (legacy-safety regression test); parsed-value normalisation (numbers, money separator `8,000`, `6:05`→`06:05`); each required field; ≥1 training day; duration boundaries 1/13/60 pass and 0/61/2.5/`abc` fail; sessions 1–7; Final Selling Price > 0 (0 and negative fail, 0.01 passes); Amount Paid 0…final accepted and >final / negative refused; impossible calendar date (2026-02-31); impossible time (25:00, 09:60); issue-path mapping per field.
- **Tests executed:** `vitest run src/__tests__/client-enroll-schema.test.ts` → 12/12 passed. Combined with the ratchet: `vitest run src/__tests__/client-enroll-schema.test.ts src/__tests__/form-platform-ratchet.test.ts` → 32/32 passed. All four client schema suites together (create + update + activate + enroll): 41/41 passed.
- **Lint:** `eslint` on the 3 changed files → exit 0, no output.
- **Typecheck:** `tsc --noEmit` → exit 0, clean.
- **Ratchet:** `vitest run src/__tests__/form-platform-ratchet.test.ts` → 20/20 passed; **no threshold was changed**.
- **Production build:** `next build --webpack` → exit 0.
- **Before/after metrics:** schema coverage 34/66 (52%) → **35/66 (53%)**; forms with no schema 32 → **31**. Unjustified native controls unchanged at **132** (enroll has 0). `submit: none` unchanged at 12 (enroll was `manual`); `reset: none` unchanged at 17 (enroll has no reset — it is a one-shot wizard with draft persistence, noted not changed); risky coercions 0; uncanonical uploads 0.
- **E2E:** a real journey exists — `e2e/enrollment.ui.spec.ts` (prices, agreement gate, signature, balance arithmetic). **Not executed**, for two concrete blockers:
  1. backend `127.0.0.1:5100` unreachable (`curl` → `000`); needs the backend repo's `e2e-setup.sh` (Postgres + migrations + two seeded studios);
  2. `playwright test e2e/enrollment.ui.spec.ts --project=chromium` exits 1 before any test: Playwright wants the frontend on `127.0.0.1:3101`, while a user-owned `next dev` on `:3111` holds the repo's dev lock, so the second `next dev` refuses to start. The user's server was **not** killed or reused.
  No E2E pass is claimed.
- **Status:** client-enroll schema bound ✅. Batch 4 complete; Batch 5 not started.

### Batch 5 — payment-review schema (FINANCIAL / APPROVAL boundary)

- **Why fifth:** `finance/verify-payments` is P0 and financial. Its review dialog is the point where a claimed UPI transfer becomes an irreversible membership activation, a ledger row and a receipt — or is rejected / sent back for correction. It previously had `schema: none`.
- **Scope:** the `ActionDialog` only. The separate `New request` dialog and `components/payments/UpiPayScreen.tsx` are deliberately untouched; those remain separate batches.
- **Files changed:**
  - `src/lib/forms/schemas/paymentReview.ts` (new) — `paymentReviewSchema` as a discriminated union on `kind` (`approve` / `reject` / `correct`). Approval requires only `kind` and carries no reason or note. Rejection and correction require a reason from the backend's closed six-value enum; the note is optional, trimmed, and capped at 500 characters, with whitespace-only notes becoming `null`. `PAYMENT_REVIEW_REASONS` is typed as a subset of `UpiRejectReason` and mirrors the backend order.
  - `src/app/(chrome)/finance/verify-payments/page.tsx` — `ActionDialog.run()` now starts with the existing `busy` guard plus an `inFlight` ref so two taps in the same frame cannot issue two mutations. Validation runs before `setBusy(true)` and before any API call. Field errors render under the reason fieldset and note textarea using the existing error styling and `aria-invalid` / `aria-describedby` wiring; editing a field clears its own error. Reset-on-open also clears field errors. Payloads are unchanged: `approve(row.id)`, and reject/correction with the parsed reason plus `note ?? undefined` (the same trimmed/omitted note as the old `note.trim() || undefined`). Busy state, 409 `Refresh to see the current state.` wording, server-error mapping, success toasts, overpayment warning and the approval confirmation are unchanged.
  - `src/__tests__/payment-review-schema.test.ts` (new) — 29 tests: closed action enum; approve with no fields; approve ignoring irrelevant stale reason/note; schema reasons matching the dialog's `REJECT_REASONS`; every backend reason accepted for both rejection and correction; reason required for both; unsupported reason refused; reason trimming; notes at 500 accepted and 501 refused with the field error; blank/whitespace notes becoming `null`; note trimming; parsed output shape for all three actions.
  - `src/__tests__/payment-review-action.test.tsx` (new) — 7 mocked-API integration tests: approve sends only the order id; reject sends the selected reason and trimmed note; correction uses its own endpoint; two same-frame clicks issue one request; a 501-character note is blocked and its field error shown; 409 keeps the refresh hint; 500 shows the server message without the hint.
- **Tests executed:** `vitest run` on the two Batch 5 suites → **36/36 passed**. The focused set plus the existing payment / form-platform / dialog suites (11 files) → **200/200 passed**, including `form-platform-ratchet.test.ts` 20/20.
- **Lint:** `eslint` on the page, schema and both test files → exit 0, no output.
- **Typecheck:** `tsc --noEmit` → exit 0, clean.
- **Ratchet:** `vitest run src/__tests__/form-platform-ratchet.test.ts` → 20/20 passed; **no threshold was changed**.
- **Production build:** `next build --webpack` → completed successfully; compiled in 2.4 min, TypeScript passed in 25.7 s, all 5 static pages generated, `/finance/verify-payments` emitted.
- **Before/after metrics:** schema coverage **35/66 (53%) → 36/66 (55%)**; forms with no schema **31 → 30**. Controls, unjustified native controls (132), coercions, uploads, submit/reset contracts are unchanged; the review dialog remains `submit: manual`, `error: platform`, `reset: manual`. **Audit caveat:** the metric is file-level. `finance/verify-payments` now reads `schema: platform` because the review dialog binds one; the separate `New request` dialog on the same file is still unbound and was not migrated in this batch.
- **E2E:** the audit reports `hasJourney: false` for this file; no `verify-payments` Playwright journey exists. **Not executed**, and no E2E pass is claimed. The blocker remains the unavailable backend (`127.0.0.1:5100`) and the absence of a throwaway seeded E2E database; changing the E2E environment was out of scope for this batch.
- **Status:** payment-review schema bound for approve / reject / request-correction ✅. Batch 5 complete; `New request` and `UpiPayScreen` remain deferred.

### Batch 6 — session-balance schema (ENTITLEMENT boundary)

- **Why sixth:** `/pt-os/session-balance` creates the row that every "Use 1" click draws down and that `remaining_sessions` is generated from. It was P1, `schema: none`, and the only checks were `if (!clientId || !totalSessions)` plus `parseInt(totalSessions)` — so `2.5` became two sessions with nothing said.
- **Scope:** the create form only. The irreversible `Use 1` consumption action (`useSession`) is behaviorally unchanged: same confirm, same single atomic endpoint, same toast handling, same reload.
- **Alternatives considered and why they lose:** the remaining `schema: none` forms are record/media editors or generators with no entitlement or ledger write. Session balance is the last create form that mints a consumed-by-another-action business balance.
- **Files changed:**
  - `src/lib/forms/schemas/sessionBalance.ts` (new) — `sessionBalanceSchema` with `client_id` required; `total_sessions` required, whole, `1…2,147,483,647`; optional trimmed `package_name` capped at 120; optional real `end_date`. The upper count bound is the `total_sessions INT` column's own ceiling, not a sales policy; the route's truthiness guard and the generated `remaining_sessions` establish the positive minimum. `blankSessionBalance(clientId)` seeds the form from the profile link. `toSessionBalancePayload` emits exactly the old payload shape: numeric count, `package_name ?? undefined`, `end_date ?? undefined`.
  - `src/app/(chrome)/pt-os/session-balance/page.tsx` — create form bound to `useAppForm` with `SelectField`, `NumberField`, `TextField`, `DateFieldControl` and `FormErrorBanner`. The URL-seeded client, labels, placeholder copy, success reset (client kept, other fields cleared), balance refetch and in-flight guard are preserved. The old `clientId`/`totalSessions`/`packageName`/`endDate`/`saving`/`error` state and `parseInt` are gone; invalid input now shows field errors instead of being silently ignored. The list, alert, Low/All filter and `handleUse` are untouched.
  - `src/__tests__/session-balance-schema.test.ts` (new) — 29 tests: valid package; required client; blank/whitespace/zero/negative counts; fractional and unparseable counts; both numeric boundaries and the INT overflow; separator input (`1,200`); optional name trimming/absence/120-char ceiling; optional date absence, real/ISO-timestamp dates and impossible dates; exact payload shape; blank state is empty, not zero.
  - `src/__tests__/session-balance-action.test.tsx` (new) — 12 mocked-API tests: URL seed; exact payload; optional omission; success reset keeps the client; blank client/count blocked; zero/negative/fractional/oversized counts blocked with their field errors; two same-frame clicks issue one create; a 400 shows the server sentence and leaves the values intact; `Use 1` still confirms, calls `useSession` and reports success.
  - `src/__tests__/form-system-guardrails.test.tsx` — the stale manual-binding assertions (`onSubmit={handleCreate}`, `value={totalSessions}`) were replaced with the equivalent second-layer bindings (`form.Field` for client/count/date, schema, payload builder). Behavioral strength is preserved.
  - `src/__tests__/client-profile-wiring.test.ts` — the "failed save is not silent" assertion now points at `FormErrorBanner`/`errors={f.errors}` rather than the removed inline `role="alert"` block.
- **Tests executed:** the two Batch 6 suites → **41/41 passed** (29 schema + 12 action). The focused set plus the existing form guardrails, client-profile wiring and schema suite → **82/82 passed** (3 files). The existing page-shell, form-reset, API-shape and form-field suites → **283/283 passed** (4 files). `form-platform-ratchet.test.ts` → **20/20 passed**.
- **Lint:** `eslint` on the six changed files → exit 0, no errors. Ten pre-existing `no-explicit-any` warnings remain in the page where list rows are read (`sb`, `clients.data`); this batch did not widen them.
- **Typecheck:** `tsc --noEmit` → exit 0, clean.
- **Production build:** `npm run build` (`next build --webpack`) → exit 0; `/pt-os/session-balance` emitted as a dynamic route.
- **Before/after metrics:** schema coverage **36/66 (55%) → 37/66 (56%)**; forms with no schema **30 → 29**. Submit contract `platform 26 → 27`, `manual 28 → 27`; reset `platform 13 → 14`, `none 17 → 16`. Platform controls unchanged at 378; unjustified native controls unchanged at 132; risky coercions 0; uploads 0. No threshold was changed.
- **E2E:** the audit reports `hasJourney: false`; no `session-balance` Playwright journey exists. **Not executed**, and no E2E pass is claimed. Blockers are unchanged: backend `127.0.0.1:5100` is unreachable and there is no throwaway seeded E2E database. No server, port or database was created, changed or stopped.
- **Status:** session-balance create schema bound ✅. Batch 6 complete; waiting for review before the next batch.

### Batch 7 — member UPI proof schema (FINANCIAL / PAYMENT PROOF boundary)

- **Why seventh:** `src/components/payments/UpiPayScreen.tsx` is the remaining P0 form with a real mutation. It tells the studio which bank transfer a member is claiming, and its `UtrForm` posts that reference to `submitUtr` for verification. It was `schema: none` and carried two native controls.
- **Selection:** the other P0 candidate, `(bare)/subscription/page.tsx`, is a coupon lookup with no submit. The workout-log detail is a per-set editor that saves on blur through `inlineNumber`; `lib/forms/inline.ts` documents that schemas do not fit per-blur editors, and there is no submit payload to validate. `UpiPayScreen` is therefore the highest-risk remaining submit form.
- **Scope:** the `UtrForm` inside `UpiPayScreen` only. The payment screen's polling, QR/UPI handoff, status panels, rejection history and the studio/admin UPI settings were untouched.
- **Files changed:**
  - `src/lib/forms/schemas/upiProof.ts` (new) — `upiProofSchema` with the shared `utrField` (12–16 digits, held as a string) and an optional note trimmed and capped at 500. `toUpiProofPayload` emits the exact existing `UpiSubmitUtrInput` shape (`utr`, `screenshot_url`, `screenshot_mime`, `notes`), with nulls when no proof or note exists. The screenshot stays outside the schema: it is optional and its check is an async byte-signature test in `files.ts`, so keeping it in local state preserves “a failed upload does not block recording the payment”.
  - `src/lib/forms/domain.ts` — `normalizeUtrInput` moved beside `utrField` so the member proof form and the platform checkout share one digit-stripping/cap rule.
  - `src/lib/forms/schemas/subscriptionCheckout.ts` — re-exports `normalizeUtrInput` from `domain.ts`; its schema and payloads are unchanged.
  - `src/components/payments/UpiPayScreen.tsx` — `UtrForm` now uses `useAppForm` + `upiProofSchema`, `FormField`/`TextInput`/`TextArea`, field-level errors, `FormErrorBanner` and the platform in-flight submit guard. The UTR remains a string with leading zeros preserved; non-digits are stripped as typed and the visible count stays. The note is no longer hard-capped on the element, so a 501-character paste is reported instead of silently truncated. Upload-first ordering, upload-failure degradation, success toast, reset and refresh are preserved. The submit button is no longer disabled on invalid input; the field error now explains what is wrong.
  - `src/__tests__/upi-proof-schema.test.ts` (new) — 11 tests: 12/14/16-digit acceptance; leading zero preserved; trimming; blank/short/long/non-digit rejection; digit normalization and 16-cap; optional note null/trim/500-boundary; exact payload with and without a proof.
  - `src/__tests__/upi-proof-action.test.tsx` (new) — 13 mocked-API tests: exact payload; leading zero and note trim; typed non-digit stripping; proof upload then payload; upload failure still submits the reference; success reset and refresh; blank/short UTR and 501-char note blocked before either mutation; invalid screenshot bytes reported without upload; same-frame double click issues one submit; 409 keeps the values and shows the server sentence; a 400 UTR sentence is attributed to the field rather than the banner.
  - `src/__tests__/silent-catch-ratchet.test.ts` — the existing `markOpened` fire-and-forget entry moved from line 202 to 210; the file set and count are unchanged.
  - `scripts/form-audit/justifications.mjs` — removed the now-stale two-control justification for `UpiPayScreen` after the UTR and note became platform controls.
- **Tests executed:** the two Batch 7 suites → **24/24 passed** (11 schema + 13 action). Related form/payment suites → **247/247 passed** across 12 files: `invoice-checkout-schema`, `silent-catch-ratchet`, `form-platform-ratchet`, `form-system-guardrails`, `form-field`, `shadow-tokens`, `file-validation`, `use-app-form-reset`, `forms-foundation`, `payments-audit-guards`, `upi-order-term`, `upi-settings-schema`. The platform ratchet is 20/20 and its floors were not changed.
- **Lint:** `eslint` on the seven changed source/test files → exit 0, no output.
- **Typecheck:** `tsc --noEmit` → exit 0, clean.
- **Production build:** `npm run build` (`next build --webpack`) → exit 0; `/member/pay/[orderId]` and `/pay/[orderId]` emitted.
- **Audit:** `node scripts/form-audit/index.mjs` → schema-bound **37/66 (56%) → 38/66 (58%)**; forms with no schema **29 → 28**; submit platform **27 → 28**, manual **27 → 26**, none 12; reset platform **14 → 15**, manual **36 → 35**, none 16; platform controls **378 → 380**; unjustified native controls unchanged at **132**; risky coercions **0**; uncanonical uploads **0**; stale justifications **1 → 0**; P0 unjustified remains **0**.
- **E2E:** the audit reports `hasJourney: false`, and no `e2e/` spec references the member/desk pay screen. **Not executed**, and no E2E pass is claimed. Blocker unchanged: backend `127.0.0.1:5100` is unreachable (`curl` → `000`) and there is no throwaway seeded E2E database. No server, port or database was created, changed or stopped.
- **Status:** member UPI proof schema bound ✅. Batch 7 complete; waiting for review.

### Batch 8 — programme-details schema (CORE TRAINING RECORD / ASSIGNMENT DATES)

- **Why eighth:** a fresh audit found 28 schema-missing forms. The remaining high-risk candidates were checked in this order:
  - `pt-os/clients/[id]/workout-log/[sessionId]/page.tsx` is still schema-missing but is nine per-set blur editors with no submit, payload or reset; all nine controls are justified, and `lib/forms/inline.ts` documents why schemas do not fit per-blur editors.
  - Its `SessionSummary` child is a true submit form, but its optional duration degrades to `null` and no derived record moves when it is invalid.
  - `NewProgrammeDialog` has the same weeks clamp, but creates a new programme; it cannot move an existing assignment's end date.
  - `EditProgrammeDialog` is a true submit form with two unjustified native controls, an existing Playwright journey, and a direct `PUT /api/workouts/plans/:id`. A blank or unparseable weeks box was clamped to `1` on blur, and the backend then calls `syncAssignmentEnds` for every running assignment. That is the highest verified remaining data-integrity risk.
- **Scope:** `src/components/pt-os/builder/EditProgrammeDialog.tsx` only. `NewProgrammeDialog`, the workout-log detail page and `SessionSummary` were not migrated. Closing the modal still unmounts and discards edits; no reset control was added.
- **Files changed:**
  - `src/lib/forms/schemas/programmeDetails.ts` (new) — `programmeDetailsSchema(maxWeeks)` requires a trimmed name (1–120 characters) and whole weeks (1…the plan-specific ceiling). Goal and difficulty are optional trimmed text so a legacy programme that has neither stays blank instead of being assigned a default. `toProgrammeDetailsPatch` emits only changed fields and never invents or clears a goal/difficulty; a legacy value with surrounding whitespace is not treated as an edit.
  - `src/lib/forms/domain.ts` — `programmeWeeksField` now accepts `Partial<NumericFieldOptions>` so the dialog can pass its plan-specific maximum without a cast. Its default 1–104 range and existing callers are unchanged.
  - `src/components/pt-os/builder/EditProgrammeDialog.tsx` — migrated to `useAppForm`, `TextField`, `ChoiceChips`, `NumberField`, `FormErrorBanner` and `SubmitStatus`. The blur clamp is gone: blank weeks now says “Weeks is required.”, unparseable text says “Weeks must be a number.”, and a real value is left exactly as typed. The maximum is `Math.max(52, plan.duration_weeks)` so renaming a longer programme cannot shorten it. The changed-only payload, success refetch, `onSaved`, toast, close-on-cancel and in-flight submit guard are preserved. A server failure now stays open with the form banner instead of only a toast.
  - `src/__tests__/programme-details-schema.test.ts` (new) — 16 tests covering typed conversion, blank legacy goal/difficulty, trimming, required name, the 120/121-character boundary, weeks 1/52 and plan-specific 60/61 boundaries, zero/negative/fractional/blank/unparseable weeks, exact changed-only payloads, legacy whitespace, and the old four-week fallback.
  - `src/__tests__/edit-programme-dialog.test.tsx` — updated goal/difficulty queries from buttons to radios (the shared `ChoiceChips` role), and added four mutation-safety tests: blank name, cleared weeks, unparseable weeks, and a 500 that keeps the dialog open with the banner. The invalid-input tests assert the field error is shown and `update` is not called.
  - `e2e/programme-edit.ui.spec.ts` — goal selection now queries `getByRole('radio', { name: 'Weight Loss' })`, matching the platform control. No journey logic or assertion changed.
- **Tests executed:** the two Batch 8 suites → **27/27 passed** (16 schema + 11 action). Related suites → **268/268 passed** across 16 files: `programme-details-schema`, `edit-programme-dialog`, `new-programme-numbers`, `new-programme-dialog-surface`, `workout-plan-flow`, `workout-programme-create`, `workout-builder-weeks`, `workout-builder-add-route`, `use-app-form-reset`, `form-field`, `form-system-guardrails`, `form-platform-ratchet`, `forms-foundation`, `silent-catch-ratchet`, `api-shape`, `start-without-programme`. The platform ratchet is 20/20 and no floor was changed.
- **Lint:** `eslint` on the six changed source/test files → exit 0, no output.
- **Typecheck:** `tsc --noEmit` → exit 0, clean.
- **Production build:** `npm run build` (`next build --webpack`) → exit 0; TypeScript and all static pages completed.
- **Audit:** `node scripts/form-audit/index.mjs` → schema-bound **38/66 (58%) → 39/66 (59%)**; forms with no schema **28 → 27**; submit platform **28 → 29**, manual **26 → 25**, none 12; reset unchanged at platform 15 / manual 35 / none 16; platform controls **380 → 382**; unjustified native controls **132 → 130**; risky coercions **0**; uncanonical uploads **0**; P0 unjustified remains **0**. `EditProgrammeDialog` now reads `submit: platform`, `error: platform`, `reset: none`, `schema: platform`, `unjustified: 0`, `hasJourney: true`.
- **E2E:** `npx playwright test e2e/programme-edit.ui.spec.ts --list` discovers the three journey tests (rename/goal/length, no-op save, empty name refused). **Not executed**, and no E2E pass is claimed. Blocker unchanged: backend `127.0.0.1:5100` is unreachable (`curl` → `000`), the configured app URL `127.0.0.1:3101` is not running, and there is no throwaway seeded E2E database. No server, port or database was created, changed or stopped.
- **Status:** programme-details schema bound ✅. Batch 8 complete; waiting for review.

### Batch 9 — new-programme schema (CORE TRAINING RECORD / NEW PLAN CREATION)

- **Why ninth:** Batch 8 closed the edit path but deliberately left `NewProgrammeDialog` alone: it had the same weeks clamp, but creates a new programme, so it could not move an existing assignment's end date. It was still a true submit form with no schema, two unjustified native controls, and a direct create followed by assignment. A blank weeks box became a deliberate-looking one-week programme before any client was put on it; a create request that omitted `is_template` was stored as a template, with downstream consequences. It was the highest verified remaining creation risk.
- **Scope:** `src/components/pt-os/builder/NewProgrammeDialog.tsx` plus the shared `RadioField` used for the client picker. The create flow, preset-client behavior, PAR-Q-aware assignment, assignment-failure-continues semantics, success navigation, and the builder handoff are unchanged. The dialog now resets on every open; that is intentional, because it previously kept the last draft and the stale “touched” choices even after the client changed.
- **Files changed:**
  - `src/lib/forms/schemas/programmeCreate.ts` (new) — reuses `programmeDetailsSchema(maxWeeks)` so the name and weeks rules cannot drift from the edit form, then makes client, goal and difficulty required. `programmeCreateDefaults(clientId?)` preserves the old opening values (`muscle_gain`, `intermediate`, weeks `"4"`, optional preset client). `toProgrammeCreatePayload` sends only the create fields, with explicit `is_template: false`, and no `sessions_per_week` or exercises. Blank or unparseable weeks are validation errors, never clamped to `1`.
  - `src/components/pt-os/builder/NewProgrammeDialog.tsx` — migrated to `useAppForm`, `TextField`, `ChoiceChips`, `NumberField`, `RadioField`, `SearchField`, `FormErrorBanner` and `SubmitStatus`. The client picker is a platform radio group with search filtering and a scrollable option list; the radio group is labelled before the filter. Goal/difficulty autofill from a selected client still applies only when the trainer has not touched that field, and the name is never autofilled. Creation still assigns directly, keeps the plan if assignment fails, and navigates to the builder with the returned id. Reopening resets every value and the touched flags.
  - `src/components/ui/form/fields.tsx` — `RadioField` gained optional `before` (content between the legend and the options, used for the client search) and `optionsClassName` (used for the scroll container). Both are additive; existing radio groups are unchanged.
  - `src/__tests__/programme-create-schema.test.ts` (new) — 8 tests covering typed conversion, defaults, required client/name/goal/difficulty, trimming, weeks 1/52, blank/zero/53/fractional/unparseable weeks, the 120/121-character name boundary, and the exact create payload.
  - `src/__tests__/new-programme-numbers.test.tsx` — updated 15 tests for the string-held weeks field: clearing and typing without the 1/18 snap, blur leaves invalid text visible, all five submit-time errors block creation, the typed number reaches the API, no `sessions_per_week` is sent, `is_template: false`, the chosen difficulty is sent, and reopening resets the form.
  - `src/__tests__/workout-programme-create.test.tsx` — 12 tests; missing name/client now assert field errors instead of a toast, and a create failure keeps the dialog open with the server error banner while not navigating.
  - `src/__tests__/workout-plan-flow.test.tsx` — 20 tests; client/goal/difficulty queries now use the platform radio roles and `aria-checked`.
  - `src/__tests__/new-programme-dialog-surface.test.tsx` — 11 tests; the stale `clamp` export assertion was replaced with `WEEKS_MAX === 52`.
  - `src/__tests__/silent-catch-ratchet.test.ts` — line numbers updated for the two retained fallback reads (`247`, `250`); the count is unchanged.
- **Tests executed:** focused Batch 9 suites → **66/66 passed** across 5 files (8 schema + 58 updated existing). Related suites → **153/153 passed** across 6 files (`form-platform-ratchet`, `form-system-guardrails`, `form-field`, `forms-foundation`, `silent-catch-ratchet`, `no-number-wheel-hazard`) and **61/61 passed** across 4 files (`radio-month-fields`, `workout-single-source`, `edit-programme-dialog`, `programme-details-schema`). The platform ratchet is 20/20 and no floor was changed.
- **Lint:** `npm run lint` → exit 0; **0 errors, 137 warnings** tree-wide. The dialog's search `autoFocus` was removed because `useDialogA11y` already focuses the first focusable control; that warning is gone.
- **Typecheck:** `tsc --noEmit` → exit 0, clean.
- **Production build:** `npm run build` (`next build --webpack`) → exit 0; TypeScript and all static pages completed. The first attempt was interrupted by a host/server restart, not by a build error; the clean rerun above is the recorded result.
- **Audit:** `node scripts/form-audit/index.mjs` → schema-bound **39/66 (59%) → 40/66 (61%)**; forms with no schema **27 → 26**; submit platform **29 → 30**, manual **25 → 24**, none 12; reset platform **15 → 16**, manual **35 → 34**, none 16; platform controls **382 → 386**; unjustified native controls **130 → 128**; total controls **226 → 223**; risky coercions **0**; uncanonical uploads **0**; P0 unjustified remains **0**. `NewProgrammeDialog` now reads `submit: platform`, `error: platform`, `reset: platform`, `schema: platform`, `platformControls: 4`, `unjustified: 0`, `hasJourney: false`.
- **E2E:** no `e2e` spec references `NewProgrammeDialog`; the audit reports `hasJourney: false`. No new journey was written and **no E2E pass is claimed**. The existing blocker is unchanged: backend `127.0.0.1:5100` is unreachable (`curl` → `000`), the configured app URL `127.0.0.1:3101` is not running, and there is no throwaway seeded E2E database. No server, port or database was created, changed or stopped.
- **Status:** new-programme schema bound ✅. Batch 9 complete; waiting for review before Batch 10.

### Batch 10 — portfolio-upload schema (PORTFOLIO / ADD-ITEM DIALOG)

- **Why tenth:** the add dialog was a P1 submit form with four counted controls, three of them unjustified native fields (video URL, title, caption), no schema, a manual submit and a direct `api.profile.portfolio.create` mutation. The title and caption relied on native `maxLength`, which silently truncates a paste; the link had only a non-empty check, while the server enforces https and a 500-character ceiling. A bad link was reported as one inline sentence after the upload attempt rather than against the field. The file picker's byte/signature guard was already correct and was kept.
- **Scope:** only the add dialog in `src/components/profile/PortfolioSection.tsx`. The portfolio list, upload, pin, delete, reorder, lightbox and completion callback are unchanged. The native file inputs remain the canonical upload site (`FilePick`), including its `checkFile` validation and per-slot byte ceiling.
- **Files changed:**
  - `src/lib/forms/schemas/portfolioUpload.ts` (new) — empty defaults, a kind-aware schema, and a kind-aware payload. The link is required only for `video_link`, must start with `https://`, and is capped at the server's 500 characters; title/caption are optional, trimmed, and capped at the server's 120/400. The provider allowlist stays server-side. `toPortfolioUploadPayload` omits empty text and never forwards a stale link when the chosen kind is a photo or before/after.
  - `src/components/profile/PortfolioSection.tsx` — migrated the dialog to `useAppForm`, `TextField`, `TextAreaField`, `FormErrorBanner` and `SubmitStatus`. Field errors now appear under the field; a server refusal stays in the form-level banner. The submit button remains disabled while a required file/second image is missing, and the guarded submit path refuses to create when Enter bypasses that disabled button. Kind buttons expose `aria-pressed`; the dialog resets its files and kind on success and close, and rebuilds the form from empty defaults on every open. The existing remaining-slot text, kind switcher, file validation, success toast/refresh callback and close behavior are preserved.
  - `src/__tests__/portfolio-upload-schema.test.ts` (new) — 11 tests covering empty defaults, the video-only required link, https acceptance/rejection, provider-agnostic handling, trimming, 120/121 and 400/401 title/caption boundaries, the 500/501 link boundary, stale-link tolerance when another kind is selected, and the exact payload/omission rules.
  - `src/__tests__/portfolio-upload-dialog.test.tsx` (new) — 6 tests covering the trimmed image payload, video-link payload, a missing video link blocking creation with a field error, both before/after files, a server refusal keeping the dialog and text visible, and a clean reopen after success.
- **Tests executed:** focused Batch 10 suites → **17/17 passed** across 2 files (11 schema + 6 dialog). Related suites → **179/179 passed** across 9 files (`portfolio-embed`, `form-platform-ratchet`, `form-field`, `forms-foundation`, `form-system-guardrails`, `silent-catch-ratchet`, `use-app-form-reset`, `profile-sections-fields`, `no-number-wheel-hazard`). The platform ratchet is 20/20 and no floor was changed.
- **Typecheck:** `npm run typecheck` → exit 0, clean.
- **Lint:** `npm run lint` → exit 0; **0 errors, 137 warnings** tree-wide. The new schema and tests contribute no warnings; the two pre-existing `PortfolioSection` inline-tile click warnings are unchanged.
- **Production build:** `npm run build` (`next build --webpack`) → exit 0; TypeScript and all static pages completed.
- **Audit:** `node scripts/form-audit/index.mjs` → schema-bound **40/66 (61%) → 41/66 (62%)**; forms with no schema **26 → 25**; submit platform **30 → 31**, manual **24 → 23**, none 12; reset platform **16 → 17**, manual **34 → 33**, none 16; platform controls **386 → 389**; unjustified native controls **128 → 125**; total controls **223 → 220**; risky coercions **0**; uncanonical uploads **0**; P0 unjustified remains **0**. `PortfolioSection` now reads `submit/error/reset/schema: platform`, `platformControls: 3`, `unjustified: 0`, `hasJourney: false`; its one native control is the canonical file input (`uploadInputs: 1`, `uploadCanonical: true`).
- **E2E:** no existing `e2e` spec references `PortfolioSection`; the audit reports `hasJourney: false`. No journey was written and **no E2E pass is claimed**. The blocker is unchanged: backend `127.0.0.1:5100` is unreachable (`curl` → `000`), the configured app URL `127.0.0.1:3101` is not running, and there is no throwaway seeded E2E database. No server, port or database was created, changed or stopped.
- **Status:** portfolio-upload schema bound ✅. Batch 10 complete.

### Batch 11 — weekly-check-in schema (CORE RECORD / CLIENT READINGS)

- **Why eleventh:** the trainer's weekly check-in is a P1 core record shared with the member app. It had no schema and parsed every reading with `parseFloat`/`parseInt`: a fractional water count was truncated, `parseInt('4x')` became `4`, and an unparseable weight became `NaN`, which JSON serialises as `null` — indistinguishable from a cleared weight. The server treats a blank reading as "leave the existing value alone", so the form's job is to omit blanks and refuse impossible values before the request leaves the browser.
- **Scope:** the create form only. The client filter, check-in list, chart and insight card are unchanged.
- **Files changed:**
  - `src/lib/forms/schemas/weeklyCheckin.ts` (new) — requires a real client UUID and week-start date, a closed mood enum, and validates the server's own ranges: weight 20–400 kg, sleep 0–24 h, water 0–40 glasses, workouts 0–21, adherence 0–100%, stress/energy/soreness 1–10, notes up to 2,000 characters. `blankWeeklyCheckin` keeps the old "good" mood and leaves every optional blank; `toWeeklyCheckinPayload` omits every blank optional rather than sending zero.
  - `src/app/(chrome)/pt-os/weekly-checkin/page.tsx` — migrated to `useAppForm` with `SelectField`, `DateFieldControl`, `NumberField`, `ChoiceChips` and `TextAreaField`, plus `FormErrorBanner`. The week start is captured once so a page left open overnight does not move the week. A successful save keeps the values for the next client/week, refreshes the list, and clears the saved label before any retry so a refusal cannot sit under "Saved!".
  - `src/__tests__/weekly-checkin-schema.test.ts` (new) — 10 tests covering blank defaults, client/date requirements, all five moods, weight boundaries and halves, fractional sleep, refusal of fractional water/workouts, fractional adherence, whole readiness readings, notes trimming/cap, and the exact payload with blanks omitted.
  - `src/__tests__/weekly-checkin-action.test.tsx` (new) — 17 mocked-API tests covering the typed payload, omitted blanks, list refetch, disabled submit until a client is chosen, fractional/unparseable/out-of-range readings blocked before mutation, same-frame double-click protection, server-error retention, and the success path.
- **Tests executed:** focused Batch 11 suites → **27/27 passed** (10 schema + 17 action). The focused form set plus the platform ratchet and silent-catch ratchet → **321/321 passed** across 22 files. The platform ratchet is 20/20 and no floor was changed.
- **Typecheck:** `npm run typecheck` → exit 0, clean.
- **Lint:** `npm run lint` → exit 0; **0 errors, 134 warnings** tree-wide (pre-existing warnings only).
- **Production build:** `npm run build` (`next build --webpack`) → exit 0; TypeScript and all static pages completed.
- **Audit:** `node scripts/form-audit/index.mjs` → weekly-checkin now reads `submit/error/schema: platform`, 11 platform controls, 0 unjustified, 0 coercions; schema-bound forms 42/66. No threshold was changed.
- **E2E:** no `e2e` spec references the weekly check-in; the audit reports `hasJourney: false`. No journey was written and **no E2E pass is claimed**. The blocker is unchanged: backend `127.0.0.1:5100` is unreachable and there is no throwaway seeded E2E database.
- **Status:** weekly-check-in schema bound ✅. Batch 11 complete.

### Scope note — inventory module

Confirmed again: no Inventory Product / Stock IN / Stock OUT / Supplier forms exist in this frontend. This remains a separate missing-module scope requiring its own requirements and backend/API discovery; no inventory forms are claimed and no inventory API contracts are invented.

---

**End of audit.** Next: `FORM_SYSTEM_REDESIGN.md` compares TanStack Form + Zod vs React Hook Form + Zod and recommends a primary architecture.
