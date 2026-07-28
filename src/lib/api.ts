import { http, httpSSE, apiBase } from './http';
export { http };
import type { Role } from './roles';

export { ROLES, normaliseRole, hasRole, isAdminOrManager } from './roles';

/** Query string from a params object, dropping empties so `?status=` never
 *  reaches the server as a filter for the empty string. `omit` is for keys
 *  that make sense on a paged request but not on an export of the whole set. */
function qsOf(params: Record<string, unknown>, omit: string[] = []): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '' && !omit.includes(k)) qs.set(k, String(v));
  }
  const q = qs.toString();
  return q ? `?${q}` : '';
}

// ─────────────────────────── Types ───────────────────────────────────

export type DuplicateGroup = {
  normalized_name: string;
  display_name: string;
  record_count: number;
  first_seen: string;
  subscription_starts: string[] | null;
  total_final: string;
  total_paid: string;
  balance: string;
  master_id: string;
  all_ids: string[];
  mobile: string | null;
  latest_plan: string | null;
  trainer_name: string | null;
};

export type MergeResult = {
  name: string;
  master_id: string;
  merged_count: number;
  total_final: number;
  total_paid: number;
  balance: number;
};

export type User = {
  id: string;
  name?: string;
  email: string;
  role?: Role;
  trainer_id?: string;
  member_id?: string;
  is_active?: boolean;
  organization_id?: string | null;
  organization_name?: string | null;
  organization_logo_url?: string | null;
};

// Types matching the /api/profile/* contract exactly (src/routes/profile.js).
export interface ProfileMe {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  location: string;
  bio: string;
  avatarUrl: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  mfaEnabled: boolean;
}

export interface NotificationPreferences {
  email_logins: boolean;
  email_payments: boolean;
  email_reports: boolean;
  email_marketing: boolean;
  push_logins: boolean;
  push_tasks: boolean;
  push_mentions: boolean;
  whatsapp_alerts: boolean;
  frequency: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  compactMode: boolean;
}

export interface ProfileDevice {
  id: string;
  name: string;
  type: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  ip: string;
  location: string;
  lastSeen: string;
  isCurrent: boolean;
}

export interface ProfileSession {
  id: string;
  ip: string;
  location: string;
  device: string;
  browser: string;
  createdAt: string;
  lastActive: string;
  isCurrent: boolean;
}

export interface ActivityEvent {
  id: string;
  type: string;
  description: string;
  ip: string;
  location: string;
  createdAt: string;
  category: string;
}

export interface ActivityFeed {
  events: ActivityEvent[];
  hasMore: boolean;
  total: number;
}

export type Client = {
  id: string;
  name: string;
  first_name?: string;
  last_name?: string;
  country_code?: string;
  mobile?: string;
  phone?: string;
  is_mobile_redacted?: boolean;
  alt_country_code?: string;
  alt_mobile?: string;
  email?: string;
  emergency_no?: string;
  gender?: string;
  dob?: string;
  anniversary?: string;
  weight?: number;
  height?: number;
  reference_no?: string;
  aadhaar_no?: string;
  pan_no?: string;
  gst_no?: string;
  company_name?: string;
  address?: string;
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  client_id?: string;
  member_code?: string;
  trainer_id?: string;
  trainer_name?: string;
  package_type?: string;
  membership_plan?: string;
  status?: string;
  balance_amount?: number;
  balance_due?: number;
  frozen_from?: string;
  frozen_until?: string;
  freeze_from?: string;
  freeze_until?: string;
  pt_start_date?: string;
  pt_end_date?: string;
  expiry_date?: string;
  pt_sessions_left?: number;
  pt_sessions_total?: number;
  subscription_end_date?: string;
  subscription_start_date?: string;
  plan_name?: string;
  photo_url?: string;
  notes?: string;
  joining_date?: string;
  created_at?: string;
  updated_at?: string;
  is_frozen?: boolean;
  paid_amount?: number;
  final_amount?: number;
  combo_plan?: string;
  interested_in?: string;
};

export type DuesItem = {
  id: string;
  name?: string;
  client_id?: string;
  mobile?: string;
  balance_amount?: number;
  pt_end_date?: string;
  status?: string;
  trainer_name?: string;
};

export type Payment = {
  id: string;
  receipt_no?: string;
  client_id?: string;
  client_name?: string;
  amount: number;
  method: string;
  date: string;
  notes?: string;
  trainer_name?: string;
};

export type Attendance = {
  id?: string;
  ref_id: string;
  ref_type?: string;
  ref_name?: string;
  date?: string;
  check_in?: string;
  check_out?: string;
  status: string;
  method?: string;
  notes?: string;
  trainer_id?: string;
  trainer_name?: string;
  created_at?: string;
};

export type Trainer = {
  id: string;
  name: string;
  mobile?: string;
  email?: string;
  role?: string;
  /** primary specialization string (comma-separated) */
  specialty?: string;
  /** alias used by some API responses */
  specialization?: string;
  is_active?: boolean;
  created_at?: string;
  /** stats returned by /api/trainers list */
  active_clients?: number;
  total_clients?: number;
  month_revenue?: number | string;
  total_revenue?: number | string;
  experience_years?: number;
};

export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export type LeaveRequest = {
  id: string;
  trainer_id?: string;
  trainer_name?: string;
  leave_type?: string;
  from_date?: string;
  to_date?: string;
  reason?: string;
  status: LeaveStatus;
  notes?: string;
  admin_note?: string;
  approved_by?: string;
  approved_at?: string;
  days?: number;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
};

export type LeaveRequestPayload = {
  trainer_id: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  reason?: string;
};

export type TrainerSummaryRow = {
  id: string | number;
  name: string;
  active_clients?: number;
  total_clients?: number;
  month_revenue?: number;
  total_revenue?: number;
  [key: string]: unknown;
};

export type PtClientBase = {
  id: string;
  unique_id?: string;
  client_id: string;
  name: string;
  mobile: string;
  email?: string;
  photo_url?: string;
  gender?: string;
  dob?: string;
  weight?: number;
  notes?: string;
  address?: string;
  emergency_no?: string;
  trainer_name: string;
  package_type: string;
  final_amount: number;
  paid_amount: number;
  balance_amount: number;
  pt_end_date: string;
  days_left: number;
  status: string;
};

// ─────────────────────── PAR-Q / Health Screening ──────────────────────
// Types matching the /api/pt-os/parq/* contract exactly. Fields marked
// "server-computed" are never sent by the client — the backend computes
// and returns them; any value the client sends for those is ignored.

export type ParqAnswerValue = 'yes' | 'no';

export interface ParqAnswer {
  question_id: number;
  answer: ParqAnswerValue;
  explanation?: string;
  diagnosis_date?: string;
  treatment?: string;
  doctor_name?: string;
  hospital?: string;
  notes?: string;
}

export interface ParqCurrentHealth {
  known_disease: boolean;
  known_disease_details?: string;
  activity_level: string;
  dietary_habits: string;
  water_intake: string;
  caffeine: boolean;
  caffeine_details?: string;
  alcohol: boolean;
  alcohol_details?: string;
  smoking: boolean;
  smoking_details?: string;
  tobacco: boolean;
  tobacco_details?: string;
  nicotine: boolean;
  nicotine_details?: string;
  sleep_hours?: number;
  medications: boolean;
  medications_details?: string;
  supplements: boolean;
  supplements_details?: string;
  steroids_ped: boolean;
  steroids_ped_details?: string;
  recreational_drugs: boolean;
  recreational_drugs_details?: string;
  current_treatment: boolean;
  current_treatment_details?: string;
  has_pain: boolean;
  pain_scale?: number;
  pain_location?: string;
  pain_description?: string;
}

export interface ParqPastHistory {
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
  exercise_history?: string;
  occupation?: string;
  work_posture?: string;
  daily_sitting_hours?: number;
  previous_injuries?: string;
  previous_physiotherapy: boolean;
  previous_trainer: boolean;
  exercise_experience?: string;
}

export interface ParqTrainerNotes {
  observations?: string;
  posture?: string;
  movement_limitations?: string;
  recommendations?: string;
  contraindications?: string;
  precautions?: string;
  summary?: string;
}

export type FamilyRelation = 'father' | 'mother' | 'brother' | 'sister' | 'grandparent';

export interface FamilyHistoryRow {
  id?: string;
  relation: FamilyRelation;
  heart_disease: boolean;
  diabetes: boolean;
  stroke: boolean;
  hypertension: boolean;
  cancer: boolean;
  hyperlipidemia: boolean;
  kidney_disease: boolean;
  sudden_death: boolean;
  age_of_onset?: number;
  notes?: string;
}

export type ParqStatus = 'draft' | 'submitted' | 'reviewed';
export type ParqRiskLevel = 'low' | 'medium' | 'high';
export type WorkoutGateStatus = 'blocked' | 'cleared';

export interface ParqForm {
  id?: string;
  client_id: string;
  assessment_date: string;
  full_name: string;
  gender: string;
  dob: string;
  mobile: string;
  email?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  blood_group?: string;
  height_cm?: number;
  weight_kg?: number;
  bmi?: number;
  trainer_name?: string;
  current_health: ParqCurrentHealth;
  past_history: ParqPastHistory;
  parq_answers: ParqAnswer[];
  trainer_notes: ParqTrainerNotes;
  status: ParqStatus;
  // server-computed — never sent by the client
  parq_yes_count?: number;
  risk_level?: ParqRiskLevel;
  risk_message?: string;
  workout_gate_status?: WorkoutGateStatus;
  created_at?: string;
  updated_at?: string;
}

export interface ParqFormDetail extends ParqForm {
  family_history: FamilyHistoryRow[];
  medical_clearance: MedicalClearance | null;
  consent: ConsentRecord | null;
  documents: ParqDocument[];
}

export type ClearanceApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface MedicalClearance {
  id?: string;
  form_id?: string;
  doctor_name: string;
  hospital: string;
  clearance_date: string;
  certificate_url?: string;
  doctor_contact?: string;
  expiry_date?: string;
  approval_status: ClearanceApprovalStatus;
}

export interface ConsentCheckboxes {
  info_true: boolean;
  understands_risk: boolean;
  will_inform_changes: boolean;
  understands_incorrect_info_risk: boolean;
  voluntary_participation: boolean;
  consents_emergency_care: boolean;
  agrees_data_storage: boolean;
}

export interface ConsentRecord {
  id?: string;
  form_id?: string;
  consent_checkboxes: ConsentCheckboxes;
  client_signature: string;
  trainer_signature: string;
  location?: string;
  pdf_url?: string;
  created_at?: string;
}

export type ParqDocumentType = 'medical_report' | 'medical_certificate' | 'other';

export interface ParqDocument {
  id: string;
  form_id?: string;
  doc_type: ParqDocumentType;
  file_url: string;
  file_name?: string;
  uploaded_at?: string;
}

export interface ParqGateStatus {
  workout_gate_status: WorkoutGateStatus;
  risk_level: ParqRiskLevel;
}

// ─────────────────── Personal Training Informed Consent ────────────────
// Types matching the /api/pt-os/informed-consent/* contract exactly.

export type InformedConsentStatus =
  | 'draft' | 'pending_client_signature' | 'pending_trainer_signature'
  | 'completed' | 'revoked' | 'expired' | 'archived';

// Fixed 10 keys — Section 4 (client responsibilities), Section 6
// (confidentiality), Section 7 (voluntary participation), Section 8
// (final declaration). All must be true before a signature can be captured.
export interface InformedConsentAcknowledgements {
  understands_risk?: boolean;
  accurate_medical_history?: boolean;
  will_inform_pain?: boolean;
  will_stop_if_dizzy?: boolean;
  will_stop_if_chest_pain?: boolean;
  will_communicate_changes?: boolean;
  will_follow_instructions?: boolean;
  understands_confidentiality?: boolean;
  voluntary_participation?: boolean;
  final_declaration?: boolean;
}

export interface InformedConsent {
  id: string;
  client_id: string;
  trainer_id?: string | null;
  version: number;
  previous_version_id?: string | null;
  status: InformedConsentStatus;
  full_name: string;
  gender?: string | null;
  dob?: string | null;
  mobile?: string | null;
  email?: string | null;
  emergency_contact?: string | null;
  emergency_phone?: string | null;
  address?: string | null;
  occupation?: string | null;
  acknowledgements: InformedConsentAcknowledgements;
  physician_advised_against?: boolean | null;
  physician_name?: string | null;
  hospital?: string | null;
  medical_condition?: string | null;
  medical_clearance_file_url?: string | null;
  exercise_consent_text?: string | null;
  exercise_consent_checked?: boolean;
  exercise_consent_date?: string | null;
  exercise_consent_signature?: string | null;
  exercise_consent_signed_at?: string | null;
  client_signature?: string | null;
  trainer_signature?: string | null;
  witness_signature?: string | null;
  witness_name?: string | null;
  client_signed_at?: string | null;
  trainer_signed_at?: string | null;
  witness_signed_at?: string | null;
  ip_address?: string | null;
  device?: string | null;
  browser?: string | null;
  pdf_url?: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
}

export interface InformedConsentActivity {
  id: string;
  user_id?: string;
  user_name?: string;
  action: string;
  new_data?: unknown;
  ip_address?: string;
  created_at: string;
}

// ─────────────────────────────── Workout Log ────────────────────────────
// Types matching the /api/pt-os/workout-log/* contract exactly. is_pr_* and
// summary fields are always server-computed — never sent by the client.

