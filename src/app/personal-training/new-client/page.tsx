'use client';

import React, { useState, useMemo, useId, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Check, User, Mail, Phone, Calendar, Hash,
  Target, Ruler, Heart, Activity, Dumbbell, Clock, Sparkles,
  Camera, Upload, CheckCircle2, RefreshCw, Award, FileText,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { PremiumButton } from '@/components/premium/PremiumButton';
import { PremiumModal } from '@/components/premium/PremiumModal';
import { cn } from '@/components/ui/cn';

/* ────────────────────────────────────────────────────────────────────
   TYPES
──────────────────────────────────────────────────────────────────── */
type StepId = 1 | 2 | 3 | 4;

type Goal = 'Weight Loss' | 'Muscle Gain' | 'Endurance' | 'General Fitness';

type PTpackage = 'Starter' | 'Standard' | 'Premium' | 'Elite';

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
  ptPackage: PTpackage | '';
  frequency: Frequency | '';
  transformationGoals: string;
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

const GOALS: Goal[] = ['Weight Loss', 'Muscle Gain', 'Endurance', 'General Fitness'];

const HEALTH_CONDITIONS = [
  'Hypertension', 'Diabetes', 'Asthma', 'Heart Condition',
  'Joint Pain', 'Back Pain', 'Thyroid', 'None',
];

const TRAINERS = [
  'Rahul Sharma', 'Priya Mehta', 'Amit Verma', 'Neha Gupta', 'Vikram Singh', 'Sneha Patel',
];

const PT_PACKAGES: { id: PTpackage; sessions: number; price: number; popular?: boolean }[] = [
  { id: 'Starter', sessions: 8, price: 5999 },
  { id: 'Standard', sessions: 16, price: 10999, popular: true },
  { id: 'Premium', sessions: 24, price: 14999 },
  { id: 'Elite', sessions: 48, price: 25999 },
];

const FREQUENCIES: Frequency[] = ['1x/week', '2x/week', '3x/week', '4x/week', '5x/week'];

function initForm(): FormData {
  return {
    name: '', email: '', phone: '', dob: '', gender: 'Male',
    goal: '', height: '', weight: '', bodyFat: '',
    healthConditions: [], injuries: '',
    trainer: '', ptPackage: '', frequency: '',
    transformationGoals: '',
  };
}

/* ────────────────────────────────────────────────────────────────────
   FLOAT INPUT
──────────────────────────────────────────────────────────────────── */
function FloatInput({
  label, type = 'text', value, onChange, placeholder = ' ', suffix, required, multiline,
}: {
  label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
  suffix?: React.ReactNode; required?: boolean; multiline?: boolean;
}) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;
  return (
    <div className="relative">
      <div
        className="relative overflow-hidden rounded-[13px] transition-all"
        style={{
          background: focused ? 'rgba(255,255,255,0.95)' : 'rgba(248,250,252,0.9)',
          border: focused ? '1.5px solid rgba(220,38,38,0.40)' : '1.5px solid rgba(15,23,42,0.09)',
          boxShadow: focused ? '0 0 0 3px rgba(220,38,38,0.08)' : '0 1px 2px rgba(15,23,42,0.04)',
          transition: 'all 180ms cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <label
          htmlFor={id}
          className="pointer-events-none absolute left-4 font-[500] transition-all"
          style={{
            top: lifted ? 8 : 18,
            fontSize: lifted ? 10 : 13,
            color: lifted ? (focused ? '#dc2626' : 'rgb(148,163,184)') : 'rgb(148,163,184)',
            transition: 'all 150ms cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          {label}{required && ' *'}
        </label>
        {multiline ? (
          <textarea
            id={id}
            value={value}
            placeholder={lifted ? placeholder : ''}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="w-full bg-transparent px-4 pb-3 pt-7 text-[13.5px] font-[500] outline-none resize-none"
            style={{ color: 'rgb(15,23,42)', caretColor: '#dc2626', minHeight: 80 }}
          />
        ) : (
          <input
            id={id}
            type={type}
            value={value}
            placeholder={lifted ? placeholder : ''}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="w-full bg-transparent px-4 pb-3 pt-7 text-[13.5px] font-[500] outline-none"
            style={{ color: 'rgb(15,23,42)', caretColor: '#dc2626' }}
          />
        )}
        {suffix && <div className="absolute right-4 top-1/2 -translate-y-1/2">{suffix}</div>}
      </div>
    </div>
  );
}

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
          background: open ? 'rgba(255,255,255,0.95)' : 'rgba(248,250,252,0.9)',
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
            style={{ background: 'rgba(255,255,255,0.98)', border: '1px solid rgba(15,23,42,0.09)', boxShadow: '0 12px 32px rgba(15,23,42,0.12)' }}
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
                {value === opt && <Check size={12} style={{ color: '#dc2626' }} />}
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
      style={{ background: 'rgba(255,255,255,0.80)', border: '1px solid rgba(15,23,42,0.07)', boxShadow: '0 1px 4px rgba(15,23,42,0.04)' }}>
      {STEPS.map((s, i) => {
        const active = current === s.id;
        const done = current > s.id;
        return (
          <React.Fragment key={s.id}>
            {i > 0 && (
              <div className="h-px flex-1 mx-1" style={{ background: done ? '#dc2626' : 'rgba(15,23,42,0.08)', transition: 'background 0.3s' }} />
            )}
            <button
              type="button"
              onClick={() => { if (s.id <= current + 1) onStep(s.id as StepId); }}
              className={cn(
                'relative flex items-center gap-2 rounded-[12px] px-3.5 py-2.5 text-[12px] font-[680] transition-all',
              )}
              style={{
                background: active ? 'linear-gradient(135deg,#dc2626,#b91c1c)' : done ? 'rgba(220,38,38,0.08)' : 'transparent',
                color: active ? '#fff' : done ? '#dc2626' : 'rgb(148,163,184)',
                boxShadow: active ? '0 4px 16px rgba(220,38,38,0.25)' : 'none',
              }}
            >
              <span className={cn('flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-[800]',
                active ? 'bg-white/20 text-white' : done ? 'bg-[#dc2626] text-white' : 'bg-zinc-100 text-zinc-400'
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
   MAIN PAGE
──────────────────────────────────────────────────────────────────── */
export default function NewPTClientPage() {
  return <Guard><AppShell><NewClientWizard /></AppShell></Guard>;
}

function NewClientWizard() {
  const [step, setStep] = useState<StepId>(1);
  const [form, setForm] = useState<FormData>(initForm);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

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

  const canNext = useMemo(() => {
    if (step === 1) return form.name && form.email && form.phone;
    if (step === 2) return form.goal && form.height && form.weight;
    if (step === 3) return form.trainer && form.ptPackage && form.frequency;
    return true;
  }, [step, form]);

  const handleNext = () => {
    if (!canNext) { setError('Please fill in all required fields.'); return; }
    setError('');
    setStep((s) => Math.min(s + 1, 4) as StepId);
  };

  const handlePrev = () => {
    setError('');
    setStep((s) => Math.max(s - 1, 1) as StepId);
  };

  const handleSubmit = async () => {
    setError('');
    if (!form.transformationGoals) { setError('Please describe transformation goals.'); return; }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 1500));
    setSaving(false);
    setDone(true);
    setShowSuccess(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const selectedPackage = PT_PACKAGES.find((p) => p.id === form.ptPackage);
  const totalSessions = selectedPackage?.sessions || 0;

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
            style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)', boxShadow: '0 20px 60px rgba(220,38,38,0.3)' }}
          >
            <CheckCircle2 size={44} color="white" />
          </motion.div>
          <h2 className="text-[28px] font-[860] tracking-[-0.03em]" style={{ color: 'rgb(15,23,42)' }}>Client Onboarded!</h2>
          <p className="mt-2 text-[15px]" style={{ color: 'rgb(148,163,184)' }}>
            {form.name} has been registered for {form.ptPackage} PT package with {form.trainer}.
          </p>
          <div className="mt-6 flex gap-3">
            <PremiumButton tone="primary" glow onClick={() => { setShowSuccess(false); setDone(false); setForm(initForm); setStep(1); setPhotoPreview(null); }}>
              Onboard Another
            </PremiumButton>
            <PremiumButton tone="secondary">View Client Profile</PremiumButton>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(145deg,#f8fafc 0%,#f1f5f9 50%,#fafafe 100%)' }}>
      {/* ── HEADER ── */}
      <div className="sticky top-0 z-40 border-b" style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(20px)', borderColor: 'rgba(15,23,42,0.07)' }}>
        <div className="mx-auto max-w-screen-xl px-5 py-4 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-[12px]" style={{ background: 'rgba(220,38,38,0.10)' }}>
                  <Award size={16} style={{ color: '#dc2626' }} />
                </div>
                <div>
                  <h1 className="text-[22px] font-[860] tracking-[-0.03em]" style={{ color: 'rgb(15,23,42)' }}>New PT Client</h1>
                  <p className="text-[11px] font-[600] uppercase tracking-[0.08em]" style={{ color: 'rgb(148,163,184)' }}>
                    Personal Training / <span style={{ color: '#dc2626' }}>New Client</span>
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-[600]" style={{ color: 'rgb(148,163,184)' }}>Step {step} of 4</span>
              <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(15,23,42,0.08)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg,#dc2626,#b91c1c)' }}
                  animate={{ width: `${(step / 4) * 100}%` }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-screen-xl px-5 py-6 sm:px-8">
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
                <div className="rounded-[22px] p-6 sm:p-8" style={{ background: 'rgba(255,255,255,0.82)', border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 2px 20px rgba(15,23,42,0.07)' }}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[12px]" style={{ background: 'rgba(220,38,38,0.10)' }}>
                      <User size={18} style={{ color: '#dc2626' }} />
                    </div>
                    <div>
                      <h2 className="text-[17px] font-[760] tracking-[-0.02em]" style={{ color: 'rgb(15,23,42)' }}>Personal Information</h2>
                      <p className="text-[12.5px]" style={{ color: 'rgb(148,163,184)' }}>Basic details to create the client profile.</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FloatInput label="Full Name" value={form.name} onChange={(v) => set('name', v)} required />
                      <FloatInput label="Email Address" type="email" value={form.email} onChange={(v) => set('email', v)} required />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <FloatInput label="Phone Number" type="tel" value={form.phone} onChange={(v) => set('phone', v)} required />
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
                                background: form.gender === g ? 'linear-gradient(135deg,#dc2626,#b91c1c)' : 'rgba(248,250,252,0.9)',
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
                <div className="rounded-[22px] p-6 sm:p-8" style={{ background: 'rgba(255,255,255,0.82)', border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 2px 20px rgba(15,23,42,0.07)' }}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[12px]" style={{ background: 'rgba(220,38,38,0.10)' }}>
                      <Activity size={18} style={{ color: '#dc2626' }} />
                    </div>
                    <div>
                      <h2 className="text-[17px] font-[760] tracking-[-0.02em]" style={{ color: 'rgb(15,23,42)' }}>Fitness Profile</h2>
                      <p className="text-[12.5px]" style={{ color: 'rgb(148,163,184)' }}>Goals, measurements, and health assessment.</p>
                    </div>
                  </div>
                  <div className="space-y-5">
                    {/* Goals */}
                    <div>
                      <p className="mb-2.5 text-[13px] font-[700]" style={{ color: 'rgb(15,23,42)' }}>Primary Fitness Goal</p>
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
                              background: form.goal === g ? 'linear-gradient(135deg,#dc2626,#b91c1c)' : 'rgba(248,250,252,0.9)',
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
                      <FloatInput label="Height (cm)" type="number" value={form.height} onChange={(v) => set('height', v)} required />
                      <FloatInput label="Weight (kg)" type="number" value={form.weight} onChange={(v) => set('weight', v)} required />
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
                              background: form.healthConditions.includes(cond) ? 'rgba(220,38,38,0.10)' : 'rgba(248,250,252,0.9)',
                              border: form.healthConditions.includes(cond) ? '1.5px solid rgba(220,38,38,0.30)' : '1.5px solid rgba(15,23,42,0.09)',
                              color: form.healthConditions.includes(cond) ? '#dc2626' : 'rgb(100,116,139)',
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
                <div className="rounded-[22px] p-6 sm:p-8" style={{ background: 'rgba(255,255,255,0.82)', border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 2px 20px rgba(15,23,42,0.07)' }}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[12px]" style={{ background: 'rgba(220,38,38,0.10)' }}>
                      <Dumbbell size={18} style={{ color: '#dc2626' }} />
                    </div>
                    <div>
                      <h2 className="text-[17px] font-[760] tracking-[-0.02em]" style={{ color: 'rgb(15,23,42)' }}>PT Assignment</h2>
                      <p className="text-[12.5px]" style={{ color: 'rgb(148,163,184)' }}>Assign trainer and choose a package.</p>
                    </div>
                  </div>
                  <div className="space-y-5">
                    {/* Trainer Selector */}
                    <PremiumSelect
                      label="Select Trainer"
                      value={form.trainer}
                      onChange={(v) => set('trainer', v)}
                      options={TRAINERS}
                      placeholder="Choose a personal trainer"
                    />

                    {/* PT Packages */}
                    <div>
                      <p className="mb-2.5 text-[13px] font-[700]" style={{ color: 'rgb(15,23,42)' }}>PT Package</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {PT_PACKAGES.map((pkg) => (
                          <button
                            key={pkg.id}
                            type="button"
                            onClick={() => set('ptPackage', pkg.id)}
                            className={cn(
                              'relative rounded-[16px] p-4 text-left transition-all',
                            )}
                            style={{
                              background: form.ptPackage === pkg.id ? 'linear-gradient(135deg,#dc2626,#b91c1c)' : 'rgba(248,250,252,0.9)',
                              border: form.ptPackage === pkg.id ? '1.5px solid transparent' : '1.5px solid rgba(15,23,42,0.09)',
                              boxShadow: form.ptPackage === pkg.id ? '0 4px 20px rgba(220,38,38,0.25)' : 'none',
                              color: form.ptPackage === pkg.id ? '#fff' : 'rgb(15,23,42)',
                            }}
                          >
                            {pkg.popular && (
                              <span className="absolute -top-2 -right-2 rounded-full px-2 py-0.5 text-[9px] font-[800] uppercase tracking-wider"
                                style={{ background: '#f59e0b', color: '#fff', boxShadow: '0 2px 8px rgba(245,158,11,0.3)' }}>
                                Popular
                              </span>
                            )}
                            <p className="text-[13px] font-[720]">{pkg.id}</p>
                            <p className="mt-1 text-[24px] font-[860] tracking-[-0.03em]">
                              ₹{pkg.price.toLocaleString('en-IN')}
                            </p>
                            <p className="mt-1 text-[11px] font-[600]" style={{ opacity: 0.75 }}>
                              {pkg.sessions} sessions
                            </p>
                            <p className="text-[11px]" style={{ opacity: 0.65 }}>
                              ₹{Math.round(pkg.price / pkg.sessions).toLocaleString('en-IN')} / session
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Session Frequency */}
                    <PremiumSelect
                      label="Session Frequency"
                      value={form.frequency}
                      onChange={(v) => set('frequency', v)}
                      options={FREQUENCIES}
                      placeholder="Select weekly frequency"
                    />

                    {/* Summary */}
                    {form.trainer && form.ptPackage && form.frequency && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="rounded-[14px] p-4"
                        style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)' }}
                      >
                        <p className="text-[12px] font-[700] tracking-wider uppercase" style={{ color: '#dc2626' }}>Assignment Summary</p>
                        <div className="mt-2 space-y-1 text-[13px]" style={{ color: 'rgb(100,116,139)' }}>
                          <p>Trainer: <strong style={{ color: 'rgb(15,23,42)' }}>{form.trainer}</strong></p>
                          <p>Package: <strong style={{ color: 'rgb(15,23,42)' }}>{form.ptPackage}</strong></p>
                          <p>Frequency: <strong style={{ color: 'rgb(15,23,42)' }}>{form.frequency}</strong></p>
                          <p>Estimated duration: <strong style={{ color: 'rgb(15,23,42)' }}>~{Math.round(totalSessions / parseInt(form.frequency || '1'))} weeks</strong></p>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
                <div className="rounded-[22px] p-6 sm:p-8" style={{ background: 'rgba(255,255,255,0.82)', border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 2px 20px rgba(15,23,42,0.07)' }}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[12px]" style={{ background: 'rgba(220,38,38,0.10)' }}>
                      <FileText size={18} style={{ color: '#dc2626' }} />
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
                        { k: 'Package', v: form.ptPackage },
                        { k: 'Sessions', v: `${totalSessions} sessions` },
                        { k: 'Frequency', v: form.frequency },
                        { k: 'Investment', v: selectedPackage ? `₹${selectedPackage.price.toLocaleString('en-IN')}` : '—' },
                      ]},
                      { title: 'Photo', items: [
                        { k: 'Photo Upload', v: photoPreview ? 'Uploaded ✓' : 'Not uploaded' },
                      ]},
                    ].map((section) => (
                      <div key={section.title}
                        className="rounded-[14px] p-4"
                        style={{ background: 'rgba(248,250,252,0.9)', border: '1px solid rgba(15,23,42,0.07)' }}
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
                    <p className="mb-2.5 text-[13px] font-[700]" style={{ color: 'rgb(15,23,42)' }}>Transformation Goals</p>
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
        <div className="sticky bottom-0 mt-6 z-40 rounded-[18px] p-4"
          style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', border: '1px solid rgba(15,23,42,0.07)', boxShadow: '0 -4px 24px rgba(15,23,42,0.06)' }}>
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
                <PremiumButton tone="primary" icon={<ChevronRight size={14} />} onClick={handleNext} disabled={!canNext}>
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
      </div>
    </div>
  );
}
