'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Target, Plus, Check, Loader2, Dumbbell, Heart, Zap, Flame, Activity } from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api, Client } from '@/lib/api';
import { useAsync } from '@/lib/use-async';
import { Button } from '@/components/ui';

const GOAL_TYPES = [
  { value: 'fat_loss', label: 'Fat Loss', icon: <Flame size={18} />, color: '#F59E0B' },
  { value: 'muscle_gain', label: 'Muscle Gain', icon: <Dumbbell size={18} />, color: '#7c3aed' },
  { value: 'strength', label: 'Strength', icon: <Zap size={18} />, color: '#f59e0b' },
  { value: 'powerlifting', label: 'Powerlifting', icon: <Activity size={18} />, color: '#1e40af' },
  { value: 'endurance', label: 'Endurance', icon: <Heart size={18} />, color: '#10b981' },
  { value: 'general_fitness', label: 'General Fitness', icon: <Target size={18} />, color: '#0891b2' },
];

export default function PtGoalsPage() {
  const [selectedClient, setSelectedClient] = useState('');
  const [goalType, setGoalType] = useState('fat_loss');
  const [targetWeight, setTargetWeight] = useState('');
  const [targetBodyFat, setTargetBodyFat] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const clients = useAsync<any[]>(() => api.pt.clients().then(r => r.data), []);
  const goals = useAsync(() => api.progress.goals.list(selectedClient ? { client_id: selectedClient } : {}).then(r => r.data), [selectedClient]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClient) return;
    setSaving(true);
    try {
      await api.progress.goals.create({
        client_id: selectedClient, goal_type: goalType,
        target_weight: targetWeight ? parseFloat(targetWeight) : undefined,
        target_body_fat: targetBodyFat ? parseFloat(targetBodyFat) : undefined,
        target_date: targetDate || undefined, notes,
      });
      setTargetWeight(''); setTargetBodyFat(''); setTargetDate(''); setNotes('');
      goals.refetch();
    } finally { setSaving(false); }
  }

  return (
    <Guard>
      <AppShell>
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative overflow-hidden rounded-[24px] p-8 sm:p-10 mb-6"
            style={{ background: '#F8FAFC', border: '1px solid #f3f4f6' }}>
            <div className="relative z-10">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: 'rgba(124,58,237,0.1)' }}>
                  <Target size={16} style={{ color: '#7c3aed' }} />
                </div>
                <span className="text-[11px] font-[650] uppercase tracking-[0.08em]" style={{ color: '#7c3aed' }}>PT System</span>
              </div>
              <h1 className="text-[32px] sm:text-[40px] font-[860] tracking-[-0.03em] leading-tight" style={{ color: '#111827' }}>
                Goal Setting
              </h1>
              <p className="mt-3 max-w-xl text-[14px] sm:text-[15px]" style={{ color: '#6b7280' }}>
                Set and track client fitness goals — Fat Loss, Muscle Gain, Strength, Powerlifting, and more.
              </p>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
              className="rounded-[20px] p-6" style={{ background: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 2px 20px rgba(15,23,42,0.06)' }}>
              <h2 className="text-[18px] font-[760] mb-5" style={{ color: '#111827' }}>New Goal</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)}
                  className="w-full rounded-[12px] px-4 py-2.5 text-sm outline-none"
                  style={{ background: '#fff', border: '1px solid #d1d5db', color: '#111827' }}>
                  <option value="">Select client...</option>
                  {clients.data?.map(c => <option key={c.id} value={c.id}>{c.name} ({c.member_code || c.client_id})</option>)}
                </select>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {GOAL_TYPES.map(g => (
                    <button key={g.value} type="button" onClick={() => setGoalType(g.value)}
                      className="flex items-center gap-2 rounded-[12px] px-3 py-2.5 text-sm font-medium transition-all"
                      style={{
                        background: goalType === g.value ? `${g.color}15` : '#F9FAFB',
                        border: `1.5px solid ${goalType === g.value ? g.color : '#e5e7eb'}`,
                        color: goalType === g.value ? g.color : '#9ca3af',
                      }}>
                      {g.icon} {g.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input type="number" step="0.1" placeholder="Target Weight (kg)" value={targetWeight}
                    onChange={e => setTargetWeight(e.target.value)}
                    className="rounded-[12px] px-4 py-2.5 text-sm outline-none"
                    style={{ background: '#fff', border: '1px solid #d1d5db', color: '#111827' }} />
                  <input type="number" step="0.1" placeholder="Target Body Fat %" value={targetBodyFat}
                    onChange={e => setTargetBodyFat(e.target.value)}
                    className="rounded-[12px] px-4 py-2.5 text-sm outline-none"
                    style={{ background: '#fff', border: '1px solid #d1d5db', color: '#111827' }} />
                </div>
                <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)}
                  className="w-full rounded-[12px] px-4 py-2.5 text-sm outline-none"
                  style={{ background: '#fff', border: '1px solid #d1d5db', color: '#111827' }} />
                <textarea placeholder="Notes about this goal..." rows={3} value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full rounded-[12px] px-4 py-2.5 text-sm outline-none resize-none"
                  style={{ background: '#fff', border: '1px solid #d1d5db', color: '#111827' }} />
                <Button type="submit" disabled={!selectedClient || saving}
                  className="!w-full !rounded-[14px] !py-3 !font-[700]"
                  style={{ background: !selectedClient || saving ? 'rgba(0,0,0,0.1)' : 'linear-gradient(135deg, #7c3aed, #a78bfa)', color: '#fff' }}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  {saving ? 'Saving...' : 'Set Goal'}
                </Button>
              </form>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
              className="rounded-[20px] p-6" style={{ background: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 2px 20px rgba(15,23,42,0.06)' }}>
              <h2 className="text-[18px] font-[760] mb-5" style={{ color: '#111827' }}>Active Goals</h2>
              {goals.loading && <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin" style={{ color: '#9ca3af' }} /></div>}
              {!goals.loading && (!goals.data || (goals.data as unknown[]).length === 0) && (
                <p className="text-center py-8 text-sm" style={{ color: '#9ca3af' }}>No goals set yet. Select a client and create a goal.</p>
              )}
              <div className="space-y-3">
                {(goals.data as unknown[] || []).map((g: any) => (
                  <div key={g.id} className="rounded-[14px] p-4" style={{ background: '#F9FAFB', border: '1px solid #e5e7eb' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[13px] font-[700]" style={{ color: '#111827' }}>{g.goal_type?.replace(/_/g, ' ')}</span>
                      {g.is_active && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-[6px]" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>ACTIVE</span>}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[12px]">
                      {g.target_weight && <div><span style={{ color: '#9ca3af' }}>Target: </span><span className="font-semibold" style={{ color: '#111827' }}>{g.target_weight} kg</span></div>}
                      {g.target_body_fat && <div><span style={{ color: '#9ca3af' }}>Body Fat: </span><span className="font-semibold" style={{ color: '#111827' }}>{g.target_body_fat}%</span></div>}
                      {g.target_date && <div><span style={{ color: '#9ca3af' }}>By: </span><span className="font-semibold" style={{ color: '#111827' }}>{g.target_date}</span></div>}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </AppShell>
    </Guard>
  );
}
