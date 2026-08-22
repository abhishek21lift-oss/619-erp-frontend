// Every type the API surface uses.
//
// Kept as one module rather than split by domain: they cross-reference heavily
// (a WorkoutAssignmentDetail extends WorkoutAssignment, PtClient appears in
// half a dozen envelopes), and 213 interfaces split across ten files would
// trade one long file for a web of circular imports. Length is not the problem
// here — the endpoint list was.
//
// Re-exported wholesale from index.ts, so '@/lib/api' still resolves every
// type the 142 consumer files import from it.

import type { Role } from '../roles';

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
  pt_client_id?: string;
  is_active?: boolean;
  organization_id?: string | null;
  organization_name?: string | null;
  organization_logo_url?: string | null;
  /**
   * Founder's Club. Carried on the session rather than fetched, because the
   * badge appears in six places and these two columns change roughly once,
   * ever. `founder_number` is 1–20 and permanent; see FounderBadge.tsx.
   */
  is_founder?: boolean;
  founder_number?: number | null;
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
  /** "Head Coach" — what they do, as opposed to `role`, which is what the software lets them click. */
  jobTitle: string;
  /** 'YYYY-MM-DD' or null. */
  experienceSince: string | null;
  /** Derived from experienceSince by the server, never stored. */
  yearsExperience: number | null;
  specialisations: string[];
  certifications: Certification[];
  credentialSummary: CredentialSummary;

  // ── Professional profile (migration 133) ──────────────────────────────────
  coverUrl: string | null;
  designation: string;
  philosophy: string;
  trainingStyle: string;
  currentGym: string;
  languages: string[];
  coachingModes: CoachingMode[];
  previousGyms: ProfileGym[];
  education: ProfileEducation[];
  achievements: ProfileAchievement[];
  workingHours: WorkingHours;
  /** Derived server-side, so no two screens can add up a week differently. */
  weeklyMinutes: number;
  /**
   * How many portfolio items exist — the count only, because the gallery has
   * its own endpoint and putting thirty items inside every profile read to
   * render one tab badge would be a poor trade.
   */
  portfolioCount: number;
  /**
   * Percentage AND checklist from one server call over one weight table, so
   * the ring and the next-step list can never disagree. The client computes
   * none of this — it describes SAVED data, so it must change when the server
   * accepts a write, not while somebody is typing.
   */
  completion: ProfileCompletion;
}

export interface CompletionItem {
  key: string;
  label: string;
  weight: number;
  /** Which tab the field lives on, so a step can link to itself. */
  tab: ProfileTab;
  done: boolean;
}

/** The tabs a completion step can send someone to. Security and Preferences
 *  hold nothing that is scored, so they are deliberately not in this union. */
export type ProfileTab = 'overview' | 'credentials' | 'portfolio';

export type PortfolioKind = 'image' | 'before_after' | 'video_link';

/**
 * One gallery item, exactly as `present()` returns it (src/lib/portfolio.js).
 * The storage key is never in this shape — it is what authorisation is keyed
 * on server-side, and the served URL is all a browser needs.
 */
export interface PortfolioItem {
  id: string;
  kind: PortfolioKind;
  title: string;
  caption: string;
  /** The image. For a video_link this is the poster. */
  url: string;
  /** The "after" image, before/after only. */
  afterUrl: string | null;
  /** The YouTube or Vimeo link, video_link only. */
  externalUrl: string | null;
  /** Both assets summed, already a number. */
  bytes: number;
  pinned: boolean;
  sortOrder: number;
  createdAt: string;
}

/** Server-enforced; mirrored here only so the UI can say no before uploading. */
export const PORTFOLIO_LIMITS = {
  items: 30,
  pinned: 3,
  imageBytes: 8 * 1024 * 1024,
  posterBytes: 4 * 1024 * 1024,
} as const;

export interface ProfileCompletion {
  percent: number;
  earned: number;
  total: number;
  items: CompletionItem[];
  /** The heaviest outstanding items, capped at three. */
  nextSteps: Omit<CompletionItem, 'done'>[];
}

export type CoachingMode = 'online' | 'offline' | 'hybrid' | 'home' | 'video';

export type AchievementKind =
  | 'competition' | 'certification' | 'award' | 'record'
  | 'media' | 'speaking' | 'publication' | 'other';

/** A past workplace. `to: null` means still there. Months, not dates. */
export interface ProfileGym {
  id: string;
  name: string;
  role: string;
  /** 'YYYY-MM' or null. */
  from: string | null;
  to: string | null;
}

export interface ProfileEducation {
  id: string;
  institution: string;
  degree: string;
  field: string;
  year: number | null;
}

export interface ProfileAchievement {
  id: string;
  title: string;
  kind: AchievementKind;
  issuer: string;
  year: number | null;
  detail: string;
}

export type TimeRange = { from: string; to: string };

/**
 * Availability, keyed by day. A day holds a LIST of ranges because split
 * shifts are the norm in this trade — 06:00–10:00 and 17:00–21:00 is one
 * coach's ordinary Tuesday.
 */
export type WorkingHours = Partial<Record<
  'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun', TimeRange[]
>>;

/**
 * A professional certificate. `status` and `daysLeft` are computed server-side
 * on every read — a device with a skewed clock, or simply left open overnight,
 * would show a lapsed certificate as current, and whether someone is qualified
 * to take a session today is not a question to answer against that.
 */
export interface Certification {
  id: string;
  name: string;
  issuer: string;
  /** 'YYYY-MM-DD' or null. */
  issued_on: string | null;
  expires_on: string | null;
  credential_id: string;
  /** 'unknown' means no expiry was recorded — deliberately NOT the same as valid. */
  status: 'expired' | 'expiring' | 'valid' | 'unknown';
  daysLeft: number | null;
}

export interface CredentialSummary {
  total: number;
  expired: number;
  expiring: number;
  unknown: number;
}

/** The fields `updateProfile` may send. Anything omitted is left untouched. */
export interface ProfileUpdate {
  name: string;
  email: string;
  phone?: string;
  location?: string;
  bio?: string;
  job_title?: string;
  experience_since?: string | null;
  specialisations?: string[];
  certifications?: Array<Omit<Certification, 'status' | 'daysLeft'>>;
  designation?: string;
  philosophy?: string;
  training_style?: string;
  current_gym?: string;
  languages?: string[];
  coaching_modes?: CoachingMode[];
  previous_gyms?: ProfileGym[];
  education?: ProfileEducation[];
  achievements?: ProfileAchievement[];
  working_hours?: WorkingHours;
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
  photo_url?: string | null;
  balance_amount?: number;
  pt_end_date?: string;
  status?: string;
  trainer_name?: string;
};

