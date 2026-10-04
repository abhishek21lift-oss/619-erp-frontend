// Shared form shape for the PAR-Q + Health Screening wizard — imported by
// the main page and every step component so they don't depend on each
// other. Mirrors the `ParqForm` API contract (src/lib/api.ts) but keeps
// numeric fields as strings for controlled text inputs, converting at the
// form/API boundary via `toPayload()` / `formFromRow()`.

import type {
  ParqAnswerValue, ParqStatus, ClearanceApprovalStatus,
} from '@/lib/api';
import { n, PARQ_QUESTIONS } from '@/lib/parq-calculations';
import { todayISO } from '@/lib/forms/domain';

export { PARQ_QUESTIONS, n };

export interface CurrentHealthForm {
  known_disease: boolean; known_disease_details: string;
  activity_level: string;
  dietary_habits: string;
  water_intake: string;
  caffeine: boolean; caffeine_details: string;
  alcohol: boolean; alcohol_details: string;
  smoking: boolean; smoking_details: string;
  tobacco: boolean; tobacco_details: string;
  nicotine: boolean; nicotine_details: string;
  sleep_hours: string;
  medications: boolean; medications_details: string;
  supplements: boolean; supplements_details: string;
  steroids_ped: boolean; steroids_ped_details: string;
  recreational_drugs: boolean; recreational_drugs_details: string;
  current_treatment: boolean; current_treatment_details: string;
  has_pain: boolean;
  pain_scale: string;
  pain_location: string;
  pain_description: string;
}

export interface PastHistoryForm {
  heart_disease: boolean;
  respiratory_disease: boolean;
  asthma: boolean;
  copd: boolean;
  tuberculosis: boolean;
  joint_problems: boolean;
  back_pain: boolean;
  neck_pain: boolean;
  knee_pain: boolean;
  shoulder_pain: boolean;
  hip_pain: boolean;
  previous_fractures: boolean;
  surgeries: boolean;
  hospitalization: boolean;
  exercise_history: string;
  occupation: string;
  work_posture: string;
  daily_sitting_hours: string;
  previous_injuries: string;
  previous_physiotherapy: boolean;
  previous_trainer: boolean;
  exercise_experience: string;
}

export interface TrainerNotesForm {
  observations: string;
  posture: string;
  movement_limitations: string;
  recommendations: string;
  contraindications: string;
  precautions: string;
  summary: string;
}

export interface ParqAnswerForm {
  question_id: number;
  answer: ParqAnswerValue | '';
  explanation: string;
  diagnosis_date: string;
  treatment: string;
  doctor_name: string;
  hospital: string;
  notes: string;
}

export interface ConsentCheckboxesForm {
  info_true: boolean;
  understands_risk: boolean;
  will_inform_changes: boolean;
  understands_incorrect_info_risk: boolean;
  voluntary_participation: boolean;
  consents_emergency_care: boolean;
  agrees_data_storage: boolean;
}

export interface MedicalClearanceForm {
  doctor_name: string;
  hospital: string;
  clearance_date: string;
  certificate_url: string;
  doctor_contact: string;
  expiry_date: string;
  approval_status: ClearanceApprovalStatus;
}

/** One relative's history. Only relatives with something ticked are sent. */
export type FamilyRelation = 'father' | 'mother' | 'brother' | 'sister' | 'grandparent';
export type FamilyCondition = 'heart_disease' | 'sudden_death' | 'hypertension' | 'diabetes' | 'stroke';
export type FamilyHistoryForm = Record<FamilyRelation, Record<FamilyCondition, boolean>>;

export const FAMILY_RELATIONS: { key: FamilyRelation; label: string }[] = [
  { key: 'father', label: 'Father' }, { key: 'mother', label: 'Mother' },
  { key: 'brother', label: 'Brother' }, { key: 'sister', label: 'Sister' },
  { key: 'grandparent', label: 'Grandparent' },
];
export const FAMILY_CONDITIONS: { key: FamilyCondition; label: string }[] = [
  { key: 'heart_disease', label: 'Heart disease' },
  { key: 'sudden_death', label: 'Sudden death' },
  { key: 'hypertension', label: 'High BP' },
  { key: 'diabetes', label: 'Diabetes' },
  { key: 'stroke', label: 'Stroke' },
];

