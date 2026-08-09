'use client';

// Invitation management.
//
// One idea drives most of the UI here: the platform does not know the links it
// sent. Only the SHA-256 of each token is stored, so there is no link to read
// back. "Copy link" therefore ISSUES A NEW ONE and kills the old, and the
// button says so before it does it — an operator who copies a link expecting
// to see what the customer received, and instead silently breaks the email
// they are on the phone about, has been misled by the interface.
//
// The other is that a failed send has to be visible. Only an operator can
// resend, so an invitation that never arrived and looks fine is an unclaimed
// studio nobody is chasing.

import { useCallback, useEffect, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  Loader2, Mail, MailCheck, MailX, MailWarning, Link2, Ban, RotateCw,
  Clock, ShieldCheck, AlertTriangle, Search, ChevronDown, Copy, Check, History,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { Invitation, InvitationStatus, InvitationDetail } from '@/lib/api';
import { Panel, SectionLabel, StatTile, Reveal } from './console';
import { EmptyState } from '@/components/ui';
import { useToast } from '@/lib/toast';

/**
 * Status presentation. Each carries an ICON as well as a colour — a badge that
 * is only a colour is unreadable to a third of a percent of people and
 * indistinguishable in a screenshot pasted into a support thread.
 */
const STATUS: Record<InvitationStatus, { label: string; colour: string; bg: string; icon: React.ReactNode }> = {
  pending:   { label: 'Pending',   colour: 'var(--text-muted)', bg: 'var(--bg-subtle)',    icon: <Clock size={11} /> },
  sent:      { label: 'Sent',      colour: '#0067E0',           bg: 'rgba(0,103,224,0.12)', icon: <Mail size={11} /> },
  opened:    { label: 'Opened',    colour: '#0067E0',           bg: 'rgba(0,103,224,0.12)', icon: <MailCheck size={11} /> },
  activated: { label: 'Activated', colour: '#059669',           bg: 'rgba(5,150,105,0.12)', icon: <ShieldCheck size={11} /> },
  expired:   { label: 'Expired',   colour: '#D97706',           bg: 'rgba(217,119,6,0.12)', icon: <MailWarning size={11} /> },
  cancelled: { label: 'Cancelled', colour: '#DC2626',           bg: 'rgba(220,38,38,0.12)', icon: <MailX size={11} /> },
};

const FILTERS: Array<{ id: string; label: string }> = [
  { id: '', label: 'All' },
  { id: 'sent', label: 'Sent' },
  { id: 'opened', label: 'Opened' },
  { id: 'activated', label: 'Activated' },
  { id: 'expired', label: 'Expired' },
];

function Badge({ status }: { status: InvitationStatus }) {
  const s = STATUS[status] ?? STATUS.pending;
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-[6px] px-1.5 py-0.5 text-[10px] font-[750] uppercase"
      style={{ background: s.bg, color: s.colour, letterSpacing: '0.06em' }}
    >
      {s.icon}{s.label}
    </span>
  );
}

