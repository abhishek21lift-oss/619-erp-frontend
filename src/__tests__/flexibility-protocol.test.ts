// The K11 four-test flexibility battery's derivation, form round-trip and
// payload — the frontend mirror of the backend module. Anything asserted here
// about a threshold must match `src/modules/progress/flexibility-protocol.js`;
// scripts/assert-scoring-parity.ts compares the two implementations directly.

import { describe, it, expect } from 'vitest';
import {
  PROTOCOL_VERSION,
  SIT_AND_REACH_ZERO_POINT_INCHES,
  buildFlexibilityPayload,
  deriveFlexibility,
  flexibilityFormFromRecorded,
  flexibilityTestIssues,
  formTest,
  initFlexibilityForm,
  isRecordedBattery,
  legacyBlobSummary,
  legacyMobilityScore,
} from '@/lib/flexibility-protocol';
import type {
  FlexibilityDerived,
  FlexibilityFormState,
  FlexibilityRecorded,
  FlexibilityTestKey,
  HamstringsSide,
  HipFlexorsSide,
  QuadricepsSide,
  RecordedSitAndReach,
  RecordedTests,
} from '@/lib/flexibility-protocol';
import { formFromAssessmentRow } from '@/components/pt-os/fitness-testing/types';

/* ── Fixtures ─────────────────────────────────────────────────────────────── */

const qSide = (p: Partial<QuadricepsSide> = {}): QuadricepsSide => ({
  contact: true, distance_cm: null, pain: false, pelvic_compensation: false, tightness: 'Normal', notes: '', ...p,
});
const hSide = (p: Partial<HamstringsSide> = {}): HamstringsSide => ({
  hip_flexion_deg: 75, knee_extended: true, pelvic_compensation: false, pain: false, tightness: 'Normal', notes: '', ...p,
});
const xSide = (p: Partial<HipFlexorsSide> = {}): HipFlexorsSide => ({
  thigh_position: 'below', knee_flexion_deg: null, pelvic_compensation: false, pain: false, tightness: 'Normal', notes: '', ...p,
});

interface Over {
  quadriceps?: Partial<RecordedTests['quadriceps']>;
  hamstrings?: Partial<RecordedTests['hamstrings']>;
  hip_flexors?: Partial<RecordedTests['hip_flexors']>;
  sit_and_reach?: Partial<RecordedSitAndReach>;
  override?: FlexibilityRecorded['override'];
}

/** A raw payload with all four tests recorded and marked complete. */
function battery(over: Over = {}): FlexibilityRecorded {
  // The spread widens every optional field to `| undefined`, which is exactly
  // what this builder is for: a hand-edited row the derivation still answers.
  const tests = {
    quadriceps: { sides: { left: qSide(), right: qSide() }, completed: true, ...over.quadriceps },
    hamstrings: { sides: { left: hSide(), right: hSide() }, completed: true, ...over.hamstrings },
    hip_flexors: { sides: { left: xSide(), right: xSide() }, completed: true, ...over.hip_flexors },
    sit_and_reach: { attempts: [{ inches: 20, valid: true }], knee_bending: false, bouncing: false, completed: true, ...over.sit_and_reach },
  } as unknown as Partial<RecordedTests>;
  return { protocol_version: PROTOCOL_VERSION, tests, override: over.override ?? null };
}

/** The derivation, on a battery with the given overrides. */
const derive = (over: Over = {}): FlexibilityDerived => deriveFlexibility(battery(over));

/** Narrows an able test, failing loudly if the test came back unable. */
function able<T extends { unable_to_complete: boolean }>(t: T): Extract<T, { unable_to_complete: false }> {
  if (t.unable_to_complete) throw new Error('expected an able test, got an unable one');
  return t as Extract<T, { unable_to_complete: false }>;
}

