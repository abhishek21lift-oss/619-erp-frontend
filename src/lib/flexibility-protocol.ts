// K11 Flexibility protocol — `k11-2026.01`.
//
// The four-test battery that replaced step 7's two-slot dropdown workflow. The
// reference criteria are the SUPPLIED K11 protocol's, not universal clinical
// norms; the UI copy says so, and `norm` stays unavailable rather than
// inventing cutoffs.
//
// This file is deliberately duplicated on the server
// (`src/modules/progress/flexibility-protocol.js`, same function names). The
// backend recomputes everything from raw input and is what gets stored; the
// frontend runs the same `deriveFlexibility` so the trainer's live preview
// equals the record. `scripts/assert-scoring-parity.ts` compares the two on a
// grid of inputs — if you change a rule here, change it there and re-run it.
//
// Pure: no React, no fetch, no clock.

import { checkAsymmetry, classifyFlexibilityScore, scoreCategory, scoreTestBattery } from './fitness-calculations';
import { toMeasurementOrNull } from './forms/normalize';

export const PROTOCOL_VERSION = 'k11-2026.01';

/** YMCA Sit and Reach: the box's zero point, in inches. */
export const SIT_AND_REACH_ZERO_POINT_INCHES = 15;

/**
 * Hamstrings reference band from the supplied K11 protocol. `> 80` is ABOVE
 * the reference range — a classification, not a finding.
 */
export const HAMSTRINGS_REFERENCE = {
  min_deg: 70,
  max_deg: 80,
  note: 'Reference range from the supplied K11 protocol',
} as const;

export const TIGHTNESS = ['Normal', 'Mild', 'Moderate', 'Marked'] as const;
export type Tightness = (typeof TIGHTNESS)[number];

export const HIP_TIGHTNESS = ['Normal', 'Possible restriction', 'Requires reassessment'] as const;
export type HipTightness = (typeof HIP_TIGHTNESS)[number];

export const THIGH_POSITIONS = ['below', 'at', 'above'] as const;
export type ThighPosition = (typeof THIGH_POSITIONS)[number];

export type HamstringsValidity = 'valid' | 'invalid_repeat';
export type QuadricepsInterpretation = 'Normal' | 'Possible tightness';
export type HamstringsInterpretation = 'Below reference range' | 'Within reference range' | 'Above reference range';
export type HipFlexorsInterpretation = 'Clear' | 'Possible hip flexor restriction';
export type OverallStatus = 'all_tests_recorded' | 'follow_up_recommended' | 'completed_with_override' | 'incomplete';

export type FlexibilityTestKey = 'quadriceps' | 'hamstrings' | 'hip_flexors' | 'sit_and_reach';

export const FLEXIBILITY_TEST_KEYS: FlexibilityTestKey[] = ['quadriceps', 'hamstrings', 'hip_flexors', 'sit_and_reach'];

/* ── Recorded (stored) shapes ─────────────────────────────────────────────── */

export type Side<T> = { left: T; right: T };

/**
 * A recorded side. Every answer is nullable because derivation also runs on
 * rows that predate the protocol or arrived hand-edited: an absent answer must
 * stay absent, never become the schema's default. The server is the arbiter.
 */
export interface QuadricepsSide {
  contact: boolean | null;
  /** Only meaningful when the heel is not in contact. */
  distance_cm: number | null;
  pain: boolean | null;
  pelvic_compensation: boolean | null;
  tightness: Tightness | null;
  notes: string;
}

export interface HamstringsSide {
  hip_flexion_deg: number | null;
  knee_extended: boolean | null;
  pelvic_compensation: boolean | null;
  pain: boolean | null;
  tightness: Tightness | null;
  notes: string;
}

export interface HipFlexorsSide {
  thigh_position: ThighPosition | null;
  knee_flexion_deg: number | null;
  pelvic_compensation: boolean | null;
  pain: boolean | null;
  tightness: HipTightness | null;
  notes: string;
}

export interface SitAndReachAttempt {
  inches: number | null;
  valid: boolean;
}

interface TestFlags {
  completed: boolean;
  unable_to_complete: boolean;
  unable_reason: string | null;
}

/** A test recorded as "could not be performed": no measurements are derived. */
export interface UnableTest {
  completed: false;
  unable_to_complete: true;
  unable_reason: string | null;
}

/** A test that was attempted: measurements present, whatever they say. */
export interface AbleTest {
  completed: boolean;
  unable_to_complete: false;
  unable_reason: null;
}

