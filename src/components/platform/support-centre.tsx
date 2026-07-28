'use client';

// Support Centre — the platform's side of conversations studios start.
//
// ── The one thing this UI must get right ─────────────────────────────────────
//
// Internal notes and real replies are composed in the same box, and sending the
// wrong kind is unrecoverable: a note meant for other operators lands in the
// customer's thread. So the two modes are never a subtle toggle — the composer
// changes colour, changes its button label, and says who will see it, every
// time. Internal messages in the transcript carry the same amber treatment, so
// an operator scanning a thread can never mistake one for something the studio
// has read.

import { useCallback, useEffect, useState } from 'react';
import {
  LifeBuoy, Loader2, AlertTriangle, Clock, Send, EyeOff, Inbox,
  CheckCircle2, ChevronLeft, Building2, Timer,
} from 'lucide-react';
import { api } from '@/lib/api';
import type {
  SupportTicket, SupportOverview, TicketStatus, TicketPriority,
} from '@/lib/api';
import { Panel, SectionLabel, StatTile, Reveal } from './console';
import { useToast } from '@/lib/toast';

const cardStyle = { background: 'var(--bg-card)', border: '1px solid var(--border)' } as const;

const STATUS: Record<TicketStatus, { label: string; bg: string; fg: string }> = {
  open:     { label: 'Open',     bg: 'rgba(239,68,68,0.12)',  fg: '#dc2626' },
  pending:  { label: 'Pending',  bg: 'rgba(99,102,241,0.12)', fg: '#6366f1' },
  resolved: { label: 'Resolved', bg: 'rgba(16,185,129,0.12)', fg: '#059669' },
  closed:   { label: 'Closed',   bg: 'var(--bg-subtle)',      fg: 'var(--text-muted)' },
};

const PRIORITY: Record<TicketPriority, { label: string; fg: string }> = {
  urgent: { label: 'Urgent', fg: '#dc2626' },
  high:   { label: 'High',   fg: '#b45309' },
  normal: { label: 'Normal', fg: 'var(--text-muted)' },
  low:    { label: 'Low',    fg: 'var(--text-disabled)' },
};