const completeForm = (): FlexibilityFormState => {
  const f = initFlexibilityForm();
  return {
    ...f,
    quadriceps: {
      ...f.quadriceps, completed: true,
      contact: { left: true, right: true }, pain: { left: false, right: false }, pelvic: { left: false, right: false },
    },
    hamstrings: {
      ...f.hamstrings, completed: true,
      angleDeg: { left: '70', right: '78' },
      kneeExtended: { left: true, right: true }, pelvic: { left: false, right: false }, pain: { left: false, right: false },
    },
    hipFlexors: {
      ...f.hipFlexors, completed: true,
      thighPosition: { left: 'below', right: 'below' }, pelvic: { left: false, right: false }, pain: { left: false, right: false },
    },
    sitAndReach: {
      ...f.sitAndReach, completed: true,
      attempts: [{ inches: '20', valid: true }, { inches: '', valid: true }],
    },
  };
};

/* ── Quadriceps ───────────────────────────────────────────────────────────── */

describe('deriveFlexibility — quadriceps', () => {
  it('calls contact with no pain and no pelvic compensation Normal on both sides', () => {
    const d = able(derive().tests.quadriceps);
    expect(d.sides_interpretation).toEqual({ left: 'Normal', right: 'Normal' });
    expect(d.overall_interpretation).toBe('Normal');
    expect(d.completed).toBe(true);
  });

  it('makes either side flagged the overall reading', () => {
    const d = able(derive({ quadriceps: { sides: { left: qSide(), right: qSide({ pain: true }) } } }).tests.quadriceps);
    expect(d.sides_interpretation).toEqual({ left: 'Normal', right: 'Possible tightness' });
    expect(d.overall_interpretation).toBe('Possible tightness');
  });

  it('treats a heel out of contact as possible tightness regardless of distance', () => {
    const d = able(derive({ quadriceps: { sides: { left: qSide({ contact: false, distance_cm: 14 }), right: qSide() } } }).tests.quadriceps);
    expect(d.sides.left.distance_cm).toBe(14);
    expect(d.sides_interpretation.left).toBe('Possible tightness');
  });

  it('leaves the side uninterpreted when contact is unanswered, never assuming false', () => {
    const d = able(derive({ quadriceps: { sides: { left: qSide({ contact: null }), right: qSide({ contact: null }) } } }).tests.quadriceps);
    expect(d.sides_interpretation).toEqual({ left: null, right: null });
    expect(d.overall_interpretation).toBeNull();
  });

  it('needs an explicit No for pain and pelvic compensation before calling it Normal', () => {
    const d = able(derive({ quadriceps: { sides: { left: qSide({ pain: null }), right: qSide({ pelvic_compensation: null }) } } }).tests.quadriceps);
    expect(d.sides_interpretation).toEqual({ left: 'Possible tightness', right: 'Possible tightness' });
  });

  it('coerces distance strings, keeps a missing tightness null and rejects an unknown one', () => {
    const d = able(derive({
      quadriceps: { sides: { left: qSide({ contact: false, distance_cm: '3.5' as unknown as number }), right: qSide({ tightness: 'Extreme' as never }) } },
    }).tests.quadriceps);
    expect(d.sides.left.distance_cm).toBe(3.5);
    expect(d.sides.right.tightness).toBeNull();
  });
});

/* ── Hamstrings ──────────────────────────────────────────────────────────── */

describe('deriveFlexibility — hamstrings', () => {
  const band = (deg: number | null) => able(derive({ hamstrings: { sides: { left: hSide({ hip_flexion_deg: deg }), right: hSide() } } }).tests.hamstrings)
    .sides_interpretation.left;

  it('bands the angle at exactly the 70–80 reference edges', () => {
    expect(band(69)).toBe('Below reference range');
    expect(band(70)).toBe('Within reference range');
    expect(band(80)).toBe('Within reference range');
    expect(band(81)).toBe('Above reference range');
  });

  it('leaves an unanswered angle uninterpreted', () => {
    expect(band(null)).toBeNull();
  });

  it('echoes the protocol reference range on the test', () => {
    const d = able(derive().tests.hamstrings);
    expect(d.reference).toEqual({ min_deg: 70, max_deg: 80, note: 'Reference range from the supplied K11 protocol' });
  });

  it('prompts a repeat when the knee bent or the pelvis compensated', () => {
    const d = able(derive({
      hamstrings: { sides: { left: hSide({ knee_extended: false }), right: hSide({ pelvic_compensation: true }) } },
    }).tests.hamstrings);
    expect(d.sides_validity).toEqual({ left: 'invalid_repeat', right: 'invalid_repeat' });
    expect(d.sides_interpretation).toEqual({ left: 'Within reference range', right: 'Within reference range' });
  });

  it('leaves validity alone when the knee answer is missing, because absence is not a bent knee', () => {
    const d = able(derive({ hamstrings: { sides: { left: hSide({ knee_extended: null }), right: hSide() } } }).tests.hamstrings);
    expect(d.sides_validity.left).toBe('valid');
  });
});

