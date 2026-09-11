// ONE workout authoring surface, and it is the one that can actually be used.
//
// ── What this is guarding against ──────────────────────────────────────────
//
// The sidebar carried two adjacent entries, both labelled with a Dumbbell:
//
//   "Workouts"      → /pt-os/training/templates   (workout_templates)
//   "Workout Plans" → /pt-os/workout-plans        (workout_plans)
//
// Two builders, two schemas, two add-exercise screens, and a trainer had no
// way to tell which one fed the rest of the product. The nav comment said the
// templates stack was the new one and workout_plans "stays until the cutover
// finishes".
//
// The cutover never started, and the schema says it could not have:
// workout_assignments has exactly ONE parent column — workout_plan_id — and no
// column for a template at all. So a workout_template can never be assigned to
// a client, never reach Today, never be logged, and never produce a personal
// record. It was an authoring screen with no exit.
//
// Production agreed, by a margin that is not a judgement call:
//
//   workout_plans        60 plans, 409 exercises, 49 assignments  → 2026-09-02
//   workout_templates     1 template, 4 exercises, 0 assignable   → 2026-08-28
//
// So /pt-os/workout-plans is canonical and the templates routes redirect to
// it. The template ROW is untouched in the database and /api/training/templates
// still serves it — this closed a second front door, it did not delete data.

import {describe, expect, it} from 'vitest';
import {readFileSync, existsSync} from 'node:fs';
import {join} from 'node:path';
import {appPath} from '@/__tests__/helpers/app-routes';

const SRC = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(SRC, rel), 'utf8');

/** Strip comments so claims are about code, not about this explanation. */
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const nav = stripComments(read('lib/nav-config.ts'));

describe('the sidebar offers exactly one workout authoring surface', () => {
  it('links to /pt-os/workout-plans', () => {
    expect(nav).toContain("href: '/pt-os/workout-plans'");
  });

  it('no longer offers the templates builder as a second entry', () => {
    // The whole defect in one assertion. Any nav entry pointing back at the
    // templates stack recreates the two-front-doors problem.
    expect(nav).not.toContain('/pt-os/training/templates');
  });

  it('has one Dumbbell-labelled workout destination, not two', () => {
    // Counted rather than matched, because the two entries were adjacent and
    // near-identical — the kind of pair that reads as intentional until you
    // ask which one the assignments table can see.
    const workoutHrefs = [...nav.matchAll(/href: '(\/pt-os\/(?:workout-plans|training\/templates)[^']*)'/g)]
      .map((m) => m[1]);
    expect(workoutHrefs).toEqual(['/pt-os/workout-plans']);
  });
});

describe('the retired templates routes redirect rather than 404', () => {
  // Bookmarks and any link sent to a trainer before this change must land
  // somewhere they can work from, not on a dead page.
  it.each([
    [['pt-os', 'training', 'templates', 'page.tsx']],
    [['pt-os', 'training', 'templates', '[id]', 'page.tsx']],
  ])('%s redirects to workout-plans', (segments: string[]) => {
    const file = appPath(...segments);
    expect(existsSync(file)).toBe(true);
    const code = stripComments(readFileSync(file, 'utf8'));
    expect(code).toContain("router.replace('/pt-os/workout-plans')");
  });
});

describe('the second builder is gone, not merely unlinked', () => {
  // Leaving the components in place would mean the next reader finds two
  // builders in the tree and has to re-derive which one the product uses.
  it.each([
    ['components/pt-os/training/WorkoutTemplateBuilder.tsx'],
    ['components/pt-os/training/PrescriptionEditor.tsx'],
    ['components/pt-os/training/NewWorkoutDialog.tsx'],
    ['lib/training/useTrainingMeta.ts'],
    ['lib/api/endpoints/trainingOs.ts'],
  ])('%s is removed', (rel: string) => {
    expect(existsSync(join(SRC, rel))).toBe(false);
  });

  it('the canonical builder and its add-exercise screen survive', () => {
    // The other half of the claim. A consolidation that also removed the
    // surviving builder would pass every assertion above.
    for (const rel of [
      'components/pt-os/builder/WorkoutBuilder.tsx',
      'components/pt-os/builder/AddExercisesScreen.tsx',
      'components/pt-os/builder/NewProgrammeDialog.tsx',
      'components/pt-os/builder/PlanVersions.tsx',
    ]) {
      expect(existsSync(join(SRC, rel))).toBe(true);
    }
  });

  it('nothing still imports the retired training client', () => {
    // api.training.* is gone from the frontend. The BACKEND still serves
    // /api/training/* — this removed the client, not the contract — so this
    // asserts the import is absent rather than the endpoints being deleted.
    const index = stripComments(read('lib/api/index.ts'));
    expect(index).not.toContain('trainingOs');
    expect(index).not.toMatch(/^\s*training,$/m);
  });
});

describe('the canonical chain is addressed by the app', () => {
  // author → assign → log. Each link asserted at its own call site, so a
  // regression names which step broke rather than "the workout flow".
  it('the builder writes plans through api.workouts.plans', () => {
    const builder = stripComments(read('components/pt-os/builder/WorkoutBuilder.tsx'));
    expect(builder).toMatch(/api\.workouts\.plans\./);
  });

  it('assignment reads workout_plan-backed assignments', () => {
    const assigned = stripComments(
      readFileSync(appPath('pt-os', 'clients', '[id]', 'training', 'assigned', 'page.tsx'), 'utf8'));
    expect(assigned).toMatch(/api\.workouts\.assignments\./);
  });

  it('the workout log reads the session surface, not templates', () => {
    const log = stripComments(
      readFileSync(appPath('pt-os', 'clients', '[id]', 'workout-log', 'page.tsx'), 'utf8'));
    expect(log).toMatch(/api\.workouts\.assignments\./);
    expect(log).not.toContain('api.training.');
  });
});
