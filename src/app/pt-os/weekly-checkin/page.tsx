'use client';
import { useState } from 'react';
import { m } from 'framer-motion';
import { ClipboardCheck, Plus, Loader2, Check } from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { useAsync } from '@/lib/use-async';
import { api, Client } from '@/lib/api';
import { Button } from '@/components/ui';

const MOODS = [
  { value: 'great', label: 'Great', color: '#10b981' },
  { value: 'good', label: 'Good', color: '#3b82f6' },
  { value: 'okay', label: 'Okay', color: '#f59e0b' },
  { value: 'tired', label: 'Tired', color: '#f97316' },
  { value: 'stressed', label: 'Stressed', color: '#ef4444' },
];

export default function WeeklyCheckinPage() {
  const [clientId, setClientId] = useState('');
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay());
    return d.toISOString().split('T')[0];
  });
  const [weight, setWeight] = useState('');
  const [mood, setMood] = useState('good');
  const [sleepHours, setSleepHours] = useState('');
  const [waterGlasses, setWaterGlasses] = useState('');
  const [workoutCount, setWorkoutCount] = useState('');
  const [adherencePct, setAdherencePct] = useState('');
  const [trainerNotes, setTrainerNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const clients = useAsync<any[]>(() => api.pt.clients().then(r => r.data), []);
  const checkins = useAsync(() => api.progress.weeklyCheckins.list(clientId ? { client_id: clientId } : {}).then(r => r.data), [clientId]);

  const pageError = clients.error || checkins.error;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) return;
    setSaving(true);
    try {
      await api.progress.weeklyCheckins.create({
        client_id: clientId, week_start_date: weekStart,
        weight: weight ? parseFloat(weight) : undefined,
        mood, sleep_hours: sleepHours ? parseFloat(sleepHours) : undefined,
        water_glasses: waterGlasses ? parseInt(waterGlasses) : undefined,
        workout_count: workoutCount ? parseInt(workoutCount) : undefined,
        adherence_pct: adherencePct ? parseInt(adherencePct) : undefined,
        trainer_notes: trainerNotes || undefined,
      });
      setSuccess(true); setTimeout(() => setSuccess(false), 2000);
      checkins.refetch();
    } finally { setSaving(false); }
  }

  if (pageError && !clients.loading && !checkins.loading) {
    return (
      <Guard>
        <AppShell>
          <div className="mx-auto w-full max-w-7xl py-6 sm:py-8">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 320, padding: 40 }}>
              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 20,
                padding: '40px 32px',
                textAlign: 'center',
                maxWidth: 400,
                boxShadow: '0 4px 24px rgba(15,23,42,0.06)',
              }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
                  Unable to Load Data
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 20px' }}>
                  This feature is not available yet or there was a problem loading the page. Please try again later.
                </p>
                <button
                  onClick={() => { clients.refetch(); checkins.refetch(); }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '10px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: 'linear-gradient(135deg, #0d9488, #14b8a6)',
                    color: '#fff', fontSize: 13, fontWeight: 700,
                    boxShadow: '0 4px 12px rgba(13,148,136,0.25)',
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
        <div className="mx-auto w-full max-w-7xl py-6 sm:py-8">
          <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-[24px] p-8 sm:p-10 mb-6"
            style={{ background: '#F0FDFA', border: '1px solid #99F6E4' }}>
            <div className="relative z-10">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: 'rgba(13,148,136,0.1)' }}>
                  <ClipboardCheck size={16} style={{ color: '#0d9488' }} />
                </div>
                <span className="text-[11px] font-[650] uppercase tracking-[0.08em]" style={{ color: '#0d9488' }}>Progress Tracking</span>
              </div>
              <h1 className="text-[32px] sm:text-[40px] font-[860] tracking-[-0.03em] leading-tight" style={{ color: 'var(--text-primary)' }}>
                Weekly Check-In
              </h1>
              <p className="mt-3 max-w-xl text-[14px]" style={{ color: 'var(--text-muted)' }}>
                Log weekly progress — weight, mood, sleep, adherence, and trainer notes.
              </p>
            </div>
          </m.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <m.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <h2 className="text-[18px] font-[760] mb-5" style={{ color: 'var(--text-primary)' }}>Log Check-In</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <select value={clientId} onChange={e => setClientId(e.target.value)}
                  className="w-full rounded-[12px] px-4 py-2.5 text-sm outline-none"
                  style={{ background: 'var(--bg-card)', border: '1px solid #d1d5db', color: 'var(--text-primary)' }}>
                  <option value="">Select client...</option>
                  {clients.data?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input type="date" value={weekStart} onChange={e => setWeekStart(e.target.value)}
                  className="w-full rounded-[12px] px-4 py-2.5 text-sm outline-none"
                  style={{ background: 'var(--bg-card)', border: '1px solid #d1d5db', color: 'var(--text-primary)' }} />
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" step="0.1" placeholder="Weight (kg)" value={weight} onChange={e => setWeight(e.target.value)}
                    className="rounded-[12px] px-4 py-2.5 text-sm outline-none"
                    style={{ background: 'var(--bg-card)', border: '1px solid #d1d5db', color: 'var(--text-primary)' }} />
                  <input type="number" step="0.5" placeholder="Sleep (hrs)" value={sleepHours} onChange={e => setSleepHours(e.target.value)}
                    className="rounded-[12px] px-4 py-2.5 text-sm outline-none"
                    style={{ background: 'var(--bg-card)', border: '1px solid #d1d5db', color: 'var(--text-primary)' }} />
                  <input type="number" placeholder="Water (glasses)" value={waterGlasses} onChange={e => setWaterGlasses(e.target.value)}
                    className="rounded-[12px] px-4 py-2.5 text-sm outline-none"
                    style={{ background: 'var(--bg-card)', border: '1px solid #d1d5db', color: 'var(--text-primary)' }} />
                  <input type="number" placeholder="Workouts this week" value={workoutCount} onChange={e => setWorkoutCount(e.target.value)}
                    className="rounded-[12px] px-4 py-2.5 text-sm outline-none"
                    style={{ background: 'var(--bg-card)', border: '1px solid #d1d5db', color: 'var(--text-primary)' }} />
                </div>
                <input type="number" placeholder="Adherence % (0-100)" value={adherencePct} onChange={e => setAdherencePct(e.target.value)}
                  className="w-full rounded-[12px] px-4 py-2.5 text-sm outline-none"
                  style={{ background: 'var(--bg-card)', border: '1px solid #d1d5db', color: 'var(--text-primary)' }} />
                <div>
                  <p className="text-[11px] font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Mood</p>
                  <div className="flex gap-2">
                    {MOODS.map(m => (
                      <button key={m.value} type="button" onClick={() => setMood(m.value)}
                        className="flex-1 rounded-[10px] py-2 text-[11px] font-semibold transition-all"
                        style={{
                          background: mood === m.value ? `${m.color}15` : '#F9FAFB',
                          border: `1.5px solid ${mood === m.value ? m.color : 'transparent'}`,
                          color: mood === m.value ? m.color : '#6b7280',
                        }}>{m.label}</button>
                    ))}
                  </div>
                </div>
                <textarea placeholder="Trainer notes..." rows={2} value={trainerNotes} onChange={e => setTrainerNotes(e.target.value)}
                  className="w-full rounded-[12px] px-4 py-2.5 text-sm outline-none resize-none"
                  style={{ background: 'var(--bg-card)', border: '1px solid #d1d5db', color: 'var(--text-primary)' }} />
                <Button type="submit" disabled={!clientId || saving}
                  className="!w-full !rounded-[14px] !py-3 !font-[700]"
                  style={{ background: !clientId || saving ? 'rgba(0,0,0,0.1)' : 'linear-gradient(135deg, #0d9488, #14b8a6)', color: '#fff' }}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : success ? <Check size={16} /> : <Plus size={16} />}
                  {saving ? 'Saving...' : success ? 'Saved!' : 'Log Check-In'}
                </Button>
              </form>
            </m.div>

            <m.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              className="rounded-[20px] p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <h2 className="text-[18px] font-[760] mb-5" style={{ color: 'var(--text-primary)' }}>Recent Check-Ins</h2>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {(checkins.data as any[] || []).map((c: any) => (
                  <div key={c.id} className="rounded-[14px] p-4" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                    <div className="flex justify-between mb-2">
                      <span className="text-[12px] font-semibold" style={{ color: 'var(--text-muted)' }}>Week of {c.week_start_date}</span>
                      {c.adherence_pct && (
                        <span className="text-[11px] font-bold" style={{ color: c.adherence_pct >= 80 ? '#10b981' : c.adherence_pct >= 60 ? '#f59e0b' : '#ef4444' }}>
                          {c.adherence_pct}%
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[11px]">
                      {c.weight && <div><span style={{ color: 'var(--text-muted)' }}>Wt: </span><span className="font-semibold">{c.weight}kg</span></div>}
                      {c.workout_count > 0 && <div><span style={{ color: 'var(--text-muted)' }}>WOs: </span><span className="font-semibold">{c.workout_count}</span></div>}
                      {c.mood && <div><span style={{ color: 'var(--text-muted)' }}>Mood: </span><span className="font-semibold capitalize">{c.mood}</span></div>}
                    </div>
                  </div>
                ))}
                {(!checkins.data || (checkins.data as any[]).length === 0) && (
                  <p className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>No check-ins yet.</p>
                )}
              </div>
            </m.div>
          </div>
        </div>
      </AppShell>
    </Guard>
  );
}