export interface RecordedQuadriceps extends TestFlags { sides: Side<QuadricepsSide> }
export interface RecordedHamstrings extends TestFlags { sides: Side<HamstringsSide> }
export interface RecordedHipFlexors extends TestFlags { sides: Side<HipFlexorsSide> }
export interface RecordedSitAndReach extends TestFlags {
  attempts: SitAndReachAttempt[];
  knee_bending: boolean;
  bouncing: boolean;
  notes: string;
}

export interface RecordedTests {
  quadriceps: RecordedQuadriceps;
  hamstrings: RecordedHamstrings;
  hip_flexors: RecordedHipFlexors;
  sit_and_reach: RecordedSitAndReach;
}

export interface FlexibilityOverride {
  used: boolean;
  reason: string | null;
  /** Server-stamped; never sent by the client. */
  by?: string | null;
  at?: string | null;
}

/**
 * A v3 payload. Every field is optional on the INPUT side on purpose: this
 * function is also handed rows that predate the protocol or arrived hand-edited,
 * and a derivation that throws on those is worse than one that answers.
 */
export interface FlexibilityRecorded {
  protocol_version?: unknown;
  tests?: Partial<RecordedTests>;
  override?: { used?: unknown; reason?: unknown; by?: unknown; at?: unknown } | null;
  overall_status?: unknown;
  recorded_at?: unknown;
  assessor_id?: unknown;
}

/** What the client sends: raw observations only, no derived values, no ids. */
export interface FlexibilityPayload {
  protocol_version: string;
  tests: RecordedTests;
  override: { used: boolean; reason: string | null };
}

/* ── Derived (computed) shapes ────────────────────────────────────────────── */

export interface AbleQuadriceps extends AbleTest {
  sides: Side<QuadricepsSide>;
  sides_interpretation: Side<QuadricepsInterpretation | null>;
  overall_interpretation: QuadricepsInterpretation | null;
}
export type DerivedQuadriceps = AbleQuadriceps | UnableTest;

export interface AbleHamstrings extends AbleTest {
  sides: Side<HamstringsSide>;
  reference: { min_deg: number; max_deg: number; note: string };
  sides_interpretation: Side<HamstringsInterpretation | null>;
  sides_validity: Side<HamstringsValidity>;
}
export type DerivedHamstrings = AbleHamstrings | UnableTest;

export interface AbleHipFlexors extends AbleTest {
  sides: Side<HipFlexorsSide>;
  sides_interpretation: Side<HipFlexorsInterpretation | null>;
}
export type DerivedHipFlexors = AbleHipFlexors | UnableTest;

export interface AbleSitAndReach extends AbleTest {
  attempts: SitAndReachAttempt[];
  best_attempt_index: number | null;
  best_raw_inches: number | null;
  zero_point_inches: number;
  score_inches: number | null;
  knee_bending: boolean;
  bouncing: boolean;
  /** Always unavailable while the norm table is empty (never invented). */
  norm: { table_version: string | null; category: string | null; message: string };
  notes: string;
}
export type DerivedSitAndReach = AbleSitAndReach | UnableTest;

export interface FlexibilityDerived {
  tests: {
    quadriceps: DerivedQuadriceps;
    hamstrings: DerivedHamstrings;
    hip_flexors: DerivedHipFlexors;
    sit_and_reach: DerivedSitAndReach;
  };
  override_used: boolean;
  overall_status: OverallStatus;
  has_asymmetry: boolean;
}

/* ── Small readers (same coercions as the backend module) ─────────────────── */

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {});
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const boolOrNull = (v: unknown): boolean | null => (typeof v === 'boolean' ? v : null);

/**
 * Numbers arrive as JSON numbers or as the strings a form control produces.
 * Empty is null ("not answered"), unparseable is null too — the strictness
 * lives in validation, not here.
 */
const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const x = typeof v === 'number' ? v : Number.parseFloat(String(v));
  return Number.isFinite(x) ? x : null;
};

const enumOrNull = <T extends string>(allowed: readonly T[], v: unknown): T | null =>
  ((allowed as readonly unknown[]).includes(v) ? v as T : null);

/** Same rounding as the backend, so a stored score is bit-identical. */
const round2 = (x: number) => Math.round(x * 100) / 100;

/* ── Derivation ───────────────────────────────────────────────────────────── */

/** A test is recorded two ways: completed, or unable to complete with a reason. */
function testState(raw: unknown): TestFlags {
  const r = obj(raw);
  const unable = r.unable_to_complete === true;
  return {
    completed: !unable && r.completed === true,
    unable_to_complete: unable,
    unable_reason: unable && typeof r.unable_reason === 'string' ? r.unable_reason : null,
  };
}

/** An unable test carries no measurements at all — see the backend module. */
function unableResult(state: TestFlags): UnableTest {
  return { completed: false, unable_to_complete: true, unable_reason: state.unable_reason };
}

