'use client';
import { useState, useEffect, FormEvent } from 'react';
import Guard from '@/components/Guard';
import Sidebar from '@/components/Sidebar';

export default function PlansPage() { return <Guard><PlansContent /></Guard>; }

type Duration = 'Monthly' | 'Quarterly' | 'Half Yearly' | 'Yearly';
type Plan = {
  id: string;
  kind: 'Membership' | 'PT';
  name: string;
  duration: Duration;
  base_amount: number;
  discount: number;
  final_amount: number;
  sessions_per_week?: number;
  features: string[];
  popular?: boolean;
};

const STORAGE_KEY = '619_plans_v1';

const DURATIONS: Duration[] = ['Monthly', 'Quarterly', 'Half Yearly', 'Yearly'];

// ── Default templates ─────────────────────────────────────────────
const DEFAULT_PLANS: Plan[] = [
  // Gym membership
  { id: 'm-monthly', kind: 'Membership', name: 'Monthly Membership',  duration: 'Monthly',     base_amount: 2500,  discount: 0,    final_amount: 2500,  features: ['Full gym access','Locker facility','Free trial class'] },
  { id: 'm-qrt',     kind: 'Membership', name: 'Quarterly Membership', duration: 'Quarterly',   base_amount: 7000,  discount: 500,  final_amount: 6500,  popular: true, features: ['Full gym access','Locker','1 Body composition test','Free diet consult'] },
  { id: 'm-half',    kind: 'Membership', name: 'Half-Yearly Membership', duration: 'Half Yearly', base_amount: 13000, discount: 1500, final_amount: 11500, features: ['Full gym access','Locker','Body composition test','Free diet consult','Group class access'] },
  { id: 'm-year',    kind: 'Membership', name: 'Annual Membership',  duration: 'Yearly',      base_amount: 24000, discount: 4000, final_amount: 20000, features: ['Full gym access','Personal locker','Quarterly body comp tests','Diet plan','All group classes','Friend bring-a-day pass'] },
  // PT plans
  { id: 'pt-monthly', kind: 'PT', name: 'PT Monthly',     duration: 'Monthly',     base_amount: 6000,  discount: 0,     final_amount: 6000,  sessions_per_week: 3, features: ['12 PT sessions / month','Personalized workout plan','Form & technique correction'] },
  { id: 'pt-qrt',     kind: 'PT', name: 'PT Quarterly',   duration: 'Quarterly',   base_amount: 16500, discount: 1500,  final_amount: 15000, sessions_per_week: 3, popular: true, features: ['36 PT sessions','Personalized plan','Diet consultation','Progress photos'] },
  { id: 'pt-half',    kind: 'PT', name: 'PT Half-Yearly', duration: 'Half Yearly', base_amount: 30000, discount: 4000,  final_amount: 26000, sessions_per_week: 3, features: ['72 PT sessions','Custom workout plan','Detailed diet plan','Body comp tests','Free supplements consult'] },
  { id: 'pt-year',    kind: 'PT', name: 'PT Annual',      duration: 'Yearly',      base_amount: 55000, discount: 10000, final_amount: 45000, sessions_per_week: 3, features: ['144+ PT sessions','Premium plan & diet','Quarterly body comp tests','Supplements consult','Priority slot booking'] },
];

