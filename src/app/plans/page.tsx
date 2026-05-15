'use client';
/**
 * Membership Plans Page — reads from and writes to the real API (/api/plans).
 * Falls back to DEFAULT_PLANS from lib/plans.ts if the API is empty.
 */
import { useState, useEffect, FormEvent } from 'react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { DEFAULT_PLANS, type StoredPlan, type PlanKind, DURATIONS, type PlanDuration } from '@/lib/plans';
import { Plus, Edit2, Trash2, Star, Zap, Package, X, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';

function fmtINR(n: number) {
  return '₹' + Number(n).toLocaleString('en-IN');
}

/* ─── Plan Card ─────────────────────────────────────────── */
function PlanCard({ plan, onEdit, onDelete }: {
  plan: StoredPlan; onEdit: (p: StoredPlan) => void; onDelete: (id: string) => void;
}) {
  const isPT = plan.kind === 'PT';
  const accent = isPT ? '#7c3aed' : 'var(--brand)';
  return (
    <div style={{
      borderRadius: 14, border: `1px solid ${plan.popular ? accent : 'var(--border)'}`,
      background: 'var(--bg-card)', padding: '22px 20px', display: 'flex',
      flexDirection: 'column', gap: 10, position: 'relative',
      boxShadow: plan.popular ? `0 4px 20px ${accent}22` : 'var(--shadow-sm)',
    }}>
      {plan.popular && (
        <span style={{
          position: 'absolute', top: -10, left: 16, background: accent, color: '#fff',
          fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 999,
        }}>★ Popular</span>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{plan.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {plan.kind} · {plan.duration}
            {plan.sessions_per_week ? ` · ${plan.sessions_per_week}×/week` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onEdit(plan)} title="Edit">
            <Edit2 size={13} />
          </button>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onDelete(plan.id)}
            style={{ color: 'var(--danger)' }} title="Delete">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 26, fontWeight: 800, color: accent }}>{fmtINR(plan.final_amount)}</span>
        {plan.discount > 0 && (
          <span style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'line-through' }}>
            {fmtINR(plan.base_amount)}
          </span>
        )}
        {plan.discount > 0 && (
          <span style={{ fontSize: 12, background: 'var(--success-bg)', color: 'var(--success)', borderRadius: 6, padding: '1px 7px', fontWeight: 700 }}>
            -{fmtINR(plan.discount)} off
          </span>
        )}
      </div>
      {plan.features.length > 0 && (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
          {plan.features.map((f, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--text-secondary)' }}>
              <CheckCircle size={12} color={accent} style={{ flexShrink: 0 }} /> {f}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ─── Plan Form ─────────────────────────────────────────── */
const BLANK = (kind: PlanKind): StoredPlan => ({
  id: '', kind, name: '', duration: 'Monthly',
  base_amount: 0, discount: 0, final_amount: 0, features: [], popular: false,
});

function PlanForm({ initial, onSave, onCancel }: {
  initial: StoredPlan; onSave: (p: StoredPlan) => void; onCancel: () => void;
}) {
  const [p, setP] = useState<StoredPlan>(initial);
  const [featuresText, setFeatures] = useState(initial.features.join('\n'));
  const [saving, setSaving] = useState(false);

  function field<K extends keyof StoredPlan>(k: K, v: StoredPlan[K]) {
    setP((prev) => ({ ...prev, [k]: v }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!p.name.trim()) return;
    setSaving(true);
    const payload: StoredPlan = {
      ...p,
      features: featuresText.split('\n').map((s) => s.trim()).filter(Boolean),
      final_amount: p.discount > 0 ? p.base_amount - p.discount : p.final_amount,
    };
    onSave(payload);
    setSaving(false);
  }

  const autoFinal = p.base_amount - p.discount;

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border)', padding: 24, boxShadow: 'var(--shadow-md)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
          {initial.id ? 'Edit Plan' : `New ${initial.kind} Plan`}
        </h3>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={onCancel}><X size={15} /></button>
      </div>
      <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Plan name *</span>
            <input className="input" value={p.name} onChange={(e) => field('name', e.target.value)}
              placeholder="e.g. Quarterly Membership" required />
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Duration</span>
            <select className="input" value={p.duration} onChange={(e) => field('duration', e.target.value as PlanDuration)}>
              {DURATIONS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Base price (₹)</span>
            <input className="input" type="number" min={0} value={p.base_amount}
              onChange={(e) => field('base_amount', parseFloat(e.target.value) || 0)} />
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Discount (₹)</span>
            <input className="input" type="number" min={0} value={p.discount}
              onChange={(e) => field('discount', parseFloat(e.target.value) || 0)} />
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Final price (₹) {p.discount > 0 && <span style={{ color: 'var(--success)' }}>= {fmtINR(autoFinal)}</span>}
            </span>
            <input className="input" type="number" min={0}
              value={p.discount > 0 ? autoFinal : p.final_amount}
              onChange={(e) => field('final_amount', parseFloat(e.target.value) || 0)}
              readOnly={p.discount > 0} />
          </label>
          {p.kind === 'PT' && (
            <label style={{ display: 'grid', gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sessions/week</span>
              <input className="input" type="number" min={1} max={7} value={p.sessions_per_week ?? ''}
                onChange={(e) => field('sessions_per_week', parseInt(e.target.value) || undefined)} />
            </label>
          )}
        </div>
        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Features (one per line)
          </span>
          <textarea className="input" rows={4} value={featuresText}
            onChange={(e) => setFeatures(e.target.value)}
            placeholder="Full gym access&#10;Locker facility&#10;Diet consultation" />
        </label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={!!p.popular} onChange={(e) => field('popular', e.target.checked)} />
            Mark as popular
          </label>
          <div style={{ flex: 1 }} />
          <button type="button" className="btn btn-outline btn-sm" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
            {saving ? 'Saving…' : 'Save Plan'}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────── */
export default function PlansPage() {
  return (
    <Guard role="admin">
      <PlansContent />
    </Guard>
  );
}

function PlansContent() {
  const [plans, setPlans]     = useState<StoredPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [tab, setTab]         = useState<'all' | 'Membership' | 'PT'>('all');
  const [editing, setEditing] = useState<StoredPlan | null>(null);
  const [creating, setCreating] = useState<'Membership' | 'PT' | null>(null);
  const [flash, setFlash]     = useState('');

  async function loadPlans() {
    setLoading(true); setError('');
    try {
      const data = await api.plans.list();
      if (Array.isArray(data) && data.length > 0) {
        // Normalize API shape to StoredPlan shape
        setPlans((data ?? []).map((p: any) => ({
          id: p.id,
          kind: (p.kind || 'Membership') as PlanKind,
          name: p.name,
          duration: p.duration || 'Monthly',
          base_amount: Number(p.base_amount || 0),
          discount: Number(p.discount || 0),
          final_amount: Number(p.final_amount || 0),
          sessions_per_week: p.sessions_per_week ?? undefined,
          features: Array.isArray(p.features) ? p.features : [],
          popular: Boolean(p.popular),
        })));
      } else {
        setPlans(DEFAULT_PLANS);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load plans');
      setPlans(DEFAULT_PLANS);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadPlans(); }, []);

  function showFlash(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(''), 3000);
  }

  async function handleSave(p: StoredPlan) {
    try {
      if (editing && p.id) {
        const res = await api.plans.update(p.id, {
          kind: p.kind, name: p.name, duration: p.duration,
          base_amount: p.base_amount, discount: p.discount,
          final_amount: p.discount > 0 ? p.base_amount - p.discount : p.final_amount,
          sessions_per_week: p.sessions_per_week, features: p.features, popular: p.popular,
        });
        setPlans((prev) => prev.map((x) => x.id === p.id ? { ...p, ...res.plan } : x));
        showFlash('Plan updated ✓');
      } else {
        const res = await api.plans.create({
          kind: p.kind, name: p.name, duration: p.duration,
          base_amount: p.base_amount, discount: p.discount,
          final_amount: p.discount > 0 ? p.base_amount - p.discount : p.final_amount,
          sessions_per_week: p.sessions_per_week, features: p.features, popular: p.popular,
        });
        setPlans((prev) => [...prev, { ...p, id: res.plan?.id || `plan-${Date.now()}` }]);
        showFlash('Plan created ✓');
      }
      setEditing(null); setCreating(null);
    } catch (e: any) {
      setError(e.message || 'Save failed');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this plan? This cannot be undone.')) return;
    try {
      await api.plans.delete(id);
      setPlans((prev) => prev.filter((p) => p.id !== id));
      showFlash('Plan deleted');
    } catch (e: any) {
      setError(e.message || 'Delete failed');
    }
  }

  const visible = tab === 'all' ? plans : plans.filter((p) => p.kind === tab);
  const membership = plans.filter((p) => p.kind === 'Membership');
  const pt = plans.filter((p) => p.kind === 'PT');

  return (
    <AppShell>
      <div className="page-container animate-fade-in">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Plans & Pricing</h1>
            <p className="page-subtitle">{plans.length} plans · {membership.length} Membership · {pt.length} PT</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline btn-sm" onClick={loadPlans} disabled={loading}>
              <RefreshCw size={14} /> Refresh
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => { setCreating('Membership'); setEditing(null); }}>
              <Package size={14} /> New Membership
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => { setCreating('PT'); setEditing(null); }}>
              <Zap size={14} /> New PT Plan
            </button>
          </div>
        </div>

        {/* Flash */}
        {flash && (
          <div style={{ background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--success-border)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontWeight: 600, fontSize: 13 }}>
            {flash}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="alert alert-danger" style={{ marginBottom: 16 }}>
            <AlertCircle size={14} /> {error}
            <button className="btn btn-ghost btn-sm" onClick={() => setError('')}>×</button>
          </div>
        )}

        {/* Create/Edit Form */}
        {(creating || editing) && (
          <div style={{ marginBottom: 24 }}>
            <PlanForm
              initial={editing ?? BLANK(creating!)}
              onSave={handleSave}
              onCancel={() => { setCreating(null); setEditing(null); }}
            />
          </div>
        )}

        {/* Tabs */}
        <div className="tab-bar" style={{ marginBottom: 20 }}>
          {(['all', 'Membership', 'PT'] as const).map((t) => (
            <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t === 'all' ? `All (${plans.length})` : t === 'Membership' ? `Membership (${membership.length})` : `PT (${pt.length})`}
            </button>
          ))}
        </div>

        {/* Plans Grid */}
        {loading ? (
          <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
            {[1,2,3,4].map((i) => (
              <div key={i} className="card" style={{ height: 200, background: 'var(--bg-subtle)' }}>
                <div className="skeleton" style={{ height: '100%', borderRadius: 14 }} />
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="empty-state">
            <Star size={36} className="empty-state-icon" />
            <p className="empty-state-title">No plans yet</p>
            <p className="empty-state-desc">Create your first membership or PT plan to get started.</p>
            <button className="btn btn-primary btn-sm" onClick={() => setCreating('Membership')}>
              <Plus size={14} /> Create Plan
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {visible.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onEdit={(p) => { setEditing(p); setCreating(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
