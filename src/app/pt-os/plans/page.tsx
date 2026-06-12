'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Pencil, Trash2, X, Check, Sparkles,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import TabBar from '@/app/pt-os/TabBar';
import { PremiumButton } from '@/components/premium/PremiumButton';
import FloatInput from '@/components/ui/FloatInput';
import { api } from '@/lib/api';

interface PtPlan {
  id: string;
  name: string;
  duration_months: number;
  base_amount: number;
  description: string | null;
  is_active: boolean;
}

const fmtINR = (n: number | string | null | undefined) =>
  '₹' + Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

export default function PtPlansPage() {
  return (
    <Guard>
      <AppShell>
        <PtPlansContent />
      </AppShell>
    </Guard>
  );
}

function PtPlansContent() {
  const [plans, setPlans] = useState<PtPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PtPlan | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', duration_months: '', base_amount: '', description: '' });

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await api.pt.plans.list() as { data: PtPlan[] };
      setPlans(res.data ?? []);
    } catch { setPlans([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPlans(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', duration_months: '', base_amount: '', description: '' });
    setShowForm(true);
  };

  const openEdit = (plan: PtPlan) => {
    setEditing(plan);
    setForm({
      name: plan.name,
      duration_months: String(plan.duration_months),
      base_amount: String(plan.base_amount),
      description: plan.description ?? '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.duration_months || !form.base_amount) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        duration_months: parseInt(form.duration_months),
        base_amount: parseFloat(form.base_amount),
        description: form.description || null,
      };
      if (editing) {
        await api.pt.plans.update(editing.id, payload);
      } else {
        await api.pt.plans.create(payload);
      }
      setShowForm(false);
      setEditing(null);
      await fetchPlans();
    } catch { alert('Failed to save plan'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this plan?')) return;
    try {
      await api.pt.plans.delete(id);
      setPlans((p) => p.filter((x) => x.id !== id));
    } catch { alert('Failed to delete plan'); }
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(145deg,#f8fafc 0%,#f1f5f9 50%,#fafafe 100%)' }}>
      <div className="mx-auto max-w-screen-xl px-5 py-6 sm:px-8">
        <TabBar />

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[22px] font-[860] tracking-[-0.03em]" style={{ color: 'rgb(15,23,42)' }}>PT Plans</h1>
            <p className="text-[12px] font-[600] uppercase tracking-[0.08em]" style={{ color: 'rgb(148,163,184)' }}>
              Personal Training / <span style={{ color: '#dc2626' }}>Subscription Plans</span>
            </p>
          </div>
          <PremiumButton tone="primary" glow onClick={openCreate}>
            <Plus size={13} /> New Plan
          </PremiumButton>
        </div>

        {loading ? (
          <div className="text-center py-20 text-[14px]" style={{ color: 'rgb(148,163,184)' }}>Loading plans...</div>
        ) : plans.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-[22px] p-12 text-center"
            style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.8)' }}>
            <Sparkles size={40} style={{ color: '#dc2626' }} className="mx-auto mb-4" />
            <h3 className="text-[17px] font-[760]" style={{ color: 'rgb(15,23,42)' }}>No PT Plans Yet</h3>
            <p className="text-[13px] mt-1" style={{ color: 'rgb(148,163,184)' }}>Create your first subscription plan to get started.</p>
            <PremiumButton tone="primary" glow onClick={openCreate} className="mt-5">
              <Plus size={13} /> Create Plan
            </PremiumButton>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan, i) => (
              <motion.div key={plan.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="rounded-[18px] p-5 relative group"
                style={{
                  background: 'rgba(255,255,255,0.7)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.8)',
                  boxShadow: '0 2px 20px rgba(15,23,42,0.06)',
                }}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-[15px] font-[720]" style={{ color: 'rgb(15,23,42)' }}>{plan.name}</h3>
                    {plan.description && (
                      <p className="text-[12px] mt-0.5" style={{ color: 'rgb(148,163,184)' }}>{plan.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(plan)}
                      className="flex h-8 w-8 items-center justify-center rounded-[9px] hover:bg-zinc-100"
                      style={{ color: 'rgb(100,116,139)' }}>
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => handleDelete(plan.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-[9px] hover:bg-red-50"
                      style={{ color: '#ef4444' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <div className="text-[24px] font-[820] tracking-[-0.03em]" style={{ color: '#dc2626' }}>
                  {fmtINR(plan.base_amount)}
                </div>
                <div className="mt-1 text-[12px] font-[600]" style={{ color: 'rgb(148,163,184)' }}>
                  {plan.duration_months} {plan.duration_months === 1 ? 'month' : 'months'}
                </div>
                {!plan.is_active && (
                  <span className="inline-block mt-2 text-[10px] font-[700] uppercase tracking-[0.06em] px-2 py-0.5 rounded-md"
                    style={{ background: '#f43f5e14', color: '#f43f5e' }}>Inactive</span>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* ── Create/Edit Modal ── */}
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
              onClick={() => setShowForm(false)}>
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-md rounded-[22px] p-6"
                style={{ background: 'var(--bg-card)', boxShadow: '0 24px 80px rgba(0,0,0,0.2)' }}
                onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-[17px] font-[760]" style={{ color: 'rgb(15,23,42)' }}>
                    {editing ? 'Edit Plan' : 'New Plan'}
                  </h3>
                  <button onClick={() => setShowForm(false)} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-zinc-100">
                    <X size={15} />
                  </button>
                </div>
                <div className="space-y-4">
                  <FloatInput label="Plan Name *" value={form.name} onChange={(v) => setForm(p => ({ ...p, name: v }))} placeholder="e.g. Basic PT" />
                  <FloatInput label="Duration (months) *" type="number" value={form.duration_months} onChange={(v) => setForm(p => ({ ...p, duration_months: v }))} placeholder="e.g. 3" />
                  <FloatInput label="Price (₹) *" type="number" value={form.base_amount} onChange={(v) => setForm(p => ({ ...p, base_amount: v }))} placeholder="e.g. 8000" />
                  <FloatInput label="Description" value={form.description} onChange={(v) => setForm(p => ({ ...p, description: v }))} placeholder="Optional description" />
                </div>
                <div className="mt-6 flex gap-3 justify-end">
                  <PremiumButton tone="secondary" onClick={() => setShowForm(false)}>Cancel</PremiumButton>
                  <PremiumButton tone="primary" glow onClick={handleSave} loading={saving} disabled={!form.name || !form.duration_months || !form.base_amount}>
                    <Check size={13} /> {editing ? 'Update' : 'Create'}
                  </PremiumButton>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
