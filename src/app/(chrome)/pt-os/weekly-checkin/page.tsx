'use client';
import { useMemo, useState } from 'react';
import { m } from 'framer-motion';
import { ClipboardCheck, Plus, Loader2, Check } from 'lucide-react';
import Guard from '@/components/Guard';
import { useAsync } from '@/lib/use-async';
import { api, Client } from '@/lib/api';
import { Button, FormField, TextInput, TextArea, SelectInput } from '@/components/ui';
import { PremiumAreaChart } from '@/components/visualizations';
import WeeklyCheckinInsightCard from '@/components/pt-os/WeeklyCheckinInsightCard';

const MOODS = [
  { value: 'great', label: 'Great', color: '#10b981' },
  { value: 'good', label: 'Good', color: '#0067e0' },
  { value: 'okay', label: 'Okay', color: '#f59e0b' },
  { value: 'tired', label: 'Tired', color: '#f59e0b' },
  { value: 'stressed', label: 'Stressed', color: '#ef4444' },
];

interface CheckinRow {
  id: string;
  week_start_date?: unknown;
  weight?: number;
  workout_count?: number;
  mood?: string;
  adherence_pct?: number;
}

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
  // The three readings readiness needs. All optional — a check-in taken at the
  // door should record what the client said and leave the rest blank.
  const [stress, setStress] = useState('');
  const [energy, setEnergy] = useState('');
  const [soreness, setSoreness] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const clients = useAsync<any[]>(() => api.pt.clients().then(r => r.data), []);
  const checkins = useAsync(() => api.progress.weeklyCheckins.list(clientId ? { client_id: clientId } : {}).then(r => r.data), [clientId]);
  // One typed view of the check-in rows, reused everywhere below instead of
  // an `any[]` cast at each call site.
  const checkinRows = (checkins.data ?? []) as CheckinRow[];

  // Oldest-first, real weight readings only — a check-in logged without a
  // weight (mood/sleep only) contributes nothing to this trend rather than a
  // gap plotted as zero.
  const weightTrend = useMemo(() => {
    return checkinRows
      .filter((c): c is CheckinRow & { weight: number } => typeof c.weight === 'number' && Number.isFinite(c.weight))
      .sort((a, b) => String(a.week_start_date).localeCompare(String(b.week_start_date)))
      .map((c) => ({ week: String(c.week_start_date), weight: c.weight }));
  }, [checkinRows]);

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
        stress_level: stress ? parseInt(stress) : undefined,
        energy_level: energy ? parseInt(energy) : undefined,
        soreness_level: soreness ? parseInt(soreness) : undefined,
      });
      setSuccess(true); setTimeout(() => setSuccess(false), 2000);
      checkins.refetch();
    } finally { setSaving(false); }
  }

  if (pageError && !clients.loading && !checkins.loading) {
    return (
      <Guard>
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
                  background: 'linear-gradient(135deg, #0059ce, #0067e0)',
                  color: '#fff', fontSize: 13, fontWeight: 700,
                  boxShadow: '0 4px 12px rgba(0,89,206,0.25)',
                }}
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </Guard>
    );
  }

  return (
    <Guard>
      <div className="mx-auto w-full max-w-7xl py-6 sm:py-8">
        <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[24px] p-8 sm:p-10 mb-6"
          style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
          <div className="relative z-10">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: 'rgba(0,89,206,0.1)' }}>
                <ClipboardCheck size={16} style={{ color: '#0059ce' }} />
              </div>
              <span className="text-[11px] font-[650] uppercase tracking-[0.08em]" style={{ color: '#0059ce' }}>Progress Tracking</span>
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
              {/* Migrated to the form system. Every caption here used to be a
                  placeholder, so a half-filled check-in was six anonymous
                  number boxes — and this form is filled from a phone, beside a
                  client, where "was the third one water or workouts?" is a real
                  question. The captions are persistent now; the placeholders
                  that survive carry a unit or a range, which is what a
                  placeholder is for. */}
              <FormField label="Client" required>
                <SelectInput value={clientId} onChange={e => setClientId(e.target.value)}>
                  <option value="">Select client...</option>
                  {clients.data?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </SelectInput>
              </FormField>

              <FormField label="Week starting">
                <TextInput type="date" value={weekStart} onChange={e => setWeekStart(e.target.value)} />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                {/* inputMode alongside type="number": the type gives a numeric
                    keypad, and decimal vs numeric decides whether it has a
                    decimal point. Weight and sleep take halves; glasses and
                    workouts do not. */}
                <FormField label="Weight" description="kg">
                  <TextInput type="number" step="0.1" inputMode="decimal" placeholder="e.g. 72.5"
                    value={weight} onChange={e => setWeight(e.target.value)} />
                </FormField>
                <FormField label="Sleep" description="hours per night">
                  <TextInput type="number" step="0.5" inputMode="decimal" placeholder="e.g. 7.5"
                    value={sleepHours} onChange={e => setSleepHours(e.target.value)} />
                </FormField>
                <FormField label="Water" description="glasses per day">
                  <TextInput type="number" inputMode="numeric"
                    value={waterGlasses} onChange={e => setWaterGlasses(e.target.value)} />
                </FormField>
                <FormField label="Workouts" description="this week">
                  <TextInput type="number" inputMode="numeric"
                    value={workoutCount} onChange={e => setWorkoutCount(e.target.value)} />
                </FormField>
              </div>

              <FormField label="Adherence" description="Percentage, 0 to 100.">
                <TextInput type="number" min={0} max={100} inputMode="numeric"
                  value={adherencePct} onChange={e => setAdherencePct(e.target.value)} />
              </FormField>
              {/* ── Readiness inputs ──
                  Sleep is already above. These three are the rest of what a
                  recovery score needs: without them it is a sleep score
                  wearing a different name. Each is optional, and the score
                  is computed only from the ones answered. */}
              <div>
                <p className="mb-2 text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                  Readiness — 1 to 10, optional
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { label: 'Stress', hint: '10 = worst', value: stress, set: setStress },
                    { label: 'Energy', hint: '10 = best', value: energy, set: setEnergy },
                    { label: 'Soreness', hint: '10 = worst', value: soreness, set: setSoreness },
                  ]).map((f) => (
                    // The hint moves from a loose <p> under the box into the
                    // field's description slot, so it is announced with the
                    // control instead of being read as stray text after it.
                    <FormField key={f.label} label={f.label} description={f.hint}>
                      <TextInput
                        type="number" min={1} max={10} inputMode="numeric"
                        value={f.value} onChange={(e) => f.set(e.target.value)}
                      />
                    </FormField>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Mood</p>
                <div className="flex gap-2">
                  {MOODS.map(m => (
                    <button key={m.value} type="button" onClick={() => setMood(m.value)}
                      className="flex-1 rounded-[10px] py-2 text-[11px] font-semibold transition-all"
                      style={{
                        background: mood === m.value ? `${m.color}15` : '#F8FAFC',
                        border: `1.5px solid ${mood === m.value ? m.color : 'transparent'}`,
                        color: mood === m.value ? m.color : '#64748b',
                      }}>{m.label}</button>
                  ))}
                </div>
              </div>
              <FormField label="Trainer notes">
                <TextArea rows={2} placeholder="How the week went, anything to watch"
                  value={trainerNotes} onChange={e => setTrainerNotes(e.target.value)} />
              </FormField>
              <Button type="submit" disabled={!clientId || saving}
                className="!w-full !rounded-[14px] !py-3 !font-[700]"
                style={{ background: !clientId || saving ? 'rgba(0,0,0,0.1)' : 'linear-gradient(135deg, #0059ce, #0067e0)', color: '#fff' }}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : success ? <Check size={16} /> : <Plus size={16} />}
                {saving ? 'Saving...' : success ? 'Saved!' : 'Log Check-In'}
              </Button>
            </form>
          </m.div>

          <m.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            className="rounded-[20px] p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h2 className="text-[18px] font-[760] mb-5" style={{ color: 'var(--text-primary)' }}>Recent Check-Ins</h2>
            {clientId && checkinRows.length > 0 ? (
              <div className="mb-5">
                <WeeklyCheckinInsightCard clientId={clientId} checkinsCount={checkinRows.length} />
              </div>
            ) : null}
            {/* Only drawn once a client is picked — the list otherwise mixes
                every client's check-ins, and a weight trend across different
                people is not a trend. Needs two real readings for a line to
                describe a direction. */}
            {clientId && weightTrend.length >= 2 && (
              <PremiumAreaChart
                data={weightTrend}
                xKey="week"
                areas={[{ key: 'weight', label: 'Weight (kg)' }]}
                height={160}
                className="mb-5"
              />
            )}
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {checkinRows.map((c) => (
                <div key={c.id} className="rounded-[14px] p-4" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                  <div className="flex justify-between mb-2">
                    <span className="text-[12px] font-semibold" style={{ color: 'var(--text-muted)' }}>Week of {String(c.week_start_date)}</span>
                    {!!c.adherence_pct && (
                      <span className="text-[11px] font-bold" style={{ color: c.adherence_pct >= 80 ? '#10b981' : c.adherence_pct >= 60 ? '#f59e0b' : '#ef4444' }}>
                        {c.adherence_pct}%
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    {!!c.weight && <div><span style={{ color: 'var(--text-muted)' }}>Wt: </span><span className="font-semibold">{c.weight}kg</span></div>}
                    {!!c.workout_count && c.workout_count > 0 && <div><span style={{ color: 'var(--text-muted)' }}>WOs: </span><span className="font-semibold">{c.workout_count}</span></div>}
                    {!!c.mood && <div><span style={{ color: 'var(--text-muted)' }}>Mood: </span><span className="font-semibold capitalize">{c.mood}</span></div>}
                  </div>
                </div>
              ))}
              {checkinRows.length === 0 && (
                <p className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>No check-ins yet.</p>
              )}
            </div>
          </m.div>
        </div>
      </div>
    </Guard>
  );
}