export interface WorkoutSet {
  id: string;
  session_exercise_id: string;
  set_number: number;
  weight_kg?: number | null;
  reps?: number | null;
  rpe?: number | null;
  rir?: number | null;
  tempo?: string | null;
  rest_seconds?: number | null;
  completed: boolean;
  notes?: string | null;
  is_pr_weight: boolean;
  is_pr_reps: boolean;
  is_pr_volume: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkoutSessionExercise {
  id: string;
  session_id: string;
  exercise_id?: string | null;
  exercise_name: string;
  sort_order: number;
  notes?: string | null;
  created_at: string;
  sets: WorkoutSet[];
}

export interface WorkoutSessionSummary {
  total_sets: number;
  total_reps: number;
  total_volume: number;
  exercises_completed: number;
  exercises_total: number;
  avg_rpe: number | null;
}

export type WorkoutSessionStatus = 'in_progress' | 'completed';

export interface WorkoutSession {
  id: string;
  client_id: string;
  trainer_id?: string | null;
  workout_assignment_id?: string | null;
  session_date: string;
  program_name?: string | null;
  workout_day?: string | null;
  notes?: string | null;
  duration_minutes?: number | null;
  status: WorkoutSessionStatus;
  created_at: string;
  updated_at: string;
  exercise_count?: number;
  completed_set_count?: number;
}

export interface WorkoutSessionDetail extends WorkoutSession {
  exercises: WorkoutSessionExercise[];
  summary: WorkoutSessionSummary;
  planned: WorkoutPlanned | null;
}

export interface WorkoutProgressPoint {
  session_date: string;
  best_weight: number;
  best_reps: number;
  est_1rm: number | null;
  volume: number;
}

export interface WorkoutVolumePoint {
  period: string;
  volume: number;
  session_count: number;
}

export interface WorkoutPreviousExercise {
  session_date: string;
  sets: WorkoutSet[];
}

export interface WorkoutPlannedExercise {
  exercise_id: string | null;
  name: string;
  sets: number;
  reps: number;
  rest_seconds: number | null;
  sort_order: number;
  notes?: string | null;
}

export interface WorkoutPlanned {
  plan_name: string;
  exercises: WorkoutPlannedExercise[];
}

// ── Diet Plans ──────────────────────────────────────────────────────
export interface Meal {
  id: string;
  name: string;
  description?: string | null;
  meal_type: 'breakfast' | 'lunch' | 'snacks' | 'dinner' | 'pre_workout' | 'post_workout';
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  serving_size?: string | null;
  image_url?: string | null;
  is_active: boolean;
}

export interface DietTemplateMeal {
  id: string;
  meal_id: string;
  name: string;
  meal_type: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  day_of_week: number | null;
  sort_order: number;
}

export interface DietTemplate {
  id: string;
  name: string;
  description?: string | null;
  goal: string;
  daily_calories: number;
  daily_protein_g: number;
  daily_carbs_g: number;
  daily_fats_g: number;
  is_active: boolean;
  meal_count: number;
  meals: DietTemplateMeal[];
}

export type PtSessionStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

export interface PtSession {
  id: string;
  client_id: string;
  client_name?: string | null;
  client_mobile?: string | null;
  trainer_id?: string | null;
  title?: string | null;
  session_date: string;
  start_time?: string | null;
  end_time?: string | null;
  duration_minutes?: number | null;
  session_type?: string | null;
  status: PtSessionStatus;
  notes?: string | null;
  recurrence_id?: string | null;
}

export interface PtLead {
  id: string;
  name: string;
  mobile?: string | null;
  email?: string | null;
  source: string;
  status: 'new' | 'contacted' | 'trial_scheduled' | 'converted' | 'lost';
  interested_package?: string | null;
  trainer_id?: string | null;
  trainer_name?: string | null;
  follow_up_date?: string | null;
  notes?: string | null;
  converted_client_id?: string | null;
  converted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientBirthday {
  id: string;
  name: string;
  mobile?: string | null;
  email?: string | null;
  photo_url?: string | null;
  dob: string;
  status: string;
  trainer_id?: string | null;
  trainer_name?: string | null;
  days_until_birthday: number;
  turning_age: number;
  is_today: boolean;
}

export interface DietAssignment {
  id: string;
  diet_template_id: string;
  client_id: string;
  trainer_id?: string | null;
  start_date: string;
  end_date?: string | null;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  notes?: string | null;
  template_name: string;
  template_goal: string;
  daily_calories: number;
  daily_protein_g: number;
  daily_carbs_g: number;
  daily_fats_g: number;
}

export interface NutritionLog {
  client_id: string;
  log_date: string;
  calories_consumed: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  water_glasses: number;
  notes?: string | null;
}

export interface LibraryExercise {
  id: string;
  name: string;
  description?: string | null;
  muscle_group: string;
  body_part: string | null;
  target_muscle: string | null;
  secondary_muscles: string | null;
  equipment: string | null;
  difficulty: string;
  instructions: string | null;
  gif_url: string | null;
  exercise_type: string | null;
  force: string | null;
  mechanic: string | null;
  sets_default: number | null;
  reps_default: number | null;
  rest_seconds: number | null;
  source_id: string | null;
}

// ── Workout Plans (templates) ──────────────────────────────────────
export interface WorkoutPlanExercise {
  id: string;
  exercise_id: string | null;
  name: string;
  muscle_group?: string | null;
  sets: number;
  reps: number;
  rest_seconds: number;
  day_of_week: number;
  sort_order: number;
  notes?: string | null;
}

export interface WorkoutPlan {
  id: string;
  name: string;
  description?: string | null;
  goal: string;
  difficulty: string;
  duration_weeks: number;
  sessions_per_week: number;
  is_template: boolean;
  is_active: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  exercise_count: number;
  progress: number;
  exercises: WorkoutPlanExercise[];
}

export interface WorkoutAssignment {
  id: string;
  workout_plan_id: string;
  client_id: string;
  trainer_id?: string | null;
  start_date: string;
  end_date?: string | null;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  progress_pct: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  plan_name: string;
  plan_goal: string;
  duration_weeks: number;
  sessions_per_week: number;
}

export interface WorkoutAssignmentDetail extends WorkoutAssignment {
  exercises: WorkoutPlanExercise[];
}

// ── Global search ────────────────────────────────────────────────────────────
// One shape for every searchable entity. The generic fields (title, subtitle,
// meta, href, badges) are what the dropdown renders for ANY type, so a new
// backend provider needs no frontend change to become searchable. `fields` is
// the escape hatch for a renderer that wants richer, type-specific detail —
// today only the client card uses it.

export type SearchBadgeTone = 'positive' | 'neutral' | 'muted' | 'warning';

export interface SearchBadge {
  label: string;
  tone: SearchBadgeTone;
}

export interface SearchItem {
  id: string;
  /** Entity type, e.g. 'client'. Drives which renderer the dropdown picks. */
  type: string;
  title: string;
  subtitle?: string | null;
  meta?: string | null;
  /** Where clicking the result goes. */
  href: string;
  avatar_url?: string | null;
  badges?: SearchBadge[];
  fields?: Record<string, unknown>;
}

export interface SearchGroup {
  /** Stable machine name, e.g. 'clients' | 'archived_clients'. */
  type: string;
  /** Human heading rendered above the group. */
  label: string;
  total: number;
  items: SearchItem[];
}

export interface SearchResponse {
  query: string;
  /** Server-ordered: the order groups arrive in is the order they render. */
  groups: SearchGroup[];
  took_ms: number;
}

// Core fetch is handled by http() from ./http
// This file provides the typed `api` namespace facade over http()

function buildQs(params?: Record<string, string | number>): string {
  if (!params) return '';
  const entries = Object.entries(params).map(([k, v]) => [k, String(v)] as [string, string]);
  return '?' + new URLSearchParams(entries).toString();
}

function normalisePayment(raw: Record<string, unknown>): Payment {
  return {
    ...raw,
    id: String(raw.id ?? ''),
    client_id: raw.client_id != null ? String(raw.client_id) : undefined,
    amount: Number(raw.amount ?? 0),
  } as Payment;
}

// ─────────────────────────── API namespace ────────────────────────────

export const api = {
  auth: {
    login: (email: string, password: string, mfaCode?: string) =>
      http<{ user: User }>('/api/auth/login', {
        method: 'POST',
        body: mfaCode ? { email, password, mfa_code: mfaCode } : { email, password },
      }),
    googleLogin: (credential: string) =>
      http<{ user: User }>('/api/auth/google-login', {
        method: 'POST',
        body: { credential },
      }),
    me: () => http<{ user: User }>('/api/auth/me'),
    logout: () => http('/api/auth/logout', { method: 'POST' }).catch((_err) => console.warn('[api] logout failed', _err)),
    changePassword: (currentPassword: string, newPassword: string) =>
      http<{ message?: string }>('/api/auth/change-password', {
        method: 'POST',
        body: { currentPassword, newPassword },
      }),
    // Forgot/reset. The backend answers forgotPassword identically whether or
    // not the address exists — do not "improve" the UI by reporting which,
    // that is deliberate anti-enumeration behaviour and the copy must match it.
    forgotPassword: (email: string) =>
      http<{ message: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: { email },
      }),
    resetPassword: (token: string, password: string) =>
      http<{ message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: { token, password },
      }),
    listUsers: () => http<User[]>('/api/auth/users'),
    createUser: (data: {
      name: string;
      email: string;
      password: string;
      role: Role;
      trainer_id?: string;
    }) => http<{ message?: string; user: User }>('/api/auth/create-user', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    toggleUser: (id: string) =>
      http<{ message?: string; is_active: boolean }>(`/api/auth/users/${id}/toggle`, {
        method: 'PUT',
      }),
    deleteUser: (id: string) =>
      http<{ message?: string }>(`/api/auth/users/${id}`, { method: 'DELETE' }),
  },

  // ── WebAuthn / Passkey — user-level biometric auth ─────────────────────────
  webauthn: {
    // Registration (user must be logged in)
    registerOptions: () =>
      http<Record<string, unknown>>('/api/auth/webauthn/register/options', { method: 'POST' }),
    registerVerify: (body: { registration: Record<string, unknown>; deviceName?: string }) =>
      http<{ success: boolean; credential: { id: string; device_name: string; created_at: string } }>(
        '/api/auth/webauthn/register/verify', { method: 'POST', body: JSON.stringify(body) }
      ),

    // Login (no session required)
    loginOptions: (body?: { email?: string }) =>
      http<Record<string, unknown>>('/api/auth/webauthn/login/options', {
        method: 'POST',
        body: JSON.stringify(body ?? {}),
      }),
    loginVerify: (body: { authentication: Record<string, unknown> }) =>
      http<{ user: { id: string; name?: string; email: string; role?: string; trainer_id?: string; member_id?: string } }>(
        '/api/auth/webauthn/login/verify', { method: 'POST', body: JSON.stringify(body) }
      ),

    // Action verification (user must be logged in)
    actionOptions: () =>
      http<Record<string, unknown>>('/api/auth/webauthn/action/options', { method: 'POST' }),
    actionVerify: (body: { authentication: Record<string, unknown> }) =>
      http<{ verified: boolean; actionToken: string }>(
        '/api/auth/webauthn/action/verify', { method: 'POST', body: JSON.stringify(body) }
      ),

    // Credential management (user's own passkeys)
    listCredentials: () =>
      http<{ credentials: { id: string; device_name: string; device_type: string; backed_up: boolean; is_active: boolean; created_at: string; last_used_at: string | null }[] }>(
        '/api/auth/webauthn/credentials'
      ),
    deleteCredential: (id: string) =>
      http<{ success: boolean }>(`/api/auth/webauthn/credentials/${id}`, { method: 'DELETE' }),
    renameCredential: (id: string, deviceName: string) =>
      http<{ success: boolean; credential: { id: string; device_name: string } }>(
        `/api/auth/webauthn/credentials/${id}`,
        { method: 'PATCH', body: JSON.stringify({ deviceName }) }
      ),
    toggleCredential: (id: string) =>
      http<{ success: boolean; is_active: boolean }>(
        `/api/auth/webauthn/credentials/${id}/toggle`,
        { method: 'PUT' }
      ),

    // Admin
    adminStats: () =>
      http<{ totalCredentials: number; enrolledUsers: number; loginsLast24h: number; failedAttemptsLast24h: number }>(
        '/api/auth/webauthn/admin/stats'
      ),
    adminCredentials: () =>
      http<{ credentials: Array<{ id: string; device_name: string; device_type: string; backed_up: boolean; created_at: string; last_used_at: string | null; user_id: string; user_name: string; user_email: string; role: string }> }>(
        '/api/auth/webauthn/admin/credentials'
      ),
    adminRevokeCredential: (id: string) =>
      http<{ success: boolean }>(`/api/auth/webauthn/admin/credentials/${id}`, { method: 'DELETE' }),
    adminAuditLogs: (limit = 100) =>
      http<{ logs: Array<{ id: string; event: string; detail: Record<string, unknown>; ip: string | null; created_at: string; user_name: string | null; user_email: string | null; role: string | null }> }>(
        `/api/auth/webauthn/admin/audit-logs?limit=${limit}`
      ),
  },

  /**
   * Global search behind the top-bar box.
   *
   * The response is deliberately generic: the backend owns a registry of
   * searchable entity types and returns them as labelled groups of identically
   * shaped items. Adding workouts, invoices or files server-side makes them
   * appear here with no change to this client or to the UI that renders it.
   */
  search: {
    global: (q: string, opts?: { limit?: number; types?: string[]; signal?: AbortSignal }) =>
      http<{ data: SearchResponse }>(
        `/api/search${buildQs({
          q,
          ...(opts?.limit ? { limit: opts.limit } : {}),
          ...(opts?.types?.length ? { types: opts.types.join(',') } : {}),
        })}`,
        { signal: opts?.signal, retries: 0 },
      ),
  },

  clients: {
    list: (params?: Record<string, string | number>) =>
      http<Client[]>(`/api/clients${buildQs(params)}`),
    get:    (id: string) => http<Client>(`/api/clients/${id}`),
    create: (data: Partial<Client>) => http<Client>('/api/clients', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Client>) =>
      http<Client>(`/api/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => http(`/api/clients/${id}`, { method: 'DELETE' }),
    search: (q: string) => http<Client[]>(`/api/clients/search?q=${encodeURIComponent(q)}`),
    uploadPhoto: (id: string, dataUrl: string) =>
      http<{ message?: string; photo_url?: string }>(`/api/clients/${id}/photo`, {
        method: 'POST',
        body: JSON.stringify({ photo: dataUrl }),
      }),
    assignPt: (id: string, data: Record<string, unknown>) =>
      http<{ message?: string }>(`/api/clients/${id}/assign-pt`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    renewPt: (id: string, data: Record<string, unknown>) =>
      http<{ message?: string; data?: unknown }>(`/api/pt-os/clients/${id}/renew`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    renewalHistory: (id: string) =>
      http<{ data: unknown[] }>(`/api/pt-os/clients/${id}/renewals`),
    combo: (id: string, data: Record<string, unknown>) =>
      http<{ message?: string }>(`/api/clients/${id}/combo`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    upgrade: (id: string, data: Record<string, unknown>) =>
      http<{ message?: string }>(`/api/clients/${id}/upgrade`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    downgrade: (id: string, data: Record<string, unknown>) =>
      http<{ message?: string }>(`/api/clients/${id}/downgrade`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    transfer: (id: string, data: Record<string, unknown>) =>
      http<{ message?: string }>(`/api/clients/${id}/transfer`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    trial: (id: string, data: Record<string, unknown>) =>
      http<{ message?: string }>(`/api/clients/${id}/trial`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    freeze: (id: string, data: Record<string, unknown>) =>
      http<{ message?: string }>(`/api/clients/${id}/freeze`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    unfreeze: (id: string) =>
      http<{ message?: string }>(`/api/clients/${id}/unfreeze`, {
        method: 'POST',
      }),
  },

  payments: {
    list: async (params?: Record<string, string>): Promise<Payment[]> => {
      const raw = await http<Record<string, unknown>[]>(`/api/payments${buildQs(params)}`);
      return Array.isArray(raw) ? raw.map(normalisePayment) : [];
    },
    create: (data: Record<string, unknown>) =>
      http('/api/payments', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) => http(`/api/payments/${id}`, { method: 'DELETE' }),
    stats:  (params?: Record<string, string>) =>
      http(`/api/payments/stats${buildQs(params)}`),
  },

  trainers: {
    list:   () => http<Trainer[]>('/api/trainers'),
    get:    (id: string) => http<Trainer>(`/api/trainers/${id}`),
    create: (data: Record<string, unknown>) =>
      http('/api/trainers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      http(`/api/trainers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => http(`/api/trainers/${id}`, { method: 'DELETE' }),
    sessions: (id: string) => http(`/api/trainers/${id}/sessions`),
    createSession: (data: {
      trainer_id: string; client_id: string; date: string; time: string;
      duration: number; type?: string; notes?: string; recurring?: boolean;
    }) => http<{ data: unknown }>('/api/trainers/sessions', {
      method: 'POST', body: JSON.stringify(data),
    }),
  },

  expenses: {
    list:   (params?: Record<string, string | number>) =>
              http<{ expenses: Record<string, unknown>[]; total: number }>(`/api/expenses${buildQs(params)}`),
    get:    (id: string) => http<Record<string, unknown>>(`/api/expenses/${id}`),
    create: (data: Record<string, unknown>) =>
              http<{ message?: string; expense: Record<string, unknown> }>('/api/expenses', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
              http<{ message?: string; expense: Record<string, unknown> }>(`/api/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => http<{ message?: string }>(`/api/expenses/${id}`, { method: 'DELETE' }),
    stats:  (params?: Record<string, string | number>) =>
              http<{ summary: Record<string, unknown>; byCategory: Record<string, unknown>[] }>(`/api/expenses/stats${buildQs(params)}`),
  },

  leave: {
    list: (params?: Record<string, string | number>) =>
      http<LeaveRequest[]>(`/api/leave${buildQs(params)}`),
    get: (id: string) => http<LeaveRequest>(`/api/leave/${id}`),
    create: (data: LeaveRequestPayload) =>
      http<{ message?: string; leave: LeaveRequest }>('/api/leave', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    approve: (id: string, admin_note?: string) =>
      http<{ message?: string; leave: LeaveRequest }>(`/api/leave/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ admin_note }),
      }),
    reject: (id: string, admin_note?: string) =>
      http<{ message?: string; leave: LeaveRequest }>(`/api/leave/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ admin_note }),
      }),
  },

  attendance: {
    list: (params?: Record<string, string>) =>
      http<Attendance[]>(`/api/attendance${buildQs(params)}`),
    mark: (data: Record<string, unknown>) =>
      http<Attendance>('/api/attendance', { method: 'POST', body: JSON.stringify(data) }),
    create: (data: Record<string, unknown>) =>
      http('/api/attendance', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      http(`/api/attendance/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  },

