// Removing the Trainer Notes step from the PAR-Q wizard, and what must not
// have gone with it.
//
// The step was deleted from `STEPS`, which is enough: `visibleSteps`,
// `nextStepId`, `prevStepId` and `stepPositionLabel` all derive from that array,
// so the stepper, the navigation and the "Step N of M" numbering renumbered
// together. `StepTrainerNotes.tsx` had no other importer and went with it.
//
// `trainer_notes` is a different matter. It is a column on `pt_parq_forms`, it
// is read into the form by `formFromRow`, and it is written back out by
// `buildFormPayload`. The task was to remove it from the UI and keep the data,
// and those two halves are only distinguishable by a test that loads a record
// carrying notes and saves it again — which nothing did before.
//
// So this does exactly that, and pins that no PAR-Q step offers a way to add
// notes any more, so the round-trip is the only thing left keeping them.
import { describe, expect, it } from 'vitest';
import { buildFormPayload, formFromRow } from '@/components/pt-os/parq/mappers';
import { initParqForm, STEPS, visibleSteps, nextStepId, prevStepId, TRAINER_NOTES_FIELDS } from '@/components/pt-os/parq/types';
import type { ParqFormDetail } from '@/lib/api';

const ON_FILE = {
  observations: 'Left shoulder sits protracted.',
  movement_limitations: 'No overhead press past 90 degrees.',
  recommendations: 'Add scapular retractions before pressing.',
  contraindications: 'None known.',
  precautions: 'Watch for impingement symptoms.',
  posture: 'Rounded shoulders (recorded in Posture assessment).',
};

/** A screening row as the API returns it, already carrying trainer notes. */
function rowWithNotes(): ParqFormDetail {
  return {
    client_id: 'c1',
    status: 'completed',
    trainer_notes: ON_FILE,
  } as unknown as ParqFormDetail;
}

describe('PAR-Q trainer notes survive the step being removed', () => {
  it('loads the notes already on the record into the form', () => {
    expect(formFromRow(rowWithNotes()).trainerNotes).toMatchObject(ON_FILE);
  });

  it('writes them back unchanged, so re-submitting does not erase them', () => {
    // The whole point: with no step to re-type them, buildFormPayload is the
    // only thing standing between a screening's notes and an empty column.
    const payload = buildFormPayload(formFromRow(rowWithNotes()), 'c1');
    expect(payload.trainer_notes).toMatchObject(ON_FILE);
  });

  it('round-trips through the form without a field being dropped', () => {
    const once = formFromRow(rowWithNotes());
    const twice = formFromRow({ ...rowWithNotes(), ...buildFormPayload(once, 'c1') } as unknown as ParqFormDetail);
    expect(twice.trainerNotes).toMatchObject(ON_FILE);
  });

  it('a screening with no notes on file still saves a clean object', () => {
    // The other direction, so the removal did not leave a crash behind: a new
    // screening has never had notes and must still submit. Every note field is
    // present and blank — `posture` is deliberately absent rather than empty,
    // because it is preserved from the Posture assessment only when it has one.
    const payload = buildFormPayload(initParqForm(), 'c1');
    const notes = payload.trainer_notes as Record<string, unknown>;
    expect(notes.observations).toBe('');
    expect(notes.contraindications).toBe('');
    expect(Object.keys(notes).length).toBeGreaterThanOrEqual(TRAINER_NOTES_FIELDS.length);
  });
});

describe('the PAR-Q wizard no longer offers a Trainer Notes step', () => {
  it('is gone from the step list, at every risk level', () => {
    for (const risk of ['low', 'medium', 'high'] as const) {
      expect(visibleSteps(risk).map((s) => s.key)).not.toContain('trainerNotes');
      expect(STEPS.map((s) => s.key)).not.toContain('trainerNotes');
    }
  });

  it('every step is still reachable — nothing stranded, nothing circular', () => {
    // Renumbering is the risk of removing an entry from an ordered list: a
    // step whose successor no longer exists, or a back button that dead-ends.
    for (const risk of ['low', 'medium', 'high'] as const) {
      const vis = visibleSteps(risk);
      vis.forEach((s, i) => {
        expect(nextStepId(s.id, risk)).toEqual(i < vis.length - 1 ? vis[i + 1].id : null);
        expect(prevStepId(s.id, risk)).toEqual(i > 0 ? vis[i - 1].id : null);
      });
    }
  });

  it('Digital Consent is last, so its button reads Submit', () => {
    // `isLastStep` is `nextStepId(...) == null` with no special-casing, so the
    // button label depends on consent being last. Asserted because dropping a
    // step from the middle is exactly how that quietly stops being true.
    expect(nextStepId(5, 'low')).toBeNull();
    expect(visibleSteps('low').at(-1)?.key).toBe('consent');
  });

  it('Medical Clearance still appears only at high risk, and still fits the chain', () => {
    expect(visibleSteps('low').map((s) => s.key)).not.toContain('medicalClearance');
    expect(visibleSteps('high').map((s) => s.key)).toContain('medicalClearance');
    // Clearance is the conditional step, and it sits between PAR-Q and Past
    // History — so the successor that differs by risk is step 1's, not a later
    // one. Pinned because the whole chain is index arithmetic over STEPS.
    expect(nextStepId(1, 'low')).toBe(3);
    expect(nextStepId(1, 'high')).toBe(2);
  });
});