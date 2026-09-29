// Shared form shape for the Fitness Testing module — imported by the main
// page and every step component so they don't depend on each other.

import { todayISO } from '@/lib/forms/domain';

export type AssessmentType = 'initial' | 'week_4' | 'week_8' | 'week_12' | 'monthly' | 'quarterly' | 'follow_up' | 'custom';
export type CardioTestType = 'YMCA 3-Minute Step Test' | 'Rockport 1-Mile Walk' | 'Cooper 12-Minute Run' | 'Bruce Protocol' | 'Harvard Step Test' | 'Custom';
export type EnduranceTestType = 'Push Up Test' | 'Curl Up Test' | 'Wall Sit' | 'Plank' | 'Bodyweight Squat' | 'Custom';
export type FlexibilityTestType = 'Sit and Reach' | 'Hamstring' | 'Hip Flexor' | 'Custom';
export type StrengthExercise = 'Bench Press' | 'Leg Press' | 'Squat' | 'Deadlift' | 'Shoulder Press' | 'Custom Exercise';

export interface AssessmentFormData {
  // Assessment Information
  assessmentDate: string;
  assessmentType: AssessmentType;
  assessmentNotes: string;
  trainerId: string;
  trainerName: string;

  // Step 1 — Blood Pressure
  bpSystolic: string; bpDiastolic: string; restingHeartRate: string; restingSpo2: string;
  /** The trainer confirms BP was not taken. Without a reading or this, the
   *  exertion tests (step test, 1RM, endurance to failure) are not recorded. */
  bpNotMeasured: boolean;

  // Step 2 — Anthropometric
  weight: string; heightCm: string; waistCm: string; waistIliacCm: string; hipsCm: string; neckCm: string; chestCm: string;
  armRightCm: string; armLeftCm: string; thighRightCm: string; thighLeftCm: string; calfRightCm: string; calfLeftCm: string;

  // Step 3 — Body Composition
  bodyCompMethod: string; bodyFatPct: string; muscleMassPct: string; visceralFat: string; subcutaneousFatPct: string;
  bodyWaterPct: string; boneMassKg: string; bmr: string; metabolicAge: string;

  // Step 4 — Cardiorespiratory Endurance
  cardioTestType: CardioTestType | '';
  cardioTimeMin: string; cardioHeartRate: string; cardioDistanceMeters: string; cardioTreadmillMinutes: string;
  cardioDurationSec: string; cardioPulse1: string; cardioPulse2: string; cardioPulse3: string; cardioRecoveryHr: string;

  // Step 5 — Muscular Strength (two distinct tests required — any exercise
  // may be tested, but exactly 2 are needed to complete the step, same
  // battery pattern as Muscular Endurance below)
  strengthExercise: StrengthExercise | '';
  strengthCustomExercise: string;
  strengthMode: 'direct' | 'estimated';
  strengthWeightKg: string; strengthReps: string; strengthFormula: 'brzycki' | 'epley'; strengthDirect1RM: string;
  strengthExercise2: StrengthExercise | '';
  strengthCustomExercise2: string;
  strengthMode2: 'direct' | 'estimated';
  strengthWeightKg2: string; strengthReps2: string; strengthFormula2: 'brzycki' | 'epley'; strengthDirect1RM2: string;

  // Step 6 — Muscular Endurance (two distinct tests required)
  enduranceTestType: EnduranceTestType | '';
  enduranceValueType: 'reps' | 'time';
  enduranceReps: string; enduranceDurationSec: string;
  enduranceTestType2: EnduranceTestType | '';
  enduranceValueType2: 'reps' | 'time';
  enduranceReps2: string; enduranceDurationSec2: string;

  // Step 7 — Flexibility (two distinct tests required — same battery
  // pattern as Muscular Endurance/Strength: trainer can perform any of the
  // available tests, but exactly 2 are needed to complete the step)
  flexibilityTestType: FlexibilityTestType | '';
  flexibilityCustomTest: string;
  flexibilityLeft: string; flexibilityRight: string; flexibilityScore: string;
  flexibilityLimitationNotes: string; flexibilityRom: string;
  flexibilityTestType2: FlexibilityTestType | '';
  flexibilityCustomTest2: string;
  flexibilityLeft2: string; flexibilityRight2: string; flexibilityScore2: string;
  flexibilityLimitationNotes2: string; flexibilityRom2: string;
}

export interface FormErrors {
  bp?: string;
  anthropometric?: string;
  bodyComposition?: string;
  cardio?: string;
  strength?: string;
  endurance?: string;
  flexibility?: string;
}

