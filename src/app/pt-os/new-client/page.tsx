'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Check, User, Mail, Phone, Calendar, Hash,
  Target, Ruler, Heart, Activity, Dumbbell, Sparkles,
  Camera, Upload, CheckCircle2, RefreshCw, Award, FileText, FileSpreadsheet, X,
} from 'lucide-react';
import { getSheetCacheSync, lookupByMobile, normalizeMobile } from '@/lib/sheet-import';
import { useRouter } from 'next/navigation';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { PremiumButton } from '@/components/premium/PremiumButton';
import { cn } from '@/components/ui/cn';
import { api } from '@/lib/api';

/* ────────────────────────────────────────────────────────────────────
   TYPES
──────────────────────────────────────────────────────────────────── */
type StepId = 1 | 2 | 3 | 4;

type Goal = 'Weight Loss' | 'Muscle Gain' | 'Endurance' | 'General Fitness' | 'Body Recomposition' | 'Flexibility & Mobility' | 'Sports Performance' | 'Fat Loss & Toning';

type Frequency = '1x/week' | '2x/week' | '3x/week' | '4x/week' | '5x/week';

interface FormData {
  name: string;
  email: string;
  phone: string;
  dob: string;
  gender: string;
  goal: Goal | '';
  height: string;
  weight: string;
  bodyFat: string;
  healthConditions: string[];
  injuries: string;
  trainer: string;
  frequency: Frequency | '';
  transformationGoals: string;
  plan: string;
  planId: string;
  basePrice: number | null;
  sellingPrice: number | null;
  startDate: string;
  endDate: string;
}

/* ────────────────────────────────────────────────────────────────────
   CONSTANTS
──────────────────────────────────────────────────────────────────── */
const STEPS = [
  { id: 1, label: 'Personal Info', icon: <User size={16} /> },
  { id: 2, label: 'Fitness Profile', icon: <Activity size={16} /> },
  { id: 3, label: 'PT Assignment', icon: <Dumbbell size={16} /> },
  { id: 4, label: 'Review & Confirm', icon: <FileText size={16} /> },
];

const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

const GOALS: Goal[] = ['Weight Loss', 'Muscle Gain', 'Endurance', 'General Fitness', 'Body Recomposition', 'Flexibility & Mobility', 'Sports Performance', 'Fat Loss & Toning'];

const HEALTH_CONDITIONS = [
  'Hypertension', 'Diabetes', 'Asthma', 'Heart Condition',
  'Joint Pain', 'Back Pain', 'Thyroid', 'None',
];

const FREQUENCIES: Frequency[] = ['1x/week', '2x/week', '3x/week', '4x/week', '5x/week'];

