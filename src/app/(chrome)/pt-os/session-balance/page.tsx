'use client';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { m } from 'framer-motion';
import { Gauge, Plus, Loader2, AlertTriangle } from 'lucide-react';
import Guard from '@/components/Guard';
import { useAsync } from '@/lib/use-async';
import { api, Client } from '@/lib/api';
import { errorMessage } from '@/lib/forms/errors';
import { Button, PageContainer, PageHero, FormField, TextInput, SelectInput } from '@/components/ui';

/**
 * Session balances, optionally pre-scoped to one client.
 *
 * ── Why the search param is read at all ────────────────────────────────────
 *
 * The member profile's "Session Balance" action and its Payments panel both
 * link here as `?client_id=<id>`. This page ignored it completely — `clientId`
 * started as '' and was only ever set by the dropdown — so a trainer who
 * tapped it from a client's profile arrived at a blank form and had to find,
 * in a list of every client in the studio, the one whose profile they had been
 * looking at a second earlier.
 *
 * The link was not broken; it navigated. It simply dropped the one piece of
 * context that made it worth tapping.
 */
function SessionBalanceInner() {
  const sp = useSearchParams();
  // Seeded from the URL, then owned by the dropdown. Not derived on every
  // render: the operator must be able to change the selection on a page they
  // arrived at with one already made.
  const [clientId, setClientId] = useState(() => sp.get('client_id') || '');
  const [totalSessions, setTotalSessions] = useState('');
  const [packageName, setPackageName] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const clients = useAsync<any[]>(() => api.pt.clients().then(r => r.data), []);
  const balances = useAsync(() => api.automation.sessionBalance.list({ low_balance: 'true' }).then(r => r.data), []);
  const allBalances = useAsync(() => api.automation.sessionBalance.list().then(r => r.data), []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId || !totalSessions) return;
    setSaving(true);
    setError('');
    try {
      await api.automation.sessionBalance.create({
        client_id: clientId, total_sessions: parseInt(totalSessions),
        package_name: packageName || undefined, end_date: endDate || undefined,
      });
      setTotalSessions(''); setPackageName(''); setEndDate('');
      allBalances.refetch(); balances.refetch();
    } catch (err: unknown) {
      // There was no catch at all — just try/finally. A failed save reset the
      // button and said nothing, so the form looked like it had simply
      // ignored the click, and the trainer pressed it again.
      setError(errorMessage(err, 'Could not create the session package.'));
    } finally { setSaving(false); }
  }

  return (
    <Guard>
      <PageContainer>
        <PageHero
          icon={<Gauge size={20} />}
          title="Session Balance"
          subtitle="Track PT session usage, view low balance alerts, and manage package renewals."
        />

        {/* Low Balance Alert */}
        {(balances.data as any[] || []).length > 0 && (
          <m.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="rounded-[16px] p-4 flex items-start gap-3"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertTriangle size={20} style={{ color: '#ef4444', flexShrink: 0 }} />
            <div>
              <p className="text-[13px] font-[700]" style={{ color: '#ef4444' }}>Low Session Balance Alert</p>
              <p className="text-[12px] mt-1" style={{ color: 'var(--text-muted)' }}>
                {(balances.data as any[]).length} client(s) have 3 or fewer sessions remaining.
              </p>
            </div>
          </m.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h2 className="text-[18px] font-[760] mb-5" style={{ color: 'var(--text-primary)' }}>Add Session Package</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <FormField label="Client" required>
                <SelectInput value={clientId} onChange={e => setClientId(e.target.value)}>
                  <option value="">Select client...</option>
                  {clients.data?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </SelectInput>
              </FormField>
              <FormField label="Total sessions" required>
                <TextInput min={1} inputMode="numeric"
                  value={totalSessions} onChange={e => setTotalSessions(e.target.value)} />
              </FormField>
              {/* The example survives as a placeholder because that is what it
                  always was — a format, not the field's name. */}
              <FormField label="Package name">
                <TextInput placeholder="e.g. 12 PT Sessions"
                  value={packageName} onChange={e => setPackageName(e.target.value)} />
              </FormField>
              <FormField label="Valid until" description="Optional. Leave blank for no expiry.">
                <TextInput type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </FormField>
              {error && (
                <p role="alert" className="rounded-[10px] px-3 py-2 text-[12px] font-[600]"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
                  {error}
                </p>
              )}
              <Button type="submit" disabled={!clientId || !totalSessions || saving}
                className="!w-full !rounded-[14px] !py-3 !font-[700]"
                style={{ background: !clientId || !totalSessions || saving ? '#e2e8f0' : 'linear-gradient(135deg, #1E293B, #475569)', color: '#fff' }}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Create Balance
              </Button>
            </form>
          </div>

          <div className="rounded-[20px] p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[18px] font-[760]" style={{ color: 'var(--text-primary)' }}>All Balances</h2>
              <div className="flex gap-2">
                <button onClick={() => balances.refetch()} className="text-[11px] font-semibold px-3 py-1.5 rounded-[8px]" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                  Low ({((balances.data as any[]) || []).length})
                </button>
                <button onClick={() => allBalances.refetch()} className="text-[11px] font-semibold px-3 py-1.5 rounded-[8px]" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                  All
                </button>
              </div>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {(allBalances.data as any[] || []).map((sb: any) => (
                <div key={sb.id} className="rounded-[12px] p-3 flex items-center justify-between"
                  style={{ background: sb.remaining_sessions <= 3 ? 'rgba(239,68,68,0.06)' : '#F8FAFC', border: `1px solid ${sb.remaining_sessions <= 3 ? 'rgba(239,68,68,0.15)' : '#f1f5f9'}` }}>
                  <div>
                    <p className="text-[13px] font-[700]" style={{ color: 'var(--text-primary)' }}>{sb.client_name}</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-disabled)' }}>{sb.package_name || 'PT Package'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[16px] font-[800]" style={{ color: sb.remaining_sessions <= 3 ? '#ef4444' : '#10b981' }}>
                      {sb.remaining_sessions}
                      <span className="text-[11px] font-normal" style={{ color: 'var(--text-disabled)' }}>/{sb.total_sessions}</span>
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>{sb.used_sessions} used</p>
                  </div>
                </div>
              ))}
              {(!allBalances.data || (allBalances.data as any[]).length === 0) && (
                <p className="text-center py-8 text-sm" style={{ color: 'var(--text-disabled)' }}>No session balances yet.</p>
              )}
            </div>
          </div>
        </div>
      </PageContainer>
    </Guard>
  );
}

/**
 * useSearchParams suspends, so the page export wraps the real component.
 * Without this the route opts into dynamic rendering and Next warns at build.
 */
export default function SessionBalancePage() {
  return (
    <Suspense fallback={null}>
      <SessionBalanceInner />
    </Suspense>
  );
}
