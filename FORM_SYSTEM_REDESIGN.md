# MY PT STUDIO — Form System Redesign Recommendation

**Generated:** Tue Oct 20 2026
**Scope:** `619-erp-frontend` (the MY PT STUDIO frontend)
**Companion:** `FORM_SYSTEM_AUDIT.md` (verified inventory of all 66 forms)

> **Safety:** This is a recommendation document only. No migration was performed, no library was added or removed, no dependency manifest or lockfile was changed, and no application source was modified. The existing TanStack Form + Zod platform is preserved exactly as it stands.

---

## 1. The existing implementation (verified)

### What exists today

| Layer | File | Role |
|---|---|---|
| Form engine | `@tanstack/react-form` `^1.33.5` | Field state, dirtiness, touched-ness, async validation |
| Validation | `zod` `^4.6.5` | 25 named schema modules in `src/lib/forms/schemas/` |
| Application contract | `src/lib/forms/useAppForm.ts` | Raw-in/parsed-out, in-flight submit guard, `resetTo` reconstruct |
| Error translation | `src/lib/forms/errors.ts` | `mapApiError` → `FormErrors` (`formError`/`fieldErrors`/`retryable`/`kind`) |
| File validation | `src/lib/forms/files.ts` | Magic-byte signature checks (12 upload sites, 0 uncanonical) |
| Design-system fields | `src/components/ui/form/` | `FormField`, `TextField`, `TextAreaField`, `NumberField`, `SelectField`, `CheckboxField`, `RadioField`, `ChoiceChips`, `DateFieldControl`, `MonthFieldControl`, `TimeFieldControl`, `SearchField`, `FormErrorBanner`, `SubmitStatus` |
| Bound-field wiring | `src/components/ui/form/fields.tsx` | `visibleError` (touched rule), `FieldLike`, `useStandaloneField` |

### Verified state of the existing platform

- **66 forms** total; **31 (47%)** bind a canonical schema; **35 have none**.
- **Submit contract:** 26 platform, 28 manual, 12 none (82% covered).
- **Error contract:** 61 platform, 0 manual, 5 none (92% covered).
- **Reset contract:** 13 platform, 36 manual, 17 none (74% covered).
- **Risky value coercions: 0** (invariant held).
- **`type="number"` controls: 0** (invariant held — `TextInput` neutralises it).
- **Uploads: 12, all canonical** (0 uncanonical — invariant held).
- **E2E coverage: 17 of 52 critical forms (33%).**
- **P0 unjustified native controls: 0** (invariant held).

### What `useAppForm` gives that TanStack alone does not

1. **Raw-in / parsed-out:** form state holds strings; the schema parses once at submit; the handler receives typed `z.output<TSchema>`. `Number('') === 0` is structurally impossible.
2. **Submit guard:** in-flight-promise ref checked synchronously at submit top — stops same-frame double-taps that the `disabled` attribute cannot (React applies `disabled` after the current event).
3. **Reset = reconstruct:** `resetTo(values)` rebuilds from the authoritative record and clears errors/success; a `seeded` ref survives the `defaultValues` re-render that would otherwise clobber it.

### What the platform does NOT own (and deliberately does not)

- Validation is not owned by the field layer; `FormField` renders an `error` string when given one.
- Checkbox/radio/switch/segmented controls are not forced into label-above-control shape (they read control-then-caption).
- `FloatInput` is not replaced; it stays for auth/onboarding/hero forms.

---

## 2. The previously considered alternative: React Hook Form + Zod

React Hook Form (RHF) is the other widely used controlled/uncontrolled form library with Zod integration (`@hookform/resolvers`). It was previously considered as a candidate standard. Evaluation against this codebase:

| Dimension | TanStack Form + Zod (current) | React Hook Form + Zod (alternative) | Assessment |
|---|---|---|---|
| **Already installed** | Yes (`^1.33.5`) | No — would be a new dependency | Current wins on "no new dependency" |
| **Schema binding** | 31/66 forms bound (47%) | Zero forms bound today | Migration required for all |
| **Submit guard** | In-flight ref in `useAppForm` | Would need re-implementation | Re-implementation cost |
| **Reset = reconstruct** | `resetTo` + `seeded` ref | `reset()` API exists; equivalent logic re-written | Re-implementation cost |
| **Error translation** | `mapApiError` → `FormErrors` integrated | Would need re-wiring | Re-implementation cost |
| **Design-system fields** | 30+ components bound to TanStack `FieldLike` | All field components re-written to RHF `useController`/`Controller` | High rewrite cost |
| **Standalone fields** | `useStandaloneField` (caller-owned value/error) | `useController` + uncontrolled refs | Different model; re-write |
| **Test infrastructure** | Ratchet test pins the audit; schema tests exist | Ratchet + schema tests would need re-writing | Re-write cost |
| **Type safety** | Field names checked against schema at compile time (`<form.Field name>`) | `register`/`Controller` name as string; typos surface at runtime | Current is stricter |
| **Async validation** | `onSubmitAsync` slot | Built-in `mode` options | Comparable |
| **Bundle impact** | Already in bundle | Additional library + resolver | Current wins |

