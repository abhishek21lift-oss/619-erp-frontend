'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { WorkflowLayout, WorkflowHero, SummaryRail, StickyActionBar, SectionHeading, GlassCard } from '@/components/workflow';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { Snowflake, Sun } from 'lucide-react';

export default function FreezePage() { return <Guard><Inner /></Guard>; }

function Inner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ from: '', until: '', reason: '' });

  useEffect(() => {
    api.clients.get(id)
      .then((c: any) => {
        setClient(c);
        if (c.freeze_from) setForm(f => ({ ...f, from: c.freeze_from?.slice(0, 10) || '' }));
        if (c.freeze_until) setForm(f => ({ ...f, until: c.freeze_until?.slice(0, 10) || '' }));
        if (c.freeze_reason) setForm(f => ({ ...f, reason: c.freeze_reason || '' }));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const isFrozen = client?.is_frozen || client?.status === 'frozen';

  const days = form.from && form.until
    ? Math.round((new Date(form.until).getTime() - new Date(form.from).getTime()) / 86400000)
    : 0;

  async function handleFreeze(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!form.from || !form.until) { setError('From and Until dates are required'); return; }
    if (new Date(form.until) <= new Date(form.from)) { setError('Until date must be after From date'); return; }
    setSaving(true);
    try {
      await api.clients.freeze(id, { freeze_from: form.from, freeze_until: form.until, reason: form.reason || null });
      const m = 'Membership frozen successfully!'; setSuccess(m); toast.success(m);
      setTimeout(() => router.push(`/clients/${id}`), 1400);
    } catch (e: any) { const m = e.message || 'Failed to freeze'; setError(m); toast.error(m); }
    finally { setSaving(false); }
  }

  async function handleUnfreeze() {
    if (!confirm('Unfreeze this membership and restore active status?')) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      await api.clients.unfreeze(id);
      const m = 'Membership unfrozen successfully!'; setSuccess(m); toast.success(m);
      setTimeout(() => router.push(`/clients/${id}`), 1400);
    } catch (e: any) { const m = e.message || 'Failed to unfreeze'; setError(m); toast.error(m); }
    finally { setSaving(false); }
  }

  if (loading) return <AppShell><div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>Loading…</div></AppShell>;

  const summaryItems = [
    { label: 'Status', value: isFrozen ? '❄️ Frozen' : '✅ Active' },
    { label: 'Freeze From', value: form.from || (isFrozen ? client?.freeze_from?.slice(0, 10) : '—') },
    { label: 'Freeze Until', value: form.until || (isFrozen ? client?.freeze_until?.slice(0, 10) : '—') },
    { label: 'Duration', value: days > 0 ? `${days} day${days !== 1 ? 's' : ''}` : '—', highlight: days > 0 },
  ];

  return (
    <AppShell>
      <WorkflowLayout
        hero={
          <WorkflowHero
            client={client}
            backHref={`/clients/${id}`}
            badge={{ label: isFrozen ? 'Update Freeze' : 'Freeze Membership', color: '#3b82f6' }}
          />
        }
        rail={
          <SummaryRail
            title="Freeze Summary"
            items={summaryItems}
            total={0}
            hideTotal
            client={client}
          />
        }
        actionBar={
          <StickyActionBar
            total={0}
            hideTotal
            label={isFrozen ? 'Update Freeze' : 'Freeze Membership'}
            icon={<Snowflake size={15} />}
            saving={saving}
            onCancel={() => router.push(`/clients/${id}`)}
          />
        }
        onSubmit={handleFreeze}
      >
        <AnimatePresence>
          {success && (
            <motion.div key="s" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#065f46', fontWeight: 600 }}>
              ✓ {success}
            </motion.div>
          )}
          {error && (
            <motion.div key="e" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#991b1b' }}>
              ⚠ {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Currently frozen banner */}
        {isFrozen && (
          <motion.div initial={{ opacity: 0, scale: .98 }} animate={{ opacity: 1, scale: 1 }}
            style={{ background: '#eff6ff', border: '1.5px solid #93c5fd', borderRadius: 14, padding: '18px 20px', marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Snowflake size={20} color="#2563eb" />
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1d4ed8' }}>Membership is Currently Frozen</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              {[{ label: 'From', value: client?.freeze_from?.slice(0, 10) || '—' }, { label: 'Until', value: client?.freeze_until?.slice(0, 10) || '—' }].map(r => (
                <div key={r.label} style={{ background: '#fff', borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, marginBottom: 3 }}>{r.label}</div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{r.value}</div>
                </div>
              ))}
            </div>
            {client?.freeze_reason && <p style={{ margin: '0 0 14px', fontSize: 13, color: '#374151' }}>Reason: {client.freeze_reason}</p>}
            <button type="button" onClick={handleUnfreeze} disabled={saving}
              style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
              <Sun size={15} /> {saving ? 'Unfreezing…' : 'Unfreeze Now'}
            </button>
          </motion.div>
        )}

        <GlassCard>
          <SectionHeading eyebrow="FREEZE PERIOD" title={isFrozen ? 'Update Freeze Dates' : 'Set Freeze Period'}
            description="Freezing pauses the membership. Remaining days carry forward when unfrozen." />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '.04em' }}>Freeze From *</span>
              <input type="date" required style={{ padding: '10px 14px', borderRadius: 8, border: '1.5px solid var(--border, #e5e7eb)', fontSize: 14 }}
                value={form.from} onChange={e => setForm(f => ({ ...f, from: e.target.value }))} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '.04em' }}>Freeze Until *</span>
              <input type="date" required style={{ padding: '10px 14px', borderRadius: 8, border: '1.5px solid var(--border, #e5e7eb)', fontSize: 14 }}
                value={form.until} onChange={e => setForm(f => ({ ...f, until: e.target.value }))} />
            </label>
          </div>
          <AnimatePresence>
            {days > 0 && (
              <motion.div key="dur" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 9, padding: '11px 16px', fontSize: 13, color: '#1d4ed8', fontWeight: 600 }}>
                ❄️ Freeze duration: {days} day{days !== 1 ? 's' : ''} — ends {form.until}
              </motion.div>
            )}
          </AnimatePresence>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '.04em' }}>Reason</span>
            <textarea rows={3} placeholder="Reason for freezing (e.g. travel, injury, personal)…"
              style={{ padding: '10px 14px', borderRadius: 8, border: '1.5px solid var(--border, #e5e7eb)', fontSize: 14, resize: 'vertical' }}
              value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
          </label>
        </GlassCard>
      </WorkflowLayout>
    </AppShell>
  );
}