/** Shape of GET /api/reports/dues/summary — aggregates over ALL debtors. */
export type DuesSummary = {
  total_outstanding: number;
  debtor_count: number;
  high_risk_count: number;
  medium_risk_count: number;
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
  /** Column is `parq_form_id`; the route returns the row with SELECT *. */
  parq_form_id?: string;
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
  /** Column is `parq_form_id`; the route returns the row with SELECT *. */
  parq_form_id?: string;
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
  /** Column is `parq_form_id`; the route returns the row with SELECT *. */
  parq_form_id?: string;
  doc_type: ParqDocumentType;
  file_url: string;
  file_name?: string;
  /** Column is `created_at`; there is no `uploaded_at`. */
  created_at?: string;
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

/** Distance unit for a logged cardio actual — stored with the value, never converted on read. */
export type WorkoutDistanceUnit = 'm' | 'km' | 'mile';
/** Speed unit for a logged cardio actual. */
export type WorkoutSpeedUnit = 'kmh' | 'mph';

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
  /** Cardio actuals — all NULL for strength sets (mirrors cardio_performances). */
  duration_seconds?: number | null;
  distance?: number | null;
  distance_unit?: WorkoutDistanceUnit | null;
  average_speed?: number | null;
  speed_unit?: WorkoutSpeedUnit | null;
  calories_burned?: number | null;
  average_heart_rate?: number | null;
  cadence?: number | null;
  steps_completed?: number | null;
  floors_completed?: number | null;
  rounds_completed?: number | null;
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
  /** Which fields this exercise can be logged AS. NULL for ad-hoc rows whose
   *  library exercise went away — the logger falls back to strength fields. */
  exercise_type?: string | null;
  prescription_mode_primary?: string | null;
  prescription_mode_allowed?: string[] | null;
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
  /** Every set laid out, done or not — the denominator for completion. */
  planned_sets: number;
  /** null when nothing was planned: a freestyle session is not 0% complete. */
  completion_pct: number | null;
  /** Sets that beat a previous best. Counted per SET, not per exercise. */
  prs: number;
}

/** One client on a trainer's roster for a given day. */
export interface TodayClient {
  /** Null for a client on today's list who has no programme assigned. */
  assignment_id: string | null;
  client_id: string;
  client_name: string;
  client_photo: string | null;
  plan_id: string | null;
  plan_name: string | null;
  progress_pct: number | null;
  planned_exercises: number;
  /**
   * Wall-clock 'HH:MM', or null when nobody has said when.
   *
   * A booked slot carries a real appointment time and an enrolment carries the
   * hour the client usually arrives; a programme names a weekday and never an
   * hour. The roster is ordered by this server-side.
   */
  start_time: string | null;
  /** Why this client is on today's list — the server's answer, not a guess. */
  source: 'booked' | 'programme' | 'enrolled';
  /** The programme prescribes nothing for this weekday — an answer, not a gap.
   *  Only ever true for a `programme` row: a booked client with no plan also
   *  has zero planned exercises and is emphatically not resting. */
  is_rest_day: boolean;
  session_id: string | null;
  session_status: WorkoutSessionStatus | null;
}

export interface TodayRoster {
  date: string;
  day_of_week: string;
  clients: TodayClient[];
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

// ── Training analytics ─────────────────────────────────────────────
//
// Everything below is MEASURED from the log or is a range the studio stored.
// Nothing here is modelled or scored: there is no fatigue index and no
// recovery percentage, because neither has a measurement behind it. Recovery
// is `days_since`, which is a fact.

export interface AdherenceWeek {
  week_start: string;
  planned: number;
  /** Capped at `planned` — a bonus session cannot fill another week's hole. */
  completed: number;
  /** Sessions beyond the weekly target. Reported, but never counted as adherence. */
  extra: number;
}

export interface WorkoutAdherence {
  planned: number;
  completed: number;
  /** null when there is no active programme — nothing to be adherent to. */
  pct: number | null;
  weeks: AdherenceWeek[];
}

/** Weekly sets for one muscle, against the studio's range for it. */
export interface MuscleWeek {
  target_muscle: string;
  sets: number;
  last_trained: string | null;
  /** Days since this muscle was last worked. Not a recovery score. */
  days_since: number | null;
  mev_sets: number | null;
  mrv_sets: number | null;
  /** null when the studio has set no range — not a default "fine". */
  status: 'below' | 'within' | 'above' | null;
}

export interface WorkoutPr {
  session_date: string;
  exercise_name: string;
  weight_kg: number | null;
  reps: number | null;
  /** One set can break several records at once; that is still one moment. */
  kinds: Array<'weight' | 'reps' | 'volume'>;
}

export interface WorkoutThisWeek {
  week_start: string | null;
  /** Prescribed days that have passed with nothing logged. */
  missed: number[];
  /** Prescribed days still ahead — deliberately not counted as missed. */
  remaining: number[];
}

export interface TrainingAnalytics {
  as_of: string;
  weeks: number;
  plan: { id: string; name: string; duration_weeks: number } | null;
  adherence: WorkoutAdherence;
  this_week: WorkoutThisWeek | null;
  prs: WorkoutPr[];
  muscles: MuscleWeek[];
  /** Sets whose exercise has no muscle recorded. Shown, never silently dropped. */
  unattributed_sets: number;
}

export interface MuscleLandmark {
  target_muscle: string;
  mev_sets: number | null;
  mrv_sets: number | null;
  /** true when this studio has replaced the shared default. */
  is_custom: boolean;
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

