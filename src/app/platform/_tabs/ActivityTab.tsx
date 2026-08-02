'use client';

// Activity tab — platform-wide audit feed.
//
// Extracted verbatim from the 3,197-line platform/page.tsx (audit H-03).
// Component bodies, props and rendered markup are unchanged.
import { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw, Activity } from 'lucide-react';
import { EmptyState } from '@/components/ui';
import { api } from '@/lib/api';
import type { Organization, ActivityEntry } from '@/lib/api';
import { fmtWhen } from '../_shared/format';
import { Center, ErrorState } from '../_shared/ui';

export function prettifyAction(action: string): string {
  const s = action.replace(/[._]/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
export const ACTION_LABELS: Record<string, string> = {
  organization_created: 'Studio created',
  organization_suspended: 'Studio suspended',
  organization_reactivated: 'Studio reactivated',
  subscription_activated: 'Subscription activated',
  subscription_plan_changed: 'Plan changed',
  user_created: 'Account created',
  user_deactivated: 'Account deactivated',
  password_reset: 'Password reset',
};
export function activityLabel(a: ActivityEntry): string {
  return ACTION_LABELS[a.action] || prettifyAction(a.action);
}

export const ACTIVITY_TONE: Record<string, string> = {
  user_impersonated: '#0067e0', user_deactivated: '#ef4444', user_deleted: '#ef4444',
  org_updated: '#f59e0b', org_created: '#10b981', user_created: '#10b981',
  user_activated: '#10b981', user_password_reset: '#f59e0b', user_updated: '#f59e0b',
};

export function ActivityTab() {
  const [rows, setRows] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [orgFilter, setOrgFilter] = useState('');

  useEffect(() => { api.superAdmin.listOrgs().then((r) => setOrgs(r.data ?? [])).catch(() => {}); }, []);

  const load = useCallback(() => {
    setLoading(true); setError('');
    api.superAdmin.listActivity({ org_id: orgFilter || undefined, limit: 80 })
      .then((r) => setRows(r.data ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load activity'))
      .finally(() => setLoading(false));
  }, [orgFilter]);
  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <select value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)}
          className="rounded-[10px] px-3 py-2 text-[12.5px] outline-none"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
          <option value="">All studios</option>
          {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <button onClick={load} className="flex h-9 w-9 items-center justify-center rounded-[10px] transition hover:bg-black/5"
          style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }} title="Refresh"><RefreshCw size={14} /></button>
      </div>

      {loading && <Center><Loader2 size={26} className="animate-spin" style={{ color: '#0067e0' }} /></Center>}
      {error && !loading && <ErrorState error={error} onRetry={load} />}
      {!loading && !error && rows.length === 0 && (
        <EmptyState icon={<Activity size={20} />} title="No activity" description="Nothing has been logged for this filter yet." />
      )}
      {!loading && !error && rows.length > 0 && (
        <div className="overflow-hidden rounded-[16px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {rows.map((a, i) => (
            <div key={String(a.id)} className="flex items-center gap-3 px-4 py-2.5" style={i ? { borderTop: '1px solid var(--border)' } : undefined}>
              <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: ACTIVITY_TONE[a.action] || '#94a3b8' }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-[650]" style={{ color: 'var(--text-primary)' }}>
                  <span className="font-[750]">{a.action.replace(/[._]/g, ' ')}</span>
                  {a.entity_type ? <span style={{ color: 'var(--text-muted)' }}> · {a.entity_type}</span> : null}
                </p>
                <p className="truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {a.user_name || 'system'}{a.organization_name ? ` · ${a.organization_name}` : ''}
                </p>
              </div>
              <span className="flex-shrink-0 text-[11px] tabular-nums" style={{ color: 'var(--text-disabled)' }}>{fmtWhen(a.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────── SHARED UI */
// ── Coupons ───────────────────────────────────────────────────────────────────
// Operator surface for the discount catalogue. A redeemed coupon can be
// deactivated but never deleted — it is part of the billing record — so the UI
// offers Deactivate for used coupons and Delete only for unused ones.
// Quick-start presets for the create-coupon form below. Each just seeds the
// SAME form with sensible defaults for a common promo shape — there is no
// separate "template" concept on the backend (coupons don't have a category
// column), so this is pure UX sugar around the one real creation endpoint,
// not a new feature pretending to exist. "Founder" pricing is deliberately
// NOT a template here: it's a distinct locked-price status on the org itself
// (Studios > Support access / Grant founder), not a discount coupon, and
// listing it here would conflate two different systems.
