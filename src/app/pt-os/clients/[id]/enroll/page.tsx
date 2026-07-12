'use client';

import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { m, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Calendar, Clock, Award, Building2, Laptop, Repeat,
  Check, Sparkles, AlertCircle, Loader2,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Button } from '@/components/ui';
import FloatInput from '@/components/ui/FloatInput';
import SearchableSelect from '@/components/pt-os/SearchableSelect';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { useAuth } from '@/lib/auth-context';
import { useAutoSaveDraft } from '@/hooks/useAutoSaveDraft';

/* ─────────────────────────────────────────────────────── TYPES */
interface EnrollFormData {
  startDate: string;
  duration: string; // '1'..'12'
  goal: string;
  customGoal: string;
  trainerId: string;
  trainerName: string;
  trainingMode: 'Offline' | 'Online' | 'Hybrid' | '';
  workoutTime: string;
  customTime: string;
  useCustomTime: boolean;
  trainingDays: string[];
  sessionsPerWeek: string; // '1'..'7'
}

interface FormErrors {
  startDate?: string; duration?: string; goal?: string; trainingMode?: string;
  workoutTime?: string; trainingDays?: string; sessionsPerWeek?: string;
}

interface TrainerOption { id: string; name: string; }

/* ─────────────────────────────────────────────────────── CONSTANTS */
const DURATIONS = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `${i + 1} Month${i > 0 ? 's' : ''}` }));

const GOALS = [
  { value: 'Fat Loss', label: 'Fat Loss', icon: '🏋️' },
  { value: 'Muscle Gain', label: 'Muscle Gain', icon: '💪' },
  { value: 'Body Recomposition', label: 'Body Recomposition', icon: '⚖️' },
  { value: 'Strength', label: 'Strength', icon: '🔥' },
  { value: 'Powerlifting', label: 'Powerlifting', icon: '🏆' },
  { value: 'Endurance', label: 'Endurance', icon: '🏃' },
  { value: 'General Fitness', label: 'General Fitness', icon: '❤️' },
  { value: 'Mobility', label: 'Mobility', icon: '🤸' },
  { value: 'Athletic Performance', label: 'Athletic Performance', icon: '⚡' },
  { value: 'Wedding Transformation', label: 'Wedding Transformation', icon: '👰' },
  { value: 'Medical Fitness', label: 'Medical Fitness', icon: '🩺' },
  { value: 'Senior Fitness', label: 'Senior Fitness', icon: '👴' },
  { value: "Women's Fitness", label: "Women's Fitness", icon: '👩' },
  { value: 'Marathon Preparation', label: 'Marathon Preparation', icon: '🏃' },
  { value: 'Custom Goal', label: 'Custom Goal', icon: '🎯' },
];

