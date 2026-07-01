'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Save, User, Dumbbell, Wallet,
  CheckCircle, Info, Activity,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { PremiumButton } from '@/components/premium/PremiumButton';
import FloatInput from '@/components/ui/FloatInput';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';

interface Plan {
  id: string;
  name: string;
  base_amount: number;
  duration_months: number;
}

interface Trainer {
  id: string;
  name: string;
}

function addMonths(dateStr: string, months: number): string {
  if (!dateStr || !months) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function SectionCard({ title, icon, children, accent = '#dc2626' }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; accent?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[20px] p-6"
      style={{
        background: 'white',
        border: '1px solid rgba(15,23,42,0.07)',
        boxShadow: '0 2px 16px rgba(15,23,42,0.05)',
      }}
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-[10px]"
          style={{ background: `${accent}14` }}>
          <span style={{ color: accent }}>{icon}</span>
        </div>
        <h2 className="text-[15px] font-[720]" style={{ color: 'rgb(15,23,42)' }}>{title}</h2>
      </div>
      {children}
    </motion.div>
  );
}

function ReadOnlyField({ label, value, highlight }: { label: string; value: string; highlight?: 'green' | 'red' | 'amber' }) {
  const color = highlight === 'green' ? '#10b981' : highlight === 'red' ? '#ef4444' : highlight === 'amber' ? '#f59e0b' : 'rgb(15,23,42)';
  return (
    <div className="rounded-[13px] px-4 py-3" style={{ background: 'rgba(15,23,42,0.03)', border: '1.5px solid rgba(15,23,42,0.06)' }}>
      <p className="text-[10.5px] font-[600] uppercase tracking-wider mb-0.5" style={{ color: 'rgb(148,163,184)' }}>{label}</p>
      <p className="text-[14px] font-[700]" style={{ color }}>{value}</p>
    </div>
  );
}

