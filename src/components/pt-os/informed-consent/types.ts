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
  physicianAdvisedAgainst: boolean | null;
  physicianName: string;
  hospital: string;
  medicalCondition: string;
  clientSignature: string;
  trainerSignature: string;
  witnessSignature: string;
  witnessName: string;
}

export function initInformedConsentForm(): InformedConsentFormData {
  return {
    fullName: '', gender: '', dob: '', mobile: '', email: '',
    emergencyContact: '', emergencyPhone: '', address: '', occupation: '',
    acknowledgements: {},
    physicianAdvisedAgainst: null, physicianName: '', hospital: '', medicalCondition: '',
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
    physicianAdvisedAgainst: r.physician_advised_against ?? null,
    physicianName: r.physician_name || '',
    hospital: r.hospital || '',
    medicalCondition: r.medical_condition || '',
    clientSignature: r.client_signature || '',
    trainerSignature: r.trainer_signature || '',
    witnessSignature: r.witness_signature || '',
    witnessName: r.witness_name || '',
  };
}

export type StepId = 1 | 2 | 3 | 4 | 5 | 6;

export interface StepDef { id: StepId; key: string; label: string; }

export const STEPS: StepDef[] = [
  { id: 1, key: 'clientInfo', label: 'Client Info' },
  { id: 2, key: 'overview', label: 'Program Overview' },
  { id: 3, key: 'risks', label: 'Risks & Responsibilities' },
  { id: 4, key: 'clearance', label: 'Medical Clearance' },
  { id: 5, key: 'agreements', label: 'Agreements' },
  { id: 6, key: 'signatures', label: 'Signatures' },
];

export function nextStepId(current: StepId): StepId | null {
  const idx = STEPS.findIndex((s) => s.id === current);
  return idx >= 0 && idx < STEPS.length - 1 ? STEPS[idx + 1].id : null;
}
export function prevStepId(current: StepId): StepId | null {
  const idx = STEPS.findIndex((s) => s.id === current);
  return idx > 0 ? STEPS[idx - 1].id : null;
}

// Section 4 (client responsibilities) + Section 2 (risk acknowledgement) —
// shown together on the Risks & Responsibilities step.
export const RISK_ACK_FIELDS: { key: keyof InformedConsentAcknowledgements; label: string }[] = [
  { key: 'understands_risk', label: 'I understand the possible risks of personal training (muscle soreness/strain, joint discomfort, elevated heart rate/blood pressure, fatigue, dizziness, falls, injury).' },
  { key: 'accurate_medical_history', label: 'I provided accurate medical history.' },
  { key: 'will_inform_pain', label: 'I will immediately inform my trainer if I feel pain.' },
  { key: 'will_stop_if_dizzy', label: 'I understand I should stop exercise if I experience dizziness.' },
  { key: 'will_stop_if_chest_pain', label: 'I understand I should stop if I have chest pain.' },
  { key: 'will_communicate_changes', label: 'I understand I must communicate any health changes.' },
  { key: 'will_follow_instructions', label: 'I agree to follow trainer instructions.' },
];

// Section 6 (confidentiality) + Section 7 (voluntary participation) +
// Section 8 (final declaration) — shown together on the Agreements step.
export const FINAL_ACK_FIELDS: { key: keyof InformedConsentAcknowledgements; label: string }[] = [
  { key: 'understands_confidentiality', label: 'I understand my personal and medical information will remain confidential and will only be used for designing, monitoring and improving my personal training program.' },
  { key: 'voluntary_participation', label: 'I understand my participation is voluntary and I can withdraw at any time.' },
  {
    key: 'final_declaration',
    label: 'I confirm that: I have read this entire informed consent document; I understand the risks; I understand the benefits; I have asked all my questions; my questions have been answered; I voluntarily agree to participate.',
  },
];

export const ALL_ACK_FIELDS = [...RISK_ACK_FIELDS, ...FINAL_ACK_FIELDS];

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
    physician_advised_against: form.physicianAdvisedAgainst,
    physician_name: form.physicianName || null,
    hospital: form.hospital || null,
    medical_condition: form.medicalCondition || null,
  };
}
