'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Check, User, Mail, Phone, Calendar, Hash,
  Target, Ruler, Heart, Activity, Dumbbell, Sparkles,
  Camera, Upload, CheckCircle2, RefreshCw, Award, FileText,
  Scale, Zap, Brain, Flame, Footprints, Baby, Accessibility,
  ArrowRight, Star, Quote,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { PremiumButton } from '@/components/premium/PremiumButton';
import { cn } from '@/components/ui/cn';
import { api } from '@/lib/api';

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

const STEP_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ec4899'] as const;
const THEME_GRADIENT = 'linear-gradient(135deg,#6366f1,#8b5cf6,#a855f7,#ec4899)';

const STEPS = [
  { id: 1, label: 'Personal Info', icon: <User size={16} />, color: STEP_COLORS[0], desc: 'Basic client details' },
  { id: 2, label: 'Fitness Profile', icon: <Activity size={16} />, color: STEP_COLORS[1], desc: 'Goals & measurements' },
  { id: 3, label: 'PT Assignment', icon: <Dumbbell size={16} />, color: STEP_COLORS[2], desc: 'Trainer & pricing' },
  { id: 4, label: 'Review & Confirm', icon: <FileText size={16} />, color: STEP_COLORS[3], desc: 'Final verification' },
];

const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

const GOALS: Goal[] = ['Weight Loss', 'Muscle Gain', 'Endurance', 'General Fitness', 'Body Recomposition', 'Flexibility & Mobility', 'Sports Performance', 'Fat Loss & Toning'];