export const STEPS = [
  { id: 1, key: 'bp', label: 'Blood Pressure' },
  { id: 2, key: 'anthropometric', label: 'Anthropometric Data' },
  { id: 3, key: 'bodyComposition', label: 'Body Composition' },
  { id: 4, key: 'cardio', label: 'Cardiorespiratory Endurance' },
  { id: 5, key: 'strength', label: 'Muscular Strength' },
  { id: 6, key: 'endurance', label: 'Muscular Endurance' },
  { id: 7, key: 'flexibility', label: 'Flexibility' },
] as const;

export type StepId = typeof STEPS[number]['id'];

export function initAssessmentForm(): AssessmentFormData {
  return {
    assessmentDate: todayISO(),
    assessmentType: 'initial',
    assessmentNotes: '',
    trainerId: '', trainerName: '',
    bpSystolic: '', bpDiastolic: '', restingHeartRate: '', restingSpo2: '', bpNotMeasured: false,
    weight: '', heightCm: '', waistCm: '', waistIliacCm: '', hipsCm: '', neckCm: '', chestCm: '',
    armRightCm: '', armLeftCm: '', thighRightCm: '', thighLeftCm: '', calfRightCm: '', calfLeftCm: '',
    bodyCompMethod: '', bodyFatPct: '', muscleMassPct: '', visceralFat: '', subcutaneousFatPct: '',
    bodyWaterPct: '', boneMassKg: '', bmr: '', metabolicAge: '',
    cardioTestType: '',
    cardioTimeMin: '', cardioHeartRate: '', cardioDistanceMeters: '', cardioTreadmillMinutes: '',
    cardioDurationSec: '', cardioPulse1: '', cardioPulse2: '', cardioPulse3: '', cardioRecoveryHr: '',
    strengthExercise: '', strengthCustomExercise: '',
    strengthMode: 'estimated',
    strengthWeightKg: '', strengthReps: '', strengthFormula: 'epley', strengthDirect1RM: '',
    strengthExercise2: '', strengthCustomExercise2: '',
    strengthMode2: 'estimated',
    strengthWeightKg2: '', strengthReps2: '', strengthFormula2: 'epley', strengthDirect1RM2: '',
    enduranceTestType: '', enduranceValueType: 'reps', enduranceReps: '', enduranceDurationSec: '',
    enduranceTestType2: '', enduranceValueType2: 'reps', enduranceReps2: '', enduranceDurationSec2: '',
    flexibilityTestType: '', flexibilityCustomTest: '',
    flexibilityLeft: '', flexibilityRight: '', flexibilityScore: '',
    flexibilityLimitationNotes: '', flexibilityRom: '',
    flexibilityTestType2: '', flexibilityCustomTest2: '',
    flexibilityLeft2: '', flexibilityRight2: '', flexibilityScore2: '',
    flexibilityLimitationNotes2: '', flexibilityRom2: '',
  };
}

// One parser for every measurement in the app. It used to be a hand-rolled
// parseFloat here — and in four sibling files — which read a PREFIX and turned
// '12abc' into 12 with nothing downstream able to tell. See
// toMeasurementOrNull for the whole story.
export { toMeasurementOrNull as n } from '@/lib/forms/normalize';

const STRENGTH_PRESETS: StrengthExercise[] = ['Bench Press', 'Leg Press', 'Squat', 'Deadlift', 'Shoulder Press'];
const FLEX_PRESETS: FlexibilityTestType[] = ['Sit and Reach', 'Hamstring', 'Hip Flexor'];

const str = (v: unknown): string => (v == null ? '' : String(v));

/**
 * A saved test back into the wizard, for Edit. Tests used to be permanent:
 * a typo in the weight fed the goal's starting weight and the strength
 * badges for good.
 */
