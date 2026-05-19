'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import type { PlanKind, PlanDuration } from '@/lib/plans';
import {
  Sparkles, ArrowLeft, Plus, X, Check, ChevronRight, Zap, Star, Crown,
  Dumbbell, Lock, Waves, Apple, Users, Clock, Shield, Gift, TrendingUp,
  Save, Eye, Copy, Send, Info, Flame, BarChart3, DollarSign, Tag, Layers,
} from 'lucide-react';

export default function CreatePlanPage() {
  return <Guard role="admin"><Inner /></Guard>;
}

const BENEFIT_ICONS = [
  { icon: '💪', label: 'Gym Access' },
  { icon: '🔒', label: 'Locker' },
  { icon: '♨️', label: 'Steam Room' },
  { icon: '🥗', label: 'Diet Consult' },
  { icon: '👥', label: 'Group Classes' },
  { icon: '🏃', label: 'Cardio Zone' },
  { icon: '📊', label: 'Body Composition' },
  { icon: '💊', label: 'Supplements' },
  { icon: '📸', label: 'Progress Photos' },
  { icon: '🎁', label: 'Guest Pass' },
  { icon: '🏆', label: 'Priority Booking' },
  { icon: '🍎', label: 'Nutrition Plan' },
];

const PLAN_COLORS = [
  { id: 'violet', from: '#7c3aed', to: '#4f46e5', label: 'Royal Violet' },
  { id: 'blue',   from: '#0ea5e9', to: '#6366f1', label: 'Ocean Blue' },
  { id: 'emerald',from: '#10b981', to: '#059669', label: 'Emerald' },
  { id: 'rose',   from: '#f43f5e', to: '#e11d48', label: 'Rose' },
  { id: 'amber',  from: '#f59e0b', to: '#d97706', label: 'Gold' },
  { id: 'cyan',   from: '#06b6d4', to: '#0891b2', label: 'Cyan' },
];

const DURATIONS: PlanDuration[] = ['Monthly', 'Quarterly', 'Half Yearly', 'Yearly'];

const DURATION_MONTHS: Record<PlanDuration, number> = {
  Monthly: 1, Quarterly: 3, 'Half Yearly': 6, Yearly: 12,
};

function fmtINR(n: number) {
  return '₹' + Number(n).toLocaleString('en-IN');
}

