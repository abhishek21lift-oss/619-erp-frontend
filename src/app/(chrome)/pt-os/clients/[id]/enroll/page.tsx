'use client';

import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { m, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Calendar, Award,
  Check, Sparkles, AlertCircle, Loader2, X, Download, FileSignature,
} from 'lucide-react';
import Guard from '@/components/Guard';
import { Button, PageContainer, PageHero } from '@/components/ui';
import FloatInput from '@/components/ui/FloatInput';
import SearchableSelect from '@/components/pt-os/SearchableSelect';
import { AGREEMENT_TEXT, PAYMENT_METHODS, ageFrom } from '@/lib/enrollment';
import { SignaturePad } from '@/components/pt-os/shared/SignaturePad';
import { api } from '@/lib/api';
import { ApiError, apiBase } from '@/lib/http';
import { useToast } from '@/lib/toast';
import { useAuth } from '@/lib/auth-context';
import { useAutoSaveDraft } from '@/hooks/useAutoSaveDraft';

/* ─────────────────────────────────────────────────────── TYPES */
interface EnrollFormData {
  startDate: string;
  duration: string; // '1'..'12'
  trainerId: string;
  trainerName: string;
  trainingMode: 'Offline' | 'Online' | 'Hybrid' | '';
  workoutExperienceLevel: string;
  previousTrainerExperience: boolean;
  workoutTime: string;
  trainingDays: string[];
  sessionsPerWeek: string; // '1'..'7'
  // Payment Details — mirrors the existing pt_clients.final_amount /
  // paid_amount columns already used across the rest of the app (add-client,
  // renew, payments, dues, commissions). Kept as strings like every other
  // field here; parsed with Number() at the validation/computation/submit
  // boundaries, never stored as a parsed number in form state.
  finalAmount: string;
  amountPaid: string;
  /** How the enrolling payment was taken. One of PAYMENT_METHODS. */
  paymentMethod: string;
}

/** What the header needs to make the page about a person rather than a form. */
interface ClientMeta {
  name: string;
  photoUrl: string | null;
  dob: string | null;
  weight: number | null;
  goal: string | null;
  memberSince: string | null;
}

interface FormErrors {
  startDate?: string; duration?: string; trainingMode?: string;
  workoutTime?: string; trainingDays?: string; sessionsPerWeek?: string;
  finalAmount?: string; amountPaid?: string; paymentMethod?: string;
}

/* ─────────────────────────────────────────────────────── CONSTANTS */
const DURATIONS = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `${i + 1} Month${i > 0 ? 's' : ''}` }));

const TRAINING_MODES = [
  { value: 'Offline', label: 'Offline', icon: '🏢' },
  { value: 'Online', label: 'Online', icon: '💻' },
  { value: 'Hybrid', label: 'Hybrid', icon: '🔄' },
];

// Same value set as pt_lifestyle_assessments.workout_experience_level.
const WORKOUT_EXPERIENCE_OPTIONS = [
  { value: 'beginner', label: 'Beginner', icon: '🚫' },
  { value: 'intermediate', label: 'Intermediate', icon: '🏋️' },
  { value: 'advanced', label: 'Advanced', icon: '🔥' },
  { value: 'athlete', label: 'Athlete', icon: '🏆' },
];

const DAYS = [
  { key: 'Mon', letter: 'M', full: 'Monday' },
  { key: 'Tue', letter: 'T', full: 'Tuesday' },
  { key: 'Wed', letter: 'W', full: 'Wednesday' },
  { key: 'Thu', letter: 'T', full: 'Thursday' },
  { key: 'Fri', letter: 'F', full: 'Friday' },
  { key: 'Sat', letter: 'S', full: 'Saturday' },
  { key: 'Sun', letter: 'S', full: 'Sunday' },
];

const SESSIONS_OPTIONS = Array.from({ length: 7 }, (_, i) => ({ value: String(i + 1), label: `${i + 1} Session${i > 0 ? 's' : ''}` }));



const EASE = [0.16, 1, 0.3, 1] as const;

/* ─────────────────────────────────────────────────────── HELPERS */
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}
function addMonths(dateStr: string, months: number): string {
  if (!dateStr || !months) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  d.setMonth(d.getMonth() + Number(months));
  return d.toISOString().slice(0, 10);
}
function fmtDateLong(d: string): string {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
}
function daysBetween(a: string, b: string): number {
  const d1 = new Date(a), d2 = new Date(b);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
  return Math.round((d2.getTime() - d1.getTime()) / 86400000);
}
function fmtINR(n: number): string {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}
/** A native `<input type="time">` only ever displays a 24-hour "HH:MM"
 *  value — a client enrolled before this field became one converts its
 *  preferred_workout_time from the old picker's "5:00 AM" label format so
 *  the time still shows up here instead of appearing blank. */
function to24Hour(v: string): string {
  if (!v) return '';
  if (/^\d{2}:\d{2}$/.test(v)) return v;
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(v.trim());
  if (!m) return '';
  let h = parseInt(m[1], 10) % 12;
  if (m[3].toUpperCase() === 'PM') h += 12;
  return `${String(h).padStart(2, '0')}:${m[2]}`;
}
/** Balance Due = Final Selling Price − Amount Paid, never negative. Mirrors
 *  the backend's GREATEST(final_amount - paid_amount, 0) exactly — this is
 *  a live UX preview only, the backend independently recomputes and owns
 *  the source of truth on every save. */