function fmtWhen(iso: string | null | undefined) {
  if (!iso) return '—';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

function fmtHours(h: number | null) {
  if (h === null) return '—';
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 48) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

/* ── One thread ──────────────────────────────────────────────────────────── */
function Thread({ id, onBack, onChanged }: { id: string; onBack: () => void; onChanged: () => void }) {
  const { toast } = useToast();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [body, setBody] = useState('');
  const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.superAdmin.supportTicket(id)
      .then((r) => setTicket(r.data))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load the ticket.'));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const send = async () => {
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    try {
      await api.superAdmin.replyToTicket(id, text, internal);
      toast.success(internal ? 'Internal note added — the studio cannot see it.' : 'Reply sent to the studio.');
      setBody('');
      load(); onChanged();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not send'); }
    finally { setBusy(false); }
  };

  const patch = async (p: Parameters<typeof api.superAdmin.updateTicket>[1]) => {
    setBusy(true);
    try {
      await api.superAdmin.updateTicket(id, p);
      load(); onChanged();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not update'); }
    finally { setBusy(false); }
  };

  if (error) {
    return (
      <Panel>
        <button onClick={onBack} className="mb-2 flex items-center gap-1 text-[12px] font-[650]" style={{ color: 'var(--brand)' }}>
          <ChevronLeft size={13} /> Back
        </button>
        <p className="py-6 text-center text-[12.5px]" style={{ color: 'var(--danger)' }}>{error}</p>
      </Panel>
    );
  }
  if (!ticket) {
    return <Panel><div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin" style={{ color: 'var(--brand)' }} /></div></Panel>;
  }

  const st = STATUS[ticket.status];
  const closed = ticket.status === 'closed';

  return (
    <div className="space-y-3">
      <button onClick={onBack} className="flex items-center gap-1 text-[12px] font-[650]" style={{ color: 'var(--brand)' }}>
        <ChevronLeft size={13} /> All tickets
      </button>

      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[14px] font-[750]" style={{ color: 'var(--text-primary)' }}>{ticket.subject}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
              <span className="flex items-center gap-1"><Building2 size={11} />{ticket.organization_name}</span>
              <span>· {ticket.plan_code || 'no plan'}</span>
              <span>· raised by {ticket.created_by_name || '—'} {fmtWhen(ticket.created_at)}</span>
            </p>
          </div>
          <span className="shrink-0 rounded-[6px] px-2 py-0.5 text-[10.5px] font-[750]" style={{ background: st.bg, color: st.fg }}>
            {st.label}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={ticket.status} disabled={busy}
            onChange={(e) => patch({ status: e.target.value as TicketStatus })}
            aria-label="Ticket status"
            className="h-8 rounded-[9px] px-2 text-[11.5px] outline-none"
            style={{ ...cardStyle, color: 'var(--text-primary)' }}
          >
            {(Object.keys(STATUS) as TicketStatus[]).map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
          </select>
          <select
            value={ticket.priority} disabled={busy}
            onChange={(e) => patch({ priority: e.target.value as TicketPriority })}
            aria-label="Ticket priority"
            className="h-8 rounded-[9px] px-2 text-[11.5px] outline-none"
            style={{ ...cardStyle, color: 'var(--text-primary)' }}
          >
            {(Object.keys(PRIORITY) as TicketPriority[]).map((p) => <option key={p} value={p}>{PRIORITY[p].label}</option>)}
          </select>
          <span className="text-[11px]" style={{ color: 'var(--text-disabled)' }}>
            {ticket.assigned_to_name ? `Owned by ${ticket.assigned_to_name}` : 'Unassigned'}
          </span>
        </div>
      </Panel>

      <Panel padded={false}>
        <div className="space-y-2.5 p-3.5 sm:p-5">
          {ticket.messages?.map((m) => {
            const mine = m.author_side === 'platform';
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[85%] rounded-[12px] px-3 py-2"
                  style={m.is_internal
                    // Internal notes are unmistakable in the transcript — an
                    // operator must never scan past one thinking the studio
                    // has read it.
                    ? { background: 'rgba(245,158,11,0.12)', border: '1px dashed rgba(245,158,11,0.5)' }
                    : mine
                      ? { background: 'var(--brand-soft)', border: '1px solid var(--border)' }
                      : { background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
                >
                  <p className="mb-0.5 flex items-center gap-1.5 text-[10px] font-[750] uppercase tracking-wider"
                    style={{ color: m.is_internal ? '#b45309' : 'var(--text-disabled)' }}>
                    {m.is_internal && <EyeOff size={9} />}
                    {m.is_internal ? 'Internal note — not visible to the studio' : (m.author_name || (mine ? 'Platform' : 'Studio'))}
                  </p>
                  <p className="whitespace-pre-wrap text-[12.5px]" style={{ color: 'var(--text-primary)' }}>{m.body}</p>
                  <p className="mt-0.5 text-[10px]" style={{ color: 'var(--text-disabled)' }}>{fmtWhen(m.created_at)}</p>
                </div>
              </div>
            );
          })}
        </div>

        {closed ? (
          <p className="px-3.5 py-3 text-[11.5px] sm:px-5" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
            This ticket is closed. Reopen it above to reply.
          </p>
        ) : (
          <div className="p-3.5 sm:p-5" style={{ borderTop: '1px solid var(--border)' }}>
            {/* The composer restates who will see this on every keystroke —
                the mode is never something you have to remember. */}
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} className="h-4 w-4" />
                <span className="text-[12px] font-[650]" style={{ color: internal ? '#b45309' : 'var(--text-secondary)' }}>
                  Internal note
                </span>
              </label>
              <span className="text-[11px] font-[650]" style={{ color: internal ? '#b45309' : 'var(--text-muted)' }}>
                {internal ? 'Only platform operators will see this.' : 'The studio will see this.'}
              </span>
            </div>
            <textarea
              value={body} onChange={(e) => setBody(e.target.value)} rows={3}
              placeholder={internal ? 'A note for other operators…' : 'Reply to the studio…'}
              aria-label={internal ? 'Internal note' : 'Reply to the studio'}
              className="w-full resize-y rounded-[10px] px-2.5 py-2 text-[12.5px] outline-none"
              style={internal
                ? { background: 'rgba(245,158,11,0.06)', border: '1px dashed rgba(245,158,11,0.5)', color: 'var(--text-primary)' }
                : { ...cardStyle, color: 'var(--text-primary)' }}
            />
            <button
              onClick={send} disabled={busy || !body.trim()}
              className="mt-2 flex h-9 items-center gap-1.5 rounded-[10px] px-3 text-[12px] font-[700] text-white disabled:opacity-50"
              style={{ background: internal ? '#b45309' : 'var(--brand)' }}
            >
              {busy ? <Loader2 size={12} className="animate-spin" /> : internal ? <EyeOff size={12} /> : <Send size={12} />}
              {internal ? 'Add internal note' : 'Send to studio'}
            </button>
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ── Panel ───────────────────────────────────────────────────────────────── */
const FILTERS = [
  { id: 'open', label: 'Open' },
  { id: 'pending', label: 'Pending' },
  { id: '', label: 'All' },
];

export default function SupportCentre() {
  const [overview, setOverview] = useState<SupportOverview | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [status, setStatus] = useState('open');
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setError('');
    Promise.all([
      api.superAdmin.supportOverview(),
      api.superAdmin.supportTickets({
        status: status || undefined,
        unassigned: unassignedOnly ? 'true' : undefined,
      }),
    ])
      .then(([o, t]) => { setOverview(o.data); setTickets(t.data); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load support tickets.'))
      .finally(() => setLoading(false));
  }, [status, unassignedOnly]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-2.5 py-16">
        <Loader2 size={22} className="animate-spin" style={{ color: 'var(--brand)' }} />
        <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>Loading tickets…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-center gap-2.5 py-16 text-center">
        <AlertTriangle size={22} style={{ color: 'var(--danger)' }} />
        <p className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>{error}</p>
        <button onClick={load} className="mt-1 text-[12px] font-[700]" style={{ color: 'var(--brand)' }}>Try again</button>
      </div>
    );
  }

  if (open) return <Thread id={open} onBack={() => setOpen(null)} onChanged={load} />;

  const o = overview!;

  return (
    <div className="space-y-5">
      {o.awaiting_first_reply > 0 && (
        // The worst state a support function can be in, so it gets a banner
        // rather than hiding inside the "open" count.
        <div className="rounded-[14px] p-3.5" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <p className="flex items-start gap-2 text-[12.5px] font-[700]" style={{ color: '#dc2626' }}>
            <Clock size={15} className="mt-0.5 shrink-0" />
            {o.awaiting_first_reply} ticket{o.awaiting_first_reply === 1 ? ' has' : 's have'} never had a reply.
          </p>
        </div>
      )}

      <div>
        <SectionLabel>Queue</SectionLabel>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label="Open" value={String(o.open)} sub={`${o.pending} awaiting the studio`}
            icon={<Inbox size={15} />} tone={o.open > 0 ? 'critical' : 'positive'} />
          <StatTile label="Unassigned" value={String(o.unassigned)} sub="nobody owns these"
            icon={<LifeBuoy size={15} />} tone={o.unassigned > 0 ? 'caution' : 'neutral'} delay={0.04} />
          <StatTile label="Median first reply" value={fmtHours(o.median_first_response_hours)}
            sub="how long a studio waits" icon={<Timer size={15} />} tone="brand" delay={0.08} />
          <StatTile label="Median resolution" value={fmtHours(o.median_resolution_hours)}
            sub={`${o.resolved + o.closed} resolved all time`} icon={<CheckCircle2 size={15} />}
            tone="positive" delay={0.12} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-[11px] p-1" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
          {FILTERS.map((f) => (
            <button
              key={f.id} onClick={() => setStatus(f.id)}
              className="min-h-[32px] rounded-[8px] px-2.5 text-[11px] font-[700] transition-colors"
              style={status === f.id
                ? { background: 'var(--bg-card)', color: 'var(--text-primary)', boxShadow: '0 1px 3px rgba(15,23,42,0.10)' }
                : { color: 'var(--text-muted)' }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setUnassignedOnly((v) => !v)} aria-pressed={unassignedOnly}
          className="flex h-10 items-center gap-1.5 rounded-[11px] px-3 text-[12px] font-[700]"
          style={unassignedOnly
            ? { background: 'rgba(245,158,11,0.12)', color: '#b45309', border: '1px solid rgba(245,158,11,0.28)' }
            : { ...cardStyle, color: 'var(--text-secondary)' }}
        >
          Unassigned only
        </button>
      </div>

      <Reveal delay={0.06}>
        <Panel padded={false}>
          {tickets.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-14 text-center">
              <CheckCircle2 size={22} style={{ color: 'var(--success)' }} />
              <p className="text-[13px] font-[650]" style={{ color: 'var(--text-secondary)' }}>Nothing waiting</p>
              <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>No ticket matches this filter.</p>
            </div>
          ) : tickets.map((t) => {
            const st = STATUS[t.status]; const pr = PRIORITY[t.priority];
            return (
              <button
                key={t.id} onClick={() => setOpen(t.id)}
                className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-[var(--bg-hover)]"
                style={{ borderTop: '1px solid var(--border)' }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="rounded-[6px] px-1.5 py-0.5 text-[10px] font-[750]" style={{ background: st.bg, color: st.fg }}>
                      {st.label}
                    </span>
                    {(t.priority === 'urgent' || t.priority === 'high') && (
                      <span className="text-[10px] font-[750] uppercase" style={{ color: pr.fg }}>{pr.label}</span>
                    )}
                    <span className="truncate text-[12.5px] font-[700]" style={{ color: 'var(--text-primary)' }}>{t.subject}</span>
                  </div>
                  <p className="mt-0.5 truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {t.organization_name} · {t.message_count} message{t.message_count === 1 ? '' : 's'}
                    {!t.assigned_to_name && ' · unassigned'}
                    {t.first_response_at === null && ' · never answered'}
                  </p>
                </div>
                <span className="shrink-0 text-[10.5px]" style={{ color: 'var(--text-disabled)' }}>{fmtWhen(t.updated_at)}</span>
              </button>
            );
          })}
        </Panel>
      </Reveal>
    </div>
  );
}
