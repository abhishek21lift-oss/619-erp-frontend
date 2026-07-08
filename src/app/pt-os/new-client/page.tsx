'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Check, User, Mail, Phone, Calendar,
  Activity, Dumbbell, Camera, CheckCircle2, RefreshCw, Award,
  FileText, FileSpreadsheet, X, Scale, Timer, Zap, Wind, Trophy,
  Flame, ArrowLeftRight, Heart,
} from 'lucide-react';
import { getSheetCacheSync, lookupByMobile, normalizeMobile } from '@/lib/sheet-import';
import { useRouter } from 'next/navigation';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { PremiumButton } from '@/components/premium/PremiumButton';
import { cn } from '@/components/ui/cn';
import { api } from '@/lib/api';
import FloatInput from '@/components/ui/FloatInput';

/* ─────────────────────────────────────────────────────── TYPES */
type StepId = 1 | 2 | 3 | 4;
type Goal = 'Weight Loss' | 'Muscle Gain' | 'Endurance' | 'General Fitness' | 'Body Recomposition' | 'Flexibility & Mobility' | 'Sports Performance' | 'Fat Loss & Toning';
type Frequency = '1x/week' | '2x/week' | '3x/week' | '4x/week' | '5x/week';

interface FormData {
  name: string; email: string; phone: string; dob: string; gender: string;
  goal: Goal | ''; height: string; weight: string; bodyFat: string;
  healthConditions: string[]; injuries: string;
  trainer: string; frequency: Frequency | '';
  transformationGoals: string;
  plan: string; planId: string;
  basePrice: number | null; sellingPrice: number | null;
  startDate: string; endDate: string;
}

/* ─────────────────────────────────────────────────────── CONSTANTS */
const STEPS: { id: StepId; label: string; sub: string }[] = [
  { id: 1, label: 'Personal Info',    sub: 'Name, contact & identity' },
  { id: 2, label: 'Fitness Profile',  sub: 'Goals, body & health' },
  { id: 3, label: 'PT Assignment',    sub: 'Plan, pricing & schedule' },
  { id: 4, label: 'Review & Confirm', sub: 'Verify and onboard' },
];

const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

const GOALS: Goal[] = [
  'Weight Loss', 'Muscle Gain', 'Endurance', 'General Fitness',
  'Body Recomposition', 'Flexibility & Mobility', 'Sports Performance', 'Fat Loss & Toning',
];

type GoalMeta = { Icon: React.FC<{ size?: number; strokeWidth?: number }>; color: string; bg: string };
const GOAL_META: Record<Goal, GoalMeta> = {
  'Weight Loss':          { Icon: Scale,          color: '#ef4444', bg: 'rgba(239,68,68,0.10)' },
  'Muscle Gain':          { Icon: Dumbbell,        color: '#3b82f6', bg: 'rgba(59,130,246,0.10)' },
  'Endurance':            { Icon: Timer,           color: '#10b981', bg: 'rgba(16,185,129,0.10)' },
  'General Fitness':      { Icon: Zap,             color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)' },
  'Body Recomposition':   { Icon: ArrowLeftRight,  color: '#f59e0b', bg: 'rgba(245,158,11,0.10)' },
  'Flexibility & Mobility': { Icon: Wind,          color: '#ec4899', bg: 'rgba(236,72,153,0.10)' },
  'Sports Performance':   { Icon: Trophy,          color: '#6366f1', bg: 'rgba(99,102,241,0.10)' },
  'Fat Loss & Toning':    { Icon: Flame,           color: '#f97316', bg: 'rgba(249,115,22,0.10)' },
};

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
    plan: '', planId: '',
    basePrice: null, sellingPrice: null,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
  };
}

