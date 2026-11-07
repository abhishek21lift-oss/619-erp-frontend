# Global Input Placeholder Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove every instructional, example, default-value and search placeholder from the MY PT STUDIO frontend, leaving labels, accessibility names, validation and form behaviour untouched.

**Architecture:** Two stages. First the shared controls stop emitting placeholder text centrally, so no shared input can display one. Then each feature area loses its raw attributes and dead strings. A final pass removes the now-unused props from the shared APIs and adds a source guardrail so the pattern cannot return.

**Tech Stack:** Next.js, React, TypeScript, Tailwind, TanStack Form, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-05-global-input-placeholder-removal-design.md`

## Global Constraints

- Frontend only: `619-erp-frontend`. No API, schema, migration, backend or business-logic changes.
- Never remove or modify labels, `aria-label`, `aria-labelledby`, `aria-describedby`, descriptions, errors, required markers, option values, defaults, input names/types, or submit handlers.
- No redesign: dimensions, radius, spacing, typography, colour and responsive layout are untouched.
- Preserve existing select empty values and validation. An unset select must still look unset.
- Do not touch unrelated uncommitted changes. All edits are line-targeted; never reset or clean.
- Do not commit or push. Leave the work in the working tree.
- Retained on purpose: `placeholder="—"` in dense numeric log grids, one `placeholder="kg"` unit cue on the unlabelled training-max input, `Loading…` status text, automation `{{name}}` tokens, and CSS `placeholder:` utilities.
- After each task: `npx tsc --noEmit` passes, the task's `rg` check returns only the retained values, and the named tests pass.

## Review Focus

- A search box now shows only its magnifier; its visually-hidden label or `aria-label` must still name it.
- A select with no value must render a blank empty option, not the first real option, and required validation must still fire.
- A field whose only name was its placeholder must still have a label or accessible name; the accessible-name audit is the check.
- Removing a dynamic placeholder must not delete a value, a loading state, or leave an unused variable.
- Chat and AI composers must still send, clear and handle Enter after losing their placeholder.

---

### Task 1: Shared controls stop emitting placeholder text

**Files:**
- Modify: `src/components/ui/form/fields.tsx`
- Modify: `src/components/ui/form/controls.tsx`
- Modify: `src/components/ui/FloatInput.tsx`
- Modify: `src/components/landing/SoftField.tsx`
- Modify: `src/components/pt-os/SearchableSelect.tsx`
- Modify: `src/components/chat/ChatComposer.tsx`
- Modify: `src/components/search/GlobalSearch.tsx`
- Modify: `src/components/fitness/AiCoachPanel.tsx`
- Modify call sites for `SelectField.placeholderOption`: `src/app/(bare)/member/goals/page.tsx`, `src/app/(chrome)/pt-os/session-balance/page.tsx`, `src/app/(chrome)/pt-os/weekly-checkin/page.tsx`, `src/app/(chrome)/ai/workout-generator/page.tsx`, `src/components/pt-os/exercise-library/ExerciseEditor.tsx`
- Test: `src/__tests__/form-field.test.tsx`

**Interfaces:**
- Consumes: existing `BoundFieldProps`, `SelectFieldProps`, `SearchFieldProps`, `FloatInputProps`, `SoftFieldProps`, `SearchableSelectProps`, `ChatComposer` props.
- Produces: the same component names and call signatures, minus placeholder output. `SelectField` no longer accepts `placeholderOption`; it always renders `<option value="" disabled />` first. `AiCoachPanel`'s inner select takes `ariaLabel: string` instead of `placeholder`.

- [ ] **Step 1: Write the failing tests**

In `src/__tests__/form-field.test.tsx`, replace the `defaults the placeholder to the label` test with:

```tsx
it('renders no placeholder', () => {
  render(<SearchField label="Search invoices" />);
  expect(screen.getByLabelText('Search invoices')).not.toHaveAttribute('placeholder');
});
```

Add to the same file:

```tsx
it('leaves an unset select blank, with no instructional first option', () => {
  const field = {
    name: 'plan',
    state: { value: '', meta: { errors: [], isTouched: false } },
    handleChange: () => {},
    handleBlur: () => {},
  };
  render(
    <SelectField
      field={field}
      label="Plan"
      required
      options={[{ value: 'gold', label: 'Gold' }]}
    />,
  );
  const select = screen.getByLabelText('Plan');
  const empty = select.querySelector('option[value=""]');
  expect(select).toBeRequired();
  expect(empty).not.toBeNull();
  expect(empty).toHaveTextContent('');
});
```

Import `SelectField` from `@/components/ui/form` in that test.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/__tests__/form-field.test.tsx`
Expected: FAIL — `SearchField` has `placeholder="Search invoices"`; `SelectField` renders no empty option.