function deriveQuadriceps(raw: unknown): DerivedQuadriceps {
  const state = testState(raw);
  if (state.unable_to_complete) return unableResult(state);
  const src = obj(obj(raw).sides);
  const side = (v: unknown): QuadricepsSide => {
    const s = obj(v);
    return {
      contact: boolOrNull(s.contact),
      distance_cm: num(s.distance_cm),
      pain: boolOrNull(s.pain),
      pelvic_compensation: boolOrNull(s.pelvic_compensation),
      tightness: enumOrNull(TIGHTNESS, s.tightness),
      notes: str(s.notes),
    };
  };
  const left = side(src.left);
  const right = side(src.right);
  // Contact with no pain and no pelvic compensation is the protocol's Normal.
  const interpret = (s: QuadricepsSide): QuadricepsInterpretation | null => (s.contact == null ? null
    : s.contact === true && s.pain === false && s.pelvic_compensation === false ? 'Normal' : 'Possible tightness');
  const li = interpret(left);
  const ri = interpret(right);
  return {
    sides: { left, right },
    sides_interpretation: { left: li, right: ri },
    overall_interpretation: li && ri ? (li === 'Normal' && ri === 'Normal' ? 'Normal' : 'Possible tightness') : null,
    completed: state.completed,
    unable_to_complete: false,
    unable_reason: null,
  };
}

function deriveHamstrings(raw: unknown): DerivedHamstrings {
  const state = testState(raw);
  if (state.unable_to_complete) return unableResult(state);
  const src = obj(obj(raw).sides);
  const side = (v: unknown): HamstringsSide => {
    const s = obj(v);
    return {
      hip_flexion_deg: num(s.hip_flexion_deg),
      knee_extended: boolOrNull(s.knee_extended),
      pelvic_compensation: boolOrNull(s.pelvic_compensation),
      pain: boolOrNull(s.pain),
      tightness: enumOrNull(TIGHTNESS, s.tightness),
      notes: str(s.notes),
    };
  };
  const left = side(src.left);
  const right = side(src.right);
  const interpret = (s: HamstringsSide): HamstringsInterpretation | null => {
    if (s.hip_flexion_deg == null) return null;
    if (s.hip_flexion_deg < HAMSTRINGS_REFERENCE.min_deg) return 'Below reference range';
    if (s.hip_flexion_deg > HAMSTRINGS_REFERENCE.max_deg) return 'Above reference range';
    return 'Within reference range';
  };
  // A bent knee or a compensated pelvis moves the pelvis, not the hamstring:
  // the angle no longer measures what the test says, so the reading is
  // repeated instead of interpreted.
  const validity = (s: HamstringsSide): HamstringsValidity =>
    (s.knee_extended === false || s.pelvic_compensation === true ? 'invalid_repeat' : 'valid');
  return {
    sides: { left, right },
    reference: { ...HAMSTRINGS_REFERENCE },
    sides_interpretation: { left: interpret(left), right: interpret(right) },
    sides_validity: { left: validity(left), right: validity(right) },
    completed: state.completed,
    unable_to_complete: false,
    unable_reason: null,
  };
}

function deriveHipFlexors(raw: unknown): DerivedHipFlexors {
  const state = testState(raw);
  if (state.unable_to_complete) return unableResult(state);
  const src = obj(obj(raw).sides);
  const side = (v: unknown): HipFlexorsSide => {
    const s = obj(v);
    return {
      thigh_position: enumOrNull(THIGH_POSITIONS, s.thigh_position),
      knee_flexion_deg: num(s.knee_flexion_deg),
      pelvic_compensation: boolOrNull(s.pelvic_compensation),
      pain: boolOrNull(s.pain),
      tightness: enumOrNull(HIP_TIGHTNESS, s.tightness),
      notes: str(s.notes),
    };
  };
  const left = side(src.left);
  const right = side(src.right);
  // Thomas test: a thigh that stays below the table line with no pelvic
  // compensation is Clear; anything else is a possible restriction, never a
  // diagnosis — the wording is deliberate.
  const interpret = (s: HipFlexorsSide): HipFlexorsInterpretation | null => (s.thigh_position == null ? null
    : s.thigh_position === 'below' && s.pelvic_compensation === false ? 'Clear' : 'Possible hip flexor restriction');
  return {
    sides: { left, right },
    sides_interpretation: { left: interpret(left), right: interpret(right) },
    completed: state.completed,
    unable_to_complete: false,
    unable_reason: null,
  };
}