const TRAINING_MODES = [
  { key: 'Offline' as const, icon: Building2, emoji: '🏢', desc: 'In-person at the studio' },
  { key: 'Online' as const, icon: Laptop, emoji: '💻', desc: 'Remote video sessions' },
  { key: 'Hybrid' as const, icon: Repeat, emoji: '🔄', desc: 'A mix of both' },
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

/* ─────────────────────────────────────────────────────── VALIDATION */
function validateStartDate(v: string): string | undefined {
  return v ? undefined : 'Start date is required.';
}
function validateDuration(v: string): string | undefined {
  return v ? undefined : 'Please select a duration.';
}
function validateGoal(form: EnrollFormData): string | undefined {
  if (!form.goal) return 'Please select a goal.';
  if (form.goal === 'Custom Goal' && !form.customGoal.trim()) return 'Please describe the custom goal.';
  return undefined;
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
function validateAll(form: EnrollFormData): FormErrors {
  return {
    startDate: validateStartDate(form.startDate),
    duration: validateDuration(form.duration),
    goal: validateGoal(form),
    trainingMode: validateTrainingMode(form.trainingMode),
    workoutTime: validateWorkoutTime(form),
    trainingDays: validateTrainingDays(form.trainingDays),
    sessionsPerWeek: validateSessionsPerWeek(form.sessionsPerWeek),
  };
}
function hasErrors(errors: FormErrors): boolean {
  return Object.values(errors).some(Boolean);
}

function initForm(): EnrollFormData {
  return {
    startDate: todayStr(), duration: '', goal: '', customGoal: '',
    trainerId: '', trainerName: '', trainingMode: '', workoutTime: '',
    customTime: '', useCustomTime: false, trainingDays: [], sessionsPerWeek: '',
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
  const [trainers, setTrainers] = useState<TrainerOption[]>([]);
  const [form, setForm] = useState<EnrollFormData>(initForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const initFormRef = useRef<EnrollFormData>(initForm());

  const draftKey = `pt-os.enroll.${clientId}.draft.v1`;
  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initFormRef.current), [form]);
  const { restore, clear, saveNow } = useAutoSaveDraft({ key: draftKey, data: form, isDirty });

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [clientRes, trainersRes] = await Promise.all([
        api.pt.client(clientId) as Promise<{ data?: Record<string, unknown> }>,
        api.pt.trainers() as Promise<{ data?: TrainerOption[] }>,
      ]);
      const c = clientRes?.data;
      if (!c) { setLoadError('Client not found.'); setLoading(false); return; }
      setClientName(String(c.name ?? ''));

      const list = Array.isArray(trainersRes?.data) ? trainersRes.data : [];
      setTrainers(list);

      const days = typeof c.preferred_training_days === 'string' && c.preferred_training_days
        ? c.preferred_training_days.split(',').map((d) => d.trim()).filter(Boolean)
        : [];

      const existingTrainerId = String(c.trainer_id ?? '');
      const existingTrainerName = String(c.trainer_name ?? '');
      const defaultTrainer = !existingTrainerId && list.length === 1 ? list[0] : null;

      const loaded: EnrollFormData = {
        startDate: String(c.pt_start_date ?? '').slice(0, 10) || todayStr(),
        duration: c.duration_months ? String(c.duration_months) : '',
        goal: String(c.goal ?? ''),
        customGoal: '',
        trainerId: defaultTrainer?.id || existingTrainerId,
        trainerName: defaultTrainer?.name || existingTrainerName,
        trainingMode: (String(c.training_mode ?? '') as EnrollFormData['trainingMode']) || '',
        workoutTime: String(c.preferred_workout_time ?? ''),
        customTime: '',
        useCustomTime: false,
        trainingDays: days,
        sessionsPerWeek: c.sessions_per_week ? String(c.sessions_per_week) : '',
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

  const handleCoachChange = (trainerId: string) => {
    const t = trainers.find((tr) => tr.id === trainerId);
    setForm((prev) => ({ ...prev, trainerId, trainerName: t?.name || '' }));
  };

  const handleBack = () => {
    if (isDirty && !window.confirm('Discard unsaved changes?')) return;
    router.push(`/pt-os/clients/${clientId}`);
  };

  const handleSaveDraft = () => {
    const ok = saveNow();
    toast[ok ? 'success' : 'error'](ok ? 'Draft saved.' : 'Could not save draft — storage unavailable.');
  };

  const handleSubmit = async () => {
    const allErrors = validateAll(form);
    setErrors(allErrors);
    if (hasErrors(allErrors)) {
      toast.error('Please fix the highlighted fields.');
      return;
    }
    setSaving(true);
    try {
      await api.pt.updateClient(clientId, {
        pt_start_date: form.startDate,
        pt_end_date: endDate,
        duration_months: Number(form.duration),
        goal: form.goal === 'Custom Goal' ? form.customGoal.trim() : form.goal,
        trainer_id: form.trainerId || undefined,
        trainer_name: form.trainerName || undefined,
        training_mode: form.trainingMode,
        preferred_workout_time: form.useCustomTime ? form.customTime : form.workoutTime,
        preferred_training_days: form.trainingDays.join(', '),
        sessions_per_week: Number(form.sessionsPerWeek),
      });
      clear();
      toast.success('Client enrolled in PT.');
      router.push(`/pt-os/clients/${clientId}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save enrollment.');
    } finally {
      setSaving(false);
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

  return (
    <div className="min-h-screen pb-28" style={{ background: 'linear-gradient(160deg,#f8fafc 0%,#f1f5f9 60%,#fafafe 100%)' }}>

      {/* ── HEADER ── */}
      <div className="sticky top-0 z-40" style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
        <div className="mx-auto max-w-3xl px-5 sm:px-8 py-4 flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[13px]" style={{ background: '#0f172a' }}>
            <Award size={17} color="#F59E0B" />
          </div>
          <div>
            <h1 className="text-[18px] font-[860] tracking-[-0.03em] text-slate-900 leading-none">PT Enrollment</h1>
            <p className="text-[11px] font-[600] text-slate-400 mt-0.5">{clientName || 'Client'} · Program Setup</p>
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
          <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
            <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#0f172a,#334155)' }} />
            <div className="p-7 sm:p-10 space-y-8">

              {/* Start / Duration / End */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
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

                <SearchableSelect
                  label="PT Duration" required allowCustom={false}
                  value={form.duration}
                  onChange={(v) => { set('duration', v); setErrors((e) => ({ ...e, duration: undefined })); }}
                  options={DURATIONS}
                  error={errors.duration}
                />
              </div>

              <div>
                <FloatInput label="PT End Date" value={fmtDateLong(endDate)} onChange={() => {}} disabled />
                <p className="mt-1.5 text-[11px] text-slate-400">Automatically calculated.</p>
              </div>

              {/* Goal */}
              <div>
                <SearchableSelect
                  label="PT Goal" required allowCustom={false}
                  value={form.goal}
                  onChange={(v) => { set('goal', v); setErrors((e) => ({ ...e, goal: undefined })); }}
                  options={GOALS}
                  error={errors.goal}
                />
                <AnimatePresence>
                  {form.goal === 'Custom Goal' && (
                    <m.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 overflow-hidden">
                      <FloatInput
                        label="Describe Goal" required multiline autoGrow
                        value={form.customGoal}
                        onChange={(v) => set('customGoal', v)}
                        onBlur={() => setErrors((e) => ({ ...e, goal: validateGoal(form) }))}
                      />
                    </m.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Coach */}
              {isAdmin ? (
                <SearchableSelect
                  label="Coach Assigned" allowCustom={false}
                  value={form.trainerId}
                  onChange={handleCoachChange}
                  options={trainers.map((t) => ({ value: t.id, label: t.name }))}
                />
              ) : (
                <FloatInput label="Coach Assigned" value={form.trainerName || 'Coach Abhishek'} onChange={() => {}} disabled />
              )}

              {/* Training Mode */}
              <div>
                <p className="mb-3 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>
                  Training Mode <span style={{ color: '#F59E0B' }}>*</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {TRAINING_MODES.map(({ key, icon: Icon, emoji, desc }) => {
                    const selected = form.trainingMode === key;
                    return (
                      <m.button
                        key={key} type="button" whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
                        onClick={() => { set('trainingMode', key); setErrors((e) => ({ ...e, trainingMode: undefined })); }}
                        className="flex flex-col items-center gap-2 rounded-[16px] px-4 py-5 text-center transition-colors"
                        style={{
                          background: selected ? 'rgba(245,158,11,0.06)' : 'var(--bg-subtle)',
                          border: selected ? '2px solid #F59E0B' : '2px solid rgba(15,23,42,0.08)',
                          boxShadow: selected ? '0 4px 16px rgba(245,158,11,0.18)' : 'none',
                        }}
                      >
                        <span className="text-[22px]">{emoji}</span>
                        <Icon size={16} style={{ color: selected ? '#F59E0B' : '#94a3b8' }} />
                        <span className="text-[13px] font-[700]" style={{ color: selected ? '#0f172a' : '#475569' }}>{key}</span>
                        <span className="text-[10.5px] text-slate-400">{desc}</span>
                      </m.button>
                    );
                  })}
                </div>
                {errors.trainingMode && <p className="mt-1.5 text-[11px] font-medium" style={{ color: 'var(--danger)' }}>{errors.trainingMode}</p>}
              </div>

              {/* Preferred Workout Time */}
              <div>
                <p className="mb-3 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>
                  Preferred Workout Time <span style={{ color: '#F59E0B' }}>*</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {TIME_SLOTS.map((slot) => {
                    const selected = !form.useCustomTime && form.workoutTime === slot;
                    return (
                      <button
                        key={slot} type="button"
                        onClick={() => { setForm((p) => ({ ...p, workoutTime: slot, useCustomTime: false })); setErrors((e) => ({ ...e, workoutTime: undefined })); }}
                        className="rounded-[10px] px-3 py-2 text-[12px] font-[640] transition-all"
                        style={{
                          background: selected ? '#0f172a' : '#f8fafc',
                          color: selected ? '#fff' : '#64748b',
                          border: selected ? '1.5px solid #0f172a' : '1.5px solid #e2e8f0',
                        }}
                      >
                        {slot}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => { setForm((p) => ({ ...p, useCustomTime: true })); setErrors((e) => ({ ...e, workoutTime: undefined })); }}
                    className="flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-[12px] font-[640] transition-all"
                    style={{
                      background: form.useCustomTime ? '#F59E0B' : '#f8fafc',
                      color: form.useCustomTime ? '#fff' : '#64748b',
                      border: form.useCustomTime ? '1.5px solid #F59E0B' : '1.5px solid #e2e8f0',
                    }}
                  >
                    <Clock size={12} /> Custom
                  </button>
                </div>
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
                {errors.workoutTime && <p className="mt-1.5 text-[11px] font-medium" style={{ color: 'var(--danger)' }}>{errors.workoutTime}</p>}
              </div>

              {/* Preferred Training Days */}
              <div>
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
              <SearchableSelect
                label="Sessions Per Week" required allowCustom={false}
                value={form.sessionsPerWeek}
                onChange={(v) => { set('sessionsPerWeek', v); setErrors((e) => ({ ...e, sessionsPerWeek: undefined })); }}
                options={SESSIONS_OPTIONS}
                error={errors.sessionsPerWeek}
              />

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
                  { label: 'Sessions / Week', val: form.sessionsPerWeek || '—' },
                  { label: 'Estimated Sessions', val: estimatedSessions || '—' },
                  { label: 'Coach', val: form.trainerName || 'Coach Abhishek' },
                  { label: 'Training Mode', val: form.trainingMode || '—' },
                ].map((r) => (
                  <div key={r.label}>
                    <p className="text-[10.5px] text-white/40 font-[600]">{r.label}</p>
                    <AnimatePresence mode="wait">
                      <m.p
                        key={String(r.val)}
                        initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.15 }}
                        className="text-[13px] font-[720] text-white"
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
      </div>

      {/* ── STICKY FOOTER ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50" style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(15,23,42,0.08)' }}>
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
              {saving ? 'Saving...' : 'Continue'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
