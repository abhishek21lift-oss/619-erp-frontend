// Shared form shape for the Fitness Testing module — imported by the main
// page and every step component so they don't depend on each other.

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
    assessmentDate: new Date().toISOString().slice(0, 10),
    assessmentType: 'initial',
    assessmentNotes: '',
    trainerId: '', trainerName: '',
    bpSystolic: '', bpDiastolic: '', restingHeartRate: '', restingSpo2: '',
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

export const n = (v: string): number | null => {
  const t = v.trim();
  if (!t) return null;
  const f = parseFloat(t);
  return Number.isFinite(f) ? f : null;
};
