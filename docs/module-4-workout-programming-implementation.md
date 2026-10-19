# Module 4 — Workout & Micro/Macro Programming

## Scope

This module extends the existing MY PT STUDIO coaching workflows. It is for individual personal trainers and their clients; it is not a gym-membership, inventory, or ERP feature.

Existing entry points discovered during the audit:

- Exercise Library: `src/app/(chrome)/pt-os/exercise-library/page.tsx`
- Workout Generator: `src/app/(chrome)/pt-os/workout-generator/page.tsx`
- Macrocycle planner: `src/app/(chrome)/pt-os/macrocycle/page.tsx`
- Cardio calculations: `src/lib/cardio-calculations.ts`
- Backend cardio twin: `src/modules/pt-os/cardio.js` in `619-erp-backend`

A first pure rule-engine foundation lives in `src/lib/workout-programming-rules.ts`; tests are in `src/__tests__/workout-programming-rules.test.ts`. The engine must be wired into the current screens and authoritative backend before this feature can be called complete.

## Screenshot requirements to preserve

### Exercise library filtering and tagging

Structured, trainer-reviewable exercise metadata must support:

- Joint action: isolation (single-joint) vs compound (multi-joint).
- Structural status: supported (machine-based / externally supported) vs unsupported (free-weight or axial spinal loading).
- Line of force: barbell, dumbbell, cable, bodyweight, and plate-loaded machines; retain existing equipment categories and avoid collapsing distinct tool types.
- Filtering must be composable with existing muscle, region, difficulty, mechanic, force, pattern, favorites, custom, archived, and search filters.
- Metadata is not inferred from an exercise name. Legacy records with missing fields are shown as “Needs review” and are not silently assigned a safety classification.

### Workout sequencing

Default ordering:
1. Explicitly reviewed power-priority work.
2. Unsupported structural compound exercises.
3. Supported compound exercises.
4. Isolation movements.

The screenshot groups power and unsupported structural compounds at the beginning, then supported and isolation movements. The UI should preview the proposed order, explain each rule, and let the trainer override it with a recorded reason. Do not silently reorder a saved plan. Exercise order must remain stable within a tier.

Exceptions require trainer review: pain or restriction flags, rehab/return-to-training, technique-learning goals, equipment limitations, fatigue management, and sport-specific priorities. The rule engine must not interpret free-text injuries as diagnoses or contraindications.

### RM allocation

Screenshot-derived defaults:

- Beginner: 15–20 reps (form and motor-pattern learning).
- Intermediate: 10–15 reps (moderate load and volume).
- Advanced: 6–8 reps (higher intensity and mechanical tension).

These ranges are retained as defaults, not rigid science or a requirement to perform true RM/failure sets. The implementation should show reps, sets, rest, RIR/RPE, load method, and a clear “trainer review required” state. A goal- and exercise-specific prescription can override the default. Do not calculate a load from a rep band alone without a valid, sufficiently recent and relevant 1RM estimate.

### Cardio and FITT

Preserve Karvonen's formula:

`THR = ((MHR - RHR) × intensity fraction) + RHR`

Preserve the three screenshot modality classes:
- Weight-bearing impact: running.
- Weight-bearing non-impact / low-impact: elliptical.
- Non-weight-bearing: cycling / rowing.

The screenshot's categories need a wording correction: “weight-bearing non-impact” is a more precise label than “weight-bearing non-impact / low-impact”, and rowing is supported by the screenshot's non-weight-bearing class but can still be physically demanding. Classification is modality-specific, not a universal safety rating.

Preserve the five phases and their order:
1. General warm-up.
2. Re-warm-up / specific preparation.
3. Work phase.
4. Cool-down.
5. Static stretching.

The duration and intensity of each phase should be editable. Karvonen calculations require valid MHR and RHR; age-derived MHR must be labelled an estimate. Heart-rate targets are not medical clearance and may be unreliable with some medications or conditions; the UI must offer perceived exertion/talk-test guidance and follow existing risk/medical-clearance gates.

## Architecture and release gates

- Backend remains authoritative for data validation, permissions, organization/tenant scoping, saved plans, and final safety validation.
- Use a versioned migration for new exercise metadata; never destructively repurpose existing columns.
- Keep frontend and backend calculation twins in parity and add contract tests for both.
- Preserve existing endpoints and old plan compatibility. Unknown metadata must degrade to review/warnings, not crash generation.
- Add audit evidence: which rules ran, which were overridden, who overrode them, and when.
- Add unit tests for classification, stable ordering, filters, rep bands, Karvonen boundaries, five-phase totals, and invalid inputs.
- Add integration tests for tenant isolation, trainer authorization, plan save/assign flows, and compatibility with legacy exercises.
- Run typecheck, lint, unit/integration tests, and production build before merge. Do not deploy automatically from this feature branch.

## Important distinction

The current cardio calculator already implements Karvonen, modality classification, and five-phase defaults. The current Exercise Library already filters on several structured fields, and the Macrocycle planner already generates phase plans. These should be extended and tested rather than duplicated. The new pure rule-engine file is a foundation only; schema migration, backend enforcement, UI integration, and end-to-end verification remain release blockers.