export function formFromAssessmentRow(row: Record<string, unknown>): AssessmentFormData {
  const f = initAssessmentForm();
  const obj = (v: unknown) => (v && typeof v === 'object' ? v as Record<string, unknown> : {});
  const cd = obj(row.cardio_test_data);
  const sd = obj(row.strength_test_data);
  const ed = obj(row.endurance_test_data);
  const fd = obj(row.flexibility_test_data);
  const st = (k: 'test1' | 'test2') => obj(sd[k]);
  const et = (k: 'test1' | 'test2') => obj(ed[k]);
  const ft = (k: 'test1' | 'test2') => obj(fd[k]);
  const exercise = (name: unknown): { exercise: StrengthExercise | ''; custom: string } => {
    const n = str(name);
    if (!n) return { exercise: '', custom: '' };
    return (STRENGTH_PRESETS as string[]).includes(n) ? { exercise: n as StrengthExercise, custom: '' } : { exercise: 'Custom Exercise', custom: n };
  };
  const flex = (t: Record<string, unknown>): { type: FlexibilityTestType | ''; custom: string } => {
    const n = str(t.testType);
    if (!n) return { type: '', custom: '' };
    return (FLEX_PRESETS as string[]).includes(n) ? { type: n as FlexibilityTestType, custom: str(t.customTestType) } : { type: 'Custom', custom: str(t.customTestType) || n };
  };
  const s1 = exercise(row.strength_exercise);
  const s2 = exercise(row.strength_exercise_2);
  const f1 = flex(ft('test1'));
  const f2 = flex(ft('test2'));
  return {
    ...f,
    assessmentDate: str(row.assessment_date).slice(0, 10) || f.assessmentDate,
    assessmentType: (str(row.assessment_type) || 'initial') as AssessmentType,
    assessmentNotes: str(row.trainer_notes),
    trainerId: str(row.trainer_id), trainerName: str(row.trainer_name),
    bpSystolic: str(row.bp_systolic), bpDiastolic: str(row.bp_diastolic),
    restingHeartRate: str(row.resting_heart_rate), restingSpo2: str(row.resting_spo2),
    bpNotMeasured: /not measured/i.test(str(row.health_notes)),
    weight: str(row.weight), heightCm: str(row.height_cm), waistCm: str(row.waist_cm), waistIliacCm: str(row.waist_iliac_cm),
    hipsCm: str(row.hips_cm), neckCm: str(row.neck_cm), chestCm: str(row.chest_cm),
    armRightCm: str(row.arm_right_cm), armLeftCm: str(row.arm_left_cm), thighRightCm: str(row.thigh_right_cm),
    thighLeftCm: str(row.thigh_left_cm), calfRightCm: str(row.calf_right_cm), calfLeftCm: str(row.calf_left_cm),
    bodyCompMethod: str(row.body_comp_method), bodyFatPct: str(row.body_fat_pct), muscleMassPct: str(row.muscle_mass_pct),
    visceralFat: str(row.visceral_fat), subcutaneousFatPct: str(row.subcutaneous_fat_pct), bodyWaterPct: str(row.body_water_pct),
    boneMassKg: str(row.bone_mass_kg),
    // A BMR the server suggested is recomputed from the new numbers, not frozen.
    bmr: row.bmr_auto_suggested ? '' : str(row.bmr),
    metabolicAge: str(row.metabolic_age),
    cardioTestType: str(row.cardio_test_type) as CardioTestType | '',
    cardioTimeMin: str(cd.timeMin), cardioHeartRate: str(cd.heartRate),
    cardioDistanceMeters: str(row.cardio_test_type === 'Custom' ? cd.notes : cd.distanceMeters),
    cardioTreadmillMinutes: str(cd.treadmillMinutes), cardioDurationSec: str(cd.durationSec),
    cardioPulse1: str(cd.pulse1), cardioPulse2: str(cd.pulse2), cardioPulse3: str(cd.pulse3), cardioRecoveryHr: str(cd.recoveryHr),
    strengthExercise: s1.exercise, strengthCustomExercise: s1.custom,
    strengthMode: st('test1').isDirect ? 'direct' : 'estimated',
    strengthWeightKg: str(st('test1').weightKg), strengthReps: str(st('test1').reps),
    strengthFormula: st('test1').formula === 'brzycki' ? 'brzycki' : 'epley', strengthDirect1RM: str(st('test1').direct1RM),
    strengthExercise2: s2.exercise, strengthCustomExercise2: s2.custom,
    strengthMode2: st('test2').isDirect ? 'direct' : 'estimated',
    strengthWeightKg2: str(st('test2').weightKg), strengthReps2: str(st('test2').reps),
    strengthFormula2: st('test2').formula === 'brzycki' ? 'brzycki' : 'epley', strengthDirect1RM2: str(st('test2').direct1RM),
    enduranceTestType: str(row.endurance_test_type) as EnduranceTestType | '',
    enduranceValueType: et('test1').durationSec != null && et('test1').reps == null ? 'time' : 'reps',
    enduranceReps: str(et('test1').reps), enduranceDurationSec: str(et('test1').durationSec),
    enduranceTestType2: str(row.endurance_test_type_2) as EnduranceTestType | '',
    enduranceValueType2: et('test2').durationSec != null && et('test2').reps == null ? 'time' : 'reps',
    enduranceReps2: str(et('test2').reps), enduranceDurationSec2: str(et('test2').durationSec),
    flexibilityTestType: f1.type, flexibilityCustomTest: f1.custom,
    flexibilityLeft: str(ft('test1').left), flexibilityRight: str(ft('test1').right), flexibilityScore: str(ft('test1').score),
    flexibilityLimitationNotes: str(ft('test1').limitationNotes), flexibilityRom: str(ft('test1').rom),
    flexibilityTestType2: f2.type, flexibilityCustomTest2: f2.custom,
    flexibilityLeft2: str(ft('test2').left), flexibilityRight2: str(ft('test2').right), flexibilityScore2: str(ft('test2').score),
    flexibilityLimitationNotes2: str(ft('test2').limitationNotes), flexibilityRom2: str(ft('test2').rom),
  };
}
