'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Check, User, Phone, Mail,
  Target, Dumbbell, CheckCircle2, RefreshCw, Award, X,
  Activity, Sparkles, Heart, FileSpreadsheet,
} from 'lucide-react';
import { getSheetCacheSync, lookupByMobile } from '@/lib/sheet-import';
import { useRouter } from 'next/navigation';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { PremiumButton } from '@/components/premium/PremiumButton';
import { cn } from '@/components/ui/cn';
import { api } from '@/lib/api';
import FloatInput from '@/components/ui/FloatInput';

/* ── Types ────────────────────────────────────────────────────────────── */
type StepId = 1 | 2;
type Goal = 'Weight Loss' | 'Muscle Gain' | 'Endurance' | 'General Fitness' | 'Body Recomposition' | 'Fat Loss & Toning' | 'Flexibility & Mobility' | 'Sports Performance';

interface FormData {
  name: string;
  phone: string;
  email: string;
  gender: string;
  goal: Goal | '';
  healthConditions: string[];
  trainer: string;
  planId: string;
  plan: string;
  sellingPrice: number | null;
  startDate: string;
  endDate: string;
  notes: string;
}

/* ── Constants ────────────────────────────────────────────────────────── */
const STEPS = [
  { id: 1, label: 'Personal Info', icon: <User size={16} /> },
  { id: 2, label: 'Training Setup', icon: <Dumbbell size={16} /> },
];

const GENDERS = ['Male', 'Female', 'Other'];

const GOALS: Goal[] = [
  'Weight Loss', 'Muscle Gain', 'Endurance', 'General Fitness',
  'Body Recomposition', 'Fat Loss & Toning', 'Flexibility & Mobility', 'Sports Performance',
];

const GOAL_ICONS: Record<string, React.ReactNode> = {
  'Weight Loss': <Target size={16} />,
  'Muscle Gain': <Dumbbell size={16} />,
  'Endurance': <Heart size={16} />,
  'General Fitness': <Activity size={16} />,
};

const HEALTH_CONDITIONS = [
  'Hypertension', 'Diabetes', 'Asthma', 'Heart Condition',
  'Joint Pain', 'Back Pain', 'Thyroid', 'None',
];

