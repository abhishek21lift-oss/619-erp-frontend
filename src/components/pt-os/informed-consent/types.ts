// src/components/pt-os/informed-consent/types.ts
// Form-side shape + step config for the Personal Training Informed Consent
// wizard. Mirrors the pattern in src/components/pt-os/parq/types.ts.

import type { InformedConsent, InformedConsentAcknowledgements } from '@/lib/api';

export interface InformedConsentFormData {
  fullName: string;
  gender: string;
  dob: string;
  mobile: string;
  email: string;
  emergencyContact: string;
  emergencyPhone: string;
  address: string;
  occupation: string;
  acknowledgements: InformedConsentAcknowledgements;
  exerciseConsentChecked: boolean;
  exerciseConsentDate: string;
  exerciseConsentSignature: string;
  clientSignature: string;
  trainerSignature: string;
  witnessSignature: string;
  witnessName: string;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function initInformedConsentForm(): InformedConsentFormData {
  return {
    fullName: '', gender: '', dob: '', mobile: '', email: '',
    emergencyContact: '', emergencyPhone: '', address: '', occupation: '',
    acknowledgements: {},
    exerciseConsentChecked: false, exerciseConsentDate: todayStr(), exerciseConsentSignature: '',
    clientSignature: '', trainerSignature: '', witnessSignature: '', witnessName: '',
  };
}

export function formFromRecord(r: InformedConsent): InformedConsentFormData {
  return {
    fullName: r.full_name || '',
    gender: r.gender || '',
    dob: r.dob ? String(r.dob).slice(0, 10) : '',
    mobile: r.mobile || '',
    email: r.email || '',
    emergencyContact: r.emergency_contact || '',
    emergencyPhone: r.emergency_phone || '',
    address: r.address || '',
    occupation: r.occupation || '',
    acknowledgements: r.acknowledgements || {},
    exerciseConsentChecked: r.exercise_consent_checked ?? false,
    exerciseConsentDate: r.exercise_consent_date ? String(r.exercise_consent_date).slice(0, 10) : todayStr(),
    exerciseConsentSignature: r.exercise_consent_signature || '',
    clientSignature: r.client_signature || '',
    trainerSignature: r.trainer_signature || '',
    witnessSignature: r.witness_signature || '',
    witnessName: r.witness_name || '',
  };
}

export type StepId = 1 | 2 | 3;

export interface StepDef { id: StepId; key: string; label: string; }

export const STEPS: StepDef[] = [
  { id: 1, key: 'exerciseConsent', label: 'Consent' },
  { id: 2, key: 'agreements', label: 'Agreement' },
  { id: 3, key: 'signatures', label: 'Signature' },
];

// ── Exercise Programme Consent — verbatim text, reproduced exactly as
// supplied. The only formatting change from the source is reflowing each
// paragraph's manual mid-sentence line-wraps into a single string — those
// wraps were artifacts of the source document's line width, not
// intentional line breaks, and the spec explicitly allows changes "only
// for responsive web formatting". Paragraph boundaries, wording,
// punctuation, capitalization, and spelling (including "pregnancy’s") are
// unchanged. Do not edit this text anywhere in the app. It is also sent
// to the backend verbatim and stored on the record at signing time.
export const EXERCISE_PROGRAMME_CONSENT_PARAGRAPHS: string[] = [
  'I understand that this physical fitness programme includes exercises to build the cardiorespiratory system (Heart & Lungs), the musculoskeletal system (muscles, joints & bones) and to improve body composition.',
  'Exercise may include aerobic activities such as treadmill, running, walking, bike, rowing, group aerobic activities, weight training and exercises for mobility and flexibility.',
  'I understand that it is my responsibility to inform the instructor of any health problems, injuries, pregnancy’s or recent pregnancies or any other health condition that is relevant to me exercising.',
  'In the event that medical clearance must be obtained prior to my participation in the exercise programme, I agree to consult my physician and obtain written permission from my physician prior to the commencement of any exercise programme.',
  'I understand that I am responsible for monitoring my own condition throughout any exercise programme. Should any unusual symptoms occur I will stop my participation and inform my instructor of the symptoms immediately. I also understand that I may discontinue the sessions at any time due to adverse symptoms and that I should inform my instructor accordingly.',
  'In signing the consent form I affirm that I read this form in its entirety and that I understand the nature of the practical exercise sessions. I also confirm that my questions regarding the exercise programme have been answered to my satisfaction.',
];

export const EXERCISE_PROGRAMME_CONSENT_TEXT = EXERCISE_PROGRAMME_CONSENT_PARAGRAPHS.join('\n\n');

export const EXERCISE_PROGRAMME_CHECKBOX_LABEL =
  'I have read and understood the above consent and agree to participate in the exercise programme.';

export function nextStepId(current: StepId): StepId | null {
  const idx = STEPS.findIndex((s) => s.id === current);
  return idx >= 0 && idx < STEPS.length - 1 ? STEPS[idx + 1].id : null;
}
export function prevStepId(current: StepId): StepId | null {
  const idx = STEPS.findIndex((s) => s.id === current);
  return idx > 0 ? STEPS[idx - 1].id : null;
}

// Section 6 (confidentiality) + Section 7 (voluntary participation) +
// Section 8 (final declaration) — shown together on the Agreement step.
export const FINAL_ACK_FIELDS: { key: keyof InformedConsentAcknowledgements; label: string }[] = [
  { key: 'understands_confidentiality', label: 'I understand my personal and medical information will remain confidential and will only be used for designing, monitoring and improving my personal training program.' },
  { key: 'voluntary_participation', label: 'I understand my participation is voluntary and I can withdraw at any time.' },
  {
    key: 'final_declaration',
    label: 'I confirm that: I have read this entire informed consent document; I understand the risks; I understand the benefits; I have asked all my questions; my questions have been answered; I voluntarily agree to participate.',
  },
];

export function buildCreatePayload(form: InformedConsentFormData, clientId: string): Record<string, unknown> {
  return {
    client_id: clientId,
    full_name: form.fullName,
    gender: form.gender || null,
    dob: form.dob || null,
    mobile: form.mobile || null,
    email: form.email || null,
    emergency_contact: form.emergencyContact || null,
    emergency_phone: form.emergencyPhone || null,
    address: form.address || null,
    occupation: form.occupation || null,
  };
}

export function buildUpdatePayload(form: InformedConsentFormData): Record<string, unknown> {
  return {
    full_name: form.fullName,
    gender: form.gender || null,
    dob: form.dob || null,
    mobile: form.mobile || null,
    email: form.email || null,
    emergency_contact: form.emergencyContact || null,
    emergency_phone: form.emergencyPhone || null,
    address: form.address || null,
    occupation: form.occupation || null,
    acknowledgements: form.acknowledgements,
    // Sent verbatim so the backend stores exactly what was shown/signed,
    // independent of future edits to the canonical text in this file.
    exercise_consent_text: EXERCISE_PROGRAMME_CONSENT_TEXT,
    exercise_consent_checked: form.exerciseConsentChecked,
    exercise_consent_date: form.exerciseConsentDate || null,
    exercise_consent_signature: form.exerciseConsentSignature || null,
  };
}
