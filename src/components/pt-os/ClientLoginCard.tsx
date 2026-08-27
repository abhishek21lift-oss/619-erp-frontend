'use client';

/**
 * Client login, on the trainer's client profile.
 *
 * Three shapes, and which one shows is decided by the server, not here:
 *
 *   Not eligible   a quiet strip saying why. Not a disabled button — a button
 *                  you cannot press is a question the reader has to answer
 *                  themselves ("is this broken, or am I missing something?"),
 *                  and the server already knows the answer.
 *   Eligible       the activation card, with what happens spelled out.
 *   Activated      the account's state, plus resend / deactivate.
 *
 * `can_activate` and `blocked_message` come off the API. The rule they encode
 * — a login is what somebody gets for having paid — is enforced server-side on
 * every call anyway, so re-deriving it here would give two implementations of
 * the same rule and one of them would eventually be the wrong one. This
 * component renders the answer; it does not compute it.
 */

import { useCallback, useEffect, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  KeyRound, Loader2, MailCheck, ShieldCheck, ShieldOff, Send, Clock,
  AlertTriangle, Lock, CheckCircle2, Info,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { ClientLoginStatus } from '@/lib/api';
import { palette, rgba } from '@/lib/palette';

const C = {
  primary: palette.blue[500],
  success: palette.emerald[500],
  warning: palette.amber[500],
  danger: palette.red[500],
};

const EASE = [0.16, 1, 0.3, 1] as const;

/** "12 Mar, 4:05 pm", or an em dash. Never "Invalid Date". */
function when(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  });
}

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-[11px] font-[650] uppercase tracking-[0.07em]" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <span className="text-right text-[12.5px] font-[650]" style={{ color: tone || 'var(--text-primary)' }}>
        {value}
      </span>
    </div>
  );
}

function Button({ onClick, busy, children, tone = C.primary, subtle = false, disabled }: {
  onClick: () => void; busy?: boolean; children: React.ReactNode;
  tone?: string; subtle?: boolean; disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[11px] px-3 text-[12.5px] font-[720] transition-opacity disabled:opacity-45"
      style={subtle
        ? { background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: tone }
        : { background: tone, color: '#fff' }}
    >
      {busy ? <Loader2 size={14} className="animate-spin" /> : children}
    </button>
  );
}