  // The prescription for the week the client is actually in, already resolved
  // by the server. Week 1's numbers plus the plan's rule, or a hand-written
  // override for this week — the trainer on the floor is handed the answer,
  // not the inputs.
  target_weight?: number | null;
  tempo?: string | null;
  rpe?: number | null;
  warmup_sets?: number | null;
  superset_group?: string | null;
  config?: Record<string, unknown> | null;
  /** Which week these numbers describe. */
  week_number?: number;
}

export interface WorkoutPlanned {
  plan_name: string;
  exercises: WorkoutPlannedExercise[];
  /** Which week of the programme this session falls in, from its start date. */
  week?: number;
  duration_weeks?: number;
  progression_type?: ProgressionType;
  /**
   * 'derived' = week 1 plus the rule; 'override' = the trainer wrote this week
   * by hand. Worth surfacing: a derived number is a suggestion the rule
   * produced, a written one is an instruction.
   */
  source?: 'derived' | 'override';
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

/**
 * A row from a studio's own business-write audit trail (GET
 * /api/pt-os/activity-log) — client/payment/commission writes made by the
 * studio's own staff. Unlike the platform Audit Centre's AuditEntry, this is
 * always scoped to one organization, so there is no organization_id/name to
 * carry.
 */
export interface ActivityLogEntry {
  id: string | number;
  user_id: string | null;
  user_name: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  old_data?: unknown;
  new_data?: unknown;
  created_at: string;
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

// ── Exercise Library ───────────────────────────────────────────────
// One shape for an exercise, everywhere. The fields below the divider are
// served by /api/exercises; the legacy /api/workouts/exercises reader returns
// only the ones above it, which is why they are optional rather than split
// across two interfaces that would drift.

export type ExerciseDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type ExerciseVisibility = 'public' | 'organization' | 'private';
export type MuscleRole = 'primary' | 'secondary';

export interface ExerciseMuscleLink {
  slug: string;
  name: string;
  body_region: string;
  role: MuscleRole;
}

export interface ExerciseRelation {
  id: string;
  name: string;
  slug: string;
  difficulty: string;
  relation_type: 'progression' | 'regression' | 'alternative';
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
  /**
   * Retained in the database but never rendered — the library is deliberately
   * media-free. Present here only so legacy readers type-check.
   */
  gif_url: string | null;
  exercise_type: string | null;
  force: string | null;
  mechanic: string | null;
  sets_default: number | null;
  reps_default: number | null;
  rest_seconds: number | null;
  source_id: string | null;

  // ── served by /api/exercises ────────────────────────────────────
  slug?: string;
  primary_muscle?: string | null;
  primary_muscle_slug?: string | null;
  body_region?: string | null;
  equipment_name?: string | null;
  equipment_slug?: string | null;
  category_name?: string | null;
  category_slug?: string | null;
  movement_pattern?: string | null;
  plane_of_motion?: string | null;

  coaching_cues?: string[];
  common_mistakes?: string[];
  safety_tips?: string[];
  contraindications?: string[];
  breathing_tips?: string | null;
  tempo_recommendation?: string | null;
  progression_notes?: string | null;
  recommended_reps?: string | null;
  recommended_sets?: string | null;
  beginner_notes?: string | null;
  advanced_notes?: string | null;
  trainer_notes?: string | null;

  tags?: string[];
  search_keywords?: string | null;
  visibility?: ExerciseVisibility;
  is_custom?: boolean;
  archived_at?: string | null;
  deleted_at?: string | null;
  version?: number;
  prescription_mode_primary?: string | null;
  prescription_mode_allowed?: string[];

  primary_muscle_id?: string | null;
  equipment_id?: string | null;
  category_id?: string | null;
  organization_id?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;

  is_favorite?: boolean;
  can_edit?: boolean;
  use_count?: number;
  used_at?: string;