/* ── Hip flexors ─────────────────────────────────────────────────────────── */

describe('deriveFlexibility — hip flexors (Thomas test)', () => {
  const verdict = (p: Partial<HipFlexorsSide>) => able(derive({
    hip_flexors: { sides: { left: xSide(p), right: xSide() } },
  }).tests.hip_flexors).sides_interpretation.left;

  it('calls only a thigh below the line with the pelvis controlled Clear', () => {
    expect(verdict({ thigh_position: 'below', pelvic_compensation: false })).toBe('Clear');
  });

  it('flags at, above, compensated-below and unanswered-pelvis alike, and never diagnoses', () => {
    expect(verdict({ thigh_position: 'at' })).toBe('Possible hip flexor restriction');
    expect(verdict({ thigh_position: 'above' })).toBe('Possible hip flexor restriction');
    expect(verdict({ thigh_position: 'below', pelvic_compensation: true })).toBe('Possible hip flexor restriction');
    expect(verdict({ thigh_position: 'below', pelvic_compensation: null })).toBe('Possible hip flexor restriction');
  });

  it('leaves an unanswered thigh position null', () => {
    expect(verdict({ thigh_position: null })).toBeNull();
    expect(verdict({ thigh_position: 'sideways' as never })).toBeNull();
  });
});

/* ── Sit and reach ───────────────────────────────────────────────────────── */

describe('deriveFlexibility — sit and reach', () => {
  const sit = (attempts: RecordedSitAndReach['attempts'], over: Partial<RecordedSitAndReach> = {}) =>
    able(derive({ sit_and_reach: { attempts, ...over } }).tests.sit_and_reach);

  it('scores the best valid attempt against the 15-inch zero point', () => {
    const d = sit([{ inches: 12, valid: true }, { inches: 18.5, valid: true }]);
    expect(d.best_attempt_index).toBe(1);
    expect(d.best_raw_inches).toBe(18.5);
    expect(d.zero_point_inches).toBe(SIT_AND_REACH_ZERO_POINT_INCHES);
    expect(d.score_inches).toBe(3.5);
  });

  it('produces a negative score when the reach falls short of the zero point', () => {
    expect(sit([{ inches: 12, valid: true }]).score_inches).toBe(-3);
  });

  it('never lets an invalid attempt win, however far it reached', () => {
    const d = sit([{ inches: 10, valid: true }, { inches: 25, valid: false }]);
    expect(d.best_attempt_index).toBe(0);
    expect(d.best_raw_inches).toBe(10);
  });

  it('keeps the earlier attempt on a tie', () => {
    expect(sit([{ inches: 20, valid: true }, { inches: 20, valid: true }]).best_attempt_index).toBe(0);
  });

  it('reports no best attempt when none is valid or none has a number', () => {
    const d = sit([{ inches: 10, valid: false }, { inches: null, valid: true }]);
    expect(d.best_attempt_index).toBeNull();
    expect(d.best_raw_inches).toBeNull();
    expect(d.score_inches).toBeNull();
  });

  it('coerces attempt strings and always reports the norm as unavailable', () => {
    const d = sit([{ inches: '21' as unknown as number, valid: true }]);
    expect(d.score_inches).toBe(6);
    expect(d.norm).toEqual({ table_version: null, category: null, message: 'Norm classification unavailable' });
  });

  it('stores the knee-bending and bouncing observations as booleans', () => {
    const d = sit([{ inches: 20, valid: true }], { knee_bending: true });
    expect(d.knee_bending).toBe(true);
    expect(d.bouncing).toBe(false);
  });
});

/* ── Unable tests, override and overall status ───────────────────────────── */