function deriveSitAndReach(raw: unknown): DerivedSitAndReach {
  const state = testState(raw);
  if (state.unable_to_complete) return unableResult(state);
  const t = obj(raw);
  const attempts: SitAndReachAttempt[] = (Array.isArray(t.attempts) ? t.attempts : []).map((a) => {
    const attempt = obj(a);
    return { inches: num(attempt.inches), valid: attempt.valid === true };
  });
  // The best VALID attempt wins; an invalid one never does, however far it
  // reached. Ties keep the earlier attempt.
  let bestAttemptIndex: number | null = null;
  let bestRaw: number | null = null;
  attempts.forEach((a, i) => {
    if (a.valid && a.inches != null && (bestRaw == null || a.inches > bestRaw)) {
      bestRaw = a.inches;
      bestAttemptIndex = i;
    }
  });
  return {
    attempts,
    best_attempt_index: bestAttemptIndex,
    best_raw_inches: bestRaw,
    zero_point_inches: SIT_AND_REACH_ZERO_POINT_INCHES,
    // The YMCA board's 15-inch mark is the zero point, so the score is the
    // reach measured past (or short of) it and is legitimately negative.
    score_inches: bestRaw == null ? null : round2(bestRaw - SIT_AND_REACH_ZERO_POINT_INCHES),
    knee_bending: t.knee_bending === true,
    bouncing: t.bouncing === true,
    notes: str(t.notes),
    // Empty norm table today. Never invent a cutoff: the raw score is still
    // computed and shown.
    norm: { table_version: null, category: null, message: 'Norm classification unavailable' },
    completed: state.completed,
    unable_to_complete: false,
    unable_reason: null,
  };
}

/**
 * The one function compared FE↔BE (see `scripts/assert-scoring-parity.ts`).
 * Deterministic: no clock, no ids, no defaults read from the environment.
 */
export function deriveFlexibility(recorded: FlexibilityRecorded | null | undefined): FlexibilityDerived {
  const r = obj(recorded);
  const tests = obj(r.tests);
  const quadriceps = deriveQuadriceps(tests.quadriceps);
  const hamstrings = deriveHamstrings(tests.hamstrings);
  const hipFlexors = deriveHipFlexors(tests.hip_flexors);
  const sitAndReach = deriveSitAndReach(tests.sit_and_reach);

  const all = [quadriceps, hamstrings, hipFlexors, sitAndReach];
  const allCompleted = all.every((t) => t.completed);
  const incomplete = all.filter((t) => !t.completed);
  const overrideReason = r.override && typeof r.override === 'object' && typeof (r.override as { reason?: unknown }).reason === 'string'
    ? ((r.override as { reason: string }).reason).trim()
    : '';
  // An unable test only clears the assessment when the override carries a
  // reason — that is what the override is: recorded absent, on purpose, with a
  // why. An unexplained gap is an incomplete assessment.
  const overrideUsed = !allCompleted && incomplete.length > 0
    && incomplete.every((t) => t.unable_to_complete) && overrideReason !== '';

  const q = quadriceps.unable_to_complete ? null : quadriceps;
  const h = hamstrings.unable_to_complete ? null : hamstrings;
  const x = hipFlexors.unable_to_complete ? null : hipFlexors;
  const followUp =
    (q ? q.overall_interpretation === 'Possible tightness' : false)
    || (h ? (['left', 'right'] as const).some((s) =>
      h.sides_interpretation[s] === 'Below reference range' || h.sides_validity[s] === 'invalid_repeat') : false)
    || (x ? (['left', 'right'] as const).some((s) =>
      x.sides_interpretation[s] === 'Possible hip flexor restriction') : false);

  const overall_status: OverallStatus = allCompleted
    ? (followUp ? 'follow_up_recommended' : 'all_tests_recorded')
    : (overrideUsed ? 'completed_with_override' : 'incomplete');

  // Asymmetry is a stored column, so it is derived here with the same rules the
  // dashboard has always used: the 10% angle rule, plus the two categorical
  // mismatches (contact, and thigh below vs at/above). A categorical mismatch
  // only counts when BOTH sides answered.
  const hasAsymmetry =
    (h ? checkAsymmetry(h.sides.left.hip_flexion_deg, h.sides.right.hip_flexion_deg) : false)
    || (q ? typeof q.sides.left.contact === 'boolean' && typeof q.sides.right.contact === 'boolean'
      && q.sides.left.contact !== q.sides.right.contact : false)
    || (x ? x.sides.left.thigh_position != null && x.sides.right.thigh_position != null
      && (x.sides.left.thigh_position === 'below') !== (x.sides.right.thigh_position === 'below') : false);

  return {
    tests: { quadriceps, hamstrings, hip_flexors: hipFlexors, sit_and_reach: sitAndReach },
    override_used: overrideUsed,
    overall_status,
    has_asymmetry: hasAsymmetry,
  };
}