function Inner() {
  const router = useRouter();

  const [kind, setKind] = useState<PlanKind>('Membership');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState<PlanDuration>('Monthly');
  const [baseAmount, setBaseAmount] = useState(2500);
  const [discount, setDiscount] = useState(0);
  const [joiningFee, setJoiningFee] = useState(0);
  const [taxPct, setTaxPct] = useState(18);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);
  const [benefits, setBenefits] = useState<string[]>(['💪 Gym Access', '🔒 Locker']);
  const [popular, setPopular] = useState(false);
  const [planColor, setPlanColor] = useState('violet');
  const [newBenefit, setNewBenefit] = useState('');
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState('');
  const [activeSection, setActiveSection] = useState(0);

  const finalAmount = Math.max(0, baseAmount - discount);
  const taxAmount = Math.round(finalAmount * taxPct / 100);
  const totalWithTax = finalAmount + taxAmount + joiningFee;
  const colorObj = PLAN_COLORS.find(c => c.id === planColor) || PLAN_COLORS[0];
  const monthlyRate = finalAmount / (DURATION_MONTHS[duration] || 1);
  const savingPct = baseAmount > 0 ? Math.round((discount / baseAmount) * 100) : 0;

  function addBenefit(b: string) {
    if (b.trim() && !benefits.includes(b.trim())) {
      setBenefits(prev => [...prev, b.trim()]);
    }
    setNewBenefit('');
  }

  function removeBenefit(b: string) {
    setBenefits(prev => prev.filter(x => x !== b));
  }

  async function handleSave(publish = false) {
    if (!name.trim()) { setFlash('❌ Plan name is required'); setTimeout(() => setFlash(''), 3000); return; }
    if (finalAmount <= 0) { setFlash('❌ Final amount must be greater than 0'); setTimeout(() => setFlash(''), 3000); return; }
    setSaving(true);
    try {
      await api.plans.create({
        kind,
        name: name.trim(),
        description,
        duration,
        base_amount: baseAmount,
        discount,
        final_amount: finalAmount,
        joining_fee: joiningFee,
        tax_pct: taxPct,
        sessions_per_week: kind === 'PT' ? sessionsPerWeek : undefined,
        features: benefits,
        popular,
        color: planColor,
        is_active: publish,
      });
      setFlash('✓ Plan saved successfully!');
      setTimeout(() => router.push('/plans'), 1200);
    } catch (e: any) {
      setFlash('❌ ' + (e.message || 'Save failed'));
      setTimeout(() => setFlash(''), 4000);
    } finally {
      setSaving(false);
    }
  }

  const sections = [
    { id: 0, label: 'Basic Info',    icon: <Layers size={14} /> },
    { id: 1, label: 'Pricing',       icon: <DollarSign size={14} /> },
    { id: 2, label: 'Duration',      icon: <Clock size={14} /> },
    { id: 3, label: 'Benefits',      icon: <Gift size={14} /> },
  ];

  return (
    <AppShell>
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.07]" style={{ background: `radial-gradient(circle, ${colorObj.from}, transparent)` }} />
        <div className="absolute bottom-0 -left-32 w-96 h-96 rounded-full opacity-[0.05]" style={{ background: 'radial-gradient(circle, #0ea5e9, transparent)' }} />
      </div>

      <div className="relative" style={{ zIndex: 1 }}>

        {/* Flash */}
        <AnimatePresence>
          {flash && (
            <motion.div
              initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              style={{
                position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)',
                zIndex: 1000, padding: '12px 24px', borderRadius: 12, fontWeight: 700, fontSize: 14,
                background: flash.startsWith('✓') ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#ef4444,#dc2626)',
                color: '#fff', boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              }}
            >{flash}</motion.div>
          )}
        </AnimatePresence>

        {/* Hero Header */}
        <div className="mb-8" style={{
          background: `linear-gradient(135deg, ${colorObj.from}18, ${colorObj.to}0a, transparent)`,
          border: `1px solid ${colorObj.from}22`,
          borderRadius: 24, padding: '2rem 2.5rem',
          backdropFilter: 'blur(20px)',
        }}>
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => router.back()}
              className="flex items-center gap-2 text-sm font-medium"
              style={{ color: '#64748b', background: 'rgba(255,255,255,0.7)', padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)' }}
            >
              <ArrowLeft size={14} /> Back
            </button>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white" style={{ background: `linear-gradient(135deg, ${colorObj.from}, ${colorObj.to})`, boxShadow: `0 8px 24px ${colorObj.from}40` }}>
                  <Sparkles size={22} />
                </div>
                <div>
                  <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.04em', color: '#0f172a', lineHeight: 1 }}>Create Membership Plan</h1>
                  <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>Build premium pricing plans with advanced fitness business controls</p>
                </div>
              </div>
            </div>
            {/* AI Insight Card */}
            <div className="hidden lg:flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: `linear-gradient(135deg, ${colorObj.from}15, ${colorObj.to}10)`, border: `1px solid ${colorObj.from}25` }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${colorObj.from}, ${colorObj.to})` }}>
                <Zap size={14} className="text-white" />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: colorObj.from, textTransform: 'uppercase', letterSpacing: '0.06em' }}>AI Pricing Insight</div>
                <div style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>Avg quarterly plan converts 3× better than monthly</div>
              </div>
            </div>
          </div>

          {/* Plan Type Selector */}
          <div className="flex gap-3 mt-6">
            {(['Membership', 'PT'] as PlanKind[]).map(k => (
              <button key={k} onClick={() => setKind(k)}
                style={{
                  padding: '10px 24px', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer',
                  transition: 'all 0.2s', border: 'none',
                  background: kind === k ? `linear-gradient(135deg, ${colorObj.from}, ${colorObj.to})` : 'rgba(255,255,255,0.7)',
                  color: kind === k ? '#fff' : '#64748b',
                  boxShadow: kind === k ? `0 4px 16px ${colorObj.from}40` : 'none',
                }}
              >
                {k === 'Membership' ? '🏋️ Membership Plan' : '🏆 Personal Training Plan'}
              </button>
            ))}
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-[1fr_420px] gap-8">

          {/* LEFT: Form */}
          <div>

            {/* Section Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {sections.map(s => (
                <button key={s.id} onClick={() => setActiveSection(s.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap', border: 'none',
                    background: activeSection === s.id ? `linear-gradient(135deg, ${colorObj.from}, ${colorObj.to})` : 'rgba(255,255,255,0.8)',
                    color: activeSection === s.id ? '#fff' : '#64748b',
                    boxShadow: activeSection === s.id ? `0 4px 12px ${colorObj.from}30` : '0 1px 3px rgba(0,0,0,0.06)',
                  }}
                >
                  {s.icon} {s.label}
                  {s.id < activeSection && <Check size={12} style={{ color: activeSection === s.id ? '#fff' : '#10b981' }} />}
                </button>
              ))}
            </div>

            {/* Section Content */}
            <AnimatePresence mode="wait">
              <motion.div key={activeSection}
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >

                {/* ─── BASIC INFO ─── */}
                {activeSection === 0 && (
                  <div style={{ background: 'rgba(255,255,255,0.9)', borderRadius: 20, padding: '2rem', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
                    <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 24 }}>Plan Details</h2>

                    <div style={{ marginBottom: 20 }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Plan Name *</label>
                      <input value={name} onChange={e => setName(e.target.value)}
                        placeholder="e.g. Premium Monthly, PT Pro Pack..."
                        style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid rgba(0,0,0,0.1)', fontSize: 15, fontWeight: 500, outline: 'none', background: '#f8fafc', transition: 'border-color 0.2s' }}
                        onFocus={e => e.target.style.borderColor = colorObj.from}
                        onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.1)'}
                      />
                    </div>

                    <div style={{ marginBottom: 20 }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Description</label>
                      <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                        placeholder="Describe what makes this plan special..."
                        style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid rgba(0,0,0,0.1)', fontSize: 14, outline: 'none', background: '#f8fafc', resize: 'vertical', fontFamily: 'inherit', transition: 'border-color 0.2s' }}
                        onFocus={e => e.target.style.borderColor = colorObj.from}
                        onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.1)'}
                      />
                    </div>

                    {/* Color Theme */}
                    <div style={{ marginBottom: 20 }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Card Color Theme</label>
                      <div className="flex gap-3 flex-wrap">
                        {PLAN_COLORS.map(c => (
                          <button key={c.id} onClick={() => setPlanColor(c.id)}
                            title={c.label}
                            style={{
                              width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer',
                              background: `linear-gradient(135deg, ${c.from}, ${c.to})`,
                              boxShadow: planColor === c.id ? `0 0 0 3px white, 0 0 0 5px ${c.from}` : '0 2px 8px rgba(0,0,0,0.15)',
                              transform: planColor === c.id ? 'scale(1.15)' : 'scale(1)',
                              transition: 'all 0.2s',
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Popular Toggle */}
                    <div className="flex items-center justify-between" style={{ padding: '16px', borderRadius: 12, background: popular ? `${colorObj.from}10` : '#f8fafc', border: `1.5px solid ${popular ? colorObj.from + '30' : 'rgba(0,0,0,0.08)'}`, transition: 'all 0.2s' }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>⭐ Mark as Popular</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>Highlights this plan with a badge on the pricing page</div>
                      </div>
                      <button onClick={() => setPopular(p => !p)}
                        style={{
                          width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
                          background: popular ? `linear-gradient(135deg, ${colorObj.from}, ${colorObj.to})` : '#e2e8f0',
                          position: 'relative', transition: 'all 0.3s',
                        }}
                      >
                        <span style={{
                          position: 'absolute', top: 3, left: popular ? 25 : 3, width: 20, height: 20,
                          borderRadius: '50%', background: '#fff', transition: 'left 0.3s',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                        }} />
                      </button>
                    </div>

                    <div className="flex justify-end mt-6">
                      <button onClick={() => setActiveSection(1)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 12, fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${colorObj.from}, ${colorObj.to})`, color: '#fff', boxShadow: `0 4px 16px ${colorObj.from}40` }}
                      >
                        Next: Pricing <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* ─── PRICING ─── */}
                {activeSection === 1 && (
                  <div style={{ background: 'rgba(255,255,255,0.9)', borderRadius: 20, padding: '2rem', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
                    <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 24 }}>Pricing Structure</h2>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Base Amount (₹)</label>
                        <input type="number" value={baseAmount} onChange={e => setBaseAmount(Number(e.target.value))}
                          min={0}
                          style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid rgba(0,0,0,0.1)', fontSize: 15, fontWeight: 700, outline: 'none', background: '#f8fafc' }}
                          onFocus={e => e.target.style.borderColor = colorObj.from}
                          onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.1)'}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Discount (₹)</label>
                        <input type="number" value={discount} onChange={e => setDiscount(Math.min(Number(e.target.value), baseAmount))}
                          min={0} max={baseAmount}
                          style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid rgba(0,0,0,0.1)', fontSize: 15, fontWeight: 700, outline: 'none', background: '#f8fafc' }}
                          onFocus={e => e.target.style.borderColor = colorObj.from}
                          onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.1)'}
                        />
                      </div>
                    </div>

                    {/* Discount slider */}
                    <div style={{ marginBottom: 20 }}>
                      <input type="range" min={0} max={baseAmount} value={discount} onChange={e => setDiscount(Number(e.target.value))}
                        style={{ width: '100%', accentColor: colorObj.from }}
                      />
                      <div className="flex justify-between" style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                        <span>No discount</span>
                        {savingPct > 0 && <span style={{ color: '#10b981', fontWeight: 700 }}>{savingPct}% off</span>}
                        <span>Max ({fmtINR(baseAmount)})</span>
                      </div>
                    </div>

                    {/* Final Amount Display */}
                    <div style={{ padding: '16px 20px', borderRadius: 14, background: `linear-gradient(135deg, ${colorObj.from}10, ${colorObj.to}08)`, border: `1.5px solid ${colorObj.from}20`, marginBottom: 20 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: colorObj.from, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Final Amount</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>{fmtINR(finalAmount)}</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{fmtINR(finalAmount)} + {fmtINR(taxAmount)} GST + {fmtINR(joiningFee)} joining fee</div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Joining Fee (₹)</label>
                        <input type="number" value={joiningFee} onChange={e => setJoiningFee(Number(e.target.value))}
                          min={0}
                          style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid rgba(0,0,0,0.1)', fontSize: 15, fontWeight: 700, outline: 'none', background: '#f8fafc' }}
                          onFocus={e => e.target.style.borderColor = colorObj.from}
                          onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.1)'}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>GST (%)</label>
                        <input type="number" value={taxPct} onChange={e => setTaxPct(Number(e.target.value))}
                          min={0} max={28}
                          style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid rgba(0,0,0,0.1)', fontSize: 15, fontWeight: 700, outline: 'none', background: '#f8fafc' }}
                          onFocus={e => e.target.style.borderColor = colorObj.from}
                          onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.1)'}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between mt-6">
                      <button onClick={() => setActiveSection(0)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 12, fontWeight: 700, fontSize: 14, border: '1.5px solid rgba(0,0,0,0.1)', cursor: 'pointer', background: '#fff', color: '#64748b' }}
                      >
                        <ArrowLeft size={16} /> Back
                      </button>
                      <button onClick={() => setActiveSection(2)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 12, fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${colorObj.from}, ${colorObj.to})`, color: '#fff', boxShadow: `0 4px 16px ${colorObj.from}40` }}
                      >
                        Next: Duration <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* ─── DURATION ─── */}
                {activeSection === 2 && (
                  <div style={{ background: 'rgba(255,255,255,0.9)', borderRadius: 20, padding: '2rem', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
                    <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 24 }}>Plan Duration</h2>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                      {DURATIONS.map(d => (
                        <button key={d} onClick={() => setDuration(d)}
                          style={{
                            padding: '16px', borderRadius: 14, cursor: 'pointer', transition: 'all 0.2s',
                            background: duration === d ? `linear-gradient(135deg, ${colorObj.from}, ${colorObj.to})` : '#f8fafc',
                            color: duration === d ? '#fff' : '#475569',
                            boxShadow: duration === d ? `0 4px 16px ${colorObj.from}40` : '0 1px 4px rgba(0,0,0,0.06)',
                            border: duration === d ? 'none' : '1.5px solid rgba(0,0,0,0.08)',
                          } as any}
                        >
                          <div style={{ fontSize: 16, fontWeight: 800 }}>{d}</div>
                          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>
                            {DURATION_MONTHS[d]} month{DURATION_MONTHS[d] > 1 ? 's' : ''}
                            {finalAmount > 0 && ` · ${fmtINR(Math.round(finalAmount / DURATION_MONTHS[d]))}/mo`}
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* PT Sessions per week */}
                    {kind === 'PT' && (
                      <div style={{ marginBottom: 20, padding: '20px', borderRadius: 14, background: `${colorObj.from}08`, border: `1.5px solid ${colorObj.from}20` }}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: colorObj.from, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Sessions Per Week</label>
                        <div className="flex gap-3">
                          {[2, 3, 4, 5, 6].map(n => (
                            <button key={n} onClick={() => setSessionsPerWeek(n)}
                              style={{
                                width: 44, height: 44, borderRadius: 12, fontWeight: 800, fontSize: 16, border: 'none', cursor: 'pointer',
                                background: sessionsPerWeek === n ? `linear-gradient(135deg, ${colorObj.from}, ${colorObj.to})` : '#fff',
                                color: sessionsPerWeek === n ? '#fff' : '#64748b',
                                boxShadow: sessionsPerWeek === n ? `0 4px 12px ${colorObj.from}40` : '0 1px 4px rgba(0,0,0,0.08)',
                                transition: 'all 0.2s',
                              }}
                            >{n}</button>
                          ))}
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>{sessionsPerWeek}x per week · {sessionsPerWeek * 4} sessions/month</div>
                      </div>
                    )}

                    {/* Revenue Projections */}
                    {finalAmount > 0 && (
                      <div style={{ padding: '20px', borderRadius: 14, background: '#f8fafc', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Revenue Projections</div>
                        {[10, 25, 50].map(members => (
                          <div key={members} className="flex justify-between items-center" style={{ padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                            <span style={{ fontSize: 14, color: '#475569' }}>{members} members</span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{fmtINR(members * finalAmount)}<span style={{ fontSize: 12, color: '#94a3b8' }}>/mo</span></span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-between mt-6">
                      <button onClick={() => setActiveSection(1)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 12, fontWeight: 700, fontSize: 14, border: '1.5px solid rgba(0,0,0,0.1)', cursor: 'pointer', background: '#fff', color: '#64748b' }}
                      >
                        <ArrowLeft size={16} /> Back
                      </button>
                      <button onClick={() => setActiveSection(3)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 12, fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${colorObj.from}, ${colorObj.to})`, color: '#fff', boxShadow: `0 4px 16px ${colorObj.from}40` }}
                      >
                        Next: Benefits <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* ─── BENEFITS ─── */}
                {activeSection === 3 && (
                  <div style={{ background: 'rgba(255,255,255,0.9)', borderRadius: 20, padding: '2rem', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
                    <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Plan Benefits</h2>
                    <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>Select what's included in this plan</p>

                    {/* Quick-add badges */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      {BENEFIT_ICONS.map(b => {
                        const label = `${b.icon} ${b.label}`;
                        const selected = benefits.includes(label);
                        return (
                          <button key={label}
                            onClick={() => selected ? removeBenefit(label) : addBenefit(label)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 6,
                              padding: '7px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600,
                              cursor: 'pointer', transition: 'all 0.2s', border: 'none',
                              background: selected ? `linear-gradient(135deg, ${colorObj.from}, ${colorObj.to})` : '#f1f5f9',
                              color: selected ? '#fff' : '#475569',
                              boxShadow: selected ? `0 3px 10px ${colorObj.from}30` : 'none',
                            }}
                          >
                            {selected && <Check size={12} />}
                            {label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom benefit input */}
                    <div className="flex gap-2 mb-4">
                      <input
                        value={newBenefit}
                        onChange={e => setNewBenefit(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addBenefit(newBenefit)}
                        placeholder="Add custom benefit... (press Enter)"
                        style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1.5px solid rgba(0,0,0,0.1)', fontSize: 14, outline: 'none', background: '#f8fafc' }}
                        onFocus={e => e.target.style.borderColor = colorObj.from}
                        onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.1)'}
                      />
                      <button onClick={() => addBenefit(newBenefit)}
                        style={{ width: 40, height: 40, borderRadius: 10, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${colorObj.from}, ${colorObj.to})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      ><Plus size={16} /></button>
                    </div>

                    {/* Selected benefits */}
                    {benefits.length > 0 && (
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Selected ({benefits.length})</div>
                        <div className="flex flex-wrap gap-2">
                          {benefits.map(b => (
                            <span key={b}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px 5px 12px', borderRadius: 999, fontSize: 13, fontWeight: 600, background: `${colorObj.from}12`, color: colorObj.from, border: `1px solid ${colorObj.from}25` }}
                            >
                              {b}
                              <button onClick={() => removeBenefit(b)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colorObj.from, display: 'flex', padding: 0, opacity: 0.7 }}>
                                <X size={12} />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between mt-6">
                      <button onClick={() => setActiveSection(2)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 12, fontWeight: 700, fontSize: 14, border: '1.5px solid rgba(0,0,0,0.1)', cursor: 'pointer', background: '#fff', color: '#64748b' }}
                      >
                        <ArrowLeft size={16} /> Back
                      </button>
                      <div className="flex gap-3">
                        <button onClick={() => handleSave(false)} disabled={saving}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 12, fontWeight: 700, fontSize: 14, border: '1.5px solid rgba(0,0,0,0.1)', cursor: saving ? 'not-allowed' : 'pointer', background: '#fff', color: '#64748b', opacity: saving ? 0.6 : 1 }}
                        >
                          <Save size={15} /> Save Draft
                        </button>
                        <button onClick={() => handleSave(true)} disabled={saving}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 12, fontWeight: 700, fontSize: 14, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', background: saving ? '#94a3b8' : `linear-gradient(135deg, ${colorObj.from}, ${colorObj.to})`, color: '#fff', boxShadow: saving ? 'none' : `0 4px 16px ${colorObj.from}40`, opacity: saving ? 0.8 : 1 }}
                        >
                          {saving ? '⏳ Saving...' : <><Send size={15} /> Publish Plan</>}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>

          {/* RIGHT: Live Preview */}
          <div className="lg:sticky lg:top-24 h-fit">
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Live Preview</div>

            {/* Plan Card */}
            <div style={{
              borderRadius: 24, overflow: 'hidden',
              boxShadow: `0 20px 60px ${colorObj.from}30, 0 4px 16px rgba(0,0,0,0.08)`,
            }}>
              {/* Card Header */}
              <div style={{ padding: '28px 28px 24px', background: `linear-gradient(135deg, ${colorObj.from}, ${colorObj.to})`, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
                <div style={{ position: 'absolute', bottom: -10, left: '60%', width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
                <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>619 FITNESS · {kind}</div>
                {popular && (
                  <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', fontSize: 11, fontWeight: 700, color: '#fff' }}>
                    <Star size={11} fill="#fff" /> POPULAR
                  </div>
                )}
                <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.1 }}>{name || 'Plan Name'}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 6 }}>{description || 'Your plan description will appear here'}</div>
                <div className="flex items-baseline gap-2" style={{ marginTop: 16 }}>
                  <span style={{ fontSize: 36, fontWeight: 900, color: '#fff', letterSpacing: '-0.04em' }}>{fmtINR(finalAmount)}</span>
                  <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>/ {duration === 'Monthly' ? 'Monthly' : duration}</span>
                  {savingPct > 0 && <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'line-through' }}>{fmtINR(baseAmount)}</span>}
                </div>
                {duration !== 'Monthly' && finalAmount > 0 && (
                  <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>{fmtINR(Math.round(monthlyRate))}/month equivalent</div>
                )}
              </div>

              {/* Card Body */}
              <div style={{ padding: '20px 28px 28px', background: '#fff' }}>
                {kind === 'PT' && (
                  <div className="flex gap-2 mb-4">
                    <span style={{ padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: `${colorObj.from}12`, color: colorObj.from, border: `1px solid ${colorObj.from}20` }}>🔄 {duration}</span>
                    <span style={{ padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a' }}>🏆 {sessionsPerWeek}x/week</span>
                  </div>
                )}

                {benefits.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>INCLUDES</div>
                    {benefits.slice(0, 6).map(b => (
                      <div key={b} className="flex items-center gap-2" style={{ padding: '5px 0', fontSize: 13, color: '#475569' }}>
                        <Check size={13} style={{ color: colorObj.from, flexShrink: 0 }} />
                        {b}
                      </div>
                    ))}
                    {benefits.length > 6 && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>+{benefits.length - 6} more benefits</div>}
                  </div>
                )}

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
                  {[
                    { label: 'Joining fee', value: fmtINR(joiningFee) },
                    { label: `GST (${taxPct}%)`, value: fmtINR(taxAmount) },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between" style={{ fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>
                      <span>{row.label}</span><span>{row.value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between" style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginTop: 8, paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
                    <span>Total Payable</span>
                    <span style={{ color: colorObj.from }}>{fmtINR(totalWithTax)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Revenue Projections on Preview */}
            {finalAmount > 0 && (
              <div style={{ marginTop: 16, padding: '20px', borderRadius: 16, background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Revenue Projections</div>
                {[10, 25, 50].map(m => (
                  <div key={m} className="flex justify-between items-center" style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: 13, color: '#64748b' }}>{m} members</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{fmtINR(m * finalAmount)}<span style={{ fontSize: 11, color: '#94a3b8' }}>/mo</span></span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
