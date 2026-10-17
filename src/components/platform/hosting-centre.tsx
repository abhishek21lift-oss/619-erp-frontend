'use client';

// Hosting Centre — the estate, and the credential that can change it.
//
// ── The first screen answers "is it connected, and what do we have" ─────────
//
// Four credential states, and the prompt differs for each: no key on the
// server (`not_configured` — nothing the operator can type will help), no
// credential yet, one that decrypts, and one that no longer does. Reading
// "not connected" for the last of those sends an operator hunting for a bug in
// a system where the remedy is "paste the token again", so the state is its own
// card with its own words.
//
// ── Slots fail separately, and the screen says which ────────────────────────
//
// `/hostinger/dashboard` returns one outcome per API area. One unreachable area
// must not blank the page, so each card renders its own error where its data
// would be. The same for the sampling: SSL is checked on the first few
// websites and metrics on the first few machines, and that is stated on the
// cards rather than left to be discovered.
//
// ── Reads only, plus the credential ─────────────────────────────────────────
//
// Nothing on this screen changes a website, a domain or a DNS record: those go
// through the catalogue's operations behind the approval gate, which is what
// the machine screen and the assistant are for. The one write here is the
// credential itself, which is the thing being managed.

import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, Cloud, CreditCard, Fingerprint, Globe2, KeyRound,
  Loader2, Lock, RefreshCw, Server, ShieldCheck, Trash2, Undo2,
} from 'lucide-react';
import { api } from '@/lib/api';
import type {
  HostingerApprovalSummary, HostingerCatalogue, HostingerDashboard, HostingerHistoryRow,
  HostingerPendingApproval, HostingerSlot, HostingerStatus,
} from '@/lib/api';
import { Button, SearchField, TextInput } from '@/components/ui';
import { Panel, Reveal, SectionLabel } from './console';
import { CcCard, CcStat } from './cc-viz';
import { ErrorState } from '@/app/(platform)/platform/_shared/ui';
import { errorMessage } from '@/lib/forms/errors';
import { useToast } from '@/lib/toast';
import {
  CapabilityGaps, SafetyBadge, SampleNote, fmtDate, fmtMetric,
  fmtWhen, metric, nf, num, prop, rows, slotData, slotError, str,
} from './hosting-shared';

/* ── Credential card ───────────────────────────────────────────────────────── */

const STATE_COPY: Record<HostingerStatus['state'], { title: string; body: string; tone: 'ok' | 'warn' | 'danger' }> = {
  not_configured: {
    title: 'The integration is not configured on this server',
    body: 'HOSTINGER_TOKEN_KEY is unset, so a token cannot be sealed and this module stays inert. Nothing typed here would be stored.',
    tone: 'warn',
  },
  not_connected: {
    title: 'No Hostinger API token is connected',
    body: 'Create an API token in hPanel (Account → API) and connect it here. It is verified against the live API before it is stored, then sealed with AES-256-GCM.',
    tone: 'warn',
  },
  connected: {
    title: 'Connected',
    body: 'The token is stored encrypted and never leaves the server: this console sees the last four characters only.',
    tone: 'ok',
  },
  unreadable: {
    title: 'The stored token cannot be decrypted',
    body: 'The row is there but HOSTINGER_TOKEN_KEY no longer opens it — usually the key was rotated without re-entering the token. Paste the token again to fix it.',
    tone: 'danger',
  },
};

