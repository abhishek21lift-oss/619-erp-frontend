'use client';

// The studio's support page: raise a ticket, read the thread, reply.
//
// Built alongside the Control Centre's Support tab rather than after it —
// an operator queue with no way for anyone to join it is a control with no
// wire attached, and the platform would be measuring an empty inbox.
//
// Internal operator notes never arrive here: the API that feeds this page
// filters them out in SQL and the type has no field for one. There is
// deliberately nothing in this file that could render one even if it did.

import { useCallback, useEffect, useState } from 'react';
import {
  LifeBuoy, Loader2, AlertTriangle, Plus, Send, ChevronLeft, CheckCircle2, X,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import Guard from '@/components/Guard';
import { api } from '@/lib/api';
import type { SupportTicket, TicketStatus, TicketPriority, TicketCategory } from '@/lib/api';
import { useToast } from '@/lib/toast';

const cardStyle = { background: 'var(--bg-card)', border: '1px solid var(--border)' } as const;

/* Studio-facing wording, deliberately different from the operator's. "Pending"
   means something different depending on which side of the desk you sit: to us
   it is "waiting on them", to them it is "they have replied". */
const STATUS: Record<TicketStatus, { label: string; bg: string; fg: string }> = {
  open:     { label: 'With support', bg: 'rgba(0,103,224,0.12)', fg: '#0067e0' },
  pending:  { label: 'Replied',      bg: 'rgba(16,185,129,0.12)', fg: '#059669' },
  resolved: { label: 'Resolved',     bg: 'rgba(16,185,129,0.12)', fg: '#059669' },
  closed:   { label: 'Closed',       bg: 'var(--bg-subtle)',      fg: 'var(--text-muted)' },
};

const CATEGORIES: { id: TicketCategory; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'billing', label: 'Billing' },
  { id: 'technical', label: 'Technical' },
  { id: 'bug', label: 'Something is broken' },
  { id: 'feature_request', label: 'Feature request' },
  { id: 'account', label: 'Account' },
];

const PRIORITIES: { id: TicketPriority; label: string; hint: string }[] = [
  { id: 'low', label: 'Low', hint: 'whenever you can' },
  { id: 'normal', label: 'Normal', hint: 'the usual' },
  { id: 'high', label: 'High', hint: 'blocking some work' },
  { id: 'urgent', label: 'Urgent', hint: 'we cannot operate' },
];