function fmtINR(n: number | string | null | undefined) {
  return '₹' + Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function initForm(): FormData {
  return {
    name: '', phone: '', email: '', gender: 'Male',
    goal: '', healthConditions: [],
    trainer: '', planId: '', plan: '',
    sellingPrice: null,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '', notes: '',
  };
}

/* ── Step Indicator ───────────────────────────────────────────────────── */
function StepIndicator({ current }: { current: StepId }) {
  return (
    <div className="flex items-center gap-0 rounded-[16px] p-1.5"
      style={{ background: 'var(--bg-card)', border: '1px solid rgba(15,23,42,0.07)', boxShadow: '0 1px 4px rgba(15,23,42,0.04)' }}>
      {STEPS.map((s, i) => {
        const active = current === s.id;
        const done = current > s.id;
        return (
          <React.Fragment key={s.id}>
            {i > 0 && (
              <div className="h-px flex-1 mx-1"
                style={{ background: done ? '#F59E0B' : 'var(--border-2)', transition: 'background 0.3s' }} />
            )}
            <div className={cn('relative flex items-center gap-2 rounded-[12px] px-3.5 py-2.5 text-[12px] font-[680]')}
              style={{
                background: active ? 'linear-gradient(135deg,#F59E0B,#D97706)' : done ? 'rgba(245,158,11,0.08)' : 'transparent',
                color: active ? '#fff' : done ? '#F59E0B' : 'rgb(148,163,184)',
                boxShadow: active ? '0 4px 16px rgba(245,158,11,0.25)' : 'none',
              }}
            >
              <span className={cn('flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-[800]',
                active ? 'bg-white/20 text-white' : done ? 'bg-[#F59E0B] text-white' : 'bg-zinc-100 text-zinc-400'
              )}>
                {done ? <Check size={10} strokeWidth={3} /> : s.id}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────────────────── */
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
      setDataLoading(true); setDataError('');
      const [trainersRes, plansRes] = await Promise.all([
        api.pt.trainers() as Promise<{ data: unknown[] }>,
        api.pt.plans.list() as Promise<{ data: unknown[] }>,
      ]);
      const arr = Array.isArray(trainersRes?.data) ? trainersRes.data : [];
      setTrainers(arr.map((t: any) => t.name ?? t));
      const map: Record<string, string> = {};
      arr.forEach((t: any) => { if (t.name && t.id) map[t.name] = t.id; });
      setTrainerIdMap(map);
      setPlans(Array.isArray(plansRes?.data)
        ? plansRes.data.map((p: any) => ({ id: p.id, name: p.name, base_amount: p.base_amount, duration_months: p.duration_months }))
        : []);
    } catch (err: any) {
      setDataError(err?.message || 'Failed to load data');
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const cache = getSheetCacheSync();
    if (cache?.rowCount) setSheetRowCount(cache.rowCount);
  }, []);

  /* Auto-fill from sheet when phone entered */
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
        const mappedG = gMap[gKey] || '';
        if (mappedG && GENDERS.includes(mappedG)) { next.gender = mappedG; filled++; }
        if (rec.interested_in) {
          const goalNorm = rec.interested_in.toLowerCase().replace(/[^a-z ]/g, '').trim();
          const matched = GOALS.find(g => g.toLowerCase().includes(goalNorm) || goalNorm.includes(g.toLowerCase().replace(/[^a-z ]/g, '')));
          if (matched) { next.goal = matched; filled++; }
        }
        if (rec.trainer_name && trainers.length) {
          const tNorm = rec.trainer_name.toLowerCase().trim();
          const match = trainers.find(t => t.toLowerCase() === tNorm || t.toLowerCase().includes(tNorm));
          if (match) { next.trainer = match; filled++; }
        }
        if (rec.package_type && plans.length) {
          const pNorm = rec.package_type.toLowerCase().trim();
          const match = plans.find(p => p.name.toLowerCase() === pNorm || p.name.toLowerCase().includes(pNorm));
          if (match) {
            let ed = prev.endDate;
            if (prev.startDate && match.duration_months > 0) {
              const d = new Date(prev.startDate);
              d.setMonth(d.getMonth() + match.duration_months);
              ed = d.toISOString().slice(0, 10);
            }
            next.planId = match.id; next.plan = match.name; next.endDate = ed; filled++;
          }
        }
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
    setForm(prev => ({ ...prev, [key]: val }));
  }, []);

  const toggleCondition = (cond: string) => {
    setForm(prev => ({
      ...prev,
      healthConditions: prev.healthConditions.includes(cond)
        ? prev.healthConditions.filter(c => c !== cond)
        : [...prev.healthConditions, cond],
    }));
  };

  const validateStep = (s: StepId): string | null => {
    if (s === 1) {
      if (!form.name.trim()) return 'Full name is required.';
      if (!form.phone.trim()) return 'Phone number is required.';
    }
    if (s === 2) {
      if (!form.trainer) return 'Please select a trainer.';
      if (!form.planId) return 'Please select a plan.';
      if (!form.sellingPrice || form.sellingPrice <= 0) return 'Please enter the selling price.';
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setError('');
    setStep(2);
  };

  const handleSubmit = async () => {
    const err = validateStep(2);
    if (err) { setError(err); return; }
    setError('');
    setSaving(true);
    try {
      const selectedPlan = plans.find(p => p.id === form.planId);
      const res = await api.pt.create({
        name: form.name.trim(),
        mobile: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        gender: form.gender,
        trainer_id: trainerIdMap[form.trainer] || undefined,
        trainer_name: form.trainer || undefined,
        package_type: form.plan || undefined,
        duration_months: selectedPlan?.duration_months || undefined,
        goal: form.goal || undefined,
        health_conditions: form.healthConditions.length ? form.healthConditions.join(', ') : undefined,
        notes: form.notes.trim() || undefined,
        base_amount: selectedPlan?.base_amount ?? null,
        monthly_pt_amount: form.sellingPrice ?? 0,
        discount: selectedPlan?.base_amount != null && form.sellingPrice != null
          ? Math.max(0, selectedPlan.base_amount - form.sellingPrice) : 0,
        pt_start_date: form.startDate,
        pt_end_date: form.endDate || undefined,
        pt_package_id: form.planId || undefined,
      } as Record<string, unknown>);
      setCreatedId((res as any)?.data?.id || null);
      setDone(true);
      setShowSuccess(true);
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

  /* ── Success ── */
  if (showSuccess) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="flex min-h-[80vh] items-center justify-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="flex flex-col items-center text-center max-w-md mx-auto px-4"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
            className="flex h-24 w-24 items-center justify-center rounded-[28px] mb-6"
            style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)', boxShadow: '0 20px 60px rgba(245,158,11,0.3)' }}
          >
            <CheckCircle2 size={44} color="white" />
          </motion.div>
          <h2 className="text-[28px] font-[860] tracking-[-0.03em]" style={{ color: 'rgb(15,23,42)' }}>Client Onboarded!</h2>
          <p className="mt-2 text-[15px]" style={{ color: 'rgb(148,163,184)' }}>
            {form.name} has been registered with trainer {form.trainer}.
          </p>
          <div className="mt-6 flex gap-3">
            <PremiumButton tone="primary" glow onClick={() => {
              setShowSuccess(false); setDone(false);
              setForm(initForm()); setStep(1);
            }}>
              Onboard Another
            </PremiumButton>
            {createdId && (
              <PremiumButton tone="secondary" onClick={() => router.push(`/pt-os/clients/${createdId}`)}>
                View Profile
              </PremiumButton>
            )}
          </div>
        </motion.div>
      </motion.div>
    );
  }

  if (dataLoading) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8">
        <div className="rounded-[22px] p-8 animate-pulse"
          style={{ background: 'var(--bg-card)', border: '1px solid rgba(15,23,42,0.07)' }}>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 rounded-[12px]" style={{ background: 'var(--border)' }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8 text-center">
        <div className="rounded-[22px] p-8"
          style={{ background: 'var(--bg-card)', border: '1px solid rgba(15,23,42,0.07)' }}>
          <RefreshCw size={28} className="mx-auto mb-3" style={{ color: '#F59E0B' }} />
          <p className="text-[14px] font-[600]" style={{ color: 'rgb(15,23,42)' }}>Failed to load data</p>
          <p className="text-[12px] mt-1 mb-4" style={{ color: 'rgb(148,163,184)' }}>{dataError}</p>
          <PremiumButton tone="primary" onClick={fetchData}>Retry</PremiumButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(145deg,#f8fafc 0%,#f1f5f9 50%,#fafafe 100%)' }}>

      {/* ── Header ── */}
      <div className="sticky top-0 z-40 border-b"
        style={{ background: 'var(--bg-card)', backdropFilter: 'blur(20px)', borderColor: 'var(--border)' }}>
        <div className="mx-auto max-w-2xl px-5 py-4 sm:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-[12px]"
                style={{ background: 'rgba(245,158,11,0.10)' }}>
                <Award size={16} style={{ color: '#F59E0B' }} />
              </div>
              <div>
                <h1 className="text-[18px] font-[860] tracking-[-0.02em]" style={{ color: 'rgb(15,23,42)' }}>New PT Client</h1>
                <p className="text-[11px] font-[600] uppercase tracking-[0.08em]" style={{ color: 'rgb(148,163,184)' }}>
                  Step {step} of 2
                </p>
              </div>
            </div>
            <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-2)' }}>
              <motion.div className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg,#F59E0B,#D97706)' }}
                animate={{ width: `${(step / 2) * 100}%` }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-5 py-6 sm:px-8">

        {/* Sheet import banner */}
        {sheetRowCount !== null && (
          <div className="mb-4 flex items-center gap-2.5 rounded-[12px] px-4 py-3"
            style={{ background: 'rgba(13,148,136,0.07)', border: '1px solid rgba(13,148,136,0.2)' }}>
            <FileSpreadsheet size={14} style={{ color: '#0d9488', flexShrink: 0 }} />
            <span className="text-[12px] font-[600]" style={{ color: '#065f46' }}>
              {sheetRowCount} records imported — enter phone to auto-fill
            </span>
            <button onClick={() => setSheetRowCount(null)} className="ml-auto">
              <X size={13} style={{ color: '#9ca3af' }} />
            </button>
          </div>
        )}

        <StepIndicator current={step} />

        {error && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-[12px] p-3.5 text-[13px] font-[500]"
            style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#9f1239' }}>
            {error}
          </motion.div>
        )}

        <div className="mt-5">
          <AnimatePresence mode="wait">

            {/* ── Step 1: Personal Info ── */}
            {step === 1 && (
              <motion.div key="step1"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
                <div className="rounded-[22px] p-6 sm:p-8"
                  style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 2px 20px rgba(15,23,42,0.07)' }}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[12px]"
                      style={{ background: 'rgba(245,158,11,0.10)' }}>
                      <User size={18} style={{ color: '#F59E0B' }} />
                    </div>
                    <div>
                      <h2 className="text-[16px] font-[760] tracking-[-0.02em]" style={{ color: 'rgb(15,23,42)' }}>Personal Info</h2>
                      <p className="text-[12px]" style={{ color: 'rgb(148,163,184)' }}>Basic details to create the client profile.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Name + Phone */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FloatInput label="Full Name *" value={form.name} onChange={v => set('name', v)} />
                      <div>
                        <FloatInput label="Phone Number *" type="tel" value={form.phone} onChange={v => set('phone', v)} />
                        {autofillNote && (
                          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                            className="mt-1.5 flex items-center gap-1.5 rounded-[8px] px-2.5 py-1.5"
                            style={{ background: 'rgba(13,148,136,0.08)', border: '1px solid rgba(13,148,136,0.2)' }}>
                            <CheckCircle2 size={11} style={{ color: '#0d9488', flexShrink: 0 }} />
                            <span className="text-[11px] font-[600]" style={{ color: '#065f46' }}>{autofillNote}</span>
                          </motion.div>
                        )}
                      </div>
                    </div>

                    {/* Email */}
                    <FloatInput label="Email Address (optional)" type="email" value={form.email} onChange={v => set('email', v)} />

                    {/* Gender */}
                    <div>
                      <p className="mb-2 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Gender</p>
                      <div className="flex gap-2">
                        {GENDERS.map(g => (
                          <button key={g} type="button" onClick={() => set('gender', g)}
                            className={cn('rounded-[10px] px-4 py-2 text-[12px] font-[600] transition-all flex-1',
                              form.gender === g ? 'text-white' : 'text-zinc-500 hover:text-zinc-800'
                            )}
                            style={{
                              background: form.gender === g ? 'linear-gradient(135deg,#F59E0B,#D97706)' : 'var(--bg-subtle)',
                              border: form.gender === g ? '1.5px solid transparent' : '1.5px solid rgba(15,23,42,0.09)',
                              boxShadow: form.gender === g ? '0 2px 8px rgba(245,158,11,0.2)' : 'none',
                            }}>
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Step 2: Training Setup ── */}
            {step === 2 && (
              <motion.div key="step2"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
                <div className="rounded-[22px] p-6 sm:p-8"
                  style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 2px 20px rgba(15,23,42,0.07)' }}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[12px]"
                      style={{ background: 'rgba(245,158,11,0.10)' }}>
                      <Dumbbell size={18} style={{ color: '#F59E0B' }} />
                    </div>
                    <div>
                      <h2 className="text-[16px] font-[760] tracking-[-0.02em]" style={{ color: 'rgb(15,23,42)' }}>Training Setup</h2>
                      <p className="text-[12px]" style={{ color: 'rgb(148,163,184)' }}>Assign trainer, plan, and pricing.</p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    {/* Trainer */}
                    <div>
                      <p className="mb-2 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Trainer *</p>
                      <div className="relative">
                        <select
                          value={form.trainer}
                          onChange={e => set('trainer', e.target.value)}
                          className="w-full rounded-[13px] px-4 py-3.5 text-[13px] font-[500] outline-none appearance-none cursor-pointer"
                          style={{
                            background: 'var(--bg-subtle)',
                            border: '1.5px solid rgba(15,23,42,0.09)',
                            color: form.trainer ? 'rgb(15,23,42)' : 'rgb(148,163,184)',
                          }}>
                          <option value="">Select a trainer…</option>
                          {trainers.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <svg className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                          width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
                          style={{ color: 'rgb(148,163,184)' }}>
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </div>
                    </div>

                    {/* Plan */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Subscription Plan *</p>
                        <a href="/pt-os/plans" target="_blank" rel="noopener noreferrer"
                          className="text-[11px] font-[660] hover:underline" style={{ color: '#F59E0B' }}>
                          + Manage Plans
                        </a>
                      </div>
                      <div className="relative">
                        <select
                          value={form.planId}
                          onChange={e => {
                            const p = plans.find(p => p.id === e.target.value);
                            if (p) {
                              setForm(prev => {
                                let ed = prev.endDate;
                                if (prev.startDate && p.duration_months > 0) {
                                  const d = new Date(prev.startDate);
                                  d.setMonth(d.getMonth() + p.duration_months);
                                  ed = d.toISOString().slice(0, 10);
                                }
                                return { ...prev, planId: p.id, plan: p.name, endDate: ed };
                              });
                            } else {
                              set('planId', ''); set('plan', '');
                            }
                          }}
                          className="w-full rounded-[13px] px-4 py-3.5 text-[13px] font-[500] outline-none appearance-none cursor-pointer"
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

                    {/* Start Date + Selling Price */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="mb-2 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Start Date</p>
                        <input
                          type="date"
                          value={form.startDate}
                          onChange={e => {
                            const sd = e.target.value;
                            setForm(prev => {
                              const p = plans.find(p => p.id === prev.planId);
                              const months = p?.duration_months ?? 0;
                              let ed = '';
                              if (sd && months > 0) {
                                const d = new Date(sd);
                                d.setMonth(d.getMonth() + months);
                                ed = d.toISOString().slice(0, 10);
                              }
                              return { ...prev, startDate: sd, endDate: ed };
                            });
                          }}
                          className="w-full rounded-[13px] px-4 py-3.5 text-[13px] font-[500] outline-none"
                          style={{
                            background: 'var(--bg-subtle)',
                            border: '1.5px solid rgba(15,23,42,0.09)',
                            color: 'rgb(15,23,42)',
                          }}
                        />
                      </div>
                      <FloatInput
                        label="Selling Price (₹) *"
                        type="number"
                        value={String(form.sellingPrice ?? '')}
                        onChange={v => {
                          const n = parseFloat(v);
                          set('sellingPrice', isNaN(n) ? null : n);
                        }}
                      />
                    </div>

                    {/* End Date (read-only) */}
                    {form.endDate && (
                      <div className="flex items-center gap-2 rounded-[12px] px-4 py-2.5"
                        style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                        <span className="text-[11.5px] font-[600]" style={{ color: 'rgb(148,163,184)' }}>Ends:</span>
                        <span className="text-[13px] font-[680]" style={{ color: 'rgb(15,23,42)' }}>
                          {new Date(form.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                    )}

                    {/* Goal (optional) */}
                    <div>
                      <p className="mb-2.5 text-[13px] font-[700]" style={{ color: 'rgb(15,23,42)' }}>
                        Fitness Goal <span className="text-[11px] font-[500]" style={{ color: 'rgb(148,163,184)' }}>(optional)</span>
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {GOALS.map(g => (
                          <button key={g} type="button" onClick={() => set('goal', form.goal === g ? '' : g)}
                            className="rounded-[12px] p-3 text-center transition-all"
                            style={{
                              background: form.goal === g ? 'linear-gradient(135deg,#F59E0B,#D97706)' : 'var(--bg-subtle)',
                              border: form.goal === g ? '1.5px solid transparent' : '1.5px solid rgba(15,23,42,0.09)',
                              boxShadow: form.goal === g ? '0 4px 12px rgba(245,158,11,0.2)' : 'none',
                              color: form.goal === g ? '#fff' : 'rgb(15,23,42)',
                            }}>
                            <div className="flex justify-center mb-1">
                              {GOAL_ICONS[g] || <Sparkles size={15} />}
                            </div>
                            <span className="text-[10px] font-[680] leading-tight">{g}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Health Conditions (optional) */}
                    <div>
                      <p className="mb-2 text-[13px] font-[700]" style={{ color: 'rgb(15,23,42)' }}>
                        Health Conditions <span className="text-[11px] font-[500]" style={{ color: 'rgb(148,163,184)' }}>(optional)</span>
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {HEALTH_CONDITIONS.map(cond => (
                          <button key={cond} type="button" onClick={() => toggleCondition(cond)}
                            className="rounded-[10px] px-3 py-1.5 text-[12px] font-[600] transition-all"
                            style={{
                              background: form.healthConditions.includes(cond) ? 'rgba(245,158,11,0.12)' : 'var(--bg-subtle)',
                              border: form.healthConditions.includes(cond) ? '1.5px solid rgba(245,158,11,0.35)' : '1.5px solid rgba(15,23,42,0.09)',
                              color: form.healthConditions.includes(cond) ? '#D97706' : 'rgb(100,116,139)',
                            }}>
                            {form.healthConditions.includes(cond) && <Check size={10} className="inline mr-1" />}
                            {cond}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Notes (optional) */}
                    <FloatInput
                      label="Notes (optional)"
                      value={form.notes}
                      onChange={v => set('notes', v)}
                      multiline
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Navigation ── */}
        <div className="mt-5 rounded-[16px] p-4"
          style={{ background: 'var(--bg-card)', border: '1px solid rgba(15,23,42,0.07)', boxShadow: '0 -2px 12px rgba(15,23,42,0.04)' }}>
          <div className="flex items-center justify-between gap-4">
            {step > 1 ? (
              <PremiumButton tone="secondary" icon={<ChevronLeft size={14} />} onClick={() => { setError(''); setStep(1); }}>
                Back
              </PremiumButton>
            ) : (
              <div />
            )}
            {step === 1 ? (
              <PremiumButton tone="primary" icon={<ChevronRight size={14} />} onClick={handleNext}>
                Next
              </PremiumButton>
            ) : (
              <PremiumButton tone="success" glow icon={saving ? undefined : <Check size={14} />}
                onClick={handleSubmit} loading={saving} disabled={saving || done}>
                {done ? 'Onboarded!' : 'Confirm & Onboard'}
              </PremiumButton>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
