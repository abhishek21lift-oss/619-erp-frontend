'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Plus, Loader2, TrendingUp } from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { useAsync } from '@/lib/use-async';
import { api, Client } from '@/lib/api';
import { Button } from '@/components/ui';

const EXERCISES = ['Bench Press', 'Squat', 'Deadlift', 'Shoulder Press', 'Barbell Row', 'Lat Pulldown', 'Leg Press', 'Bicep Curl'];

export default function StrengthTrackingPage() {
  const [clientId, setClientId] = useState('');
  const [exerciseName, setExerciseName] = useState('Bench Press');
  const [weightKg, setWeightKg] = useState('');
  const [setsDone, setSetsDone] = useState('3');
  const [repsDone, setRepsDone] = useState('10');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const clients = useAsync<any[]>(() => api.pt.clients().then(r => r.data), []);
  const logs = useAsync(() => api.progress.strengthLogs.list(clientId ? { client_id: clientId } : {}).then(r => r.data), [clientId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId || !weightKg) return;
    setSaving(true);
    try {
      await api.progress.strengthLogs.create({
        client_id: clientId, exercise_name: exerciseName,
        weight_kg: parseFloat(weightKg), sets_done: parseInt(setsDone),
        reps_done: parseInt(repsDone), notes: notes || undefined,
      });
      setWeightKg(''); setNotes('');
      logs.refetch();
    } finally { setSaving(false); }
  }

  function calc1RM(weight: number, reps: number) { return Math.round(weight * (1 + reps / 30)); }

  return (
    <Guard>
      <AppShell>
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-[24px] p-8 sm:p-10 mb-6"
            style={{ background: 'linear-gradient(135deg, #7c2d12 0%, #9a3412 50%, #ea580c 100%)', boxShadow: '0 20px 60px rgba(154,52,18,0.3)' }}>
            <div className="relative z-10">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <Zap size={16} style={{ color: '#fdba74' }} />
                </div>
                <span className="text-[11px] font-[650] uppercase tracking-[0.08em]" style={{ color: '#fdba74' }}>Strength Tracking</span>
              </div>
              <h1 className="text-[32px] sm:text-[40px] font-[860] tracking-[-0.03em] leading-tight" style={{ color: '#ffffff' }}>
                Strength Progress
              </h1>
              <p className="mt-3 max-w-xl text-[14px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Track 1RM estimates and monitor strength gains over time.
              </p>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-[20px] p-6" style={{ background: 'var(--bg-card)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.95)' }}>
              <h2 className="text-[18px] font-[760] mb-5" style={{ color: 'rgb(15,23,42)' }}>Log Lift</h2>
              <form onSubmit={handleSubmit} className="space-y-3">
                <select value={clientId} onChange={e => setClientId(e.target.value)}
                  className="w-full rounded-[12px] px-4 py-2.5 text-sm outline-none"
                  style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)', color: 'rgb(15,23,42)' }}>
                  <option value="">Select client...</option>
                  {clients.data?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select value={exerciseName} onChange={e => setExerciseName(e.target.value)}
                  className="w-full rounded-[12px] px-4 py-2.5 text-sm outline-none"
                  style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)', color: 'rgb(15,23,42)' }}>
                  {EXERCISES.map(ex => <option key={ex} value={ex}>{ex}</option>)}
                </select>
                <div className="grid grid-cols-3 gap-2">
                  <input required type="number" step="0.5" placeholder="Weight (kg)" value={weightKg} onChange={e => setWeightKg(e.target.value)}
                    className="rounded-[12px] px-4 py-2.5 text-sm outline-none"
                    style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }} />
                  <input type="number" placeholder="Sets" value={setsDone} onChange={e => setSetsDone(e.target.value)}
                    className="rounded-[12px] px-4 py-2.5 text-sm outline-none"
                    style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }} />
                  <input type="number" placeholder="Reps" value={repsDone} onChange={e => setRepsDone(e.target.value)}
                    className="rounded-[12px] px-4 py-2.5 text-sm outline-none"
                    style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }} />
                </div>
                {weightKg && repsDone && (
                  <p className="text-[12px] font-semibold" style={{ color: '#ea580c' }}>
                    Est. 1RM: {calc1RM(parseFloat(weightKg), parseInt(repsDone))} kg
                  </p>
                )}
                <textarea placeholder="Notes..." rows={2} value={notes} onChange={e => setNotes(e.target.value)}
                  className="w-full rounded-[12px] px-4 py-2.5 text-sm outline-none resize-none"
                  style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }} />
                <Button type="submit" disabled={!clientId || !weightKg || saving}
                  className="!w-full !rounded-[14px] !py-3 !font-[700]"
                  style={{ background: !clientId || !weightKg || saving ? 'rgba(0,0,0,0.1)' : 'linear-gradient(135deg, #9a3412, #ea580c)', color: '#fff' }}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Log Lift
                </Button>
              </form>
            </div>

            <div className="rounded-[20px] p-6" style={{ background: 'var(--bg-card)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.95)' }}>
              <h2 className="text-[18px] font-[760] mb-5" style={{ color: 'rgb(15,23,42)' }}>Lift History</h2>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {(logs.data as any[] || []).map((l: any) => (
                  <div key={l.id} className="rounded-[12px] p-3" style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.04)' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-[700]" style={{ color: 'rgb(15,23,42)' }}>{l.exercise_name}</span>
                      <span className="text-[11px]" style={{ color: 'rgb(148,163,184)' }}>{l.log_date}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-[12px]">
                      <span className="font-bold" style={{ color: '#ea580c' }}>{l.weight_kg} kg</span>
                      <span style={{ color: 'rgb(148,163,184)' }}>{l.sets_done} × {l.reps_done}</span>
                      {l.one_rm_estimate && (
                        <span className="flex items-center gap-1" style={{ color: '#7c3aed' }}>
                          <TrendingUp size={12} /> 1RM: {l.one_rm_estimate} kg
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {(!logs.data || (logs.data as any[]).length === 0) && (
                  <p className="text-center py-8 text-sm" style={{ color: 'rgb(148,163,184)' }}>No lifts logged yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    </Guard>
  );
}