- [ ] **Step 3: Suppress placeholder output centrally**

- `fields.tsx`: keep `placeholder?: string` on `BoundFieldProps` for now, but stop destructuring and forwarding it in `TextField`, `TextAreaField` and `NumberField`. Remove `placeholderOption` from `SelectFieldProps`; render `<option value="" disabled />` before the mapped options **only when no option already has `value === ''`** (some selects have a meaningful `Unspecified` option).
- `controls.tsx`: `SearchField` keeps the prop in its type for now but does not forward it and no longer defaults it to `label`.
- `FloatInput.tsx`: stop destructuring and passing `placeholder` to the input/textarea.
- `SoftField.tsx`: `SoftTextField` stops destructuring and forwarding `placeholder`.
- `SearchableSelect.tsx`: keep the prop in the type for now but render `selected?.label ?? value ?? ''` when there is no match, so a freeform value survives; remove `placeholder="Search..."` from the in-panel filter input.
- `ChatComposer.tsx`: keep the prop in the type for now but never forward it to the textarea.
- `GlobalSearch.tsx`: remove `placeholder={placeholder}` from both inputs; delete `PLACEHOLDERS`, `usePlaceholder` and the `const placeholder = usePlaceholder()` line. Keep the magnifier, `aria-label="Search clients"` and all query behaviour.
- `AiCoachPanel.tsx`: rename the inner `SelectInput` prop `placeholder` to `ariaLabel`; use it for `aria-label` and render `<option value="" />`. Update its two call sites to `ariaLabel="Goal"` and `ariaLabel="Experience level"`. Remove the `1–7`, chat prompt and `Search clients...` placeholders; those controls already have `aria-label`s.
- Remove `placeholderOption="…"` from the five call sites listed above.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/__tests__/form-field.test.tsx src/__tests__/chat-thread.test.tsx src/__tests__/ai-coach-panel.test.tsx`
Expected: PASS.

- [ ] **Step 5: Typecheck and lint the changed files**

Run: `npx tsc --noEmit`
Run: `npx eslint src/components/ui/form/fields.tsx src/components/ui/form/controls.tsx src/components/ui/FloatInput.tsx src/components/landing/SoftField.tsx src/components/pt-os/SearchableSelect.tsx src/components/chat/ChatComposer.tsx src/components/search/GlobalSearch.tsx src/components/fitness/AiCoachPanel.tsx`
Expected: no errors.

- [ ] **Step 6: Confirm the shared surfaces are clean**

Run: `rg -n 'placeholder=|placeholderOption=' src/components/ui/form src/components/ui/FloatInput.tsx src/components/landing/SoftField.tsx src/components/pt-os/SearchableSelect.tsx src/components/chat/ChatComposer.tsx src/components/search/GlobalSearch.tsx src/components/fitness/AiCoachPanel.tsx`
Expected: no matches (except comments; inspect and leave comments alone).

---

### Task 2: PT-OS clients and scheduling

**Files:**
- `src/app/(chrome)/pt-os/clients/[id]/edit/page.tsx`
- `src/app/(chrome)/pt-os/clients/[id]/enroll/page.tsx`
- `src/app/(chrome)/pt-os/clients/[id]/page.tsx`
- `src/app/(chrome)/pt-os/clients/[id]/payments/page.tsx`
- `src/app/(chrome)/pt-os/clients/[id]/renew/page.tsx`
- `src/app/(chrome)/pt-os/clients/birthdays/page.tsx`
- `src/app/(chrome)/pt-os/clients/page.tsx`
- `src/app/(chrome)/pt-os/new-client/page.tsx`
- `src/app/(chrome)/pt-os/schedule-session/page.tsx`
- `src/app/(chrome)/pt-os/sessions/page.tsx`
- `src/app/(chrome)/pt-os/attendance/page.tsx`
- `src/app/(chrome)/pt-os/weekly-checkin/page.tsx`
- `src/app/(chrome)/pt-os/availability/page.tsx`
- `src/app/(chrome)/pt-os/session-balance/page.tsx`
- `src/app/(chrome)/pt-os/balance-sheet/page.tsx`
- `src/app/(chrome)/pt-os/cardio-calculator/page.tsx`
- `src/app/(chrome)/pt-os/progress/page.tsx`
- `src/app/(chrome)/pt-os/form-checks/page.tsx`
- `src/app/(chrome)/pt-os/activity-log/page.tsx`
- `src/app/(chrome)/pt-os/leads/page.tsx`
- `src/app/(chrome)/pt-os/messages/page.tsx`
- `src/components/pt-os/RenewalOfferSheet.tsx`
- `src/components/pt-os/ClientAiPanel.tsx`
- `src/components/pt-os/shared/ClientPicker.tsx`
- `src/components/pt-os/shared/SignaturePad.tsx`
- `src/components/pt-os/leads/LeadFormFields.tsx`
- `src/components/pt-os/analytics/LandmarkEditor.tsx`
- `src/components/pt-os/analytics/WeeklyReport.tsx`

**Interfaces:**
- Consumes: the shared controls from Task 1.
- Produces: no changed signatures. Only attributes, dead strings and dead variables are removed.

- [ ] **Step 1: Remove placeholders in the listed files**

Delete every `placeholder="…"` / `placeholder={…}` attribute, except `placeholder="—"` in dense numeric grids. For each deletion:
- Keep the control's label, `aria-label`, `name`, `value`, `onChange`, `type`, `inputMode`, `min`/`max`, and required marker.
- For `<option value="">Select …</option>`, keep `<option value="" />`.
- If a string or variable existed only for the placeholder (for example `placeholder={form.name}`), remove the now-unused declaration. Run `npx tsc --noEmit` and ESLint to catch leftovers.
- Do not touch `placeholder="—"` or the unit cue.

- [ ] **Step 2: Check the area**

Run: `rg -n 'placeholder=|placeholderOption=' 'src/app/(chrome)/pt-os/clients' 'src/app/(chrome)/pt-os/new-client' 'src/app/(chrome)/pt-os/schedule-session' 'src/app/(chrome)/pt-os/sessions' 'src/app/(chrome)/pt-os/attendance' 'src/app/(chrome)/pt-os/weekly-checkin' 'src/app/(chrome)/pt-os/availability' 'src/app/(chrome)/pt-os/session-balance' 'src/app/(chrome)/pt-os/balance-sheet' 'src/app/(chrome)/pt-os/cardio-calculator' 'src/app/(chrome)/pt-os/progress' 'src/app/(chrome)/pt-os/form-checks' 'src/app/(chrome)/pt-os/activity-log' 'src/app/(chrome)/pt-os/leads' 'src/app/(chrome)/pt-os/messages' src/components/pt-os/RenewalOfferSheet.tsx src/components/pt-os/ClientAiPanel.tsx src/components/pt-os/shared src/components/pt-os/leads src/components/pt-os/analytics`
Expected: only `placeholder="—"` lines remain.

- [ ] **Step 3: Typecheck and run the area tests**

Run: `npx tsc --noEmit`
Run: `npx vitest run src/__tests__/clients-server-filter.test.ts src/__tests__/client-profile-premium.test.ts src/__tests__/client-profile-render.test.tsx src/__tests__/client-profile-wiring.test.ts src/__tests__/balance-sheet-page.test.tsx src/__tests__/cardio-fitt-page.test.tsx src/__tests__/availability-windows.test.ts`
Expected: PASS.

---

### Task 3: PT-OS training content

**Files:**
- `src/app/(chrome)/pt-os/workout-generator/page.tsx`
- `src/app/(chrome)/pt-os/workout-plans/page.tsx`
- `src/app/(chrome)/pt-os/exercise-library/page.tsx`
- `src/app/(chrome)/pt-os/diet-plans/page.tsx`
- `src/app/(chrome)/pt-os/clients/[id]/workout-log/page.tsx`
- `src/app/(chrome)/pt-os/clients/[id]/workout-log/[sessionId]/page.tsx`
- `src/components/pt-os/TrainerStatedFields.tsx`
- `src/components/pt-os/builder/ExerciseCard.tsx`
- `src/components/pt-os/builder/NewProgrammeForm.tsx`
- `src/components/pt-os/exercise-library/ExerciseEditor.tsx`
- `src/components/pt-os/exercise-library/ExerciseCommandPalette.tsx`
- `src/components/pt-os/workout-log/ExercisePicker.tsx`
- `src/components/pt-os/workout-log/SessionSummary.tsx`
- `src/components/pt-os/goal-assessment/ReviewSignOff.tsx`
- `src/components/pt-os/goal-assessment/StepChallenges.tsx`
- `src/components/pt-os/goal-assessment/StepMeasureTarget.tsx`
- `src/components/pt-os/goal-assessment/StepPrimaryGoal.tsx`
- `src/components/pt-os/goal-assessment/StepSmartGoal.tsx`
- `src/components/pt-os/interview/InterviewControls.tsx`
- `src/components/pt-os/interview/questions.ts`
- `src/components/pt-os/fitness-testing/StepFlexibility.tsx`
- `src/components/pt-os/fitness-testing/flexibility/TestScreen.tsx`
- `src/components/pt-os/fitness-testing/flexibility/fields.tsx`
- `src/components/pt-os/parq/StepMedicalClearance.tsx`

**Interfaces:**
- Consumes: shared controls from Task 1.
- Produces: `questions.ts` `ControlBase` loses its `placeholder?: string` member; all question data loses the `placeholder` key. `TrainerStatedFields` `FIELDS` loses `placeholder`. `ExerciseEditor`'s coaching tuple becomes `[name, label]`. Its `ListField` may lose a now-unused `placeholder` prop.

- [ ] **Step 1: Remove placeholders in the listed files**

Delete every placeholder attribute, except `placeholder="—"` in the workout-log grids and the single `placeholder="kg"` on the workout-generator training-max input.
- `questions.ts`: remove `placeholder?: string` from the text-control type and the eight `placeholder:` values. `InterviewControls` stops passing `control.placeholder`.
- `TrainerStatedFields.tsx`: remove the `placeholder` key from `FIELDS` and the dynamic `placeholder={recorded ? … : f.placeholder}` attribute. Keep the recorded-state opacity and the explanatory paragraph.
- `ExerciseEditor.tsx`: remove the step-instructions and breathing placeholders; change the coaching tuple to `[name, label]` and drop the `placeholder` argument from `ListField` if it becomes unused. Change the two `{ value: '', label: 'Select…' }` options to `{ value: '', label: '' }`; keep the meaningful `Unspecified` options.
- `ExerciseCard.tsx`: remove the `tempo` and `superset_group` placeholder values from the field config.
- Preserve all labels and `aria-label`s.

- [ ] **Step 2: Check the area**

Run: `rg -n 'placeholder=|placeholderOption=|placeholder:' 'src/app/(chrome)/pt-os/workout-generator' 'src/app/(chrome)/pt-os/workout-plans' 'src/app/(chrome)/pt-os/exercise-library' 'src/app/(chrome)/pt-os/diet-plans' 'src/app/(chrome)/pt-os/clients/[id]/workout-log' src/components/pt-os/TrainerStatedFields.tsx src/components/pt-os/builder src/components/pt-os/exercise-library src/components/pt-os/workout-log src/components/pt-os/goal-assessment src/components/pt-os/interview src/components/pt-os/fitness-testing src/components/pt-os/parq`
Expected: only `placeholder="—"` and `placeholder="kg"` remain.

- [ ] **Step 3: Typecheck and run the area tests**

Run: `npx tsc --noEmit`
Run: `npx vitest run src/__tests__/ai-workout-generator-page.test.tsx src/__tests__/ai-generator-inputs.test.tsx src/__tests__/add-exercises-page.test.tsx src/__tests__/exercise-library-edit.test.tsx src/__tests__/exercise-card-actions.test.tsx src/__tests__/exercise-card-readonly.test.tsx src/__tests__/exercise-picker-custom.test.tsx src/__tests__/new-programme-numbers.test.tsx src/__tests__/interview-page.test.tsx src/__tests__/flexibility-test-screen-protocol.test.tsx src/__tests__/parq-intake-flow.test.ts src/__tests__/goal-prefill.test.ts`
Expected: PASS.

---

### Task 4: Member, auth and subscription

**Files:**
- `src/app/(bare)/member/account/page.tsx`
- `src/app/(bare)/member/checkin/page.tsx`
- `src/app/(bare)/member/form-check/page.tsx`
- `src/app/(bare)/member/goals/page.tsx`
- `src/app/(bare)/member/habits/page.tsx`
- `src/app/(bare)/member/messages/page.tsx`
- `src/app/(bare)/forgot-password/page.tsx`
- `src/app/(bare)/reset-password/page.tsx`
- `src/app/(bare)/subscription/page.tsx`
- `src/app/(bare)/subscription/checkout/[id]/page.tsx`
- `src/app/(chrome)/subscription/packages/page.tsx`
- `src/components/auth/SignInScreen.tsx`
- `src/components/member/GuidedWorkout.tsx`

**Interfaces:**
- Consumes: shared controls from Task 1.
- Produces: no changed signatures. The `ChatThread` caller stops passing `placeholder`; the prop remains until Task 7.

- [ ] **Step 1: Remove placeholders in the listed files**

Delete every placeholder attribute and the now-dead strings/variables. Keep labels, `aria-label`s, password hints that are outside the control, validation, defaults, and the check-in scale labels. On member messages, remove the `placeholder` prop passed to `ChatThread`; keep the thread's empty state.

- [ ] **Step 2: Check the area**

Run: `rg -n 'placeholder=|placeholderOption=' 'src/app/(bare)/member' 'src/app/(bare)/forgot-password' 'src/app/(bare)/reset-password' 'src/app/(bare)/subscription' 'src/app/(chrome)/subscription/packages' src/components/auth src/components/member/GuidedWorkout.tsx`
Expected: no matches.

- [ ] **Step 3: Typecheck and run the area tests**

Run: `npx tsc --noEmit`
Run: `npx vitest run src/__tests__/member-more-page.test.tsx src/__tests__/member-checkin-schema.test.ts src/__tests__/member-habit-schema.test.ts src/__tests__/member-habits-journal.repro.test.tsx src/__tests__/checkin.test.ts src/__tests__/auth-schema.test.ts src/__tests__/auth-heading.test.tsx src/__tests__/password-policy.test.ts`
Expected: PASS.

---

### Task 5: Studio chrome, finance, engagement and profile

**Files:**
- `src/app/(chrome)/finance/collected-payments/page.tsx`
- `src/app/(chrome)/finance/dues/page.tsx`
- `src/app/(chrome)/finance/invoices/page.tsx`
- `src/app/(chrome)/finance/record-payment/page.tsx`
- `src/app/(chrome)/finance/verify-payments/page.tsx`
- `src/app/(chrome)/engagement/automation/page.tsx`
- `src/app/(chrome)/engagement/campaigns/page.tsx`
- `src/app/(chrome)/engagement/feedback/page.tsx`
- `src/app/(chrome)/engagement/notifications/page.tsx`
- `src/app/(chrome)/engagement/whatsapp/page.tsx`
- `src/app/(chrome)/settings/integrations/page.tsx`
- `src/app/(chrome)/settings/passkeys/page.tsx`
- `src/app/(chrome)/settings/profile/page.tsx`
- `src/app/(chrome)/support/page.tsx`
- `src/app/(chrome)/help/page.tsx`
- `src/app/(chrome)/ai-coach/knowledge/page.tsx`
- `src/app/(chrome)/ai-coach/page.tsx`
- `src/app/(chrome)/ai/diet-generator/page.tsx`
- `src/app/(chrome)/ai/workout-generator/page.tsx`
- `src/app/(chrome)/training/transformations/page.tsx`
- `src/components/engagement/OfferForm.tsx`
- `src/components/packages/PackageForm.tsx`
- `src/components/payments/UpiPayScreen.tsx`
- `src/components/payments/UpiSettingsPanel.tsx`
- `src/components/profile/AboutSection.tsx`
- `src/components/profile/AchievementsSection.tsx`
- `src/components/profile/EducationSection.tsx`
- `src/components/profile/PortfolioSection.tsx`
- `src/components/profile/ProfessionalSection.tsx`
- `src/components/CommandPalette.tsx`
- `src/components/ai/AiClientPicker.tsx`
- `src/components/ai/AiCommandCenter.tsx`
- `src/components/revenue/MonthlyTargetHero.tsx`

**Interfaces:**
- Consumes: shared controls from Task 1.
- Produces: `AboutSection`'s `LongText` loses its `hint` prop; `ChipInput`'s `placeholder` prop becomes `label` and the call site passes `label="Language"`. No other signature changes.

- [ ] **Step 1: Remove placeholders in the listed files**

Delete every placeholder attribute and dead string/variable.
- `AboutSection.tsx`: remove `hint` from `LongText` and its three call sites. Remove the textarea placeholder. Rename `ChipInput`'s `placeholder` prop to `label`, pass `label="Language"`, remove the input placeholder and the "maximum" placeholder text. Keep the `empty` message.
- `engagement/whatsapp`: remove the long custom-message placeholder; keep the template-variable guidance outside the control if it already exists.
- `profile/*`: remove example strings; keep labels and the profile limit counters.
- `PackageForm`, `OfferForm`, `Upi*`: remove examples; keep labels, suffixes and validation.
- Keep the `kg`/unit cue only in Task 3's training-max field; none here.

- [ ] **Step 2: Check the area**

Run: `rg -n 'placeholder=|placeholderOption=' 'src/app/(chrome)/finance' 'src/app/(chrome)/engagement' 'src/app/(chrome)/settings' 'src/app/(chrome)/support' 'src/app/(chrome)/help' 'src/app/(chrome)/ai-coach' 'src/app/(chrome)/ai' 'src/app/(chrome)/training/transformations' src/components/engagement src/components/packages src/components/payments src/components/profile src/components/CommandPalette.tsx src/components/ai src/components/revenue`
Expected: no matches.

- [ ] **Step 3: Typecheck and run the area tests**

Run: `npx tsc --noEmit`
Run: `npx vitest run src/__tests__/invoices-page.test.tsx src/__tests__/package-create-page.test.tsx src/__tests__/offer-form-schema.test.ts src/__tests__/payment-request-dialog.test.tsx src/__tests__/payment-review-action.test.tsx src/__tests__/engagement-charts.test.tsx src/__tests__/ai-coach-panel.test.tsx src/__tests__/ai-knowledge-reindex.test.tsx src/__tests__/chat-thread.test.tsx`
Expected: PASS.

---

### Task 6: Platform

**Files:**
- `src/app/(platform)/platform/_modals/OrgModals.tsx`
- `src/app/(platform)/platform/_shared/CommandBar.tsx`
- `src/app/(platform)/platform/_shared/ui.tsx`
- `src/app/(platform)/platform/_tabs/CouponsTab.tsx`
- `src/app/(platform)/platform/_tabs/FinanceTab.tsx`
- `src/app/(platform)/platform/_tabs/KnowledgeTab.tsx`
- `src/app/(platform)/platform/_tabs/StudiosTab.tsx`
- `src/app/(platform)/platform/_tabs/UsersTab.tsx`
- `src/components/platform/ai-control.tsx`
- `src/components/platform/audit-centre.tsx`
- `src/components/platform/feature-manager.tsx`
- `src/components/platform/hosting-assistant.tsx`
- `src/components/platform/hosting-centre.tsx`
- `src/components/platform/hosting-shared.tsx`
- `src/components/platform/hosting-vps.tsx`
- `src/components/platform/invitations.tsx`
- `src/components/platform/invoices.tsx`
- `src/components/platform/live-logs.tsx`
- `src/components/platform/mission-control/AiOperations.tsx`
- `src/components/platform/mission-control/Silences.tsx`
- `src/components/platform/notification-centre.tsx`
- `src/components/platform/security-centre.tsx`
- `src/components/platform/subscription-requests.tsx`
- `src/components/platform/support-centre.tsx`
- `src/lib/forms/schemas/platformBilling.ts`

**Interfaces:**
- Consumes: shared controls from Task 1.
- Produces: `BILLING_TEXT_FIELDS` loses its `placeholder` member and values; `platformBilling`'s field type loses `placeholder?: string`. `StudiosTab`'s `FIELDS` loses `placeholder`. The `Loading…` status text is retained.

- [ ] **Step 1: Remove placeholders in the listed files**

Delete every placeholder attribute. Remove `placeholder` keys from `BILLING_TEXT_FIELDS`, its type, and `StudiosTab`'s `FIELDS`. For `placeholder={form ? f.placeholder : 'Loading…'}`, remove the whole attribute; the disabled state already communicates loading. Keep labels, descriptions and every command-bar/search behaviour.

- [ ] **Step 2: Check the area**

Run: `rg -n 'placeholder=|placeholderOption=|placeholder:' 'src/app/(platform)' src/components/platform src/lib/forms/schemas/platformBilling.ts`
Expected: only comments, if any; no attributes or config keys.

- [ ] **Step 3: Typecheck and run the area tests**

Run: `npx tsc --noEmit`
Run: `npx vitest run src/__tests__/platform-knowledge.test.tsx src/__tests__/mission-control.test.ts src/__tests__/live-logs-polling.test.tsx src/__tests__/command-panel-api-restart.test.tsx src/__tests__/coupon-schema.test.ts`
Expected: PASS.

---

### Task 7: Remove the dead props, add the guardrail, final audit

**Files:**
- Modify: `src/components/ui/form/fields.tsx`
- Modify: `src/components/ui/form/controls.tsx`
- Modify: `src/components/ui/FloatInput.tsx`
- Modify: `src/components/landing/SoftField.tsx`
- Modify: `src/components/pt-os/SearchableSelect.tsx`
- Modify: `src/components/chat/ChatComposer.tsx`
- Modify: `src/components/chat/ChatThread.tsx`
- Test: `src/__tests__/form-field.test.tsx`
- Test: `src/__tests__/form-system-guardrails.test.tsx`
- Create: `docs/audits/placeholder-removal-2026-11-05.md`

**Interfaces:**
- Consumes: all prior removals.
- Produces: `BoundFieldProps`, `SearchFieldProps`, `FloatInput` props, `SoftField` props, `SearchableSelectProps`, `ChatComposer` props and `ChatThread` props no longer declare `placeholder`. No call site passes one.

- [ ] **Step 1: Remove the dead props**

- `BoundFieldProps`: delete `placeholder?: string`.
- `SearchFieldProps`: delete `placeholder?: string`; remove it from the doc comment.
- `FloatInput` and `SoftField` prop types: delete `placeholder?: string`.
- `SearchableSelectProps`: delete `placeholder?: string`; remove the now-unused doc line.
- `ChatComposer` / `ChatThread`: delete `placeholder?: string` and the default `'Write a message…'`; remove the prop from the member messages call site if it remains.
- `form-field.test.tsx`: remove `placeholder="Search clients…"` from the "keeps its name after the user types" render.

- [ ] **Step 2: Add the guardrail test**

In `src/__tests__/form-system-guardrails.test.tsx`, add:

```tsx
describe('no instructional placeholder text', () => {
  it('leaves only the neutral empty marker and unit cue', () => {
    const offenders: string[] = [];
    const allowed = /placeholder="(—|kg)"/;
    for (const f of sources()) {
      readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
        if (/\bplaceholder=/.test(line) && !allowed.test(line)) {
          offenders.push(`${rel(f)}:${i + 1}`);
        }
        if (/\bplaceholderOption=/.test(line) || /\bplaceholder\s*:\s*['"`]/.test(line)) {
          offenders.push(`${rel(f)}:${i + 1}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });
});
```

Extend `sources()` to include `.ts` as well as `.tsx` if `.ts` is not already included; `questions.ts` and `platformBilling.ts` must be scanned. Exclude `__tests__` as it already does.

- [ ] **Step 3: Run the guardrail and fix every remaining hit**

Run: `npx vitest run src/__tests__/form-system-guardrails.test.tsx`
Expected: PASS. Any offender is a missed call site; remove it and rerun.

- [ ] **Step 4: Run the full suite and typecheck**

Run: `npx tsc --noEmit`
Run: `npm test`
Expected: PASS. This is the one full run for the change: shared primitives plus 130 files are genuinely cross-cutting.

- [ ] **Step 5: Final grep and classification**

Run:

```bash
rg -n 'placeholder=|placeholderOption=|placeholder\s*:\s*["'"'"'`]' src --glob '!src/__tests__/**'
```

Expected survivors, and only these:
- `placeholder="—"` in the workout-log, diet-plan and builder numeric grids.
- `placeholder="kg"` on the workout-generator training-max input.
- Comments that mention the word without an attribute.

- [ ] **Step 6: Write the audit report**

Create `docs/audits/placeholder-removal-2026-11-05.md` with:
- Files inspected: 130 placeholder-bearing files out of the full `src` scan.
- Placeholder instances found: count `placeholder=` + `placeholderOption=` + data keys before and after (use the grep commands).
- Removed: total and by area.
- Retained: each surviving line, with why.
- Shared components modified.
- Feature modules affected.
- Tests run and their exact pass/fail result.
- Exceptions or unverified items.

- [ ] **Step 7: Review the final diff**

Run: `git diff --stat` and inspect `git diff` for accidental label, ARIA, validation or option changes. Do not commit.
