// Conversions between the wizard's string-based form state and the
// ParqForm(Detail) API contract (src/lib/api.ts).

import type {
  ParqFormDetail, ParqAnswerValue, ParqStatus, ClearanceApprovalStatus,
} from '@/lib/api';
import {
  type ParqFormData, type ParqAnswerForm,
  initParqForm, initParqAnswers, PARQ_QUESTIONS, n,
} from './types';

function s(v: unknown): string {
  if (v == null) return '';
  return String(v);
}

function b(v: unknown): boolean {
  return v === true;
}

/** Hydrates wizard form state from an existing ParqFormDetail row (edit mode). */
export function formFromRow(row: ParqFormDetail): ParqFormData {
  const fresh = initParqForm();
  const ch = row.current_health ?? ({} as ParqFormDetail['current_health']);
  const ph = row.past_history ?? ({} as ParqFormDetail['past_history']);
  const tn = row.trainer_notes ?? ({} as ParqFormDetail['trainer_notes']);
  const mc = row.medical_clearance;
  const consent = row.consent;

  const answersByQ = new Map<number, ParqAnswerForm>();
  (row.parq_answers ?? []).forEach((a) => {
    answersByQ.set(a.question_id, {
      question_id: a.question_id,
      answer: (a.answer as ParqAnswerValue) ?? '',
      explanation: s(a.explanation), diagnosis_date: a.diagnosis_date ? String(a.diagnosis_date).slice(0, 10) : '',
      treatment: s(a.treatment), doctor_name: s(a.doctor_name), hospital: s(a.hospital), notes: s(a.notes),
    });
  });
  const parqAnswers = PARQ_QUESTIONS.map((q) => answersByQ.get(q.id) ?? initParqAnswers().find((a) => a.question_id === q.id)!);

  return {
    ...fresh,
    assessmentDate: row.assessment_date ? String(row.assessment_date).slice(0, 10) : fresh.assessmentDate,
    fullName: s(row.full_name), gender: s(row.gender), dob: row.dob ? String(row.dob).slice(0, 10) : '',
    mobile: s(row.mobile), email: s(row.email),
    emergencyContact: s(row.emergency_contact), emergencyPhone: s(row.emergency_phone),
    bloodGroup: s(row.blood_group),
    heightCm: row.height_cm != null ? String(row.height_cm) : '',
    weightKg: row.weight_kg != null ? String(row.weight_kg) : '',
    trainerName: s(row.trainer_name),
    currentHealth: {
      known_disease: b(ch.known_disease), known_disease_details: s(ch.known_disease_details),
      activity_level: s(ch.activity_level), dietary_habits: s(ch.dietary_habits), water_intake: s(ch.water_intake),
      caffeine: b(ch.caffeine), caffeine_details: s(ch.caffeine_details),
      alcohol: b(ch.alcohol), alcohol_details: s(ch.alcohol_details),
      smoking: b(ch.smoking), smoking_details: s(ch.smoking_details),
      tobacco: b(ch.tobacco), tobacco_details: s(ch.tobacco_details),
      nicotine: b(ch.nicotine), nicotine_details: s(ch.nicotine_details),
      sleep_hours: ch.sleep_hours != null ? String(ch.sleep_hours) : '',
      medications: b(ch.medications), medications_details: s(ch.medications_details),
      supplements: b(ch.supplements), supplements_details: s(ch.supplements_details),
      steroids_ped: b(ch.steroids_ped), steroids_ped_details: s(ch.steroids_ped_details),
      recreational_drugs: b(ch.recreational_drugs), recreational_drugs_details: s(ch.recreational_drugs_details),
      current_treatment: b(ch.current_treatment), current_treatment_details: s(ch.current_treatment_details),
      has_pain: b(ch.has_pain),
      pain_scale: ch.pain_scale != null ? String(ch.pain_scale) : '',
      pain_location: s(ch.pain_location), pain_description: s(ch.pain_description),
    },
    pastHistory: {
      heart_disease: b(ph.heart_disease), respiratory_disease: b(ph.respiratory_disease), asthma: b(ph.asthma),
      copd: b(ph.copd), tuberculosis: b(ph.tuberculosis), joint_problems: b(ph.joint_problems),
      back_pain: b(ph.back_pain), neck_pain: b(ph.neck_pain), knee_pain: b(ph.knee_pain),
      shoulder_pain: b(ph.shoulder_pain), hip_pain: b(ph.hip_pain), previous_fractures: b(ph.previous_fractures),
      surgeries: b(ph.surgeries), hospitalization: b(ph.hospitalization),
      exercise_history: s(ph.exercise_history), occupation: s(ph.occupation), work_posture: s(ph.work_posture),
      daily_sitting_hours: ph.daily_sitting_hours != null ? String(ph.daily_sitting_hours) : '',
      previous_injuries: s(ph.previous_injuries),
      previous_physiotherapy: b(ph.previous_physiotherapy), previous_trainer: b(ph.previous_trainer),
      exercise_experience: s(ph.exercise_experience),
    },
    parqAnswers,
    medicalClearance: mc ? {
      doctor_name: s(mc.doctor_name), hospital: s(mc.hospital),
      clearance_date: mc.clearance_date ? String(mc.clearance_date).slice(0, 10) : '',
      certificate_url: s(mc.certificate_url), doctor_contact: s(mc.doctor_contact),
      expiry_date: mc.expiry_date ? String(mc.expiry_date).slice(0, 10) : '',
      approval_status: (mc.approval_status as ClearanceApprovalStatus) ?? 'pending',
    } : fresh.medicalClearance,
    trainerNotes: {
      observations: s(tn.observations), posture: s(tn.posture), movement_limitations: s(tn.movement_limitations),
      recommendations: s(tn.recommendations), contraindications: s(tn.contraindications),
      precautions: s(tn.precautions), summary: s(tn.summary),
    },
    consentCheckboxes: consent?.consent_checkboxes ?? fresh.consentCheckboxes,
    clientSignature: s(consent?.client_signature), trainerSignature: s(consent?.trainer_signature),
    consentLocation: s(consent?.location),
    status: (row.status as ParqStatus) ?? 'draft',
  };
}

