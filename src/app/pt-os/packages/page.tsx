'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Package, Plus, Loader2, Check, Dumbbell, Flame, Zap, Heart, Activity } from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { useAsync } from '@/lib/use-async';
import { api } from '@/lib/api';
import { Button, Card, CardBody, Badge } from '@/components/ui';

const GOAL_COLORS: Record<string, string> = {
  fat_loss: '#dc2626', muscle_gain: '#7c3aed', strength: '#f59e0b',
  powerlifting: '#1e40af', endurance: '#10b981', general_fitness: '#0891b2',
};

function fmtINR(n: number | string | null | undefined) {
  return '₹' + Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export default function PtPackagesPage() {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [sessionCount, setSessionCount] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [price, setPrice] = useState('');
  const [goalType, setGoalType] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const packages = useAsync(() => api.automation.ptPackages.list().then(r => r.data), []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.automation.ptPackages.create({
        name, session_count: parseInt(sessionCount), duration_days: parseInt(durationDays),
        price: parseFloat(price), goal_type: goalType || undefined, description,
      });
      setName(''); setSessionCount(''); setDurationDays(''); setPrice('');
      setGoalType(''); setDescription(''); setShowForm(false);
      packages.refetch();
    } finally { setSaving(false); }
  }

  return (
    <Guard>
      <AppShell>
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-[24px] p-8 sm:p-10 mb-6"
            style={{ background: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #10b981 100%)', boxShadow: '0 20px 60px rgba(4,120,87,0.3)' }}>
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.5), transparent 70%)' }} />
            <div className="relative z-10">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <Package size={16} style={{ color: '#6ee7b7' }} />
                </div>
                <span className="text-[11px] font-[650] uppercase tracking-[0.08em]" style={{ color: '#6ee7b7' }}>PT Packages</span>
              </div>
              <h1 className="text-[32px] sm:text-[40px] font-[860] tracking-[-0.03em] leading-tight" style={{ color: '#ffffff' }}>
                PT Package Sale
              </h1>
              <p className="mt-3 max-w-xl text-[14px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Define PT packages with session counts, pricing, and goal-based targeting.
              </p>
            </div>
          </motion.div>

          <div className="flex justify-end mb-4">
            <Button onClick={() => setShowForm(!showForm)}
              className="!rounded-[14px] !font-[700]" style={{ background: 'linear-gradient(135deg, #047857, #10b981)', color: '#fff' }}>
              <Plus size={16} /> {showForm ? 'Cancel' : 'New Package'}
            </Button>
          </div>

          {showForm && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-[20px] p-6 mb-6" style={{ background: 'var(--bg-card)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.95)' }}>
              <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <input required placeholder="Package name" value={name} onChange={e => setName(e.target.value)}
                  className="rounded-[12px] px-4 py-2.5 text-sm outline-none"
                  style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)', color: 'rgb(15,23,42)' }} />
                <input required type="number" placeholder="Session count" value={sessionCount} onChange={e => setSessionCount(e.target.value)}
                  className="rounded-[12px] px-4 py-2.5 text-sm outline-none"
                  style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)', color: 'rgb(15,23,42)' }} />
                <input required type="number" placeholder="Duration (days)" value={durationDays} onChange={e => setDurationDays(e.target.value)}
                  className="rounded-[12px] px-4 py-2.5 text-sm outline-none"
                  style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)', color: 'rgb(15,23,42)' }} />
                <input required type="number" step="0.01" placeholder="Price (₹)" value={price} onChange={e => setPrice(e.target.value)}
                  className="rounded-[12px] px-4 py-2.5 text-sm outline-none"
                  style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)', color: 'rgb(15,23,42)' }} />
                <select value={goalType} onChange={e => setGoalType(e.target.value)}
                  className="rounded-[12px] px-4 py-2.5 text-sm outline-none"
                  style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)', color: 'rgb(15,23,42)' }}>
                  <option value="">Any Goal</option>
                  <option value="fat_loss">Fat Loss</option><option value="muscle_gain">Muscle Gain</option>
                  <option value="strength">Strength</option><option value="powerlifting">Powerlifting</option>
                  <option value="endurance">Endurance</option>
                </select>
                <input placeholder="Description" value={description} onChange={e => setDescription(e.target.value)}
                  className="rounded-[12px] px-4 py-2.5 text-sm outline-none sm:col-span-2"
                  style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)', color: 'rgb(15,23,42)' }} />
                <Button type="submit" disabled={saving} className="!rounded-[14px] !font-[700]"
                  style={{ background: 'linear-gradient(135deg, #047857, #10b981)', color: '#fff' }}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Create Package
                </Button>
              </form>
            </motion.div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {packages.loading && <div className="col-span-full flex justify-center py-12"><Loader2 size={24} className="animate-spin" /></div>}
            {(packages.data as any[] || []).map((pkg: any, i: number) => (
              <motion.div key={pkg.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="rounded-[20px] p-5 relative overflow-hidden" style={{
                  background: 'var(--bg-card)', backdropFilter: 'blur(16px)',
                  border: `1px solid ${pkg.is_active ? 'var(--bg-card)' : 'rgba(239,68,68,0.2)'}`,
                  boxShadow: '0 2px 20px rgba(15,23,42,0.06)',
                }}>
                {pkg.goal_type && (
                  <div className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-[10px]"
                    style={{ background: `${GOAL_COLORS[pkg.goal_type] || '#6366f1'}15`, color: GOAL_COLORS[pkg.goal_type] || '#6366f1' }}>
                    {pkg.goal_type === 'fat_loss' ? <Flame size= {14} /> : pkg.goal_type === 'muscle_gain' ? <Dumbbell size={14} /> : pkg.goal_type === 'strength' ? <Zap size={14} /> : <Activity size={14} />}
                </div>
              )}
              <h3 className="text-[17px] font-[760] tracking-[-0.02em] pr-10" style={{ color: 'rgb(15,23,42)' }}>{pkg.name}</h3>
              <p className="text-[28px] font-[860] tracking-[-0.03em] mt-2" style={{ color: '#047857' }}>{fmtINR(pkg.price)}</p>
              <div className="flex items-center gap-3 mt-3 text-[12px]" style={{ color: 'rgb(100,116,139)' }}>
                <span>{pkg.session_count} sessions</span>
                <span>·</span>
                <span>{pkg.duration_days} days</span>
              </div>
              {pkg.description && <p className="mt-2 text-[11.5px]" style={{ color: 'rgb(148,163,184)' }}>{pkg.description}</p>}
              {!pkg.is_active && <Badge className="mt-2" tone="danger">Inactive</Badge>}
            </motion.div>
          ))}
        </div>
      </div>
    </AppShell>
  </Guard>
);
}