/* ── Form state (the wizard's shape, not the stored shape) ────────────────── */

export interface FlexibilityTestState {
  completed: boolean;
  unable: boolean;
  unableReason: string;
}

/** The wizard's form slice for each protocol test key (the form is camelCase). */
export const FLEXIBILITY_FORM_KEY: Record<FlexibilityTestKey, 'quadriceps' | 'hamstrings' | 'hipFlexors' | 'sitAndReach'> = {
  quadriceps: 'quadriceps',
  hamstrings: 'hamstrings',
  hip_flexors: 'hipFlexors',
  sit_and_reach: 'sitAndReach',
};

/** The completion flags of a protocol test, wherever the form keeps them. */
export function formTest(state: FlexibilityFormState, key: FlexibilityTestKey): FlexibilityTestState {
  return state[FLEXIBILITY_FORM_KEY[key]];
}

export interface FlexibilityFormState {
  /** true = record with the K11 battery; false = an untouched legacy blob. */
  recording: boolean;
  /** The old `{test1,test2}` blob, kept verbatim so saving an edit cannot lose it. */
  legacy: Record<string, unknown> | null;
  overrideReason: string;
  quadriceps: FlexibilityTestState & {
    contact: Side<boolean | null>;
    distanceCm: Side<string>;
    pain: Side<boolean | null>;
    pelvic: Side<boolean | null>;
    tightness: Side<Tightness>;
    notes: string;
  };
  hamstrings: FlexibilityTestState & {
    angleDeg: Side<string>;
    kneeExtended: Side<boolean | null>;
    pelvic: Side<boolean | null>;
    pain: Side<boolean | null>;
    tightness: Side<Tightness>;
    notes: string;
  };
  hipFlexors: FlexibilityTestState & {
    thighPosition: Side<ThighPosition | ''>;
    kneeFlexionDeg: Side<string>;
    pelvic: Side<boolean | null>;
    pain: Side<boolean | null>;
    tightness: Side<HipTightness>;
    notes: string;
  };
  sitAndReach: FlexibilityTestState & {
    attempts: { inches: string; valid: boolean }[];
    kneeBending: boolean;
    bouncing: boolean;
    notes: string;
  };
}

export function initFlexibilityForm(): FlexibilityFormState {
  const flags = (): FlexibilityTestState => ({ completed: false, unable: false, unableReason: '' });
  return {
    recording: true,
    legacy: null,
    overrideReason: '',
    quadriceps: {
      ...flags(),
      contact: { left: null, right: null },
      distanceCm: { left: '', right: '' },
      pain: { left: null, right: null },
      pelvic: { left: null, right: null },
      tightness: { left: 'Normal', right: 'Normal' },
      notes: '',
    },
    hamstrings: {
      ...flags(),
      angleDeg: { left: '', right: '' },
      kneeExtended: { left: null, right: null },
      pelvic: { left: null, right: null },
      pain: { left: null, right: null },
      tightness: { left: 'Normal', right: 'Normal' },
      notes: '',
    },
    hipFlexors: {
      ...flags(),
      thighPosition: { left: '', right: '' },
      kneeFlexionDeg: { left: '', right: '' },
      pelvic: { left: null, right: null },
      pain: { left: null, right: null },
      tightness: { left: 'Normal', right: 'Normal' },
      notes: '',
    },
    sitAndReach: {
      ...flags(),
      // Two attempts is the protocol's count; a third is optional.
      attempts: [{ inches: '', valid: true }, { inches: '', valid: true }],
      kneeBending: false,
      bouncing: false,
      notes: '',
    },
  };
}

/** `boolean | null` out of a stored flag: absent is "not answered", not false. */
const tri = (v: unknown): boolean | null => (typeof v === 'boolean' ? v : null);

/** A stored number back into a text field, without inventing digits. */
const numText = (v: unknown): string => (typeof v === 'number' || typeof v === 'string' ? String(v) : '');

function formSide<T>(left: T, right: T): Side<T> {
  return { left, right };
}

/**
 * A stored v3 payload back into the wizard. The `completed`/`unable` flags come
 * from the payload, so re-opening a recorded test does not ask the trainer to
 * mark it complete again.
 */