function CredentialCard({ status, onChanged }: { status: HostingerStatus; onChanged: () => Promise<void> }) {
  const { toast } = useToast();
  const [form, setForm] = useState<'connect' | 'rotate' | null>(null);
  const [token, setToken] = useState('');
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const copy = STATE_COPY[status.state] ?? STATE_COPY.not_connected;
  const credential = status.credential;
  const hint = str(credential?.hint) ?? str(credential?.token_hint);

  const submit = async (kind: 'connect' | 'rotate') => {
    setBusy(kind);
    setProblem(null);
    try {
      const result = kind === 'connect'
        ? await api.superAdmin.hostingerConnect(token, label || undefined)
        : await api.superAdmin.hostingerRotate(token, label || undefined);
      // `unchanged` is the server refusing to make a rotation out of the same
      // token twice: worth saying out loud, because the operator just clicked.
      toast.success(result.unchanged ? 'That is the token already connected — nothing changed.' : kind === 'connect' ? 'Token connected and verified.' : 'Token rotated.');
      setToken('');
      setLabel('');
      setForm(null);
      await onChanged();
    } catch (err) {
      setProblem(errorMessage(err, 'The token could not be connected.'));
    } finally {
      setBusy(null);
    }
  };

  const verify = async () => {
    setBusy('verify');
    setProblem(null);
    try {
      const outcome = await api.superAdmin.hostingerVerify();
      toast.success(outcome.ok ? 'Hostinger answered — the token works.' : 'Hostinger rejected the token.');
      await onChanged();
    } catch (err) {
      // A failed verification returns 502 with the reason; http.ts turns that
      // into an ApiError, so the reason is the message.
      setProblem(errorMessage(err, 'The token could not be verified.'));
    } finally {
      setBusy(null);
    }
  };

  const revoke = async () => {
    if (!window.confirm('Revoke the Hostinger credential? Every hosting call from this console stops working until a token is connected again.')) return;
    setBusy('revoke');
    setProblem(null);
    try {
      await api.superAdmin.hostingerRevoke();
      toast.success('Credential revoked.');
      await onChanged();
    } catch (err) {
      setProblem(errorMessage(err, 'The credential could not be revoked.'));
    } finally {
      setBusy(null);
    }
  };

  const toneStyle = copy.tone === 'ok'
    ? { bg: 'rgba(4,120,87,0.06)', border: 'rgba(4,120,87,0.28)', fg: '#047857', icon: <CheckCircle2 size={15} /> }
    : copy.tone === 'danger'
      ? { bg: 'rgba(185,28,28,0.06)', border: 'rgba(185,28,28,0.30)', fg: '#b91c1c', icon: <AlertTriangle size={15} /> }
      : { bg: 'rgba(180,83,9,0.06)', border: 'rgba(180,83,9,0.28)', fg: '#b45309', icon: <KeyRound size={15} /> };

  return (
    <Panel>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]"
            style={{ background: `${toneStyle.bg}`, border: `1px solid ${toneStyle.border}`, color: toneStyle.fg }}>
            {toneStyle.icon}
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-[800]" style={{ color: 'var(--text-primary)' }}>{copy.title}</p>
            <p className="mt-0.5 max-w-[62ch] text-[12px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{copy.body}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {status.state === 'connected' && (
            <>
              <Button variant="outline" size="sm" loading={busy === 'verify'} iconLeft={<RefreshCw size={13} />} onClick={() => { void verify(); }}>Verify</Button>
              <Button variant="outline" size="sm" iconLeft={<Lock size={13} />} onClick={() => { setForm(form === 'rotate' ? null : 'rotate'); setProblem(null); }}>Rotate</Button>
              <Button variant="outline" size="sm" loading={busy === 'revoke'} iconLeft={<Trash2 size={13} />} onClick={() => { void revoke(); }}>Revoke</Button>
            </>
          )}
          {(status.state === 'not_connected' || status.state === 'unreadable') && (
            <Button size="sm" iconLeft={<KeyRound size={13} />} onClick={() => { setForm(form === 'connect' ? null : 'connect'); setProblem(null); }}>
              {status.state === 'unreadable' ? 'Re-enter the token' : 'Connect a token'}
            </Button>
          )}
        </div>
      </div>

      {status.key_problem && (
        <p className="mt-3 rounded-[10px] px-3 py-2 text-[11.5px]" style={{ background: 'rgba(180,83,9,0.08)', color: '#b45309' }}>
          {status.key_problem}
        </p>
      )}

      {credential && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Fact label="Token" value={hint ? `••••${hint.replace(/^•+/, '')}` : 'not readable'} mono />
          <Fact label="Label" value={str(credential.label) ?? '—'} />
          <Fact label="Connected" value={fmtDate(credential.created_at)} />
          <Fact
            label="Last checked"
            value={credential.last_verified_status === 'ok' ? `ok · ${fmtWhen(credential.last_verified_at)}` : str(credential.last_verified_status) ?? 'never'}
          />
        </div>
      )}

      {str(credential?.last_error) && (
        <p className="mt-2 text-[11.5px]" style={{ color: '#b45309' }}>Last error: {str(credential?.last_error)}</p>
      )}

      {form && (
        <div className="mt-4 rounded-[14px] p-3.5" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
          <p className="mb-2 text-[12px] font-[700]" style={{ color: 'var(--text-primary)' }}>
            {form === 'connect' ? 'Connect a Hostinger API token' : 'Rotate the stored token'}
          </p>
          <div className="flex flex-col gap-2">
            <TextInput
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste the token from hPanel → Account → API"
              aria-label="Hostinger API token"
              autoComplete="new-password"
              spellCheck={false}
              style={{ fontFamily: 'ui-monospace, monospace' }}
            />
            <TextInput
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Label (optional) — what this token is for"
              aria-label="Credential label"
            />
          </div>
          <p className="mt-2 text-[11px]" style={{ color: 'var(--text-disabled)' }}>
            The token is sent once, verified against the live API, and sealed server-side. It is never returned to this browser,
            never written to an audit row, and never put in front of the AI assistant.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" loading={busy === form} disabled={token.trim().length < 20} onClick={() => { void submit(form); }}>
              {form === 'connect' ? 'Verify and connect' : 'Verify and rotate'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setForm(null); setToken(''); setLabel(''); setProblem(null); }}>Cancel</Button>
          </div>
        </div>
      )}

      {problem && (
        <p className="mt-2 flex items-start gap-2 text-[12px]" style={{ color: '#b91c1c' }}>
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />{problem}
        </p>
      )}
    </Panel>
  );
}

