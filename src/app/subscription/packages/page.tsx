'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Plus, Pencil, Trash2, X, Check, Search } from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';

interface PtPackage {
  id: string;
  name: string;
  session_count: number;
  duration_days: number;
  price: number;
  goal_type: string | null;
  description: string | null;
  is_active: boolean;
}

const GOAL_TYPES = [
  { value: 'fat_loss',        label: 'Fat Loss' },
  { value: 'muscle_gain',     label: 'Muscle Gain' },
  { value: 'strength',        label: 'Strength' },
  { value: 'powerlifting',    label: 'Powerlifting' },
  { value: 'endurance',       label: 'Endurance' },
  { value: 'general_fitness', label: 'General Fitness' },
  { value: 'recovery',        label: 'Recovery' },
];

const a = '#F59E0B', b = '#D97706';
const grad = `linear-gradient(135deg,${a},${b})`;
const inp = { width: '100%', padding: '11px 14px', borderRadius: 10, border: `1px solid ${a}33`, background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 13, outline: 'none' } as const;
const lab = { display: 'block', fontSize: 11, fontWeight: 600, color: a, marginBottom: 5, letterSpacing: '0.05em' } as const;
const btnPrim = { padding: '10px 20px', borderRadius: 12, border: 'none', background: grad, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: `0 4px 20px ${a}55` } as const;

const fmtINR = (n: number | string | null | undefined) =>
  '₹' + Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const goalLabel = (g: string | null) =>
  GOAL_TYPES.find(t => t.value === g)?.label ?? g ?? '—';

export default function PackagesPage() {
  return (
    <Guard role="admin">
      <AppShell>
        <PackagesContent />
      </AppShell>
    </Guard>
  );
}

