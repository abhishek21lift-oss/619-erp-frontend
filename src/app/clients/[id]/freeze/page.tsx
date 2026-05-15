'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { Snowflake, Sun, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';

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
        if (c.freeze_from)  setForm(f => ({ ...f, from: c.freeze_from?.slice(0,10) || '' }));
        if (c.freeze_until) setForm(f => ({ ...f, until: c.freeze_until?.slice(0,10) || '' }));
        if (c.freeze_reason) setForm(f => ({ ...f, reason: c.freeze_reason || '' }));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const isFrozen = client?.is_frozen || client?.status === 'frozen';

  async function handleFreeze(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!form.from || !form.until) { setError('From and Until dates are required'); return; }
    if (new Date(form.until) <= new Date(form.from)) { setError('Until date must be after From date'); return; }
    setSaving(true);
    try {
      await api.clients.freeze(id, { freeze_from: form.from, freeze_until: form.until, reason: form.reason || null });
      const m = 'Membership frozen successfully!';
      setSuccess(m); toast.success(m);
      setTimeout(() => router.push(`/clients/${id}`), 1400);
    } catch (e: any) { const m = e.message || 'Failed to freeze'; setError(m); toast.error(m); }
    finally { setSaving(false); }
  }

  async function handleUnfreeze() {
    if (!confirm('Unfreeze this membership and restore active status?')) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      await api.clients.unfreeze(id);
      const m = 'Membership unfrozen successfully!';
      setSuccess(m); toast.success(m);
      setTimeout(() => router.push(`/clients/${id}`), 1400);
    } catch (e: any) { const m = e.message || 'Failed to unfreeze'; setError(m); toast.error(m); }
    finally { setSaving(false); }
  }

  const days = form.from && form.until
    ? Math.round((new Date(form.until).getTime() - new Date(form.from).getTime()) / 86400000)
    : 0;

  if (loading) return (
    <AppShell><div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div></AppShell>
  );

  return (
    <AppShell>
      <div className="page-container animate-fade-in" style={{ maxWidth: 600 }}>

        {/* Back */}
        <Link href={`/clients/${id}`} className="btn btn-ghost btn-sm" style={{ marginBottom: 20, display: 'inline-flex', gap: 6 }}>
          <ArrowLeft size={14} /> Back to {client?.name}
        </Link>

        {/* Member summary */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, padding: '14px 18px', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ width: 46, height: 46, borderRadius: '50%', overflow: 'hidden', background: 'var(--brand-soft)', color: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
            {client?.photo_url ? <img src={client.photo_url} alt={client.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (client?.name || '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>{client?.name}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', gap: 12, marginTop: 2 }}>
              {client?.mobile && <span>📞 {client.mobile}</span>}
              <span className={`badge badge-${client?.status || 'active'}`}>{client?.status}</span>
            </div>
          </div>
        </div>

        {/* Flash */}
        {success && <div style={{ background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--success-border)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600 }}><CheckCircle2 size={16} />{success}</div>}
        {error && <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger-border)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}><AlertCircle size={16} />{error}</div>}

        {/* UNFREEZE section — shown when already frozen */}
        {isFrozen && (
          <div className="card" style={{ padding: 22, marginBottom: 20, border: '1px solid var(--info-border)', background: 'var(--info-bg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Snowflake size={20} color="var(--info)" />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--info)' }}>Membership is Currently Frozen</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[{ label: 'Frozen From', value: client?.freeze_from?.slice(0,10) || '—' }, { label: 'Frozen Until', value: client?.freeze_until?.slice(0,10) || '—' }].map(r => (
                <div key={r.label} style={{ background: 'var(--bg-card)', borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 3 }}>{r.label}</div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{r.value}</div>
                </div>
              ))}
            </div>
            {client?.freeze_reason && <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-secondary)' }}>Reason: {client.freeze_reason}</p>}
            <button className="btn btn-primary btn-sm" onClick={handleUnfreeze} disabled={saving} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Sun size={14} /> {saving ? 'Unfreezing…' : 'Unfreeze Membership Now'}
            </button>
          </div>
        )}

        {/* FREEZE FORM */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Snowflake size={18} color="var(--brand)" />
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{isFrozen ? 'Update Freeze Period' : 'Freeze Membership'}</h2>
          </div>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            ℹ️ Freezing pauses the membership. The remaining days will be carried forward when unfrozen.
          </p>

          <form onSubmit={handleFreeze} style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Freeze From *</span>
                <input className="input" type="date" value={form.from} onChange={e => setForm(f => ({ ...f, from: e.target.value }))} required />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Freeze Until *</span>
                <input className="input" type="date" value={form.until} onChange={e => setForm(f => ({ ...f, until: e.target.value }))} required />
              </label>
            </div>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Reason</span>
              <textarea className="input" rows={3} placeholder="Reason for freezing (e.g. travel, injury, personal)…" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} style={{ resize: 'vertical' }} />
            </label>
            {days > 0 && (
              <div style={{ background: 'var(--info-bg)', border: '1px solid var(--info-border)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--info)', fontWeight: 600 }}>
                ✓ Freeze duration: {days} day{days !== 1 ? 's' : ''} — ends {form.until}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
              <Link href={`/clients/${id}`} className="btn btn-outline btn-sm">Cancel</Link>
              <button type="submit" className="btn btn-primary btn-sm" disabled={saving} style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                <Snowflake size={13} /> {saving ? 'Saving…' : isFrozen ? 'Update Freeze' : 'Freeze Membership'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
