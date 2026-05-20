'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { WorkflowLayout, WorkflowHero, SummaryRail, StickyActionBar, SectionHeading, GlassCard } from '@/components/workflow';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { fmtDate } from '@/lib/format';

export default function ExtensionPage() { return <Guard><Inner /></Guard>; }

const QUICK_DAYS = [3, 7, 14, 30];

function Inner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ days: '7', reason: '' });
  const [activeSubId, setActiveSubId] = useState<string | null>(null);

  useEffect(() => {
    api.clients.get(id).then(setClient).catch(setError).finally(() => setLoading(false));
    api.subscriptions.list({ client_id: id, status: 'active' }).then((subs: any[]) => {
      if (subs && subs.length > 0) setActiveSubId(String(subs[0].id));
    }).catch(() => {});
  }, [id]);

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  const days = parseInt(form.days) || 0;
  const currentEnd = client?.pt_end_date || client?.end_date;
  const newEndDate = currentEnd && days > 0
    ? fmtDate(new Date(new Date(currentEnd).getTime() + days * 86400000))
    : '—';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!Number.isFinite(days) || days <= 0) {
      const m = 'Days must be a positive number'; setError(m); toast.error(m); return;
    }
    setSaving(true);
    try {
      if (!activeSubId) throw new Error('No active subscription found for this member');
      const result: any = await api.subscriptions.extend(activeSubId, { days, reason: form.reason || null });
      const m = result?.message || `Membership extended by ${days} days!`;
      setSuccess(m); toast.success(m);
      setTimeout(() => router.push(`/clients/${id}`), 900);
    } catch (err: any) {
      const m = err?.message || 'Failed to extend membership'; setError(m); toast.error(m);
    } finally { setSaving(false); }
  }

  if (loading) return <AppShell><div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>Loading…</div></AppShell>;

  const summaryItems = [
    { label: 'Current End Date', value: fmtDate(currentEnd) || '—' },
    { label: 'Extension Days', value: `+${days} days`, highlight: days > 0 },
    { label: 'New End Date', value: newEndDate, highlight: days > 0 },
  ];

  return (
    <AppShell>
      <WorkflowLayout
        hero={
          <WorkflowHero
            client={client}
            backHref={`/clients/${id}`}
            badge={{ label: 'Membership Extension', color: '#3b82f6' }}
          />
        }
        rail={
          <SummaryRail
            title="Extension Preview"
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
            label="Apply Extension"
            saving={saving}
            onCancel={() => router.push(`/clients/${id}`)}
          />
        }
        onSubmit={handleSubmit}
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

        <GlassCard>
          <SectionHeading eyebrow="EXTENSION" title="Add Days to Membership" />

          <div>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '.04em', display: 'block', marginBottom: 8 }}>Quick Select</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {QUICK_DAYS.map(d => (
                <button key={d} type="button" onClick={() => set('days', String(d))}
                  style={{ padding: '8px 18px', borderRadius: 20, border: form.days === String(d) ? '2px solid var(--accent, #6366f1)' : '2px solid var(--border, #e5e7eb)', background: form.days === String(d) ? 'var(--accent-soft, #eef2ff)' : '#fff', color: form.days === String(d) ? 'var(--accent, #6366f1)' : 'var(--text, #1f2937)', fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'all .18s' }}>
                  {d} days
                </button>
              ))}
            </div>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 240, marginTop: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '.04em' }}>Custom Days *</span>
            <input type="number" min={1} max={365} required
              style={{ padding: '10px 14px', borderRadius: 8, border: '1.5px solid var(--border, #e5e7eb)', fontSize: 15, fontWeight: 700 }}
              value={form.days} onChange={e => set('days', e.target.value)} />
          </label>

          <AnimatePresence>
            {days > 0 && (
              <motion.div key="preview" initial={{ opacity: 0, scale: .97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 4 }}>
                <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#15803d', marginBottom: 4 }}>New End Date</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#065f46' }}>{newEndDate}</div>
                </div>
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#1d4ed8', marginBottom: 4 }}>Extension</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#1d4ed8' }}>+{days} days</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '.04em' }}>Reason</span>
            <textarea rows={3} placeholder="Reason for extension (injury, travel, etc.)…"
              style={{ padding: '10px 14px', borderRadius: 8, border: '1.5px solid var(--border, #e5e7eb)', fontSize: 14, resize: 'vertical' }}
              value={form.reason} onChange={e => set('reason', e.target.value)} />
          </label>
        </GlassCard>
      </WorkflowLayout>
    </AppShell>
  );
}