function PackagesContent() {
  const { toast } = useToast();
  const [packages, setPackages] = useState<PtPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PtPackage | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', session_count: '', duration_days: '', price: '', goal_type: '', description: '' });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const res = await api.automation.ptPackages.list() as { data: PtPackage[] };
      setPackages(res.data ?? []);
    } catch { setPackages([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPackages(); }, []);

  const filtered = packages.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', session_count: '', duration_days: '', price: '', goal_type: '', description: '' });
    setShowForm(true);
  };

  const openEdit = (pkg: PtPackage) => {
    setEditing(pkg);
    setForm({
      name: pkg.name,
      session_count: String(pkg.session_count),
      duration_days: String(pkg.duration_days),
      price: String(pkg.price),
      goal_type: pkg.goal_type ?? '',
      description: pkg.description ?? '',
    });
    setShowForm(true);
  };

  const toggleStatus = async (pkg: PtPackage) => {
    try {
      await api.automation.ptPackages.update(pkg.id, { is_active: !pkg.is_active });
      setPackages(p => p.map(x => x.id === pkg.id ? { ...x, is_active: !x.is_active } : x));
      toast.success(`Package ${pkg.is_active ? 'deactivated' : 'activated'}`);
    } catch { toast.error('Failed to toggle status'); }
  };

  const handleSave = async () => {
    if (!form.name || !form.session_count || !form.duration_days || !form.price) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        session_count: parseInt(form.session_count),
        duration_days: parseInt(form.duration_days),
        price: parseFloat(form.price),
        goal_type: form.goal_type || null,
        description: form.description || null,
      };
      if (editing) {
        await api.automation.ptPackages.update(editing.id, payload);
      } else {
        await api.automation.ptPackages.create(payload);
      }
      setShowForm(false);
      setEditing(null);
      await fetchPackages();
      toast.success(editing ? 'Package updated' : 'Package created');
    } catch { toast.error('Failed to save package'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.automation.ptPackages.delete(id);
      setPackages(p => p.filter(x => x.id !== id));
      setDeleteId(null);
      toast.success('Package deleted');
    } catch { toast.error('Failed to delete package'); setDeleteId(null); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0a0f1a,#451a03,#0a0f1a)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(circle,rgba(245,158,11,0.15),transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(circle,rgba(217,119,6,0.12),transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px', position: 'relative' }}>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: grad, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 32px ${a}44` }}>
            <Package size={24} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', margin: 0 }}>PT Packages</h1>
            <p style={{ fontSize: 13, color: '#a67c52', margin: '2px 0 0' }}>Session-based PT packages with goal types</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 320 }}>
            <Search size={14} color="#a67c52" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search packages..."
              style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 12, border: `1px solid ${a}33`, background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 13, outline: 'none', backdropFilter: 'blur(8px)' }} />
          </div>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={openCreate} style={{ ...btnPrim }}>
            <Plus size={15} /> Create Package
          </motion.button>
        </motion.div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#a67c52', fontSize: 14 }}>Loading packages...</div>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: 'center', padding: '60px 24px', borderRadius: 20, background: 'rgba(255,255,255,0.04)', border: `1px solid ${a}22` }}>
            <Package size={48} color={a} style={{ margin: '0 auto 12px', display: 'block' }} />
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#fff', margin: 0 }}>No Packages Yet</h3>
            <p style={{ fontSize: 13, color: '#a67c52', margin: '6px 0 20px' }}>Create your first PT package to get started.</p>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={openCreate} style={{ ...btnPrim, display: 'inline-flex' }}>
              <Plus size={15} /> Create Package
            </motion.button>
          </motion.div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {filtered.map((pkg, i) => (
              <motion.div key={pkg.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                whileHover={{ y: -4, boxShadow: `0 16px 48px ${a}22` }}
                style={{ borderRadius: 18, background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(16px)', borderLeft: `3px solid ${a}`, borderTop: '1px solid rgba(255,255,255,0.08)', borderRight: '1px solid rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: 20, position: 'relative' }}>
                <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 4 }}>
                  <button onClick={() => openEdit(pkg)}
                    style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: a }}>
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => setDeleteId(pkg.id)}
                    style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: '0 0 4px', paddingRight: 76 }}>{pkg.name}</h3>
                {pkg.goal_type && (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: `${a}20`, color: a, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {goalLabel(pkg.goal_type)}
                  </span>
                )}
                {pkg.description && <p style={{ fontSize: 12, color: '#a67c52', margin: '8px 0 0', lineHeight: 1.4 }}>{pkg.description}</p>}
                <div style={{ fontSize: 28, fontWeight: 800, color: a, letterSpacing: '-0.03em', margin: '10px 0 2px' }}>{fmtINR(pkg.price)}</div>
                <div style={{ fontSize: 12, color: '#a67c52', marginBottom: 14 }}>
                  {pkg.session_count} sessions · {pkg.duration_days} days
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button onClick={() => toggleStatus(pkg)}
                    style={{ width: 40, height: 22, borderRadius: 11, border: 'none', background: pkg.is_active ? '#22c55e' : 'rgba(255,255,255,0.15)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', padding: 0 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: pkg.is_active ? 20 : 2, transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
                  </button>
                  <span style={{ fontSize: 11, fontWeight: 600, color: pkg.is_active ? '#22c55e' : '#a67c52' }}>{pkg.is_active ? 'Active' : 'Inactive'}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', padding: 16 }}
              onClick={() => setShowForm(false)}>
              <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
                style={{ width: '100%', maxWidth: 520, borderRadius: 22, background: '#151515', border: `1px solid ${a}33`, padding: 28, boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}
                onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>{editing ? 'Edit Package' : 'Create Package'}</h3>
                  <button onClick={() => setShowForm(false)}
                    style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a67c52' }}>
                    <X size={15} />
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={lab}>PACKAGE NAME *</label>
                    <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Fat Loss Starter" style={inp} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={lab}>SESSIONS *</label>
                      <input type="number" min={1} value={form.session_count} onChange={e => setForm(p => ({ ...p, session_count: e.target.value }))} placeholder="e.g. 12" style={inp} />
                    </div>
                    <div>
                      <label style={lab}>DURATION (DAYS) *</label>
                      <input type="number" min={1} value={form.duration_days} onChange={e => setForm(p => ({ ...p, duration_days: e.target.value }))} placeholder="e.g. 30" style={inp} />
                    </div>
                    <div>
                      <label style={lab}>PRICE (₹) *</label>
                      <input type="number" min={0} value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} placeholder="e.g. 8000" style={inp} />
                    </div>
                  </div>
                  <div>
                    <label style={lab}>GOAL TYPE</label>
                    <select value={form.goal_type} onChange={e => setForm(p => ({ ...p, goal_type: e.target.value }))}
                      style={{ ...inp, appearance: 'none' as const }}>
                      <option value="">— Select goal type —</option>
                      {GOAL_TYPES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lab}>DESCRIPTION</label>
                    <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional description" rows={3}
                      style={{ ...inp, resize: 'vertical' as const }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
                  <button onClick={() => setShowForm(false)}
                    style={{ padding: '10px 18px', borderRadius: 10, border: `1px solid ${a}33`, background: 'transparent', color: '#a67c52', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={handleSave}
                    disabled={saving || !form.name || !form.session_count || !form.duration_days || !form.price}
                    style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: grad, color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, opacity: saving ? 0.6 : 1, boxShadow: `0 4px 16px ${a}44` }}>
                    {saving ? (
                      <svg style={{ width: 15, height: 15, animation: 'spin 0.8s linear infinite' }} viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
                        <path d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" fill="currentColor" opacity="0.75" />
                      </svg>
                    ) : <Check size={15} />}
                    {editing ? 'Update' : 'Create'}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {deleteId && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
              onClick={() => setDeleteId(null)}>
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '32px 36px', maxWidth: 380, width: '90%', textAlign: 'center' }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <Trash2 size={22} color="#f87171" />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>Delete Package?</h3>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: '0 0 24px' }}>This action cannot be undone.</p>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={() => setDeleteId(null)}
                    style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button onClick={() => handleDelete(deleteId)}
                    style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    Delete
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