export function initFamilyHistory(): FamilyHistoryForm {
  const row = () => ({ heart_disease: false, sudden_death: false, hypertension: false, diabetes: false, stroke: false });
  return { father: row(), mother: row(), brother: row(), sister: row(), grandparent: row() };
}

export interface ParqFormData {
  assessmentDate: string;
  fullName: string;
  gender: string;
  dob: string;
  mobile: string;
  email: string;
  emergencyContact: string;
  emergencyPhone: string;
  bloodGroup: string;
  heightCm: string;
  weightKg: string;
  trainerName: string;

  currentHealth: CurrentHealthForm;
  pastHistory: PastHistoryForm;
  familyHistory: FamilyHistoryForm;
  parqAnswers: ParqAnswerForm[];
  medicalClearance: MedicalClearanceForm;
  trainerNotes: TrainerNotesForm;

  consentCheckboxes: ConsentCheckboxesForm;
  clientSignature: string;
  trainerSignature: string;
  consentLocation: string;

  status: ParqStatus;
}

export interface FormErrors {
  currentHealth?: string;
  pastHistory?: string;
  parqQuestionnaire?: string;
  medicalClearance?: string;
  trainerNotes?: string;
  consent?: string;
}

// Order: PAR-Q leads (it's the gatekeeper), Medical Clearance immediately
// follows it since clearance is only ever needed because of what PAR-Q
// found — then Past History, Current Health, Digital Consent, Review.
export const STEPS = [
  { id: 1, key: 'parqQuestionnaire', label: 'PAR-Q' },
  { id: 2, key: 'medicalClearance', label: 'Medical Clearance', conditional: true },
  { id: 3, key: 'pastHistory', label: 'Past History' },
  { id: 4, key: 'currentHealth', label: 'Current Health' },
  // A `trainerNotes` step used to sit here (id 7), between Current Health and
  // Digital Consent. It is no longer shown: the trainer's own findings are
  // recorded elsewhere, and an empty step between two steps of the client's own
  // screening was a dead end to click through.
  //
  // Display-only removal. `trainer_notes` is still a column, still on
  // ParqFormDetail, still read by mappers.ts, and still written by the submit
  // payload — so a screening that already carries notes keeps them, and
  // re-submitting an amended screening round-trips them untouched. Everything
  // that walks the wizard derives from this array, so dropping the entry
  // renumbers the stepper, nextStepId, prevStepId and stepPositionLabel
  // together; nothing else needed changing.
  //
  // Digital Consent is the LAST step, so its primary button reads "Submit"
  // rather than "Next" — that falls out of `isLastStep`, which is
  // `nextStepId(step) == null`, rather than being special-cased anywhere.
  //
  // A `review` step used to sit after it. It was removed: it restated answers
  // the user had just given, one screen after giving them, and the signature
  // captured on the consent step is the actual point of commitment. Asking
  // someone to confirm after they have already signed puts the confirmation
  // in the wrong place.
  { id: 5, key: 'consent', label: 'Digital Consent' },
] as const;

export type StepId = typeof STEPS[number]['id'];

/** Steps visible in the stepper/navigation for the given live risk level —
 *  Medical Clearance only appears when risk is HIGH. */
export function visibleSteps(riskLevel: 'low' | 'medium' | 'high') {
  return STEPS.filter((s) => !('conditional' in s && s.conditional) || riskLevel === 'high');
}

/** "Step N of M" for a given step key against the *visible* step list for
 *  this risk level — so for the common (non-high-risk) client, numbering
 *  runs 1-7 with no gap where Medical Clearance would have sat, instead of
 *  a stale count baked in per-component that assumed clearance always
 *  occupies a slot. */
export function stepPositionLabel(key: string, riskLevel: 'low' | 'medium' | 'high'): string {
  const vis = visibleSteps(riskLevel);
  const idx = vis.findIndex((s) => s.key === key);
  return `Step ${idx + 1} of ${vis.length}`;
}

export function nextStepId(current: StepId, riskLevel: 'low' | 'medium' | 'high'): StepId | null {
  const vis = visibleSteps(riskLevel);
  const idx = vis.findIndex((s) => s.id === current);
  if (idx === -1 || idx === vis.length - 1) return null;
  return vis[idx + 1].id;
}

