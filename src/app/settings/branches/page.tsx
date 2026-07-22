'use client';
import { useState, useEffect } from 'react';
import { m } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { MapPin, Plus, Edit3, Trash2, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';

interface Branch { id: string; name: string; location: string; status: string; member_count: number; }

export default function BranchesPage() {
  return <Guard role="admin"><BranchesContent /></Guard>;
}

function BranchesContent() {
  const { toast } = useToast();
  const [items, setItems] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', location: '' });

  async function load() {
    setLoading(true); setError(null);
    try {
      const data = await api.branches.list();
      setItems(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load branches');
    } finally { setLoading(false); }
  }

  async function addBranch(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      const created = await api.branches.create({ name: form.name.trim(), location: form.location.trim() });
      setItems(p => [...p, created as Branch]);
      setForm({ name: '', location: '' }); setShowForm(false);
      toast.success('Branch created');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create branch');
    }
  }

  async function deleteBranch(id: string) {
    try {
      await api.branches.delete(id);
      setItems(p => p.filter(b => b.id !== id));
      toast.success('Branch deleted');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete branch');
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <AppShell>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>
        <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ position: 'relative', overflow: 'hidden', borderRadius: 24, padding: '40px 44px', marginBottom: 28, background: 'linear-gradient(135deg, #faf5ff, #ede9fe)', boxShadow: 'var(--shadow-xs)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)', margin: '0 0 8px' }}>Branches</h1>
              <p style={{ maxWidth: 560, fontSize: 14, lineHeight: 1.6, color: 'var(--text-muted)' }}>Manage gym locations and branches.</p>
            </div>
            <button onClick={() => setShowForm(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, padding: '10px 20px', borderRadius: 12, background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(139,92,246,0.35)' }}>
              <Plus size={14} /> {showForm ? 'Cancel' : 'Add Branch'}
            </button>
          </div>
        </m.div>

        {error && (
          <div style={{ borderRadius: 14, padding: '14px 20px', marginBottom: 22, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626', fontWeight: 600, fontSize: 13 }}>
            {error}
          </div>
        )}

        {showForm && (
          <m.form initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} onSubmit={addBranch}
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, borderRadius: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', padding: 20, marginBottom: 22, alignItems: 'end', boxShadow: 'var(--shadow-xs)' }}>
            <div style={{ display: 'grid', gap: 5 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Branch Name *</span>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. MY PT STUDIO Gomti Nagar" required
                style={{ border: '1px solid #d1d5db', borderRadius: 10, padding: '9px 14px', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', background: 'var(--bg-card)', outline: 'none', fontFamily: 'inherit' }} />
            </div>
            <div style={{ display: 'grid', gap: 5 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Location</span>
              <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Lucknow, UP"
                style={{ border: '1px solid #d1d5db', borderRadius: 10, padding: '9px 14px', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', background: 'var(--bg-card)', outline: 'none', fontFamily: 'inherit' }} />
            </div>
            <button type="submit"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, padding: '9px 22px', borderRadius: 12, background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(139,92,246,0.35)' }}>
              <Plus size={13} /> Create
            </button>
          </m.form>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}><Loader2 size={32} color="rgba(0,0,0,0.2)" style={{ animation: 'spin 1s linear infinite' }} /></div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {items.map(b => (
              <m.div key={b.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                style={{ borderRadius: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16, transition: 'all 0.3s' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(109,40,217,0.1))', flexShrink: 0 }}>
                  <MapPin size={22} color="#a855f7" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 2 }}>{b.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{b.location || 'No location set'}</div>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{b.member_count ?? 0} members</span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: b.status === 'active' ? 'rgba(34,197,94,0.15)' : 'rgba(148,163,184,0.15)', color: b.status === 'active' ? '#059669' : '#6b7280', textTransform: 'capitalize' }}>{b.status || 'active'}</span>
                  <button onClick={() => deleteBranch(b.id)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, border: 'none', background: 'rgba(239,68,68,0.12)', color: '#f87171', cursor: 'pointer', flexShrink: 0 }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </m.div>
            ))}
            {items.length === 0 && (
              <div style={{ padding: '64px 20px', textAlign: 'center' }}>
                <MapPin size={40} color="rgba(0,0,0,0.12)" style={{ marginBottom: 14 }} />
                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-muted)', margin: 0 }}>No branches yet</p>
                <p style={{ fontSize: 12, color: 'var(--text-disabled)', marginTop: 4 }}>Click "Add Branch" to create your first location.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