export function flexibilityFormFromRecorded(recorded: FlexibilityRecorded): FlexibilityFormState {
  const f = initFlexibilityForm();
  const tests = obj(recorded?.tests);

  const flags = (t: Record<string, unknown>): FlexibilityTestState => ({
    completed: t.completed === true,
    unable: t.unable_to_complete === true,
    unableReason: str(t.unable_reason),
  });

  const q = obj(tests.quadriceps);
  const qSides = obj(q.sides);
  const ql = obj(qSides.left); const qr = obj(qSides.right);
  const h = obj(tests.hamstrings);
  const hSides = obj(h.sides);
  const hl = obj(hSides.left); const hr = obj(hSides.right);
  const x = obj(tests.hip_flexors);
  const xSides = obj(x.sides);
  const xl = obj(xSides.left); const xr = obj(xSides.right);
  const s = obj(tests.sit_and_reach);

  const attempts = (Array.isArray(s.attempts) ? s.attempts : [])
    .map((a) => { const p = obj(a); return { inches: numText(p.inches), valid: p.valid !== false }; });

  const override = obj(recorded?.override);

  return {
    ...f,
    recording: true,
    legacy: null,
    overrideReason: str(override.reason),
    quadriceps: {
      ...flags(q),
      contact: formSide(tri(ql.contact), tri(qr.contact)),
      distanceCm: formSide(numText(ql.distance_cm), numText(qr.distance_cm)),
      pain: formSide(tri(ql.pain), tri(qr.pain)),
      pelvic: formSide(tri(ql.pelvic_compensation), tri(qr.pelvic_compensation)),
      tightness: formSide(enumOrNull(TIGHTNESS, ql.tightness) ?? 'Normal', enumOrNull(TIGHTNESS, qr.tightness) ?? 'Normal'),
      notes: str(ql.notes) || str(qr.notes),
    },
    hamstrings: {
      ...flags(h),
      angleDeg: formSide(numText(hl.hip_flexion_deg), numText(hr.hip_flexion_deg)),
      kneeExtended: formSide(tri(hl.knee_extended), tri(hr.knee_extended)),
      pelvic: formSide(tri(hl.pelvic_compensation), tri(hr.pelvic_compensation)),
      pain: formSide(tri(hl.pain), tri(hr.pain)),
      tightness: formSide(enumOrNull(TIGHTNESS, hl.tightness) ?? 'Normal', enumOrNull(TIGHTNESS, hr.tightness) ?? 'Normal'),
      notes: str(hl.notes) || str(hr.notes),
    },
    hipFlexors: {
      ...flags(x),
      thighPosition: formSide(
        enumOrNull(THIGH_POSITIONS, xl.thigh_position) ?? '',
        enumOrNull(THIGH_POSITIONS, xr.thigh_position) ?? '',
      ),
      kneeFlexionDeg: formSide(numText(xl.knee_flexion_deg), numText(xr.knee_flexion_deg)),
      pelvic: formSide(tri(xl.pelvic_compensation), tri(xr.pelvic_compensation)),
      pain: formSide(tri(xl.pain), tri(xr.pain)),
      tightness: formSide(enumOrNull(HIP_TIGHTNESS, xl.tightness) ?? 'Normal', enumOrNull(HIP_TIGHTNESS, xr.tightness) ?? 'Normal'),
      notes: str(xl.notes) || str(xr.notes),
    },
    sitAndReach: {
      ...flags(s),
      attempts: attempts.length ? attempts : f.sitAndReach.attempts,
      kneeBending: s.knee_bending === true,
      bouncing: s.bouncing === true,
      notes: str(s.notes),
    },
  };
}

/**
 * Is this the recorded K11 battery (as opposed to a legacy or empty blob)?
 * Same test as the backend: ANY `protocol_version` means the strict path, so a
 * version this build does not know is refused loudly instead of being posted
 * back as a legacy blob.
 */
export function isRecordedBattery(v: unknown): v is FlexibilityRecorded {
  return !!v && typeof v === 'object' && (v as { protocol_version?: unknown }).protocol_version != null;
}

/* ── Payload + legacy score ───────────────────────────────────────────────── */