function fmtWhen(d?: string | null): string {
  if (!d) return '—';
  const mins = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/** Countdown while it is alive; how long ago once it is not. */
function fmtExpiry(iso: string, status: InvitationStatus): string {
  if (status === 'activated' || status === 'cancelled') return '—';
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'expired';
  const hrs = Math.floor(ms / 3600000);
  if (hrs >= 1) return `in ${hrs}h`;
  return `in ${Math.max(1, Math.round(ms / 60000))}m`;
}

/* ── One row ─────────────────────────────────────────────────────────────── */

function Row({ inv, onChanged }: { inv: Invitation; onChanged: () => void }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<InvitationDetail | null>(null);
  const [copied, setCopied] = useState(false);

  const terminal = inv.status === 'activated' || inv.status === 'cancelled';

  useEffect(() => {
    if (!open || detail) return;
    api.superAdmin.invitationEvents(inv.id).then((r) => setDetail(r.data)).catch(() => setDetail(null));
  }, [open, detail, inv.id]);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try { await fn(); } catch (e) {
      toast.error(e instanceof Error ? e.message : 'That did not work.');
    } finally { setBusy(null); }
  };

  const resend = () => run('resend', async () => {
    await api.superAdmin.resendInvitation(inv.id);
    toast.success(`A fresh invitation is on its way to ${inv.email}.`);
    onChanged();
  });

  const copyLink = () => run('link', async () => {
    // Spelled out because this is not the read-only action the label implies
    // anywhere else in the product.
    const ok = window.confirm(
      'Copying issues a NEW invitation link and immediately invalidates the one already emailed.\n\n'
      + 'The platform never stores the link it sent — only a hash of it — so there is no existing link to copy.\n\n'
      + 'Continue?'
    );
    if (!ok) return;
    const r = await api.superAdmin.invitationLink(inv.id);
    try {
      await navigator.clipboard.writeText(r.data.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      toast.success('New link copied. The previous one no longer works.');
    } catch {
      // Clipboard is blocked in some contexts; losing the freshly-minted link
      // to a silent failure would leave the operator with nothing and the
      // customer with a dead email.
      window.prompt('Copy this invitation link:', r.data.url);
    }
    onChanged();
  });

  const cancel = () => run('cancel', async () => {
    if (!window.confirm(`Cancel the invitation for ${inv.email}? The emailed link stops working immediately.`)) return;
    await api.superAdmin.cancelInvitation(inv.id);
    toast.success('Invitation cancelled.');
    onChanged();
  });

  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="flex flex-col gap-2.5 px-3.5 py-3 sm:px-4">
        <div className="flex items-start gap-2.5">
          <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="min-w-0 flex-1 text-left">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-[13px] font-[750]" style={{ color: 'var(--text-primary)' }}>
                {inv.studio_name || '—'}
              </span>
              <Badge status={inv.status} />
            </div>
            <p className="mt-0.5 truncate text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
              {inv.owner_name ? `${inv.owner_name} · ` : ''}{inv.email}
            </p>
          </button>
          <ChevronDown
            size={15}
            style={{
              color: 'var(--text-disabled)',
              transform: open ? 'rotate(180deg)' : 'none',
              transition: 'transform 200ms',
            }}
          />
        </div>

        {/* A failed send is the one thing on this screen an operator must not
            miss — nobody else can retry it. */}
        {inv.last_error && (
          <p
            className="flex items-start gap-1.5 rounded-[8px] px-2.5 py-2 text-[11.5px]"
            style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)' }}
          >
            <AlertTriangle size={12} className="mt-[2px] shrink-0" />
            <span className="min-w-0">Last delivery failed: {inv.last_error}</span>
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          <span>Created {fmtWhen(inv.created_at)}</span>
          <span>Expires {fmtExpiry(inv.expires_at, inv.status)}</span>
          {inv.send_attempts > 1 && <span>{inv.send_attempts} send attempts</span>}
        </div>

        {!terminal && (
          <div className="flex flex-wrap gap-1.5">
            {[
              { key: 'resend', label: 'Resend', icon: <RotateCw size={12} />, fn: resend },
              { key: 'link', label: copied ? 'Copied' : 'Copy link', icon: copied ? <Check size={12} /> : <Link2 size={12} />, fn: copyLink },
              { key: 'cancel', label: 'Cancel', icon: <Ban size={12} />, fn: cancel, danger: true },
            ].map((a) => (
              <button
                key={a.key}
                onClick={a.fn}
                disabled={busy !== null}
                className="flex items-center gap-1.5 rounded-[8px] px-2.5 py-1.5 text-[11.5px] font-[650] transition-opacity disabled:opacity-40"
                style={{
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border)',
                  color: a.danger ? 'var(--danger-text)' : 'var(--text-secondary)',
                }}
              >
                {busy === a.key ? <Loader2 size={12} className="animate-spin" /> : a.icon}
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-3.5 pb-3.5 sm:px-4">
              <div className="rounded-[11px] p-3" style={{ background: 'var(--bg-subtle)' }}>
                <p className="mb-2 flex items-center gap-1.5 text-[10px] font-[750] uppercase"
                  style={{ color: 'var(--text-muted)', letterSpacing: '0.12em' }}>
                  <History size={11} /> Email log
                </p>
                {!detail ? (
                  <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Loading…</p>
                ) : detail.events.length === 0 ? (
                  <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Nothing recorded yet.</p>
                ) : (
                  <ol className="flex flex-col gap-2">
                    {detail.events.map((e, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--brand)' }} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px]" style={{ color: 'var(--text-primary)' }}>{e.label}</p>
                          <p className="text-[10.5px]" style={{ color: 'var(--text-disabled)' }}>
                            {new Date(e.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                            {e.by ? ` · ${e.by}` : ''}
                            {e.meta ? ` · ${e.meta}` : ''}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Panel ───────────────────────────────────────────────────────────────── */

export default function InvitationsPanel() {
  const [rows, setRows] = useState<Invitation[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [smtpOk, setSmtpOk] = useState(true);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setError('');
    api.superAdmin.listInvitations({ status: status || undefined, q: q || undefined })
      .then((r) => { setRows(r.data); setCounts(r.counts); setSmtpOk(r.smtp_configured); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load invitations.'))
      .finally(() => setLoading(false));
  }, [status, q]);

  // Debounced so typing in the search box does not fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  if (loading && rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2.5 py-16">
        <Loader2 size={22} className="animate-spin" style={{ color: 'var(--brand)' }} />
        <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>Loading invitations…</p>
      </div>
    );
  }

  const pending = (counts.sent || 0) + (counts.opened || 0) + (counts.pending || 0);

  return (
    <div className="flex flex-col gap-5">
      {/* Without SMTP nothing here can send, and a studio created on the
          invite path would be unclaimable. The API refuses that, but the
          operator should know before they try. */}
      {!smtpOk && (
        <Reveal>
          <div
            className="flex items-start gap-2.5 rounded-[12px] p-3.5"
            style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)' }}
          >
            <AlertTriangle size={15} className="mt-[2px] shrink-0" style={{ color: 'var(--danger-text)' }} />
            <div>
              <p className="text-[12.5px] font-[700]" style={{ color: 'var(--danger-text)' }}>Email is not configured</p>
              <p className="mt-0.5 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                SMTP_HOST, SMTP_USER and SMTP_PASS are not all set on this deploy. Invitations cannot be
                sent or resent until they are — new studios must be created with a password instead.
              </p>
            </div>
          </div>
        </Reveal>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Awaiting activation" value={pending} icon={<Mail size={15} />}
          tone={pending > 0 ? 'caution' : 'neutral'} sub="Sent, not yet used" delay={0} />
        <StatTile label="Activated" value={counts.activated || 0} icon={<ShieldCheck size={15} />}
          tone="positive" sub="Studios now live" delay={0.04} />
        <StatTile label="Expired" value={counts.expired || 0} icon={<MailWarning size={15} />}
          tone={(counts.expired || 0) > 0 ? 'caution' : 'neutral'} sub="Need a fresh invitation" delay={0.08} />
        <StatTile label="Cancelled" value={counts.cancelled || 0} icon={<MailX size={15} />}
          tone="neutral" sub="Revoked or superseded" delay={0.12} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-disabled)' }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search studio, owner or email"
            aria-label="Search invitations"
            className="h-9 w-full rounded-[10px] pl-8 pr-3 text-[12.5px] outline-none"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setStatus(f.id)}
              className="rounded-[8px] px-2.5 py-1.5 text-[11.5px] font-[700]"
              style={{
                background: status === f.id ? 'var(--brand)' : 'var(--bg-subtle)',
                color: status === f.id ? '#fff' : 'var(--text-muted)',
                border: '1px solid var(--border)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <SectionLabel hint={`${rows.length} shown`}>Invitations</SectionLabel>
        <Reveal>
          <Panel padded={false} className="overflow-hidden">
            {error ? (
              <div className="p-5">
                <EmptyState icon={<AlertTriangle size={20} />} title="Could not load invitations" description={error} />
              </div>
            ) : rows.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  icon={<Mail size={20} />}
                  title={q || status ? 'Nothing matches that filter' : 'No invitations yet'}
                  description={q || status
                    ? 'Try a different search or status.'
                    : 'Create a studio without setting a password and its owner is invited by email automatically.'}
                />
              </div>
            ) : (
              rows.map((inv) => <Row key={inv.id} inv={inv} onChanged={load} />)
            )}
          </Panel>
        </Reveal>
      </div>

      <p className="flex items-start gap-1.5 text-[10.5px]" style={{ color: 'var(--text-disabled)' }}>
        <Copy size={11} className="mt-0.5 shrink-0" />
        Invitation links are stored only as a hash, so the platform cannot show one it already sent.
        Copying a link issues a new one and invalidates the old.
      </p>
    </div>
  );
}
