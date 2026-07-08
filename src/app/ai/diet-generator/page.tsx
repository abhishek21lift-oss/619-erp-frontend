'use client';

import { useState } from 'react';
import { Apple, Loader2, ChevronDown, ChevronUp, Sparkles, RotateCcw, Droplets, ShoppingCart, Pill, Utensils } from 'lucide-react';
import { m, type Variants } from 'framer-motion';
import { api } from '@/lib/api';
import type { AiDietPlan, AiDietMeal } from '@/lib/api';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';

const ACCENT = '#4ADE80';
const ACCENT_DIM = 'rgba(74,222,128,0.12)';
const ACCENT_GLOW = 'rgba(74,222,128,0.25)';

const ACTIVITY_LEVELS = ['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active'];
const GOALS = ['weight_loss', 'muscle_gain', 'maintenance', 'recomposition'];
const BUDGETS = ['budget', 'moderate', 'premium'];

const labelMap: Record<string, string> = {
  sedentary: 'Sedentary (desk job)', lightly_active: 'Lightly Active', moderately_active: 'Moderately Active',
  very_active: 'Very Active', extra_active: 'Extra Active (athlete)',
  weight_loss: 'Weight Loss', muscle_gain: 'Muscle Gain', maintenance: 'Maintenance', recomposition: 'Body Recomposition',
  budget: 'Budget Friendly', moderate: 'Moderate', premium: 'Premium / Flexible',
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

function MealCard({ meal, index }: { meal: AiDietMeal; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <m.div variants={fadeUp} initial="hidden" animate="show" custom={index} style={{
      borderRadius: 16, overflow: 'hidden',
      border: '1px solid #e5e7eb',
      background: '#fff',
    }}>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
      }}>
        <div>
          <span style={{ fontWeight: 700, color: '#111827', fontSize: 14 }}>{meal.name}</span>
          <span style={{ marginLeft: 10, fontSize: 12, color: '#9ca3af' }}>{meal.time}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: ACCENT, background: ACCENT_DIM, padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>
            {meal.calories} kcal
          </span>
          {open ? <ChevronUp size={16} color="#9ca3af" /> : <ChevronDown size={16} color="#9ca3af" />}
        </div>
      </button>
      {open && (
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{ display: 'flex', gap: 0, marginBottom: 12, borderRadius: 10, background: ACCENT_DIM, overflow: 'hidden' }}>
            {[{ label: 'Protein', value: `${meal.protein_g}g` }, { label: 'Carbs', value: `${meal.carbs_g}g` }, { label: 'Fat', value: `${meal.fat_g}g` }].map((m, i) => (
              <div key={m.label} style={{ flex: 1, textAlign: 'center', padding: '10px 8px', borderRight: i < 2 ? '1px solid rgba(74,222,128,0.15)' : 'none' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: ACCENT }}>{m.value}</div>
                <div style={{ fontSize: 10, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {meal.foods?.map((food, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 4px',
                borderBottom: i < (meal.foods?.length ?? 0) - 1 ? '1px solid #f3f4f6' : 'none',
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{food.name}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{food.quantity}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{food.calories} kcal</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>P:{food.protein_g}g C:{food.carbs_g}g F:{food.fat_g}g</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </m.div>
  );
}

export default function DietGeneratorPage() {
  const [form, setForm] = useState({
    age: '', gender: 'male', weight_kg: '', height_cm: '',
    activity_level: 'moderately_active', goal: 'maintenance',
    dietary_preferences: '', allergies: '', budget: 'moderate', meal_frequency: '4',
  });
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<AiDietPlan | null>(null);
  const [meta, setMeta] = useState<{ model?: string; tier?: string; used_fallback?: boolean } | null>(null);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleGenerate = async () => {
    if (!form.age || !form.weight_kg || !form.height_cm) { setError('Age, weight and height are required.'); return; }
    setError(''); setLoading(true); setPlan(null); setMeta(null);
    try {
      const res = await api.ai.generateDiet({
        age: parseInt(form.age), gender: form.gender,
        weight_kg: parseFloat(form.weight_kg), height_cm: parseFloat(form.height_cm),
        activity_level: form.activity_level, goal: form.goal,
        dietary_preferences: form.dietary_preferences || undefined,
        allergies: form.allergies || undefined,
        budget: form.budget, meal_frequency: parseInt(form.meal_frequency),
      });
      setPlan(res.data);
      setMeta({ model: res.model, tier: res.tier, used_fallback: res.used_fallback });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to generate diet plan.');
    } finally { setLoading(false); }
  };

  return (
    <Guard>
      <AppShell title="AI Diet Generator">
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px 80px' }}>
          {/* Hero */}
          <m.div variants={fadeUp} initial="hidden" animate="show" custom={0} style={{ marginBottom: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 16, flexShrink: 0,
                background: '#F0FDF4',
                border: '1px solid #BBF7D0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Apple size={24} color={ACCENT} />
              </div>
              <div>
                <h1 style={{
                  fontSize: 28, fontWeight: 800, margin: 0,
                  color: '#111827',
                }}>AI Diet Generator</h1>
                <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6b7280' }}>
                  Precision nutrition tailored to your metabolism, goals, and lifestyle
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['Calorie Calibrated', 'Macro Balanced', 'Allergen-Safe', 'Grocery List Included', 'Supplement Guide'].map((p) => (
                <span key={p} style={{
                  fontSize: 12, fontWeight: 500, padding: '5px 12px', borderRadius: 20,
                  background: ACCENT_DIM, color: ACCENT, border: '1px solid rgba(74,222,128,0.2)',
                }}>{p}</span>
              ))}
            </div>
          </m.div>

          {/* Form */}
          <m.div variants={fadeUp} initial="hidden" animate="show" custom={1} style={{
            borderRadius: 24, padding: '28px',
            background: '#fff', border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            marginBottom: 32,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: ACCENT_DIM, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Utensils size={16} color={ACCENT} />
              </div>
              <span style={{ fontWeight: 700, color: '#111827', fontSize: 15 }}>Your Profile & Preferences</span>
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
                <label style={labelStyle}>Activity Level</label>
                <select style={inputStyle} value={form.activity_level} onChange={(e) => set('activity_level', e.target.value)}>
                  {ACTIVITY_LEVELS.map((a) => <option key={a} value={a}>{labelMap[a]}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Goal</label>
                <select style={inputStyle} value={form.goal} onChange={(e) => set('goal', e.target.value)}>
                  {GOALS.map((g) => <option key={g} value={g}>{labelMap[g]}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Meals per Day</label>
                <select style={inputStyle} value={form.meal_frequency} onChange={(e) => set('meal_frequency', e.target.value)}>
                  {[3, 4, 5, 6].map((d) => <option key={d} value={d}>{d} meals</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Budget</label>
                <select style={inputStyle} value={form.budget} onChange={(e) => set('budget', e.target.value)}>
                  {BUDGETS.map((b) => <option key={b} value={b}>{labelMap[b]}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Dietary Preferences</label>
                <input type="text" style={inputStyle} placeholder="e.g. vegetarian, vegan, keto, Indian (optional)" value={form.dietary_preferences} onChange={(e) => set('dietary_preferences', e.target.value)} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Allergies / Foods to Avoid</label>
                <input type="text" style={inputStyle} placeholder="e.g. nuts, dairy, gluten (optional)" value={form.allergies} onChange={(e) => set('allergies', e.target.value)} />
              </div>
            </div>

            {error && (
              <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171', fontSize: 13 }}>{error}</div>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button onClick={handleGenerate} disabled={loading} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px',
                borderRadius: 12, fontSize: 14, fontWeight: 700,
                background: loading ? 'rgba(74,222,128,0.4)' : `linear-gradient(135deg, ${ACCENT}, #22C55E)`,
                color: '#050816', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : `0 4px 20px ${ACCENT_GLOW}`,
              }}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {loading ? 'Generating Plan…' : 'Generate Meal Plan'}
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
          </m.div>

          {/* Loading */}
          {loading && (
            <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '60px 0',
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: 20, background: ACCENT_DIM,
                border: '1px solid rgba(74,222,128,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Loader2 size={28} color={ACCENT} className="animate-spin" />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Building your nutrition plan…</div>
                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Calibrating macros and crafting your personalised meal schedule</div>
              </div>
            </m.div>
          )}

          {/* Results */}
          {plan && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {meta && (
                <m.div variants={fadeUp} initial="hidden" animate="show" custom={0} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                  borderRadius: 20, width: 'fit-content',
                  background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)',
                }}>
                  <Sparkles size={13} color="#D4AF37" />
                  <span style={{ fontSize: 12, color: '#D4AF37', fontWeight: 600 }}>Generated by {meta.model}</span>
                  {meta.used_fallback && <span style={{ fontSize: 11, color: 'rgba(255,200,0,0.6)', marginLeft: 4 }}>(fallback)</span>}
                </m.div>
              )}

              {/* Overview */}
              <m.div variants={fadeUp} initial="hidden" animate="show" custom={1} style={{
                borderRadius: 20, overflow: 'hidden',
                border: '1px solid #e5e7eb',
                background: '#fff',
              }}>
                <div style={{
                  padding: '20px 24px',
                  background: '#F0FDF4',
                  borderBottom: '1px solid #f3f4f6',
                }}>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: 0 }}>{plan.name}</h2>
                  <p style={{ fontSize: 13, color: '#6b7280', margin: '6px 0 0' }}>{plan.description}</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
                  {[
                    { label: 'Daily Calories', value: String(plan.total_calories), unit: 'kcal' },
                    { label: 'Protein', value: String(plan.macros?.protein_g ?? '—'), unit: 'g' },
                    { label: 'Carbs', value: String(plan.macros?.carbs_g ?? '—'), unit: 'g' },
                    { label: 'Fat', value: String(plan.macros?.fat_g ?? '—'), unit: 'g' },
                  ].map((s, i) => (
                    <div key={i} style={{
                      padding: '16px 12px', textAlign: 'center',
                      borderRight: i < 3 ? '1px solid #f3f4f6' : 'none',
                    }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: ACCENT }}>{s.value}</div>
                      <div style={{ fontSize: 10, color: '#15803d', fontWeight: 600 }}>{s.unit}</div>
                      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </m.div>

              {/* Meals */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Daily Meal Plan</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {plan.meals?.map((meal, i) => <MealCard key={i} meal={meal} index={i} />)}
                </div>
              </div>

              {/* Hydration */}
              {plan.hydration_ml ? (
                <m.div variants={fadeUp} initial="hidden" animate="show" custom={2} style={{
                  borderRadius: 16, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14,
                  background: '#EFF6FF', border: '1px solid #BFDBFE',
                }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Droplets size={20} color="#60A5FA" />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#60A5FA', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Daily Hydration Target</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#111827' }}>{plan.hydration_ml} <span style={{ fontSize: 12, color: '#9ca3af' }}>ml / day</span></div>
                  </div>
                </m.div>
              ) : null}

              {/* Supplements */}
              {plan.supplements?.length ? (
                <m.div variants={fadeUp} initial="hidden" animate="show" custom={3} style={{
                  borderRadius: 20, overflow: 'hidden',
                  border: '1px solid #e5e7eb',
                  background: '#fff',
                }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Pill size={16} color={ACCENT} />
                    <span style={{ fontWeight: 700, color: '#111827', fontSize: 14 }}>Supplement Guide</span>
                  </div>
                  {plan.supplements.map((s, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '12px 20px',
                      borderBottom: i < plan.supplements!.length - 1 ? '1px solid #f3f4f6' : 'none',
                    }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{s.name}</div>
                        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{s.dose} · {s.timing}</div>
                      </div>
                      <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'right', maxWidth: 160 }}>{s.reason}</div>
                    </div>
                  ))}
                </m.div>
              ) : null}

              {/* Grocery list */}
              {plan.grocery_list?.length ? (
                <m.div variants={fadeUp} initial="hidden" animate="show" custom={4} style={{
                  borderRadius: 20, overflow: 'hidden',
                  border: '1px solid #e5e7eb',
                  background: '#fff',
                }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <ShoppingCart size={16} color={ACCENT} />
                    <span style={{ fontWeight: 700, color: '#111827', fontSize: 14 }}>Grocery List</span>
                  </div>
                  <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {plan.grocery_list.map((cat, i) => (
                      <div key={i}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{cat.category}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {cat.items.map((item) => (
                            <span key={item} style={{
                              fontSize: 12, padding: '4px 12px', borderRadius: 20,
                              background: ACCENT_DIM, color: ACCENT, border: '1px solid rgba(74,222,128,0.2)', fontWeight: 500,
                            }}>{item}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </m.div>
              ) : null}

              {plan.notes && (
                <m.div variants={fadeUp} initial="hidden" animate="show" custom={5} style={{
                  borderRadius: 16, padding: '18px 20px',
                  background: '#fff', border: '1px solid #e5e7eb',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Notes</div>
                  <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, margin: 0 }}>{plan.notes}</p>
                </m.div>
              )}
            </div>
          )}
        </div>
      </AppShell>
    </Guard>
  );
}