  /** Detail endpoint only. */
  muscles?: ExerciseMuscleLink[];
  progressions?: ExerciseRelation[];
  regressions?: ExerciseRelation[];
  alternatives?: ExerciseRelation[];
}

export interface ExerciseFacet {
  /** Present on lookup-backed facets (muscles, equipment, categories). */
  id?: string;
  slug: string;
  name: string;
  count?: number;
  body_region?: string;
  is_gym_only?: boolean;
}

export interface ExerciseMeta {
  muscles: ExerciseFacet[];
  muscles_by_region: Record<string, ExerciseFacet[]>;
  equipment: ExerciseFacet[];
  categories: ExerciseFacet[];
  difficulties: ExerciseFacet[];
  movement_patterns: ExerciseFacet[];
  mechanics: ExerciseFacet[];
  forces: ExerciseFacet[];
  total: number;
  custom_total: number;
  /**
   * Complete lookups for the editor's dropdowns. The facet lists above only
   * contain values some exercise already uses, which is right for filtering
   * and wrong for authoring.
   */
  all_muscles: ExerciseFacet[];
  all_equipment: ExerciseFacet[];
  all_categories: ExerciseFacet[];
}

export interface ExerciseListResult {
  exercises: LibraryExercise[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface ExerciseVersion {
  id: string;
  version: number;
  snapshot: Record<string, unknown>;
  change_summary: string | null;
  created_at: string;
  changed_by_name: string | null;
}

// ── Workout Plans (templates) ──────────────────────────────────────
export interface WorkoutPlanExercise {
  id: string;
  exercise_id: string | null;
  /** 1 for the authored week; higher only for a hand-written override. */
  week_number?: number;
  name: string;
  muscle_group?: string | null;
  sets: number;
  reps: number;
  rest_seconds: number;
  day_of_week: number;
  sort_order: number;
  notes?: string | null;

  // ── Programming parameters (migration 136) ──────────────────────────────
  // All optional: rows written before the migration have NULL in every one of
  // them, and a plan authored through the older whole-plan PUT still may.
  /** Prescribed load. Unit is a studio display preference, not stored here. */
  target_weight?: number | null;
  /** Four-figure tempo, e.g. "3-1-2-0". "X" means explosive. */
  tempo?: string | null;
  /** Target intensity — RPE 6-10 or RIR 0-5, whichever scale the studio uses. */
  rpe?: number | null;
  /** Count of warm-up sets before the working sets. */
  warmup_sets?: number | null;
  /** Exercises sharing a value are performed together: superset, giant set, circuit. */
  superset_group?: string | null;
  /**
   * Per-method parameters that would otherwise each need a column: drop sets,
   * AMRAP/EMOM caps, timed sets, pause reps, voice notes. Deliberately loose —
   * the point is that a new set type ships without a migration.
   */
  config?: Record<string, unknown> | null;

  // Demo media, joined from the exercise library so a card can show it without
  // a second request.
  video_url?: string | null;
  gif_url?: string | null;
}

/** Fields the builder may write on a planned exercise. */
export type WorkoutExerciseInput = Partial<
  Pick<WorkoutPlanExercise,
    'exercise_id' | 'day_of_week' | 'sort_order' | 'sets' | 'reps' | 'rest_seconds' |
    'notes' | 'target_weight' | 'tempo' | 'rpe' | 'warmup_sets' | 'superset_group' | 'config'>
>;

/** How a programme's numbers move from one week to the next. */
export type ProgressionType = 'none' | 'weight' | 'reps' | 'rpe';

/** Where the rule lands for one exercise: week 1 versus the final week. */
export interface ProgressionPreview {
  id: string;
  first: { week: number; target_weight: number | null; reps: number | null; rpe: number | null };
  last: { week: number; target_weight: number | null; reps: number | null; rpe: number | null };
}

/** One archived state of a plan. Read-only history, never assignable. */
export interface WorkoutPlanVersion {
  id: string;
  version: number;
  created_at: string;
  created_by_name?: string | null;
  duration_weeks: number;
  progression_type: ProgressionType;
  progression_amount: number | null;
  progression_every_weeks: number;
  exercise_count: number;
}

/** One client's enrolment on a plan, as the plans list returns it. */
export interface WorkoutPlanAssignment {
  client_id: string;
  client_name: string;
  /** That client's own progress through the plan, 0-100. */
  progress_pct: number;
  /** ISO date the client started, used to work out which week they are in. */
  start_date: string | null;
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
  /**
   * How far along the plan is, 0-100.
   *
   * Scoped to one client (`?client_id=`), this is that client's own figure.
   * Studio-wide it is the mean across `assignments` — it used to be the
   * literal 0 the SQL emitted when no client was named, which is why every
   * card on the plans screen read "0% complete".
   */
  progress: number;
  /**
   * The clients actually running this plan.
   *
   * Filtered server-side to the caller's studio, and for a trainer to their
   * own clients — so `length` is "assigned clients you can see", not a
   * studio-wide count. Empty for a plan nobody has been assigned.
   */
  assignments: WorkoutPlanAssignment[];
  exercises: WorkoutPlanExercise[];

  // ── Weeks and progression (migration 137) ───────────────────────────────
  /** 'none' repeats the week unchanged — the behaviour before weeks existed. */
  progression_type?: ProgressionType;
  progression_amount?: number | null;
  progression_every_weeks?: number;
  /** Which week the returned exercises describe. 1 unless ?week= was passed. */
  week?: number;
  /** 'base' = the stored week 1, 'derived' = an earlier week + rule, 'override' = this week was edited. */
  week_source?: 'base' | 'derived' | 'override';
  /**
   * The week these numbers are built from — week 1, or the latest earlier week
   * the trainer edited. Equal to `week` when this week is itself an edit.
   */
  anchor_week?: number;
  /** Weeks that have been edited, so the builder can mark them. Never includes 1. */
  override_weeks?: number[];
  /** null when there is no rule to preview. */
  progression_preview?: ProgressionPreview[] | null;
  version?: number;
  parent_plan_id?: string | null;
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

/**
 * A row in the platform user directory (GET /api/platform/users).
 *
 * Wider than OrgUser because the directory answers questions a per-studio user
 * list never had to: which studio is this, does the account still exist, does it
 * hold platform access, and is anybody signed in as it right now.
 *
 * `has_platform_grant` is the live platform_owners grant, NOT `role ===
 * 'super_admin'`. The two can disagree — a role with no grant cannot reach the
 * console — and the directory reports the one that decides access.
 */
export type PlatformUser = OrgUser & {
  deleted_at: string | null;
  organization_name: string | null;
  organization_status: string | null;
  has_platform_grant: boolean;
  mfa_enabled: boolean;
  active_sessions: number;
};

/** Header counts for the directory (GET /api/platform/users/summary). */
export type PlatformUserSummary = {
  total: number; active: number; inactive: number; deleted: number;
  owners: number; trainers: number; members: number; platform: number;
  never_signed_in: number; dormant_90d: number;
};

/** Filters the directory accepts. Every one is optional and they compose. */
export type PlatformUserQuery = {
  q?: string;
  /** A studio role, or 'platform' for the operators. */
  role?: string;
  status?: 'active' | 'inactive' | 'deleted';
  /** Organization id — the only way to scope the directory to one studio. */
  org?: string;
  limit?: number;
  offset?: number;
};

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

// ── Command Center ────────────────────────────────────────────────────────────
/** How a card is graded. `unavailable` is a gap in observability, not an
 *  outage — a probe that cannot run (no Docker socket, no REDIS_URL) rather
 *  than one that ran and found trouble. It deliberately ranks BELOW `warning`
 *  so an un-wired dependency does not paint the console amber forever. */
export type CommandCenterStatus =
  | 'healthy' | 'warning' | 'critical' | 'unavailable' | 'timeout';

/** One card. Every collector returns this shape, including on failure, so the
 *  client never has to special-case a missing card. */
export interface CommandCenterCard {
  name: string;
  status: CommandCenterStatus;
  /** Collector-specific payload. Typed per card at the render site. */
  data: unknown;
  latency_ms: number | null;
  /** Why the card is not green, in words an operator can act on. */
  reason: string | null;
  checked_at: string;
  /** Served from the per-collector TTL cache rather than freshly probed. */
  cached?: boolean;
}

export interface CommandCenterSnapshot {
  status: CommandCenterStatus;
  collected_at: string;
  duration_ms: number;
  cards: Record<string, CommandCenterCard>;
}

/** A single-use ticket for the realtime stream (Phase 3).
 *
 *  The socket cannot present the session cookie: it addresses the API host
 *  directly, because the Next.js rewrite that carries ordinary /api/* calls
 *  does not forward an Upgrade, and the cookie belongs to the app host. The
 *  ticket is minted over the authenticated HTTPS channel and spent once, within
 *  `expires_in_ms`. `path` comes from the server so the two cannot drift; the
 *  origin is the client's, from `wsBase()`. */
export interface CommandCenterStreamTicket {
  ticket: string;
  expires_in_ms: number;
  path: string;
  tick_ms: number;
}

/** One entry in the server's allow-list of operational commands.
 *
 *  The UI must not keep its own idea of which commands exist, which are
 *  destructive, or which queues are valid — all three come from here, so the
 *  gate the client renders and the gate the server enforces cannot drift. */
export interface CommandCenterCommand {
  name: string;
  label: string;
  description: string;
  /** What running it does, in plain words. Shown in the confirmation prompt. */
  blast_radius: string;
  /** Requires a typed confirmation equal to `name`. */
  destructive: boolean;
  accepts_queue: boolean;
  /** The valid queue names, or null when the command takes no queue. */
  queues: string[] | null;
  /** Non-null means the command cannot run on this deployment, and why. */
  unavailable_reason: string | null;
  cooldown_ms: number;
}

export interface CommandCenterRunResult {
  command: string;
  queue: string | null;
  outcome: 'ok' | 'error';
  duration_ms: number;
  /** Command-specific payload. Rendered as formatted JSON, not parsed. */
  output: unknown;
}

/** What a `dryRun` returns instead of running anything. */
export interface CommandCenterDryRun {
  dry_run: true;
  command: string;
  queue: string | null;
  would_run: string;
  blast_radius: string;
}

// ── Alert Center ──────────────────────────────────────────────────────────────

/** Note the absence of `unavailable`: a probe that could not run is a gap in
 *  observability, not an outage, and never opens an alert. */
export type SystemAlertSeverity = 'warning' | 'timeout' | 'critical';
export type SystemAlertStatus = 'open' | 'acknowledged' | 'resolved';

/** One PROBLEM with a lifetime — not one observation. The same condition seen a
 *  thousand times is this single row with `occurrences` climbing. */
export interface SystemAlert {
  id: string;
  /** Identity of the condition; the collector name. */
  fingerprint: string;
  source: string;
  severity: SystemAlertSeverity;
  title: string;
  /** The collector's own sentence, refreshed on each observation. */
  reason: string | null;
  status: SystemAlertStatus;
  occurrences: number;
  first_seen_at: string;
  last_seen_at: string;
  acknowledged_at: string | null;
  acknowledged_by_name: string | null;
  resolved_at: string | null;
  /** `auto` when the condition cleared itself, `manual` when a human closed it. */
  resolution: 'auto' | 'manual' | null;
  notified_at: string | null;
  /** The card as it stood when the alert opened. Typed at the render site. */
  snapshot: unknown;
  created_at: string;
}

export interface SystemAlertStats {
  open: number;
  acknowledged: number;
  critical: number;
  resolved_24h: number;
}

export interface SystemAlertList {
  alerts: SystemAlert[];
  stats: SystemAlertStats;
}

// ── AI Guardian ───────────────────────────────────────────────────────────────

/** One evidence line. `detail` is the readable sentence; `key` identifies the
 *  signal so the UI can be stable across wording changes. */
export interface GuardianEvidence {
  key: string;
  detail: string;
}

export interface GuardianFinding {
  id: string;
  title: string;
  severity: 'critical' | 'warning' | 'info';
  /** The deterministic diagnosis. This — not any AI narration — is the product. */
  conclusion: string;
  /** 0..1, capped below certainty. A summary of `evidence`, which is shown too. */
  confidence: number;
  evidence: {
    /** Signals that had to fire for the finding to exist at all. */
    triggers: GuardianEvidence[];
    /** Corroborating signals that fired. */
    supporting: GuardianEvidence[];
    /** Checked, and not true. */
    absent: GuardianEvidence[];
    /** Could NOT be checked — a different claim from `absent`, and the reason
     *  the confidence is lower than it would otherwise be. */
    unchecked: GuardianEvidence[];
  };
  /** Command Center command names. Advisory: the Guardian never runs anything. */
  recommend: string[];
  /** Written next step when no command can help. */
  advice: string | null;
  /** True when One Click Recovery applies to this finding. */
  recovery: boolean;
  sources: string[];
}

export interface GuardianReport {
  findings: GuardianFinding[];
  checked_at: string;
  rules_evaluated: number;
  /** Set when there are no findings, so "ran and matched nothing" is
   *  distinguishable from "did not run". */
  note: string | null;
}

// ── Live Logs (D4) ────────────────────────────────────────────────────────────

export type LogLevelName = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/** One line from the in-memory ring. `level` is pino's number: 50 error, 60 fatal. */
export interface LogLine {
  time: number;
  level: number;
  msg: string;
  /** Everything pino carried besides time/level/msg. Typed at the render site. */
  context: unknown;
}

export interface LogRingStats {
  held: number;
  capacity: number;
  total_recorded: number;
  /** Lines the capture layer had to discard — a real fault, unlike ring overwrite. */
  dropped: number;
  oldest_at: string | null;
  counts: Record<LogLevelName, number>;
}

export interface LogCaptureStats {
  /** Which process this ring belongs to. */
  source: 'api' | 'worker';
  pending: number;
  pending_capacity: number;
  dropped_pending: number;
  persist_from_level: number;
  persist_enabled: boolean;
}

export interface LogTail {
  lines: LogLine[];
  stats: LogRingStats;
  capture: LogCaptureStats;
  /** Says out loud that the ring covers one process only. */
  scope_note: string;
}

/** A persisted line. Unlike the ring, this covers the worker container too. */
export interface PersistedLogLine {
  id: number;
  level: number;
  level_label: LogLevelName;
  logged_at: string;
  msg: string;
  source: 'api' | 'worker';
  pid: number | null;
  hostname: string | null;
  context: unknown;
}

/**
 * Paging for the two platform audit feeds.
 *
 * `total` is exact up to a ceiling and then stops counting. Both feeds read
 * tables with no retention sweep — `activity_log` and `login_events` grow for
 * as long as the platform is used — and an unfiltered count over either was a
 * full scan plus joins with no upper bound. Past the ceiling the honest answer
 * is "more than this", which `total_capped` says.
 */
export interface AuditPaging {
  limit: number;
  offset: number;
  total: number;
  /** True when `total` is the ceiling rather than a count. */
  total_capped?: boolean;
}

export interface LogHistory {
  lines: PersistedLogLine[];
  /**
   * Null when the request asked to skip it (`stats=0`), which the poll tick
   * does. The lines change every few seconds; this strip does not, and
   * recomputing it per tick was most of the cost of leaving the tab open.
   */
  stats: LogHistoryStats | null;
  /** Cursor for the next (older) page; null when the last page was short. */
  next_before: string | null;
}

export interface LogHistoryStats {
  /**
   * Counts within `window_hours`, not over the whole table.
   *
   * The unwindowed COUNT(*) this replaced was a sequential scan of the largest
   * table on the box, and it ran beside every page of a list that was already
   * capped — so the endpoint looked paginated while half of it was not.
   */
  in_window: number;
  from_worker: number;
  fatal: number;
  window_hours: number;
  /** Oldest row in the whole table, which a windowed count cannot report. */
  oldest: string | null;
  /** Days of history the retention sweep keeps, so `oldest` has a context. */
  retention_days: number;
}

export interface GuardianNarration {
  finding_id: string;
  /** Null when the model was unavailable — the finding still stands without it. */
  narration: string | null;
  model?: string | null;
  used_fallback?: boolean | null;
  /** Present so the UI can label machine-written text as such. */
  generated?: boolean;
  unavailable_reason?: string;
}

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

// ── Platform Analytics ────────────────────────────────────────────────────────
// Product usage across every studio. Distinct from SubscriptionMetrics, which
// answers the money questions — nothing is repeated between the two.
export type AnalyticsTrendPoint = {
  label: string; month: string;
  active_studios: number; sessions: number;
  clients_added: number; check_ins: number; studios_joined: number;
};

export type AnalyticsAdoption = {
  key: string; studios: number;
  /** Share of live studios, already rounded to 1dp server-side. */
  pct: number;
};

export type AnalyticsCohort = {
  label: string; joined: string; size: number;
  /** months-since-signup → studios still doing real work that month. */
  retention: Record<string, number>;
};

export type AnalyticsAtRisk = {
  id: string; name: string; slug: string;
  plan_code: string | null; subscription_status: string;
  current_period_end: string | null;
  last_login: string | null; last_session: string | null;
  active_clients: number;
};

export type AnalyticsLeader = {
  id: string; name: string; slug: string;
  sessions_30d: number; active_clients: number; check_ins_30d: number;
};

export type PlatformAnalytics = {
  months: number;
  studios: { total: number; live: number };
  trend: AnalyticsTrendPoint[];
  adoption: AnalyticsAdoption[];
  cohorts: AnalyticsCohort[];
  at_risk: AnalyticsAtRisk[];
  leaderboard: AnalyticsLeader[];
};

// ── Notification Centre ───────────────────────────────────────────────────────
export type AnnouncementSeverity = 'info' | 'success' | 'warning' | 'critical';
export type AnnouncementStatus = 'draft' | 'scheduled' | 'sent' | 'cancelled';
export type AnnouncementAudience = 'all' | 'plan' | 'status' | 'studios';

export type Announcement = {
  id: string; title: string; body: string;
  severity: AnnouncementSeverity;
  link: string | null;
  audience: AnnouncementAudience;
  audience_plans: string[] | null;
  audience_statuses: string[] | null;
  audience_org_ids: string[] | null;
  audience_roles: string[];
  status: AnnouncementStatus;
  scheduled_for: string | null;
  sent_at: string | null;
  /** Snapshotted at send — never recomputed, so history cannot drift. */
  recipient_count: number | null;
  studio_count: number | null;
  created_by_name: string | null;
  sent_by_name: string | null;
  created_at: string;
  /** Live counts from the delivered copies; present on the list endpoint. */
  delivered?: number;
  read_count?: number;
};

/** What a send would reach, computed by the same resolver the send uses. */
export type AnnouncementPreview = {
  recipient_count: number;
  studio_count: number;
  sample: { name: string; role: string; organization_name: string }[];
};

export type AnnouncementInput = {
  title: string; body: string;
  severity?: AnnouncementSeverity;
  link?: string | null;
  audience?: AnnouncementAudience;
  audience_plans?: string[];
  audience_statuses?: string[];
  audience_org_ids?: string[];
  audience_roles?: string[];
};

// ── Security Centre ───────────────────────────────────────────────────────────
export type LoginOutcome =
  | 'success' | 'bad_password' | 'unknown_user' | 'inactive' | 'mfa_required' | 'mfa_failed';
export type LoginMethod = 'password' | 'google' | 'passkey' | 'refresh';

export type LoginEvent = {
  id: string | number;
  user_id: string | null; user_name: string | null; user_role: string | null;
  email_attempted: string | null;
  organization_id: string | null; organization_name: string | null;
  outcome: LoginOutcome; method: LoginMethod;
  ip_address: string | null; user_agent: string | null;
  created_at: string;
};

export type SecurityOverview = {
  checked_at: string;
  logins_24h: {
    success_24h: number; failed_24h: number; failing_ips_24h: number;
    targeted_accounts_24h: number;
    /** A wrong second factor against a correct password — the loudest signal. */
    mfa_failed_24h: number;
  };
  operators: {
    total: number; without_mfa: number;
    accounts: { id: string; name: string; email: string; last_login: string | null; mfa_enabled: boolean }[];
  };
  active_sessions: number;
  impersonations_7d: number;
};

export type SecurityThreats = {
  window_hours: number;
  min_failures: number;
  /** Many failures at ONE account — someone guessing a specific password. */
  by_account: {
    email_attempted: string; failures: number; distinct_ips: number;
    last_attempt: string;
    /** Whether the run ENDED in a success: a breach, not a repelled attempt. */
    succeeded_after: boolean;
  }[];
  /** Many failures from ONE address across MANY accounts — credential stuffing. */
  by_ip: {
    ip_address: string; failures: number; accounts_targeted: number; last_attempt: string;
  }[];
};

export type ActiveSession = {
  user_id: string; name: string; email: string; role: string; last_login: string | null;
  organization_id: string | null; organization_name: string | null;
  sessions: number; oldest_session: string; newest_session: string;
};

export type LoginEventQuery = {
  outcome?: string; method?: string; org_id?: string; user_id?: string;
  ip?: string; failed?: string; from?: string; to?: string; q?: string;
  limit?: number; offset?: number;
};

// ── AI Control Centre ─────────────────────────────────────────────────────────
export type AiOverview = {
  window_days: number;
  requests: number; tokens: number; tokens_prompt: number; tokens_completion: number;
  studios: number; users: number; avg_latency_ms: number;
  fallbacks: number; fallback_pct: number;
  cost_inr: number;
  /** Non-empty means cost_inr is a FLOOR, not a total — say so in the UI. */
  unpriced_models: string[];
  enforcement_enabled: boolean;
  default_monthly_tokens: number | null;
};

export type AiStudioUsage = {
  organization_id: string; organization_name: string; plan_code: string | null;
  requests: number; tokens: number; cost_inr: number;
  tokens_this_month: number; last_used_at: string | null;
  /** null = unlimited. `limit_source` says whether that was chosen or inherited. */
  limit: number | null;
  limit_source: 'studio' | 'default' | 'none';
  used_pct: number | null;
  over: boolean;
};

export type AiModelUsage = {
  model: string | null; provider: string | null;
  requests: number; tokens: number; cost_inr: number;
  avg_latency_ms: number; fallbacks: number;
  /** false → this model's tokens contribute no cost. */
  priced: boolean;
};

export type AiTrendPoint = { day: string; requests: number; tokens: number; cost_inr: number };

export type AiModelRate = {
  model: string; provider: string | null;
  prompt_per_1k_inr: string; completion_per_1k_inr: string;
  updated_at: string; updated_by: string | null;
};

type AiTierMap = { primary: string | null; secondary: string | null; fallback: string | null };

export type AiRouting = {
  /** What an operator explicitly set. null on a tier = following the environment. */
  override: AiTierMap;
  /** What a request would actually route to right now. */
  effective: { primary: string; secondary: string; fallback: string };
  from_env: AiTierMap;
  defaults: { primary: string; secondary: string; fallback: string };
  updated_by_name: string | null;
  updated_at: string | null;
};

export type AiSettings = {
  enforcement_enabled: boolean;
  default_monthly_tokens: number | string | null;
  warn_at_pct: number;
  rates: AiModelRate[];
};

// ── Storage ───────────────────────────────────────────────────────────────────

export type StorageCategory = { category: string; bytes: number; objects: number };

export type StorageOverview = {
  window_days: number;
  /** Live bytes — soft-deleted objects are excluded and reported separately. */
  bytes: number; objects: number;
  deleted_bytes: number; deleted_objects: number;
  /** Written by a path with no studio in scope. Shown, never hidden. */
  unattributed_bytes: number;
  studios: number;
  bytes_added: number; objects_added: number;
  by_category: StorageCategory[];
  /**
   * When accounting began. Everything above is measured from here, NOT from
   * the first byte ever stored — the UI must label the totals partial.
   * null means even that is unknown.
   */
  measuring_since: string | null;
};

export type StorageStudio = {
  organization_id: string; organization_name: string; plan_code: string | null;
  bytes: number; objects: number; deleted_bytes: number;
  categories: number; last_upload_at: string | null;
};

export type StorageTrendPoint = { day: string; bytes: number; objects: number };

export type StorageObject = {
  key: string; category: string; bytes: number;
  content_type: string | null; created_at: string;
  /** null when the write had no studio in scope. */
  organization_name: string | null;
};

// ── Support ───────────────────────────────────────────────────────────────────
export type TicketStatus = 'open' | 'pending' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TicketCategory = 'general' | 'billing' | 'technical' | 'feature_request' | 'bug' | 'account';

/** The studio's view. `is_internal` is absent by construction, not merely false. */
export type TicketMessage = {
  id: string; ticket_id: string;
  author_side: 'studio' | 'platform';
  author_name: string | null; body: string; created_at: string;
  /** Present only on the platform view. */
  is_internal?: boolean;
};

export type SupportTicket = {
  id: string; subject: string;
  category: TicketCategory; priority: TicketPriority; status: TicketStatus;
  created_by_name: string | null;
  created_at: string; updated_at: string; resolved_at: string | null;
  message_count?: number;
  messages?: TicketMessage[];
  /** Platform view only. */
  organization_id?: string; organization_name?: string; plan_code?: string | null;
  assigned_to?: string | null; assigned_to_name?: string | null;
  first_response_at?: string | null;
  last_studio_message_at?: string | null;
};

export type SupportOverview = {
  open: number; pending: number; resolved: number; closed: number;
  unassigned: number; urgent_live: number;
  /** Never answered at all and still waiting — the worst state to be in. */
  awaiting_first_reply: number;
  median_first_response_hours: number | null;
  median_resolution_hours: number | null;
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
// ── Admin invitations ─────────────────────────────────────────────────────────
export type InvitationStatus = 'pending' | 'sent' | 'opened' | 'activated' | 'expired' | 'cancelled';

export type Invitation = {
  id: string;
  organization_id: string;
  user_id: string;
  email: string;
  owner_name: string | null;
  studio_name: string | null;
  /** Derived server-side — `expired` is a function of the clock, not a stored value. */
  status: InvitationStatus;
  expires_at: string;
  sent_at: string | null;
  opened_at: string | null;
  activated_at: string | null;
  cancelled_at: string | null;
  send_attempts: number;
  /** Why delivery failed, when it did. Null otherwise. */
  last_error: string | null;
  created_by_name: string | null;
  created_at: string;
};

export type InvitationEvent = { at: string; label: string; by: string | null; meta: string | null };

export type InvitationDetail = {
  invitation: Invitation;
  events: InvitationEvent[];
  audit: { action: string; user_name: string | null; ip_address: string | null; user_agent: string | null; created_at: string }[];
  created_user_agent: string | null;
  activated_user_agent: string | null;
};

/** What the set-password page may know before anyone has authenticated. */
export type InvitationPreview = {
  studio_name: string;
  owner_name: string | null;
  /** Masked — this endpoint must not become an email-disclosure oracle. */
  email_masked: string;
  expires_at: string;
};

/** What the public client-activation page may know before anyone logs in. */
export type ClientActivationPreview = {
  studio_name: string;
  /** First name only. Enough to confirm "this is me", nothing more. */
  client_name: string;
  /** Masked — this endpoint must not become an email-disclosure oracle. */
  email_masked: string;
  expires_at: string;
};

/** The state of one client's login, as the trainer's card renders it. */
export type ClientLoginStatus = {
  client_id: string;
  login_activated: boolean;
  login_enabled: boolean;
  login_email: string | null;
  email_verified_at: string | null;
  last_login_at: string | null;
  locked_until: string | null;
  activation_sent_at: string | null;
  /** Decided server-side. The button must not re-derive this rule. */
  can_activate: boolean;
  blocked_reason: string | null;
  blocked_message: string | null;
  invitation: {
    id: string;
    status: string;
    expires_at: string | null;
    sent_at: string | null;
    activated_at: string | null;
    send_attempts: number;
    last_error: string | null;
    invited_by_name: string | null;
    created_at: string;
  } | null;
};

/** The member's own record, as /api/me/profile returns it. */
export type MeProfile = {
  id: string;
  member_code: string | null;
  name: string;
  email: string | null;
  mobile: string | null;
  gender: string | null;
  dob: string | null;
  photo_url: string | null;
  address: string | null;
  package_type: string | null;
  goal: string | null;
  height: number | null;
  weight: number | null;
  joining_date: string | null;
  pt_start_date: string | null;
  pt_end_date: string | null;
  duration_months: number | null;
  status: string | null;
  trainer_name: string | null;
  trainer_photo: string | null;
  trainer_specialization: string | null;
  studio_name: string | null;
  studio_logo: string | null;
};

export type MeMembership = {
  id: string;
  package_type: string | null;
  base_amount: number | string;
  discount: number | string;
  final_amount: number | string;
  paid_amount: number | string;
  balance_amount: number | string;
  monthly_pt_amount: number | string;
  pt_start_date: string | null;
  pt_end_date: string | null;
  duration_months: number | null;
  status: string | null;
};

export type MePayment = {
  id: string;
  amount: number | string;
  date: string;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
};

export type MeAttendance = {
  id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  method: string | null;
  status: string | null;
};

export type MeMeasurement = { weight_kg: number | string; measured_at: string };

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
  /**
   * Cancellations, counted from activity_log where they are actually written.
   *
   * cancelled_30d/90d are FLOWS; currently_cancelled is a STOCK that only ever
   * rises. They are named apart because presenting the stock as churn is the
   * usual way this metric gets faked.
   *
   * rate_30d_pct is null, never 0, when nobody is paying — a platform with no
   * paying studios has no churn rate, and 0% would read as "nobody is leaving".
   */
  churn: {
    cancelled_30d: number; cancelled_90d: number;
    currently_cancelled: number; rate_30d_pct: number | null;
  };
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

// ── Training brief ──────────────────────────────────────────────────
//
// Everything needed to write a client a programme, assembled from the six
// assessments that already exist. Every section carries `present` and its own
// `as_of` on purpose: a brief that hides its gaps gets designed against as
// though it were complete, and a capacity score from March is not the same
// claim as one from last week.

export interface BriefSectionBase { present: boolean; as_of?: string | null }

export interface BriefReadiness extends BriefSectionBase {
  risk_level?: string | null;
  risk_message?: string | null;
  gate_status?: string | null;
  flagged_answers?: number | null;
  current_health?: string[];
  past_history?: string[];
  blood_group?: string | null;
  notes?: string | null;
}

export interface BriefBody extends BriefSectionBase {
  height_cm?: number | null; weight_kg?: number | null; bmi?: number | null;
  body_fat_pct?: number | null; lean_mass_kg?: number | null;
  waist_cm?: number | null; waist_hip_ratio?: number | null;
  resting_hr?: number | null; bp?: string | null; bp_category?: string | null;
}

export interface BriefScore { score: number | null; category: string | null; vo2_max?: number | null }

export interface BriefCapacity extends BriefSectionBase {
  overall?: number | null;
  strength?: BriefScore; cardio?: BriefScore; endurance?: BriefScore; flexibility?: BriefScore;
}

/** One joint that came back painful or restricted — never a healthy one. */
export interface MobilityFinding {
  region: string;
  /** Different remedies: restricted means regress the movement, pain means remove it. */
  pain: boolean;
  restriction: boolean;
  score: number | null;
}

export interface BriefLimitations extends BriefSectionBase {
  posture?: { as_of: string | null; risk_level: string | null; issues: string[]; notes: string | null } | null;
  mobility?: { as_of: string | null; category: string | null; score: number | null; findings: MobilityFinding[]; notes: string | null } | null;
  injuries?: string | null;
  has_asymmetry?: boolean | null;
}

export interface BriefLifestyle extends BriefSectionBase {
  experience_level?: string | null; years_training?: number | null;
  sleep_hours?: number | null; sleep_quality?: string | null;
  stress_level?: string | null; occupation_type?: string | null;
  activity_level?: string | null; daily_steps?: string | null;
  energy_level?: string | null; recovery_quality?: string | null;
  recovery_risk?: string | null; lifestyle_score?: number | null; notes?: string | null;
}

export interface BriefGoal extends BriefSectionBase {
  goal_type?: string | null; priority?: string | null; description?: string | null;
  target_weight?: number | null; target_body_fat?: number | null; target_date?: string | null;
  commitment_level?: string | null; motivation_level?: string | null;
  challenges?: string[]; estimated_weeks?: number | null;
}

export interface BriefHistory extends BriefSectionBase {
  plan_id?: string; plan_name?: string; started_on?: string | null;
  duration_weeks?: number | null; days_per_week?: number | null; progress_pct?: number | null;
  sessions_last_4_weeks?: number; completed_last_4_weeks?: number;
}

export interface TrainingBrief {
  client: { id: string | null; name: string | null; gender: string | null; age: number | null; goal: string | null; notes: string | null };
  sections: {
    readiness: BriefReadiness; body: BriefBody; capacity: BriefCapacity;
    limitations: BriefLimitations; lifestyle: BriefLifestyle;
    goal: BriefGoal; history: BriefHistory;
  };
  /** Section keys with no data. Named, not omitted. */
  missing: string[];
  completeness_pct: number;
}

/* ── Client snapshot ──────────────────────────────────────────────────────
   What the profile tells a trainer instead of making them remember it.
   Every field is derived from a reading that exists; an absent measurement
   produces an absent card, never a plausible-looking zero. */

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface ClientAlert {
  id: string;
  severity: AlertSeverity;
  label: string;
  detail: string | null;
  href: string | null;
}

export interface ClientGoalProgress {
  present: boolean;
  goal_type?: string | null;
  target_date?: string | null;
  target_kg?: number | null;
  current_kg?: number | null;
  start_kg?: number | null;
  delta_kg?: number | null;
  remaining_kg?: number | null;
  /** Null when no starting weight was ever recorded — there is no denominator. */
  pct?: number | null;
}

export interface ClientPr {
  exercise: string;
  weight_kg: number;
  reps: number | null;
  achieved_on: string | null;
}

export interface CoachInsight {
  id: string;
  tone: 'good' | 'warn';
  text: string;
  /** The reading this came from. A prompt you cannot trace is one you cannot overrule. */
  because: string;
}

export interface ClientSnapshot {
  alerts: ClientAlert[];
  /** Readiness from weekly check-ins; absent until at least one is recorded. */
  recovery?: ClientRecovery;
  goal: ClientGoalProgress;
  prs: ClientPr[];
  coach: CoachInsight[];
  /** False only before onboarding — nothing measured and no goal set. */
  baseline_done: boolean;
}

/** What the AI coach endpoint returns. `source` says who wrote the lines. */
export interface CoachGeneration {
  insights: CoachInsight[];
  /** 'ai' when a model wrote them; 'derived' when the rule-based ones stood in. */
  source: 'ai' | 'derived';
  model: string | null;
  /** Hash of the readings the answer was written from. */
  facts_key: string;
}

/** One readiness component, 0-100, or null when that question was not answered. */
export interface RecoveryComponents {
  sleep: number | null;
  stress: number | null;
  energy: number | null;
  soreness: number | null;
}

export interface RecoveryWeek { week: string; score: number }

/**
 * Readiness from weekly check-ins.
 *
 * `inputs` of `max_inputs` is deliberately part of the payload: 3 of 4 is a
 * different claim from 4 of 4, and the UI must be able to say which.
 */
export interface ClientRecovery {
  present: boolean;
  score?: number | null;
  band?: 'good' | 'fair' | 'low' | 'poor' | null;
  inputs?: number;
  max_inputs?: number;
  components?: RecoveryComponents;
  as_of?: string | null;
  /** Null until three scored weeks exist — two points is a line through noise. */
  trend?: 'improving' | 'steady' | 'declining' | null;
  weeks: RecoveryWeek[];
}

/* ── AI executable actions ──────────────────────────────────────────────
 * The assistant proposes; the operator confirms; the server executes. These
 * three types are the three steps.
 */

export interface AiActionSummary {
  id: string;
  title: string;
  /** True when running this sends something to real clients. The confirm
   *  screen keys its warning off this, so it must not be optimistic. */
  outward: boolean;
}

export interface AiActionPlan {
  plan_id: string;
  action_id: string;
  title: string;
  description: string;
  outward: boolean;
  /** How many people will actually be messaged. */
  count: number;
  preview: Array<{ name: string; detail: string }>;
  sample_message: string | null;
  /** Shown BEFORE confirming — an unconfigured channel belongs here, not in
   *  the results afterwards. */
  warnings: string[];
  truncated: boolean;
  expires_at: string;
}

export interface AiActionResult {
  /** Counts by delivery status. `sent` is the only one that means a message
   *  left the building; `not_configured` and `failed` are reported as
   *  themselves. */
  tally: Record<string, number>;
  sent: number;
  total: number;
  warnings: string[];
  results: Array<{ id: string; name: string; status: string; error: string | null }>;
}