/** Raw observations only: no derived values, no server-stamped fields. */
export function buildFlexibilityPayload(state: FlexibilityFormState): FlexibilityPayload {
  const notesOf = (v: string) => v.trim();
  const anyUnable = FLEXIBILITY_TEST_KEYS.some((k) => formTest(state, k).unable);

  return {
    protocol_version: PROTOCOL_VERSION,
    tests: {
      quadriceps: {
        sides: {
          left: {
            contact: state.quadriceps.contact.left === true,
            distance_cm: toMeasurementOrNull(state.quadriceps.distanceCm.left),
            pain: state.quadriceps.pain.left === true,
            pelvic_compensation: state.quadriceps.pelvic.left === true,
            tightness: state.quadriceps.tightness.left,
            notes: notesOf(state.quadriceps.notes),
          },
          right: {
            contact: state.quadriceps.contact.right === true,
            distance_cm: toMeasurementOrNull(state.quadriceps.distanceCm.right),
            pain: state.quadriceps.pain.right === true,
            pelvic_compensation: state.quadriceps.pelvic.right === true,
            tightness: state.quadriceps.tightness.right,
            notes: notesOf(state.quadriceps.notes),
          },
        },
        completed: state.quadriceps.completed && !state.quadriceps.unable,
        unable_to_complete: state.quadriceps.unable,
        unable_reason: state.quadriceps.unable ? (state.quadriceps.unableReason.trim() || null) : null,
      },
      hamstrings: {
        sides: {
          left: {
            hip_flexion_deg: toMeasurementOrNull(state.hamstrings.angleDeg.left) ?? 0,
            knee_extended: state.hamstrings.kneeExtended.left === true,
            pelvic_compensation: state.hamstrings.pelvic.left === true,
            pain: state.hamstrings.pain.left === true,
            tightness: state.hamstrings.tightness.left,
            notes: notesOf(state.hamstrings.notes),
          },
          right: {
            hip_flexion_deg: toMeasurementOrNull(state.hamstrings.angleDeg.right) ?? 0,
            knee_extended: state.hamstrings.kneeExtended.right === true,
            pelvic_compensation: state.hamstrings.pelvic.right === true,
            pain: state.hamstrings.pain.right === true,
            tightness: state.hamstrings.tightness.right,
            notes: notesOf(state.hamstrings.notes),
          },
        },
        completed: state.hamstrings.completed && !state.hamstrings.unable,
        unable_to_complete: state.hamstrings.unable,
        unable_reason: state.hamstrings.unable ? (state.hamstrings.unableReason.trim() || null) : null,
      },
      hip_flexors: {
        sides: {
          left: {
            thigh_position: state.hipFlexors.thighPosition.left || 'at',
            knee_flexion_deg: toMeasurementOrNull(state.hipFlexors.kneeFlexionDeg.left),
            pelvic_compensation: state.hipFlexors.pelvic.left === true,
            pain: state.hipFlexors.pain.left === true,
            tightness: state.hipFlexors.tightness.left,
            notes: notesOf(state.hipFlexors.notes),
          },
          right: {
            thigh_position: state.hipFlexors.thighPosition.right || 'at',
            knee_flexion_deg: toMeasurementOrNull(state.hipFlexors.kneeFlexionDeg.right),
            pelvic_compensation: state.hipFlexors.pelvic.right === true,
            pain: state.hipFlexors.pain.right === true,
            tightness: state.hipFlexors.tightness.right,
            notes: notesOf(state.hipFlexors.notes),
          },
        },
        completed: state.hipFlexors.completed && !state.hipFlexors.unable,
        unable_to_complete: state.hipFlexors.unable,
        unable_reason: state.hipFlexors.unable ? (state.hipFlexors.unableReason.trim() || null) : null,
      },
      sit_and_reach: {
        // A blank attempt is not an attempt: a trainer who added a third row and
        // left it empty must not post a 0-inch reach.
        attempts: state.sitAndReach.attempts
          .map((a) => ({ inches: toMeasurementOrNull(a.inches), valid: a.valid }))
          .filter((a): a is { inches: number; valid: boolean } => a.inches != null),
        knee_bending: state.sitAndReach.kneeBending,
        bouncing: state.sitAndReach.bouncing,
        notes: notesOf(state.sitAndReach.notes),
        completed: state.sitAndReach.completed && !state.sitAndReach.unable,
        unable_to_complete: state.sitAndReach.unable,
        unable_reason: state.sitAndReach.unable ? (state.sitAndReach.unableReason.trim() || null) : null,
      },
    },
    override: {
      used: anyUnable,
      reason: anyUnable ? (state.overrideReason.trim() || null) : null,
    },
  };
}

/**
 * Today's mobility score from a LEGACY `{test1,test2}` blob: the trainer-entered
 * 0–10 composite of each test, banded and averaged. Kept for the rows still
 * stored in that shape — v3 rows deliberately produce null, because there is no
 * supported universal score across the four tests' incompatible units.
 */
export function legacyMobilityScore(blob: Record<string, unknown> | null | undefined): number | null {
  if (!blob || typeof blob !== 'object') return null;
  // Legacy rows store the 0–10 score as a number; the old text-field path may
  // have left a string, so read both.
  const score = (key: 'test1' | 'test2') => {
    const v = obj(blob[key]).score;
    return typeof v === 'number' && Number.isFinite(v) ? v : toMeasurementOrNull(typeof v === 'string' ? v : '');
  };
  return scoreTestBattery(
    scoreCategory(classifyFlexibilityScore(score('test1'))),
    scoreCategory(classifyFlexibilityScore(score('test2'))),
  );
}