describe('deriveFlexibility — unable tests and override', () => {
  it('derives nothing but the three flag fields for an unable test', () => {
    const d = derive({ quadriceps: { sides: { left: qSide(), right: qSide() }, completed: true, unable_to_complete: true, unable_reason: 'knee surgery' } }).tests.quadriceps;
    expect(d).toEqual({ completed: false, unable_to_complete: true, unable_reason: 'knee surgery' });
  });

  it('forces completed false when a payload claims both', () => {
    const d = derive({ hamstrings: { completed: true, unable_to_complete: true, unable_reason: 'cramp' } }).tests.hamstrings;
    expect(d.completed).toBe(false);
  });

  it('drops a non-string unable reason to null', () => {
    const d = derive({ hip_flexors: { unable_to_complete: true, unable_reason: 42 as unknown as string } }).tests.hip_flexors;
    expect(d.unable_reason).toBeNull();
  });

  it('is all_tests_recorded when the four tests are complete and unremarkable', () => {
    const d = derive();
    expect(d.override_used).toBe(false);
    expect(d.overall_status).toBe('all_tests_recorded');
  });

  it('recommends follow-up for each of the protocol\'s flags', () => {
    expect(derive({ quadriceps: { sides: { left: qSide({ pain: true }), right: qSide() } } }).overall_status).toBe('follow_up_recommended');
    expect(derive({ hamstrings: { sides: { left: hSide({ hip_flexion_deg: 65 }), right: hSide() } } }).overall_status).toBe('follow_up_recommended');
    expect(derive({ hamstrings: { sides: { left: hSide({ knee_extended: false }), right: hSide() } } }).overall_status).toBe('follow_up_recommended');
    expect(derive({ hip_flexors: { sides: { left: xSide({ thigh_position: 'above' }), right: xSide() } } }).overall_status).toBe('follow_up_recommended');
  });

  it('does not recommend follow-up for a reach above the reference range', () => {
    expect(derive({ hamstrings: { sides: { left: hSide({ hip_flexion_deg: 88 }), right: hSide({ hip_flexion_deg: 88 }) } } }).overall_status).toBe('all_tests_recorded');
  });

  it('accepts an unable test only with a written override reason, and ignores the client\'s used flag', () => {
    const unable = { quadriceps: { unable_to_complete: true, unable_reason: 'recent abdominal surgery' } };
    const withReason = derive({ ...unable, override: { used: true, reason: '  recorded as unable on purpose  ' } });
    expect(withReason.override_used).toBe(true);
    expect(withReason.overall_status).toBe('completed_with_override');

    expect(derive({ ...unable, override: { used: true, reason: '   ' } }).overall_status).toBe('incomplete');
    expect(derive({ ...unable, override: { used: true, reason: 'x' } }).override_used).toBe(true);
    expect(derive({ ...unable }).override_used).toBe(false);
  });

  it('stays incomplete when an unfinished test was neither recorded nor unable, reason or not', () => {
    const d = derive({ hamstrings: { completed: false }, override: { used: true, reason: 'forgot' } });
    expect(d.override_used).toBe(false);
    expect(d.overall_status).toBe('incomplete');
  });

  it('reports an override for a non-string reason as no override', () => {
    expect(derive({ quadriceps: { unable_to_complete: true, unable_reason: 'x' }, override: { reason: 7 } }).override_used).toBe(false);
  });
});

/* ── Asymmetry ───────────────────────────────────────────────────────────── */

