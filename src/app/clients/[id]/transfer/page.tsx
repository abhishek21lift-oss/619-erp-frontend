'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { WorkflowLayout, WorkflowHero, SummaryRail, StickyActionBar, SectionHeading, GlassCard } from '@/components/workflow';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';

export default function TransferPage() { return <Guard><Inner /></Guard>; }

function Inner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [client, setClient] = useState<any>(null);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ trainer_id: '', reason: '' });

  useEffect(() => {
    Promise.all([api.clients.get(id), api.trainers.list().catch(() => [])])
      .then(([c, t]) => { setClient(c); setTrainers(Array.isArray(t) ? t : []); })
      .catch(setError).finally(() => setLoading(false));
  }, [id]);

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  const currentTrainer = trainers.find(t => t.id === client?.trainer_id);
  const newTrainer = trainers.find(t => t.id === form.trainer_id);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!form.trainer_id) { const m = 'Pick a new trainer'; setError(m); toast.error(m); return; }
    setSaving(true);
    try {
      const result = await api.clients.transfer(id, { new_trainer_id: form.trainer_id, reason: form.reason || null });
      const m = result?.message || `Member transferred to ${newTrainer?.name || 'new trainer'}!`;
      setSuccess(m); toast.success(m);
      setTimeout(() => router.push(`/clients/${id}`), 900);
    } catch (err: any) {
      const m = err?.message || 'Failed to transfer member'; setError(m); toast.error(m);
    } finally { setSaving(false); }
  }

  if (loading) return <AppShell><div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>Loading…</div></AppShell>;

  const summaryItems = [
    { label: 'Current Trainer', value: currentTrainer?.name || client?.trainer_name || '—' },
    { label: 'New Trainer', value: newTrainer?.name || '—', highlight: !!newTrainer },
  ];

  return (
    <AppShell>
      <WorkflowLayout
        hero={
          <WorkflowHero
            client={client}
            backHref={`/clients/${id}`}
            badge={{ label: 'Transfer Member', color: '#8b5cf6' }}
          />
        }
        rail={
          <SummaryRail
            title="Transfer Preview"
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
            label="Transfer Member"
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
          <SectionHeading eyebrow="TRANSFER" title="Assign New Trainer" />

          {/* Trainer grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
            {trainers.filter(t => t.id !== client?.trainer_id).map((t: any) => (
              <button key={t.id} type="button" onClick={() => set('trainer_id', t.id)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '16px 12px', borderRadius: 12, border: form.trainer_id === t.id ? '2px solid #8b5cf6' : '2px solid var(--border, #e5e7eb)', background: form.trainer_id === t.id ? '#f5f3ff' : '#fff', cursor: 'pointer', transition: 'all .18s', textAlign: 'center' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: form.trainer_id === t.id ? '#8b5cf6' : '#e5e7eb', color: form.trainer_id === t.id ? '#fff' : '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, overflow: 'hidden' }}>
                  {t.photo_url ? <img src={t.photo_url} alt={t.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (t.name || '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <span style={{ fontWeight: 700, fontSize: 13, color: form.trainer_id === t.id ? '#8b5cf6' : 'var(--text, #1f2937)' }}>{t.name}</span>
                {t.role && <span style={{ fontSize: 11, color: 'var(--muted)', marginTop: -2 }}>{t.role}</span>}
              </button>
            ))}
          </div>

          <AnimatePresence>
            {newTrainer && (
              <motion.div key="arrow" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ background: '#f5f3ff', border: '1px solid #c4b5fd', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 600, color: '#6d28d9' }}>
                <span>{currentTrainer?.name || '—'}</span>
                <span style={{ fontSize: 18 }}>→</span>
                <span>{newTrainer.name}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '.04em' }}>Reason</span>
            <textarea rows={3} placeholder="Reason for transfer…"
              style={{ padding: '10px 14px', borderRadius: 8, border: '1.5px solid var(--border, #e5e7eb)', fontSize: 14, resize: 'vertical' }}
              value={form.reason} onChange={e => set('reason', e.target.value)} />
          </label>
        </GlassCard>
      </WorkflowLayout>
    </AppShell>
  );
}