function Fact({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-[10px] px-2.5 py-2" style={{ background: 'var(--bg-subtle)' }}>
      <p className="text-[9px] font-[750] uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>{label}</p>
      <p className="mt-0.5 truncate text-[12px] font-[650]" style={{ color: 'var(--text-primary)', fontFamily: mono ? 'ui-monospace, monospace' : undefined }}>{value}</p>
    </div>
  );
}

/* ── One slot, rendered as data or as its own failure ──────────────────────── */

function SlotError({ slot, what }: { slot: HostingerSlot | null | undefined; what: string }) {
  const error = slotError(slot);
  if (!error) return null;
  return (
    <p className="py-4 text-[12px]" style={{ color: 'var(--text-muted)' }}>
      <AlertTriangle size={13} className="mr-1.5 inline" style={{ color: '#b45309' }} />
      {what} could not be read: {error.message}
    </p>
  );
}

/* ── Websites, with the SSL sample stated as a sample ─────────────────────── */

function WebsitesCard({ dashboard }: { dashboard: HostingerDashboard }) {
  const sites = rows(slotData(dashboard.websites));
  const error = slotError(dashboard.websites);
  const { ssl_checked, ssl_total } = dashboard.sampled;

  return (
    <CcCard title="Websites" eyebrow="Shared hosting" icon={<Globe2 size={15} />} tone="blue">
      {error ? (
        <SlotError slot={dashboard.websites} what="The website list" />
      ) : !sites.length ? (
        <p className="py-4 text-[12px]" style={{ color: 'var(--text-muted)' }}>This account has no websites.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {sites.map((site, i) => {
            const domain = str(site.domain) ?? `site ${i + 1}`;
            const sslSlot = dashboard.ssl?.[domain];
            const ssl = slotData<Record<string, unknown>>(sslSlot);
            const sslError = slotError(sslSlot);
            const status = str(prop(ssl, 'status'));
            const redirect = prop(ssl, 'is_https_redirect_enabled');
            const checked = sslSlot !== undefined;
            return (
              <div key={domain} className="flex flex-wrap items-center justify-between gap-2 rounded-[11px] px-3 py-2"
                style={{ background: 'var(--bg-subtle)' }}>
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-[700]" style={{ color: 'var(--text-primary)' }}>{domain}</p>
                  <p className="truncate text-[10.5px]" style={{ color: 'var(--text-disabled)' }}>
                    {[str(site.website_type), str(site.vhost_type), prop(site, 'is_enabled') === false ? 'disabled' : null]
                      .filter(Boolean).join(' · ') || 'type not reported'}
                  </p>
                </div>
                <div className="text-right">
                  {!checked ? (
                    <span className="text-[10.5px]" style={{ color: 'var(--text-disabled)' }}>SSL not sampled</span>
                  ) : sslError ? (
                    <span className="text-[10.5px]" style={{ color: '#b45309' }}>SSL: {sslError.message}</span>
                  ) : (
                    <>
                      <p className="text-[11.5px] font-[650]" style={{ color: status && /active/i.test(status) ? '#047857' : 'var(--text-secondary)' }}>
                        {status ?? 'status not reported'}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>
                        {redirect === true ? 'HTTPS redirect on' : redirect === false ? 'HTTPS redirect off' : 'redirect not reported'}
                        {str(prop(ssl, 'expires_at')) ? ` · expires ${fmtDate(prop(ssl, 'expires_at'))}` : ''}
                      </p>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {ssl_total > 0 && (
        <SampleNote text={`SSL was checked on ${ssl_checked} of ${ssl_total} websites — the rest are not stale, they are unread.`} />
      )}
    </CcCard>
  );
}

/* ── Domains, with renewals that are close ────────────────────────────────── */

function DomainsCard({ dashboard }: { dashboard: HostingerDashboard }) {
  const domains = rows(slotData(dashboard.domains));
  const error = slotError(dashboard.domains);
  const soon = domains.filter((d) => {
    const expires = str(d.expires_at);
    if (!expires) return false;
    const days = (new Date(expires).getTime() - Date.now()) / 86400000;
    return days < 45;
  });

  return (
    <CcCard title="Domains" eyebrow={soon.length ? `${soon.length} renewing soon` : 'Portfolio'} icon={<Fingerprint size={15} />} tone={soon.length ? 'orange' : 'indigo'}>
      {error ? (
        <SlotError slot={dashboard.domains} what="The domain portfolio" />
      ) : !domains.length ? (
        <p className="py-4 text-[12px]" style={{ color: 'var(--text-muted)' }}>No domains in the portfolio.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {domains.slice(0, 12).map((d, i) => {
            const domain = str(d.domain) ?? `domain ${i + 1}`;
            const expires = str(d.expires_at);
            const days = expires ? (new Date(expires).getTime() - Date.now()) / 86400000 : null;
            const urgent = days !== null && days < 45;
            return (
              <div key={domain} className="flex items-center justify-between gap-2 rounded-[11px] px-3 py-2" style={{ background: 'var(--bg-subtle)' }}>
                <p className="min-w-0 truncate text-[12.5px] font-[700]" style={{ color: 'var(--text-primary)' }}>{domain}</p>
                <p className="shrink-0 text-[10.5px]" style={{ color: urgent ? '#b45309' : 'var(--text-disabled)' }}>
                  {str(d.status) ?? 'status not reported'}{expires ? ` · expires ${fmtDate(expires)}` : ''}
                </p>
              </div>
            );
          })}
          {domains.length > 12 && (
            <SampleNote text={`Showing the first 12 of ${domains.length}. DNS and renewal detail per domain is in the catalogue below.`} />
          )}
        </div>
      )}
    </CcCard>
  );
}

/* ── The machines ─────────────────────────────────────────────────────────── */

function VpsCard({ dashboard, onOpenMachine }: { dashboard: HostingerDashboard; onOpenMachine: (id: number) => void }) {
  const machines = rows(slotData(dashboard.vps));
  const error = slotError(dashboard.vps);
  const { metrics_checked, metrics_total } = dashboard.sampled;

  return (
    <CcCard title="Virtual machines" eyebrow="VPS" icon={<Server size={15} />} tone="green">
      {error ? (
        <SlotError slot={dashboard.vps} what="The machine list" />
      ) : !machines.length ? (
        <p className="py-4 text-[12px]" style={{ color: 'var(--text-muted)' }}>This account has no VPS machines.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {machines.map((vm, i) => {
            const id = num(vm.id);
            const resource = id !== null ? dashboard.resources?.[String(id)] : undefined;
            const data = slotData<Record<string, unknown>>(resource);
            const cpu = metric(data, 'cpu_usage');
            const ram = metric(data, 'ram_usage');
            const state = str(vm.state);
            return (
              <button
                key={id ?? i}
                type="button"
                onClick={() => id !== null && onOpenMachine(id)}
                disabled={id === null}
                className="flex w-full flex-wrap items-center justify-between gap-2 rounded-[11px] px-3 py-2 text-left transition hover:opacity-90 disabled:opacity-60"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', minHeight: 44 }}
              >
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-[700]" style={{ color: 'var(--text-primary)' }}>
                    {str(vm.hostname) ?? `machine ${id ?? '?'}`}
                  </p>
                  <p className="truncate text-[10.5px]" style={{ color: 'var(--text-disabled)' }}>
                    #{id ?? '?'} · {str(vm.plan) ?? 'plan not reported'} · {num(vm.cpus) ?? '?'} vCPU / {num(vm.memory) ?? '?'} MB
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11.5px] font-[650]" style={{ color: state && /running/i.test(state) ? '#047857' : 'var(--text-secondary)' }}>
                    {state ?? 'state not reported'}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>
                    {resource === undefined ? 'metrics not sampled' : `CPU ${fmtMetric(cpu)} · RAM ${fmtMetric(ram)}`}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
      {metrics_total > 0 && (
        <SampleNote text={`Metrics were read for ${metrics_checked} of ${metrics_total} machines, over the last 24 hours. Open a machine for its own readings.`} />
      )}
    </CcCard>
  );
}

/* ── Billing and firewalls: the parts of the estate that cost, or expose ──── */

function BillingCard({ dashboard }: { dashboard: HostingerDashboard }) {
  const subs = rows(slotData(dashboard.subscriptions));
  const methods = rows(slotData(dashboard.payment_methods));
  const orders = rows(slotData(dashboard.orders));
  const defaultMethod = methods.find((m) => prop(m, 'is_default') === true);
  const expired = methods.filter((m) => prop(m, 'is_expired') === true || prop(m, 'is_suspended') === true);
  const soonRenewal = subs
    .map((s) => ({ name: str(s.name) ?? str(s.id) ?? 'subscription', at: str(s.next_billing_at) ?? str(s.expires_at) }))
    .filter((r) => r.at && new Date(r.at).getTime() - Date.now() < 30 * 86400000)
    .sort((a, b) => new Date(a.at as string).getTime() - new Date(b.at as string).getTime());

  const error = slotError(dashboard.subscriptions) ?? slotError(dashboard.payment_methods);

  return (
    <CcCard title="Billing" eyebrow="Subscriptions and cards" icon={<CreditCard size={15} />} tone="orange">
      {error ? (
        <SlotError slot={slotError(dashboard.subscriptions) ? dashboard.subscriptions : dashboard.payment_methods} what="Billing" />
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <CcStat label="Subscriptions" value={nf(subs.length)} sub={orders.length ? `${orders.length} orders` : 'no orders'} icon={<CreditCard size={14} />} tone="orange" />
          <CcStat label="Payment methods" value={nf(methods.length)} sub={defaultMethod ? `default ••••${str(defaultMethod.identifier)?.slice(-4) ?? '?'}` : 'no default'} icon={<CreditCard size={14} />} tone="teal" />
          <CcStat label="Attention" value={nf(expired.length)} tone={expired.length ? 'pink' : 'green'} sub={expired.length ? 'expired or suspended' : 'all usable'} icon={<AlertTriangle size={14} />} />
        </div>
      )}
      {soonRenewal.length > 0 && (
        <div className="mt-2">
          <p className="text-[10px] font-[750] uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.12em' }}>Renewing within 30 days</p>
          {soonRenewal.slice(0, 5).map((r) => (
            <p key={r.name} className="mt-1 text-[11.5px]" style={{ color: 'var(--text-secondary)' }}>
              {r.name} — {fmtDate(r.at)}
            </p>
          ))}
        </div>
      )}
      {expired.length > 0 && (
        <p className="mt-2 text-[11.5px]" style={{ color: '#b45309' }}>
          {expired.length} payment method{expired.length === 1 ? '' : 's'} expired or suspended — a renewal can fail silently.
        </p>
      )}
    </CcCard>
  );
}

function FirewallCard({ dashboard }: { dashboard: HostingerDashboard }) {
  const firewalls = rows(slotData(dashboard.firewalls));
  const error = slotError(dashboard.firewalls);
  const attached = firewalls.filter((f) => num(f.id) !== null).length;
  return (
    <CcCard title="Firewalls" eyebrow="VPS network rules" icon={<ShieldCheck size={15} />} tone="pink">
      {error ? (
        <SlotError slot={dashboard.firewalls} what="The firewall list" />
      ) : !firewalls.length ? (
        <p className="py-4 text-[12px]" style={{ color: 'var(--text-muted)' }}>No firewalls on this account.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {firewalls.slice(0, 8).map((f, i) => (
            <div key={num(f.id) ?? i} className="flex items-center justify-between gap-2 rounded-[11px] px-3 py-2" style={{ background: 'var(--bg-subtle)' }}>
              <p className="min-w-0 truncate text-[12.5px] font-[700]" style={{ color: 'var(--text-primary)' }}>{str(f.name) ?? `firewall ${i + 1}`}</p>
              <p className="shrink-0 text-[10.5px]" style={{ color: 'var(--text-disabled)' }}>
                {num(prop(f, 'rules_count')) !== null ? `${nf(num(prop(f, 'rules_count')) as number)} rules` : 'rules not reported'}
              </p>
            </div>
          ))}
        </div>
      )}
      {attached > 0 && <SampleNote text={`${attached} firewall${attached === 1 ? '' : 's'} on the account. Rules are read per firewall from the catalogue.`} />}
    </CcCard>
  );
}

/* ── Approvals waiting, and what has been done ────────────────────────────── */

function approvalLine(summary: HostingerApprovalSummary | undefined, fallback: string) {
  return str(summary?.summary) ?? fallback;
}

function PendingApprovals({ approvals, onChanged }: { approvals: HostingerPendingApproval[]; onChanged: () => Promise<void> }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const deny = async (id: string) => {
    if (!window.confirm('Refuse this approval? Nothing runs, and the decision is recorded.')) return;
    setBusy(id);
    setError(null);
    try {
      await api.superAdmin.hostingerDenyApproval(id);
      await onChanged();
    } catch (err) {
      setError(errorMessage(err, 'The approval could not be refused.'));
    } finally {
      setBusy(null);
    }
  };

  if (!approvals.length) return null;
  return (
    <Panel>
      <SectionLabel hint="Expire after five minutes">Waiting for your decision</SectionLabel>
      <div className="flex flex-col gap-1.5">
        {approvals.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[11px] px-3 py-2" style={{ background: 'var(--bg-subtle)' }}>
            <div className="min-w-0">
              <p className="flex items-center gap-2 truncate text-[12.5px] font-[700]" style={{ color: 'var(--text-primary)' }}>
                <SafetyBadge safety={a.safety} />{approvalLine(a.summary, a.operation)}
              </p>
              <p className="truncate text-[10.5px]" style={{ color: 'var(--text-disabled)' }}>
                {a.operation} · prepared {fmtWhen(a.created_at)} · expires {fmtWhen(a.expires_at)}
              </p>
            </div>
            <Button variant="outline" size="sm" loading={busy === a.id} iconLeft={<Undo2 size={13} />} onClick={() => { void deny(a.id); }}>
              Refuse
            </Button>
          </div>
        ))}
      </div>
      {error && <p className="mt-2 text-[12px]" style={{ color: '#b91c1c' }}>{error}</p>}
    </Panel>
  );
}

const HISTORY_LABEL: Record<string, string> = {
  'hostinger.credential.connect': 'Token connected',
  'hostinger.credential.rotate': 'Token rotated',
  'hostinger.credential.verify': 'Token verified',
  'hostinger.credential.revoke': 'Token revoked',
  'hostinger.read': 'Read an operation',
  'hostinger.plan': 'Approval prepared',
  'hostinger.execute': 'Operation run',
  'hostinger.deny': 'Approval refused',
  'hostinger.assistant.ask': 'Asked the assistant',
};

function HistoryCard({ rows: history, total, onReload }: { rows: HostingerHistoryRow[]; total: number; onReload: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <Panel>
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <SectionLabel hint={`${nf(total)} recorded`}>Operations history</SectionLabel>
        <Button variant="outline" size="sm" loading={busy} iconLeft={<RefreshCw size={13} />}
          onClick={() => { setBusy(true); void onReload().finally(() => setBusy(false)); }}>Refresh</Button>
      </div>
      {!history.length ? (
        <p className="py-6 text-center text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
          Nothing has been done through this console yet.
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {history.slice(0, 25).map((row) => (
            <div key={row.id} className="flex flex-wrap items-baseline justify-between gap-2 border-b py-1.5 last:border-b-0"
              style={{ borderColor: 'var(--border)' }}>
              <div className="min-w-0">
                <p className="truncate text-[12px] font-[650]" style={{ color: 'var(--text-primary)' }}>
                  {HISTORY_LABEL[row.action] ?? row.action}
                  {str(row.entity_id) ? <span className="font-mono text-[10.5px]" style={{ color: 'var(--text-disabled)' }}> · {str(row.entity_id)?.slice(0, 8)}</span> : null}
                </p>
                <p className="truncate text-[10.5px]" style={{ color: 'var(--text-disabled)' }}>
                  {str(row.user_name) ?? 'unknown operator'}{str(row.ip_address) ? ` · ${row.ip_address}` : ''}
                </p>
              </div>
              <p className="shrink-0 text-[10.5px]" style={{ color: 'var(--text-muted)' }}>{fmtWhen(row.created_at)}</p>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

/* ── The catalogue: what this console may call, and how it is classified ──── */

function CatalogueCard({ catalogue }: { catalogue: HostingerCatalogue }) {
  const [group, setGroup] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const operations = catalogue.operations.filter((op) =>
    (!group || op.group === group) &&
    (!query.trim() || `${op.id} ${op.summary}`.toLowerCase().includes(query.trim().toLowerCase())));

  return (
    <Panel>
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <SectionLabel hint={catalogue.spec?.version ? `API v${catalogue.spec.version}` : undefined}>
          The callable surface — {catalogue.operations.length} operations
        </SectionLabel>
        <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>{open ? 'Hide' : 'Browse'}</Button>
      </div>
      <p className="text-[11.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        This console can call exactly these operations — an allow-list checked against the official document, not a proxy.
        Reads run directly; the other two classes go through an approval you read first.
      </p>
      {open && (
        <>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <button type="button" onClick={() => setGroup(null)}
              className="min-h-[32px] rounded-full px-2.5 text-[11px] font-[700]"
              style={{ background: group === null ? 'var(--brand)' : 'var(--bg-subtle)', color: group === null ? '#fff' : 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              All
            </button>
            {catalogue.groups.map((g) => (
              <button key={g} type="button" onClick={() => setGroup(g)}
                className="min-h-[32px] rounded-full px-2.5 text-[11px] font-[700]"
                style={{ background: group === g ? 'var(--brand)' : 'var(--bg-subtle)', color: group === g ? '#fff' : 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                {g}
              </button>
            ))}
          </div>
          <SearchField
            label="Search operations"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mt-2"
          />
          <div className="mt-2 flex max-h-[420px] flex-col gap-1 overflow-y-auto">
            {operations.map((op) => (
              <div key={op.id} className="rounded-[10px] px-2.5 py-2" style={{ background: 'var(--bg-subtle)' }}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10.5px] font-[700]" style={{ color: 'var(--text-muted)' }}>{op.method}</span>
                  <span className="font-mono text-[11.5px]" style={{ color: 'var(--text-primary)' }}>{op.id}</span>
                  <SafetyBadge safety={op.safety} labels={catalogue.safetyLabels} />
                </div>
                <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>{op.summary} — <span className="font-mono">{op.path}</span></p>
              </div>
            ))}
            {!operations.length && <p className="py-4 text-center text-[12px]" style={{ color: 'var(--text-muted)' }}>No operation matches.</p>}
          </div>
        </>
      )}
    </Panel>
  );
}

/* ── The screen ───────────────────────────────────────────────────────────── */

export function HostingCentre({ onOpenMachine }: { onOpenMachine: (virtualMachineId: number) => void }) {
  const [status, setStatus] = useState<HostingerStatus | null>(null);
  const [dashboard, setDashboard] = useState<HostingerDashboard | null>(null);
  const [approvals, setApprovals] = useState<HostingerPendingApproval[]>([]);
  const [history, setHistory] = useState<{ rows: HostingerHistoryRow[]; total: number }>({ rows: [], total: 0 });
  const [catalogue, setCatalogue] = useState<HostingerCatalogue | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    setError(null);
    try {
      // The credential and the allow-list are cheap and always relevant; the
      // estate read is what can fail on a bad token, so it is caught separately
      // and the credential card still renders with its reason.
      const [nextStatus, nextCatalogue] = await Promise.all([
        api.superAdmin.hostingerStatus(),
        api.superAdmin.hostingerCatalogue().catch(() => null),
      ]);
      setStatus(nextStatus);
      if (nextCatalogue) setCatalogue(nextCatalogue);

      const nextDashboard = await api.superAdmin.hostingerDashboard(force);
      setDashboard(nextDashboard);
      if (nextDashboard.connected) {
        const [nextApprovals, nextHistory] = await Promise.all([
          api.superAdmin.hostingerApprovals().catch(() => ({ approvals: [] })),
          api.superAdmin.hostingerHistory({ limit: 50 }).catch(() => ({ rows: [], total: 0 })),
        ]);
        setApprovals(nextApprovals.approvals);
        setHistory(nextHistory);
      }
    } catch (err) {
      setError(errorMessage(err, 'The hosting console could not be loaded.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const refresh = useCallback(async () => { setRefreshing(true); await load(true); }, [load]);

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-2.5 py-16">
        <Loader2 size={22} className="animate-spin" style={{ color: 'var(--brand)' }} />
        <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>Reading the hosting estate…</p>
      </div>
    );
  }

  if (error && !status) return <ErrorState error={error} onRetry={() => { void load(); }} />;

  const connected = dashboard?.connected === true;

  return (
    <div className="flex flex-col gap-4">
      <Reveal>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
            {dashboard?.generated_at
              ? `Read ${fmtWhen(dashboard.generated_at)}${dashboard.cached ? ' (from the 15-second cache)' : ''} · upstream budget is 90 requests a minute, shared by every user of this token`
              : 'Reading the estate'}
          </p>
          <Button variant="outline" size="sm" loading={refreshing} iconLeft={<RefreshCw size={13} />} onClick={() => { void refresh(); }}>
            Refresh
          </Button>
        </div>
      </Reveal>

      {status && (
        <Reveal delay={0.04}>
          <CredentialCard status={status} onChanged={refresh} />
        </Reveal>
      )}

      {error && (
        <p className="text-[12px]" style={{ color: '#b91c1c' }}>
          <AlertTriangle size={13} className="mr-1.5 inline" />{error}
        </p>
      )}

      {connected && dashboard && (
        <>
          <Reveal delay={0.06}>
            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
              <CcStat label="Websites" value={nf(rows(slotData(dashboard.websites)).length)} sub={`SSL read for ${dashboard.sampled.ssl_checked}`} icon={<Globe2 size={14} />} tone="sky" />
              <CcStat label="Domains" value={nf(rows(slotData(dashboard.domains)).length)} sub="in the portfolio" icon={<Fingerprint size={14} />} tone="indigo" />
              <CcStat label="Machines" value={nf(rows(slotData(dashboard.vps)).length)} sub={`metrics for ${dashboard.sampled.metrics_checked}`} icon={<Server size={14} />} tone="green" />
              <CcStat label="Subscriptions" value={nf(rows(slotData(dashboard.subscriptions)).length)} sub="billing" icon={<CreditCard size={14} />} tone="orange" />
            </div>
          </Reveal>

          <Reveal delay={0.08}><WebsitesCard dashboard={dashboard} /></Reveal>
          <Reveal delay={0.10}><VpsCard dashboard={dashboard} onOpenMachine={onOpenMachine} /></Reveal>
          <Reveal delay={0.12}><DomainsCard dashboard={dashboard} /></Reveal>
          <Reveal delay={0.14}><BillingCard dashboard={dashboard} /></Reveal>
          <Reveal delay={0.16}><FirewallCard dashboard={dashboard} /></Reveal>

          <Reveal delay={0.18}>
            <PendingApprovals approvals={approvals} onChanged={refresh} />
          </Reveal>

          <Reveal delay={0.2}>
            <HistoryCard rows={history.rows} total={history.total} onReload={refresh} />
          </Reveal>
        </>
      )}

      {!connected && status && (
        <div className="rounded-[16px] p-4 text-[12.5px] leading-relaxed" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
          <p className="flex items-center gap-2 font-[700]" style={{ color: 'var(--text-primary)' }}>
            <Cloud size={15} /> {status.state === 'not_configured' ? 'Nothing to show yet' : 'Connect a token to read the estate'}
          </p>
          <p className="mt-1">
            {status.state === 'not_configured'
              ? 'The server has no HOSTINGER_TOKEN_KEY, so no token can be stored and no hosting call can be made. An operator with access to the deployment has to set it.'
              : 'Once a token is connected, this screen becomes the estate: websites and their SSL, domains and renewals, VPS machines with live metrics, backups, billing and firewalls.'}
          </p>
        </div>
      )}

      <Reveal delay={0.22}>
        <CapabilityGaps spec={catalogue?.spec} scope="estate" />
      </Reveal>

      {catalogue && (
        <Reveal delay={0.24}>
          <CatalogueCard catalogue={catalogue} />
        </Reveal>
      )}
    </div>
  );
}

export default HostingCentre;