describe('deriveFlexibility — has_asymmetry', () => {
  const asym = (over: Over) => derive(over).has_asymmetry;

  it('applies the 10% rule to the hamstring angles', () => {
    expect(asym({ hamstrings: { sides: { left: hSide({ hip_flexion_deg: 70 }), right: hSide({ hip_flexion_deg: 85 }) } } })).toBe(true);
    expect(asym({ hamstrings: { sides: { left: hSide({ hip_flexion_deg: 80 }), right: hSide({ hip_flexion_deg: 88 }) } } })).toBe(false);
  });

  it('counts a quadriceps contact mismatch only when both sides answered', () => {
    expect(asym({ quadriceps: { sides: { left: qSide({ contact: true }), right: qSide({ contact: false }) } } })).toBe(true);
    expect(asym({ quadriceps: { sides: { left: qSide({ contact: true }), right: qSide({ contact: null }) } } })).toBe(false);
  });

  it('counts below vs at/above for the thigh, not the exact position', () => {
    expect(asym({ hip_flexors: { sides: { left: xSide({ thigh_position: 'below' }), right: xSide({ thigh_position: 'at' }) } } })).toBe(true);
    expect(asym({ hip_flexors: { sides: { left: xSide({ thigh_position: 'at' }), right: xSide({ thigh_position: 'above' }) } } })).toBe(false);
    expect(asym({ hip_flexors: { sides: { left: xSide({ thigh_position: 'below' }), right: xSide({ thigh_position: null }) } } })).toBe(false);
  });

  it('is false on an unrecorded battery and on an unable test\'s dropped sides', () => {
    expect(deriveFlexibility({}).has_asymmetry).toBe(false);
    expect(deriveFlexibility({ tests: { hamstrings: { unable_to_complete: true }, hip_flexors: { unable_to_complete: true } } } as unknown as FlexibilityRecorded).has_asymmetry).toBe(false);
  });
});

/* ── Robustness ──────────────────────────────────────────────────────────── */

describe('deriveFlexibility — absent and hand-edited input', () => {
  it('answers the same for null, undefined and an empty object', () => {
    const empty = deriveFlexibility({});
    expect(deriveFlexibility(null)).toEqual(empty);
    expect(deriveFlexibility(undefined)).toEqual(empty);
    expect(empty.overall_status).toBe('incomplete');
    expect(empty.tests.quadriceps).toMatchObject({ completed: false, unable_to_complete: false, sides_interpretation: { left: null, right: null } });
    expect(empty.tests.sit_and_reach).toMatchObject({ attempts: [], best_attempt_index: null, score_inches: null });
  });

  it('does not throw on shapes that are not a battery at all', () => {
    for (const junk of ['nope', 42, [], { tests: 'nope' }, { tests: { quadriceps: 3 }, override: 'yes' }]) {
      expect(() => deriveFlexibility(junk as unknown as FlexibilityRecorded)).not.toThrow();
    }
    expect(deriveFlexibility({ tests: { quadriceps: 3 } } as unknown as FlexibilityRecorded).tests.quadriceps)
      .toMatchObject({ completed: false, unable_to_complete: false });
  });
});

/* ── Client validation ───────────────────────────────────────────────────── */

describe('flexibilityTestIssues', () => {
  const KEYS: FlexibilityTestKey[] = ['quadriceps', 'hamstrings', 'hip_flexors', 'sit_and_reach'];

  it('asks every unanswered question on a fresh form', () => {
    const f = initFlexibilityForm();
    expect(flexibilityTestIssues(f, 'quadriceps')).toHaveLength(6);
    expect(flexibilityTestIssues(f, 'hamstrings')).toHaveLength(8); // 2 angles + 3 answers × 2 sides
    expect(flexibilityTestIssues(f, 'hip_flexors')).toHaveLength(6);
    expect(flexibilityTestIssues(f, 'sit_and_reach')).toEqual(['Sit and Reach: record at least one attempt.']);
  });

  it('requires the reach distance only when the heel is not in contact', () => {
    const f = completeForm();
    const no = { ...f, quadriceps: { ...f.quadriceps, contact: { left: false, right: true } } };
    expect(flexibilityTestIssues(no, 'quadriceps')).toEqual(['Reach distance (left): required when the heel is not in contact.']);
    const withDistance = { ...no, quadriceps: { ...no.quadriceps, distanceCm: { left: '3', right: '' } } };
    expect(flexibilityTestIssues(withDistance, 'quadriceps')).toEqual([]);
  });

  it('mirrors the server\'s numeric rules on angles and reaches', () => {
    const f = completeForm();
    expect(flexibilityTestIssues({ ...f, hamstrings: { ...f.hamstrings, angleDeg: { left: '70.5', right: '181' } } }, 'hamstrings'))
      .toEqual(['Hip flexion angle (left): whole degrees only.', 'Hip flexion angle (right): must be 0–180°.']);
    expect(flexibilityTestIssues({ ...f, hipFlexors: { ...f.hipFlexors, kneeFlexionDeg: { left: '45.5', right: '170' } } }, 'hip_flexors'))
      .toEqual(['Knee flexion (left): whole degrees only.', 'Knee flexion (right): must be 0–160°.']);
    expect(flexibilityTestIssues({ ...f, sitAndReach: { ...f.sitAndReach, attempts: [{ inches: '-2', valid: true }] } }, 'sit_and_reach'))
      .toEqual(['Attempt 1: reach must be 0–60 in.']);
  });

  it('still requires one valid attempt after the reaches are fine', () => {
    const f = completeForm();
    const invalid = { ...f, sitAndReach: { ...f.sitAndReach, attempts: [{ inches: '10', valid: false }, { inches: '', valid: true }] } };
    expect(flexibilityTestIssues(invalid, 'sit_and_reach')).toEqual(['Sit and Reach: at least one attempt must be marked valid.']);
  });

  it('finds nothing to fix on a complete battery', () => {
    const f = completeForm();
    for (const key of KEYS) expect(flexibilityTestIssues(f, key)).toEqual([]);
  });

  it('maps a protocol key to its form slice wherever the form keeps it', () => {
    const f = initFlexibilityForm();
    f.hipFlexors.completed = true;
    expect(formTest(f, 'hip_flexors')).toMatchObject({ completed: true, unable: false, unableReason: '' });
    expect(formTest(f, 'sit_and_reach').completed).toBe(false);
  });
});

