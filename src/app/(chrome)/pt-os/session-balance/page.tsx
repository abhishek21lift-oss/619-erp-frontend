'use client';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { m } from 'framer-motion';
import { Gauge, Plus, Loader2, AlertTriangle } from 'lucide-react';
import Guard from '@/components/Guard';
import { useAsync } from '@/lib/use-async';
import { api, Client } from '@/lib/api';
import { errorMessage } from '@/lib/forms/errors';
import { useToast } from '@/lib/toast';
import { useAppForm } from '@/lib/forms/useAppForm';
import {
  sessionBalanceSchema, blankSessionBalance, toSessionBalancePayload,
} from '@/lib/forms/schemas/sessionBalance';
import { Button, PageContainer, PageHero } from '@/components/ui';
import {
  TextField, NumberField, SelectField, DateFieldControl, FormErrorBanner,
} from '@/components/ui/form';

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
  // Seeded once from the URL, then owned by the form. Not derived on every
  // render: the operator must be able to change the selection on a page they
  // arrived at with one already made.
  const [seededClientId] = useState(() => sp.get('client_id') || '');
  const [usingId, setUsingId] = useState<string | null>(null);
  // Which list the panel shows. 'low' reads the same fetch as the alert above.
  const [scope, setScope] = useState<'all' | 'low'>('all');
  const { toast } = useToast();

  const clients = useAsync<any[]>(() => api.pt.clients().then(r => r.data), []);
  const balances = useAsync(() => api.automation.sessionBalance.list({ low_balance: 'true' }).then(r => r.data), []);
  const allBalances = useAsync(() => api.automation.sessionBalance.list().then(r => r.data), []);

  // Creating or using a session moves both lists — the low-balance alert is
  // computed from the same rows the panel shows.
  function reloadBalances() {
    void Promise.allSettled([allBalances.refetch(), balances.refetch()]);
  }

  const f = useAppForm({
    schema: sessionBalanceSchema,
    defaultValues: blankSessionBalance(seededClientId),
    onSubmit: async (values) => {
      await api.automation.sessionBalance.create(toSessionBalancePayload(values));
    },
    onSuccess: (values) => {
      // The client stays selected, as before — the trainer is usually adding a
      // second package to the same person. Everything else clears.
      f.resetTo(blankSessionBalance(values.client_id ?? ''));
      reloadBalances();
    },
  });

  const { form, isSubmitting } = f;

  // Burning a session is irreversible — there is no "add one back" — so it
  // asks first, unlike the rest of the row.
  async function handleUse(sb: any) {
    if (!window.confirm(`Mark one session used for ${sb.client_name}? They have ${sb.remaining_sessions} left.`)) return;
    setUsingId(sb.id);
    try {
      await api.automation.sessionBalance.useSession(sb.id);
      reloadBalances();
      toast.success(`Session used for ${sb.client_name}.`);
    } catch (err: unknown) {
      // The endpoint's one failure the trainer can act on is exhaustion (400
      // "No sessions remaining"); anything else is the server or the network.
      toast.error(errorMessage(err, 'Could not use a session.'));
    } finally { setUsingId(null); }
  }

  return (
    <Guard>
      <PageContainer>
        <PageHero
          icon={<Gauge size={20} />}
          title="Session Balance"

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
            <form noValidate onSubmit={(e) => { e.preventDefault(); void f.submit(); }} className="space-y-3">
              <form.Field name="client_id">
                {(field) => (
                  <SelectField
                    field={field}
                    label="Client"
                    required
                    placeholderOption="Select client..."
                    options={(clients.data ?? []).map(c => ({ value: c.id, label: c.name }))}
                    serverError={f.errors.fieldErrors.client_id}
                  />
                )}
              </form.Field>
              <form.Field name="total_sessions">
                {(field) => (
                  <NumberField field={field} label="Total sessions" required mode="integer"
                    serverError={f.errors.fieldErrors.total_sessions} />
                )}
              </form.Field>
              {/* The example survives as a placeholder because that is what it
                  always was — a format, not the field's name. */}
              <form.Field name="package_name">
                {(field) => (
                  <TextField field={field} label="Package name"
                    placeholder="e.g. 12 PT Sessions"
                    serverError={f.errors.fieldErrors.package_name} />
                )}
              </form.Field>
              <form.Field name="end_date">
                {(field) => (
                  <DateFieldControl field={field} label="Valid until"
                    description="Optional. Leave blank for no expiry."
                    serverError={f.errors.fieldErrors.end_date} />
                )}
              </form.Field>
              <FormErrorBanner errors={f.errors} onRetry={() => void f.submit()} />
              <Button type="submit" disabled={isSubmitting}
                className="!w-full !rounded-[14px] !py-3 !font-[700]"
                style={{ background: isSubmitting ? '#e2e8f0' : 'linear-gradient(135deg, #1E293B, #475569)', color: '#fff' }}>
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Create Balance
              </Button>
            </form>
          </div>

          <div className="rounded-[20px] p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[18px] font-[760]" style={{ color: 'var(--text-primary)' }}>
                {scope === 'low' ? 'Low Balances' : 'All Balances'}
              </h2>
              <div className="flex gap-2">
                <button type="button" onClick={() => setScope('low')} aria-pressed={scope === 'low'}
                  className="text-[11px] font-semibold px-3 py-1.5 rounded-[8px]"
                  style={scope === 'low'
                    ? { background: 'rgba(239,68,68,0.15)', color: '#ef4444' }
                    : { background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                  Low ({((balances.data as any[]) || []).length})
                </button>
                <button type="button" onClick={() => setScope('all')} aria-pressed={scope === 'all'}
                  className="text-[11px] font-semibold px-3 py-1.5 rounded-[8px]"
                  style={scope === 'all'
                    ? { background: 'rgba(16,185,129,0.12)', color: '#10b981' }
                    : { background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                  All
                </button>
              </div>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {(scope === 'low' ? (balances.data as any[] || []) : (allBalances.data as any[] || [])).map((sb: any) => (
                <div key={sb.id} className="rounded-[12px] p-3 flex items-center justify-between gap-3"
                  style={{ background: sb.remaining_sessions <= 3 ? 'rgba(239,68,68,0.06)' : '#F8FAFC', border: `1px solid ${sb.remaining_sessions <= 3 ? 'rgba(239,68,68,0.15)' : '#f1f5f9'}` }}>
                  <div className="min-w-0">
                    <p className="text-[13px] font-[700] truncate" style={{ color: 'var(--text-primary)' }}>{sb.client_name}</p>
                    <p className="text-[11px] truncate" style={{ color: 'var(--text-disabled)' }}>{sb.package_name || 'PT Package'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[16px] font-[800]" style={{ color: sb.remaining_sessions <= 3 ? '#ef4444' : '#10b981' }}>
                        {sb.remaining_sessions}
                        <span className="text-[11px] font-normal" style={{ color: 'var(--text-disabled)' }}>/{sb.total_sessions}</span>
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>{sb.used_sessions} used</p>
                    </div>
                    <button type="button" onClick={() => handleUse(sb)}
                      disabled={usingId === sb.id || sb.remaining_sessions <= 0 || sb.status !== 'active'}
                      title={sb.remaining_sessions <= 0 ? 'No sessions remaining'
                        : sb.status !== 'active' ? 'This package is not active'
                        : `Use one session for ${sb.client_name}`}
                      aria-label={`Use one session for ${sb.client_name}`}
                      className="shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-[8px] transition disabled:cursor-not-allowed disabled:opacity-40"
                      style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                      {usingId === sb.id ? <Loader2 size={13} className="animate-spin" /> : 'Use 1'}
                    </button>
                  </div>
                </div>
              ))}
              {(scope === 'low' ? (balances.data as any[] || []) : (allBalances.data as any[] || [])).length === 0 && (
                <p className="text-center py-8 text-sm" style={{ color: 'var(--text-disabled)' }}>
                  {scope === 'low' ? 'No clients are low on sessions.' : 'No session balances yet.'}
                </p>
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