function calcBalanceDue(finalAmount: string, amountPaid: string): number {
  const final = parseFloat(finalAmount);
  const paid = parseFloat(amountPaid);
  if (!Number.isFinite(final)) return 0;
  return Math.max(final - (Number.isFinite(paid) ? paid : 0), 0);
}

/* ─────────────────────────────────────────────────────── VALIDATION */
function validateStartDate(v: string): string | undefined {
  return v ? undefined : 'Start date is required.';
}
function validateDuration(v: string): string | undefined {
  return v ? undefined : 'Please select a duration.';
}
function validateTrainingMode(v: string): string | undefined {
  return v ? undefined : 'Please select a training mode.';
}
function validateWorkoutTime(form: EnrollFormData): string | undefined {
  return form.workoutTime ? undefined : 'Please select a workout time.';
}
function validateTrainingDays(v: string[]): string | undefined {
  return v.length >= 1 ? undefined : 'Select at least 1 training day.';
}
function validateSessionsPerWeek(v: string): string | undefined {
  if (!v) return 'Please select sessions per week.';
  const n = Number(v);
  if (n < 1 || n > 7) return 'Sessions must be between 1 and 7.';
  return undefined;
}
function validateFinalAmount(v: string): string | undefined {
  if (!v.trim()) return 'Final Selling Price is required.';
  const n = Number(v);
  if (!Number.isFinite(n)) return 'Enter a valid amount.';
  if (n <= 0) return 'Final Selling Price must be greater than zero.';
  return undefined;
}
function validateAmountPaid(form: EnrollFormData): string | undefined {
  if (!form.amountPaid.trim()) return 'Amount Paid is required.';
  const paid = Number(form.amountPaid);
  if (!Number.isFinite(paid)) return 'Enter a valid amount.';
  if (paid < 0) return 'Amount Paid cannot be negative.';
  const final = Number(form.finalAmount);
  if (Number.isFinite(final) && paid > final) return 'Amount Paid cannot exceed Final Selling Price.';
  return undefined;
}
// Payment fields are admin/manager-only, same boundary the backend already
// enforces (PATCH /clients/:id silently ignores final_amount/paid_amount
// for the trainer role) — a trainer completing enrollment on a client whose
// price isn't finalized yet shouldn't be blocked by fields they can't edit.
function validateAll(form: EnrollFormData, canEditPayment: boolean): FormErrors {
  return {
    startDate: validateStartDate(form.startDate),
    duration: validateDuration(form.duration),
    trainingMode: validateTrainingMode(form.trainingMode),
    workoutTime: validateWorkoutTime(form),
    trainingDays: validateTrainingDays(form.trainingDays),
    sessionsPerWeek: validateSessionsPerWeek(form.sessionsPerWeek),
    finalAmount: canEditPayment ? validateFinalAmount(form.finalAmount) : undefined,
    amountPaid: canEditPayment ? validateAmountPaid(form) : undefined,
  };
}
function hasErrors(errors: FormErrors): boolean {
  return Object.values(errors).some(Boolean);
}

function initForm(): EnrollFormData {
  return {
    startDate: todayStr(), duration: '',
    trainerId: '', trainerName: '', trainingMode: '', workoutExperienceLevel: '',
    previousTrainerExperience: false, workoutTime: '',
    trainingDays: [], sessionsPerWeek: '',
    finalAmount: '', amountPaid: '', paymentMethod: '',
  };
}


/* ─────────────────────────────────────────────────────── PAGE EXPORT */
export default function PTEnrollmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <Guard><EnrollForm clientId={id} /></Guard>;
}