/** Builds the POST/PATCH body for /api/pt-os/parq/forms. Never includes
 *  parq_yes_count / risk_level / risk_message / workout_gate_status — those
 *  are server-computed and would be ignored/overwritten anyway. */
export function buildFormPayload(form: ParqFormData, clientId: string): Record<string, unknown> {
  const ch = form.currentHealth;
  const ph = form.pastHistory;

  return {
    client_id: clientId,
    assessment_date: form.assessmentDate || undefined,
    full_name: form.fullName || undefined,
    gender: form.gender || undefined,
    dob: form.dob || undefined,
    mobile: form.mobile || undefined,
    email: form.email || undefined,
    emergency_contact: form.emergencyContact || undefined,
    emergency_phone: form.emergencyPhone || undefined,
    blood_group: form.bloodGroup || undefined,
    height_cm: n(form.heightCm) ?? undefined,
    weight_kg: n(form.weightKg) ?? undefined,
    trainer_name: form.trainerName || undefined,
    current_health: {
      known_disease: ch.known_disease, known_disease_details: ch.known_disease_details || undefined,
      activity_level: ch.activity_level || undefined, dietary_habits: ch.dietary_habits || undefined,
      water_intake: ch.water_intake || undefined,
      caffeine: ch.caffeine, caffeine_details: ch.caffeine_details || undefined,
      alcohol: ch.alcohol, alcohol_details: ch.alcohol_details || undefined,
      smoking: ch.smoking, smoking_details: ch.smoking_details || undefined,
      tobacco: ch.tobacco, tobacco_details: ch.tobacco_details || undefined,
      nicotine: ch.nicotine, nicotine_details: ch.nicotine_details || undefined,
      sleep_hours: n(ch.sleep_hours) ?? undefined,
      medications: ch.medications, medications_details: ch.medications_details || undefined,
      supplements: ch.supplements, supplements_details: ch.supplements_details || undefined,
      steroids_ped: ch.steroids_ped, steroids_ped_details: ch.steroids_ped_details || undefined,
      recreational_drugs: ch.recreational_drugs, recreational_drugs_details: ch.recreational_drugs_details || undefined,
      current_treatment: ch.current_treatment, current_treatment_details: ch.current_treatment_details || undefined,
      has_pain: ch.has_pain,
      pain_scale: n(ch.pain_scale) ?? undefined,
      pain_location: ch.pain_location || undefined, pain_description: ch.pain_description || undefined,
    },
    past_history: {
      heart_disease: ph.heart_disease, respiratory_disease: ph.respiratory_disease, asthma: ph.asthma,
      copd: ph.copd, tuberculosis: ph.tuberculosis, joint_problems: ph.joint_problems,
      back_pain: ph.back_pain, neck_pain: ph.neck_pain, knee_pain: ph.knee_pain,
      shoulder_pain: ph.shoulder_pain, hip_pain: ph.hip_pain, previous_fractures: ph.previous_fractures,
      surgeries: ph.surgeries, hospitalization: ph.hospitalization,
      exercise_history: ph.exercise_history || undefined, occupation: ph.occupation || undefined,
      work_posture: ph.work_posture || undefined,
      daily_sitting_hours: n(ph.daily_sitting_hours) ?? undefined,
      previous_injuries: ph.previous_injuries || undefined,
      previous_physiotherapy: ph.previous_physiotherapy, previous_trainer: ph.previous_trainer,
      exercise_experience: ph.exercise_experience || undefined,
    },
    parq_answers: form.parqAnswers
      .filter((a) => a.answer)
      .map((a) => ({
        question_id: a.question_id,
        answer: a.answer,
        explanation: a.explanation || undefined,
        diagnosis_date: a.diagnosis_date || undefined,
        treatment: a.treatment || undefined,
        doctor_name: a.doctor_name || undefined,
        hospital: a.hospital || undefined,
        notes: a.notes || undefined,
      })),
    trainer_notes: { ...form.trainerNotes },
    status: form.status,
  };
}

export function buildClearancePayload(form: ParqFormData): Record<string, unknown> {
  const mc = form.medicalClearance;
  return {
    doctor_name: mc.doctor_name || undefined,
    hospital: mc.hospital || undefined,
    clearance_date: mc.clearance_date || undefined,
    certificate_url: mc.certificate_url || undefined,
    doctor_contact: mc.doctor_contact || undefined,
    expiry_date: mc.expiry_date || undefined,
    approval_status: mc.approval_status,
  };
}

/** `userAgent` is best-effort audit metadata (per the spec's "capture
 *  navigator.userAgent" instruction) — sent as an extra `user_agent` field
 *  alongside the documented contract fields; harmless if the backend
 *  ignores unknown JSON keys. */
export function buildConsentPayload(form: ParqFormData, userAgent?: string): Record<string, unknown> {
  return {
    consent_checkboxes: { ...form.consentCheckboxes },
    client_signature: form.clientSignature,
    trainer_signature: form.trainerSignature,
    location: form.consentLocation || undefined,
    user_agent: userAgent || undefined,
  };
}
