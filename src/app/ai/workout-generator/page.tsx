'use client';

import { useState } from 'react';
import { Dumbbell, Loader2, ChevronDown, ChevronUp, Sparkles, RotateCcw, Flame, Clock, Target } from 'lucide-react';
import { motion, type Variants } from 'framer-motion';
import { api } from '@/lib/api';
import type { AiWorkoutPlan, AiWorkoutDay, AiWorkoutExercise } from '@/lib/api';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';

const ACCENT = '#60A5FA';
const ACCENT_DIM = 'rgba(96,165,250,0.12)';
const ACCENT_GLOW = 'rgba(96,165,250,0.25)';

const GOALS = ['weight_loss', 'muscle_gain', 'strength', 'endurance', 'flexibility', 'general_fitness'];
const EXPERIENCE = ['beginner', 'intermediate', 'advanced'];
const EQUIPMENT = ['gym', 'home', 'minimal', 'bodyweight_only'];

const labelMap: Record<string, string> = {
  weight_loss: 'Weight Loss', muscle_gain: 'Muscle Gain', strength: 'Strength',
  endurance: 'Endurance', flexibility: 'Flexibility', general_fitness: 'General Fitness',
  beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced',
  gym: 'Full Gym', home: 'Home (with equipment)', minimal: 'Minimal Equipment', bodyweight_only: 'Bodyweight Only',
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 14,
  background: '#fff', border: '1px solid #d1d5db',
  color: '#111827', outline: 'none', boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: '#6b7280',
  letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6, display: 'block',
};

function ExerciseRow({ ex, index }: { ex: AiWorkoutExercise; index: number }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px',
      borderRadius: 10, background: '#F9FAFB', border: '1px solid #e5e7eb',
    }}>
      <span style={{
        width: 24, height: 24, borderRadius: '50%', flexShrink: 0, marginTop: 2,
        background: ACCENT_DIM, color: ACCENT, fontSize: 11, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{index + 1}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>{ex.name}</div>
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>
          {ex.sets} sets × {ex.reps} reps
          {ex.tempo ? ` · Tempo: ${ex.tempo}` : ''}
          {ex.rest_seconds ? ` · Rest: ${ex.rest_seconds}s` : ''}
        </div>
        {ex.notes && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, fontStyle: 'italic' }}>{ex.notes}</div>}
      </div>
    </div>
  );
}

function DayCard({ dayKey, day, index }: { dayKey: string; day: AiWorkoutDay; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div variants={fadeUp} initial="hidden" animate="show" custom={index} style={{
      borderRadius: 16, overflow: 'hidden',
      border: '1px solid #e5e7eb',
      background: '#fff',
    }}>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
      }}>
        <div>
          <span style={{ fontWeight: 700, color: '#111827', fontSize: 14, textTransform: 'capitalize' }}>{dayKey}</span>
          <span style={{ marginLeft: 10, fontSize: 13, color: '#6b7280' }}>— {day.focus}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: ACCENT, background: ACCENT_DIM, padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>
            {day.exercises?.length ?? 0} exercises
          </span>
          {open ? <ChevronUp size={16} color="#9ca3af" /> : <ChevronDown size={16} color="#9ca3af" />}
        </div>
      </button>
      {open && (
        <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {day.exercises?.map((ex, i) => <ExerciseRow key={i} ex={ex} index={i} />)}
        </div>
      )}
    </motion.div>
  );
}