/** The blob's one-line description for the read-only legacy view. */
export function legacyBlobSummary(blob: Record<string, unknown> | null | undefined): string {
  if (!blob || typeof blob !== 'object') return 'No flexibility data recorded';
  return (['test1', 'test2'] as const)
    .map((k) => {
      const t = obj(blob[k]);
      const name = str(t.testType) || str(t.customTestType);
      if (!name) return null;
      const parts = [name];
      const left = str(t.left); const right = str(t.right);
      if (left || right) parts.push(`L ${left || '—'} / R ${right || '—'} cm`);
      const score = num(t.score);
      if (score != null) parts.push(`score ${score}/10`);
      return parts.join(' · ');
    })
    .filter((s): s is string => s != null)
    .join(' · ') || 'No flexibility data recorded';
}

/* ── What the protocol requires before a test can be marked complete ──────── */

/**
 * The client half of the backend's zod rules, as human sentences. Blank only
 * means "the trainer said this" — an unanswered Yes/No is `null`, never false,
 * so a test cannot be marked complete on defaults.
 */
export function flexibilityTestIssues(state: FlexibilityFormState, test: FlexibilityTestKey): string[] {
  const issues: string[] = [];
  const answered = (label: string, v: Side<boolean | null>) => {
    if (v.left == null) issues.push(`${label} (left): choose Yes or No.`);
    if (v.right == null) issues.push(`${label} (right): choose Yes or No.`);
  };

  // The server's zod rules for the numbers, restated here so a mistyped value
  // is caught while the trainer is still on the test rather than as a single
  // FLEXIBILITY_INVALID for the whole assessment at save time. The server
  // requires whole degrees for both angle fields.
  const wholeDegrees = (label: string, raw: string, max: number) => {
    const deg = toMeasurementOrNull(raw);
    if (deg == null) return;
    if (!Number.isInteger(deg)) issues.push(`${label}: whole degrees only.`);
    else if (deg < 0 || deg > max) issues.push(`${label}: must be 0–${max}°.`);
  };

  if (test === 'quadriceps') {
    answered('Contact with the table', state.quadriceps.contact);
    answered('Pain reported', state.quadriceps.pain);
    answered('Pelvic compensation', state.quadriceps.pelvic);
    for (const k of ['left', 'right'] as const) {
      const d = toMeasurementOrNull(state.quadriceps.distanceCm[k]);
      if (state.quadriceps.contact[k] === false && d == null) {
        issues.push(`Reach distance (${k}): required when the heel is not in contact.`);
      } else if (d != null && (d < 0 || d > 60)) {
        issues.push(`Reach distance (${k}): must be 0–60 cm.`);
      }
    }
  }

  if (test === 'hamstrings') {
    for (const k of ['left', 'right'] as const) {
      const deg = toMeasurementOrNull(state.hamstrings.angleDeg[k]);
      if (deg == null) issues.push(`Hip flexion angle (${k}): required.`);
      else wholeDegrees(`Hip flexion angle (${k})`, state.hamstrings.angleDeg[k], 180);
    }
    answered('Knee extended', state.hamstrings.kneeExtended);
    answered('Pelvic compensation', state.hamstrings.pelvic);
    answered('Pain reported', state.hamstrings.pain);
  }

  if (test === 'hip_flexors') {
    if (!state.hipFlexors.thighPosition.left) issues.push('Thigh position (left): required.');
    if (!state.hipFlexors.thighPosition.right) issues.push('Thigh position (right): required.');
    wholeDegrees('Knee flexion (left)', state.hipFlexors.kneeFlexionDeg.left, 160);
    wholeDegrees('Knee flexion (right)', state.hipFlexors.kneeFlexionDeg.right, 160);
    answered('Pelvic compensation', state.hipFlexors.pelvic);
    answered('Pain reported', state.hipFlexors.pain);
  }

  if (test === 'sit_and_reach') {
    state.sitAndReach.attempts.forEach((a, i) => {
      const inches = toMeasurementOrNull(a.inches);
      if (inches != null && (inches < 0 || inches > 60)) issues.push(`Attempt ${i + 1}: reach must be 0–60 in.`);
    });
    const attempts = state.sitAndReach.attempts.filter((a) => toMeasurementOrNull(a.inches) != null);
    if (!attempts.length) issues.push('Sit and Reach: record at least one attempt.');
    else if (!attempts.some((a) => a.valid)) issues.push('Sit and Reach: at least one attempt must be marked valid.');
  }

  return issues;
}
