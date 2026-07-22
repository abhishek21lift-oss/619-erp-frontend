// Shared form shape for the PAR-Q + Health Screening wizard — imported by
// the main page and every step component so they don't depend on each
// other. Mirrors the `ParqForm` API contract (src/lib/api.ts) but keeps
// numeric fields as strings for controlled text inputs, converting at the
// form/API boundary via `toPayload()` / `formFromRow()`.

import type {
  ParqAnswerValue, ParqStatus, ClearanceApprovalStatus,
} from '@/lib/api';
import { n, PARQ_QUESTIONS } from '@/lib/parq-calculations';

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

export const STEPS = [
  { id: 1, key: 'currentHealth', label: 'Current Health' },
  { id: 2, key: 'pastHistory', label: 'Past History' },
  { id: 3, key: 'parqQuestionnaire', label: 'PAR-Q' },
  { id: 4, key: 'medicalClearance', label: 'Medical Clearance', conditional: true },
  { id: 5, key: 'trainerNotes', label: 'Trainer Notes' },
  { id: 6, key: 'consent', label: 'Digital Consent' },
  { id: 7, key: 'review', label: 'Review' },
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

export const CONSENT_CHECKBOX_FIELDS: { key: keyof ConsentCheckboxesForm; label: string }[] = [
  { key: 'info_true', label: 'All information provided above is true and accurate to the best of my knowledge.' },
  { key: 'understands_risk', label: 'I understand that physical activity carries inherent risks, including injury.' },
  { key: 'will_inform_changes', label: 'I will inform my trainer immediately of any changes to my health status.' },
  { key: 'understands_incorrect_info_risk', label: 'I understand that providing incorrect or incomplete information may endanger my health.' },
  { key: 'voluntary_participation', label: 'My participation in this training program is entirely voluntary.' },
  { key: 'consents_emergency_care', label: 'I consent to receive emergency medical care if required during a session.' },
  { key: 'agrees_data_storage', label: "I agree to my health data being securely stored and used for my training program." },
];

export const TRAINER_NOTES_FIELDS: { key: keyof TrainerNotesForm; label: string }[] = [
  { key: 'observations', label: 'Observations' },
  { key: 'posture', label: 'Posture' },
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
    assessmentDate: new Date().toISOString().slice(0, 10),
    fullName: '', gender: '', dob: '', mobile: '', email: '',
    emergencyContact: '', emergencyPhone: '', bloodGroup: '',
    heightCm: '', weightKg: '', trainerName: '',
    currentHealth: initCurrentHealth(),
    pastHistory: initPastHistory(),
    parqAnswers: initParqAnswers(),
    medicalClearance: initMedicalClearance(),
    trainerNotes: initTrainerNotes(),
    consentCheckboxes: initConsentCheckboxes(),
    clientSignature: '', trainerSignature: '', consentLocation: '',
    status: 'draft',
  };
}