export default function WorkoutGeneratorPage() {
  const [form, setForm] = useState({
    age: '', gender: 'male', weight_kg: '', height_cm: '',
    goal: 'general_fitness', experience_level: 'beginner',
    injuries: '', equipment: 'gym', training_days: '4',
  });
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<AiWorkoutPlan | null>(null);
  const [meta, setMeta] = useState<{ model?: string; tier?: string; used_fallback?: boolean } | null>(null);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleGenerate = async () => {
    if (!form.age || !form.weight_kg || !form.height_cm) { setError('Age, weight and height are required.'); return; }
    setError(''); setLoading(true); setPlan(null); setMeta(null);
    try {
      const res = await api.ai.generateWorkout({
        age: parseInt(form.age), gender: form.gender,
        weight_kg: parseFloat(form.weight_kg), height_cm: parseFloat(form.height_cm),
        goal: form.goal, experience_level: form.experience_level,
        injuries: form.injuries || undefined, equipment: form.equipment,
        training_days: parseInt(form.training_days),
      });
      setPlan(res.data);
      setMeta({ model: res.model, tier: res.tier, used_fallback: res.used_fallback });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to generate workout plan.');
    } finally { setLoading(false); }
  };

  const scheduleEntries = plan ? Object.entries(plan.weekly_schedule ?? {}) : [];

  return (
    <Guard>
      <AppShell title="AI Workout Generator">
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px 80px' }}>
          {/* Hero */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0} style={{ marginBottom: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 16, flexShrink: 0,
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Dumbbell size={24} color={ACCENT} />
              </div>
              <div>
                <h1 style={{
                  fontSize: 28, fontWeight: 800, margin: 0,
                  color: '#111827',
                }}>AI Workout Generator</h1>
                <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6b7280' }}>
                  Personalised training plan built around your biology, goals, and equipment
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['Progressive Overload', 'Warm-Up & Cool-Down', 'Injury-Aware', 'Nutrition Guidance', 'Tempo & Rest Times'].map((p) => (
                <span key={p} style={{
                  fontSize: 12, fontWeight: 500, padding: '5px 12px', borderRadius: 20,
                  background: ACCENT_DIM, color: ACCENT, border: '1px solid rgba(96,165,250,0.2)',
                }}>{p}</span>
              ))}
            </div>
          </motion.div>

          {/* Form */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={1} style={{
            borderRadius: 24, padding: '28px',
            background: '#fff', border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            marginBottom: 32,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: ACCENT_DIM, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Target size={16} color={ACCENT} />
              </div>
              <span style={{ fontWeight: 700, color: '#111827', fontSize: 15 }}>Your Profile</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div>
                <label style={labelStyle}>Age *</label>
                <input type="number" style={inputStyle} placeholder="e.g. 28" value={form.age} onChange={(e) => set('age', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Gender</label>
                <select style={inputStyle} value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                  <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Weight (kg) *</label>
                <input type="number" style={inputStyle} placeholder="e.g. 75" value={form.weight_kg} onChange={(e) => set('weight_kg', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Height (cm) *</label>
                <input type="number" style={inputStyle} placeholder="e.g. 175" value={form.height_cm} onChange={(e) => set('height_cm', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Fitness Goal</label>
                <select style={inputStyle} value={form.goal} onChange={(e) => set('goal', e.target.value)}>
                  {GOALS.map((g) => <option key={g} value={g}>{labelMap[g]}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Experience Level</label>
                <select style={inputStyle} value={form.experience_level} onChange={(e) => set('experience_level', e.target.value)}>
                  {EXPERIENCE.map((e) => <option key={e} value={e}>{labelMap[e]}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Available Equipment</label>
                <select style={inputStyle} value={form.equipment} onChange={(e) => set('equipment', e.target.value)}>
                  {EQUIPMENT.map((eq) => <option key={eq} value={eq}>{labelMap[eq]}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Training Days / Week</label>
                <select style={inputStyle} value={form.training_days} onChange={(e) => set('training_days', e.target.value)}>
                  {[2, 3, 4, 5, 6].map((d) => <option key={d} value={d}>{d} days</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Injuries / Limitations</label>
                <input type="text" style={inputStyle} placeholder="e.g. lower back pain, bad knees (optional)" value={form.injuries} onChange={(e) => set('injuries', e.target.value)} />
              </div>
            </div>

            {error && (
              <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171', fontSize: 13 }}>{error}</div>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button onClick={handleGenerate} disabled={loading} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px',
                borderRadius: 12, fontSize: 14, fontWeight: 700,
                background: loading ? 'rgba(96,165,250,0.4)' : `linear-gradient(135deg, ${ACCENT}, #3B82F6)`,
                color: '#050816', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : `0 4px 20px ${ACCENT_GLOW}`,
              }}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {loading ? 'Generating Plan…' : 'Generate Workout Plan'}
              </button>
              {plan && (
                <button onClick={() => { setPlan(null); setMeta(null); }} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px',
                  borderRadius: 12, fontSize: 14, fontWeight: 600,
                  background: 'transparent', border: '1px solid #e5e7eb',
                  color: '#6b7280', cursor: 'pointer',
                }}>
                  <RotateCcw size={14} /> Reset
                </button>
              )}
            </div>
          </motion.div>

          {/* Loading */}
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '60px 0',
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: 20, background: ACCENT_DIM,
                border: '1px solid rgba(96,165,250,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Loader2 size={28} color={ACCENT} className="animate-spin" />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Crafting your plan…</div>
                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>AI is designing your personalised training programme</div>
              </div>
            </motion.div>
          )}

          {/* Results */}
          {plan && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {meta && (
                <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                  borderRadius: 20, width: 'fit-content',
                  background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)',
                }}>
                  <Sparkles size={13} color="#D4AF37" />
                  <span style={{ fontSize: 12, color: '#D4AF37', fontWeight: 600 }}>Generated by {meta.model}</span>
                  {meta.used_fallback && <span style={{ fontSize: 11, color: 'rgba(255,200,0,0.6)', marginLeft: 4 }}>(fallback)</span>}
                </motion.div>
              )}

              {/* Plan overview */}
              <motion.div variants={fadeUp} initial="hidden" animate="show" custom={1} style={{
                borderRadius: 20, overflow: 'hidden',
                border: '1px solid #e5e7eb',
                background: '#fff',
              }}>
                <div style={{
                  padding: '20px 24px',
                  background: '#F9FAFB',
                  borderBottom: '1px solid #f3f4f6',
                }}>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: 0 }}>{plan.name}</h2>
                  <p style={{ fontSize: 13, color: '#6b7280', margin: '6px 0 0' }}>{plan.description}</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
                  {[
                    { icon: <Clock size={16} color={ACCENT} />, label: 'Duration', value: `${plan.weeks} weeks` },
                    { icon: <Flame size={16} color={ACCENT} />, label: 'Level', value: plan.level },
                    { icon: <Dumbbell size={16} color={ACCENT} />, label: 'Days/Week', value: String(plan.days_per_week) },
                  ].map((s, i) => (
                    <div key={i} style={{
                      padding: '16px 20px', textAlign: 'center',
                      borderRight: i < 2 ? '1px solid #f3f4f6' : 'none',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>{s.icon}</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#111827', textTransform: 'capitalize' }}>{s.value}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {plan.warm_up && (
                <motion.div variants={fadeUp} initial="hidden" animate="show" custom={2} style={{
                  borderRadius: 16, padding: '18px 20px',
                  background: '#EFF6FF', border: '1px solid #BFDBFE',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Warm-Up Protocol</div>
                  <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, margin: 0 }}>{plan.warm_up}</p>
                </motion.div>
              )}

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Weekly Schedule</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {scheduleEntries.map(([key, day], i) => (
                    <DayCard key={key} dayKey={key} day={day} index={i} />
                  ))}
                </div>
              </div>

              {plan.cool_down && (
                <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3} style={{
                  borderRadius: 16, padding: '18px 20px',
                  background: '#EFF6FF', border: '1px solid #BFDBFE',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Cool-Down Protocol</div>
                  <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, margin: 0 }}>{plan.cool_down}</p>
                </motion.div>
              )}

              {(plan.progression_notes || plan.nutrition_notes) && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                  {plan.progression_notes && (
                    <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4} style={{
                      borderRadius: 16, padding: '18px 20px',
                      background: '#fff', border: '1px solid #e5e7eb',
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Progression Notes</div>
                      <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, margin: 0 }}>{plan.progression_notes}</p>
                    </motion.div>
                  )}
                  {plan.nutrition_notes && (
                    <motion.div variants={fadeUp} initial="hidden" animate="show" custom={5} style={{
                      borderRadius: 16, padding: '18px 20px',
                      background: '#fff', border: '1px solid #e5e7eb',
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Nutrition Notes</div>
                      <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, margin: 0 }}>{plan.nutrition_notes}</p>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </AppShell>
    </Guard>
  );
}