export function prevStepId(current: StepId, riskLevel: 'low' | 'medium' | 'high'): StepId | null {
  const vis = visibleSteps(riskLevel);
  const idx = vis.findIndex((s) => s.id === current);
  if (idx <= 0) return null;
  return vis[idx - 1].id;
}

// What the PAR-Q signature attests: the answers. Risk, voluntary
// participation, emergency care and data use are agreed on the Informed
// Consent — they used to be ticked and signed here too. The other keys stay
// on ConsentCheckboxesForm because older records carry them.
export const CONSENT_CHECKBOX_FIELDS: { key: keyof ConsentCheckboxesForm; label: string }[] = [
  { key: 'info_true', label: 'The answers in this screening are true and complete to the best of my knowledge, and I will tell my trainer if my health changes.' },
];

export const TRAINER_NOTES_FIELDS: { key: keyof TrainerNotesForm; label: string }[] = [
  { key: 'observations', label: 'Observations' },
  { key: 'movement_limitations', label: 'Movement Limitations' },
  { key: 'recommendations', label: 'Recommendations' },
  { key: 'contraindications', label: 'Contraindications' },
  { key: 'precautions', label: 'Precautions' },
  { key: 'summary', label: 'Summary' },
];

export function initCurrentHealth(): CurrentHealthForm {
  return {
    known_disease: false, known_disease_details: '',
    activity_level: '', dietary_habits: '', water_intake: '',
    caffeine: false, caffeine_details: '',
    alcohol: false, alcohol_details: '',
    smoking: false, smoking_details: '',
    tobacco: false, tobacco_details: '',
    nicotine: false, nicotine_details: '',
    sleep_hours: '',
    medications: false, medications_details: '',
    supplements: false, supplements_details: '',
    steroids_ped: false, steroids_ped_details: '',
    recreational_drugs: false, recreational_drugs_details: '',
    current_treatment: false, current_treatment_details: '',
    has_pain: false, pain_scale: '', pain_location: '', pain_description: '',
  };
}

export function initPastHistory(): PastHistoryForm {
  return {
    heart_disease: false, respiratory_disease: false, asthma: false, copd: false, tuberculosis: false,
    joint_problems: false, back_pain: false, neck_pain: false, knee_pain: false, shoulder_pain: false, hip_pain: false,
    previous_fractures: false, surgeries: false, hospitalization: false,
    exercise_history: '', occupation: '', work_posture: '', daily_sitting_hours: '',
    previous_injuries: '', previous_physiotherapy: false, previous_trainer: false, exercise_experience: '',
  };
}

export function initTrainerNotes(): TrainerNotesForm {
  return {
    observations: '', posture: '', movement_limitations: '', recommendations: '',
    contraindications: '', precautions: '', summary: '',
  };
}

export function initParqAnswers(): ParqAnswerForm[] {
  return PARQ_QUESTIONS.map((q) => ({
    question_id: q.id, answer: '', explanation: '', diagnosis_date: '', treatment: '', doctor_name: '', hospital: '', notes: '',
  }));
}

export function initMedicalClearance(): MedicalClearanceForm {
  return { doctor_name: '', hospital: '', clearance_date: '', certificate_url: '', doctor_contact: '', expiry_date: '', approval_status: 'pending' };
}

export function initConsentCheckboxes(): ConsentCheckboxesForm {
  return {
    info_true: false, understands_risk: false, will_inform_changes: false,
    understands_incorrect_info_risk: false, voluntary_participation: false,
    consents_emergency_care: false, agrees_data_storage: false,
  };
}

export function initParqForm(): ParqFormData {
  return {
    assessmentDate: todayISO(),
    fullName: '', gender: '', dob: '', mobile: '', email: '',
    emergencyContact: '', emergencyPhone: '', bloodGroup: '',
    heightCm: '', weightKg: '', trainerName: '',
    currentHealth: initCurrentHealth(),
    pastHistory: initPastHistory(),
    familyHistory: initFamilyHistory(),
    parqAnswers: initParqAnswers(),
    medicalClearance: initMedicalClearance(),
    trainerNotes: initTrainerNotes(),
    consentCheckboxes: initConsentCheckboxes(),
    clientSignature: '', trainerSignature: '', consentLocation: '',
    status: 'draft',
  };
}