export default function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');

  const [form, setForm] = useState({
    // Personal
    name: '', mobile: '', email: '', gender: '', dob: '', address: '', weight: '', emergency_contact: '',
    // PT Assignment
    trainer_id: '', trainer_name: '', package_type: '', pt_start_date: '', pt_end_date: '', duration_months: '',
    // Financial
    base_amount: '', final_amount: '', paid_amount: '', monthly_pt_amount: '',
    // Status
    status: 'active',
    // Fitness profile
    goal: '', height: '', body_fat: '', health_conditions: '', injuries: '', frequency: '',
  });

  // Derived (read-only)
  const discount = Math.max(0, (parseFloat(form.base_amount) || 0) - (parseFloat(form.final_amount) || 0));
  const balance  = Math.max(0, (parseFloat(form.final_amount) || 0) - (parseFloat(form.paid_amount) || 0));

  const set = (key: keyof typeof form) => (v: string) =>
    setForm(p => ({ ...p, [key]: v }));

  // When start date or duration changes → recalculate end date
  const recalcEndDate = useCallback((startDate: string, months: string) => {
    const m = parseInt(months, 10);
    if (startDate && m > 0) {
      setForm(p => ({ ...p, pt_end_date: addMonths(startDate, m) }));
    }
  }, []);

  // When final_amount or duration_months changes → recalculate monthly fee
  const recalcMonthly = useCallback((finalAmt: string, months: string) => {
    const f = parseFloat(finalAmt);
    const m = parseInt(months, 10);
    if (f > 0 && m > 0) {
      setForm(p => ({ ...p, monthly_pt_amount: (f / m).toFixed(2) }));
    }
  }, []);

  const handlePlanChange = (planId: string) => {
    setSelectedPlanId(planId);
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;
    const months = String(plan.duration_months);
    const base   = String(plan.base_amount);
    setForm(p => {
      const newForm = { ...p, package_type: plan.name, base_amount: base, duration_months: months };
      // Also recalculate end date and monthly fee
      if (p.pt_start_date && plan.duration_months > 0) {
        newForm.pt_end_date = addMonths(p.pt_start_date, plan.duration_months);
      }
      if (plan.base_amount > 0 && plan.duration_months > 0) {
        const finalAmt = parseFloat(p.final_amount) || plan.base_amount;
        newForm.monthly_pt_amount = (finalAmt / plan.duration_months).toFixed(2);
      }
      return newForm;
    });
  };

  // Load client data, plans, and trainers
  useEffect(() => {
    (async () => {
      try {
        const [clientRes, plansRes, trainersRes] = await Promise.all([
          api.pt.client(id),
          api.pt.plans.list(),
          api.pt.trainers(),
        ]);
        const c = (clientRes as any)?.data;
        const plansArr = Array.isArray((plansRes as any)?.data) ? (plansRes as any).data : [];
        const trainersArr = Array.isArray((trainersRes as any)?.data) ? (trainersRes as any).data : [];
        setPlans(plansArr.map((p: any) => ({
          id: p.id, name: p.name,
          base_amount: Number(p.base_amount ?? 0),
          duration_months: Number(p.duration_months ?? 0),
        })));
        setTrainers(trainersArr.map((t: any) => ({ id: t.id, name: t.name })));
        if (c) {
          setForm({
            name: c.name ?? '',
            mobile: c.mobile ?? '',
            email: c.email ?? '',
            gender: c.gender ?? '',
            dob: c.dob ? String(c.dob).slice(0, 10) : '',
            address: c.address ?? '',
            weight: c.weight != null ? String(c.weight) : '',
            emergency_contact: c.emergency_contact ?? '',
            trainer_id: c.trainer_id ?? '',
            trainer_name: c.trainer_name ?? '',
            package_type: c.package_type ?? '',
            pt_start_date: c.pt_start_date ? String(c.pt_start_date).slice(0, 10) : '',
            pt_end_date: c.pt_end_date ? String(c.pt_end_date).slice(0, 10) : '',
            duration_months: c.duration_months != null ? String(c.duration_months) : '',
            monthly_pt_amount: c.monthly_pt_amount != null ? String(c.monthly_pt_amount) : '',
            base_amount: c.base_amount != null ? String(c.base_amount) : '',
            final_amount: c.final_amount != null ? String(c.final_amount) : '',
            paid_amount: c.paid_amount != null ? String(c.paid_amount) : '',
            status: c.status ?? 'active',
            goal: c.goal ?? '',
            height: c.height != null ? String(c.height) : '',
            body_fat: c.body_fat != null ? String(c.body_fat) : '',
            health_conditions: c.health_conditions ?? '',
            injuries: c.injuries ?? '',
            frequency: c.frequency ?? '',
          });
        }
      } catch (err: any) {
        toast.error(err?.message || 'Failed to load client');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const num  = (v: string) => v.trim() !== '' ? Number(v) : null;
      const str  = (v: string) => v.trim() || null;
      await api.pt.updateClient(id, {
        name: form.name.trim(),
        mobile: str(form.mobile),
        email: str(form.email),
        gender: str(form.gender),
        dob: str(form.dob),
        address: str(form.address),
        weight: num(form.weight),
        emergency_contact: str(form.emergency_contact),
        trainer_id: str(form.trainer_id),
        trainer_name: str(form.trainer_name),
        package_type: str(form.package_type),
        pt_start_date: str(form.pt_start_date),
        pt_end_date: str(form.pt_end_date),
        duration_months: num(form.duration_months),
        monthly_pt_amount: num(form.monthly_pt_amount),
        base_amount: num(form.base_amount),
        discount: discount,
        final_amount: num(form.final_amount),
        paid_amount: num(form.paid_amount),
        status: form.status,
        goal: str(form.goal),
        height: num(form.height),
        body_fat: num(form.body_fat),
        health_conditions: str(form.health_conditions),
        injuries: str(form.injuries),
        frequency: str(form.frequency),
      });
      toast.success('Client updated successfully');
      router.push(`/pt-os/clients/${id}`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const fmtINR = (n: number) => '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

  if (loading) {
    return (
      <Guard>
        <AppShell>
          <div className="animate-pulse space-y-6 p-6 max-w-3xl mx-auto">
            <div className="h-16 rounded-[20px]" style={{ background: '#f1f5f9' }} />
            {[1,2,3].map(i => <div key={i} className="h-48 rounded-[20px]" style={{ background: '#f1f5f9' }} />)}
          </div>
        </AppShell>
      </Guard>
    );
  }

  return (
    <Guard>
      <AppShell>
        <div className="min-h-screen" style={{ background: 'linear-gradient(145deg,#f8fafc 0%,#f1f5f9 50%,#fafafe 100%)' }}>
          <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 space-y-5">

            {/* ── Header ── */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => router.push(`/pt-os/clients/${id}`)}
                  className="flex h-9 w-9 items-center justify-center rounded-[10px] transition hover:bg-white"
                  style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(15,23,42,0.08)' }}>
                  <ArrowLeft size={15} style={{ color: 'rgb(71,85,105)' }} />
                </button>
                <div>
                  <h1 className="text-[20px] font-[780] tracking-[-0.02em]" style={{ color: 'rgb(15,23,42)' }}>
                    Edit Client
                  </h1>
                  <p className="text-[12px]" style={{ color: 'rgb(148,163,184)' }}>All changes auto-save on submit</p>
                </div>
              </div>
              <PremiumButton tone="primary" glow icon={<Save size={14} />} onClick={handleSave} loading={saving}>
                Save Changes
              </PremiumButton>
            </motion.div>

            {/* ── Personal Info ── */}
            <SectionCard title="Personal Information" icon={<User size={16} />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FloatInput label="Full Name" required value={form.name} onChange={set('name')} />
                <FloatInput label="Phone Number" type="tel" value={form.mobile} onChange={set('mobile')} />
                <FloatInput label="Email Address" type="email" value={form.email} onChange={set('email')} />
                <div>
                  <label className="block text-[11px] font-[600] mb-2" style={{ color: 'rgb(100,116,139)' }}>Gender</label>
                  <select
                    value={form.gender}
                    onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}
                    className="w-full rounded-[13px] px-4 py-3.5 text-[13.5px] font-[500] outline-none appearance-none transition-all"
                    style={{
                      background: 'var(--bg-subtle)', color: form.gender ? 'rgb(15,23,42)' : 'rgb(148,163,184)',
                      border: '1.5px solid rgba(15,23,42,0.09)',
                    }}>
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <FloatInput label="Date of Birth" type="date" value={form.dob} onChange={set('dob')} />
                <FloatInput label="Weight (kg)" type="number" value={form.weight} onChange={set('weight')} />
                <div className="sm:col-span-2">
                  <FloatInput label="Address" value={form.address} onChange={set('address')} />
                </div>
                <div className="sm:col-span-2">
                  <FloatInput label="Emergency Contact" type="tel" value={form.emergency_contact} onChange={set('emergency_contact')} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-[600] mb-2" style={{ color: 'rgb(100,116,139)' }}>Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                    className="w-full rounded-[13px] px-4 py-3.5 text-[13.5px] font-[500] outline-none appearance-none transition-all"
                    style={{ background: 'var(--bg-subtle)', color: 'rgb(15,23,42)', border: '1.5px solid rgba(15,23,42,0.09)' }}>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="frozen">Frozen</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </SectionCard>

            {/* ── PT Assignment ── */}
            <SectionCard title="PT Assignment" icon={<Dumbbell size={16} />} accent="#6366f1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Trainer dropdown */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-[600] mb-2" style={{ color: 'rgb(100,116,139)' }}>
                    Trainer
                  </label>
                  <select
                    value={form.trainer_id}
                    onChange={e => {
                      const tid = e.target.value;
                      const t = trainers.find(tr => tr.id === tid);
                      setForm(p => ({ ...p, trainer_id: tid, trainer_name: t?.name ?? p.trainer_name }));
                    }}
                    className="w-full rounded-[13px] px-4 py-3.5 text-[13.5px] font-[500] outline-none appearance-none transition-all"
                    style={{ background: 'var(--bg-subtle)', color: form.trainer_id ? 'rgb(15,23,42)' : 'rgb(148,163,184)', border: '1.5px solid rgba(15,23,42,0.09)' }}>
                    <option value="">Select trainer…</option>
                    {trainers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  {/* Editable fallback if trainer not in list */}
                  {!form.trainer_id && (
                    <FloatInput label="Trainer Name (manual)" value={form.trainer_name} onChange={set('trainer_name')} />
                  )}
                </div>

                {/* Plan selector — drives base_amount, duration_months, end_date, monthly fee */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-[600] mb-2" style={{ color: 'rgb(100,116,139)' }}>
                    Subscription Plan <span className="text-[10px] font-[400]" style={{ color: 'rgb(148,163,184)' }}>— auto-fills duration &amp; base amount</span>
                  </label>
                  <select
                    value={selectedPlanId}
                    onChange={e => handlePlanChange(e.target.value)}
                    className="w-full rounded-[13px] px-4 py-3.5 text-[13.5px] font-[500] outline-none appearance-none transition-all"
                    style={{ background: 'var(--bg-subtle)', color: selectedPlanId ? 'rgb(15,23,42)' : 'rgb(148,163,184)', border: '1.5px solid rgba(15,23,42,0.09)' }}>
                    <option value="">Select plan to auto-fill…</option>
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>{p.name} — {fmtINR(p.base_amount)} / {p.duration_months}mo</option>
                    ))}
                  </select>
                </div>

                {/* Plan name (editable text, pre-filled by selector) */}
                <div className="sm:col-span-2">
                  <FloatInput label="Plan Name (editable)" value={form.package_type} onChange={set('package_type')} />
                </div>

                <FloatInput
                  label="Duration (months)"
                  type="number"
                  value={form.duration_months}
                  onChange={v => {
                    setForm(p => ({ ...p, duration_months: v }));
                    recalcEndDate(form.pt_start_date, v);
                    recalcMonthly(form.final_amount, v);
                  }}
                />

                <FloatInput
                  label="PT Start Date"
                  type="date"
                  value={form.pt_start_date}
                  onChange={v => {
                    setForm(p => ({ ...p, pt_start_date: v }));
                    recalcEndDate(v, form.duration_months);
                  }}
                />

                <FloatInput
                  label="PT End Date"
                  type="date"
                  value={form.pt_end_date}
                  onChange={set('pt_end_date')}
                  suffix={
                    form.pt_start_date && form.duration_months
                      ? <span style={{ fontSize: 10, color: '#6366f1', fontWeight: 600 }}>auto</span>
                      : undefined
                  }
                />

              </div>
            </SectionCard>

            {/* ── Financial ── */}
            <SectionCard title="Financial Details" icon={<Wallet size={16} />} accent="#10b981">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <FloatInput
                  label="Base Amount (₹)"
                  type="number"
                  value={form.base_amount}
                  onChange={v => {
                    setForm(p => ({ ...p, base_amount: v }));
                  }}
                />

                <FloatInput
                  label="Final / Selling Price (₹)"
                  type="number"
                  value={form.final_amount}
                  onChange={v => {
                    setForm(p => ({ ...p, final_amount: v }));
                    recalcMonthly(v, form.duration_months);
                  }}
                />

                {/* Discount — auto-calculated, read-only */}
                <ReadOnlyField
                  label="Discount (auto)"
                  value={discount > 0 ? `−${fmtINR(discount)}` : '—'}
                  highlight={discount > 0 ? 'amber' : undefined}
                />

                <FloatInput
                  label="Amount Paid (₹)"
                  type="number"
                  value={form.paid_amount}
                  onChange={set('paid_amount')}
                />

                {/* Balance — auto-calculated, read-only */}
                <ReadOnlyField
                  label="Balance Due (auto)"
                  value={balance > 0 ? fmtINR(balance) : 'Fully Paid ✓'}
                  highlight={balance > 0 ? 'red' : 'green'}
                />

                <FloatInput
                  label="Monthly PT Fee (₹)"
                  type="number"
                  value={form.monthly_pt_amount}
                  onChange={set('monthly_pt_amount')}
                  suffix={
                    form.duration_months && form.final_amount
                      ? <span style={{ fontSize: 10, color: '#10b981', fontWeight: 600 }}>auto</span>
                      : undefined
                  }
                />

              </div>

              {/* Info hint */}
              <div className="mt-4 flex items-start gap-2 rounded-[10px] px-3.5 py-2.5"
                style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.12)' }}>
                <Info size={12} style={{ color: '#6366f1', marginTop: 2, flexShrink: 0 }} />
                <p className="text-[11.5px] leading-relaxed" style={{ color: 'rgb(100,116,139)' }}>
                  Discount = Base − Final. Balance = Final − Paid. Monthly Fee = Final ÷ Duration. These recalculate automatically as you type.
                </p>
              </div>
            </SectionCard>

            {/* ── Fitness Profile ── */}
            <SectionCard title="Fitness Profile" icon={<Activity size={16} />} accent="#0891b2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <FloatInput label="Primary Goal" value={form.goal} onChange={set('goal')} placeholder="e.g. Weight Loss, Muscle Gain" />
                </div>
                <FloatInput label="Height (cm)" type="number" value={form.height} onChange={set('height')} />
                <FloatInput label="Body Fat %" type="number" value={form.body_fat} onChange={set('body_fat')} />
                <div className="sm:col-span-2">
                  <FloatInput label="Frequency (e.g. 3x/week)" value={form.frequency} onChange={set('frequency')} />
                </div>
                <div className="sm:col-span-2">
                  <FloatInput label="Health Conditions" value={form.health_conditions} onChange={set('health_conditions')} placeholder="e.g. Diabetes, Hypertension" />
                </div>
                <div className="sm:col-span-2">
                  <FloatInput label="Injuries / Medical Notes" value={form.injuries} onChange={set('injuries')} />
                </div>
              </div>
            </SectionCard>

            {/* ── Save footer ── */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex items-center justify-between rounded-[16px] px-5 py-4"
              style={{ background: 'white', border: '1px solid rgba(15,23,42,0.07)', boxShadow: '0 2px 12px rgba(15,23,42,0.04)' }}>
              <div className="flex items-center gap-2">
                <CheckCircle size={15} style={{ color: '#10b981' }} />
                <span className="text-[12.5px] font-[550]" style={{ color: 'rgb(100,116,139)' }}>
                  Review all fields before saving
                </span>
              </div>
              <div className="flex gap-3">
                <PremiumButton tone="secondary" onClick={() => router.push(`/pt-os/clients/${id}`)}>
                  Cancel
                </PremiumButton>
                <PremiumButton tone="primary" glow icon={<Save size={14} />} onClick={handleSave} loading={saving}>
                  Save Changes
                </PremiumButton>
              </div>
            </motion.div>

          </div>
        </div>
      </AppShell>
    </Guard>
  );
}