function PlansContent() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [tab, setTab] = useState<'all' | 'Membership' | 'PT'>('all');
  const [editing, setEditing] = useState<Plan | null>(null);
  const [creating, setCreating] = useState<'Membership' | 'PT' | null>(null);
  const [success, setSuccess] = useState('');

  // Load plans from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setPlans(JSON.parse(raw));
      else { setPlans(DEFAULT_PLANS); localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PLANS)); }
    } catch { setPlans(DEFAULT_PLANS); }
  }, []);

  // Save whenever plans change
  useEffect(() => {
    if (plans.length > 0) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(plans)); } catch {}
    }
  }, [plans]);

  function flash(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  }

  function deletePlan(id: string) {
    if (!confirm('Delete this plan?')) return;
    setPlans(plans.filter(p => p.id !== id));
    flash('Plan deleted');
  }

  function resetDefaults() {
    if (!confirm('Reset all plans to default templates? This will overwrite your current plans.')) return;
    setPlans(DEFAULT_PLANS);
    flash('Plans reset to defaults');
  }

  function generatePtSet() {
    if (!confirm('Generate the full Personal Training plan set (Monthly, Quarterly, Half-Yearly, Yearly)? This adds 4 plans and replaces any existing PT plans.')) return;
    const ptPlans = DEFAULT_PLANS.filter(p => p.kind === 'PT');
    const others = plans.filter(p => p.kind !== 'PT');
    setPlans([...others, ...ptPlans]);
    flash('PT plans generated');
  }

  function generateMembershipSet() {
    if (!confirm('Generate the full Gym Membership plan set? This adds 4 plans and replaces existing Membership plans.')) return;
    const memPlans = DEFAULT_PLANS.filter(p => p.kind === 'Membership');
    const others = plans.filter(p => p.kind !== 'Membership');
    setPlans([...others, ...memPlans]);
    flash('Membership plans generated');
  }

  const visible = tab === 'all' ? plans : plans.filter(p => p.kind === tab);
  const totals = {
    membership: plans.filter(p => p.kind === 'Membership').length,
    pt: plans.filter(p => p.kind === 'PT').length,
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="page-main">
        <div className="topbar">
          <div>
            <div className="topbar-title">Membership Plans</div>
            <div className="topbar-sub">Configure pricing for gym & personal training</div>
          </div>
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-ghost btn-sm" onClick={resetDefaults}>↺ Reset Defaults</button>
            <button className="btn btn-primary btn-sm" onClick={() => setCreating('Membership')}>+ New Plan</button>
          </div>
        </div>

        <div className="page-content fade-up">
          {success && <div className="alert alert-success">✓ {success}</div>}

          {/* ── Quick generate cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'linear-gradient(135deg, var(--brand), var(--accent))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22,
                }}>🏋️</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>Generate Gym Plans</div>
                  <div className="text-muted text-sm">Monthly, Quarterly, Half-Yearly, Yearly</div>
                </div>
              </div>
              <div className="text-muted text-sm">{totals.membership} membership plan{totals.membership !== 1 ? 's' : ''} configured</div>
              <button className="btn btn-primary btn-sm w-full" onClick={generateMembershipSet}>⚡ Generate Membership Set</button>
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'linear-gradient(135deg, var(--purple), var(--brand))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22,
                }}>💪</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>Generate PT Plans</div>
                  <div className="text-muted text-sm">Personal Training packages</div>
                </div>
              </div>
              <div className="text-muted text-sm">{totals.pt} PT plan{totals.pt !== 1 ? 's' : ''} configured</div>
              <button className="btn btn-primary btn-sm w-full" onClick={generatePtSet}
                style={{ background: 'linear-gradient(135deg, var(--purple), var(--brand))' }}>
                ⚡ Generate PT Set
              </button>
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'linear-gradient(135deg, var(--lime), var(--success))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22,
                }}>✨</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>Custom Plan</div>
                  <div className="text-muted text-sm">Build a unique offer</div>
                </div>
              </div>
              <div className="text-muted text-sm">Custom plans with your pricing & perks</div>
              <button className="btn btn-ghost btn-sm w-full" onClick={() => setCreating('PT')}>+ Build Custom PT Plan</button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '.55rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            <button className={`tab-pill ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>
              All Plans ({plans.length})
            </button>
            <button className={`tab-pill ${tab === 'Membership' ? 'active' : ''}`} onClick={() => setTab('Membership')}>
              🏋️ Gym ({totals.membership})
            </button>
            <button className={`tab-pill ${tab === 'PT' ? 'active' : ''}`} onClick={() => setTab('PT')}>
              💪 Personal Training ({totals.pt})
            </button>
          </div>

          {/* Plan grid */}
          {visible.length === 0 ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
              <div style={{ color: 'var(--muted)', marginBottom: 16 }}>No plans yet — start by generating a default set</div>
              <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={generateMembershipSet}>Generate Gym Plans</button>
                <button className="btn btn-ghost" onClick={generatePtSet}>Generate PT Plans</button>
              </div>
            </div>
          ) : (
            <div className="plan-grid">
              {visible.map(p => (
                <div key={p.id} className={`plan-card ${p.popular ? 'popular' : ''} ${p.kind === 'PT' ? 'pt' : ''}`}>
                  {p.popular && <span className="plan-tag popular">⭐ Popular</span>}
                  {!p.popular && p.kind === 'PT' && <span className="plan-tag pt">PT</span>}
                  <div className="plan-name">{p.duration}</div>
                  <div style={{ fontSize: 17, fontWeight: 700, marginBottom: '.25rem' }}>{p.name}</div>
                  <div className="plan-price">₹{p.final_amount.toLocaleString('en-IN')}</div>
                  <div className="plan-price-sub">
                    {p.discount > 0 && (
                      <span style={{ textDecoration: 'line-through', marginRight: 8, color: 'var(--muted2)' }}>
                        ₹{p.base_amount.toLocaleString('en-IN')}
                      </span>
                    )}
                    {p.discount > 0 && <span style={{ color: 'var(--success)', fontWeight: 700 }}>save ₹{p.discount.toLocaleString('en-IN')}</span>}
                    {p.discount === 0 && <span>per {p.duration.toLowerCase()}</span>}
                  </div>
                  {p.kind === 'PT' && p.sessions_per_week && (
                    <div style={{
                      display: 'inline-block', padding: '4px 10px',
                      borderRadius: 999, fontSize: 11, fontWeight: 700,
                      background: 'var(--purple-soft)', color: 'var(--purple)',
                      marginBottom: '.75rem',
                    }}>
                      {p.sessions_per_week}× sessions / week
                    </div>
                  )}
                  <ul className="plan-features">
                    {p.features.slice(0, 5).map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                  <div style={{ display: 'flex', gap: '.5rem', marginTop: '1rem' }}>
                    <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => setEditing(p)}>✏️ Edit</button>
                    <button className="btn btn-danger btn-icon btn-sm" onClick={() => deletePlan(p.id)} aria-label="Delete">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit / create modal */}
      {(editing || creating) && (
        <PlanModal
          initial={editing || {
            id: 'p-' + Date.now(),
            kind: creating || 'Membership',
            name: '',
            duration: 'Monthly',
            base_amount: 0, discount: 0, final_amount: 0,
            sessions_per_week: creating === 'PT' ? 3 : undefined,
            features: [],
          }}
          onClose={() => { setEditing(null); setCreating(null); }}
          onSave={p => {
            if (editing) {
              setPlans(plans.map(x => x.id === p.id ? p : x));
              flash('Plan updated');
            } else {
              setPlans([...plans, p]);
              flash('Plan created');
            }
            setEditing(null); setCreating(null);
          }}
        />
      )}
    </div>
  );
}

function PlanModal({ initial, onClose, onSave }: { initial: Plan; onClose: () => void; onSave: (p: Plan) => void }) {
  const [p, setP] = useState<Plan>(initial);
  const [featuresText, setFeaturesText] = useState(initial.features.join('\n'));

  function set<K extends keyof Plan>(k: K, v: Plan[K]) { setP(prev => ({ ...prev, [k]: v })); }

  function recalc(base: number, disc: number) {
    setP(prev => ({ ...prev, base_amount: base, discount: disc, final_amount: Math.max(0, base - disc) }));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!p.name.trim()) { alert('Plan name is required'); return; }
    if (p.final_amount <= 0)  { alert('Final amount must be greater than 0'); return; }
    const features = featuresText.split('\n').map(s => s.trim()).filter(Boolean);
    onSave({ ...p, features });
  }

  return (
    <div className="modal" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="card" onSubmit={submit} style={{ maxWidth: 580 }}>
        <div className="card-title" style={{ marginBottom: '1.25rem' }}>
          {initial.id.startsWith('p-') && !initial.name ? 'Create Plan' : 'Edit Plan'}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
          <div className="form-row form-row-2">
            <div>
              <label>Plan Type</label>
              <select className="input select" value={p.kind} onChange={e => set('kind', e.target.value as Plan['kind'])}>
                <option value="Membership">🏋️ Gym Membership</option>
                <option value="PT">💪 Personal Training</option>
              </select>
            </div>
            <div>
              <label>Duration</label>
              <select className="input select" value={p.duration} onChange={e => set('duration', e.target.value as Duration)}>
                {DURATIONS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label>Plan Name *</label>
            <input className="input" required value={p.name} onChange={e => set('name', e.target.value)} placeholder="e.g. PT Quarterly Premium" />
          </div>

          {p.kind === 'PT' && (
            <div>
              <label>Sessions per Week</label>
              <input className="input" type="number" min={1} max={7} value={p.sessions_per_week || 3}
                onChange={e => set('sessions_per_week', parseInt(e.target.value) || 3)} />
            </div>
          )}

          <div className="form-row form-row-3">
            <div>
              <label>Base Amount (₹)</label>
              <input className="input" type="number" min={0} value={p.base_amount}
                onChange={e => recalc(parseFloat(e.target.value) || 0, p.discount)} />
            </div>
            <div>
              <label>Discount (₹)</label>
              <input className="input" type="number" min={0} value={p.discount}
                onChange={e => recalc(p.base_amount, parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label>Final Amount (₹) *</label>
              <input className="input" type="number" min={1} value={p.final_amount} readOnly
                style={{ borderColor: 'var(--brand)', fontWeight: 700, background: 'var(--brand-soft)' }} />
            </div>
          </div>

          <div>
            <label>Features (one per line)</label>
            <textarea className="input" rows={5} value={featuresText} onChange={e => setFeaturesText(e.target.value)}
              placeholder={'Full gym access\nLocker facility\nFree diet consult'} />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', cursor: 'pointer', textTransform: 'none', letterSpacing: 0, fontWeight: 500, color: 'var(--text2)' }}>
            <input type="checkbox" checked={!!p.popular} onChange={e => set('popular', e.target.checked)}
              style={{ width: 16, height: 16, accentColor: 'var(--brand)' }} />
            Mark as Most Popular
          </label>
        </div>

        <div style={{ display: 'flex', gap: '.6rem', marginTop: '1.5rem' }}>
          <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>💾 Save Plan</button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