function fmtINR(n: number | string | null | undefined) {
  return '₹' + Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function initForm(): FormData {
  return {
    name: '', email: '', phone: '', dob: '', gender: 'Male',
    goal: '', height: '', weight: '', bodyFat: '',
    healthConditions: [], injuries: '',
    trainer: '', frequency: '',
    transformationGoals: '',
    plan: '',
    planId: '',
    basePrice: null,
    sellingPrice: null,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
  };
}

/* ────────────────────────────────────────────────────────────────────
   FLOAT INPUT
──────────────────────────────────────────────────────────────────── */
import FloatInput from '@/components/ui/FloatInput';

/* ────────────────────────────────────────────────────────────────────
   PREMIUM SELECT
──────────────────────────────────────────────────────────────────── */
function PremiumSelect<T extends string>({ label, value, onChange, options, placeholder }: {
  label: string; value: T; onChange: (v: T) => void; options: readonly T[] | T[]; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <p className="mb-2 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>{label}</p>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 rounded-[13px] px-4 py-3.5 text-left transition-all"
        style={{
          background: open ? 'var(--bg-card)' : 'var(--bg-subtle)',
          border: open ? '1.5px solid rgba(220,38,38,0.40)' : '1.5px solid rgba(15,23,42,0.09)',
          boxShadow: open ? '0 0 0 3px rgba(220,38,38,0.08)' : '0 1px 2px rgba(15,23,42,0.04)',
        }}
      >
        <span className={cn('text-[13px] font-[500]', value ? 'text-[rgb(15,23,42)]' : 'text-[rgb(148,163,184)]')}>
          {value || placeholder || `Select ${label}`}
        </span>
        <ChevronRight size={14} className="ml-auto" style={{ color: 'rgb(148,163,184)', transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 200ms' }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-[14px] p-1"
            style={{ background: 'var(--bg-card)', border: '1px solid rgba(15,23,42,0.09)', boxShadow: '0 12px 32px rgba(15,23,42,0.12)' }}
          >
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(opt); setOpen(false); }}
                className="flex w-full items-center justify-between rounded-[10px] px-3.5 py-2.5 text-[12.5px] font-[580] transition hover:bg-slate-50"
                style={{ color: 'rgb(30,30,40)' }}
              >
                {opt}
                {value === opt && <Check size={12} style={{ color: '#F59E0B' }} />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   STEP INDICATOR
──────────────────────────────────────────────────────────────────── */
function StepIndicator({ current, onStep }: { current: StepId; onStep: (s: StepId) => void }) {
  return (
    <div className="flex items-center gap-0 rounded-[16px] p-1.5"
      style={{ background: 'var(--bg-card)', border: '1px solid rgba(15,23,42,0.07)', boxShadow: '0 1px 4px rgba(15,23,42,0.04)' }}>
      {STEPS.map((s, i) => {
        const active = current === s.id;
        const done = current > s.id;
        return (
          <React.Fragment key={s.id}>
            {i > 0 && (
              <div className="h-px flex-1 mx-1" style={{ background: done ? '#F59E0B' : 'var(--border-2)', transition: 'background 0.3s' }} />
            )}
            <button
              type="button"
              onClick={() => { if (s.id <= current + 1) onStep(s.id as StepId); }}
              className={cn(
                'relative flex items-center gap-2 rounded-[12px] px-3.5 py-2.5 text-[12px] font-[680] transition-all',
              )}
              style={{
                background: active ? 'linear-gradient(135deg,#F59E0B,#D97706)' : done ? 'rgba(220,38,38,0.08)' : 'transparent',
                color: active ? '#fff' : done ? '#F59E0B' : 'rgb(148,163,184)',
                boxShadow: active ? '0 4px 16px rgba(220,38,38,0.25)' : 'none',
              }}
            >
              <span className={cn('flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-[800]',
                active ? 'bg-white/20 text-white' : done ? 'bg-[#F59E0B] text-white' : 'bg-zinc-100 text-zinc-400'
              )}>
                {done ? <Check size={10} strokeWidth={3} /> : s.id}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   LOADING SKELETON
──────────────────────────────────────────────────────────────────── */
function FormSkeleton() {
  return (
    <div className="rounded-[22px] p-6 sm:p-8 animate-pulse"
      style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 2px 20px rgba(15,23,42,0.07)' }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-[12px]" style={{ background: 'rgba(220,38,38,0.10)' }} />
        <div>
          <div className="h-4 w-32 rounded" style={{ background: 'var(--border-2)' }} />
          <div className="h-3 w-48 mt-1 rounded" style={{ background: 'var(--border)' }} />
        </div>
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-14 rounded-[13px]" style={{ background: 'var(--border)' }} />
          <div className="h-14 rounded-[13px]" style={{ background: 'var(--border)' }} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="h-14 rounded-[13px]" style={{ background: 'var(--border)' }} />
          <div className="h-14 rounded-[13px]" style={{ background: 'var(--border)' }} />
          <div className="h-14 rounded-[13px]" style={{ background: 'var(--border)' }} />
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   ERROR STATE
──────────────────────────────────────────────────────────────────── */
function DataErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-[22px] p-8 text-center"
      style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 2px 20px rgba(15,23,42,0.07)' }}>
      <div className="flex justify-center mb-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-[16px]" style={{ background: 'rgba(220,38,38,0.10)' }}>
          <RefreshCw size={22} style={{ color: '#F59E0B' }} />
        </div>
      </div>
      <h3 className="text-[16px] font-[760]" style={{ color: 'rgb(15,23,42)' }}>Failed to load data</h3>
      <p className="mt-1 text-[13px]" style={{ color: 'rgb(148,163,184)' }}>{message}</p>
      <PremiumButton tone="primary" glow icon={<RefreshCw size={13} />} onClick={onRetry} className="mt-4">
        Retry
      </PremiumButton>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   MAIN PAGE
──────────────────────────────────────────────────────────────────── */
export default function NewPTClientPage() {
  return <Guard><AppShell><NewClientWizard /></AppShell></Guard>;
}

function NewClientWizard() {
  const [step, setStep] = useState<StepId>(1);
  const [form, setForm] = useState<FormData>(initForm);
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [sheetRowCount, setSheetRowCount] = useState<number | null>(null);
  const [autofillNote, setAutofillNote] = useState('');
  const autofillTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── API State ── */
  const [trainers, setTrainers] = useState<string[]>([]);
  const [trainerIdMap, setTrainerIdMap] = useState<Record<string, string>>({});
  const [plans, setPlans] = useState<{ id: string; name: string; base_amount: number; duration_months: number }[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState('');

    const fetchData = useCallback(async () => {
      try {
        setDataLoading(true);
        setDataError('');
        const [trainersRes, plansRes] = await Promise.all([
          api.pt.trainers() as Promise<{ data: unknown[] }>,
          api.pt.plans.list() as Promise<{ data: unknown[] }>,
        ]);
        const arr = Array.isArray(trainersRes?.data) ? trainersRes.data : [];
        setTrainers(arr.map((t: any) => t.name ?? t));
        const map: Record<string, string> = {};
        arr.forEach((t: any) => { if (t.name && t.id) map[t.name] = t.id; });
        setTrainerIdMap(map);
        setPlans(Array.isArray(plansRes?.data) ? plansRes.data.map((p: any) => ({ id: p.id, name: p.name, base_amount: p.base_amount, duration_months: p.duration_months })) : []);
      } catch (err: any) {
        setDataError(err?.message || 'Failed to load data');
        setTrainers([]);
        setTrainerIdMap({});
        setPlans([]);
      } finally {
        setDataLoading(false);
      }
    }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Check for imported sheet cache on mount
  useEffect(() => {
    const cache = getSheetCacheSync();
    if (cache?.rowCount) setSheetRowCount(cache.rowCount);
  }, []);

  // Auto-fill 8 fields from imported sheet when phone number is entered
  useEffect(() => {
    if (autofillTimer.current) clearTimeout(autofillTimer.current);
    const digits = form.phone.replace(/\D/g, '');
    if (digits.length < 10) { setAutofillNote(''); return; }
    autofillTimer.current = setTimeout(() => {
      const rec = lookupByMobile(form.phone);
      if (!rec) return;
      let filled = 0;
      setForm(prev => {
        const next = { ...prev };
        // 1. Full Name
        const sheetName = rec.name || [rec.first_name, rec.last_name].filter(Boolean).join(' ');
        if (sheetName && !prev.name) { next.name = sheetName; filled++; }
        // 2. Gender
        const gMap: Record<string, string> = { male: 'Male', female: 'Female', other: 'Other', 'm': 'Male', 'f': 'Female' };
        const gKey = (rec.gender || '').toLowerCase().trim();
        const mappedGender = gMap[gKey] || rec.gender || '';
        if (mappedGender && GENDERS.includes(mappedGender)) { next.gender = mappedGender; filled++; }
        // 3. Primary Fitness Goal — fuzzy match to GOALS list
        if (rec.interested_in) {
          const goalNorm = rec.interested_in.toLowerCase().replace(/[^a-z ]/g, '').trim();
          const matched = GOALS.find(g => g.toLowerCase().includes(goalNorm) || goalNorm.includes(g.toLowerCase().replace(/[^a-z ]/g, '')));
          if (matched) { next.goal = matched as typeof next.goal; filled++; }
        }
        // 4. Trainer — match against loaded trainers (case-insensitive)
        if (rec.trainer_name && trainers.length) {
          const tNorm = rec.trainer_name.toLowerCase().trim();
          const matchedTrainer = trainers.find(t => t.toLowerCase() === tNorm || t.toLowerCase().includes(tNorm) || tNorm.includes(t.toLowerCase()));
          if (matchedTrainer) { next.trainer = matchedTrainer; filled++; }
        }
        // 5. Subscription Plan — match by name against loaded plans
        if (rec.package_type && plans.length) {
          const pNorm = rec.package_type.toLowerCase().trim();
          const matchedPlan = plans.find(p => p.name.toLowerCase() === pNorm || p.name.toLowerCase().includes(pNorm) || pNorm.includes(p.name.toLowerCase()));
          if (matchedPlan) {
            let ed = prev.endDate;
            if (prev.startDate && matchedPlan.duration_months > 0) {
              const d = new Date(prev.startDate);
              d.setMonth(d.getMonth() + matchedPlan.duration_months);
              ed = d.toISOString().slice(0, 10);
            }
            next.planId = matchedPlan.id;
            next.plan = matchedPlan.name;
            next.basePrice = matchedPlan.base_amount != null ? Number(matchedPlan.base_amount) : null;
            next.endDate = ed;
            filled++;
          }
        }
        // 6. Start Date
        if (rec.pt_start_date && !prev.startDate) { next.startDate = rec.pt_start_date; filled++; }
        // 7. Selling Price
        if (rec.paid_amount) {
          const sp = parseFloat(rec.paid_amount);
          if (!isNaN(sp) && prev.sellingPrice === null) { next.sellingPrice = sp; filled++; }
        }
        return next;
      });
      if (filled > 0) setAutofillNote(`Auto-filled ${filled} field${filled > 1 ? 's' : ''} from imported sheet`);
    }, 350);
    return () => { if (autofillTimer.current) clearTimeout(autofillTimer.current); };
  }, [form.phone, trainers, plans]);

  const trainerOptions = trainers;

  const set = useCallback(<K extends keyof FormData>(key: K, val: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  }, []);

  const toggleCondition = (cond: string) => {
    setForm((prev) => ({
      ...prev,
      healthConditions: prev.healthConditions.includes(cond)
        ? prev.healthConditions.filter((c) => c !== cond)
        : [...prev.healthConditions, cond],
    }));
  };

  const validateStep = (s: StepId): string | null => {
    if (s === 1) {
      if (!form.name.trim()) return 'Full name is required.';
      if (!form.phone.trim()) return 'Phone number is required.';
    }
    if (s === 2) {
      if (!form.goal) return 'Please select a fitness goal.';
    }
    if (s === 3) {
      if (!form.trainer) return 'Please select a trainer.';
      if (!form.planId) return 'Please select a subscription plan.';
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setError('');
    setStep((s) => Math.min(s + 1, 4) as StepId);
  };

  const handlePrev = () => {
    setError('');
    setStep((s) => Math.max(s - 1, 1) as StepId);
  };

  const handleSubmit = async () => {
    setError('');
    if (!form.name.trim()) { setError('Name is required.'); return; }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setError('Invalid email format.'); return; }
    if (!form.transformationGoals) { setError('Please describe transformation goals.'); return; }
    if (form.transformationGoals.length > 1000) { setError('Transformation goals must be under 1000 characters.'); return; }
    setSaving(true);
      try {
        const disc = form.basePrice && form.sellingPrice ? (form.basePrice - form.sellingPrice) : 0;
        const selling = form.sellingPrice ?? 0;
        const selectedPlan = form.planId ? plans.find(p => p.id === form.planId) : undefined;
        const res = await api.pt.create({
          name: form.name.trim(),
          email: form.email.trim() || undefined,
          mobile: form.phone.trim() || undefined,
          dob: form.dob || undefined,
          gender: form.gender,
          trainer_id: trainerIdMap[form.trainer] || undefined,
          trainer_name: form.trainer || undefined,
          package_type: form.plan || undefined,
          duration_months: selectedPlan?.duration_months || undefined,

          goal: form.goal || undefined,
          height: form.height ? Number(form.height) : undefined,
          weight: form.weight ? Number(form.weight) : undefined,
          body_fat: form.bodyFat ? Number(form.bodyFat) : undefined,
          health_conditions: form.healthConditions.length ? form.healthConditions.join(', ') : undefined,
          injuries: form.injuries.trim() || undefined,
          frequency: form.frequency || undefined,

          notes: form.transformationGoals,
          base_amount: form.basePrice != null ? Number(form.basePrice) : null,
          discount: Number(disc),
          monthly_pt_amount: Number(selling),
          pt_start_date: form.startDate,
          pt_end_date: form.endDate || undefined,
          pt_package_id: form.planId || undefined,
        } as Record<string, unknown>);
      const created = (res as any)?.data;
      setDone(true);
      setShowSuccess(true);
      setCreatedId(created?.id || null);
      if (photoPreview && created?.id) {
        try {
          await api.pt.uploadPhoto(created.id, photoPreview);
        } catch {} // non-blocking
      }
    } catch (err: any) {
      console.error('Submit error:', err);
      const payload = err?.payload;
      const fields = payload?.error?.fields;
      if (fields && typeof fields === 'object') {
        const msgs = Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join('; ');
        setError(msgs);
      } else {
        setError(err?.message || 'Failed to create client');
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  /* ── SUCCESS MODAL ── */
  if (showSuccess) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex min-h-[80vh] items-center justify-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="flex flex-col items-center text-center max-w-md mx-auto"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
            className="flex h-24 w-24 items-center justify-center rounded-[28px] mb-6"
            style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)', boxShadow: '0 20px 60px rgba(220,38,38,0.3)' }}
          >
            <CheckCircle2 size={44} color="white" />
          </motion.div>
          <h2 className="text-[28px] font-[860] tracking-[-0.03em]" style={{ color: 'rgb(15,23,42)' }}>Client Onboarded!</h2>
          <p className="mt-2 text-[15px]" style={{ color: 'rgb(148,163,184)' }}>
            {form.name} has been registered with personal trainer {form.trainer}.
          </p>
          <div className="mt-6 flex gap-3">
            <PremiumButton tone="primary" glow onClick={() => { setShowSuccess(false); setDone(false); setForm(initForm); setStep(1); setPhotoPreview(null); }}>
              Onboard Another
            </PremiumButton>
            <PremiumButton tone="secondary" onClick={() => router.push(`/pt-os/clients/${createdId}`)}>View Client Profile</PremiumButton>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(145deg,#f8fafc 0%,#f1f5f9 50%,#fafafe 100%)' }}>
      {/* ── HEADER ── */}
      <div className="sticky top-0 z-40 border-b" style={{ background: 'var(--bg-card)', backdropFilter: 'blur(20px)', borderColor: 'var(--border)' }}>
        <div className="mx-auto max-w-screen-xl px-5 py-4 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-[12px]" style={{ background: 'rgba(220,38,38,0.10)' }}>
                  <Award size={16} style={{ color: '#F59E0B' }} />
                </div>
                <div>
                  <h1 className="text-[22px] font-[860] tracking-[-0.03em]" style={{ color: 'rgb(15,23,42)' }}>New PT Client</h1>
                  <p className="text-[11px] font-[600] uppercase tracking-[0.08em]" style={{ color: 'rgb(148,163,184)' }}>
                    Personal Training / <span style={{ color: '#F59E0B' }}>New Client</span>
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-[600]" style={{ color: 'rgb(148,163,184)' }}>Step {step} of 4</span>
              <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-2)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg,#F59E0B,#D97706)' }}
                  animate={{ width: `${(step / 4) * 100}%` }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-screen-xl px-5 py-6 sm:px-8">
        {dataLoading ? (
          <FormSkeleton />
        ) : dataError ? (
          <DataErrorState message={dataError} onRetry={fetchData} />
        ) : (
          <>
            {/* Sheet import banner */}
            {sheetRowCount !== null && (
              <div className="mb-4 flex items-center gap-2.5 rounded-[13px] px-4 py-3"
                style={{ background: 'rgba(13,148,136,0.07)', border: '1px solid rgba(13,148,136,0.2)' }}>
                <FileSpreadsheet size={14} style={{ color: '#0d9488', flexShrink: 0 }} />
                <span className="text-[12.5px] font-[600]" style={{ color: '#065f46' }}>
                  {sheetRowCount} records imported — enter phone number to auto-fill all fields
                </span>
                <button onClick={() => setSheetRowCount(null)} className="ml-auto" style={{ color: '#9ca3af', lineHeight: 0 }}>
                  <X size={13} />
                </button>
              </div>
            )}

            {/* Step Indicator */}
            <StepIndicator current={step} onStep={(s) => { if (s <= step + 1) { setStep(s); setError(''); } }} />

            {error && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                className="mt-4 rounded-[13px] p-3.5 text-[13px] font-[500]"
                style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#9f1239' }}
              >
                {error}
              </motion.div>
            )}

            {/* Step Content */}
            <div className="mt-6">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div key="step1" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
                    <div className="rounded-[22px] p-6 sm:p-8" style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 2px 20px rgba(15,23,42,0.07)' }}>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="flex h-10 w-10 items-center justify-center rounded-[12px]" style={{ background: 'rgba(220,38,38,0.10)' }}>
                          <User size={18} style={{ color: '#F59E0B' }} />
                        </div>
                        <div>
                          <h2 className="text-[17px] font-[760] tracking-[-0.02em]" style={{ color: 'rgb(15,23,42)' }}>Personal Information</h2>
                          <p className="text-[12.5px]" style={{ color: 'rgb(148,163,184)' }}>Basic details to create the client profile.</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FloatInput label="Full Name" required value={form.name} onChange={(v) => set('name', v)} />
                          <FloatInput label="Email Address" type="email" value={form.email} onChange={(v) => set('email', v)} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <FloatInput label="Phone Number" type="tel" required value={form.phone} onChange={(v) => set('phone', v)} />
                            {autofillNote && (
                              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                                className="mt-1.5 flex items-center gap-1.5 rounded-[8px] px-2.5 py-1.5"
                                style={{ background: 'rgba(13,148,136,0.08)', border: '1px solid rgba(13,148,136,0.2)' }}>
                                <CheckCircle2 size={11} style={{ color: '#0d9488', flexShrink: 0 }} />
                                <span className="text-[11px] font-[600]" style={{ color: '#065f46' }}>{autofillNote}</span>
                              </motion.div>
                            )}
                          </div>
                          <FloatInput label="Date of Birth" type="date" value={form.dob} onChange={(v) => set('dob', v)} />
                          <div>
                            <p className="mb-2 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Gender</p>
                            <div className="flex gap-2 flex-wrap">
                              {GENDERS.map((g) => (
                                <button
                                  key={g}
                                  type="button"
                                  onClick={() => set('gender', g)}
                                  className={cn(
                                    'rounded-[10px] px-3.5 py-2 text-[12px] font-[600] transition-all',
                                    form.gender === g
                                      ? 'text-white shadow-[0_2px_8px_rgba(220,38,38,0.2)]'
                                      : 'text-zinc-500 hover:text-zinc-800'
                                  )}
                                  style={{
                                    background: form.gender === g ? 'linear-gradient(135deg,#F59E0B,#D97706)' : 'var(--bg-subtle)',
                                    border: form.gender === g ? '1.5px solid transparent' : '1.5px solid rgba(15,23,42,0.09)',
                                  }}
                                >
                                  {g}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div key="step2" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
                    <div className="rounded-[22px] p-6 sm:p-8" style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 2px 20px rgba(15,23,42,0.07)' }}>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="flex h-10 w-10 items-center justify-center rounded-[12px]" style={{ background: 'rgba(220,38,38,0.10)' }}>
                          <Activity size={18} style={{ color: '#F59E0B' }} />
                        </div>
                        <div>
                          <h2 className="text-[17px] font-[760] tracking-[-0.02em]" style={{ color: 'rgb(15,23,42)' }}>Fitness Profile</h2>
                          <p className="text-[12.5px]" style={{ color: 'rgb(148,163,184)' }}>Goals, measurements, and health assessment.</p>
                        </div>
                      </div>
                      <div className="space-y-5">
                        {/* Goals */}
                        <div>
                          <p className="mb-2.5 text-[13px] font-[700]" style={{ color: 'rgb(15,23,42)' }}>Primary Fitness Goal <span style={{ color: '#F59E0B' }}>*</span></p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            {GOALS.map((g) => (
                              <button
                                key={g}
                                type="button"
                                onClick={() => set('goal', g)}
                                className={cn(
                                  'rounded-[14px] p-3.5 text-center transition-all',
                                )}
                                style={{
                                  background: form.goal === g ? 'linear-gradient(135deg,#F59E0B,#D97706)' : 'var(--bg-subtle)',
                                  border: form.goal === g ? '1.5px solid transparent' : '1.5px solid rgba(15,23,42,0.09)',
                                  boxShadow: form.goal === g ? '0 4px 16px rgba(220,38,38,0.2)' : 'none',
                                  color: form.goal === g ? '#fff' : 'rgb(15,23,42)',
                                }}
                              >
                                <div className="flex justify-center mb-1">
                                  {g === 'Weight Loss' ? <Target size={18} /> : g === 'Muscle Gain' ? <Dumbbell size={18} /> : g === 'Endurance' ? <Heart size={18} /> : <Sparkles size={18} />}
                                </div>
                                <span className="text-[11px] font-[680]">{g}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Body Measurements */}
                        <p className="mb-2 text-[13px] font-[700]" style={{ color: 'rgb(15,23,42)' }}>Body Measurements</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <FloatInput label="Height (cm)" type="number" value={form.height} onChange={(v) => set('height', v)} />
                          <FloatInput label="Weight (kg)" type="number" value={form.weight} onChange={(v) => set('weight', v)} />
                          <FloatInput label="Body Fat %" type="number" value={form.bodyFat} onChange={(v) => set('bodyFat', v)} />
                        </div>

                        {/* Health Conditions */}
                        <div>
                          <p className="mb-2.5 text-[13px] font-[700]" style={{ color: 'rgb(15,23,42)' }}>Health Conditions</p>
                          <div className="flex flex-wrap gap-2">
                            {HEALTH_CONDITIONS.map((cond) => (
                              <button
                                key={cond}
                                type="button"
                                onClick={() => toggleCondition(cond)}
                                className={cn(
                                  'rounded-[10px] px-3.5 py-2 text-[12px] font-[600] transition-all',
                                )}
                                style={{
                                  background: form.healthConditions.includes(cond) ? 'rgba(220,38,38,0.10)' : 'var(--bg-subtle)',
                                  border: form.healthConditions.includes(cond) ? '1.5px solid rgba(220,38,38,0.30)' : '1.5px solid rgba(15,23,42,0.09)',
                                  color: form.healthConditions.includes(cond) ? '#F59E0B' : 'rgb(100,116,139)',
                                }}
                              >
                                {form.healthConditions.includes(cond) && <Check size={11} className="inline mr-1" />}
                                {cond}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Injuries */}
                        <div>
                          <p className="mb-2 text-[13px] font-[700]" style={{ color: 'rgb(15,23,42)' }}>Injuries / Medical Notes</p>
                          <FloatInput label="Describe any injuries or medical concerns" value={form.injuries} onChange={(v) => set('injuries', v)} />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div key="step3" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
                    <div className="rounded-[22px] p-6 sm:p-8" style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 2px 20px rgba(15,23,42,0.07)' }}>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="flex h-10 w-10 items-center justify-center rounded-[12px]" style={{ background: 'rgba(220,38,38,0.10)' }}>
                          <Dumbbell size={18} style={{ color: '#F59E0B' }} />
                        </div>
                        <div>
                          <h2 className="text-[17px] font-[760] tracking-[-0.02em]" style={{ color: 'rgb(15,23,42)' }}>PT Assignment</h2>
                          <p className="text-[12.5px]" style={{ color: 'rgb(148,163,184)' }}>Assign trainer and set pricing.</p>
                        </div>
                      </div>
                      <div className="space-y-5">
                        {/* Trainer Selector */}
                        <PremiumSelect
                          label="Select Trainer *"
                          value={form.trainer}
                          onChange={(v) => set('trainer', v)}
                          options={trainerOptions}
                          placeholder="Choose a personal trainer"
                        />

                        {/* Subscription Plan */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Subscription Plan</p>
                            <a href="/pt-os/plans" target="_blank" rel="noopener noreferrer"
                              className="text-[11px] font-[660] transition-all hover:underline"
                              style={{ color: '#F59E0B' }}>
                              + Manage Plans
                            </a>
                          </div>
                          <div className="relative">
                            <select
                              value={form.planId}
                              onChange={(e) => {
                                const selected = plans.find(p => p.id === e.target.value);
                                if (selected) {
                                  setForm(prev => {
                                    let ed = prev.endDate;
                                    if (prev.startDate && selected.duration_months > 0) {
                                      const d = new Date(prev.startDate);
                                      d.setMonth(d.getMonth() + selected.duration_months);
                                      ed = d.toISOString().slice(0, 10);
                                    }
                                    return {
                                      ...prev,
                                      planId: selected.id,
                                      plan: selected.name,
                                      basePrice: selected.base_amount != null ? Number(selected.base_amount) : null,
                                      endDate: ed,
                                    };
                                  });
                                } else {
                                  set('planId', '');
                                  set('plan', '');
                                }
                              }}
                              className="w-full rounded-[13px] px-4 py-3.5 text-[13px] font-[500] outline-none transition-all appearance-none cursor-pointer"
                              style={{
                                background: 'var(--bg-subtle)',
                                border: '1.5px solid rgba(15,23,42,0.09)',
                                color: form.planId ? 'rgb(15,23,42)' : 'rgb(148,163,184)',
                              }}>
                              <option value="">Select a plan…</option>
                              {plans.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.name} — {fmtINR(p.base_amount)} / {p.duration_months}mo
                                </option>
                              ))}
                            </select>
                            <svg className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                              width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
                              style={{ color: 'rgb(148,163,184)' }}>
                              <path d="m6 9 6 6 6-6" />
                            </svg>
                          </div>
                        </div>

                        {/* Start Date */}
                        <div>
                          <p className="mb-2 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Start Date *</p>
                          <input
                            type="date"
                            value={form.startDate}
                            onChange={(e) => {
                              const sd = e.target.value;
                              setForm(prev => {
                                const plan = plans.find(p => p.id === prev.planId);
                                const months = plan?.duration_months ?? 0;
                                let ed = '';
                                if (sd && months > 0) {
                                  const d = new Date(sd);
                                  d.setMonth(d.getMonth() + months);
                                  ed = d.toISOString().slice(0, 10);
                                }
                                return { ...prev, startDate: sd, endDate: ed };
                              });
                            }}
                            className="w-full rounded-[13px] px-4 py-3.5 text-[13px] font-[500] outline-none transition-all"
                            style={{
                              background: 'var(--bg-subtle)',
                              border: '1.5px solid rgba(15,23,42,0.09)',
                              color: 'rgb(15,23,42)',
                            }}
                          />
                        </div>

                        {/* End Date (auto-calculated, read-only) */}
                        {form.endDate && (
                          <div>
                            <p className="mb-2 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>End Date</p>
                            <div
                              className="w-full rounded-[13px] px-4 py-3.5 text-[13px] font-[500]"
                              style={{
                                background: 'rgba(220,38,38,0.05)',
                                border: '1.5px solid rgba(220,38,38,0.15)',
                                color: 'rgb(100,116,139)',
                              }}
                            >
                              {new Date(form.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>
                          </div>
                        )}

                        {/* Base Price */}
                        <FloatInput
                          label="Base Price (₹)"
                          required
                          value={String(form.basePrice ?? '')}
                          onChange={(v) => {
                            const num = parseFloat(v);
                            set('basePrice', isNaN(num) ? null : num);
                          }}
                          placeholder="Enter base price"
                        />

                        {/* Selling Price */}
                        <FloatInput
                          label="Selling Price (₹)"
                          required
                          value={String(form.sellingPrice ?? '')}
                          onChange={(v) => {
                            const num = parseFloat(v);
                            set('sellingPrice', isNaN(num) ? null : num);
                          }}
                          placeholder="Enter selling price"
                        />

                        {/* Session Frequency */}
                        <PremiumSelect
                          label="Session Frequency *"
                          value={form.frequency}
                          onChange={(v) => set('frequency', v)}
                          options={FREQUENCIES}
                          placeholder="Select weekly frequency"
                        />

                        {/* Summary */}
                        {form.trainer && form.frequency && form.basePrice !== null && form.sellingPrice !== null && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="rounded-[14px] p-4"
                            style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)' }}
                          >
                            <p className="text-[12px] font-[700] tracking-wider uppercase" style={{ color: '#F59E0B' }}>Assignment Summary</p>
                            <div className="mt-2 space-y-1 text-[13px]" style={{ color: 'rgb(100,116,139)' }}>
                              <p>Trainer: <strong style={{ color: 'rgb(15,23,42)' }}>{form.trainer}</strong></p>
                              {form.plan && <p>Plan: <strong style={{ color: 'rgb(15,23,42)' }}>{form.plan}</strong></p>}
                              <p>Base Price: <strong style={{ color: 'rgb(15,23,42)' }}>{fmtINR(form.basePrice)}</strong></p>
                              <p>Selling Price: <strong style={{ color: 'rgb(15,23,42)' }}>{fmtINR(form.sellingPrice)}</strong></p>
                              <p>Frequency: <strong style={{ color: 'rgb(15,23,42)' }}>{form.frequency}</strong></p>
                              <p>Start: <strong style={{ color: 'rgb(15,23,42)' }}>{new Date(form.startDate).toLocaleDateString('en-IN')}</strong></p>
                              {form.endDate && <p>End: <strong style={{ color: 'rgb(15,23,42)' }}>{new Date(form.endDate).toLocaleDateString('en-IN')}</strong></p>}
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 4 && (
                  <motion.div key="step4" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
                    <div className="rounded-[22px] p-6 sm:p-8" style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 2px 20px rgba(15,23,42,0.07)' }}>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="flex h-10 w-10 items-center justify-center rounded-[12px]" style={{ background: 'rgba(220,38,38,0.10)' }}>
                          <FileText size={18} style={{ color: '#F59E0B' }} />
                        </div>
                        <div>
                          <h2 className="text-[17px] font-[760] tracking-[-0.02em]" style={{ color: 'rgb(15,23,42)' }}>Review & Confirm</h2>
                          <p className="text-[12.5px]" style={{ color: 'rgb(148,163,184)' }}>Verify all details before onboarding.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {[
                          { title: 'Personal Info', items: [
                            { k: 'Name', v: form.name },
                            { k: 'Email', v: form.email },
                            { k: 'Phone', v: form.phone },
                            { k: 'DOB', v: form.dob || '—' },
                            { k: 'Gender', v: form.gender },
                          ]},
                          { title: 'Fitness Profile', items: [
                            { k: 'Goal', v: form.goal },
                            { k: 'Height', v: `${form.height} cm` },
                            { k: 'Weight', v: `${form.weight} kg` },
                            { k: 'Body Fat', v: form.bodyFat ? `${form.bodyFat}%` : '—' },
                            { k: 'Conditions', v: form.healthConditions.length ? form.healthConditions.join(', ') : 'None' },
                            { k: 'Injuries', v: form.injuries || 'None' },
                          ]},
                          { title: 'PT Assignment', items: [
                            { k: 'Trainer', v: form.trainer },
                            { k: 'Plan', v: form.plan || '—' },
                            { k: 'Base Price', v: form.basePrice ? fmtINR(form.basePrice) : '—' },
                            { k: 'Selling Price', v: form.sellingPrice ? fmtINR(form.sellingPrice) : '—' },
                            { k: 'Frequency', v: form.frequency },
                            { k: 'Start Date', v: new Date(form.startDate).toLocaleDateString('en-IN') },
                            { k: 'End Date', v: form.endDate ? new Date(form.endDate).toLocaleDateString('en-IN') : '—' },
                          ]},
                          { title: 'Photo', items: [
                            { k: 'Photo Upload', v: photoPreview ? 'Uploaded ✓' : 'Not uploaded' },
                          ]},
                        ].map((section) => (
                          <div key={section.title}
                            className="rounded-[14px] p-4"
                            style={{ background: 'var(--bg-subtle)', border: '1px solid rgba(15,23,42,0.07)' }}
                          >
                            <p className="text-[11px] font-[700] uppercase tracking-wider mb-3" style={{ color: 'rgb(148,163,184)' }}>{section.title}</p>
                            <div className="space-y-1.5">
                              {section.items.map((item) => (
                                <div key={item.k} className="flex justify-between">
                                  <span className="text-[12px]" style={{ color: 'rgb(148,163,184)' }}>{item.k}</span>
                                  <span className="text-[12px] font-[650]" style={{ color: 'rgb(15,23,42)' }}>{item.v}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Transformation Goals */}
                      <div className="mb-6">
                        <p className="mb-2.5 text-[13px] font-[700]" style={{ color: 'rgb(15,23,42)' }}>Transformation Goals <span style={{ color: '#F59E0B' }}>*</span></p>
                        <FloatInput
                          label="Describe what the client wants to achieve..."
                          value={form.transformationGoals}
                          onChange={(v) => set('transformationGoals', v)}
                          multiline
                        />
                      </div>

                      {/* Photo Upload */}
                      <div>
                        <p className="mb-2.5 text-[13px] font-[700]" style={{ color: 'rgb(15,23,42)' }}>Client Photo</p>
                        <label className="relative flex cursor-pointer items-center justify-center rounded-[16px] border-2 border-dashed p-8 transition-all hover:bg-white/50"
                          style={{ borderColor: 'rgba(220,38,38,0.25)', background: 'rgba(248,250,252,0.7)' }}>
                          <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                          {photoPreview ? (
                            <div className="text-center">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={photoPreview} alt="Preview" className="mx-auto h-24 w-24 rounded-[14px] object-cover shadow-md" />
                              <p className="mt-2 text-[12px] font-[600]" style={{ color: '#10b981' }}>Photo uploaded</p>
                            </div>
                          ) : (
                            <div className="text-center">
                              <div className="flex justify-center mb-2">
                                <Camera size={28} style={{ color: 'rgb(148,163,184)' }} />
                              </div>
                              <p className="text-[13px] font-[600]" style={{ color: 'rgb(148,163,184)' }}>Click to upload client photo</p>
                              <p className="text-[11px] mt-1" style={{ color: 'rgb(203,213,225)' }}>JPG or PNG, max 5MB</p>
                            </div>
                          )}
                        </label>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Navigation Bar */}
            <div className="sticky-above-mobile-nav mt-6 z-40 rounded-[18px] p-4"
              style={{ background: 'var(--bg-card)', backdropFilter: 'blur(20px)', border: '1px solid rgba(15,23,42,0.07)', boxShadow: '0 -4px 24px rgba(15,23,42,0.06)' }}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {step > 1 && (
                    <PremiumButton tone="secondary" icon={<ChevronLeft size={14} />} onClick={handlePrev}>
                      Back
                    </PremiumButton>
                  )}
                  <span className="text-[12px] font-[600]" style={{ color: 'rgb(148,163,184)' }}>
                    Step {step} of 4 · {STEPS[step - 1].label}
                  </span>
                </div>
                <div className="flex gap-3">
                  {step < 4 ? (
                    <PremiumButton tone="primary" icon={<ChevronRight size={14} />} onClick={handleNext}>
                      Next Step
                    </PremiumButton>
                  ) : (
                    <PremiumButton tone="success" glow icon={saving ? undefined : <Check size={14} />} onClick={handleSubmit} loading={saving} disabled={saving || done}>
                      {done ? 'Onboarded!' : 'Confirm & Onboard'}
                    </PremiumButton>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