export default function ClientLoginCard({ clientId }: { clientId: string }) {
  const [status, setStatus] = useState<ClientLoginStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'activate' | 'resend' | 'deactivate' | null>(null);
  const [note, setNote] = useState<{ tone: string; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api.clientLogin.status(clientId);
      setStatus(r.data);
    } catch {
      // A status read that fails must not blank the profile page around it.
      // The card simply does not render, which is the same outcome as the
      // feature being unavailable.
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { void load(); }, [load]);

  const run = useCallback(async (
    kind: 'activate' | 'resend' | 'deactivate',
    fn: () => Promise<{ data: ClientLoginStatus; email_sent?: boolean }>,
  ) => {
    setBusy(kind); setNote(null);
    try {
      const r = await fn();
      setStatus(r.data);
      if (kind === 'deactivate') {
        setNote({ tone: C.warning, text: 'Login disabled. Every open session was signed out.' });
      } else if (r.email_sent === false) {
        // The account and the link exist either way. Saying so matters: without
        // it a failed send reads as "activation failed" and the trainer presses
        // Activate again instead of Resend.
        setNote({ tone: C.warning, text: 'The login was created but the email could not be sent. Try Resend.' });
      } else {
        setNote({ tone: C.success, text: 'Activation email sent. The link works once and expires.' });
      }
    } catch (err: unknown) {
      setNote({ tone: C.danger, text: err instanceof Error ? err.message : 'That did not work.' });
      // Re-read rather than trust local state: a 409 usually means the server
      // knows something this card does not.
      void load();
    } finally {
      setBusy(null);
    }
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-[16px] px-4 py-4"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <Loader2 size={14} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
        <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Checking login…</span>
      </div>
    );
  }
  if (!status) return null;

  const locked = !!status.locked_until && new Date(status.locked_until).getTime() > Date.now();
  const active = status.login_activated && status.login_enabled;
  const invitePending = !status.login_activated && status.invitation?.status === 'sent';

  // ── Not eligible, and no account yet ──────────────────────────────────────
  if (!status.login_activated && !status.can_activate && !invitePending) {
    return (
      <div className="flex items-start gap-2.5 rounded-[16px] px-4 py-3.5"
        style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
        <Info size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
        <div className="min-w-0">
          <p className="text-[12.5px] font-[700]" style={{ color: 'var(--text-primary)' }}>Client login</p>
          <p className="mt-0.5 text-[11.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {status.blocked_message || 'Not available for this client yet.'}
          </p>
        </div>
      </div>
    );
  }

  const tone = active ? C.success : invitePending ? C.warning : C.primary;

  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="overflow-hidden rounded-[16px]"
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${rgba(tone, 0.22)}`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)',
      }}
    >
      <div className="flex items-center gap-2.5 px-4 py-3"
        style={{ background: `linear-gradient(135deg, ${rgba(tone, 0.10)}, transparent)` }}>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px]"
          style={{ background: rgba(tone, 0.14), color: tone }}>
          {active ? <ShieldCheck size={16} /> : invitePending ? <Send size={15} /> : <KeyRound size={15} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-[790]" style={{ color: 'var(--text-primary)' }}>Client login</p>
          <p className="text-[11px] font-[600]" style={{ color: tone }}>
            {active ? 'Active' : invitePending ? 'Invitation sent — waiting for them to set a password' : 'Not set up'}
          </p>
        </div>
        {locked && (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9.5px] font-[750] uppercase tracking-[0.07em]"
            style={{ background: rgba(C.danger, 0.12), color: C.danger }}>
            <Lock size={9} /> Locked
          </span>
        )}
      </div>

      <div className="px-4 pb-4">
        {!status.login_activated && !invitePending && (
          <p className="mb-3 text-[12px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Sends {status.login_email || 'this client'} a one-time link to create their own password. They&rsquo;ll be able to
            see their workouts, diet, progress, attendance and payments — nothing else about the studio.
            {/* Stated because a trainer reasonably wonders, and because the
                answer is a security property worth advertising. */}
            {' '}No password is ever sent by email.
          </p>
        )}

        {(status.login_activated || invitePending) && (
          <div className="mb-3 rounded-[12px] px-3 py-1.5" style={{ background: 'var(--bg-subtle)' }}>
            <Row label="Email" value={status.login_email || '—'} />
            <Row
              label="Status"
              value={active ? 'Active' : status.login_activated ? 'Disabled' : 'Awaiting activation'}
              tone={active ? C.success : status.login_activated ? C.warning : C.primary}
            />
            <Row
              label="Email verified"
              value={status.email_verified_at ? when(status.email_verified_at) : 'Not yet'}
              tone={status.email_verified_at ? C.success : undefined}
            />
            <Row label="Last sign-in" value={status.last_login_at ? when(status.last_login_at) : 'Never'} />
            <Row label="Invite sent" value={when(status.activation_sent_at)} />
            {status.invitation?.expires_at && !status.login_activated && (
              <Row label="Link expires" value={when(status.invitation.expires_at)} tone={C.warning} />
            )}
            {locked && (
              <Row label="Locked until" value={when(status.locked_until)} tone={C.danger} />
            )}
          </div>
        )}

        {status.invitation?.last_error && !status.login_activated && (
          <p className="mb-3 flex items-start gap-1.5 rounded-[10px] px-2.5 py-2 text-[11.5px] leading-relaxed"
            style={{ background: rgba(C.danger, 0.08), color: C.danger }}>
            <AlertTriangle size={12} className="mt-0.5 shrink-0" />
            Last send failed: {status.invitation.last_error}
          </p>
        )}

        <AnimatePresence>
          {note && (
            <m.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              role="status"
              className="mb-3 flex items-start gap-1.5 overflow-hidden rounded-[10px] px-2.5 py-2 text-[11.5px] leading-relaxed"
              style={{ background: rgba(note.tone, 0.09), color: note.tone }}
            >
              <CheckCircle2 size={12} className="mt-0.5 shrink-0" />
              {note.text}
            </m.p>
          )}
        </AnimatePresence>

        <div className="flex gap-2">
          {!status.login_activated && !invitePending && (
            <Button
              onClick={() => run('activate', () => api.clientLogin.activate(clientId))}
              busy={busy === 'activate'}
              disabled={!status.can_activate}
            >
              <KeyRound size={13} /> Activate client login
            </Button>
          )}

          {(status.login_activated || invitePending) && (
            <Button
              onClick={() => run('resend', () => api.clientLogin.resend(clientId))}
              busy={busy === 'resend'}
              subtle
            >
              <MailCheck size={13} />
              {/* On an active account this is a password reset in everything
                  but name — it invalidates the current password. The label
                  says so rather than hiding it behind "Resend". */}
              {status.login_activated ? 'Send password reset' : 'Resend link'}
            </Button>
          )}

          {status.login_activated && (
            <Button
              onClick={() => run('deactivate', () => api.clientLogin.deactivate(clientId))}
              busy={busy === 'deactivate'}
              tone={C.danger}
              subtle
            >
              <ShieldOff size={13} /> Disable
            </Button>
          )}
        </div>

        {invitePending && (
          <p className="mt-2.5 flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            <Clock size={10} /> They have not opened the link yet. Resending cancels the old one.
          </p>
        )}
      </div>
    </m.div>
  );
}
