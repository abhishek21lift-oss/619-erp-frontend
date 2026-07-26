'use client';

import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { m, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Calendar, Award,
  Check, Sparkles, AlertCircle, Loader2, X,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Button } from '@/components/ui';
import FloatInput from '@/components/ui/FloatInput';
import SearchableSelect from '@/components/pt-os/SearchableSelect';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/http';
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
  workoutTime: string;
  customTime: string;
  useCustomTime: boolean;
  trainingDays: string[];
  sessionsPerWeek: string; // '1'..'7'
  // Payment Details — mirrors the existing pt_clients.final_amount /
  // paid_amount columns already used across the rest of the app (add-client,
  // renew, payments, dues, commissions). Kept as strings like every other
  // field here; parsed with Number() at the validation/computation/submit
  // boundaries, never stored as a parsed number in form state.
  finalAmount: string;
  amountPaid: string;
}

interface FormErrors {
  startDate?: string; duration?: string; trainingMode?: string;
  workoutTime?: string; trainingDays?: string; sessionsPerWeek?: string;
  finalAmount?: string; amountPaid?: string;
}

/* ─────────────────────────────────────────────────────── CONSTANTS */
const DURATIONS = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `${i + 1} Month${i > 0 ? 's' : ''}` }));

const TRAINING_MODES = [
  { value: 'Offline', label: 'Offline — In-person at the studio', icon: '🏢' },
  { value: 'Online', label: 'Online — Remote video sessions', icon: '💻' },
  { value: 'Hybrid', label: 'Hybrid — A mix of both', icon: '🔄' },
];

// Same value set as pt_lifestyle_assessments.workout_experience_level.
const WORKOUT_EXPERIENCE_OPTIONS = [
  { value: 'beginner', label: 'Beginner', icon: '🚫' },
  { value: 'intermediate', label: 'Intermediate', icon: '🏋️' },
  { value: 'advanced', label: 'Advanced', icon: '🔥' },
  { value: 'athlete', label: 'Athlete', icon: '🏆' },
];

const TIME_SLOTS = [
  '5:00 AM', '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM',
  '7:00 PM', '8:00 PM', '9:00 PM',
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
  if (form.useCustomTime) return form.customTime ? undefined : 'Please enter a custom time.';
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
    trainerId: '', trainerName: '', trainingMode: '', workoutExperienceLevel: '', workoutTime: '',
    customTime: '', useCustomTime: false, trainingDays: [], sessionsPerWeek: '',
    finalAmount: '', amountPaid: '',
  };
}

/* ─────────────────────────────────────────────────────── PAGE EXPORT */
export default function PTEnrollmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <Guard><AppShell><EnrollForm clientId={id} /></AppShell></Guard>;
}

/* ─────────────────────────────────────────────────────── MAIN FORM */
function EnrollForm({ clientId }: { clientId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  const [clientName, setClientName] = useState('');
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
        workoutTime: String(c.preferred_workout_time ?? ''),
        customTime: '',
        useCustomTime: false,
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
    preferred_workout_time: form.useCustomTime ? form.customTime : form.workoutTime,
    preferred_training_days: form.trainingDays.join(', '),
    sessions_per_week: Number(form.sessionsPerWeek),
    // Payment fields are admin/manager-only (matches the backend's RBAC
    // boundary on PATCH /clients/:id, which silently ignores these for
    // the trainer role) - only send them when they were actually
    // editable, so a read-only display value never overwrites data.
    ...(isAdmin ? {
      final_amount: Number(form.finalAmount),
      paid_amount: Number(form.amountPaid),
    } : {}),
  });

  const attemptSave = async (isRetry: boolean) => {
    try {
      await savePayload();
      clear();
      setSubmitError(null);
      toast.success('Client enrolled in PT.');
      router.push(`/pt-os/clients/${clientId}`);
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
    setSubmitError(null);
    setSaving(true);
    attemptSave(false);
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

  return (
    <div className="min-h-screen pb-28" style={{ background: 'linear-gradient(160deg,#f8fafc 0%,#f1f5f9 60%,#fafafe 100%)' }}>

      {/* ── HEADER ── */}
      {/* Header — in normal flow on the page background (no sticky card). */}
      <div className="pt-1">
        <div className="mx-auto max-w-3xl px-5 sm:px-8 py-4 flex items-center gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[14px]" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', boxShadow: '0 6px 18px rgba(245,158,11,0.3)' }}>
            <Award size={18} color="#fff" />
          </div>
          <div>
            <h1 className="text-[19px] font-[860] tracking-[-0.03em] text-slate-900 leading-none sm:text-[22px]">PT Enrollment</h1>
            <p className="text-[12px] font-[600] text-slate-400 mt-1">{clientName || 'Client'} · Program Setup</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-5 sm:px-8 py-6 space-y-5">

        {/* ── SMART ALERTS ── */}
        <AnimatePresence>
          {startsToday && (
            <m.div
              key="today" initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 rounded-[14px] px-4 py-3"
              style={{ background: 'rgba(13,148,136,0.08)', border: '1px solid rgba(13,148,136,0.2)' }}
            >
              <Sparkles size={14} style={{ color: '#0d9488', flexShrink: 0 }} />
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
                <p className="mt-1.5 text-[11px] text-slate-400">Automatically calculated.</p>
              </div>

              {/* Payment Details */}
              <div>
                <p className="mb-3 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>
                  Payment Details
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div ref={bindFieldRef('finalAmount')}>
                    <p className="mb-2 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>
                      Final / Selling Price {isAdmin && <span style={{ color: '#F59E0B' }}>*</span>}
                    </p>
                    <FloatInput
                      label="" required={isAdmin}
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
                      label="" required={isAdmin}
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
                        style={{ background: 'rgba(13,148,136,0.08)', border: '1px solid rgba(13,148,136,0.2)' }}
                      >
                        <Check size={13} style={{ color: '#0d9488', flexShrink: 0 }} />
                        <span className="text-[12px] font-[700]" style={{ color: '#065f46' }}>Paid in Full</span>
                      </m.div>
                    )}
                  </AnimatePresence>
                  {!isAdmin && (
                    <p className="mt-1.5 text-[11px] text-slate-400">Only admins and managers can edit payment details.</p>
                  )}
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

              {/* Preferred Workout Time */}
              <div ref={bindFieldRef('workoutTime')}>
                <SearchableSelect
                  label="Preferred Workout Time" required allowCustom={false}
                  value={form.useCustomTime ? 'Custom' : form.workoutTime}
                  onChange={(v) => {
                    if (v === 'Custom') {
                      setForm((p) => ({ ...p, useCustomTime: true, workoutTime: '' }));
                    } else {
                      setForm((p) => ({ ...p, workoutTime: v, useCustomTime: false }));
                    }
                    setErrors((e) => ({ ...e, workoutTime: undefined }));
                  }}
                  options={[...TIME_SLOTS, 'Custom']}
                  error={errors.workoutTime}
                />
                <AnimatePresence>
                  {form.useCustomTime && (
                    <m.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 overflow-hidden max-w-[200px]">
                      <FloatInput
                        label="Custom Time" type="time" value={form.customTime}
                        onChange={(v) => set('customTime', v)}
                        onBlur={() => setErrors((e) => ({ ...e, workoutTime: validateWorkoutTime(form) }))}
                      />
                    </m.div>
                  )}
                </AnimatePresence>
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
                        style={{ color: r.success ? '#2dd4bf' : '#fff' }}
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
    </div>
  );
}