const GOAL_CONFIG: Record<Goal, { icon: React.ReactNode; color: string; bg: string }> = {
  'Weight Loss':          { icon: <Flame size={20} />, color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  'Muscle Gain':          { icon: <Dumbbell size={20} />, color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
  'Endurance':            { icon: <Heart size={20} />, color: '#ec4899', bg: 'rgba(236,72,153,0.12)' },
  'General Fitness':      { icon: <Sparkles size={20} />, color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  'Body Recomposition':   { icon: <Scale size={20} />, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  'Flexibility & Mobility': { icon: <Accessibility size={20} />, color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
  'Sports Performance':   { icon: <Zap size={20} />, color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  'Fat Loss & Toning':    { icon: <Target size={20} />, color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
};

const HEALTH_CONDITIONS = [
  'Hypertension', 'Diabetes', 'Asthma', 'Heart Condition',
  'Joint Pain', 'Back Pain', 'Thyroid', 'None',
];

const CONDITION_COLORS: Record<string, string> = {
  'Hypertension': '#ef4444', 'Diabetes': '#f59e0b', 'Asthma': '#06b6d4',
  'Heart Condition': '#ec4899', 'Joint Pain': '#8b5cf6', 'Back Pain': '#f97316',
  'Thyroid': '#6366f1', 'None': '#10b981',
};

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

import FloatInput from '@/components/ui/FloatInput';

function PremiumSelect<T extends string>({ label, value, onChange, options, placeholder, color }: {
  label: string; value: T; onChange: (v: T) => void; options: readonly T[] | T[]; placeholder?: string; color?: string;
}) {
  const accent = color || '#6366f1';
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <p className="mb-2 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>
        {label} <span style={{ color: accent }}>*</span>
      </p>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 rounded-[13px] px-4 py-3.5 text-left transition-all"
        style={{
          background: open ? 'white' : '#f8fafc',
          border: open ? `1.5px solid ${accent}66` : '1.5px solid #e2e8f0',
          boxShadow: open ? `0 0 0 3px ${accent}15` : '0 1px 2px rgba(0,0,0,0.04)',
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
            style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 12px 32px rgba(0,0,0,0.12)' }}
          >
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(opt); setOpen(false); }}
                className="flex w-full items-center justify-between rounded-[10px] px-3.5 py-2.5 text-[12.5px] font-[580] transition hover:bg-slate-50"
                style={{ color: 'rgb(30,30,40)' }}
              >
                <span className="flex items-center gap-2">
                  {opt}
                </span>
                {value === opt && <Check size={12} style={{ color: accent }} />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StepIndicator({ current, onStep }: { current: StepId; onStep: (s: StepId) => void }) {
  return (
    <div className="flex items-center gap-0 rounded-[16px] p-1.5"
      style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      {STEPS.map((s, i) => {
        const active = current === s.id;
        const done = current > s.id;
        const accent = STEP_COLORS[i];
        return (
          <React.Fragment key={s.id}>
            {i > 0 && (
              <div className="h-px flex-1 mx-1" style={{ background: done ? accent : '#e2e8f0', transition: 'background 0.3s' }} />
            )}
            <button
              type="button"
              onClick={() => { if (s.id <= current + 1) onStep(s.id as StepId); }}
              className={cn('relative flex items-center gap-2 rounded-[12px] px-3.5 py-2.5 text-[12px] font-[680] transition-all')}
              style={{
                background: active ? accent : done ? `${accent}15` : 'transparent',
                color: active ? '#fff' : done ? accent : 'rgb(148,163,184)',
                boxShadow: active ? `0 4px 16px ${accent}40` : 'none',
              }}
            >
              <span className={cn('flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-[800]',
                active ? 'bg-white/20 text-white' : done ? 'text-white' : 'bg-zinc-100 text-zinc-400'
              )}
                style={done && !active ? { background: accent } : undefined}
              >
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

function FormSkeleton() {
  return (
    <div className="rounded-[22px] p-6 sm:p-8 animate-pulse"
      style={{ background: 'white', border: '1px solid #f1f5f9', boxShadow: '0 2px 20px rgba(0,0,0,0.07)' }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-[12px]" style={{ background: 'rgba(99,102,241,0.10)' }} />
        <div>
          <div className="h-4 w-32 rounded" style={{ background: '#e2e8f0' }} />
          <div className="h-3 w-48 mt-1 rounded" style={{ background: '#f1f5f9' }} />
        </div>
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-14 rounded-[13px]" style={{ background: '#f1f5f9' }} />
          <div className="h-14 rounded-[13px]" style={{ background: '#f1f5f9' }} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="h-14 rounded-[13px]" style={{ background: '#f1f5f9' }} />
          <div className="h-14 rounded-[13px]" style={{ background: '#f1f5f9' }} />
          <div className="h-14 rounded-[13px]" style={{ background: '#f1f5f9' }} />
        </div>
      </div>
    </div>
  );
}

function DataErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-[22px] p-8 text-center"
      style={{ background: 'white', border: '1px solid #f1f5f9', boxShadow: '0 2px 20px rgba(0,0,0,0.07)' }}>
      <div className="flex justify-center mb-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-[16px]" style={{ background: 'rgba(239,68,68,0.10)' }}>
          <RefreshCw size={22} style={{ color: '#ef4444' }} />
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

function FloatingOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ maskImage: 'linear-gradient(to bottom, black 40%, transparent 90%)' }}>
      <motion.div className="absolute -top-20 -left-10 w-72 h-72 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #6366f1, transparent 70%)' }}
        animate={{ x: [0, 30, -20, 0], y: [0, -40, 15, 0] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="absolute -bottom-20 -right-10 w-80 h-80 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #ec4899, transparent 70%)' }}
        animate={{ x: [0, -25, 20, 0], y: [0, 25, -10, 0] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="absolute top-1/3 left-1/2 w-60 h-60 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #8b5cf6, transparent 70%)' }}
        animate={{ x: [0, 15, -10, 0], y: [0, -15, 8, 0] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }} />
    </div>
  );
}

function StepCardHeader({ icon, title, desc, accent }: { icon: React.ReactNode; title: string; desc: string; accent: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-[12px]" style={{ background: `${accent}15`, color: accent }}>
        {icon}
      </div>
      <div>
        <h2 className="text-[17px] font-[760] tracking-[-0.02em]" style={{ color: 'rgb(15,23,42)' }}>{title}</h2>
        <p className="text-[12.5px]" style={{ color: 'rgb(148,163,184)' }}>{desc}</p>
      </div>
    </div>
  );
}

function StepCard({ children, accent }: { children: React.ReactNode; accent: string }) {
  return (
    <div className="rounded-[22px] p-6 sm:p-8 relative overflow-hidden" style={{
      background: 'white',
      border: `1px solid ${accent}15`,
      boxShadow: `0 2px 20px rgba(0,0,0,0.07), 0 0 0 1px ${accent}08`,
    }}>
      <div className="absolute top-0 left-0 right-0 h-1" style={{
        background: `linear-gradient(90deg, ${accent}, ${accent}88, ${accent}44, transparent)`,
      }} />
      {children}
    </div>
  );
}

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

  const handleNext = () => {
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
      const res = await api.pt.create({
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        mobile: form.phone.trim() || undefined,
        dob: form.dob || undefined,
        gender: form.gender,
        trainer_id: trainerIdMap[form.trainer] || undefined,
        weight: form.weight ? Number(form.weight) : undefined,
        notes: form.transformationGoals,
        base_amount: form.basePrice,
        discount: disc,
        monthly_pt_amount: selling,
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

  const stepAccent = STEP_COLORS[step - 1];

  if (showSuccess) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex min-h-[80vh] items-center justify-center px-4">
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
            style={{ background: THEME_GRADIENT, boxShadow: '0 20px 60px rgba(99,102,241,0.35)' }}
          >
            <CheckCircle2 size={44} color="white" />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <h2 className="text-[28px] font-[860] tracking-[-0.03em]" style={{ color: 'rgb(15,23,42)' }}>Client Onboarded!</h2>
            <div className="mt-3 px-6 py-3 rounded-[14px]" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
              <p className="text-[14px] font-[600]" style={{ color: 'rgb(71,85,105)' }}>
                <Star size={14} className="inline mr-1.5" style={{ color: '#6366f1' }} />
                {form.name} has been registered with trainer <strong style={{ color: 'rgb(15,23,42)' }}>{form.trainer}</strong>
              </p>
            </div>
          </motion.div>
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
      {/* ── HERO HEADER ── */}
      <div className="relative overflow-hidden" style={{
        background: 'linear-gradient(135deg, #0f0a1e 0%, #1e0a2e 25%, #2a0a3e 55%, #0f172a 100%)',
        padding: '40px 32px 36px',
        borderRadius: '0 0 40px 40px',
      }}>
        <FloatingOrbs />
        <div className="relative z-10 mx-auto" style={{ maxWidth: 1280 }}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center justify-center w-[52px] h-[52px] rounded-[16px]"
                style={{ background: THEME_GRADIENT, boxShadow: '0 8px 32px rgba(99,102,241,0.3)' }}
              >
                <Award size={22} color="#fff" />
              </motion.div>
              <div>
                <motion.h1
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="text-[26px] font-[860] tracking-[-0.03em]"
                  style={{ background: 'linear-gradient(135deg, #c7d2fe, #a78bfa, #e879f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                >
                  New PT Client
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-[13px]" style={{ color: 'rgba(255,255,255,0.45)' }}
                >
                  Onboard a new personal training client
                </motion.p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[12px] font-[600]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Step {step} of 4
              </span>
              <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: THEME_GRADIENT }}
                  animate={{ width: `${(step / 4) * 100}%` }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto px-5 py-6 sm:px-8" style={{ maxWidth: 900 }}>
        {dataLoading ? (
          <FormSkeleton />
        ) : dataError ? (
          <DataErrorState message={dataError} onRetry={fetchData} />
        ) : (
          <>
            <StepIndicator current={step} onStep={(s) => { if (s <= step + 1) { setStep(s); setError(''); } }} />

            {error && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                className="mt-4 rounded-[13px] p-3.5 text-[13px] font-[500]"
                style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#9f1239' }}
              >
                {error}
              </motion.div>
            )}

            <div className="mt-6">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div key="step1" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
                    <StepCard accent={stepAccent}>
                      <StepCardHeader icon={<User size={18} />} title="Personal Information" desc="Basic details to create the client profile." accent={stepAccent} />
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FloatInput label="Full Name" required value={form.name} onChange={(v) => set('name', v)} />
                          <FloatInput label="Email Address" type="email" value={form.email} onChange={(v) => set('email', v)} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <FloatInput label="Phone Number" type="tel" required value={form.phone} onChange={(v) => set('phone', v)} />
                          <FloatInput label="Date of Birth" type="date" value={form.dob} onChange={(v) => set('dob', v)} />
                          <div>
                            <p className="mb-2 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Gender</p>
                            <div className="flex gap-2 flex-wrap">
                              {GENDERS.map((g) => (
                                <button
                                  key={g}
                                  type="button"
                                  onClick={() => set('gender', g)}
                                  className={cn('rounded-[10px] px-3.5 py-2 text-[12px] font-[600] transition-all')}
                                  style={{
                                    background: form.gender === g ? stepAccent : '#f8fafc',
                                    border: form.gender === g ? `1.5px solid ${stepAccent}` : '1.5px solid #e2e8f0',
                                    color: form.gender === g ? '#fff' : '#64748b',
                                    boxShadow: form.gender === g ? `0 2px 8px ${stepAccent}33` : 'none',
                                  }}
                                >
                                  {g}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </StepCard>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div key="step2" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
                    <StepCard accent={stepAccent}>
                      <StepCardHeader icon={<Activity size={18} />} title="Fitness Profile" desc="Goals, measurements, and health assessment." accent={stepAccent} />
                      <div className="space-y-5">
                        {/* Goals */}
                        <div>
                          <p className="mb-3 text-[13px] font-[700]" style={{ color: 'rgb(15,23,42)' }}>
                            Primary Fitness Goal <span style={{ color: stepAccent }}>*</span>
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            {GOALS.map((g) => {
                              const cfg = GOAL_CONFIG[g];
                              const active = form.goal === g;
                              return (
                                <button
                                  key={g}
                                  type="button"
                                  onClick={() => set('goal', g)}
                                  className="rounded-[14px] p-3.5 text-center transition-all"
                                  style={{
                                    background: active ? cfg.bg : '#f8fafc',
                                    border: active ? `1.5px solid ${cfg.color}44` : '1.5px solid #e2e8f0',
                                    boxShadow: active ? `0 4px 16px ${cfg.color}22` : 'none',
                                    color: active ? cfg.color : 'rgb(15,23,42)',
                                  }}
                                >
                                  <div className="flex justify-center mb-1.5" style={{ color: active ? cfg.color : '#94a3b8' }}>
                                    {cfg.icon}
                                  </div>
                                  <span className="text-[10.5px] font-[680] leading-tight">{g}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Body Measurements */}
                        <div>
                          <p className="mb-2.5 text-[13px] font-[700]" style={{ color: 'rgb(15,23,42)' }}>
                            <Ruler size={14} className="inline mr-1.5" style={{ color: stepAccent }} />
                            Body Measurements
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <FloatInput label="Height (cm)" type="number" value={form.height} onChange={(v) => set('height', v)} />
                            <FloatInput label="Weight (kg)" type="number" value={form.weight} onChange={(v) => set('weight', v)} />
                            <FloatInput label="Body Fat %" type="number" value={form.bodyFat} onChange={(v) => set('bodyFat', v)} />
                          </div>
                        </div>

                        {/* Health Conditions */}
                        <div>
                          <p className="mb-2.5 text-[13px] font-[700]" style={{ color: 'rgb(15,23,42)' }}>
                            <Heart size={14} className="inline mr-1.5" style={{ color: '#ef4444' }} />
                            Health Conditions
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {HEALTH_CONDITIONS.map((cond) => {
                              const cc = CONDITION_COLORS[cond] || '#6366f1';
                              const active = form.healthConditions.includes(cond);
                              return (
                                <button
                                  key={cond}
                                  type="button"
                                  onClick={() => toggleCondition(cond)}
                                  className="rounded-[10px] px-3.5 py-2 text-[12px] font-[600] transition-all"
                                  style={{
                                    background: active ? `${cc}15` : '#f8fafc',
                                    border: active ? `1.5px solid ${cc}44` : '1.5px solid #e2e8f0',
                                    color: active ? cc : '#64748b',
                                  }}
                                >
                                  {active && <Check size={11} className="inline mr-1" />}
                                  {cond}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Injuries */}
                        <div>
                          <p className="mb-2 text-[13px] font-[700]" style={{ color: 'rgb(15,23,42)' }}>
                            <Brain size={14} className="inline mr-1.5" style={{ color: '#8b5cf6' }} />
                            Injuries / Medical Notes
                          </p>
                          <FloatInput label="Describe any injuries or medical concerns" value={form.injuries} onChange={(v) => set('injuries', v)} />
                        </div>
                      </div>
                    </StepCard>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div key="step3" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
                    <StepCard accent={stepAccent}>
                      <StepCardHeader icon={<Dumbbell size={18} />} title="PT Assignment" desc="Assign trainer and set pricing." accent={stepAccent} />
                      <div className="space-y-5">
                        <PremiumSelect
                          label="Select Trainer"
                          value={form.trainer}
                          onChange={(v) => set('trainer', v)}
                          options={trainerOptions}
                          placeholder="Choose a personal trainer"
                          color={stepAccent}
                        />

                        {/* Subscription Plan */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Subscription Plan</p>
                            <a href="/pt-os/plans" target="_blank" rel="noopener noreferrer"
                              className="text-[11px] font-[660] transition-all hover:underline"
                              style={{ color: stepAccent }}>
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
                                    return { ...prev, planId: selected.id, plan: selected.name, basePrice: selected.base_amount, sellingPrice: selected.base_amount, endDate: ed };
                                  });
                                } else {
                                  set('planId', '');
                                  set('plan', '');
                                }
                              }}
                              className="w-full rounded-[13px] px-4 py-3.5 text-[13px] font-[500] outline-none transition-all appearance-none cursor-pointer"
                              style={{
                                background: '#f8fafc',
                                border: '1.5px solid #e2e8f0',
                                color: form.planId ? 'rgb(15,23,42)' : 'rgb(148,163,184)',
                              }}>
                              <option value="">Select a plan...</option>
                              {plans.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.name} &mdash; {fmtINR(p.base_amount)} / {p.duration_months}mo
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

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                background: '#f8fafc',
                                border: '1.5px solid #e2e8f0',
                                color: 'rgb(15,23,42)',
                              }}
                            />
                          </div>

                          {/* End Date */}
                          {form.endDate && (
                            <div>
                              <p className="mb-2 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>End Date</p>
                              <div
                                className="w-full rounded-[13px] px-4 py-3.5 text-[13px] font-[500]"
                                style={{
                                  background: `${stepAccent}0D`,
                                  border: `1.5px solid ${stepAccent}22`,
                                  color: 'rgb(100,116,139)',
                                }}
                              >
                                {new Date(form.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FloatInput label="Base Price (₹)" required value={String(form.basePrice ?? '')}
                            onChange={(v) => { const num = parseFloat(v); set('basePrice', isNaN(num) ? null : num); }}
                            placeholder="Enter base price"
                          />
                          <FloatInput label="Selling Price (₹)" required value={String(form.sellingPrice ?? '')}
                            onChange={(v) => { const num = parseFloat(v); set('sellingPrice', isNaN(num) ? null : num); }}
                            placeholder="Enter selling price"
                          />
                        </div>

                        <PremiumSelect
                          label="Session Frequency"
                          value={form.frequency}
                          onChange={(v) => set('frequency', v)}
                          options={FREQUENCIES}
                          placeholder="Select weekly frequency"
                          color={stepAccent}
                        />

                        {/* Assignment Summary */}
                        {form.trainer && form.frequency && form.basePrice !== null && form.sellingPrice !== null && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="rounded-[14px] p-4"
                            style={{ background: `${stepAccent}08`, border: `1px solid ${stepAccent}22` }}
                          >
                            <p className="text-[11px] font-[700] tracking-wider uppercase" style={{ color: stepAccent }}>
                              <CheckCircle2 size={12} className="inline mr-1.5" />
                              Assignment Summary
                            </p>
                            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[13px]" style={{ color: 'rgb(100,116,139)' }}>
                              <p>Trainer: <strong style={{ color: 'rgb(15,23,42)' }}>{form.trainer}</strong></p>
                              {form.plan && <p>Plan: <strong style={{ color: 'rgb(15,23,42)' }}>{form.plan}</strong></p>}
                              <p>Base: <strong style={{ color: 'rgb(15,23,42)' }}>{fmtINR(form.basePrice)}</strong></p>
                              <p>Selling: <strong style={{ color: 'rgb(15,23,42)' }}>{fmtINR(form.sellingPrice)}</strong></p>
                              <p>Frequency: <strong style={{ color: 'rgb(15,23,42)' }}>{form.frequency}</strong></p>
                              <p>Start: <strong style={{ color: 'rgb(15,23,42)' }}>{new Date(form.startDate).toLocaleDateString('en-IN')}</strong></p>
                              {form.endDate && <p>End: <strong style={{ color: 'rgb(15,23,42)' }}>{new Date(form.endDate).toLocaleDateString('en-IN')}</strong></p>}
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </StepCard>
                  </motion.div>
                )}

                {step === 4 && (
                  <motion.div key="step4" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
                    <StepCard accent={stepAccent}>
                      <StepCardHeader icon={<FileText size={18} />} title="Review & Confirm" desc="Verify all details before onboarding." accent={stepAccent} />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {[
                          { title: 'Personal Info', accent: STEP_COLORS[0], icon: <User size={14} />, items: [
                            { k: 'Name', v: form.name },
                            { k: 'Email', v: form.email },
                            { k: 'Phone', v: form.phone },
                            { k: 'DOB', v: form.dob || '\u2014' },
                            { k: 'Gender', v: form.gender },
                          ]},
                          { title: 'Fitness Profile', accent: STEP_COLORS[1], icon: <Activity size={14} />, items: [
                            { k: 'Goal', v: form.goal },
                            { k: 'Height', v: `${form.height} cm` },
                            { k: 'Weight', v: `${form.weight} kg` },
                            { k: 'Body Fat', v: form.bodyFat ? `${form.bodyFat}%` : '\u2014' },
                            { k: 'Conditions', v: form.healthConditions.length ? form.healthConditions.join(', ') : 'None' },
                            { k: 'Injuries', v: form.injuries || 'None' },
                          ]},
                          { title: 'PT Assignment', accent: STEP_COLORS[2], icon: <Dumbbell size={14} />, items: [
                            { k: 'Trainer', v: form.trainer },
                            { k: 'Plan', v: form.plan || '\u2014' },
                            { k: 'Base Price', v: form.basePrice ? fmtINR(form.basePrice) : '\u2014' },
                            { k: 'Selling Price', v: form.sellingPrice ? fmtINR(form.sellingPrice) : '\u2014' },
                            { k: 'Frequency', v: form.frequency },
                            { k: 'Start', v: new Date(form.startDate).toLocaleDateString('en-IN') },
                            { k: 'End', v: form.endDate ? new Date(form.endDate).toLocaleDateString('en-IN') : '\u2014' },
                          ]},
                          { title: 'Photo', accent: STEP_COLORS[3], icon: <Camera size={14} />, items: [
                            { k: 'Photo', v: photoPreview ? 'Uploaded \u2713' : 'Not uploaded' },
                          ]},
                        ].map((section) => (
                          <div key={section.title}
                            className="rounded-[14px] p-4 relative overflow-hidden"
                            style={{ background: 'var(--bg-subtle)', border: `1px solid ${section.accent}15` }}
                          >
                            <div className="absolute top-0 left-0 w-1 h-full rounded-r" style={{ background: section.accent }} />
                            <div className="flex items-center gap-2 mb-3 ml-1">
                              <span style={{ color: section.accent }}>{section.icon}</span>
                              <p className="text-[11px] font-[700] uppercase tracking-wider" style={{ color: section.accent }}>{section.title}</p>
                            </div>
                            <div className="space-y-1.5 ml-1">
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
                        <p className="mb-2.5 text-[13px] font-[700]" style={{ color: 'rgb(15,23,42)' }}>
                          <Quote size={14} className="inline mr-1.5" style={{ color: stepAccent }} />
                          Transformation Goals <span style={{ color: stepAccent }}>*</span>
                        </p>
                        <FloatInput label="Describe what the client wants to achieve..." value={form.transformationGoals} onChange={(v) => set('transformationGoals', v)} multiline />
                      </div>

                      {/* Photo Upload */}
                      <div>
                        <p className="mb-2.5 text-[13px] font-[700]" style={{ color: 'rgb(15,23,42)' }}>
                          <Camera size={14} className="inline mr-1.5" style={{ color: stepAccent }} />
                          Client Photo
                        </p>
                        <label className="relative flex cursor-pointer items-center justify-center rounded-[16px] border-2 border-dashed p-8 transition-all hover:bg-white/50"
                          style={{ borderColor: `${stepAccent}33`, background: 'rgba(248,250,252,0.7)' }}>
                          <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                          {photoPreview ? (
                            <div className="text-center">
                              <img src={photoPreview} alt="Preview" className="mx-auto h-24 w-24 rounded-[14px] object-cover shadow-md" />
                              <p className="mt-2 text-[12px] font-[600]" style={{ color: '#10b981' }}>Photo uploaded</p>
                            </div>
                          ) : (
                            <div className="text-center">
                              <div className="flex justify-center mb-2">
                                <Upload size={28} style={{ color: stepAccent }} />
                              </div>
                              <p className="text-[13px] font-[600]" style={{ color: 'rgb(148,163,184)' }}>Click to upload client photo</p>
                              <p className="text-[11px] mt-1" style={{ color: 'rgb(203,213,225)' }}>JPG or PNG, max 5MB</p>
                            </div>
                          )}
                        </label>
                      </div>
                    </StepCard>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Navigation Bar */}
            <div className="sticky bottom-0 mt-6 z-40 rounded-[18px] p-4"
              style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', border: '1px solid #e2e8f0', boxShadow: '0 -4px 24px rgba(0,0,0,0.06)' }}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {step > 1 && (
                    <PremiumButton tone="secondary" icon={<ChevronLeft size={14} />} onClick={handlePrev}>
                      Back
                    </PremiumButton>
                  )}
                  <span className="text-[12px] font-[600]" style={{ color: 'rgb(148,163,184)' }}>
                    Step {step} of 4 &middot; {STEPS[step - 1].label}
                  </span>
                </div>
                <div className="flex gap-3">
                  {step < 4 ? (
                    <PremiumButton tone="primary" glow icon={<ArrowRight size={14} />} onClick={handleNext}>
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