/* ─────────────────────────────────────────────────────── PREMIUM SELECT */
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
          border: open ? '1.5px solid rgba(245,158,11,0.50)' : '1.5px solid rgba(15,23,42,0.09)',
          boxShadow: open ? '0 0 0 3px rgba(245,158,11,0.08)' : '0 1px 2px rgba(15,23,42,0.04)',
        }}
      >
        <span className={cn('flex-1 text-[13px] font-[500]', value ? 'text-[rgb(15,23,42)]' : 'text-[rgb(148,163,184)]')}>
          {value || placeholder || `Select ${label}`}
        </span>
        <ChevronRight size={14} style={{ color: 'rgb(148,163,184)', transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 200ms', flexShrink: 0 }} />
      </button>
      <AnimatePresence>
        {open && (
          <m.div
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
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── STEP INDICATOR */
function StepIndicator({ current, onStep }: { current: StepId; onStep: (s: StepId) => void }) {
  return (
    <div className="flex items-center px-1">
      {STEPS.map((s, i) => {
        const done = current > s.id;
        const active = current === s.id;
        return (
          <React.Fragment key={s.id}>
            <div className="flex flex-col items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => { if (s.id <= current + 1) onStep(s.id as StepId); }}
                className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-[800] transition-all duration-300"
                style={{
                  background: done ? '#F59E0B' : active ? '#0f172a' : '#f1f5f9',
                  color: done || active ? '#fff' : '#94a3b8',
                  boxShadow: active ? '0 0 0 4px rgba(15,23,42,0.10), 0 2px 8px rgba(15,23,42,0.14)' : 'none',
                  transform: active ? 'scale(1.08)' : 'scale(1)',
                }}
              >
                <AnimatePresence mode="wait">
                  {done ? (
                    <m.span key="ck" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ duration: 0.2 }}>
                      <Check size={15} strokeWidth={3} />
                    </m.span>
                  ) : (
                    <m.span key="nm" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ duration: 0.15 }}>
                      {s.id}
                    </m.span>
                  )}
                </AnimatePresence>
              </button>
              <div className="hidden sm:flex flex-col items-center gap-0.5">
                <span className={cn('text-[11.5px] font-[680] tracking-tight whitespace-nowrap', active ? 'text-[#0f172a]' : done ? 'text-[#F59E0B]' : 'text-slate-400')}>
                  {s.label}
                </span>
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div className="relative flex-1 h-[2px] mx-3 mb-5 sm:mb-0 rounded-full overflow-hidden" style={{ background: '#e2e8f0' }}>
                <m.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ background: 'linear-gradient(90deg, #F59E0B, #D97706)' }}
                  animate={{ width: done ? '100%' : '0%' }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────── SKELETONS */
function FormSkeleton() {
  return (
    <div className="rounded-[24px] p-8 animate-pulse" style={{ background: '#fff', border: '1px solid #f1f5f9', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
      <div className="flex items-center gap-4 mb-8">
        <div className="h-12 w-12 rounded-[16px]" style={{ background: '#f1f5f9' }} />
        <div className="space-y-2">
          <div className="h-4 w-36 rounded-full" style={{ background: '#f1f5f9' }} />
          <div className="h-3 w-52 rounded-full" style={{ background: '#f8fafc' }} />
        </div>
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-[14px]" style={{ background: '#f8fafc' }} />)}
      </div>
    </div>
  );
}

function DataErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-[24px] p-12 text-center" style={{ background: '#fff', border: '1px solid #f1f5f9', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[20px]" style={{ background: 'rgba(239,68,68,0.08)' }}>
        <RefreshCw size={24} style={{ color: '#ef4444' }} />
      </div>
      <h3 className="text-[17px] font-[760] text-slate-900">Failed to load data</h3>
      <p className="mt-1.5 text-[13px] text-slate-500">{message}</p>
      <div className="mt-5">
        <PremiumButton tone="primary" glow icon={<RefreshCw size={13} />} onClick={onRetry}>Retry</PremiumButton>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── PAGE EXPORT */
export default function NewPTClientPage() {
  return <Guard><AppShell><NewClientWizard /></AppShell></Guard>;
}

/* ─────────────────────────────────────────────────────── MAIN WIZARD */
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
      // auto-assign to the first (and only) trainer
      if (arr.length > 0) {
        const first = arr[0] as any;
        if (first.name) setForm(f => ({ ...f, trainer: first.name }));
      }
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

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const cache = getSheetCacheSync();
    if (cache?.rowCount) setSheetRowCount(cache.rowCount);
  }, []);

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
        const sheetName = rec.name || [rec.first_name, rec.last_name].filter(Boolean).join(' ');
        if (sheetName && !prev.name) { next.name = sheetName; filled++; }
        const gMap: Record<string, string> = { male: 'Male', female: 'Female', other: 'Other', m: 'Male', f: 'Female' };
        const gKey = (rec.gender || '').toLowerCase().trim();
        const mappedGender = gMap[gKey] || rec.gender || '';
        if (mappedGender && GENDERS.includes(mappedGender)) { next.gender = mappedGender; filled++; }
        if (rec.interested_in) {
          const goalNorm = rec.interested_in.toLowerCase().replace(/[^a-z ]/g, '').trim();
          const matched = GOALS.find(g => g.toLowerCase().includes(goalNorm) || goalNorm.includes(g.toLowerCase().replace(/[^a-z ]/g, '')));
          if (matched) { next.goal = matched as typeof next.goal; filled++; }
        }
        if (rec.trainer_name && trainers.length) {
          const tNorm = rec.trainer_name.toLowerCase().trim();
          const matchedTrainer = trainers.find(t => t.toLowerCase() === tNorm || t.toLowerCase().includes(tNorm) || tNorm.includes(t.toLowerCase()));
          if (matchedTrainer) { next.trainer = matchedTrainer; filled++; }
        }
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
        if (rec.pt_start_date && !prev.startDate) { next.startDate = rec.pt_start_date; filled++; }
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
        try { await api.pt.uploadPhoto(created.id, photoPreview); } catch {}
      }
    } catch (err: any) {
      const fields = err?.payload?.error?.fields;
      if (fields && typeof fields === 'object') {
        setError(Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join('; '));
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

  /* ── SUCCESS SCREEN ── */
  if (showSuccess) {
    const initials = form.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    return (
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex min-h-[80vh] items-center justify-center px-5"
      >
        <div className="w-full max-w-md text-center">
          {/* confetti-style background glow */}
          <div className="relative inline-flex items-center justify-center mb-8">
            <div className="absolute inset-0 rounded-full blur-2xl opacity-30" style={{ background: 'radial-gradient(circle, #F59E0B 0%, transparent 70%)', transform: 'scale(2.5)' }} />
            <m.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 220, damping: 18 }}
              className="relative flex h-28 w-28 items-center justify-center rounded-[32px]"
              style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 100%)', boxShadow: '0 24px 64px rgba(15,23,42,0.35)' }}
            >
              <m.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
              >
                <CheckCircle2 size={52} color="#F59E0B" strokeWidth={1.5} />
              </m.div>
            </m.div>
          </div>

          <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <h2 className="text-[32px] font-[900] tracking-[-0.04em] text-slate-900 leading-none mb-3">
              Client Onboarded!
            </h2>
            <p className="text-[15px] text-slate-500 leading-relaxed mb-2">
              <span className="font-[700] text-slate-800">{form.name}</span> has been successfully registered.
            </p>
            {form.plan && (
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mt-1 mb-6"
                style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.25)' }}>
                <span className="text-[12.5px] font-[700]" style={{ color: '#d97706' }}>{form.plan}</span>
              </div>
            )}
          </m.div>

          <m.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-3 justify-center mt-6"
          >
            <PremiumButton
              tone="primary" glow
              onClick={() => { setShowSuccess(false); setDone(false); setForm(initForm()); setStep(1); setPhotoPreview(null); }}
            >
              Onboard Another
            </PremiumButton>
            <PremiumButton
              tone="secondary"
              onClick={() => router.push(`/pt-os/clients/${createdId}`)}
            >
              View Client Profile
            </PremiumButton>
          </m.div>
        </div>
      </m.div>
    );
  }

  /* ── DISCOUNT CALC ── */
  const discount = (form.basePrice && form.sellingPrice && form.basePrice > form.sellingPrice)
    ? form.basePrice - form.sellingPrice : 0;
  const discountPct = (discount && form.basePrice) ? Math.round((discount / form.basePrice) * 100) : 0;

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg,#f8fafc 0%,#f1f5f9 60%,#fafafe 100%)' }}>

      {/* ── PAGE HEADER ── */}
      <div className="sticky top-0 z-40" style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
        <div className="mx-auto max-w-3xl px-5 sm:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[13px]" style={{ background: '#0f172a' }}>
                <Award size={17} color="#F59E0B" />
              </div>
              <div>
                <h1 className="text-[18px] font-[860] tracking-[-0.03em] text-slate-900 leading-none">New PT Client</h1>
                <p className="text-[11px] font-[600] text-slate-400 mt-0.5">Personal Training Onboarding</p>
              </div>
            </div>
            {/* mobile step counter */}
            <div className="flex sm:hidden items-center gap-2">
              <div className="text-[12px] font-[700] text-slate-400">
                <span className="text-slate-900">{step}</span>/4
              </div>
              <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: '#e2e8f0' }}>
                <m.div
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

      <div className="mx-auto max-w-3xl px-5 sm:px-8 py-6 pb-32">
        {dataLoading ? (
          <FormSkeleton />
        ) : dataError ? (
          <DataErrorState message={dataError} onRetry={fetchData} />
        ) : (
          <>
            {/* ── SHEET IMPORT BANNER ── */}
            {sheetRowCount !== null && (
              <m.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="mb-5 flex items-center gap-3 rounded-[14px] px-4 py-3"
                style={{ background: 'rgba(13,148,136,0.07)', border: '1px solid rgba(13,148,136,0.18)' }}
              >
                <FileSpreadsheet size={15} style={{ color: '#0d9488', flexShrink: 0 }} />
                <span className="text-[12.5px] font-[640] flex-1" style={{ color: '#065f46' }}>
                  {sheetRowCount} records imported — enter phone to auto-fill fields
                </span>
                <button onClick={() => setSheetRowCount(null)} className="opacity-60 hover:opacity-100 transition-opacity">
                  <X size={13} style={{ color: '#065f46' }} />
                </button>
              </m.div>
            )}

            {/* ── STEP INDICATOR ── */}
            <div className="mb-8 rounded-[20px] px-6 py-5" style={{ background: '#fff', border: '1px solid #f1f5f9', boxShadow: '0 2px 16px rgba(15,23,42,0.05)' }}>
              <StepIndicator
                current={step}
                onStep={(s) => { if (s <= step + 1) { setStep(s); setError(''); } }}
              />
            </div>

            {/* ── ERROR BANNER ── */}
            <AnimatePresence>
              {error && (
                <m.div
                  key="err"
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="rounded-[14px] px-4 py-3.5 text-[13px] font-[560] overflow-hidden"
                  style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#9f1239' }}
                >
                  {error}
                </m.div>
              )}
            </AnimatePresence>

            {/* ── STEP CONTENT ── */}
            <AnimatePresence mode="wait">

              {/* ─── STEP 1: PERSONAL INFO ─── */}
              {step === 1 && (
                <m.div key="s1"
                  initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="rounded-[24px] overflow-hidden" style={{ background: '#fff', border: '1px solid #f1f5f9', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
                    {/* card header stripe */}
                    <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#0f172a,#334155)' }} />
                    <div className="p-7 sm:p-10">
                      <div className="flex items-start gap-4 mb-8">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
                          <User size={20} color="#F59E0B" />
                        </div>
                        <div>
                          <h2 className="text-[22px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Personal Information</h2>
                          <p className="text-[13.5px] text-slate-400 mt-1.5">Basic details to create the client profile.</p>
                        </div>
                      </div>

                      <div className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FloatInput label="Full Name *" value={form.name} onChange={(v) => set('name', v)} />
                          <FloatInput label="Email Address" type="email" value={form.email} onChange={(v) => set('email', v)} />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <FloatInput label="Phone Number *" type="tel" value={form.phone} onChange={(v) => set('phone', v)} />
                            <AnimatePresence>
                              {autofillNote && (
                                <m.div
                                  initial={{ opacity: 0, y: -4, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                  className="flex items-center gap-2 rounded-[10px] px-3 py-2"
                                  style={{ background: 'rgba(13,148,136,0.08)', border: '1px solid rgba(13,148,136,0.18)' }}
                                >
                                  <CheckCircle2 size={12} style={{ color: '#0d9488', flexShrink: 0 }} />
                                  <span className="text-[11.5px] font-[640]" style={{ color: '#065f46' }}>{autofillNote}</span>
                                </m.div>
                              )}
                            </AnimatePresence>
                          </div>
                          <FloatInput label="Date of Birth" type="date" value={form.dob} onChange={(v) => set('dob', v)} />
                        </div>

                        {/* Gender */}
                        <div>
                          <p className="mb-3 text-[12px] font-[700] uppercase tracking-widest text-slate-400">Gender</p>
                          <div className="flex flex-wrap gap-2">
                            {GENDERS.map((g) => (
                              <button
                                key={g}
                                type="button"
                                onClick={() => set('gender', g)}
                                className="rounded-[11px] px-4 py-2.5 text-[13px] font-[660] transition-all duration-200"
                                style={{
                                  background: form.gender === g ? '#0f172a' : '#f8fafc',
                                  color: form.gender === g ? '#fff' : '#64748b',
                                  border: form.gender === g ? '1.5px solid #0f172a' : '1.5px solid #e2e8f0',
                                  boxShadow: form.gender === g ? '0 2px 12px rgba(15,23,42,0.18)' : 'none',
                                  transform: form.gender === g ? 'scale(1.03)' : 'scale(1)',
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
                </m.div>
              )}

              {/* ─── STEP 2: FITNESS PROFILE ─── */}
              {step === 2 && (
                <m.div key="s2"
                  initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="rounded-[24px] overflow-hidden" style={{ background: '#fff', border: '1px solid #f1f5f9', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
                    <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#F59E0B,#D97706)' }} />
                    <div className="p-7 sm:p-10">
                      <div className="flex items-start gap-4 mb-8">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: 'rgba(245,158,11,0.12)' }}>
                          <Activity size={20} style={{ color: '#d97706' }} />
                        </div>
                        <div>
                          <h2 className="text-[22px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Fitness Profile</h2>
                          <p className="text-[13.5px] text-slate-400 mt-1.5">Goals, measurements, and health assessment.</p>
                        </div>
                      </div>

                      <div className="space-y-8">
                        {/* Primary Goal */}
                        <div>
                          <p className="mb-4 text-[12px] font-[700] uppercase tracking-widest text-slate-400">
                            Primary Fitness Goal <span style={{ color: '#F59E0B' }}>*</span>
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {GOALS.map((g) => {
                              const meta = GOAL_META[g];
                              const GoalIcon = meta.Icon;
                              const selected = form.goal === g;
                              return (
                                <button
                                  key={g}
                                  type="button"
                                  onClick={() => set('goal', g)}
                                  className="relative flex flex-col items-center gap-2.5 rounded-[16px] p-4 text-center transition-all duration-200"
                                  style={{
                                    background: selected ? '#0f172a' : '#f8fafc',
                                    border: selected ? '1.5px solid #0f172a' : '1.5px solid #e2e8f0',
                                    boxShadow: selected ? '0 6px 20px rgba(15,23,42,0.2)' : '0 1px 4px rgba(15,23,42,0.04)',
                                    transform: selected ? 'scale(1.03)' : 'scale(1)',
                                  }}
                                >
                                  {selected && (
                                    <div className="absolute top-2.5 right-2.5 flex h-5 w-5 items-center justify-center rounded-full" style={{ background: '#F59E0B' }}>
                                      <Check size={10} color="#fff" strokeWidth={3} />
                                    </div>
                                  )}
                                  <div className="flex h-10 w-10 items-center justify-center rounded-[12px]"
                                    style={{ background: selected ? 'rgba(255,255,255,0.12)' : meta.bg }}>
                                    <span style={{ color: selected ? '#F59E0B' : meta.color, display: 'flex' }}>
                                      <GoalIcon size={19} strokeWidth={1.75} />
                                    </span>
                                  </div>
                                  <span className="text-[11.5px] font-[700] leading-tight" style={{ color: selected ? '#fff' : '#475569' }}>
                                    {g}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Body Measurements */}
                        <div>
                          <p className="mb-4 text-[12px] font-[700] uppercase tracking-widest text-slate-400">Body Measurements</p>
                          <div className="grid grid-cols-3 gap-4">
                            <FloatInput label="Height (cm)" type="number" value={form.height} onChange={(v) => set('height', v)} />
                            <FloatInput label="Weight (kg)" type="number" value={form.weight} onChange={(v) => set('weight', v)} />
                            <FloatInput label="Body Fat %" type="number" value={form.bodyFat} onChange={(v) => set('bodyFat', v)} />
                          </div>
                        </div>

                        {/* Health Conditions */}
                        <div>
                          <p className="mb-4 text-[12px] font-[700] uppercase tracking-widest text-slate-400">Health Conditions</p>
                          <div className="flex flex-wrap gap-2">
                            {HEALTH_CONDITIONS.map((cond) => {
                              const active = form.healthConditions.includes(cond);
                              return (
                                <button
                                  key={cond}
                                  type="button"
                                  onClick={() => toggleCondition(cond)}
                                  className="flex items-center gap-1.5 rounded-[10px] px-3.5 py-2 text-[12.5px] font-[640] transition-all duration-150"
                                  style={{
                                    background: active ? 'rgba(239,68,68,0.08)' : '#f8fafc',
                                    border: active ? '1.5px solid rgba(239,68,68,0.30)' : '1.5px solid #e2e8f0',
                                    color: active ? '#dc2626' : '#64748b',
                                    transform: active ? 'scale(1.02)' : 'scale(1)',
                                  }}
                                >
                                  {active && <Check size={11} strokeWidth={3} style={{ color: '#dc2626', flexShrink: 0 }} />}
                                  {cond}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Injuries */}
                        <div>
                          <p className="mb-3 text-[12px] font-[700] uppercase tracking-widest text-slate-400">Injuries / Medical Notes</p>
                          <FloatInput label="Describe any injuries or medical concerns" value={form.injuries} onChange={(v) => set('injuries', v)} />
                        </div>
                      </div>
                    </div>
                  </div>
                </m.div>
              )}

              {/* ─── STEP 3: PT ASSIGNMENT ─── */}
              {step === 3 && (
                <m.div key="s3"
                  initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="rounded-[24px] overflow-hidden" style={{ background: '#fff', border: '1px solid #f1f5f9', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
                    <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#6366f1,#8b5cf6)' }} />
                    <div className="p-7 sm:p-10">
                      <div className="flex items-start gap-4 mb-8">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: 'rgba(99,102,241,0.10)' }}>
                          <Dumbbell size={20} style={{ color: '#6366f1' }} />
                        </div>
                        <div>
                          <h2 className="text-[22px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Subscription & Pricing</h2>
                          <p className="text-[13.5px] text-slate-400 mt-1.5">Select a plan, set dates and pricing.</p>
                        </div>
                      </div>

                      <div className="space-y-6">
                        {/* Plan selector */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-[12px] font-[700] uppercase tracking-widest text-slate-400">Subscription Plan <span style={{ color: '#F59E0B' }}>*</span></p>
                            <a href="/pt-os/plans" target="_blank" rel="noopener noreferrer"
                              className="text-[11.5px] font-[680] text-amber-500 hover:text-amber-600 transition-colors">
                              + Manage Plans
                            </a>
                          </div>
                          {/* Plan cards */}
                          {plans.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {plans.map(p => {
                                const sel = form.planId === p.id;
                                return (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => {
                                      setForm(prev => {
                                        let ed = prev.endDate;
                                        if (prev.startDate && p.duration_months > 0) {
                                          const d = new Date(prev.startDate);
                                          d.setMonth(d.getMonth() + p.duration_months);
                                          ed = d.toISOString().slice(0, 10);
                                        }
                                        return { ...prev, planId: p.id, plan: p.name, basePrice: p.base_amount != null ? Number(p.base_amount) : null, endDate: ed };
                                      });
                                    }}
                                    className="relative flex items-center justify-between rounded-[16px] p-4 text-left transition-all duration-200"
                                    style={{
                                      background: sel ? '#0f172a' : '#f8fafc',
                                      border: sel ? '1.5px solid #0f172a' : '1.5px solid #e2e8f0',
                                      boxShadow: sel ? '0 6px 20px rgba(15,23,42,0.20)' : '0 1px 4px rgba(15,23,42,0.04)',
                                    }}
                                  >
                                    <div>
                                      <p className="text-[13.5px] font-[720]" style={{ color: sel ? '#fff' : '#0f172a' }}>{p.name}</p>
                                      <p className="text-[12px] font-[560] mt-0.5" style={{ color: sel ? 'rgba(255,255,255,0.55)' : '#94a3b8' }}>
                                        {p.duration_months} month{p.duration_months !== 1 ? 's' : ''}
                                      </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                      <span className="text-[15px] font-[800]" style={{ color: sel ? '#F59E0B' : '#0f172a' }}>{fmtINR(p.base_amount)}</span>
                                      {sel && <Check size={14} color="#F59E0B" strokeWidth={3} />}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="rounded-[14px] px-4 py-6 text-center" style={{ background: '#f8fafc', border: '1.5px dashed #e2e8f0' }}>
                              <p className="text-[13px] text-slate-400">No plans found. <a href="/pt-os/plans" target="_blank" className="text-amber-500 font-[660] hover:underline">Create one →</a></p>
                            </div>
                          )}
                        </div>

                        {/* Dates row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="mb-3 text-[12px] font-[700] uppercase tracking-widest text-slate-400">Start Date <span style={{ color: '#F59E0B' }}>*</span></p>
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
                              className="w-full rounded-[13px] px-4 py-3.5 text-[13.5px] font-[520] outline-none transition-all"
                              style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#0f172a' }}
                            />
                          </div>
                          <div>
                            <p className="mb-3 text-[12px] font-[700] uppercase tracking-widest text-slate-400">End Date</p>
                            <div
                              className="flex items-center gap-2.5 w-full rounded-[13px] px-4 py-3.5 text-[13.5px] font-[520]"
                              style={{
                                background: form.endDate ? 'rgba(245,158,11,0.06)' : '#f8fafc',
                                border: form.endDate ? '1.5px solid rgba(245,158,11,0.25)' : '1.5px solid #e2e8f0',
                                color: form.endDate ? '#92400e' : '#94a3b8',
                              }}
                            >
                              <Calendar size={14} style={{ color: form.endDate ? '#d97706' : '#cbd5e1', flexShrink: 0 }} />
                              {form.endDate
                                ? new Date(form.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                : 'Auto-calculated from plan'
                              }
                            </div>
                          </div>
                        </div>

                        {/* Pricing */}
                        <div>
                          <p className="mb-3 text-[12px] font-[700] uppercase tracking-widest text-slate-400">Pricing</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FloatInput
                              label="Base Price (₹) *"
                              value={String(form.basePrice ?? '')}
                              onChange={(v) => { const n = parseFloat(v); set('basePrice', isNaN(n) ? null : n); }}
                              placeholder="Enter base price"
                            />
                            <FloatInput
                              label="Selling Price (₹) *"
                              value={String(form.sellingPrice ?? '')}
                              onChange={(v) => { const n = parseFloat(v); set('sellingPrice', isNaN(n) ? null : n); }}
                              placeholder="Enter selling price"
                            />
                          </div>
                          {/* live discount badge */}
                          <AnimatePresence>
                            {discount > 0 && (
                              <m.div
                                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                className="mt-3 flex items-center gap-2.5 rounded-[11px] px-4 py-2.5 overflow-hidden"
                                style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.22)' }}
                              >
                                <CheckCircle2 size={13} style={{ color: '#059669', flexShrink: 0 }} />
                                <span className="text-[12.5px] font-[680]" style={{ color: '#047857' }}>
                                  Client saves {fmtINR(discount)} · {discountPct}% discount applied
                                </span>
                              </m.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Frequency */}
                        <PremiumSelect
                          label="Session Frequency *"
                          value={form.frequency}
                          onChange={(v) => set('frequency', v)}
                          options={FREQUENCIES}
                          placeholder="Select weekly frequency"
                        />

                        {/* Inline summary */}
                        <AnimatePresence>
                          {form.plan && form.frequency && form.sellingPrice !== null && (
                            <m.div
                              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                              className="rounded-[16px] p-5"
                              style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0' }}
                            >
                              <p className="text-[11px] font-[750] uppercase tracking-widest text-slate-400 mb-3">Summary</p>
                              <div className="grid grid-cols-2 gap-y-2 gap-x-6">
                                {[
                                  { label: 'Plan', value: form.plan },
                                  { label: 'Frequency', value: form.frequency },
                                  { label: 'Selling Price', value: fmtINR(form.sellingPrice) },
                                  { label: 'Start', value: new Date(form.startDate).toLocaleDateString('en-IN') },
                                  ...(form.endDate ? [{ label: 'End', value: new Date(form.endDate).toLocaleDateString('en-IN') }] : []),
                                  ...(discount > 0 ? [{ label: 'Discount', value: `${fmtINR(discount)} (${discountPct}%)` }] : []),
                                ].map(item => (
                                  <div key={item.label} className="flex flex-col gap-0.5">
                                    <span className="text-[11px] font-[600] text-slate-400">{item.label}</span>
                                    <span className="text-[13px] font-[720] text-slate-800">{item.value}</span>
                                  </div>
                                ))}
                              </div>
                            </m.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </m.div>
              )}

              {/* ─── STEP 4: REVIEW & CONFIRM ─── */}
              {step === 4 && (
                <m.div key="s4"
                  initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="rounded-[24px] overflow-hidden" style={{ background: '#fff', border: '1px solid #f1f5f9', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
                    <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#10b981,#059669)' }} />
                    <div className="p-7 sm:p-10">

                      {/* Profile header */}
                      <div className="flex items-center gap-5 mb-8 pb-8" style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-[20px] text-[22px] font-[860] text-white"
                          style={{ background: 'linear-gradient(135deg,#0f172a 0%,#334155 100%)', boxShadow: '0 8px 24px rgba(15,23,42,0.25)' }}>
                          {form.name ? form.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?'}
                        </div>
                        <div>
                          <h3 className="text-[21px] font-[840] tracking-[-0.03em] text-slate-900">{form.name || '—'}</h3>
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            {form.phone && <span className="text-[12.5px] font-[600] text-slate-500">{form.phone}</span>}
                            {form.gender && (
                              <span className="rounded-full px-2.5 py-0.5 text-[11px] font-[700]"
                                style={{ background: 'rgba(245,158,11,0.10)', color: '#d97706' }}>{form.gender}</span>
                            )}
                            {form.goal && (
                              <span className="rounded-full px-2.5 py-0.5 text-[11px] font-[700]"
                                style={{ background: 'rgba(99,102,241,0.10)', color: '#6366f1' }}>{form.goal}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Summary grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                        {/* Personal */}
                        <div className="rounded-[16px] p-4 space-y-3" style={{ background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                          <p className="text-[11px] font-[750] uppercase tracking-widest text-slate-400">Personal</p>
                          {[
                            { label: 'Email', val: form.email || '—' },
                            { label: 'DOB', val: form.dob || '—' },
                          ].map(r => (
                            <div key={r.label}>
                              <p className="text-[11px] text-slate-400 font-[600]">{r.label}</p>
                              <p className="text-[12.5px] font-[680] text-slate-800 truncate">{r.val}</p>
                            </div>
                          ))}
                        </div>

                        {/* Fitness */}
                        <div className="rounded-[16px] p-4 space-y-3" style={{ background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                          <p className="text-[11px] font-[750] uppercase tracking-widest text-slate-400">Fitness</p>
                          {[
                            { label: 'Height', val: form.height ? `${form.height} cm` : '—' },
                            { label: 'Weight', val: form.weight ? `${form.weight} kg` : '—' },
                            { label: 'Body Fat', val: form.bodyFat ? `${form.bodyFat}%` : '—' },
                            { label: 'Conditions', val: form.healthConditions.length ? form.healthConditions.join(', ') : 'None' },
                          ].map(r => (
                            <div key={r.label}>
                              <p className="text-[11px] text-slate-400 font-[600]">{r.label}</p>
                              <p className="text-[12.5px] font-[680] text-slate-800 leading-snug">{r.val}</p>
                            </div>
                          ))}
                        </div>

                        {/* Plan */}
                        <div className="rounded-[16px] p-4 space-y-3" style={{ background: '#0f172a', border: '1px solid #1e293b' }}>
                          <p className="text-[11px] font-[750] uppercase tracking-widest text-white/40">Plan</p>
                          {[
                            { label: 'Package', val: form.plan || '—' },
                            { label: 'Frequency', val: form.frequency || '—' },
                            { label: 'Selling Price', val: form.sellingPrice ? fmtINR(form.sellingPrice) : '—' },
                            { label: 'Start Date', val: form.startDate ? new Date(form.startDate).toLocaleDateString('en-IN') : '—' },
                          ].map(r => (
                            <div key={r.label}>
                              <p className="text-[11px] text-white/40 font-[600]">{r.label}</p>
                              <p className="text-[12.5px] font-[720] text-white">{r.val}</p>
                            </div>
                          ))}
                          {discount > 0 && (
                            <div className="mt-1 rounded-[8px] px-2.5 py-1.5 text-center" style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.25)' }}>
                              <span className="text-[11.5px] font-[720]" style={{ color: '#F59E0B' }}>Saves {fmtINR(discount)} ({discountPct}% off)</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Transformation Goals */}
                      <div className="mb-7">
                        <p className="mb-3 text-[12px] font-[700] uppercase tracking-widest text-slate-400">
                          Transformation Goals <span style={{ color: '#F59E0B' }}>*</span>
                        </p>
                        <FloatInput
                          label="Describe what the client wants to achieve..."
                          value={form.transformationGoals}
                          onChange={(v) => set('transformationGoals', v)}
                          multiline
                        />
                      </div>

                      {/* Photo Upload */}
                      <div>
                        <p className="mb-3 text-[12px] font-[700] uppercase tracking-widest text-slate-400">Client Photo</p>
                        <label
                          className="relative flex cursor-pointer flex-col items-center justify-center rounded-[18px] border-2 border-dashed p-8 transition-all hover:bg-slate-50"
                          style={{ borderColor: 'rgba(15,23,42,0.12)', background: '#fafafa' }}
                        >
                          <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                          {photoPreview ? (
                            <div className="text-center">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={photoPreview} alt="Preview" className="mx-auto h-24 w-24 rounded-[16px] object-cover shadow-lg" />
                              <p className="mt-2.5 text-[12.5px] font-[660]" style={{ color: '#10b981' }}>Photo uploaded ✓</p>
                            </div>
                          ) : (
                            <div className="text-center">
                              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-[14px]" style={{ background: '#f1f5f9' }}>
                                <Camera size={22} style={{ color: '#94a3b8' }} />
                              </div>
                              <p className="text-[13px] font-[640] text-slate-500">Click to upload client photo</p>
                              <p className="text-[11.5px] mt-1 text-slate-400">JPG or PNG, max 5 MB — optional</p>
                            </div>
                          )}
                        </label>
                      </div>
                    </div>
                  </div>
                </m.div>
              )}

            </AnimatePresence>

            {/* ── INLINE STEP NAVIGATION ── */}
            <div className="mt-6 pb-24 lg:pb-10">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {step > 1 ? (
                    <PremiumButton tone="secondary" icon={<ChevronLeft size={14} />} onClick={handlePrev}>
                      Back
                    </PremiumButton>
                  ) : (
                    <div />
                  )}
                  <div className="flex items-center gap-2">
                    {STEPS.map(s => (
                      <div key={s.id} className="h-1.5 w-8 rounded-full transition-all duration-300"
                        style={{ background: s.id < step ? '#F59E0B' : s.id === step ? '#0f172a' : '#e2e8f0' }} />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[12px] font-[640] text-slate-400 hidden sm:inline">
                    {STEPS[step - 1].sub}
                  </span>
                  {step < 4 ? (
                    <PremiumButton tone="primary" icon={<ChevronRight size={14} />} onClick={handleNext}>
                      Continue
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