function fmtWhen(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

/* ── Thread ──────────────────────────────────────────────────────────────── */
function Thread({ id, onBack }: { id: string; onBack: () => void }) {
  const { toast } = useToast();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.support.ticket(id).then((r) => setTicket(r.data)).catch(() => setTicket(null));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const send = async () => {
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    try {
      await api.support.reply(id, text);
      setBody(''); load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not send your reply'); }
    finally { setBusy(false); }
  };

  if (!ticket) {
    return <div className="flex justify-center py-14"><Loader2 size={20} className="animate-spin" style={{ color: 'var(--brand)' }} /></div>;
  }

  const st = STATUS[ticket.status];
  const closed = ticket.status === 'closed';

  return (
    <div className="space-y-3">
      <button onClick={onBack} className="flex items-center gap-1 text-[12.5px] font-[650]" style={{ color: 'var(--brand)' }}>
        <ChevronLeft size={14} /> All requests
      </button>

      <div className="rounded-[16px] p-4" style={cardStyle}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-[14px] font-[750]" style={{ color: 'var(--text-primary)' }}>{ticket.subject}</p>
          <span className="rounded-[6px] px-2 py-0.5 text-[10.5px] font-[750]" style={{ background: st.bg, color: st.fg }}>
            {st.label}
          </span>
        </div>
        <p className="mt-0.5 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
          Raised {fmtWhen(ticket.created_at)} by {ticket.created_by_name || 'someone at your studio'}
        </p>
      </div>

      <div className="overflow-hidden rounded-[16px]" style={cardStyle}>
        <div className="space-y-2.5 p-4">
          {ticket.messages?.map((m) => {
            const us = m.author_side === 'studio';
            return (
              <div key={m.id} className={`flex ${us ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[85%] rounded-[12px] px-3 py-2"
                  style={us
                    ? { background: 'var(--brand-soft)', border: '1px solid var(--border)' }
                    : { background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                  <p className="mb-0.5 text-[10px] font-[750] uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>
                    {us ? (m.author_name || 'You') : 'MY PT STUDIO support'}
                  </p>
                  <p className="whitespace-pre-wrap text-[12.5px]" style={{ color: 'var(--text-primary)' }}>{m.body}</p>
                  <p className="mt-0.5 text-[10px]" style={{ color: 'var(--text-disabled)' }}>{fmtWhen(m.created_at)}</p>
                </div>
              </div>
            );
          })}
        </div>

        {closed ? (
          <p className="px-4 py-3 text-[11.5px]" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
            This request is closed. Raise a new one and we will pick it up.
          </p>
        ) : (
          <div className="p-4" style={{ borderTop: '1px solid var(--border)' }}>
            <textarea
              value={body} onChange={(e) => setBody(e.target.value)} rows={3}
              placeholder="Add to this request…" aria-label="Your reply"
              className="w-full resize-y rounded-[10px] px-2.5 py-2 text-[12.5px] outline-none"
              style={{ ...cardStyle, color: 'var(--text-primary)' }}
            />
            <button
              onClick={send} disabled={busy || !body.trim()}
              className="mt-2 flex h-10 items-center gap-1.5 rounded-[11px] px-4 text-[12.5px] font-[700] text-white disabled:opacity-50"
              style={{ background: 'var(--brand)' }}
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Send
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Composer ────────────────────────────────────────────────────────────── */
function NewTicket({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { toast } = useToast();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<TicketCategory>('general');
  const [priority, setPriority] = useState<TicketPriority>('normal');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await api.support.create({ subject: subject.trim(), body: body.trim(), category, priority });
      toast.success('Request sent — we will get back to you.');
      onCreated(); onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not send your request'); }
    finally { setBusy(false); }
  };

  const chip = (on: boolean) => (on
    ? { background: 'rgba(0,103,224,0.12)', color: '#0067e0', border: '1px solid rgba(0,103,224,0.25)' }
    : { background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border)' });

  return (
    <div className="rounded-[16px] p-4" style={cardStyle}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="text-[13px] font-[750]" style={{ color: 'var(--text-primary)' }}>New request</p>
        <button onClick={onClose} aria-label="Close" style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
      </div>

      <div className="space-y-3">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-[750] uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>Subject</span>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200}
            placeholder="Check-ins are failing on the QR scanner"
            className="h-10 rounded-[10px] px-2.5 text-[12.5px] outline-none" style={{ ...cardStyle, color: 'var(--text-primary)' }} />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-[750] uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>What is happening?</span>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={10000}
            placeholder="Tell us what you were doing and what happened instead."
            className="resize-y rounded-[10px] px-2.5 py-2 text-[12.5px] outline-none" style={{ ...cardStyle, color: 'var(--text-primary)' }} />
        </label>

        <div>
          <span className="text-[10px] font-[750] uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>Category</span>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button key={c.id} type="button" onClick={() => setCategory(c.id)} aria-pressed={category === c.id}
                className="min-h-[32px] rounded-[9px] px-2.5 text-[11.5px] font-[700]" style={chip(category === c.id)}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="text-[10px] font-[750] uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>How urgent?</span>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {PRIORITIES.map((p) => (
              <button key={p.id} type="button" onClick={() => setPriority(p.id)} aria-pressed={priority === p.id}
                title={p.hint}
                className="min-h-[32px] rounded-[9px] px-2.5 text-[11.5px] font-[700]" style={chip(priority === p.id)}>
                {p.label}
              </button>
            ))}
          </div>
          {/* The hint is shown, not just a tooltip — on a phone there is no
              hover, and "urgent" means nothing without a yardstick. */}
          <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {PRIORITIES.find((p) => p.id === priority)?.hint}
          </p>
        </div>
      </div>

      <button
        onClick={submit} disabled={busy || !subject.trim() || !body.trim()}
        className="mt-4 flex h-10 items-center gap-1.5 rounded-[11px] px-4 text-[12.5px] font-[700] text-white disabled:opacity-50"
        style={{ background: 'var(--brand)' }}
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Send request
      </button>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[] | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);

  const load = useCallback(() => {
    setError('');
    api.support.tickets()
      .then((r) => setTickets(r.data))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load your requests.'));
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <div>
          <h1 className="flex items-center gap-2 text-[19px] font-[800]" style={{ color: 'var(--text-primary)' }}>
            <LifeBuoy size={19} style={{ color: 'var(--brand)' }} /> Support
          </h1>
          <p className="mt-0.5 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
            Raise a request and we will reply here.
          </p>
        </div>

        {open ? (
          <Thread id={open} onBack={() => { setOpen(null); load(); }} />
        ) : (
          <>
            {!composing && (
              <button
                onClick={() => setComposing(true)}
                className="flex h-10 items-center gap-1.5 rounded-[11px] px-3.5 text-[12.5px] font-[700] text-white"
                style={{ background: 'var(--brand)' }}
              >
                <Plus size={14} /> New request
              </button>
            )}
            {composing && <NewTicket onClose={() => setComposing(false)} onCreated={load} />}

            {error && (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <AlertTriangle size={20} style={{ color: 'var(--danger)' }} />
                <p className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>{error}</p>
                <button onClick={load} className="text-[12px] font-[700]" style={{ color: 'var(--brand)' }}>Try again</button>
              </div>
            )}

            {!tickets && !error && (
              <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin" style={{ color: 'var(--brand)' }} /></div>
            )}

            {tickets?.length === 0 && !composing && (
              <div className="flex flex-col items-center gap-2 rounded-[16px] py-12 text-center" style={cardStyle}>
                <CheckCircle2 size={22} style={{ color: 'var(--success)' }} />
                <p className="text-[13px] font-[650]" style={{ color: 'var(--text-secondary)' }}>No open requests</p>
                <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>Anything you raise will appear here.</p>
              </div>
            )}

            {tickets && tickets.length > 0 && (
              <div className="overflow-hidden rounded-[16px]" style={cardStyle}>
                {tickets.map((t, i) => {
                  const st = STATUS[t.status];
                  return (
                    <button
                      key={t.id} onClick={() => setOpen(t.id)}
                      className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-[var(--bg-hover)]"
                      style={i ? { borderTop: '1px solid var(--border)' } : undefined}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="rounded-[6px] px-1.5 py-0.5 text-[10px] font-[750]" style={{ background: st.bg, color: st.fg }}>
                            {st.label}
                          </span>
                          <span className="truncate text-[12.5px] font-[700]" style={{ color: 'var(--text-primary)' }}>{t.subject}</span>
                        </div>
                        <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          {t.message_count} message{t.message_count === 1 ? '' : 's'} · updated {fmtWhen(t.updated_at)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

export default function Page() {
  return <Guard><SupportPage /></Guard>;
}
