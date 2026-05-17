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

  // Form state
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
    setSaving(true);
    try {
      await api.plans.create({
        kind, name: name.trim(), description, duration,
        base_amount: baseAmount, discount,
        final_amount: finalAmount,
        joining_fee: joiningFee,
        tax_pct: taxPct,
        sessions_per_week: kind === 'PT' ? sessionsPerWeek : undefined,
        features: benefits,
        popular,
        color: planColor,
        status: publish ? 'active' : 'draft',
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

        {/* Main Split Layout */}
        <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 380px', alignItems: 'start' }}>

          {/* LEFT: Form */}
          <div className="flex flex-col gap-5">

            {/* Section nav */}
            <div className="flex gap-2 flex-wrap">
              {sections.map(s => (
                <button key={s.id} onClick={() => setActiveSection(s.id)}
                  className="flex items-center gap-2"
                  style={{
                    padding: '7px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    transition: 'all 0.18s', border: 'none',
                    background: activeSection === s.id ? `linear-gradient(135deg, ${colorObj.from}, ${colorObj.to})` : 'rgba(255,255,255,0.8)',
                    color: activeSection === s.id ? '#fff' : '#64748b',
                    boxShadow: activeSection === s.id ? `0 4px 12px ${colorObj.from}35` : '0 1px 4px rgba(0,0,0,0.06)',
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  {s.icon} {s.label}
                </button>
              ))}
            </div>

            {/* Section 0: Basic Info */}
            <AnimatePresence mode="wait">
              {activeSection === 0 && (
                <motion.div key="basic" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                  style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 20, padding: '1.75rem', boxShadow: '0 4px 24px rgba(0,0,0,0.05)' }}
                >
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Layers size={16} style={{ color: colorObj.from }} /> Basic Information
                  </h2>
                  <div className="grid gap-5">
                    {/* Plan Name */}
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>Plan Name *</label>
                      <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Premium Monthly Membership"
                        style={{
                          width: '100%', padding: '12px 16px', borderRadius: 12,
                          border: `1.5px solid ${name ? colorObj.from + '60' : 'rgba(0,0,0,0.1)'}`,
                          background: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: 600, color: '#0f172a',
                          outline: 'none', transition: 'all 0.2s', boxShadow: name ? `0 0 0 3px ${colorObj.from}12` : 'none',
                        }}
                      />
                    </div>
                    {/* Description */}
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>Description</label>
                      <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                        placeholder="Describe what makes this plan valuable..."
                        style={{
                          width: '100%', padding: '12px 16px', borderRadius: 12,
                          border: '1.5px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.9)',
                          fontSize: 14, color: '#0f172a', outline: 'none', resize: 'none',
                          transition: 'all 0.2s', fontFamily: 'inherit',
                        }}
                      />
                    </div>
                    {/* Plan Color */}
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 10 }}>Plan Theme Color</label>
                      <div className="flex gap-3 flex-wrap">
                        {PLAN_COLORS.map(c => (
                          <button key={c.id} onClick={() => setPlanColor(c.id)}
                            title={c.label}
                            style={{
                              width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', border: 'none',
                              background: `linear-gradient(135deg, ${c.from}, ${c.to})`,
                              outline: planColor === c.id ? `3px solid ${c.from}` : '3px solid transparent',
                              outlineOffset: 2,
                              boxShadow: planColor === c.id ? `0 4px 12px ${c.from}60` : 'none',
                              transition: 'all 0.2s',
                            }}
                          >
                            {planColor === c.id && <Check size={14} style={{ color: '#fff', margin: 'auto' }} />}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Popular toggle */}
                    <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: popular ? `${colorObj.from}0d` : 'rgba(248,250,252,0.8)', border: `1.5px solid ${popular ? colorObj.from + '40' : 'rgba(0,0,0,0.07)'}`, transition: 'all 0.2s' }}>
                      <div className="flex items-center gap-3">
                        <Star size={18} style={{ color: popular ? colorObj.from : '#94a3b8' }} />
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Mark as Popular</div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>Highlights this plan with a "Most Popular" badge</div>
                        </div>
                      </div>
                      <button onClick={() => setPopular(p => !p)}
                        style={{
                          width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
                          background: popular ? `linear-gradient(135deg, ${colorObj.from}, ${colorObj.to})` : '#e2e8f0',
                          transition: 'all 0.25s', position: 'relative',
                        }}
                      >
                        <div style={{
                          position: 'absolute', top: 3, left: popular ? 25 : 3,
                          width: 20, height: 20, borderRadius: '50%', background: '#fff',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'left 0.25s',
                        }} />
                      </button>
                    </div>
                  </div>
                  <button onClick={() => setActiveSection(1)} className="mt-6 flex items-center gap-2 font-bold text-sm" style={{ color: colorObj.from, background: 'none', border: 'none', cursor: 'pointer' }}>
                    Next: Pricing <ChevronRight size={14} />
                  </button>
                </motion.div>
              )}

              {/* Section 1: Pricing Builder */}
              {activeSection === 1 && (
                <motion.div key="pricing" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                  style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 20, padding: '1.75rem', boxShadow: '0 4px 24px rgba(0,0,0,0.05)' }}
                >
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <DollarSign size={16} style={{ color: colorObj.from }} /> Pricing Builder
                  </h2>
                  <div className="grid gap-5">
                    {/* Base Price */}
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>Base Price (MRP)</label>
                      <div className="relative">
                        <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, fontWeight: 700, color: '#64748b' }}>₹</span>
                        <input type="number" value={baseAmount} onChange={e => setBaseAmount(Number(e.target.value))}
                          style={{
                            width: '100%', padding: '12px 16px 12px 32px', borderRadius: 12,
                            border: `1.5px solid rgba(0,0,0,0.1)`, background: 'rgba(255,255,255,0.9)',
                            fontSize: 18, fontWeight: 700, color: '#0f172a', outline: 'none',
                          }}
                        />
                      </div>
                    </div>
                    {/* Discount */}
                    <div>
                      <div className="flex justify-between mb-2">
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Discount Amount</label>
                        {savingPct > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981', background: '#d1fae5', padding: '2px 8px', borderRadius: 20 }}>Save {savingPct}%</span>}
                      </div>
                      <div className="relative">
                        <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, fontWeight: 700, color: '#64748b' }}>₹</span>
                        <input type="number" value={discount} onChange={e => setDiscount(Math.min(Number(e.target.value), baseAmount))}
                          min={0} max={baseAmount}
                          style={{
                            width: '100%', padding: '12px 16px 12px 32px', borderRadius: 12,
                            border: `1.5px solid ${discount > 0 ? '#10b981' : 'rgba(0,0,0,0.1)'}`, background: 'rgba(255,255,255,0.9)',
                            fontSize: 18, fontWeight: 700, color: '#0f172a', outline: 'none',
                          }}
                        />
                      </div>
                      <input type="range" min={0} max={baseAmount} value={discount} onChange={e => setDiscount(Number(e.target.value))}
                        style={{ width: '100%', marginTop: 8, accentColor: colorObj.from }}
                      />
                    </div>
                    {/* Pricing summary row */}
                    <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
                      <div style={{ background: `${colorObj.from}0d`, border: `1px solid ${colorObj.from}25`, borderRadius: 12, padding: '12px 16px' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: colorObj.from, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Selling Price</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>{fmtINR(finalAmount)}</div>
                      </div>
                      <div style={{ background: 'rgba(248,250,252,0.8)', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 12, padding: '12px 16px' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Per Month</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>{fmtINR(Math.round(monthlyRate))}</div>
                      </div>
                    </div>
                    {/* Joining Fee */}
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>Joining / Registration Fee</label>
                      <div className="relative">
                        <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, fontWeight: 700, color: '#64748b' }}>₹</span>
                        <input type="number" value={joiningFee} onChange={e => setJoiningFee(Number(e.target.value))}
                          style={{
                            width: '100%', padding: '12px 16px 12px 32px', borderRadius: 12,
                            border: '1.5px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.9)',
                            fontSize: 18, fontWeight: 700, color: '#0f172a', outline: 'none',
                          }}
                        />
                      </div>
                    </div>
                    {/* Tax */}
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>GST / Tax Rate (%)</label>
                      <div className="flex gap-2 flex-wrap">
                        {[0, 5, 12, 18, 28].map(t => (
                          <button key={t} onClick={() => setTaxPct(t)}
                            style={{
                              padding: '8px 16px', borderRadius: 10, fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer',
                              background: taxPct === t ? `linear-gradient(135deg, ${colorObj.from}, ${colorObj.to})` : 'rgba(241,245,249,0.9)',
                              color: taxPct === t ? '#fff' : '#64748b', transition: 'all 0.18s',
                            }}
                          >{t}%</button>
                        ))}
                      </div>
                    </div>
                    {/* Total with tax */}
                    <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderRadius: 14, padding: '16px 20px' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>TOTAL MEMBER PAYS (incl. tax + joining fee)</div>
                      <div style={{ fontSize: 32, fontWeight: 900, color: '#fff', letterSpacing: '-0.04em' }}>{fmtINR(totalWithTax)}</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{fmtINR(finalAmount)} + {fmtINR(taxAmount)} GST + {fmtINR(joiningFee)} joining fee</div>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button onClick={() => setActiveSection(0)} className="flex items-center gap-2 font-bold text-sm" style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}>
                      ← Basic Info
                    </button>
                    <button onClick={() => setActiveSection(2)} className="flex items-center gap-2 font-bold text-sm" style={{ color: colorObj.from, background: 'none', border: 'none', cursor: 'pointer' }}>
                      Next: Duration <ChevronRight size={14} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Section 2: Duration */}
              {activeSection === 2 && (
                <motion.div key="duration" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                  style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 20, padding: '1.75rem', boxShadow: '0 4px 24px rgba(0,0,0,0.05)' }}
                >
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Clock size={16} style={{ color: colorObj.from }} /> Duration & Access
                  </h2>
                  <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
                    {DURATIONS.map(d => (
                      <motion.button key={d} onClick={() => setDuration(d)} whileHover={{ y: -2 }}
                        style={{
                          padding: '20px 16px', borderRadius: 16, cursor: 'pointer',
                          background: duration === d ? `linear-gradient(135deg, ${colorObj.from}, ${colorObj.to})` : 'rgba(255,255,255,0.9)',
                          border: `2px solid ${duration === d ? 'transparent' : 'rgba(0,0,0,0.08)'}`,
                          color: duration === d ? '#fff' : '#0f172a',
                          boxShadow: duration === d ? `0 8px 24px ${colorObj.from}40` : '0 2px 8px rgba(0,0,0,0.05)',
                          transition: 'all 0.2s',
                        }}
                      >
                        <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.04em' }}>{DURATION_MONTHS[d]}</div>
                        <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>month{DURATION_MONTHS[d] > 1 ? 's' : ''}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>{d}</div>
                        {duration === d && <Check size={14} style={{ margin: '8px auto 0', display: 'block' }} />}
                      </motion.button>
                    ))}
                  </div>
                  {kind === 'PT' && (
                    <div className="mt-6">
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 12 }}>Sessions Per Week</label>
                      <div className="flex gap-3">
                        {[1, 2, 3, 4, 5, 6].map(n => (
                          <button key={n} onClick={() => setSessionsPerWeek(n)}
                            style={{
                              width: 44, height: 44, borderRadius: 12, fontWeight: 800, fontSize: 16, border: 'none', cursor: 'pointer',
                              background: sessionsPerWeek === n ? `linear-gradient(135deg, ${colorObj.from}, ${colorObj.to})` : 'rgba(241,245,249,0.9)',
                              color: sessionsPerWeek === n ? '#fff' : '#64748b',
                              boxShadow: sessionsPerWeek === n ? `0 4px 12px ${colorObj.from}40` : 'none',
                              transition: 'all 0.18s',
                            }}
                          >{n}</button>
                        ))}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
                        = {sessionsPerWeek * 4 * DURATION_MONTHS[duration]} total sessions for {duration}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-3 mt-6">
                    <button onClick={() => setActiveSection(1)} className="font-bold text-sm" style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}>← Pricing</button>
                    <button onClick={() => setActiveSection(3)} className="flex items-center gap-2 font-bold text-sm" style={{ color: colorObj.from, background: 'none', border: 'none', cursor: 'pointer' }}>
                      Next: Benefits <ChevronRight size={14} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Section 3: Benefits */}
              {activeSection === 3 && (
                <motion.div key="benefits" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                  style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 20, padding: '1.75rem', boxShadow: '0 4px 24px rgba(0,0,0,0.05)' }}
                >
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Gift size={16} style={{ color: colorObj.from }} /> Plan Benefits
                  </h2>
                  {/* Quick add chips */}
                  <div className="flex flex-wrap gap-2 mb-5">
                    {BENEFIT_ICONS.map(b => {
                      const full = `${b.icon} ${b.label}`;
                      const active = benefits.includes(full);
                      return (
                        <button key={b.label} onClick={() => active ? removeBenefit(full) : addBenefit(full)}
                          style={{
                            padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                            background: active ? `linear-gradient(135deg, ${colorObj.from}, ${colorObj.to})` : 'rgba(241,245,249,0.9)',
                            color: active ? '#fff' : '#64748b',
                            border: 'none', transition: 'all 0.18s',
                            boxShadow: active ? `0 2px 8px ${colorObj.from}40` : 'none',
                          }}
                        >{b.icon} {b.label}</button>
                      );
                    })}
                  </div>
                  {/* Custom benefit input */}
                  <div className="flex gap-2 mb-5">
                    <input value={newBenefit} onChange={e => setNewBenefit(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addBenefit(newBenefit)}
                      placeholder="Add custom benefit… (press Enter)"
                      style={{
                        flex: 1, padding: '10px 14px', borderRadius: 10,
                        border: '1.5px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.9)',
                        fontSize: 14, color: '#0f172a', outline: 'none',
                      }}
                    />
                    <button onClick={() => addBenefit(newBenefit)}
                      style={{
                        padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700,
                        background: `linear-gradient(135deg, ${colorObj.from}, ${colorObj.to})`, color: '#fff',
                      }}
                    ><Plus size={16} /></button>
                  </div>
                  {/* Added benefits */}
                  <div className="flex flex-wrap gap-2">
                    {benefits.map(b => (
                      <div key={b} className="flex items-center gap-2" style={{
                        padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                        background: `${colorObj.from}12`, color: colorObj.from,
                        border: `1px solid ${colorObj.from}30`,
                      }}>
                        {b}
                        <button onClick={() => removeBenefit(b)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colorObj.from, lineHeight: 1 }}>
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setActiveSection(2)} className="mt-6 font-bold text-sm" style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}>← Duration</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* RIGHT: Live Preview Card */}
          <div style={{ position: 'sticky', top: 120 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Live Preview</div>

            <motion.div
              animate={{ boxShadow: `0 16px 48px ${colorObj.from}30` }}
              style={{
                borderRadius: 24, overflow: 'hidden',
                boxShadow: `0 16px 48px ${colorObj.from}30`,
              }}
            >
              {/* Card header */}
              <div style={{
                background: `linear-gradient(135deg, ${colorObj.from}, ${colorObj.to})`,
                padding: '1.5rem 1.5rem 1.25rem',
                position: 'relative', overflow: 'hidden',
              }}>
                {/* Background orb */}
                <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
                <div style={{ position: 'absolute', bottom: -10, left: -10, width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />

                {popular && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.25)', borderRadius: 20, padding: '3px 10px', marginBottom: 10 }}>
                    <Star size={10} style={{ color: '#fff' }} fill="#fff" />
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Most Popular</span>
                  </div>
                )}
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>619 FITNESS · {kind}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.2 }}>
                  {name || 'Untitled Plan'}
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 6 }}>{description || 'Your plan description will appear here'}</div>
                <div style={{ marginTop: 16, display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 36, fontWeight: 900, color: '#fff', letterSpacing: '-0.04em' }}>{fmtINR(finalAmount)}</span>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>/ {duration}</span>
                </div>
                {discount > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'line-through' }}>{fmtINR(baseAmount)}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,0.25)', color: '#fff', padding: '2px 8px', borderRadius: 20 }}>Save {savingPct}%</span>
                  </div>
                )}
              </div>

              {/* Card body */}
              <div style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', padding: '1.25rem 1.5rem' }}>
                {/* Duration chip */}
                <div className="flex items-center gap-2 mb-4">
                  <div style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: `${colorObj.from}12`, color: colorObj.from }}>
                    ⏱ {duration}
                  </div>
                  {kind === 'PT' && (
                    <div style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: '#fef3c7', color: '#d97706' }}>
                      🏆 {sessionsPerWeek}×/week
                    </div>
                  )}
                </div>
                {/* Benefits */}
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Includes</div>
                <div className="flex flex-col gap-2">
                  {benefits.slice(0, 6).map(b => (
                    <div key={b} className="flex items-center gap-2">
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: `${colorObj.from}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={10} style={{ color: colorObj.from }} />
                      </div>
                      <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>{b}</span>
                    </div>
                  ))}
                  {benefits.length > 6 && (
                    <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginTop: 4 }}>+{benefits.length - 6} more benefits</div>
                  )}
                </div>
                {/* Pricing footer */}
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                  <div className="flex justify-between text-sm" style={{ color: '#64748b', marginBottom: 4 }}>
                    <span>Joining fee</span><span style={{ fontWeight: 700, color: '#0f172a' }}>{fmtINR(joiningFee)}</span>
                  </div>
                  <div className="flex justify-between text-sm" style={{ color: '#64748b', marginBottom: 4 }}>
                    <span>GST ({taxPct}%)</span><span style={{ fontWeight: 700, color: '#0f172a' }}>{fmtINR(taxAmount)}</span>
                  </div>
                  <div className="flex justify-between" style={{ paddingTop: 8, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>Total Payable</span>
                    <span style={{ fontSize: 16, fontWeight: 900, color: colorObj.from }}>{fmtINR(totalWithTax)}</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Revenue projection */}
            <div style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 16, padding: '1rem 1.25rem', marginTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Revenue Projections</div>
              {[{label: '10 members', n: 10}, {label: '25 members', n: 25}, {label