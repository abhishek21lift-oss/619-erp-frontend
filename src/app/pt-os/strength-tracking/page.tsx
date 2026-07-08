'use client';
import { useState } from 'react';
import { m } from 'framer-motion';
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

  const pageError = clients.error || logs.error;

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

  if (pageError && !clients.loading && !logs.loading) {
    return (
      <Guard>
        <AppShell>
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 320, padding: 40 }}>
              <div style={{
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: 20,
                padding: '40px 32px',
                textAlign: 'center',
                maxWidth: 400,
                boxShadow: '0 4px 24px rgba(15,23,42,0.06)',
              }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
                  Unable to Load Data
                </h2>
                <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px' }}>
                  This feature is not available yet or there was a problem loading the page. Please try again later.
                </p>
                <button
                  onClick={() => { clients.refetch(); logs.refetch(); }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '10px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: 'linear-gradient(135deg, #9a3412, #ea580c)',
                    color: '#fff', fontSize: 13, fontWeight: 700,
                    boxShadow: '0 4px 12px rgba(234,88,12,0.25)',
                  }}
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </AppShell>
      </Guard>
    );
  }

  return (
    <Guard>
      <AppShell>
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-[24px] p-8 sm:p-10 mb-6"
            style={{ background: '#FFF7ED', border: '1px solid #FDBA74' }}>
            <div className="relative z-10">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: 'rgba(234,88,12,0.1)' }}>
                  <Zap size={16} style={{ color: '#ea580c' }} />
                </div>
                <span className="text-[11px] font-[650] uppercase tracking-[0.08em]" style={{ color: '#ea580c' }}>Strength Tracking</span>
              </div>
              <h1 className="text-[32px] sm:text-[40px] font-[860] tracking-[-0.03em] leading-tight" style={{ color: '#111827' }}>
                Strength Progress
              </h1>
              <p className="mt-3 max-w-xl text-[14px]" style={{ color: '#6b7280' }}>
                Track 1RM estimates and monitor strength gains over time.
              </p>
            </div>
          </m.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-[20px] p-6" style={{ background: '#fff', border: '1px solid #e5e7eb' }}>
              <h2 className="text-[18px] font-[760] mb-5" style={{ color: '#111827' }}>Log Lift</h2>
              <form onSubmit={handleSubmit} className="space-y-3">
                <select value={clientId} onChange={e => setClientId(e.target.value)}
                  className="w-full rounded-[12px] px-4 py-2.5 text-sm outline-none"
                  style={{ background: '#fff', border: '1px solid #d1d5db', color: '#111827' }}>
                  <option value="">Select client...</option>
                  {clients.data?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select value={exerciseName} onChange={e => setExerciseName(e.target.value)}
                  className="w-full rounded-[12px] px-4 py-2.5 text-sm outline-none"
                  style={{ background: '#fff', border: '1px solid #d1d5db', color: '#111827' }}>
                  {EXERCISES.map(ex => <option key={ex} value={ex}>{ex}</option>)}
                </select>
                <div className="grid grid-cols-3 gap-2">
                  <input required type="number" step="0.5" placeholder="Weight (kg)" value={weightKg} onChange={e => setWeightKg(e.target.value)}
                    className="rounded-[12px] px-4 py-2.5 text-sm outline-none"
                    style={{ background: '#fff', border: '1px solid #d1d5db', color: '#111827' }} />
                  <input type="number" placeholder="Sets" value={setsDone} onChange={e => setSetsDone(e.target.value)}
                    className="rounded-[12px] px-4 py-2.5 text-sm outline-none"
                    style={{ background: '#fff', border: '1px solid #d1d5db', color: '#111827' }} />
                  <input type="number" placeholder="Reps" value={repsDone} onChange={e => setRepsDone(e.target.value)}
                    className="rounded-[12px] px-4 py-2.5 text-sm outline-none"
                    style={{ background: '#fff', border: '1px solid #d1d5db', color: '#111827' }} />
                </div>
                {weightKg && repsDone && (
                  <p className="text-[12px] font-semibold" style={{ color: '#ea580c' }}>
                    Est. 1RM: {calc1RM(parseFloat(weightKg), parseInt(repsDone))} kg
                  </p>
                )}
                <textarea placeholder="Notes..." rows={2} value={notes} onChange={e => setNotes(e.target.value)}
                  className="w-full rounded-[12px] px-4 py-2.5 text-sm outline-none resize-none"
                  style={{ background: '#fff', border: '1px solid #d1d5db', color: '#111827' }} />
                <Button type="submit" disabled={!clientId || !weightKg || saving}
                  className="!w-full !rounded-[14px] !py-3 !font-[700]"
                  style={{ background: !clientId || !weightKg || saving ? 'rgba(0,0,0,0.1)' : 'linear-gradient(135deg, #9a3412, #ea580c)', color: '#fff' }}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Log Lift
                </Button>
              </form>
            </div>

            <div className="rounded-[20px] p-6" style={{ background: '#fff', border: '1px solid #e5e7eb' }}>
              <h2 className="text-[18px] font-[760] mb-5" style={{ color: '#111827' }}>Lift History</h2>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {(logs.data as any[] || []).map((l: any) => (
                  <div key={l.id} className="rounded-[12px] p-3" style={{ background: '#F9FAFB', border: '1px solid #f3f4f6' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-[700]" style={{ color: '#111827' }}>{l.exercise_name}</span>
                      <span className="text-[11px]" style={{ color: '#6b7280' }}>{l.log_date}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-[12px]">
                      <span className="font-bold" style={{ color: '#ea580c' }}>{l.weight_kg} kg</span>
                      <span style={{ color: '#6b7280' }}>{l.sets_done} × {l.reps_done}</span>
                      {l.one_rm_estimate && (
                        <span className="flex items-center gap-1" style={{ color: '#7c3aed' }}>
                          <TrendingUp size={12} /> 1RM: {l.one_rm_estimate} kg
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {(!logs.data || (logs.data as any[]).length === 0) && (
                  <p className="text-center py-8 text-sm" style={{ color: '#6b7280' }}>No lifts logged yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    </Guard>
  );
}