/* ── Payload ─────────────────────────────────────────────────────────────── */

describe('buildFlexibilityPayload', () => {
  it('sends raw observations only — no derived values, no ids', () => {
    const p = buildFlexibilityPayload(completeForm());
    expect(p.protocol_version).toBe(PROTOCOL_VERSION);
    expect(Object.keys(p)).toEqual(['protocol_version', 'tests', 'override']);
    expect(p.tests.quadriceps).toEqual({
      sides: {
        left: { contact: true, distance_cm: null, pain: false, pelvic_compensation: false, tightness: 'Normal', notes: '' },
        right: { contact: true, distance_cm: null, pain: false, pelvic_compensation: false, tightness: 'Normal', notes: '' },
      },
      completed: true, unable_to_complete: false, unable_reason: null,
    });
    expect(p.override).toEqual({ used: false, reason: null });
  });

  it('drops a blank attempt instead of posting it as a 0-inch reach', () => {
    const p = buildFlexibilityPayload(completeForm());
    expect(p.tests.sit_and_reach.attempts).toEqual([{ inches: 20, valid: true }]);
  });

  it('marks the override used, trims the reason, and keeps every posted shape valid when a test is unable', () => {
    const f = completeForm();
    const unable: FlexibilityFormState = {
      ...f,
      overrideReason: '  recent abdominal surgery  ',
      hipFlexors: {
        ...initFlexibilityForm().hipFlexors,
        unable: true, unableReason: ' could not lie prone ',
        completed: true, // a stale flag must not survive the unable branch
      },
    };
    const p = buildFlexibilityPayload(unable);
    expect(p.override).toEqual({ used: true, reason: 'recent abdominal surgery' });
    expect(p.tests.hip_flexors.unable_to_complete).toBe(true);
    expect(p.tests.hip_flexors.unable_reason).toBe('could not lie prone');
    expect(p.tests.hip_flexors.completed).toBe(false);
    // The server validates the posted side shape even for an unable test.
    expect(p.tests.hip_flexors.sides.left.thigh_position).toBe('at');
    expect(p.tests.hamstrings.sides.left.hip_flexion_deg).toBe(70);
  });
});

/* ── Form state ──────────────────────────────────────────────────────────── */