### Migration cost estimate (qualitative)

Migrating 66 forms from TanStack Form to RHF would require, per form:
- Re-wiring every field from `FormField` + TanStack field render props to `Controller`/`useController`;
- Replacing `useAppForm` with `useForm` + `zodResolver`;
- Re-implementing the in-flight submit guard, `resetTo` reconstruct semantics, and `mapApiError` integration;
- Re-writing the 25 schema modules' call sites (Zod schemas themselves stay, but the resolver adapter changes);
- Re-writing the ratchet test and all schema unit tests;
- Re-verifying all 12 upload sites and the coercion invariants.

That is a multi-week, high-risk rewrite with **no defect fixed** — the platform already removes the blank-becomes-zero coercion class, already has the submit guard, already maps errors, and already has 31 schemas bound. §1 of the form system explicitly forbids "rewriting working code and fixing nothing."

---

## 3. Evaluation criteria

| Criterion | TanStack Form + Zod (current) | RHF + Zod | Verdict |
|---|---|---|---|
| Migration cost | Zero (already in place) | High (66 forms + field library + tests) | Current |
| Coverage | 47% schema, 82% submit, 92% error, 74% reset | 0% today; would need full rebuild | Current |
| Compatibility | All 30+ design-system fields built for it | All fields re-written | Current |
| Testability | Ratchet test pins invariants; schema tests exist | Tests would need re-writing | Current |
| Maintenance | One library, one field contract, one error mapper | Two form paradigms during transition; then one | Current |
| Type safety | Compile-checked field names vs schema | String-based names; runtime typos | Current |
| Defect removal | Coercion class gone (0 risky, 0 type=number) | Would have to re-prove | Current |

---

## 4. Recommendation

**Primary architecture: keep TanStack Form + Zod via `useAppForm` + the `src/components/ui/form` design-system field library.**

Do not migrate to React Hook Form. Do not add `react-hook-form` or `@hookform/resolvers` as dependencies. The existing platform already satisfies the requirements the migration was meant to address:

- Zero risky value coercions (invariant).
- Zero `type="number"` hazards (invariant).
- Zero uncanonical uploads (invariant).
- Zero P0 unjustified native controls (invariant).
- A real submit guard, error mapper, and reconstructive reset.
- 31 canonical schemas bound, with 25 schema modules available.

### What to do instead of migrating (preserve design language)

1. **Bind canonical schemas to the 38 forms with none** — highest value first: client edit, new client, enroll, strength-tracking, diet-plans, progress-photos, session-balance, macrocycle, progress, weekly-checkin, workout-generator.
2. **Add submit guards** to the 12 forms with `submit: none`.
3. **Add reset contracts** to the 17 forms with `reset: none` where the form stays mounted across entities.
4. **Migrate the 132 unjustified native business controls** to design-system fields, prioritising P1 (51) then P2 (81). P0 is already at 0.
5. **Add E2E journeys** for the 35 critical forms without one, starting with Record Payment (identified as the highest-value missing test).
6. **Consolidate duplicates:** the three `FloatInput` copies and the seventeen label components behind `FormField` + `TextField`/`TextAreaField`/`SelectField`.
7. **Run the ratchet** (`vitest run src/__tests__/form-platform-ratchet.test.ts`) and full suite (`vitest run`), then E2E (`playwright test`), to confirm no regressions.

### If a future decision revisits the library choice

The comparison above should be re-run at that time. A library switch is only justified if a concrete, evidence-based defect exists that TanStack Form cannot fix — none was found in this audit. The current platform is the right standard to extend, not replace.

---

## 5. Completion report

| Item | Value |
|---|---|
| Total forms discovered | 66 |
| Implementation pattern | TanStack Form + `useAppForm` + Zod + design-system fields (`src/components/ui/form`) |
| Schema coverage | 31/66 forms (47%); 25 schema modules exist |
| Issues by priority | P0: 0 (invariants held); P1: ~26 files / 51 unjustified controls; P2: ~26 files / 81 unjustified controls; P3: 35 critical forms without E2E journeys, mobile/perf unmeasured |
| Missing evidence | E2E not executed; mobile/performance not measured; `platformBilling`/`renewalOffer` schema bindings not traced to call sites |
| Generated reports | `FORM_SYSTEM_AUDIT.md` (this session's inventory), `FORM_SYSTEM_REDESIGN.md` (this recommendation) |
| Exact verification performed | `node scripts/form-audit/index.mjs` executed against the live tree (JSON + human report); totals, per-file contracts, risk classifications, coercion/upload/wheel-hazard invariants, and E2E coverage all reproduced from that output. Ratchet test and E2E were NOT executed (audit-only constraint). |

---

**Stop.** No migration, no dependency changes, no source edits were made. Awaiting approval before implementing any fixes.
