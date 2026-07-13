// Client-side PAR-Q risk preview — mirrors (but does not replace) the
// server-computed `parq_yes_count` / `risk_level` / `risk_message` /
// `workout_gate_status` fields. This is a live UX preview only; the backend
// independently recomputes and owns the source of truth.

export type ParqAnswerValue = 'yes' | 'no' | 'not_sure';

export interface ParqAnswerLike {
  question_id: number;
  answer: ParqAnswerValue | '';
}

export type ParqRiskLevel = 'low' | 'medium' | 'high';

export const n = (v: string): number | null => {
  const t = v.trim();
  if (!t) return null;
  const f = parseFloat(t);
  return Number.isFinite(f) ? f : null;
};

export function calcAge(dob: string): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const monthDiff = today.getMonth() - d.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d.getDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}

export function calcBMI(heightCm: number | null, weightKg: number | null): number | null {
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) return null;
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  return Math.round(bmi * 10) / 10;
}

export function classifyBMI(bmi: number | null): string | null {
  if (bmi == null) return null;
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

export interface ParqRiskResult {
  yesCount: number;
  riskLevel: ParqRiskLevel;
  riskMessage: string;
}

const RISK_MESSAGES: Record<ParqRiskLevel, string> = {
  low: 'Approved for Exercise',
  medium: 'Trainer Review Required',
  high: 'Medical Clearance Required — Workout Assignment Disabled',
};

/**
 * Live preview only — mirrors computeParqAnalysis() in the backend's
 * parq.routes.js exactly (0 yes = low, 1-2 = medium, 3+ = high). Must stay
 * in sync with that function: the server recomputes and owns the source of
 * truth on every submit, so a mismatched preview here would show a trainer
 * one risk level while filling the form and a different one after submit.
 */
export function computeParqRisk(answers: ParqAnswerLike[]): ParqRiskResult {
  const yesCount = answers.filter((a) => a.answer === 'yes').length;
  let riskLevel: ParqRiskLevel;
  if (yesCount === 0) riskLevel = 'low';
  else if (yesCount <= 2) riskLevel = 'medium';
  else riskLevel = 'high';
  return { yesCount, riskLevel, riskMessage: RISK_MESSAGES[riskLevel] };
}

export const PARQ_QUESTIONS: { id: number; text: string }[] = [
  { id: 1, text: 'Has your doctor ever said that you have a heart condition and that you should only do physical activity recommended by a doctor?' },
  { id: 2, text: 'Is there any history of heart disease in your family?' },
  { id: 3, text: 'Do you feel pain in your chest during physical activity?' },
  { id: 4, text: 'Have you experienced chest pain during the last month while not exercising?' },
  { id: 5, text: 'Do you lose balance because of dizziness or have you lost consciousness?' },
  { id: 6, text: 'Do you have any bone or joint problem that could worsen with exercise?' },
  { id: 7, text: 'Do you have asthma, diabetes, epilepsy or high blood pressure?' },
  { id: 8, text: 'Do you have any other medical condition like cancer or osteoporosis?' },
  { id: 9, text: 'Are you currently being treated by a doctor or physiotherapist?' },
  { id: 10, text: 'Is there any other reason why you should not exercise?' },
];