describe('flexibility form state', () => {
  it('round-trips a built payload back into the same form', () => {
    const back = flexibilityFormFromRecorded(buildFlexibilityPayload(completeForm()));
    expect(back.recording).toBe(true);
    expect(back.legacy).toBeNull();
    expect(back.quadriceps.completed).toBe(true);
    expect(back.quadriceps.contact).toEqual({ left: true, right: true });
    expect(back.hamstrings.angleDeg).toEqual({ left: '70', right: '78' });
    expect(back.hamstrings.kneeExtended).toEqual({ left: true, right: true });
    expect(back.hipFlexors.thighPosition).toEqual({ left: 'below', right: 'below' });
    expect(back.sitAndReach.attempts).toEqual([{ inches: '20', valid: true }]);
    expect(back.overrideReason).toBe('');
  });

  it('restores an unable test as unable, with its reason', () => {
    const back = flexibilityFormFromRecorded({
      protocol_version: PROTOCOL_VERSION,
      tests: { hamstrings: { unable_to_complete: true, unable_reason: 'cramp' } },
    } as unknown as FlexibilityRecorded);
    expect(formTest(back, 'hamstrings')).toMatchObject({ completed: false, unable: true, unableReason: 'cramp' });
  });

  it('recognises any protocol_version as the strict path and nothing else', () => {
    expect(isRecordedBattery({ protocol_version: PROTOCOL_VERSION })).toBe(true);
    expect(isRecordedBattery({ protocol_version: 'k11-2099.99' })).toBe(true);
    expect(isRecordedBattery({ test1: { score: 8 } })).toBe(false);
    expect(isRecordedBattery({})).toBe(false);
    expect(isRecordedBattery(null)).toBe(false);
  });

  it('opens a v3 row as an editable, completed battery', () => {
    const stored = deriveFlexibility(buildFlexibilityPayload(completeForm()));
    const form = formFromAssessmentRow({
      flexibility_test_data: { protocol_version: PROTOCOL_VERSION, tests: stored.tests, override: { used: false, reason: null } },
    });
    expect(form.flexibility.recording).toBe(true);
    expect(form.flexibility.legacy).toBeNull();
    expect(form.flexibility.quadriceps.completed).toBe(true);
    expect(form.flexibility.hamstrings.angleDeg).toEqual({ left: '70', right: '78' });
    expect(form.flexibility.sitAndReach.attempts).toEqual([{ inches: '20', valid: true }]);
  });

  it('keeps a legacy blob verbatim and read-only instead of inventing answers', () => {
    const legacy = { test1: { testType: 'Sit and Reach', score: 8 }, test2: { testType: 'Thomas Test', score: 6 } };
    const form = formFromAssessmentRow({ flexibility_test_data: legacy });
    expect(form.flexibility.recording).toBe(false);
    expect(form.flexibility.legacy).toEqual(legacy);
    expect(form.flexibility.quadriceps.contact).toEqual({ left: null, right: null });
    expect(form.flexibility.quadriceps.completed).toBe(false);
  });

  it('starts a fresh battery when the row has none', () => {
    for (const row of [{ flexibility_test_data: {} }, { flexibility_test_data: null }, {}]) {
      const form = formFromAssessmentRow(row);
      expect(form.flexibility.recording).toBe(true);
      expect(form.flexibility.legacy).toBeNull();
      expect(form.flexibility.sitAndReach.attempts).toHaveLength(2);
    }
  });
});

/* ── Legacy blobs ────────────────────────────────────────────────────────── */

describe('legacy flexibility blobs', () => {
  it('scores a legacy blob with the old 0–10 banding, as a number or a string', () => {
    expect(legacyMobilityScore({ test1: { score: 8 }, test2: { score: 6 } })).toBe(88); // 95 and 80
    expect(legacyMobilityScore({ test1: { score: '8' }, test2: { score: '6' } })).toBe(88);
    expect(legacyMobilityScore({ test1: { score: 10 } })).toBe(95);
    expect(legacyMobilityScore({ test1: { score: 'not a score' } })).toBeNull();
    expect(legacyMobilityScore(null)).toBeNull();
  });

  it('summarises a legacy blob without inventing missing fields', () => {
    expect(legacyBlobSummary({ test1: { testType: 'Sit and Reach', left: '20', right: '22', score: 7 } }))
      .toBe('Sit and Reach · L 20 / R 22 cm · score 7/10');
    expect(legacyBlobSummary({ test1: { customTestType: 'Thomas Test', left: '12' } })).toBe('Thomas Test · L 12 / R — cm');
    expect(legacyBlobSummary({})).toBe('No flexibility data recorded');
    expect(legacyBlobSummary(null)).toBe('No flexibility data recorded');
  });
});