/* ─────────────────────────────────────────────────────── MAIN FORM */
function EnrollForm({ clientId }: { clientId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  const [clientName, setClientName] = useState('');
  const [clientMeta, setClientMeta] = useState<ClientMeta | null>(null);
  // The agreement gate, and what comes after it.
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [agreementChecked, setAgreementChecked] = useState(false);
  const [signature, setSignature] = useState('');
  const [enrolled, setEnrolled] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState<EnrollFormData>(initForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  // Persistent (not auto-dismissing) save-failure banner. A toast alone was
  // reported as "click Finish, nothing happens" — whatever the underlying
  // cause, a transient toast is too easy to miss entirely on a fast failure.
  // This stays on screen with the raw error text until the user dismisses
  // it or a save succeeds.
  const [submitError, setSubmitError] = useState<string | null>(null);
  const initFormRef = useRef<EnrollFormData>(initForm());

  // Scroll-to-error targets: a validation failure that only shows a toast +
  // an inline error message is easy to miss when the offending field is
  // scrolled off-screen (e.g. the user is down at the sticky Finish button).
  // handleSubmit scrolls the first invalid field into view on block.
  const fieldRefs = useRef<Partial<Record<keyof FormErrors, HTMLDivElement | null>>>({});
  const bindFieldRef = (key: keyof FormErrors) => (el: HTMLDivElement | null) => {
    fieldRefs.current[key] = el;
  };

  const draftKey = `pt-os.enroll.${clientId}.draft.v1`;
  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initFormRef.current), [form]);
  const { restore, clear, saveNow } = useAutoSaveDraft({ key: draftKey, data: form, isDirty });

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const clientRes = await api.pt.client(clientId) as { data?: Record<string, unknown> };
      const c = clientRes?.data;
      if (!c) { setLoadError('Client not found.'); setLoading(false); return; }
      setClientName(String(c.name ?? ''));
      setClientMeta({
        name: String(c.name ?? ''),
        photoUrl: c.photo_url ? String(c.photo_url) : null,
        dob: c.dob ? String(c.dob) : null,
        weight: Number(c.weight) > 0 ? Number(c.weight) : null,
        goal: c.goal ? String(c.goal) : null,
        // joining_date is the studio's own record of when they signed up;
        // created_at is when the row happened to be typed in. Prefer the
        // first and fall back to the second.
        memberSince: (c.joining_date ?? c.created_at) ? String(c.joining_date ?? c.created_at) : null,
      });

      const days = typeof c.preferred_training_days === 'string' && c.preferred_training_days
        ? c.preferred_training_days.split(',').map((d) => d.trim()).filter(Boolean)
        : [];

      const loaded: EnrollFormData = {
        startDate: String(c.pt_start_date ?? '').slice(0, 10) || todayStr(),
        duration: c.duration_months ? String(c.duration_months) : '',
        trainerId: String(c.trainer_id ?? ''),
        trainerName: String(c.trainer_name ?? ''),
        trainingMode: (String(c.training_mode ?? '') as EnrollFormData['trainingMode']) || '',
        workoutExperienceLevel: String(c.workout_experience_level ?? ''),
        previousTrainerExperience: Boolean(c.previous_trainer_experience),
        workoutTime: to24Hour(String(c.preferred_workout_time ?? '')),
        trainingDays: days,
        sessionsPerWeek: c.sessions_per_week ? String(c.sessions_per_week) : '',
        // pt_clients.final_amount / paid_amount default to 0 (NOT NULL) in the
        // database, so a freshly created client would otherwise pre-fill these
        // money fields with "0" before any real price has been entered.
        // Treat 0 as "not set yet" here so the fields start blank. Note the
        // numeric coercion: Postgres returns numeric columns as strings, so a
        // zero comes back as "0.00" — which is truthy and would slip through a
        // plain `c.final_amount ?` check.
        finalAmount: Number(c.final_amount) > 0 ? String(c.final_amount) : '',
        amountPaid: Number(c.paid_amount) > 0 ? String(c.paid_amount) : '',
        paymentMethod: String(c.payment_method ?? ''),
      };

      const draft = restore();
      const finalForm = draft ? { ...loaded, ...draft } : loaded;
      setForm(finalForm);
      initFormRef.current = loaded;
      if (draft) toast.info('Restored your unsaved draft.');
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load client.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const set = useCallback(<K extends keyof EnrollFormData>(key: K, val: EnrollFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  }, []);

  const endDate = useMemo(
    () => addMonths(form.startDate, Number(form.duration)),
    [form.startDate, form.duration],
  );
  /** The header chips. Built as a list so a client missing a date of birth or
   *  a goal gets a shorter row rather than a row of em-dashes. */
  const heroFacts = useMemo(() => {
    const out: { label: string; value: string }[] = [];
    if (!clientMeta) return out;
    if (clientMeta.memberSince) {
      const y = new Date(clientMeta.memberSince).getUTCFullYear();
      if (Number.isFinite(y)) out.push({ label: 'Member since', value: String(y) });
    }
    const age = ageFrom(clientMeta.dob);
    if (age != null) out.push({ label: 'Age', value: String(age) });
    if (clientMeta.weight != null) out.push({ label: 'Weight', value: `${clientMeta.weight} kg` });
    if (clientMeta.goal) out.push({ label: 'Goal', value: clientMeta.goal });
    return out;
  }, [clientMeta]);

  const balanceDue = useMemo(
    () => calcBalanceDue(form.finalAmount, form.amountPaid),
    [form.finalAmount, form.amountPaid],
  );
  const isPaidInFull = Boolean(form.finalAmount) && Number(form.finalAmount) > 0 && balanceDue === 0;
  const totalWeeks = form.duration ? Number(form.duration) * 4 : 0;
  const estimatedSessions = totalWeeks && form.sessionsPerWeek ? totalWeeks * Number(form.sessionsPerWeek) : 0;
  const daysRemaining = endDate ? daysBetween(todayStr(), endDate) : null;
  const startsToday = form.startDate === todayStr();
  const endingSoon = daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 7;

  const toggleDay = (key: string) => {
    setForm((prev) => ({
      ...prev,
      trainingDays: prev.trainingDays.includes(key)
        ? prev.trainingDays.filter((d) => d !== key)
        : [...prev.trainingDays, key],
    }));
    setErrors((e) => ({ ...e, trainingDays: undefined }));
  };

  const handleBack = () => {
    if (isDirty && !window.confirm('Discard unsaved changes?')) return;
    router.push(`/pt-os/clients/${clientId}`);
  };

  const handleSaveDraft = () => {
    const ok = saveNow();
    toast[ok ? 'success' : 'error'](ok ? 'Draft saved.' : 'Could not save draft — storage unavailable.');
  };

  // The backend (Render free tier) spins down after ~15 min idle and can take
  // 30-60s to wake on the next request; the production API path also goes
  // through Next.js's rewrite proxy (next.config.js), which has its own
  // timeout shorter than that cold-start window. A save attempt that lands
  // during a cold start fails with a 5xx/timeout or a raw network error —
  // easy to mistake for "nothing happening" since it's otherwise identical
  // to a fast failure. Retry once automatically with an explanatory message
  // before surfacing a real error, so the (very likely) second attempt —
  // which lands on an already-warm backend — just works.
  const savePayload = () => api.pt.updateClient(clientId, {
    // A client stays 'pending' ("Not Enrolled") from creation until
    // something actually enrolls them — this save IS that enrollment, so it
    // must promote status itself. PATCH /clients/:id only touches status
    // when the caller explicitly sends it; omitting it here silently left
    // every fully-paid, fully-scheduled enrollment stuck showing "Not
    // Enrolled" forever.
    status: 'active',
    pt_start_date: form.startDate,
    pt_end_date: endDate,
    duration_months: Number(form.duration),
    trainer_id: form.trainerId || undefined,
    trainer_name: form.trainerName || undefined,
    training_mode: form.trainingMode,
    workout_experience_level: form.workoutExperienceLevel || undefined,
    previous_trainer_experience: form.previousTrainerExperience,
    preferred_workout_time: form.workoutTime,
    preferred_training_days: form.trainingDays.join(', '),
    sessions_per_week: Number(form.sessionsPerWeek),
    // Payment fields are admin/manager-only (matches the backend's RBAC
    // boundary on PATCH /clients/:id, which silently ignores these for
    // the trainer role) - only send them when they were actually
    // editable, so a read-only display value never overwrites data.
    ...(isAdmin ? {
      final_amount: Number(form.finalAmount),
      paid_amount: Number(form.amountPaid),
      // Empty means "not recorded". Sending '' would fail the server's enum
      // check and take the whole enrolment down with it.
      ...(form.paymentMethod ? { payment_method: form.paymentMethod } : {}),
    } : {}),
    // The agreement travels with the enrolment rather than in a second
    // request: a signature saved separately can succeed while the enrolment
    // it belongs to fails, and then the client has agreed to nothing.
    ...(signature ? {
      agreement_accepted_at: new Date().toISOString(),
      agreement_signature: signature,
      agreement_text: AGREEMENT_TEXT,
    } : {}),
  });

  const attemptSave = async (isRetry: boolean) => {
    try {
      await savePayload();
      clear();
      setSubmitError(null);
      setSaving(false);
      // Deliberately does NOT navigate. The form is downloadable only once it
      // has been saved, and pushing straight to the profile would take that
      // away half a second after earning it.
      setEnrolled(true);
      toast.success('Client enrolled in PT.');
    } catch (err: unknown) {
      // No HTTP response at all (err isn't an ApiError) or a 5xx — both are
      // consistent with a proxy timeout / backend cold start. A 4xx is a
      // real validation/logic error from the server — never retried.
      const isTransient = !(err instanceof ApiError) || err.isServer;
      console.error('[enroll] save failed', err);
      const detail = err instanceof ApiError
        ? `HTTP ${err.status}${err.code ? ` · ${err.code}` : ''} — ${err.message}`
        : err instanceof Error
        ? `${err.name}: ${err.message}`
        : String(err);

      if (isTransient && !isRetry) {
        toast.info('Save failed — retrying once…', { duration: 6000 });
        setTimeout(() => { attemptSave(true); }, 3000);
        return; // keep the button in its saving state through the retry
      }
      setSubmitError(detail);
      setSaving(false);
    }
  };

  const handleSubmit = () => {
    const allErrors = validateAll(form, isAdmin);
    setErrors(allErrors);
    if (hasErrors(allErrors)) {
      // Order matches on-screen top-to-bottom position so the first hit is
      // the first invalid field the user would actually see when scrolled up.
      const order: (keyof FormErrors)[] = [
        'startDate', 'duration', 'finalAmount', 'amountPaid',
        'trainingMode', 'workoutTime', 'trainingDays', 'sessionsPerWeek',
      ];
      const firstKey = order.find((k) => allErrors[k]);
      toast.error((firstKey && allErrors[firstKey]) || 'Please fix the highlighted fields.');
      if (firstKey) fieldRefs.current[firstKey]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    // Everything is valid — now the agreement. It opens here rather than
    // being a step earlier in the form because a client should sign the
    // finished terms, not a draft of them.
    setSubmitError(null);
    setAgreementOpen(true);
  };

  /** From the agreement sheet's Done button. The only path that saves. */
  const confirmAndSave = () => {
    setAgreementOpen(false);
    setSubmitError(null);
    setSaving(true);
    attemptSave(false);
  };

  /**
   * The enrolment form, as a file.
   *
   * Fetched rather than linked because the endpoint is cookie-authenticated
   * and needs credentials; an <a download> to a cross-origin API URL sends
   * none and downloads the login page instead.
   */
  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`${apiBase()}/api/pt-os/clients/${clientId}/enrollment-pdf`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pt-enrolment-${(clientName || 'client').replace(/[^a-z0-9]+/gi, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Revoked on the next tick, not immediately: Safari has not started
      // reading the blob when click() returns.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not download the form.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={28} className="animate-spin" style={{ color: '#F59E0B' }} />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <AlertCircle size={32} style={{ color: '#ef4444', margin: '0 auto 12px' }} />
        <p className="text-[14px] font-[600] text-slate-600">{loadError}</p>
        <Button variant="outline" className="mt-4" onClick={loadData}>Retry</Button>
      </div>
    );
  }

  /* ── Done ──
     Replaces the old behaviour of pushing straight to the client profile.
     The form only becomes downloadable once it is saved, and navigating away
     half a second after that would take it away again. */
  if (enrolled) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <m.div
          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 22 }}
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)' }}
        >
          <Check size={30} style={{ color: '#059669' }} />
        </m.div>
        <h2 className="mt-4 text-[19px] font-[820] tracking-[-0.02em] text-slate-900">Enrolled</h2>
        <p className="mt-1 text-[13px] font-[560] text-slate-500">
          {clientName} is on a {form.duration}-month programme starting {fmtDateLong(form.startDate)}.
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={downloadPdf}
            disabled={downloading}
            className="inline-flex h-[46px] items-center justify-center gap-2 rounded-[14px] text-[13.5px] font-[720] text-white transition-opacity disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}
          >
            {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            {downloading ? 'Preparing…' : 'Download enrolment form (PDF)'}
          </button>
          <button
            type="button"
            onClick={() => router.push(`/pt-os/clients/${clientId}`)}
            className="inline-flex h-[46px] items-center justify-center rounded-[14px] text-[13px] font-[700] text-slate-600"
            style={{ background: 'rgba(15,23,42,0.05)' }}
          >
            Go to client profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <PageContainer>

      {/* ── Hero ──
          Was an award icon and "Hari Narayan Singh · Program Setup", which is
          the form describing itself. This page is about a person, and the
          facts that make it feel that way — how long they have been a
          member, their age and weight, what they are training for — are the
          hero's children, conditionally: a client missing a date of birth or
          a goal gets a shorter row rather than a row of "—". */}
      <PageHero
        icon={<Award size={20} />}
        title={clientName || 'Client'}
        subtitle="PT Enrollment"
      >
        {heroFacts.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {heroFacts.map((f) => (
              <span key={f.label}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-[650] text-white"
                style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.2)' }}>
                <span className="text-[10px] font-[750] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.66)' }}>
                  {f.label}
                </span>
                {f.value}
              </span>
            ))}
          </div>
        )}
      </PageHero>

      <div className="mx-auto max-w-3xl space-y-5">

        {/* ── SMART ALERTS ── */}
        <AnimatePresence>
          {startsToday && (
            <m.div
              key="today" initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 rounded-[14px] px-4 py-3"
              style={{ background: 'rgba(0,89,206,0.08)', border: '1px solid rgba(0,89,206,0.2)' }}
            >
              <Sparkles size={14} style={{ color: '#0059ce', flexShrink: 0 }} />
              <span className="text-[12.5px] font-[640]" style={{ color: '#065f46' }}>Client starts today.</span>
            </m.div>
          )}
          {endingSoon && (
            <m.div
              key="ending" initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 rounded-[14px] px-4 py-3"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}
            >
              <AlertCircle size={14} style={{ color: '#d97706', flexShrink: 0 }} />
              <span className="text-[12.5px] font-[640]" style={{ color: '#92400e' }}>
                Program ends in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}.
              </span>
            </m.div>
          )}
        </AnimatePresence>

        {/* ── MAIN CARD ── */}
        <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE }}>
          <div>
            <div className="space-y-8">

              {/* Start / Duration / End */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div ref={bindFieldRef('startDate')}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>
                      PT Start Date <span style={{ color: '#F59E0B' }}>*</span>
                    </span>
                    <button type="button" onClick={() => set('startDate', todayStr())} className="text-[11px] font-[700]" style={{ color: '#F59E0B' }}>
                      Today
                    </button>
                  </div>
                  <FloatInput
                    label="" type="date" value={form.startDate}
                    onChange={(v) => set('startDate', v)}
                    onBlur={() => setErrors((e) => ({ ...e, startDate: validateStartDate(form.startDate) }))}
                    error={errors.startDate}
                  />
                </div>

                <div ref={bindFieldRef('duration')}>
                  <SearchableSelect
                    label="PT Duration" required allowCustom={false}
                    value={form.duration}
                    onChange={(v) => { set('duration', v); setErrors((e) => ({ ...e, duration: undefined })); }}
                    options={DURATIONS}
                    error={errors.duration}
                  />
                </div>
              </div>

              <div>
                <FloatInput label="PT End Date" value={fmtDateLong(endDate)} onChange={() => {}} disabled />
              </div>

              <div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div ref={bindFieldRef('finalAmount')}>
                    <p className="mb-2 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>
                      Final / Selling Price {isAdmin && <span style={{ color: '#F59E0B' }}>*</span>}
                    </p>
                    <FloatInput
                      label=""
                      type="number" placeholder="Enter Final Selling Price"
                      prefix={<span className="text-[13px] font-[700]">₹</span>}
                      value={form.finalAmount}
                      onChange={(v) => set('finalAmount', v)}
                      onBlur={() => setErrors((e) => ({ ...e, finalAmount: isAdmin ? validateFinalAmount(form.finalAmount) : undefined }))}
                      error={errors.finalAmount}
                      disabled={!isAdmin}
                    />
                  </div>
                  <div ref={bindFieldRef('amountPaid')}>
                    <p className="mb-2 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>
                      Amount Paid {isAdmin && <span style={{ color: '#F59E0B' }}>*</span>}
                    </p>
                    <FloatInput
                      label=""
                      type="number" placeholder="Enter Amount Paid"
                      prefix={<span className="text-[13px] font-[700]">₹</span>}
                      value={form.amountPaid}
                      onChange={(v) => set('amountPaid', v)}
                      onBlur={() => setErrors((e) => ({ ...e, amountPaid: isAdmin ? validateAmountPaid(form) : undefined }))}
                      error={errors.amountPaid}
                      disabled={!isAdmin}
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="mb-2 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>
                    Balance / Due
                  </p>
                  <FloatInput
                    label=""
                    value={fmtINR(balanceDue)}
                    onChange={() => {}}
                    disabled
                  />
                  <AnimatePresence>
                    {isPaidInFull && (
                      <m.div
                        initial={{ opacity: 0, y: -6, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="mt-2 flex items-center gap-1.5 rounded-[10px] px-3 py-2"
                        style={{ background: 'rgba(0,89,206,0.08)', border: '1px solid rgba(0,89,206,0.2)' }}
                      >
                        <Check size={13} style={{ color: '#0059ce', flexShrink: 0 }} />
                        <span className="text-[12px] font-[700]" style={{ color: '#065f46' }}>Paid in Full</span>
                      </m.div>
                    )}
                  </AnimatePresence>
                  {!isAdmin && (
                    <p className="mt-1.5 text-[11px] text-slate-400">Only admins and managers can edit payment details.</p>
                  )}
                </div>

                {/* ── Payment method ──
                    After the balance, because the amount is the question and
                    the method is the follow-up. Chips rather than a dropdown:
                    five options, all short, and this is the one field on the
                    page somebody fills in while a client is standing in front
                    of them.

                    The values are the server's enum, not labels — a 400 comes
                    back for anything else, which is the right place for that
                    rule to live. */}
                <div className="mt-4">
                  <p className="mb-2 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>
                    Payment Method
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {PAYMENT_METHODS.map((pm) => {
                      const active = form.paymentMethod === pm.value;
                      return (
                        <button
                          key={pm.value}
                          type="button"
                          disabled={!isAdmin}
                          // Tapping the active one clears it: nothing forces a
                          // method, and a chip you cannot un-pick is a trap.
                          onClick={() => set('paymentMethod', active ? '' : pm.value)}
                          className="inline-flex h-[38px] items-center gap-1.5 rounded-[12px] px-3.5 text-[12.5px] font-[680] transition-all disabled:opacity-50"
                          style={active
                            ? { background: 'rgba(245,158,11,0.14)', border: '1.5px solid #F59E0B', color: '#B45309' }
                            : { background: '#fff', border: '1.5px solid rgb(226,232,240)', color: 'rgb(71,85,105)' }}
                        >
                          <span aria-hidden>{pm.icon}</span>{pm.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Training Mode */}
              <div ref={bindFieldRef('trainingMode')}>
                <SearchableSelect
                  label="Training Mode" required allowCustom={false}
                  value={form.trainingMode}
                  onChange={(v) => { set('trainingMode', v as EnrollFormData['trainingMode']); setErrors((e) => ({ ...e, trainingMode: undefined })); }}
                  options={TRAINING_MODES}
                  error={errors.trainingMode}
                />
              </div>

              {/* Workout Experience */}
              <div>
                <SearchableSelect
                  label="Workout Experience" allowCustom={false}
                  value={form.workoutExperienceLevel}
                  onChange={(v) => set('workoutExperienceLevel', v)}
                  options={WORKOUT_EXPERIENCE_OPTIONS}
                />
              </div>

              {/* Previously worked with a trainer — moved here from the PAR-Q
                  health screening. It's a training-history question that
                  belongs with the rest of this client's fitness background,
                  not in a medical screening. */}
              <div>
                <p className="mb-3 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>
                  Previously Worked With a Trainer?
                </p>
                <div className="flex gap-2.5">
                  {([true, false] as const).map((val) => {
                    const selected = form.previousTrainerExperience === val;
                    return (
                      <button
                        key={String(val)} type="button" aria-pressed={selected}
                        onClick={() => set('previousTrainerExperience', val)}
                        className="flex-1 rounded-[12px] py-3 text-[13px] font-[700] transition-all duration-200"
                        style={{
                          background: selected ? 'linear-gradient(135deg, #F59E0B, #D97706)' : '#f8fafc',
                          color: selected ? '#fff' : '#94a3b8',
                          border: selected ? 'none' : '1.5px solid #e2e8f0',
                          boxShadow: selected ? '0 4px 14px rgba(245,158,11,0.25)' : 'none',
                        }}
                      >
                        {val ? 'Yes' : 'No'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Preferred Workout Time — a native time field: tap it and the
                  device's own time picker opens, rather than choosing from a
                  fixed list of slots. */}
              <div ref={bindFieldRef('workoutTime')}>
                <FloatInput
                  label="Preferred Workout Time" required
                  type="time" value={form.workoutTime}
                  onChange={(v) => { set('workoutTime', v); setErrors((e) => ({ ...e, workoutTime: undefined })); }}
                  onBlur={() => setErrors((e) => ({ ...e, workoutTime: validateWorkoutTime(form) }))}
                  error={errors.workoutTime}
                />
              </div>

              {/* Preferred Training Days */}
              <div ref={bindFieldRef('trainingDays')}>
                <p className="mb-3 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>
                  Preferred Training Days <span style={{ color: '#F59E0B' }}>*</span>
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {DAYS.map(({ key, letter, full }) => {
                    const selected = form.trainingDays.includes(key);
                    return (
                      <button
                        key={key} type="button" title={full} aria-label={full} aria-pressed={selected}
                        onClick={() => toggleDay(key)}
                        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-[14px] font-[800] transition-all duration-200"
                        style={{
                          background: selected ? 'linear-gradient(135deg, #F59E0B, #D97706)' : '#f8fafc',
                          color: selected ? '#fff' : '#94a3b8',
                          border: selected ? 'none' : '1.5px solid #e2e8f0',
                          boxShadow: selected ? '0 4px 14px rgba(245,158,11,0.35)' : 'none',
                          transform: selected ? 'scale(1.05)' : 'scale(1)',
                        }}
                      >
                        {letter}
                      </button>
                    );
                  })}
                </div>
                {form.trainingDays.length > 0 && (
                  <p className="mt-2.5 text-[11.5px] font-[600] text-slate-500">
                    {DAYS.filter((d) => form.trainingDays.includes(d.key)).map((d) => `✓ ${d.full}`).join('   ')}
                  </p>
                )}
                {errors.trainingDays && <p className="mt-1.5 text-[11px] font-medium" style={{ color: 'var(--danger)' }}>{errors.trainingDays}</p>}
              </div>

              {/* Sessions Per Week */}
              <div ref={bindFieldRef('sessionsPerWeek')}>
                <SearchableSelect
                  label="Sessions Per Week" required allowCustom={false}
                  value={form.sessionsPerWeek}
                  onChange={(v) => { set('sessionsPerWeek', v); setErrors((e) => ({ ...e, sessionsPerWeek: undefined })); }}
                  options={SESSIONS_OPTIONS}
                  error={errors.sessionsPerWeek}
                />
              </div>

            </div>
          </div>
        </m.div>

        {/* ── PROGRAM SUMMARY ── */}
        <AnimatePresence>
          {(form.startDate || form.duration) && (
            <m.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
              className="rounded-[20px] p-6"
              style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 100%)', boxShadow: '0 12px 40px rgba(15,23,42,0.25)' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Calendar size={15} color="#F59E0B" />
                <h3 className="text-[13px] font-[800] uppercase tracking-wider text-white">Program Summary</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Start Date', val: fmtDateLong(form.startDate) },
                  { label: 'End Date', val: fmtDateLong(endDate) },
                  { label: 'Duration', val: form.duration ? `${form.duration} mo` : '—' },
                  { label: 'Total Weeks', val: totalWeeks || '—' },
                  { label: 'Selling Price', val: form.finalAmount ? fmtINR(Number(form.finalAmount)) : '—' },
                  { label: 'Amount Paid', val: form.finalAmount ? fmtINR(Number(form.amountPaid) || 0) : '—' },
                  { label: 'Balance Due', val: form.finalAmount ? fmtINR(balanceDue) : '—', success: Boolean(form.finalAmount) && isPaidInFull },
                  { label: 'Sessions / Week', val: form.sessionsPerWeek || '—' },
                  { label: 'Estimated Sessions', val: estimatedSessions || '—' },
                  { label: 'Training Mode', val: form.trainingMode || '—' },
                  { label: 'Workout Experience', val: WORKOUT_EXPERIENCE_OPTIONS.find((o) => o.value === form.workoutExperienceLevel)?.label || '—' },
                ].map((r) => (
                  <div key={r.label}>
                    <p className="text-[10.5px] text-white/40 font-[600]">{r.label}</p>
                    <AnimatePresence mode="wait">
                      <m.p
                        key={String(r.val)}
                        initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.15 }}
                        className="text-[13px] font-[720]"
                        style={{ color: r.success ? '#0067e0' : '#fff' }}
                      >
                        {r.val}
                      </m.p>
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </m.div>
          )}
        </AnimatePresence>

        {/* ── SAVE FAILURE (persistent — a toast alone was reported as
             invisible; this stays put right above Finish, where the user's
             attention already is, until dismissed or a save succeeds) ── */}
        <AnimatePresence>
          {submitError && (
            <m.div
              initial={{ opacity: 0, y: 8, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="flex items-start gap-3 rounded-[14px] px-4 py-3"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}
            >
              <AlertCircle size={15} style={{ color: '#dc2626', flexShrink: 0, marginTop: 1 }} />
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-[700]" style={{ color: '#991b1b' }}>Could not save enrollment</p>
                <p className="mt-0.5 text-[11.5px] font-[560] break-words" style={{ color: '#b91c1c' }}>{submitError}</p>
                <button type="button" onClick={handleSubmit} className="mt-2 text-[11.5px] font-[700]" style={{ color: '#dc2626' }}>
                  Try Again
                </button>
              </div>
              <button type="button" onClick={() => setSubmitError(null)} className="opacity-60 hover:opacity-100 transition-opacity">
                <X size={13} style={{ color: '#991b1b' }} />
              </button>
            </m.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── STICKY FOOTER ── */}
      <div className="page-action-bar" style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(15,23,42,0.08)' }}>
        <div className="mx-auto max-w-3xl px-5 sm:px-8 py-3.5 flex items-center justify-between gap-3">
          <Button variant="outline" iconLeft={<ArrowLeft size={14} />} onClick={handleBack}>Back</Button>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={handleSaveDraft}>Save Draft</Button>
            <Button
              iconLeft={!saving ? <Check size={14} /> : undefined}
              loading={saving} disabled={saving}
              onClick={handleSubmit}
              style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff' }}
            >
              {saving ? 'Saving...' : 'Finish'}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Digital agreement ──
          The last thing before the enrolment is written. It opens from Finish
          rather than sitting as a step in the form, because a client should
          sign the finished terms and not a draft of them — and because a
          signature captured half way through a form is a signature on
          whatever the form said at the time.

          Both gates are real: the box must be ticked AND the pad must have
          something on it. Either alone is an agreement nobody made. */}
      <AnimatePresence>
        {agreementOpen && (
          <>
            <m.div
              key="agree-scrim"
              data-no-pull-refresh
              className="fixed inset-0 z-[130]"
              style={{ background: 'rgba(2,6,23,0.5)' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setAgreementOpen(false)}
            />
            <m.div
              key="agree-sheet"
              data-no-pull-refresh
              role="dialog" aria-modal="true" aria-label="Digital agreement"
              className="fixed inset-x-0 bottom-0 z-[140] flex max-h-[88dvh] flex-col overflow-hidden rounded-t-[24px] bg-white sm:inset-x-auto sm:bottom-8 sm:left-1/2 sm:w-[520px] sm:-translate-x-1/2 sm:rounded-[24px]"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ duration: 0.3, ease: EASE }}
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            >
              <div className="flex shrink-0 items-center gap-2.5 border-b px-5 py-3.5" style={{ borderColor: 'rgba(15,23,42,0.08)' }}>
                <span className="flex h-8 w-8 items-center justify-center rounded-[10px]"
                  style={{ background: 'rgba(245,158,11,0.14)', color: '#B45309' }}>
                  <FileSignature size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-[800] text-slate-900">Digital Agreement</p>
                  <p className="text-[11px] font-[560] text-slate-400">{clientName}</p>
                </div>
                <button type="button" onClick={() => setAgreementOpen(false)} aria-label="Close agreement"
                  className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: 'rgba(15,23,42,0.06)' }}>
                  <X size={15} className="text-slate-700" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
                <p className="rounded-[14px] px-3.5 py-3 text-[12px] font-[540] leading-[1.6] text-slate-700"
                  style={{ background: 'rgba(15,23,42,0.035)' }}>
                  {AGREEMENT_TEXT}
                </p>

                <label className="mt-3.5 flex cursor-pointer items-start gap-2.5 rounded-[14px] px-3.5 py-3"
                  style={{ background: agreementChecked ? 'rgba(245,158,11,0.10)' : 'rgba(15,23,42,0.03)',
                           border: `1.5px solid ${agreementChecked ? '#F59E0B' : 'transparent'}` }}>
                  <input
                    type="checkbox"
                    checked={agreementChecked}
                    onChange={(e) => setAgreementChecked(e.target.checked)}
                    className="mt-[2px] h-[18px] w-[18px] shrink-0 accent-[#F59E0B]"
                  />
                  <span className="text-[12.5px] font-[680] leading-[1.45] text-slate-800">
                    I agree to the terms above on behalf of, and with the consent of, {clientName || 'the client'}.
                  </span>
                </label>

                <div className="mt-3.5">
                  <SignaturePad
                    label="Client signature"
                    required
                    onChange={setSignature}
                    onClear={() => setSignature('')}
                  />
                </div>
              </div>

              <div className="shrink-0 border-t px-5 py-3.5" style={{ borderColor: 'rgba(15,23,42,0.08)' }}>
                <button
                  type="button"
                  onClick={confirmAndSave}
                  disabled={!agreementChecked || !signature}
                  className="flex h-[46px] w-full items-center justify-center gap-2 rounded-[14px] text-[13.5px] font-[750] text-white transition-opacity disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}
                >
                  <Check size={15} />
                  {!agreementChecked ? 'Tick the box to continue'
                    : !signature ? 'Sign to continue'
                    : 'Done'}
                </button>
              </div>
            </m.div>
          </>
        )}
      </AnimatePresence>
    </PageContainer>
  );
}