  notifications: {
    list: (params?: Record<string, string>) =>
      http<unknown[]>(`/api/v1/notifications${buildQs(params)}`),
    markRead: (id: string) =>
      http(`/api/v1/notifications/${id}/read`, { method: 'PATCH' }),
    markAllRead: () =>
      http('/api/v1/notifications/read-all', { method: 'PATCH' }),
  },

  reports: {
    revenue: (params?: Record<string, string>) =>
      http(`/api/reports/revenue${buildQs(params)}`),
    members: (params?: Record<string, string>) =>
      http(`/api/reports/members${buildQs(params)}`),
    monthly: (year: number | string) =>
      http<unknown[]>(`/api/reports/monthly?year=${year}`),
    dues: () =>
      http<DuesItem[]>('/api/reports/dues'),
    trainerSummary: () =>
      http<TrainerSummaryRow[]>('/api/reports/trainer-summary'),
  },

  admin: {
    exportDatabase: () => http<{ message?: string; url?: string }>('/api/admin/export-database'),
    backupDatabase: () => http<{ message?: string }>('/api/admin/backup-database', { method: 'POST' }),
  },

  // ── Settings ──────────────────────────────────────────────
  settings: {
    /** All key-value settings (system_settings table) */
    getAll: () =>
      http<{ settings: Record<string, unknown> }>('/api/settings'),

    /** List branches */
    getBranches: () =>
      http<{ id: string; name: string; location: string; status: string; member_count: number }[]>('/api/settings/branches'),

    /** Create a branch */
    createBranch: (data: { name: string; location?: string }) =>
      http<{ id: string; name: string; location: string; status: string; member_count: number }>('/api/settings/branches', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    /** Update a branch */
    updateBranch: (id: string, data: { name?: string; location?: string; status?: string }) =>
      http<{ id: string; name: string; location: string; status: string }>(`/api/settings/branches/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    /** Get feature flags */
    getFeatureFlags: () =>
      http<{ flags: Record<string, unknown>; raw: unknown[] }>('/api/settings/feature-flags'),

    /** Update feature flags */
    updateFeatureFlags: (data: Record<string, unknown>) =>
      http<{ message: string }>('/api/settings/feature-flags', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    /** Update generic settings (key-value) */
    update: (data: Record<string, string>) =>
      http<{ message: string; count: number }>('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    /** Get role permissions matrix */
    getPermissions: () =>
      http<{ permissions: Record<string, boolean>; role: string }>('/api/settings/permissions'),

    /** Update role permissions (admin only) */
    updatePermissions: (data: Record<string, boolean>) =>
      http<{ message: string }>('/api/settings/permissions', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  // ── Invoices ──────────────────────────────────────────────────────
  invoices: {
    list: (params?: Record<string, string | number>) =>
      http<{ invoices: unknown[]; stats: { total: number; paid: number; pending: number; overdue: number } }>(
        `/api/invoices${buildQs(params)}`,
      ),
    get: (id: string) => http<unknown>(`/api/invoices/${id}`),
    create: (data: Record<string, unknown>) =>
      http<{ message: string; invoice: unknown }>('/api/invoices', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Record<string, unknown>) =>
      http<{ message: string; invoice: unknown }>(`/api/invoices/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    send: (id: string) =>
      http<{ message: string; invoice: unknown }>(`/api/invoices/${id}/send`, { method: 'POST' }),
    markPaid: (id: string, data?: { payment_method?: string }) =>
      http<{ message: string; invoice: unknown }>(`/api/invoices/${id}/mark-paid`, {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      }),
    remind: (id: string) =>
      http<{ message: string }>(`/api/invoices/${id}/remind`, { method: 'POST' }),
    cancel: (id: string) =>
      http<{ message: string; invoice: unknown }>(`/api/invoices/${id}/cancel`, { method: 'POST' }),
  },

  // ── Exercise Library ─────────────────────────────────────────────
  // Single client-side namespace for /api/workouts/exercises* — the old
  // duplicate api.workouts.exercises pointed at the exact same endpoints.
  exercises: {
    list: (qs?: string) =>
      http<LibraryExercise[]>(`/api/workouts/exercises${qs ? `?${qs}` : ''}`),
    meta: () =>
      http<{ body_parts: string[]; equipment_types: string[]; exercise_types: string[]; difficulties: string[]; total: number }>(
        '/api/workouts/exercises/meta'
      ),
    count: (qs?: string) =>
      http<{ total: number }>(`/api/workouts/exercises/meta${qs ? `?${qs}` : ''}`),
    create: (data: Record<string, unknown>) =>
      http<{ message: string; exercise: unknown }>('/api/workouts/exercises', {
        method: 'POST', body: JSON.stringify(data),
      }),
    update: (id: string, data: Record<string, unknown>) =>
      http<{ message: string; exercise: unknown }>(`/api/workouts/exercises/${id}`, {
        method: 'PUT', body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      http<{ message: string }>(`/api/workouts/exercises/${id}`, { method: 'DELETE' }),
  },

  // ── Workout Plans / Assignments ────────────────────────────────────
  workouts: {
    plans: {
      list: (params?: Record<string, string | number>) =>
        http<WorkoutPlan[]>(`/api/workouts/plans${buildQs(params)}`),
      detail: (id: string) =>
        http<WorkoutPlan>(`/api/workouts/plans/${id}`),
      create: (data: {
        name: string; description?: string; goal?: string; difficulty?: string;
        duration_weeks?: number; sessions_per_week?: number; is_template?: boolean;
        exercises?: Array<{ exercise_id: string; day_of_week: number; sort_order?: number; sets?: number; reps?: number; rest_seconds?: number; notes?: string }>;
      }) =>
        http<{ message: string; plan: WorkoutPlan }>('/api/workouts/plans', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      update: (id: string, data: {
        name?: string; description?: string; goal?: string; difficulty?: string;
        duration_weeks?: number; sessions_per_week?: number;
        exercises?: Array<{ exercise_id: string; day_of_week: number; sort_order?: number; sets?: number; reps?: number; rest_seconds?: number; notes?: string }>;
      }) =>
        http<{ message: string; plan: WorkoutPlan }>(`/api/workouts/plans/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        }),
      delete: (id: string) =>
        http<{ message: string }>(`/api/workouts/plans/${id}`, { method: 'DELETE' }),
    },
    assignments: {
      list: (params: { client_id: string; status?: string }) =>
        http<WorkoutAssignment[]>(`/api/workouts/assignments${buildQs(params)}`),
      detail: (id: string) =>
        http<WorkoutAssignmentDetail>(`/api/workouts/assignments/${id}`),
    },
    assign: (data: { workout_plan_id: string; client_id: string; start_date?: string; end_date?: string; notes?: string }) =>
      http<{ message: string; assignment: WorkoutAssignment; screening_warnings?: string[] }>('/api/workouts/assign', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateProgress: (id: string, data: { progress_pct: number }) =>
      http<{ message: string; assignment: WorkoutAssignment }>(`/api/workouts/assignments/${id}/progress`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  // ── Diet / Nutrition ──────────────────────────────────────────────
  diet: {
    meals: {
      list: (params?: Record<string, string | number>) =>
        http<Meal[]>(`/api/diet/meals${buildQs(params)}`),
      create: (data: Record<string, unknown>) =>
        http<{ message: string; meal: Meal }>('/api/diet/meals', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
    },
    templates: {
      list: (params?: Record<string, string | number>) =>
        http<DietTemplate[]>(`/api/diet/templates${buildQs(params)}`),
      create: (data: Record<string, unknown>) =>
        http<{ message: string; template: DietTemplate }>('/api/diet/templates', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
    },
    assign: (data: { diet_template_id: string; client_id: string; start_date?: string; end_date?: string; notes?: string }) =>
      http<{ message: string; assignment: DietAssignment }>('/api/diet/assign', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    assignments: {
      list: (params: { client_id: string; status?: string }) =>
        http<DietAssignment[]>(`/api/diet/assignments${buildQs(params)}`),
    },
    tracker: {
      get: (params: { client_id: string; date?: string }) =>
        http<{ today: NutritionLog; history: NutritionLog[] }>(`/api/diet/tracker${buildQs(params)}`),
      update: (data: { client_id: string; log_date?: string; calories_consumed?: number; protein_g?: number; carbs_g?: number; fats_g?: number; water_glasses?: number; notes?: string }) =>
        http<{ message: string; log: NutritionLog }>('/api/diet/tracker', {
          method: 'PUT',
          body: JSON.stringify(data),
        }),
    },
    fitnessProfile: {
      get: (clientId: string) =>
        http<unknown>(`/api/diet/fitness-profile/${clientId}`),
      update: (clientId: string, data: Record<string, unknown>) =>
        http<{ message: string; profile: unknown }>(`/api/diet/fitness-profile/${clientId}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        }),
    },
    supplements: {
      list: () => http<unknown[]>('/api/diet/supplements'),
    },
  },

  // ── Member Portal ────────────────────────────────────────────
  bookings: {
    list: (params?: Record<string, string | number>) =>
      http<unknown[]>(`/api/bookings${buildQs(params)}`),
    create: (data: { session_id: string }) =>
      http<{ message: string; booking: unknown }>('/api/bookings', {
        method: 'POST', body: JSON.stringify(data),
      }),
  },

  classes: {
    sessions: (params?: Record<string, string | number>) =>
      http<unknown[]>(`/api/classes/sessions${buildQs(params)}`),
  },

  member: {
    get: (id: string) =>
      http<{ data: unknown }>(`/api/v1/members/${id}`),
    metrics: (id: string) =>
      http<{ membership: unknown; stats: unknown }>(`/api/v1/members/${id}/metrics`),
  },

  // ── Progress Tracking ─────────────────────────────────────────
  progress: {
    assessments: {
      list: (params?: Record<string, string | number>) =>
        http<{ data: unknown[] }>(`/api/progress/assessments${buildQs(params)}`),
      create: (data: Record<string, unknown>) =>
        http<{ data: unknown }>('/api/progress/assessments', {
          method: 'POST', body: JSON.stringify(data),
        }),
    },
    goals: {
      list: (params?: Record<string, string | number>) =>
        http<{ data: unknown[] }>(`/api/progress/goals${buildQs(params)}`),
      create: (data: Record<string, unknown>) =>
        http<{ data: unknown }>('/api/progress/goals', {
          method: 'POST', body: JSON.stringify(data),
        }),
      update: (id: string, data: Record<string, unknown>) =>
        http<{ data: unknown }>(`/api/progress/goals/${id}`, {
          method: 'PATCH', body: JSON.stringify(data),
        }),
    },
    weeklyCheckins: {
      list: (params?: Record<string, string | number>) =>
        http<{ data: unknown[] }>(`/api/progress/weekly-checkins${buildQs(params)}`),
      create: (data: Record<string, unknown>) =>
        http<{ data: unknown }>('/api/progress/weekly-checkins', {
          method: 'POST', body: JSON.stringify(data),
        }),
    },
    strengthLogs: {
      list: (params?: Record<string, string | number>) =>
        http<{ data: unknown[] }>(`/api/progress/strength-logs${buildQs(params)}`),
      create: (data: Record<string, unknown>) =>
        http<{ data: unknown }>('/api/progress/strength-logs', {
          method: 'POST', body: JSON.stringify(data),
        }),
    },
    progressPhotos: {
      list: (params?: Record<string, string | number>) =>
        http<{ data: unknown[] }>(`/api/progress/progress-photos${buildQs(params)}`),
      create: (data: Record<string, unknown>) =>
        http<{ data: unknown }>('/api/progress/progress-photos', {
          method: 'POST', body: JSON.stringify(data),
        }),
      delete: (id: string) => http(`/api/progress/progress-photos/${id}`, { method: 'DELETE' }),
    },
    lifestyleAssessments: {
      list: (params?: Record<string, string | number>) =>
        http<{ data: unknown[] }>(`/api/progress/lifestyle-assessments${buildQs(params)}`),
      create: (data: Record<string, unknown>) =>
        http<{ data: unknown }>('/api/progress/lifestyle-assessments', {
          method: 'POST', body: JSON.stringify(data),
        }),
      update: (id: string, data: Record<string, unknown>) =>
        http<{ data: unknown }>(`/api/progress/lifestyle-assessments/${id}`, {
          method: 'PATCH', body: JSON.stringify(data),
        }),
    },
    nutritionAssessments: {
      list: (params?: Record<string, string | number>) =>
        http<{ data: unknown[] }>(`/api/progress/nutrition-assessments${buildQs(params)}`),
      create: (data: Record<string, unknown>) =>
        http<{ data: unknown }>('/api/progress/nutrition-assessments', {
          method: 'POST', body: JSON.stringify(data),
        }),
      update: (id: string, data: Record<string, unknown>) =>
        http<{ data: unknown }>(`/api/progress/nutrition-assessments/${id}`, {
          method: 'PATCH', body: JSON.stringify(data),
        }),
    },
    mobilityPerformanceAssessments: {
      list: (params?: Record<string, string | number>) =>
        http<{ data: unknown[] }>(`/api/progress/mobility-performance-assessments${buildQs(params)}`),
      create: (data: Record<string, unknown>) =>
        http<{ data: unknown }>('/api/progress/mobility-performance-assessments', {
          method: 'POST', body: JSON.stringify(data),
        }),
      update: (id: string, data: Record<string, unknown>) =>
        http<{ data: unknown }>(`/api/progress/mobility-performance-assessments/${id}`, {
          method: 'PATCH', body: JSON.stringify(data),
        }),
    },
    postureAssessments: {
      list: (params?: Record<string, string | number>) =>
        http<{ data: unknown[] }>(`/api/progress/posture-assessments${buildQs(params)}`),
      create: (data: Record<string, unknown>) =>
        http<{ data: unknown }>('/api/progress/posture-assessments', {
          method: 'POST', body: JSON.stringify(data),
        }),
      update: (id: string, data: Record<string, unknown>) =>
        http<{ data: unknown }>(`/api/progress/posture-assessments/${id}`, {
          method: 'PATCH', body: JSON.stringify(data),
        }),
    },
    parqForms: {
      list: (params?: { client_id?: string }) =>
        http<{ data: ParqForm[] }>(`/api/pt-os/parq/forms${buildQs(params)}`),
      get: (id: string) =>
        http<{ data: ParqFormDetail }>(`/api/pt-os/parq/forms/${id}`),
      create: (data: Record<string, unknown>) =>
        http<{ data: ParqForm }>('/api/pt-os/parq/forms', {
          method: 'POST', body: JSON.stringify(data),
        }),
      update: (id: string, data: Record<string, unknown>) =>
        http<{ data: ParqForm }>(`/api/pt-os/parq/forms/${id}`, {
          method: 'PATCH', body: JSON.stringify(data),
        }),
      gateStatus: (id: string) =>
        http<ParqGateStatus>(`/api/pt-os/parq/forms/${id}/gate-status`),
    },
    parqClearance: {
      create: (formId: string, data: Record<string, unknown>) =>
        http<{ data: MedicalClearance }>(`/api/pt-os/parq/forms/${formId}/clearance`, {
          method: 'POST', body: JSON.stringify(data),
        }),
      update: (id: string, data: Record<string, unknown>) =>
        http<{ data: MedicalClearance }>(`/api/pt-os/parq/clearance/${id}`, {
          method: 'PATCH', body: JSON.stringify(data),
        }),
    },
    parqConsent: {
      create: (formId: string, data: Record<string, unknown>) =>
        http<{ data: ConsentRecord }>(`/api/pt-os/parq/forms/${formId}/consent`, {
          method: 'POST', body: JSON.stringify(data),
        }),
    },
    parqDocuments: {
      upload: (formId: string, docType: ParqDocumentType, file: File) => {
        const formData = new FormData();
        formData.append('doc_type', docType);
        formData.append('file', file);
        return http<{ data: ParqDocument }>(`/api/pt-os/parq/forms/${formId}/documents`, {
          method: 'POST', body: formData,
        });
      },
    },
    informedConsent: {
      list: (params?: { client_id?: string }) =>
        http<{ data: InformedConsent[] }>(`/api/pt-os/informed-consent${buildQs(params)}`),
      get: (id: string) =>
        http<{ data: InformedConsent }>(`/api/pt-os/informed-consent/${id}`),
      activity: (id: string) =>
        http<{ data: InformedConsentActivity[] }>(`/api/pt-os/informed-consent/${id}/activity`),
      create: (data: Record<string, unknown>) =>
        http<{ data: InformedConsent }>('/api/pt-os/informed-consent', {
          method: 'POST', body: JSON.stringify(data),
        }),
      update: (id: string, data: Record<string, unknown>) =>
        http<{ data: InformedConsent }>(`/api/pt-os/informed-consent/${id}`, {
          method: 'PATCH', body: JSON.stringify(data),
        }),
      sign: (id: string, data: { signer: 'client' | 'trainer' | 'witness'; signature: string; witness_name?: string }) =>
        http<{ data: InformedConsent }>(`/api/pt-os/informed-consent/${id}/sign`, {
          method: 'POST', body: JSON.stringify(data),
        }),
      revoke: (id: string) =>
        http<{ data: InformedConsent }>(`/api/pt-os/informed-consent/${id}/revoke`, {
          method: 'POST',
        }),
      uploadClearance: (id: string, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return http<{ data: InformedConsent }>(`/api/pt-os/informed-consent/${id}/medical-clearance`, {
          method: 'POST', body: formData,
        });
      },
    },
    workoutLog: {
      sessions: {
        list: (params: { client_id: string; limit?: number; offset?: number }) =>
          http<{ data: WorkoutSession[] }>(`/api/pt-os/workout-log/sessions${buildQs(params)}`),
        get: (id: string) =>
          http<{ data: WorkoutSessionDetail }>(`/api/pt-os/workout-log/sessions/${id}`),
        create: (data: Record<string, unknown>) =>
          http<{ data: WorkoutSession; screening_warnings?: string[] }>('/api/pt-os/workout-log/sessions', {
            method: 'POST', body: JSON.stringify(data),
          }),
        update: (id: string, data: Record<string, unknown>) =>
          http<{ data: WorkoutSession }>(`/api/pt-os/workout-log/sessions/${id}`, {
            method: 'PATCH', body: JSON.stringify(data),
          }),
        delete: (id: string) =>
          http<{ message: string }>(`/api/pt-os/workout-log/sessions/${id}`, { method: 'DELETE' }),
        plannedDayOptions: (id: string) =>
          http<{ data: string[] }>(`/api/pt-os/workout-log/sessions/${id}/planned-day-options`),
      },
      exercises: {
        add: (sessionId: string, data: { exercise_id?: string | null; exercise_name: string; notes?: string | null }) =>
          http<{ data: WorkoutSessionExercise }>(`/api/pt-os/workout-log/sessions/${sessionId}/exercises`, {
            method: 'POST', body: JSON.stringify(data),
          }),
        remove: (id: string) =>
          http<{ message: string }>(`/api/pt-os/workout-log/exercises/${id}`, { method: 'DELETE' }),
      },
      sets: {
        add: (sessionExerciseId: string, data: Record<string, unknown>) =>
          http<{ data: WorkoutSet }>(`/api/pt-os/workout-log/exercises/${sessionExerciseId}/sets`, {
            method: 'POST', body: JSON.stringify(data),
          }),
        update: (id: string, data: Record<string, unknown>) =>
          http<{ data: WorkoutSet }>(`/api/pt-os/workout-log/sets/${id}`, {
            method: 'PATCH', body: JSON.stringify(data),
          }),
        delete: (id: string) =>
          http<{ message: string }>(`/api/pt-os/workout-log/sets/${id}`, { method: 'DELETE' }),
      },
      previous: (params: { client_id: string; exercise_id?: string; exercise_name?: string; exclude_session_id?: string }) =>
        http<{ data: WorkoutPreviousExercise | null }>(`/api/pt-os/workout-log/previous${buildQs(params)}`),
      progress: (params: { client_id: string; exercise_id?: string; exercise_name?: string }) =>
        http<{ data: WorkoutProgressPoint[] }>(`/api/pt-os/workout-log/progress${buildQs(params)}`),
      volumeSummary: (params: { client_id: string; group_by?: 'week' | 'month' }) =>
        http<{ data: WorkoutVolumePoint[] }>(`/api/pt-os/workout-log/volume-summary${buildQs(params)}`),
    },
  },

  // ── Automation & Communication ─────────────────────────────────
  automation: {
    rules: {
      list: (params?: Record<string, string | number>) =>
        http<{ data: unknown[] }>(`/api/automation/rules${buildQs(params)}`),
      create: (data: Record<string, unknown>) =>
        http<{ data: unknown }>('/api/automation/rules', {
          method: 'POST', body: JSON.stringify(data),
        }),
      update: (id: string, data: Record<string, unknown>) =>
        http<{ data: unknown }>(`/api/automation/rules/${id}`, {
          method: 'PATCH', body: JSON.stringify(data),
        }),
      delete: (id: string) => http(`/api/automation/rules/${id}`, { method: 'DELETE' }),
    },
    communicationLogs: {
      list: (params?: Record<string, string | number>) =>
        http<{ data: unknown[]; total: number }>(`/api/automation/communication-logs${buildQs(params)}`),
      stats: () => http<{ data: unknown }>('/api/automation/communication-logs/stats'),
    },
    ptPackages: {
      list: (params?: Record<string, string | number>) =>
        http<{ data: unknown[] }>(`/api/automation/pt-packages${buildQs(params)}`),
      create: (data: Record<string, unknown>) =>
        http<{ data: unknown }>('/api/automation/pt-packages', {
          method: 'POST', body: JSON.stringify(data),
        }),
      update: (id: string, data: Record<string, unknown>) =>
        http<{ data: unknown }>(`/api/automation/pt-packages/${id}`, {
          method: 'PATCH', body: JSON.stringify(data),
        }),
      delete: (id: string) => http(`/api/automation/pt-packages/${id}`, { method: 'DELETE' }),
    },
    sessionBalance: {
      list: (params?: Record<string, string | number>) =>
        http<{ data: unknown[] }>(`/api/automation/session-balance${buildQs(params)}`),
      create: (data: Record<string, unknown>) =>
        http<{ data: unknown }>('/api/automation/session-balance', {
          method: 'POST', body: JSON.stringify(data),
        }),
      useSession: (id: string) =>
        http<{ data: unknown }>(`/api/automation/session-balance/${id}/use`, {
          method: 'POST',
        }),
    },
  },

  // ── PT OS ────────────────────────────────────────────────────
  pt: {
    dashboard: () =>
      http<{ data: unknown }>('/api/pt-os/dashboard'),
    clients: (params?: { trainer_id?: string }) =>
      http<{ data: unknown[]; total: number }>(`/api/pt-os/clients${buildQs(params)}`),
    client: (id: string) =>
      http<{ data: unknown }>(`/api/pt-os/clients/${id}`),
    create: (data: Record<string, unknown>) =>
      http<{ data: unknown }>('/api/pt-os/clients', { method: 'POST', body: JSON.stringify(data) }),
    uploadPhoto: (id: string, photo: string) =>
      http<{ data: unknown }>(`/api/pt-os/clients/${id}/photo`, { method: 'POST', body: JSON.stringify({ photo }) }),
    trainers: (params?: Record<string, string>) =>
      http<{ data: unknown[] }>(`/api/pt-os/trainers${buildQs(params)}`),
    sessions: (params?: { trainer_id?: string; date?: string }) =>
      http<{ data: unknown[] }>(`/api/pt-os/sessions${buildQs(params)}`),
    /** The signed-in user's own sessions as a trainer (never another's). */
    mySessions: (params?: { from?: string; to?: string }) =>
      http<{ data: PtSession[]; total: number; trainer_linked: boolean }>(
        `/api/pt-os/sessions/my${buildQs(params)}`,
      ),
    createSession: (data: Record<string, unknown>) =>
      // `data` is a single session row normally, or an array of 4 when
      // booked as recurring (weekly occurrences share one recurrence_id).
      http<{ data: unknown | unknown[] }>('/api/pt-os/sessions', { method: 'POST', body: JSON.stringify(data) }),
    updateSession: (id: string, data: Record<string, unknown>) =>
      http<{ data: unknown }>(`/api/pt-os/sessions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    payments: (params?: { client_id?: string; trainer_id?: string }) =>
      http<{ data: unknown[] }>(`/api/pt-os/payments${buildQs(params)}`),
    createPayment: (data: Record<string, unknown>) =>
      http<{ data: unknown }>('/api/pt-os/payments', { method: 'POST', body: JSON.stringify(data) }),
    balanceSheet: (params?: { trainer_id?: string }) =>
      http<{ data: unknown[]; total: number; total_outstanding: number }>(
        `/api/pt-os/balance-sheet${buildQs(params)}`,
      ),
    clientBirthdays: (params?: { trainer_id?: string }) =>
      http<{ data: ClientBirthday[]; total: number; today_count: number }>(
        `/api/pt-os/clients/birthdays${buildQs(params)}`,
      ),
    commissions: (params?: { trainer_id?: string }) =>
      http<{ data: unknown[] }>(`/api/pt-os/commissions${buildQs(params)}`),
    calculateCommissions: (month?: string) =>
      http<{ data: { count: number; total: number } }>('/api/pt-os/commissions/calculate', {
        method: 'POST', body: JSON.stringify({ month }),
      }),
    payouts: (params?: { month?: string }) =>
      http<{ data: unknown[]; month: string }>(`/api/pt-os/payouts${buildQs(params)}`),
    revenue: () =>
      http<{ data: unknown[] }>('/api/pt-os/revenue'),
    trainerPerformance: () =>
      http<{ data: unknown[] }>('/api/pt-os/trainer-performance'),
    updateCommission: (trainerId: string, data: Record<string, unknown>) =>
      http<{ data: unknown }>(`/api/pt-os/commissions/${trainerId}`, {
        method: 'PUT', body: JSON.stringify(data),
      }),
    updatePayout: (trainerId: string, data: Record<string, unknown>) =>
      http<{ data: unknown }>(`/api/pt-os/payouts/${trainerId}`, {
        method: 'PUT', body: JSON.stringify(data),
      }),
    markAllPayoutsPaid: (month: string) =>
      http<{ data: unknown }>('/api/pt-os/payouts/mark-all-paid', {
        method: 'POST', body: JSON.stringify({ month }),
      }),
    updateClient: (id: string, data: Record<string, unknown>) =>
      http<{ data: unknown }>(`/api/pt-os/clients/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteClient: (id: string) =>
      http<{ message: string }>(`/api/pt-os/clients/${id}`, { method: 'DELETE' }),
    subscriptions: (id: string) =>
      http<{ data: unknown[]; total: number }>(`/api/pt-os/clients/${id}/subscriptions`),
    duplicates: () =>
      http<{ data: DuplicateGroup[]; total_groups: number; total_records: number; total_duplicates: number; total_financial_value: number }>('/api/pt-os/clients/duplicates'),
    mergeDuplicates: () =>
      http<{ success: boolean; run_id: string; merged_groups: number; records_removed: number; results: MergeResult[] }>('/api/pt-os/clients/merge-duplicates', { method: 'POST' }),
    leads: {
      list: (params?: { status?: string; q?: string }) =>
        http<{ data: PtLead[]; total: number }>(`/api/pt-os/leads${buildQs(params)}`),
      create: (data: Record<string, unknown>) =>
        http<{ data: PtLead }>('/api/pt-os/leads', { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: Record<string, unknown>) =>
        http<{ data: PtLead }>(`/api/pt-os/leads/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
      delete: (id: string) =>
        http<{ message: string }>(`/api/pt-os/leads/${id}`, { method: 'DELETE' }),
      convert: (id: string) =>
        http<{ data: { client_id: string } }>(`/api/pt-os/leads/${id}/convert`, { method: 'POST' }),
    },
  },

  memberWebauthn: {
    registerBegin: (memberId: string) =>
      http<{ challenge: string; rp: { name: string; id: string }; user: { id: string; name: string; displayName: string }; pubKeyCredParams: { type: 'public-key'; alg: number }[] }>(
        `/api/webauthn/register/begin?member_id=${memberId}`,
      ),
    registerComplete: (data: { memberId: string; deviceName: string; credentialId: string; rawId: string; transports?: string[]; deviceType?: string; attestationObject: string; clientDataJSON: string }) =>
      http<{ success: boolean; credential: { id: string } }>('/api/webauthn/register/complete', {
        method: 'POST', body: JSON.stringify(data),
      }),
    authenticateBegin: (memberId?: string) =>
      http<{ challenge: string; allowCredentials?: { id: string; type: 'public-key' }[]; rpId: string }>(
        `/api/webauthn/authenticate/begin${memberId ? `?member_id=${memberId}` : ''}`,
      ),
    authenticateComplete: (data: { credentialId: string; rawId: string; authenticatorData: string; signature: string; clientDataJSON: string; userHandle?: string }) =>
      http<{ success: boolean; memberId?: string; memberName?: string }>('/api/webauthn/authenticate/complete', {
        method: 'POST', body: JSON.stringify(data),
      }),
    listCredentials: (memberId: string) =>
      http<{ credentials: { id: string; deviceName: string; createdAt: string; lastUsedAt: string | null }[] }>(
        `/api/webauthn/credentials?member_id=${memberId}`,
      ),
    removeCredential: (credentialId: string) =>
      http<{ success: boolean }>(`/api/webauthn/credentials/${credentialId}`, { method: 'DELETE' }),
    memberSearch: (q: string) =>
      http<{ members: { id: string; name: string; email: string; source: 'member' | 'pt_client' }[] }>(
        `/api/webauthn/member-search?q=${encodeURIComponent(q)}`,
      ),
  },

  biometricAttend: {
    mark: (data: { memberId: string; memberName?: string; verificationMethod: string; deviceName: string; latitude: number; longitude: number }) =>
      http<{ success: boolean; attendanceId?: string; error?: string }>('/api/biometric-attend/mark', {
        method: 'POST', body: JSON.stringify(data),
      }),
    checkout: (memberId: string) =>
      http<{ success: boolean; sessionDurationMinutes: number }>('/api/biometric-attend/checkout', {
        method: 'POST', body: JSON.stringify({ memberId }),
      }),
    today: () =>
      http<{ present: number; absent: number; late: number; active: number; feed: { id: string; memberName: string; checkInTime: string; verificationMethod: string; deviceName: string }[] }>(
        '/api/biometric-attend/today',
      ),
    history: (params?: Record<string, string>) =>
      http<{ records: unknown[]; total: number }>(`/api/biometric-attend/history${buildQs(params)}`),
    memberHistory: (memberId: string, params?: Record<string, string>) =>
      http<{ records: unknown[] }>(`/api/biometric-attend/member/${memberId}${buildQs(params)}`),
    report: (params?: Record<string, string>) =>
      http<{ url: string }>(`/api/biometric-attend/report${buildQs(params)}`),
  },

  // ── Campaigns (Marketing) ──────────────────────────────────────
  campaigns: {
    list: (params?: Record<string, string | number>) =>
      http<unknown[]>(`/api/campaigns${buildQs(params)}`),
    create: (data: Record<string, unknown>) =>
      http<{ message: string; campaign: unknown }>('/api/campaigns', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      http<{ message: string; campaign: unknown }>(`/api/campaigns/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => http<{ message: string }>(`/api/campaigns/${id}`, { method: 'DELETE' }),
    stats: () => http<{ active: number; total_sent: number; conversions: number; conv_rate: number }>('/api/campaigns/stats'),
  },

  // ── Feedback ───────────────────────────────────────────────────
  feedback: {
    list: (params?: Record<string, string | number>) =>
      http<unknown[]>(`/api/feedback${buildQs(params)}`),
    get: (id: string) => http<unknown>(`/api/feedback/${id}`),
    reply: (id: string, data: { reply: string }) =>
      http<{ message: string }>(`/api/feedback/${id}/reply`, { method: 'POST', body: JSON.stringify(data) }),
    resolve: (id: string) =>
      http<{ message: string }>(`/api/feedback/${id}/resolve`, { method: 'POST' }),
    stats: () =>
      http<{ avg_rating: number; total: number; positive: number; open: number; nps: number }>('/api/feedback/stats'),
  },

  // ── Offers & Promotions ────────────────────────────────────────
  offers: {
    list: (params?: Record<string, string | number>) =>
      http<unknown[]>(`/api/offers${buildQs(params)}`),
    create: (data: Record<string, unknown>) =>
      http<{ message: string; offer: unknown }>('/api/offers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      http<{ message: string; offer: unknown }>(`/api/offers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => http<{ message: string }>(`/api/offers/${id}`, { method: 'DELETE' }),
    stats: () => http<{ total: number; active: number; total_used: number; expired: number }>('/api/offers/stats'),
  },

  // ── Communication (send notification) ───────────────────────────
  communication: {
    send: (data: { title: string; body: string; type: string; audience: string }) =>
      http<{ message: string; notification: unknown; recipients: number }>('/api/communication/send', {
        method: 'POST', body: JSON.stringify(data),
      }),
    history: (params?: Record<string, string | number>) =>
      http<unknown[]>(`/api/communication/history${buildQs(params)}`),
    delete: (id: string) =>
      http<{ message: string }>(`/api/communication/history/${id}`, { method: 'DELETE' }),
  },

  // ── Integrations ───────────────────────────────────────────────
  integrations: {
    list: () => http<unknown[]>('/api/integrations'),
    test: (id: string, data: { api_key: string }) =>
      http<{ success: boolean; message: string }>(`/api/integrations/${id}/test`, { method: 'POST', body: JSON.stringify(data) }),
    connect: (id: string, data: { api_key: string }) =>
      http<{ success: boolean; message: string }>(`/api/integrations/${id}/connect`, { method: 'POST', body: JSON.stringify(data) }),
    disconnect: (id: string) =>
      http<{ success: boolean; message: string }>(`/api/integrations/${id}/disconnect`, { method: 'POST' }),
  },

  // ── Google Calendar ─────────────────────────────────────────────
  calendar: {
    status: () =>
      http<{ connected: boolean; connectedAt?: string; lastSyncAt?: string; calendarId?: string }>('/api/calendar/status'),
    authUrl: () =>
      http<{ url: string }>('/api/calendar/auth-url'),
    disconnect: () =>
      http<{ message: string }>('/api/calendar/disconnect', { method: 'DELETE' }),
  },

  // ── Activity Logs (Profile) ─────────────────────────────────────
  activity: {
    list: (params?: Record<string, string | number>) =>
      http<ActivityFeed>(`/api/profile/activity${buildQs(params)}`),
    sessions: () => http<ProfileSession[]>('/api/profile/sessions'),
    devices: () => http<ProfileDevice[]>('/api/profile/devices'),
  },

  // ── Profile (My Profile page) ────────────────────────────────────
  profile: {
    me: () => http<ProfileMe>('/api/profile/me'),
    updateMe: (data: { name: string; email: string; phone?: string; location?: string; bio?: string }) =>
      http<ProfileMe>('/api/profile/me', { method: 'PUT', body: JSON.stringify(data) }),
    uploadAvatar: (file: File) => {
      const formData = new FormData();
      formData.append('avatar', file);
      return http<{ avatarUrl: string }>('/api/profile/avatar', { method: 'POST', body: formData });
    },
    mfa: {
      setup: () => http<{ secret: string; qrUrl: string }>('/api/profile/mfa/setup', { method: 'POST' }),
      verify: (code: string) =>
        http<{ recoveryCodes: string[] }>('/api/profile/mfa/verify', { method: 'POST', body: JSON.stringify({ code }) }),
      disable: () => http<{ message: string }>('/api/profile/mfa', { method: 'DELETE' }),
    },
    notifications: {
      get: () => http<NotificationPreferences>('/api/profile/notifications'),
      update: (data: NotificationPreferences) =>
        http<NotificationPreferences>('/api/profile/notifications', { method: 'PUT', body: JSON.stringify(data) }),
    },
    preferences: {
      get: () => http<UserPreferences>('/api/profile/preferences'),
      update: (data: UserPreferences) =>
        http<UserPreferences>('/api/profile/preferences', { method: 'PUT', body: JSON.stringify(data) }),
    },
    revokeAllSessions: () => http<{ message: string }>('/api/profile/sessions/revoke-all', { method: 'POST' }),
  },

  // ── Branches ───────────────────────────────────────────────────
  branches: {
    list: () => http<{ id: string; name: string; location: string; status: string; member_count: number }[]>('/api/settings/branches'),
    create: (data: { name: string; location?: string }) =>
      http<{ id: string; name: string; location: string }>('/api/settings/branches', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { name?: string; location?: string; status?: string }) =>
      http<{ message: string }>(`/api/settings/branches/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => http<{ message: string }>(`/api/settings/branches/${id}`, { method: 'DELETE' }),
  },

  // ── User/Account Management (Settings) ──────────────────────────
  accounts: {
    list: () => http<unknown[]>('/api/auth/users'),
    create: (data: { name: string; email: string; password: string; role: string }) =>
      http<{ message: string; user: unknown }>('/api/auth/create-user', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { name?: string; email?: string; role?: string; status?: string }) =>
      http<{ message: string }>(`/api/auth/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => http<{ message: string }>(`/api/auth/users/${id}`, { method: 'DELETE' }),
    toggleStatus: (id: string) =>
      http<{ message: string; is_active: boolean }>(`/api/auth/users/${id}/toggle`, { method: 'PUT' }),
  },

  gymSettings: {
    get: () =>
      http<{ geofence_lat: number; geofence_lng: number; geofence_radius: number; enable_face_id: boolean; enable_touch_id: boolean; enable_gps: boolean; duplicate_window_minutes: number; auto_checkout: boolean; auto_checkout_minutes: number }>(
        '/api/settings/gym',
      ),
    update: (data: Record<string, unknown>) =>
      http<{ success: boolean }>('/api/settings/gym', { method: 'PUT', body: JSON.stringify(data) }),
  },

  // ── QR Check-in ─────────────────────────────────────────────────
  qr: {
    generate: (params?: { dynamic?: boolean }) =>
      http<{ dataUrl: string; payload: string; userId: string; userType: string; dynamic: boolean; expiresIn: number | null }>(
        `/api/qr/generate${params?.dynamic ? '?dynamic=true' : ''}`
      ),
    generateFor: (type: string, id: string, dynamic?: boolean) =>
      http<{ dataUrl: string; payload: string; userId: string; userType: string }>(
        `/api/qr/generate/${type}/${id}${dynamic ? '?dynamic=true' : ''}`
      ),
    scan: (data: { payload: string; device_info?: string; location?: string }) =>
      http<{ success: boolean; duplicate?: boolean; message: string; user?: { id: string; name: string; status: string; photo_url?: string; member_code?: string; package_type?: string; role?: string }; attendance_id?: string; check_in_time?: string }>(
        '/api/qr/scan', { method: 'POST', body: JSON.stringify(data) }
      ),
    checkout: () =>
      http<{ success: boolean; message: string; attendance_id?: string; duration_minutes?: number; check_out_time?: string }>(
        '/api/qr/checkout', { method: 'POST', body: '{}' }
      ),
    dashboard: () =>
      http<{ currently_inside: { total: number; breakdown: Record<string, number> }; today: { total: number; breakdown: Record<string, unknown> }; hourly: { hour: number; count: number }[]; weekly_trend: { date: string; present: number }[]; method_breakdown: { method: string; count: number }[]; recent_checkins: unknown[]; generated_at: string }>(
        '/api/qr/dashboard'
      ),
    myHistory: (limit?: number) =>
      http<{ history: { date: string; status: string; check_in_time: string | null; check_out_time: string | null; method: string; duration_minutes: number | null }[]; stats: { total_present: number; total_days: number; current_streak: number; longest_streak: number; this_month: number; attendance_rate: number; avg_duration_minutes: number | null } }>(
        `/api/qr/my-history${limit ? `?limit=${limit}` : ''}`
      ),
    staffReport: (params?: { from?: string; to?: string; type?: string }) =>
      http<{ data: unknown[]; from: string; to: string; type: string }>(
        `/api/qr/staff-report${params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : ''}`
      ),
  },

  // ── AI (OpenRouter multi-model) ─────────────────────────────────────────
  ai: {
    /** SSE streaming chat — use fetchEventSource or manual ReadableStream */
    chatUrl: () => `/api/ai/chat`,

    conversations: (params?: { limit?: number; offset?: number }) =>
      http<{ data: AiConversation[] }>(`/api/ai/conversations${buildQs(params)}`),

    conversation: (id: string) =>
      http<{ data: AiConversation & { messages: AiMessage[] } }>(`/api/ai/conversations/${id}`),

    deleteConversation: (id: string) =>
      http<{ message: string }>(`/api/ai/conversations/${id}`, { method: 'DELETE' }),

    /** Rename and/or pin a conversation. Send at least one field. */
    updateConversation: (id: string, data: { title?: string; pinned?: boolean }) =>
      http<{ data: AiConversation }>(`/api/ai/conversations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    usage: () =>
      http<{ data: AiUsageStats }>('/api/ai/usage'),

    modelStats: () =>
      http<{ data: AiModelStat[] }>('/api/ai/model-stats'),

    health: () =>
      http<AiHealthResponse>('/api/ai/health'),

    providerSettings: () =>
      http<{ data: AiProviderSettings }>('/api/ai/provider-settings'),

    test: (body?: { intent?: string; prompt?: string }) =>
      http<{ success: boolean; message: string; model: string; tier: string; latency_ms: number }>('/api/ai/test', {
        method: 'POST',
        body: JSON.stringify(body || {}),
      }),

    generateWorkout: (params: AiWorkoutParams) =>
      httpSSE<{ data: AiWorkoutPlan; model: string; tier: string; used_fallback: boolean }>('/api/ai/workout/generate', {
        method: 'POST',
        body: JSON.stringify(params),
      }),

    generateDiet: (params: AiDietParams) =>
      httpSSE<{ data: AiDietPlan; model: string; tier: string; used_fallback: boolean }>('/api/ai/diet/generate', {
        method: 'POST',
        body: JSON.stringify(params),
      }),

    analyzeProgress: (client_id: string) =>
      httpSSE<{ data: AiProgressAnalysis; model: string; tier: string; used_fallback: boolean }>('/api/ai/progress/analyze', {
        method: 'POST',
        body: JSON.stringify({ client_id }),
      }),

    analyzeFitnessTest: (assessment_id: string) =>
      httpSSE<{ data: AiFitnessTestAnalysis; model: string; tier: string; used_fallback: boolean }>('/api/ai/fitness-testing/analyze', {
        method: 'POST',
        body: JSON.stringify({ assessment_id }),
      }),

    businessInsights: (params?: { from?: string; to?: string }) =>
      httpSSE<{ data: AiBusinessInsights; model: string; tier: string; used_fallback: boolean }>('/api/ai/business/insights', {
        method: 'POST',
        body: JSON.stringify(params || {}),
      }),

    // ── Knowledge base (RAG documents: SOPs, guides, policies) ──────────
    knowledge: {
      list: () =>
        http<{ data: AiKnowledgeDocument[] }>('/api/ai/knowledge'),
      upload: (file: File, title: string, category: 'sop' | 'guide' | 'policy') => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', title);
        formData.append('category', category);
        return http<{ data: AiKnowledgeDocument }>('/api/ai/knowledge', { method: 'POST', body: formData });
      },
      delete: (id: string) =>
        http<{ message: string }>(`/api/ai/knowledge/${id}`, { method: 'DELETE' }),
      reindex: (id: string) =>
        http<{ message: string }>(`/api/ai/knowledge/${id}/reindex`, { method: 'POST' }),
    },
  },

  // ── Platform Super Admin (multi-tenant SaaS) ──────────────────────────────
  // Backed by /api/super-admin/* — reachable only by role='super_admin'.
  superAdmin: {
    listOrgs: () =>
      http<{ data: Organization[] }>('/api/super-admin/organizations'),
    getOrg: (id: string) =>
      http<{ data: OrganizationDetail }>(`/api/super-admin/organizations/${id}`),
    createOrg: (data: { name: string; trainer_name?: string; email: string; password: string }) =>
      http<{ data: { organization: Organization; owner: OrgUser } }>('/api/super-admin/organizations', {
        method: 'POST', body: JSON.stringify(data),
      }),
    updateOrg: (id: string, data: { name?: string; status?: 'active' | 'suspended' }) =>
      http<{ data: Organization }>(`/api/super-admin/organizations/${id}`, {
        method: 'PATCH', body: JSON.stringify(data),
      }),
    setUserActive: (id: string, is_active: boolean) =>
      http<{ data: OrgUser }>(`/api/super-admin/users/${id}`, {
        method: 'PATCH', body: JSON.stringify({ is_active }),
      }),
    resetPassword: (id: string, password: string) =>
      http<{ data: { id: string; message: string } }>(`/api/super-admin/users/${id}/reset-password`, {
        method: 'POST', body: JSON.stringify({ password }),
      }),
    uploadOrgLogo: (id: string, file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return http<{ data: Organization }>(`/api/super-admin/organizations/${id}/logo`, {
        method: 'POST', body: formData,
      });
    },
    overview: () =>
      http<{ data: PlatformOverview }>('/api/super-admin/overview'),
    updateUser: (id: string, data: { name?: string; email?: string; role?: string; is_active?: boolean }) =>
      http<{ data: OrgUser }>(`/api/super-admin/users/${id}`, {
        method: 'PATCH', body: JSON.stringify(data),
      }),
    addUser: (orgId: string, data: { name: string; email: string; password: string; role?: string }) =>
      http<{ data: OrgUser }>(`/api/super-admin/organizations/${orgId}/users`, {
        method: 'POST', body: JSON.stringify(data),
      }),
    deleteUser: (id: string) =>
      http<{ data: { id: string; message: string } }>(`/api/super-admin/users/${id}`, {
        method: 'DELETE',
      }),
    listActivity: (params: { org_id?: string; user_id?: string; action?: string; limit?: number; offset?: number } = {}) => {
      const qs = new URLSearchParams();
      if (params.org_id) qs.set('org_id', params.org_id);
      if (params.user_id) qs.set('user_id', params.user_id);
      if (params.action) qs.set('action', params.action);
      if (params.limit != null) qs.set('limit', String(params.limit));
      if (params.offset != null) qs.set('offset', String(params.offset));
      const q = qs.toString();
      return http<{ data: ActivityEntry[]; paging: { limit: number; offset: number; count: number } }>(
        `/api/super-admin/activity${q ? `?${q}` : ''}`,
      );
    },
    // ── Admin Management operator actions ──────────────────────────────
    /** Revokes every live session for one account (bumps token_version).
     *  Deliberately does not touch the password. */
    forceLogout: (userId: string) =>
      http<{ data: { id: string; message: string } }>(`/api/super-admin/users/${userId}/force-logout`, { method: 'POST' }),
    /** Clears the enrolled authenticator and revokes sessions with it. */
    resetMfa: (userId: string) =>
      http<{ data: { id: string; was_enabled: boolean; message: string } }>(`/api/super-admin/users/${userId}/reset-mfa`, { method: 'POST' }),
    /** Extends the studio's current period (or trial) by a delta. */
    bonusDays: (orgId: string, days: number, reason?: string) =>
      http<{ data: { id: string; field: string; previous: string | null; days: number } }>(
        `/api/super-admin/organizations/${orgId}/subscription/bonus-days`,
        { method: 'POST', body: JSON.stringify({ days, ...(reason ? { reason } : {}) }) },
      ),
    orgNotes: (orgId: string) =>
      http<{ data: OrgInternalNotes }>(`/api/super-admin/organizations/${orgId}/notes`),
    saveOrgNotes: (orgId: string, notes: string) =>
      http<{ data: OrgInternalNotes }>(`/api/super-admin/organizations/${orgId}/notes`, {
        method: 'PUT', body: JSON.stringify({ notes }),
      }),

    /** Audit Centre. Distinct from `activity` above: that is the dashboard's
     *  recent-events feed, this is the filterable investigative view with a
     *  real total and the previous value of each change. */
    audit: (params: AuditQuery = {}) => {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
      }
      const q = qs.toString();
      return http<{ data: AuditEntry[]; paging: { limit: number; offset: number; total: number; count: number } }>(
        `/api/super-admin/audit${q ? `?${q}` : ''}`,
      );
    },
    auditFilters: () => http<AuditFilters>('/api/super-admin/audit/filters'),
    /** Built rather than fetched: the browser must navigate to it so the file
     *  downloads with the server's Content-Disposition. */
    auditExportUrl: (params: AuditQuery = {}) => {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '' && k !== 'limit' && k !== 'offset') qs.set(k, String(v));
      }
      const q = qs.toString();
      return `${apiBase()}/api/super-admin/audit/export${q ? `?${q}` : ''}`;
    },
    systemHealth: () => http<SystemHealth>('/api/super-admin/system-health'),

    // ── Billing Centre ──────────────────────────────────────────────────────
    billingSettings: () => http<{ data: PlatformBillingSettings }>('/api/super-admin/billing/settings'),
    saveBillingSettings: (patch: Partial<PlatformBillingSettings>) =>
      http<{ data: PlatformBillingSettings }>('/api/super-admin/billing/settings', {
        method: 'PUT', body: JSON.stringify(patch),
      }),
    invoices: (params: InvoiceQuery = {}) =>
      http<{ data: SubscriptionInvoice[]; totals: InvoiceTotals; page: { limit: number; offset: number; has_more: boolean } }>(
        `/api/super-admin/billing/invoices${qsOf(params)}`,
      ),
    /** Built rather than fetched, same as auditExportUrl: the browser must
     *  navigate to it so the file lands with the server's Content-Disposition. */
    invoicesExportUrl: (params: InvoiceQuery = {}) =>
      `${apiBase()}/api/super-admin/billing/invoices/export${qsOf(params, ['limit', 'offset'])}`,
    invoicePdfUrl: (id: string) => `${apiBase()}/api/super-admin/billing/invoices/${id}/pdf`,
    orgBillingProfile: (orgId: string) =>
      http<{ data: OrgBillingProfile }>(`/api/super-admin/organizations/${orgId}/billing-profile`),
    saveOrgBillingProfile: (orgId: string, patch: Partial<OrgBillingProfile>) =>
      http<{ data: OrgBillingProfile }>(`/api/super-admin/organizations/${orgId}/billing-profile`, {
        method: 'PUT', body: JSON.stringify(patch),
      }),

    // ── Feature Manager ─────────────────────────────────────────────────────
    features: () => http<{ data: FeatureCatalogue }>('/api/super-admin/features'),
    updateFeature: (key: string, patch: { global_enabled?: boolean; default_enabled?: boolean; is_plan_gated?: boolean }) =>
      http<{ data: PlatformFeature }>(`/api/super-admin/features/${key}`, {
        method: 'PATCH', body: JSON.stringify(patch),
      }),
    setFeaturePlans: (key: string, plans: Record<string, boolean>) =>
      http<{ data: unknown }>(`/api/super-admin/features/${key}/plans`, {
        method: 'PUT', body: JSON.stringify({ plans }),
      }),
    featureOverrides: (key: string) =>
      http<{ data: FeatureOverrideRow[] }>(`/api/super-admin/features/${key}/overrides`),
    orgFeatures: (orgId: string) =>
      http<{ data: ResolvedFeature[] }>(`/api/super-admin/organizations/${orgId}/features`),
    setOrgFeature: (orgId: string, key: string, body: { enabled: boolean; reason: string; expires_at?: string }) =>
      http<{ data: unknown }>(`/api/super-admin/organizations/${orgId}/features/${key}`, {
        method: 'PUT', body: JSON.stringify(body),
      }),
    clearOrgFeature: (orgId: string, key: string) =>
      http<{ data: { cleared: boolean } }>(`/api/super-admin/organizations/${orgId}/features/${key}`, {
        method: 'DELETE',
      }),

    impersonate: (orgId: string, opts: { userId?: string; mode?: 'read_only' | 'full' } = {}) =>
      http<{ data: ImpersonationSession }>(`/api/super-admin/organizations/${orgId}/impersonate`, {
        method: 'POST',
        body: JSON.stringify({
          ...(opts.userId ? { user_id: opts.userId } : {}),
          ...(opts.mode ? { mode: opts.mode } : {}),
        }),
      }),
    // ── Subscription / billing management ──
    subscriptions: () =>
      http<{ data: { studios: SubStudio[]; kpis: SubKpis } }>('/api/super-admin/subscriptions'),
    /** SaaS run-rate metrics: MRR/ARR, plan mix, conversion, founders, trends. */
    subscriptionMetrics: () =>
      http<{ data: SubscriptionMetrics }>('/api/super-admin/subscription-metrics'),

    // ── Coupons ──────────────────────────────────────────────────────────────
    listCoupons: () => http<{ data: Coupon[] }>('/api/super-admin/coupons'),
    couponRedemptions: (id: string) =>
      http<{ data: { id: string; organization_name: string | null; gross_amount_inr: number; discount_inr: number; net_amount_inr: number; redeemed_at: string }[] }>(
        `/api/super-admin/coupons/${id}/redemptions`),
    createCoupon: (data: {
      code: string; description?: string;
      discount_type: 'percent' | 'fixed'; discount_value: number;
      max_discount_inr?: number | null; min_amount_inr?: number | null;
      applies_to_plans?: string[] | null;
      max_redemptions?: number | null; max_per_org?: number | null;
      valid_from?: string | null; valid_until?: string | null;
    }) => http<{ data: Coupon }>('/api/super-admin/coupons', { method: 'POST', body: JSON.stringify(data) }),
    updateCoupon: (id: string, data: Partial<Pick<Coupon, 'description' | 'is_active' | 'max_redemptions' | 'max_per_org' | 'valid_from' | 'valid_until' | 'min_amount_inr' | 'max_discount_inr'>>) =>
      http<{ data: Coupon }>(`/api/super-admin/coupons/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    /** Only possible while unused — a redeemed coupon is deactivated, not deleted. */
    deleteCoupon: (id: string) =>
      http<{ data: { deleted: boolean } }>(`/api/super-admin/coupons/${id}`, { method: 'DELETE' }),
    getSubscription: (orgId: string) =>
      http<{ data: SubDetail }>(`/api/super-admin/organizations/${orgId}/subscription`),
    activateSubscription: (orgId: string, body: { plan_code: string; amount_inr?: number; method?: string; reference?: string; notes?: string; period_months?: number }) =>
      http<{ data: unknown }>(`/api/super-admin/organizations/${orgId}/subscription/activate`, { method: 'POST', body: JSON.stringify(body) }),
    freezeSubscription: (orgId: string, reason?: string) =>
      http<{ data: unknown }>(`/api/super-admin/organizations/${orgId}/subscription/freeze`, { method: 'POST', body: JSON.stringify({ reason }) }),
    reactivateSubscription: (orgId: string) =>
      http<{ data: unknown }>(`/api/super-admin/organizations/${orgId}/subscription/reactivate`, { method: 'POST', body: JSON.stringify({}) }),
    cancelSubscription: (orgId: string) =>
      http<{ data: unknown }>(`/api/super-admin/organizations/${orgId}/subscription/cancel`, { method: 'POST', body: JSON.stringify({}) }),
    changeExpiry: (orgId: string, body: { trial_ends_at?: string | null; current_period_end?: string | null }) =>
      http<{ data: unknown }>(`/api/super-admin/organizations/${orgId}/subscription/expiry`, { method: 'PATCH', body: JSON.stringify(body) }),
    grantFounder: (orgId: string) =>
      http<{ data: unknown }>(`/api/super-admin/organizations/${orgId}/subscription/founder`, { method: 'POST', body: JSON.stringify({}) }),
    // ── Subscription self-checkout queue (the command centre) ───────────────
    platformPaymentSettings: () =>
      http<{ data: PlatformPaymentSettings | null; configured: boolean; enabled: boolean }>(
        '/api/super-admin/platform-payment-settings'),
    savePlatformPaymentSettings: (body: PlatformPaymentSettingsInput) =>
      http<{ data: PlatformPaymentSettings }>('/api/super-admin/platform-payment-settings', {
        method: 'PUT', body: JSON.stringify(body),
      }),
    subscriptionRequests: (params: { status?: string; q?: string; limit?: number; offset?: number } = {}) => {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') qs.set(k, String(v));
      const q = qs.toString();
      return http<{
        data: SubCheckoutQueueRow[]; total: number; stats: SubCheckoutStats;
        reject_reasons: Record<UpiRejectReason, string>;
      }>(`/api/super-admin/subscription-requests${q ? `?${q}` : ''}`);
    },
    approveSubscriptionRequest: (id: string) =>
      http<{ data: { request: SubCheckoutQueueRow; activation: unknown } }>(
        `/api/super-admin/subscription-requests/${id}/approve`, { method: 'POST' }),
    rejectSubscriptionRequest: (id: string, reason: UpiRejectReason, note?: string) =>
      http<{ data: { reason: UpiRejectReason; note: string | null } }>(
        `/api/super-admin/subscription-requests/${id}/reject`, {
          method: 'POST', body: JSON.stringify({ reason, note }),
        }),

    refundPayment: (paymentId: string) =>
      http<{ data: unknown }>(`/api/super-admin/subscription-payments/${paymentId}/refund`, { method: 'POST', body: JSON.stringify({}) }),
    /** Price a studio's requested plan change before executing it (proration credit, amount due). */
    changeQuote: (orgId: string, planCode: string) =>
      http<{ data: PlanChangeQuote }>(`/api/super-admin/organizations/${orgId}/subscription/change-quote?plan_code=${encodeURIComponent(planCode)}`),
    /** Execute a studio's requested upgrade/renewal once payment is confirmed — credits unused
     *  time on the current plan and restarts the period from now (never use activateSubscription
     *  for this: it stacks time on top instead of crediting it, double-granting days). */
    changePlan: (orgId: string, body: { plan_code: string; amount_inr?: number; method?: string; reference?: string; notes?: string }) =>
      http<{ data: unknown }>(`/api/super-admin/organizations/${orgId}/subscription/change`, { method: 'POST', body: JSON.stringify(body) }),
  },
  subscription: {
    status: () => http<{ data: SubscriptionStatus }>('/api/subscription/status'),
    plans: () => http<{ data: { plans: SubPlan[]; founder_slots_remaining: number; founder_limit: number } }>('/api/subscription/plans'),
    invoices: () => http<{ data: SubInvoice[] }>('/api/subscription/invoices'),
    payments: () => http<{ data: SubPayment[] }>('/api/subscription/payments'),
    requestActivation: (plan_code?: string, coupon_code?: string) =>
      http<{ data: { requested: boolean; message: string } }>('/api/subscription/request-activation', {
        method: 'POST',
        body: JSON.stringify({
          ...(plan_code ? { plan_code } : {}),
          ...(coupon_code ? { coupon_code } : {}),
        }),
      }),

    /** Price a plan change without committing to it. Read-only. */
    changeQuote: (plan_code: string) =>
      http<{ data: PlanChangeQuote }>(`/api/subscription/change-quote?plan_code=${encodeURIComponent(plan_code)}`),

    /**
     * Ask to move plans. A downgrade is scheduled immediately for period end
     * (costs nothing); an upgrade is queued for the operator to activate
     * against payment, since billing is admin-activated.
     */
    requestChange: (plan_code: string) =>
      http<{
        data: {
          requested?: boolean; scheduled?: boolean;
          direction: PlanChangeQuote['direction'];
          effective_at?: string | null;
          amount_due_inr?: number; proration_credit_inr?: number;
          warning?: string | null; message: string;
        };
      }>('/api/subscription/request-change', {
        method: 'POST', body: JSON.stringify({ plan_code }),
      }),

    // ── UPI self-checkout: the studio pays the PLATFORM ─────────────────────
    // Distinct from api.upiPayments, which is the studio collecting from its
    // own members. Different payer, payee and approver — see the backend note
    // in lib/subscriptionCheckout.js.
    checkout: {
      /** Is self-checkout switched on by the platform operator at all? */
      settings: () =>
        http<{ data: { available: boolean; merchant_name: string | null; instructions: string | null } }>(
          '/api/subscription/checkout/settings'),

      /**
       * Open (or resume) a payment for a plan. The amount is computed
       * server-side from the plan, founder pricing and any coupon — nothing
       * here can influence what is charged.
       */
      open: (plan_code: string, coupon_code?: string | null) =>
        http<{ data: { request: SubCheckoutRequest; payment: UpiPaymentView; reused: boolean } }>(
          '/api/subscription/checkout', {
            method: 'POST',
            body: JSON.stringify({ plan_code, ...(coupon_code ? { coupon_code } : {}) }),
          }),

      /** Full state of one checkout: QR, intents, status. */
      get: (id: string) =>
        http<{
          data: {
            request: SubCheckoutRequest & { plan_name: string | null; duration_months: number | null };
            payment: UpiPaymentView | null;
            reject_reasons: Record<UpiRejectReason, string>;
          };
        }>(`/api/subscription/checkout/${id}`),

      submitUtr: (id: string, utr: string, note?: string | null) =>
        http<{ data: SubCheckoutRequest }>(`/api/subscription/checkout/${id}/submit-utr`, {
          method: 'POST', body: JSON.stringify({ utr, note: note || null }),
        }),

      cancel: (id: string) =>
        http<{ data: SubCheckoutRequest }>(`/api/subscription/checkout/${id}/cancel`, { method: 'POST' }),

      history: () => http<{ data: SubCheckoutRequest[] }>('/api/subscription/checkout'),
    },

    /** Drop a pending downgrade so the studio stays on its current plan. */
    cancelScheduledChange: () =>
      http<{ data: { cancelled: boolean } }>('/api/subscription/cancel-scheduled-change', { method: 'POST' }),

    /**
     * Preview a coupon discount. Read-only — nothing is reserved, so a code
     * that validates here can still be exhausted by someone else before
     * activation. The binding check happens server-side under a row lock.
     */
    validateCoupon: (code: string, planCode?: string) =>
      http<{ data: CouponValidation }>(
        `/api/subscription/validate-coupon?code=${encodeURIComponent(code)}`
        + (planCode ? `&plan_code=${encodeURIComponent(planCode)}` : ''),
      ),
  },

  /**
   * Membership plans (the `plans` table). Read-only here — plans are managed
   * elsewhere; this exists so the UPI flow can offer real plans at their real
   * price instead of asking staff to retype an amount.
   */
  membershipPlans: {
    list: () => http<MembershipPlan[]>('/api/plans?kind=Membership&active=true'),
  },

  // ── Manual UTR verification payments ──────────────────────────────────────
  // Mounted under /api/payments/upi so it sits beside the finance ledger
  // (/api/payments) without colliding with it.
  upiPayments: {
    /** The studio's payee details. Any signed-in user in the studio may read. */
    getSettings: () =>
      http<{ data: UpiSettings | null; configured: boolean; enabled: boolean }>(
        '/api/payments/upi/settings'),

    /** Configure collection. Admin only. */
    saveSettings: (body: UpiSettingsInput) =>
      http<{ data: UpiSettings }>('/api/payments/upi/settings', {
        method: 'PUT', body: JSON.stringify(body),
      }),

    /**
     * Open an order. `base_amount` is ignored server-side whenever `plan_id`
     * names a real plan — the stored price wins — so this is never the
     * authority on what is charged.
     */
    create: (body: UpiCreateOrderInput) =>
      http<{ data: { order: UpiOrder; payment: UpiPaymentView; reused: boolean } }>(
        '/api/payments/upi/create', { method: 'POST', body: JSON.stringify(body) }),

    /** Full state of one order: QR, intents, every submission, the activation. */
    status: (orderId: string) =>
      http<{ data: UpiOrderDetail }>(`/api/payments/upi/${orderId}/status`),

    /** Telemetry only — records that a UPI app was actually launched. */
    markOpened: (orderId: string) =>
      http<{ data: { status: UpiOrderStatus } }>(`/api/payments/upi/${orderId}/opened`,
        { method: 'POST' }),

    /**
     * Upload payment proof. Returns a SERVER-CHOSEN storage key; pass it
     * straight back to submitUtr, which re-checks that this order issued it.
     */
    uploadProof: (orderId: string, file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return http<{ data: { screenshot_url: string; mime: string; bytes: number } }>(
        `/api/payments/upi/${orderId}/upload`, { method: 'POST', body: formData });
    },

    submitUtr: (orderId: string, body: UpiSubmitUtrInput) =>
      http<{ data: UpiSubmission }>(`/api/payments/upi/${orderId}/submit-utr`, {
        method: 'POST', body: JSON.stringify(body),
      }),

    cancel: (orderId: string) =>
      http<{ data: UpiOrder }>(`/api/payments/upi/${orderId}/cancel`, { method: 'POST' }),

    /** A member sees only their own rows here, whatever is passed. */
    history: (params: { status?: string; client_id?: string; limit?: number; offset?: number } = {}) => {
      const q = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) if (v !== undefined) q.set(k, String(v));
      const qs = q.toString();
      return http<{ data: UpiHistoryRow[]; total: number }>(
        `/api/payments/upi/history${qs ? `?${qs}` : ''}`);
    },

    /** The admin verification queue plus its dashboard counters. Admin only. */
    pending: (params: UpiQueueParams = {}) => {
      const q = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) if (v !== undefined) q.set(k, String(v));
      const qs = q.toString();
      return http<{
        data: UpiQueueRow[]; total: number; stats: UpiQueueStats;
        reject_reasons: Record<UpiRejectReason, string>;
      }>(`/api/payments/upi/pending${qs ? `?${qs}` : ''}`);
    },

    approve: (orderId: string) =>
      http<{ data: { order: UpiOrder; activation: UpiActivation } }>(
        `/api/payments/upi/${orderId}/approve`, { method: 'POST' }),

    reject: (orderId: string, reason: UpiRejectReason, note?: string) =>
      http<{ data: { reason: UpiRejectReason; note: string | null } }>(
        `/api/payments/upi/${orderId}/reject`, {
          method: 'POST', body: JSON.stringify({ reason, note }),
        }),

    requestCorrection: (orderId: string, reason: UpiRejectReason, note?: string) =>
      http<{ data: { reason: UpiRejectReason; note: string | null } }>(
        `/api/payments/upi/${orderId}/request-correction`, {
          method: 'POST', body: JSON.stringify({ reason, note }),
        }),

    audit: (orderId: string) =>
      http<{ data: UpiAuditEntry[] }>(`/api/payments/upi/${orderId}/audit`),

    /** Absolute URL of the receipt PDF, for a link or a print window. */
    receiptUrl: (orderId: string) => `${apiBase()}/api/payments/upi/${orderId}/receipt`,
  },
};

export type MembershipPlan = {
  id: string;
  kind: string;
  name: string;
  description: string | null;
  /** An enum of words ('Monthly' … 'Yearly'), not a number of months. */
  duration: string;
  final_amount: string;
  is_active: boolean;
};

/** plans.duration is a word; the order needs a count. Mirrors the backend map. */
export const PLAN_DURATION_MONTHS: Record<string, number> = {
  'Monthly': 1, 'Quarterly': 3, 'Half Yearly': 6, 'Yearly': 12,
};

// ── Subscription self-checkout types ─────────────────────────────────────────
//
// Amounts here are INTEGER whole rupees (matching subscription_plans.price_inr
// and subscription_payments.amount_inr), NOT the NUMERIC strings the member
// payment types carry. UPI cannot move paise reliably, and the whole billing
// chain is integer — so these are numbers, and arithmetic on them is safe.

export type SubCheckoutStatus =
  | 'AWAITING_PAYMENT' | 'AWAITING_VERIFICATION'
  | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';

export type SubCheckoutRequest = {
  id: string;
  organization_id: string;
  request_no: string;
  plan_code: string;
  plan_name?: string | null;
  duration_months?: number | null;
  list_price_inr: number;
  discount_inr: number;
  amount_inr: number;
  coupon_code: string | null;
  /** 'activation' for a brand-new subscription; 'upgrade'/'renewal' when an
      already-active studio priced this through checkout — amount_inr already
      has proration_credit_inr netted out in that case. */
  direction: 'activation' | 'renewal' | 'upgrade';
  proration_credit_inr: number;
  previous_plan_code: string | null;
  upi_id: string;
  merchant_name: string;
  status: SubCheckoutStatus;
  expires_at: string;
  utr: string | null;
  screenshot_url: string | null;
  payer_note: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  rejected_reason: UpiRejectReason | null;
  rejected_note: string | null;
  payment_id: string | null;
  created_at: string;
  updated_at: string;
};

export type SubCheckoutQueueRow = SubCheckoutRequest & {
  organization_name: string;
  organization_slug: string;
  subscription_status: string | null;
  current_period_end: string | null;
};

export type SubCheckoutStats = {
  awaiting_count: number;
  awaiting_amount_inr: number;
  unpaid_count: number;
  approved_today: number;
  approved_today_amount_inr: number;
  collected_inr: number;
};

export type PlatformPaymentSettings = {
  upi_id: string;
  merchant_name: string;
  instructions: string | null;
  is_enabled: boolean;
  request_ttl_minutes: number;
  created_at: string;
  updated_at: string;
};

export type PlatformPaymentSettingsInput = {
  upi_id: string;
  merchant_name: string;
  instructions?: string | null;
  is_enabled?: boolean;
  request_ttl_minutes?: number;
};

// ── Manual UTR payment types ──────────────────────────────────────────────────

export type UpiOrderStatus =
  | 'CREATED' | 'PAYMENT_PENDING' | 'VERIFICATION_PENDING'
  | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';

export type UpiSubmissionStatus =
  'VERIFICATION_PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export type UpiRejectReason =
  | 'DUPLICATE_UTR' | 'WRONG_UTR' | 'PAYMENT_NOT_RECEIVED'
  | 'AMOUNT_MISMATCH' | 'FAKE_SCREENSHOT' | 'OTHER';

export type UpiSettings = {
  id: string;
  organization_id: string;
  upi_id: string;
  merchant_name: string;
  gst_percent: string;
  gst_number: string | null;
  is_enabled: boolean;
  instructions: string | null;
  order_ttl_minutes: number;
  created_at: string;
  updated_at: string;
};

export type UpiSettingsInput = {
  upi_id: string;
  merchant_name: string;
  gst_percent?: number;
  gst_number?: string | null;
  is_enabled?: boolean;
  instructions?: string | null;
  order_ttl_minutes?: number;
};

export type UpiCreateOrderInput = {
  client_id?: string | null;
  plan_id?: string | null;
  plan_name: string;
  duration_months: number;
  base_amount: number;
  notes?: string | null;
};

export type UpiSubmitUtrInput = {
  utr: string;
  screenshot_url?: string | null;
  screenshot_mime?: string | null;
  notes?: string | null;
};

/**
 * Amounts arrive as strings because they are Postgres NUMERIC — node-postgres
 * does not parse them into JS numbers, and it is right not to: a float cannot
 * hold every 2-decimal rupee value exactly. Format them, do not arithmetic
 * them.
 */
export type UpiOrder = {
  id: string;
  organization_id: string;
  order_no: string;
  client_id: string;
  client_name?: string;
  plan_id: string | null;
  plan_name: string;
  duration_months: number;
  base_amount: string;
  gst_percent: string;
  gst_amount: string;
  total_amount: string;
  upi_id: string;
  merchant_name: string;
  status: UpiOrderStatus;
  expires_at: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type UpiAppIntent = { key: string; label: string; url: string };

export type UpiPaymentView = {
  intent_url: string;
  app_intents: UpiAppIntent[];
  qr_data_url: string;
};

export type UpiSubmission = {
  id: string;
  utr: string;
  screenshot_url: string | null;
  notes: string | null;
  status: UpiSubmissionStatus;
  submitted_at: string;
  verified_at: string | null;
  rejected_reason: UpiRejectReason | null;
  rejected_note: string | null;
};

export type UpiActivation = {
  receipt_no: string;
  amount: string;
  utr: string;
  activated_from: string;
  activated_to: string;
  approved_at: string;
};

export type UpiOrderDetail = {
  order: UpiOrder & { client_name: string; client_mobile: string | null; client_email: string | null };
  /** null once the order can no longer be paid — no QR for a settled order. */
  payment: UpiPaymentView | null;
  submissions: UpiSubmission[];
  activation: UpiActivation | null;
  reject_reasons: Record<UpiRejectReason, string>;
};

export type UpiHistoryRow = UpiOrder & {
  client_name: string;
  utr: string | null;
  submission_status: UpiSubmissionStatus | null;
  submitted_at: string | null;
  rejected_reason: UpiRejectReason | null;
  rejected_note: string | null;
  screenshot_url: string | null;
  receipt_no: string | null;
  activated_from: string | null;
  activated_to: string | null;
};

export type UpiQueueRow = UpiOrder & {
  client_name: string;
  client_mobile: string | null;
  client_email: string | null;
  client_photo_url: string | null;
  submission_id: string | null;
  utr: string | null;
  screenshot_url: string | null;
  submission_notes: string | null;
  submitted_at: string | null;
  submission_status: UpiSubmissionStatus | null;
  rejected_reason: UpiRejectReason | null;
  rejected_note: string | null;
};

export type UpiQueueParams = {
  q?: string;
  status?: 'VERIFICATION_PENDING' | 'APPROVED' | 'REJECTED' | 'ALL';
  sort?: 'newest' | 'oldest' | 'amount_high' | 'amount_low';
  limit?: number;
  offset?: number;
};

export type UpiQueueStats = {
  pending_count: number;
  pending_amount: string;
  approved_today: number;
  approved_today_amount: string;
  total_collected: string;
  rejected_today: number;
};

export type UpiAuditEntry = {
  action: string;
  from_status: string | null;
  to_status: string | null;
  detail: Record<string, unknown> | null;
  actor_name: string | null;
  actor_role: string | null;
  created_at: string;
};

// ── Platform Super Admin types ────────────────────────────────────────────────
export type Organization = {
  id: string; name: string; slug: string;
  status: 'active' | 'suspended'; created_at: string;
  logo_url?: string | null;
  user_count?: number; trainer_count?: number; client_count?: number;
};
export type OrgUser = {
  id: string; name: string; email: string; role: string;
  trainer_id: string | null; is_active: boolean;
  last_login?: string | null; created_at?: string; organization_id?: string;
};
export type OrganizationDetail = Organization & { users: OrgUser[] };

export type StudioOverview = {
  id: string; name: string; slug: string;
  status: 'active' | 'suspended'; logo_url?: string | null; created_at: string;
  admin_count: number; last_login: string | null;
  total_clients: number; active_clients: number;
  revenue: number | string; outstanding: number | string;
  sessions_this_month: number;
};
export type PlatformTotals = {
  studios: number; active_studios: number; suspended_studios: number;
  total_clients: number; active_clients: number;
  revenue: number; outstanding: number; sessions_this_month: number;
};
export type PlatformOverview = { totals: PlatformTotals; studios: StudioOverview[] };

export type ActivityEntry = {
  id: string | number; user_id: string | null; user_name: string | null;
  action: string; entity_type: string | null; entity_id: string | null;
  new_data?: unknown; ip_address?: string | null; created_at: string;
  organization_id: string | null; organization_name: string | null;
};

/** Audit Centre row — the investigative view, so it carries the previous value
 *  and the user agent that the dashboard's lighter activity feed omits. */
export type AuditEntry = ActivityEntry & {
  old_data?: unknown;
  user_agent?: string | null;
};

export type OrgInternalNotes = {
  internal_notes: string | null;
  internal_notes_updated_at: string | null;
  internal_notes_updated_by: string | null;
};

export type AuditFilters = { actions: string[]; entity_types: string[] };

export type AuditQuery = {
  org_id?: string; user_id?: string; action?: string; entity_type?: string;
  from?: string; to?: string; q?: string; limit?: number; offset?: number;
};

export type SystemHealth = {
  checked_at: string;
  check_duration_ms: number;
  database: {
    status: 'up' | 'down';
    latency_ms: number | null;
    error: string | null;
    size_bytes: number | null;
    pool: { total: number | null; idle: number | null; waiting: number | null };
  };
  migrations: { applied: number | null; latest: string | null; applied_at: string | null };
  process: {
    uptime_seconds: number; node_version: string; app_version: string | null;
    environment: string;
    memory: { rss_bytes: number; heap_used_bytes: number; heap_total_bytes: number };
  };
  errors_24h: number | null;
};

// ── Billing Centre ────────────────────────────────────────────────────────────
/** The platform's own seller identity, printed on every subscription invoice. */
export type PlatformBillingSettings = {
  legal_name: string | null;
  address_line1: string | null; address_line2: string | null;
  city: string | null; state: string | null; state_code: string | null;
  postal_code: string | null; country: string | null;
  gstin: string | null; pan: string | null;
  email: string | null; phone: string | null;
  /** Applies to invoices issued from now on; historical ones keep their own. */
  gst_percent: number | string;
  prices_include_gst: boolean;
  invoice_prefix: string;
  invoice_notes: string | null;
  updated_at?: string | null; updated_by?: string | null;
};

/** Numeric columns arrive as strings from pg's NUMERIC — never assume number. */
export type SubscriptionInvoice = {
  id: string; invoice_number: string;
  organization_id: string; organization_name: string | null; organization_slug: string | null;
  payment_id: string | null;
  plan_code: string | null; plan_name: string | null;
  amount_inr: number;
  /** null on invoices issued before tax was itemised — render, don't invent. */
  taxable_value_inr: string | null; gst_percent: string | null;
  cgst_inr: string | null; sgst_inr: string | null; igst_inr: string | null;
  period_start: string | null; period_end: string | null;
  status: 'paid' | 'refunded' | string;
  issued_at: string;
  billing_gstin: string | null;
  buyer_snapshot: { gstin?: string | null; name?: string | null } | null;
  payment_method: string | null; payment_reference: string | null;
};

export type InvoiceTotals = {
  count: number; gross_inr: number; taxable_inr: number;
  tax_inr: number; refunded_inr: number;
  /** How many rows in this set have no tax snapshot, so tax_inr under-reports. */
  untaxed_count: number;
};

export type InvoiceQuery = {
  org_id?: string; status?: string; plan_code?: string;
  from?: string; to?: string; q?: string; limit?: number; offset?: number;
};

export type OrgBillingProfile = {
  id: string; name: string;
  billing_name: string | null; billing_email: string | null; billing_gstin: string | null;
  billing_address_line1: string | null; billing_address_line2: string | null;
  billing_city: string | null; billing_state: string | null;
  billing_state_code: string | null; billing_postal_code: string | null;
};

// ── Feature Manager ───────────────────────────────────────────────────────────
export type PlatformFeature = {
  key: string; name: string; description: string | null; category: string;
  default_enabled: boolean; is_plan_gated: boolean; is_core: boolean;
  global_enabled: boolean; sort_order: number;
  /** Studios with a live override — what a global flip is about to collide with. */
  override_count: number;
  disabled_count: number;
};

export type FeatureCatalogue = {
  features: PlatformFeature[];
  plans: { code: string; name: string; sort_order: number }[];
  /** plan code → feature key → included. A plan with no rows is still present. */
  plan_matrix: Record<string, Record<string, boolean>>;
};

/** Why a feature resolved the way it did, so an operator can explain it. */
export type FeatureSource = 'core' | 'global_off' | 'override' | 'plan' | 'default';

export type ResolvedFeature = {
  key: string; name: string; description: string | null; category: string;
  enabled: boolean; source: FeatureSource;
  is_core: boolean; is_plan_gated: boolean;
  override: {
    enabled: boolean; reason: string | null; expires_at: string | null;
    set_by: string | null; active: boolean;
  } | null;
};

export type FeatureOverrideRow = {
  organization_id: string; organization_name: string; organization_slug: string;
  plan_code: string | null; feature_key: string; enabled: boolean;
  reason: string | null; expires_at: string | null;
  set_by_name: string | null; updated_at: string;
};

export type ImpersonationSession = {
  token: string; readonly: boolean;
  admin: { id: string; name: string; email: string; role: string };
  organization: { id: string; name: string; slug: string; logo_url?: string | null };
};

// ── Subscription / billing types ──────────────────────────────────────────────
export type SubPlan = {
  code: string; name: string; price_inr: number; launch_price_inr: number | null;
  duration_months: number; client_limit: number | null; best_for: string | null;
  effective_price_inr: number; is_launch: boolean;
};
export type SubStudio = {
  id: string; name: string; slug: string; logo_url?: string | null;
  status: string; subscription_status: string; effective_state: string; allowed: boolean;
  trial_ends_at: string | null; current_period_end: string | null;
  plan_code: string | null; plan_name: string | null; client_limit: number | null; client_count: number;
  is_founder: boolean; founder_number: number | null; locked_price_inr: number | null;
  trial_days_left: number | null; period_days_left: number | null; renewal_due: boolean;
  requested_at?: string | null;
  requested_plan_code?: string | null; requested_plan_name?: string | null;
  requested_direction?: string | null;
};
export type SubKpis = {
  studios: number; trial: number; active: number; frozen: number; founders: number;
  total_revenue: number; revenue_this_month: number; founder_slots_remaining: number;
};

/**
 * SaaS run-rate metrics for the command centre.
 *
 * MRR is a run-rate (each active subscription's recurring price normalised to
 * one month), NOT cash collected — proration credits and one-offs move cash but
 * not the run-rate. `revenue_trend` is the cash side.
 */
export type SubscriptionMetrics = {
  mrr_inr: number;
  arr_inr: number;
  arpu_inr: number;
  paying_studios: number;
  states: {
    suspended: number; on_trial: number; trial_lapsed: number;
    active: number; lapsed: number; frozen: number;
    expired: number; cancelled: number; total: number;
  };
  plan_distribution: {
    code: string; name: string; price_inr: number; duration_months: number;
    studios: number; mrr_inr: number;
  }[];
  /** rate_pct is null when no trial has started yet — not 0%. */
  trial_conversion: { started: number; converted: number; rate_pct: number | null };
  founders: {
    granted: number; limit: number; slots_remaining: number;
    locked_value_inr: number; highest_number: number | null;
  };
  revenue_trend: { label: string; month: string; revenue_inr: number; payments: number; refunded_inr: number }[];
  growth: { label: string; month: string; new_studios: number }[];
};
export type SubPayment = {
  id: string; plan_code: string | null; amount_inr: number; method: string | null;
  reference: string | null; status: string; period_start: string | null; period_end: string | null;
  recorded_by_name: string | null; refunded_at: string | null; notes: string | null; created_at: string;
};
export type SubInvoice = {
  id: string; invoice_number: string; plan_code: string | null; amount_inr: number;
  period_start: string | null; period_end: string | null; status: string; issued_at: string;
};
export type SubEvent = { id: string; event: string; data: unknown; actor_name: string | null; created_at: string };
export type SubDetail = {
  organization: {
    id: string; name: string; slug: string; status: string; subscription_status: string;
    effective_state: string; allowed: boolean; trial_ends_at: string | null;
    current_period_start: string | null; current_period_end: string | null;
    plan_code: string | null; plan_name: string | null; client_limit: number | null;
    is_founder: boolean; founder_number: number | null; locked_price_inr: number | null;
    trial_days_left: number | null; period_days_left: number | null;
  };
  payments: SubPayment[]; invoices: SubInvoice[]; events: SubEvent[];
};
export type SubscriptionStatus = {
  subscription_status: string | null; state: string; allowed: boolean; reason: string | null;
  trial_ends_at?: string | null; current_period_start?: string | null; current_period_end?: string | null;
  trial_days_left?: number | null; period_days_left?: number | null; renewal_due?: boolean;
  plan?: { code: string; name: string; duration_months: number; price_inr: number } | null;
  /** Seat usage. Counts ACTIVE clients only — archiving frees a slot. */
  client_limit?: number | null; client_count?: number;
  client_remaining?: number | null; at_client_limit?: boolean;
  /** A downgrade queued for the end of the current period; null when none. */
  pending_change?: {
    plan_code: string; plan_name: string;
    client_limit: number | null; effective_at: string;
  } | null;
  is_founder?: boolean; founder_number?: number | null; locked_price_inr?: number | null;
};

/**
 * Result of previewing a coupon. `reason` is a ready-to-display rejection
 * message when `valid` is false.
 */
export type CouponValidation = {
  valid: boolean;
  reason: string | null;
  coupon?: {
    id: string; code: string; description: string | null;
    discount_type: 'percent' | 'fixed'; discount_value: number;
  };
  discount_inr?: number;
  net_amount_inr?: number;
  gross_amount_inr: number;
};

/** A coupon as managed by the platform operator. */
export type Coupon = {
  id: string; code: string; description: string | null;
  discount_type: 'percent' | 'fixed'; discount_value: number;
  max_discount_inr: number | null; min_amount_inr: number | null;
  applies_to_plans: string[] | null;
  max_redemptions: number | null; max_per_org: number;
  valid_from: string | null; valid_until: string | null;
  is_active: boolean; created_by_name: string | null; created_at: string;
  /** Derived from the redemption ledger, never a stored counter. */
  times_redeemed: number; total_discount_inr: number;
};

/** Priced preview of a plan change, before anything is charged or scheduled. */
export type PlanChangeQuote = {
  direction: 'upgrade' | 'downgrade' | 'renewal' | 'activation';
  /** Upgrades apply now; downgrades wait for the period to end. */
  immediate: boolean;
  current_plan: { code: string; name: string; client_limit: number | null } | null;
  new_plan: { code: string; name: string; client_limit: number | null; duration_months: number };
  new_plan_price_inr: number;
  /** Unused value of the current period, credited against an upgrade. */
  proration_credit_inr: number;
  amount_due_inr: number;
  is_launch_price: boolean;
  founder_locked: boolean;
  effective_at: string | null;
  active_clients: number;
  new_client_limit: number | null;
  /** How many active clients exceed the target plan's limit (0 when fine). */
  over_limit_by: number;
  warning: string | null;
};

// ── AI types ────────────────────────────────────────────────────────────────

export type AiConversation = {
  id: string;
  title: string | null;
  client_id: string | null;
  pinned?: boolean;
  last_message?: string | null;
  message_count?: number;
  created_at: string;
  updated_at: string;
};

export type AiMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  provider?: string;
  created_at: string;
};

export type AiUsageStats = {
  requests_this_hour: string;
  requests_today: string;
  tokens_today: string;
  requests_30d: string;
  tokens_30d: string;
  fallback_count_30d: string;
};

export type AiModelStat = {
  model: string;
  provider: string;
  intent_type: string;
  requests: string;
  tokens_total: string;
  requests_today: string;
  avg_latency_ms: number;
  fallback_count: string;
};

export type AiHealthResponse = {
  configured: boolean;
  overall?: string;
  models: {
    primary:   { model: string; status: string; latency_ms?: number; error?: string };
    secondary: { model: string; status: string; latency_ms?: number; error?: string };
    fallback:  { model: string; status: string; latency_ms?: number; error?: string };
  };
};

export type AiProviderSettings = {
  provider: string;
  configured: boolean;
  base_url: string;
  models: { primary: string; secondary: string; fallback: string };
};

export type AiKnowledgeDocument = {
  id: string;
  title: string;
  category: 'sop' | 'guide' | 'policy';
  filename: string;
  mime_type: string;
  file_size_bytes: number;
  status: 'processing' | 'ready' | 'failed';
  error_message?: string | null;
  chunk_count: number;
  uploaded_by_name?: string | null;
  created_at: string;
};

export type AiWorkoutParams = {
  age: number;
  gender: string;
  weight_kg: number;
  height_cm: number;
  goal: string;
  experience_level: string;
  injuries?: string;
  equipment?: string;
  training_days?: number;
  duration_weeks?: number;
  client_id?: string;
};

export type AiWorkoutExercise = {
  name: string;
  sets: number;
  reps: string;
  tempo: string;
  rest_seconds: number;
  notes?: string;
};

export type AiWorkoutDay = {
  name: string;
  focus: string;
  exercises: AiWorkoutExercise[];
};

export type AiWorkoutPlan = {
  name: string;
  description: string;
  goal: string;
  level: string;
  weeks: number;
  days_per_week: number;
  equipment: string[];
  warm_up: string;
  cool_down: string;
  progression_notes: string;
  weekly_schedule: Record<string, AiWorkoutDay>;
  nutrition_notes: string;
};

export type AiDietParams = {
  age: number;
  gender: string;
  weight_kg: number;
  height_cm: number;
  activity_level: string;
  goal: string;
  dietary_preferences?: string;
  allergies?: string;
  budget?: string;
  meal_frequency?: number;
  client_id?: string;
};

export type AiDietFood = {
  name: string;
  quantity: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type AiDietMeal = {
  name: string;
  time: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  foods: AiDietFood[];
};

export type AiDietPlan = {
  name: string;
  description: string;
  goal: string;
  total_calories: number;
  macros: { protein_g: number; carbs_g: number; fat_g: number };
  meal_frequency: number;
  meals: AiDietMeal[];
  grocery_list: { category: string; items: string[] }[];
  supplements: { name: string; dose: string; timing: string; reason: string }[];
  hydration_ml: number;
  notes: string;
};

export type AiProgressRisk = {
  risk: string;
  severity: 'low' | 'medium' | 'high';
  action: string;
};

export type AiProgressRec = {
  priority: number;
  action: string;
  rationale: string;
};

export type AiProgressAnalysis = {
  summary: string;
  period_analysed: string;
  wins: string[];
  weight_trend: { direction: string; change_kg: number; insight: string };
  strength_trend: { direction: string; insight: string; highlight: string };
  attendance_trend: { rate_pct: number; insight: string };
  risks: AiProgressRisk[];
  recommendations: AiProgressRec[];
  next_month_strategy: string;
  motivation_message: string;
};

export type AiFitnessTestRisk = {
  flag: string;
  severity: 'low' | 'medium' | 'high';
  action: string;
};

export type AiFitnessTestRec = {
  priority: number;
  focus_area: string;
  action: string;
  rationale: string;
};

export type AiFitnessTestAnalysis = {
  summary: string;
  overall_assessment: string;
  strengths: string[];
  areas_to_improve: string[];
  risk_flags: AiFitnessTestRisk[];
  recommendations: AiFitnessTestRec[];
  suggested_next_test_focus: string;
  motivation_message: string;
};

export type AiBusinessInsights = {
  summary: string;
  period: string;
  kpis: { mrr: number; retention_rate_pct: number; avg_session_utilisation_pct: number; revenue_per_trainer: number };
  trends: { metric: string; direction: string; change_pct: number; insight: string }[];
  opportunities: { opportunity: string; estimated_impact: string; effort: string }[];
  risks: { risk: string; severity: string; recommended_action: string }[];
  recommendations: { priority: number; action: string; rationale: string; timeframe: string }[];
  executive_summary: string;
};
