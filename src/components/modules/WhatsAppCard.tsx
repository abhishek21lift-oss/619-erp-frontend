'use client';

// Settings → Integrations → WhatsApp.
//
// Modelled directly on GoogleCalendarCard in the integrations page: same
// `glass` surface, same status colours, same 44px icon tile, same
// framer-motion entrance. That is deliberate — this card sits in the same grid
// as that one, and a card that styled itself would read as a different product.
//
// ── The one place it deviates ───────────────────────────────────────────────
//
// It shows a risk disclosure before the first QR. Every other integration on
// this page is "paste an API key"; this one links a studio owner's personal
// WhatsApp account to an unofficial client, and Meta can ban that number
// permanently with no appeal. Consent has to be informed to be consent, so the
// warning is on the path to the QR rather than in a tooltip.

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import qrcode from 'qrcode-generator';
import {
  MessageSquare, Loader2, Link2, Unlink, RefreshCw, CheckCircle2,
  AlertTriangle, X, Smartphone,
} from 'lucide-react';
import { api } from '@/lib/api';
// From '@/lib/http' rather than '@/lib/api', matching the eight other
// components that need it. '@/lib/api' re-exports only `http` and the role
// helpers, and its export list is pinned by api-shape.test.ts — widening it to
// save one import line would be a change to a surface 142 files depend on.
import { ApiError } from '@/lib/http';
import { useDialogA11y } from '@/hooks/useDialogA11y';
import type { WhatsAppStatus, WhatsAppState } from '@/lib/api';

const glass = {
  background: 'var(--bg-card)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid var(--border)',
  boxShadow: 'var(--shadow-card)',
} as const;

/** The communication accent, matching catColor.communication on the page. */
const ACCENT = '#10b981';

/**
 * How each state reads to a studio owner.
 *
 * Written as sentences a non-technical person can act on, not as the state
 * names. "qr_timeout" means nothing to a gym owner; "Nobody scanned the code"
 * tells them what to do next.
 */
const STATE_COPY: Record<WhatsAppState, { label: string; colour: string; hint?: string }> = {
  never_connected: { label: 'Not connected', colour: 'var(--text-disabled)' },
  connecting:      { label: 'Waiting for scan', colour: '#f59e0b' },
  connected:       { label: 'Connected', colour: ACCENT },
  disconnected:    { label: 'Disconnected', colour: '#f59e0b', hint: 'Reconnect to start again — no new QR needed.' },
  reconnecting:    { label: 'Reconnecting…', colour: '#f59e0b' },
  logged_out:      { label: 'Signed out on the phone', colour: '#ef4444', hint: 'Scan a new QR code to reconnect.' },
  qr_timeout:      { label: 'Code expired', colour: '#f59e0b', hint: 'Nobody scanned the code in time.' },
  failed:          { label: 'Connection failed', colour: '#ef4444', hint: 'Try reconnecting. If it keeps failing, check with support.' },
};

/** Poll cadence while the pairing modal is open. See §3.2 — 30 requests, once. */
const QR_POLL_MS = 2000;
/** Poll cadence for status while waiting for a scan. */
const STATUS_POLL_MS = 3000;

function fmtDate(iso?: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '';
  }
}

/**
 * Mask all but the last four digits.
 *
 * The number belongs to the studio and they know it — showing it in full adds
 * nothing and puts a personal mobile number on a screen that may be open in a
 * gym reception, or in a screen-share with support.
 */
function maskPhone(e164: string | null): string {
  if (!e164) return '';
  const digits = e164.replace(/\D/g, '');
  if (digits.length < 5) return e164;
  return `+${digits.slice(0, digits.length - 4).replace(/./g, '·')}${digits.slice(-4)}`;
}

export default function WhatsAppCard() {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | 'risk' | 'pairing'>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | 'connect' | 'reconnect' | 'disconnect' | 'unlink'>(null);
  const [confirmUnlink, setConfirmUnlink] = useState(false);

  // Guards every setState that follows an await. Without it, closing the modal
  // mid-poll updates a component that is on its way out and React warns.
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const next = await api.whatsapp.status();
      if (alive.current) setStatus(next);
      return next;
    } catch {
      // A failed status read is not an error state — the card keeps showing
      // what it last knew rather than replacing the page with a failure.
      if (alive.current) {
        setStatus((prev) => prev ?? {
          state: 'never_connected', phone_e164: null, configured: true, stale: true,
        });
      }
      return null;
    } finally {
      if (alive.current) setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  // ── Pairing: poll for the QR, and for the moment it is scanned ────────────
  useEffect(() => {
    if (modal !== 'pairing') return undefined;

    let cancelled = false;

    const tickQr = async () => {
      try {
        const next = await api.whatsapp.qr();
        if (cancelled || !alive.current) return;
        setQr(next.qr);
        setQrError(null);
      } catch (err: unknown) {
        if (cancelled || !alive.current) return;
        // 410 is the expected end of a pairing attempt nobody completed, not a
        // fault — it gets its own copy rather than a generic error.
        const code = err instanceof ApiError ? err.code : undefined;
        if (code === 'QR_EXPIRED') {
          setQr(null);
          setQrError('The code expired. Press "Show a new code" to try again.');
        } else if (code === 'INSTANCE_CONFLICT') {
          setQr(null);
          setQrError(null);
        } else {
          setQrError('Could not reach the WhatsApp service. Retrying…');
        }
      }
    };

    const tickStatus = async () => {
      const next = await refresh();
      if (cancelled || !alive.current) return;
      // Close the modal the moment pairing succeeds — leaving a scanned QR on
      // screen invites a second scan, which WhatsApp treats as replacing the
      // device that just linked.
      if (next && next.state === 'connected') setModal(null);
    };

    void tickQr();
    const qrTimer = setInterval(() => void tickQr(), QR_POLL_MS);
    const statusTimer = setInterval(() => void tickStatus(), STATUS_POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(qrTimer);
      clearInterval(statusTimer);
    };
  }, [modal, refresh]);

  /**
   * Render the pairing string to an SVG.
   *
   * Client-side from the raw string rather than fetching an image: the QR is a
   * pairing credential with a ~20 second life, and generating it here means it
   * never becomes a cacheable URL. `qrcode-generator` is already a dependency
   * (settings/profile uses it for the MFA QR).
   */
  const qrSvg = useMemo(() => {
    if (!qr) return '';
    // Type 0 = auto-size. 'M' correction tolerates a little glare from a phone
    // camera pointed at a screen without inflating the code.
    const code = qrcode(0, 'M');
    code.addData(qr);
    code.make();
    return code.createSvgTag({ scalable: true });
  }, [qr]);

  const run = async (
    action: 'connect' | 'reconnect' | 'disconnect' | 'unlink',
    fn: () => Promise<unknown>,
  ) => {
    setBusy(action);
    try {
      await fn();
      await refresh();
    } catch (err) {
      if (alive.current) {
        setQrError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
      }
    } finally {
      if (alive.current) setBusy(null);
    }
  };

  const startPairing = async () => {
    setQr(null);
    setQrError(null);
    setModal('pairing');
    await run('connect', () => api.whatsapp.connect());
  };

  const state = status?.state ?? 'never_connected';
  const copy = STATE_COPY[state];
  const isConnected = state === 'connected';
  const notConfigured = status ? status.configured === false : false;

  const btn = {
    padding: '8px 0', borderRadius: 12, border: 'none', fontSize: 12, fontWeight: 600,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  } as const;

  return (
    <>
      <m.div
        layout
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
        whileHover={{ y: -4, boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }}
        style={{ ...glass, borderRadius: 20, padding: 20, borderLeft: `3px solid ${ACCENT}` }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14, flexShrink: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center', background: '#ecfdf5', color: ACCENT,
          }}>
            <MessageSquare size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>WhatsApp</div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0', lineHeight: 1.4 }}>
              Send reminders and receipts from your own WhatsApp number
            </p>
          </div>
        </div>

        {/* ── Status line ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {loading ? (
            <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <m.span
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                style={{ display: 'inline-flex' }}
              >
                <Loader2 size={11} />
              </m.span>
              Checking…
            </span>
          ) : (
            <>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 11, fontWeight: 600, color: copy.colour,
              }}>
                {isConnected
                  ? <CheckCircle2 size={12} />
                  : <span style={{ width: 8, height: 8, borderRadius: '50%', background: copy.colour, display: 'inline-block' }} />}
                {copy.label}
              </span>
              {isConnected && status?.phone_e164 && (
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                  {maskPhone(status.phone_e164)}
                </span>
              )}
              {/* `stale` means we could not reach the gateway, NOT that WhatsApp
                  is broken. Those read very differently to a studio owner. */}
              {status?.stale && !notConfigured && (
                <span style={{ fontSize: 10, color: 'var(--text-disabled)' }}>· last known</span>
              )}
            </>
          )}
        </div>

        {isConnected && status?.connected_at && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text-disabled)', marginBottom: 12 }}>
            <RefreshCw size={9} /> Connected {fmtDate(status.connected_at)}
          </div>
        )}

        {!isConnected && copy.hint && !loading && (
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 12px', lineHeight: 1.4 }}>
            {copy.hint}
          </p>
        )}

        {notConfigured && (
          <div style={{
            marginBottom: 12, padding: '8px 10px', borderRadius: 8, fontSize: 11,
            background: 'var(--bg-subtle)', color: 'var(--text-muted)', lineHeight: 1.4,
          }}>
            WhatsApp is not set up on this server yet. Contact support to enable it.
          </div>
        )}

        {/* ── Actions ── */}
        <div style={{ display: 'flex', gap: 8 }}>
          {isConnected ? (
            <>
              <button
                onClick={() => void run('reconnect', () => api.whatsapp.reconnect())}
                disabled={busy !== null}
                style={{
                  ...btn, flex: 1, background: 'var(--bg-subtle)', color: 'var(--text-primary)',
                  cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1,
                }}
              >
                <RefreshCw size={13} /> Reconnect
              </button>
              <button
                onClick={() => void run('disconnect', () => api.whatsapp.disconnect())}
                disabled={busy !== null}
                // An icon-only button needs an explicit label. Without it the
                // accessible name falls back to the `title` below, so a screen
                // reader announces the whole explanatory sentence as the
                // button's name — and a test looking for the Reconnect button
                // matches this one too, which is how this was caught.
                aria-label="Disconnect"
                title="Pause sending. Your session is kept, so reconnecting needs no new QR."
                style={{
                  ...btn, padding: '8px 14px', background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                  border: '1px solid rgba(239,68,68,0.2)',
                  cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1,
                }}
              >
                {busy === 'disconnect'
                  ? <m.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'inline-flex' }}><Loader2 size={13} /></m.span>
                  : <Unlink size={13} />}
              </button>
            </>
          ) : (
            <button
              onClick={() => setModal('risk')}
              disabled={loading || notConfigured || busy !== null}
              style={{
                ...btn, flex: 1, color: '#ffffff',
                background: `linear-gradient(135deg,${ACCENT},#059669)`,
                boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
                cursor: (loading || notConfigured) ? 'not-allowed' : 'pointer',
                opacity: (loading || notConfigured) ? 0.6 : 1,
              }}
            >
              <Link2 size={13} /> {state === 'never_connected' ? 'Connect WhatsApp' : 'Reconnect WhatsApp'}
            </button>
          )}
        </div>

        {isConnected && (
          <button
            onClick={() => setConfirmUnlink(true)}
            disabled={busy !== null}
            style={{
              marginTop: 10, width: '100%', background: 'none', border: 'none', padding: 0,
              fontSize: 11, color: 'var(--text-disabled)', textDecoration: 'underline',
              cursor: busy ? 'not-allowed' : 'pointer',
            }}
          >
            Unlink this number
          </button>
        )}
      </m.div>

      <AnimatePresence>
        {modal === 'risk' && (
          <RiskModal onCancel={() => setModal(null)} onAccept={() => void startPairing()} />
        )}
        {modal === 'pairing' && (
          <PairingModal
            qrSvg={qrSvg}
            error={qrError}
            connecting={busy === 'connect'}
            onRetry={() => void startPairing()}
            onClose={() => { setModal(null); setQr(null); setQrError(null); }}
          />
        )}
        {confirmUnlink && (
          <ConfirmUnlinkModal
            busy={busy === 'unlink'}
            onCancel={() => setConfirmUnlink(false)}
            onConfirm={async () => {
              await run('unlink', () => api.whatsapp.unlink());
              if (alive.current) setConfirmUnlink(false);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ── Modal shell ─────────────────────────────────────────────────────────────

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  // Escape, focus trap and focus restore, from the shared hook. Hand-rolling
  // any of it is what dialogs.a11y.convention.test.ts exists to catch: sixteen
  // dialogs in this app once declared aria-modal while Tab walked straight out
  // of them into the page behind.
  const dialogRef = useDialogA11y({ open: true, onClose });

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 1000, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
      }}
    >
      {/*
        No click-outside-to-close, matching every other hand-rolled dialog in
        this app (see components/platform/command-panel.tsx). A clickable
        backdrop element is not keyboard-reachable, and useDialogA11y's own
        comment rejects the two obvious repairs: a key handler adds a tab stop
        that does nothing, and a full-screen button reads as an unlabelled
        control. Escape is the keyboard equivalent of clicking away, and the
        header carries an explicit close button.

        (The tag names are spelled out in prose here on purpose: the guard in
        keyboard-access.test.ts scans raw source without stripping comments, so
        writing the markup literally in a comment reads to it as real code.)
      */}
      <m.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ duration: 0.3, type: 'spring', damping: 25, stiffness: 300 }}
        style={{ width: '90%', maxWidth: 440, ...glass, borderRadius: 20, padding: 28 }}
      >
        {children}
      </m.div>
    </div>
  );
}

function ModalHeader({ title, subtitle, onClose }: { title: string; subtitle: string; onClose: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
      <div style={{
        width: 44, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#ecfdf5', color: ACCENT, flexShrink: 0,
      }}>
        <MessageSquare size={20} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>
      </div>
      <button
        onClick={onClose}
        aria-label="Close"
        style={{
          marginLeft: 'auto', width: 32, height: 32, borderRadius: 10, display: 'flex',
          alignItems: 'center', justifyContent: 'center', border: 'none',
          background: 'var(--bg-subtle)', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0,
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}

// ── Risk disclosure ─────────────────────────────────────────────────────────
//
// Shown before the first QR, every time pairing is started. Not a one-time
// dismissal: the person connecting a number six months from now may not be the
// person who dismissed it, and the consequence is their number, not ours.

function RiskModal({ onCancel, onAccept }: { onCancel: () => void; onAccept: () => void }) {
  return (
    <Overlay onClose={onCancel}>
      <ModalHeader
        title="Before you connect"
        subtitle="Please read this — it affects your phone number"
        onClose={onCancel}
      />

      <div style={{
        display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 12, marginBottom: 16,
        background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.25)',
      }}>
        <AlertTriangle size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
          This links your own WhatsApp account the same way WhatsApp Web does.
          It is <strong>not</strong> the official WhatsApp Business API and is not
          approved by Meta. Meta can <strong>permanently ban the number</strong>,
          without warning and with no appeal.
        </div>
      </div>

      <ul style={{ margin: '0 0 20px', padding: '0 0 0 18px', fontSize: 12, lineHeight: 1.7, color: 'var(--text-muted)' }}>
        <li>Use a number your studio owns, not a personal one you cannot lose.</li>
        <li>Message your own clients only. Bulk or unsolicited messages get numbers banned fastest.</li>
        <li>Keep the phone online — the connection depends on it.</li>
      </ul>

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1, padding: '10px 0', borderRadius: 12, fontSize: 13, fontWeight: 600,
            border: '1px solid var(--border)', background: 'var(--bg-subtle)',
            color: 'var(--text-primary)', cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          onClick={onAccept}
          style={{
            flex: 1, padding: '10px 0', borderRadius: 12, fontSize: 13, fontWeight: 600,
            border: 'none', background: `linear-gradient(135deg,${ACCENT},#059669)`,
            color: '#fff', cursor: 'pointer',
          }}
        >
          I understand — show QR
        </button>
      </div>
    </Overlay>
  );
}

// ── Pairing ─────────────────────────────────────────────────────────────────

function PairingModal({
  qrSvg, error, connecting, onRetry, onClose,
}: {
  qrSvg: string; error: string | null; connecting: boolean;
  onRetry: () => void; onClose: () => void;
}) {
  return (
    <Overlay onClose={onClose}>
      <ModalHeader title="Connect WhatsApp" subtitle="Scan this with your phone" onClose={onClose} />

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '100%', aspectRatio: '1 / 1', maxHeight: 260, marginBottom: 18,
        borderRadius: 16, background: '#ffffff', padding: 16, boxSizing: 'border-box',
      }}>
        {qrSvg ? (
          // The QR must render on white regardless of theme — a dark-mode
          // inversion makes it unscannable, which looks like the feature being
          // broken rather than a styling choice.
          <div
            style={{ width: '100%', height: '100%' }}
            aria-label="WhatsApp pairing QR code"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
        ) : (
          <div style={{ textAlign: 'center', color: '#64748b' }}>
            <m.span
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              style={{ display: 'inline-flex' }}
            >
              <Loader2 size={22} />
            </m.span>
            <div style={{ fontSize: 12, marginTop: 8 }}>
              {connecting ? 'Starting…' : 'Waiting for a code…'}
            </div>
          </div>
        )}
      </div>

      <ol style={{
        margin: '0 0 16px', padding: '0 0 0 18px',
        fontSize: 12, lineHeight: 1.8, color: 'var(--text-secondary)',
      }}>
        <li>Open WhatsApp on your phone</li>
        <li>Tap <strong>Settings</strong> → <strong>Linked devices</strong></li>
        <li>Tap <strong>Link a device</strong> and scan this code</li>
      </ol>

      {error && (
        <div style={{
          marginBottom: 14, padding: '8px 10px', borderRadius: 8, fontSize: 11,
          background: 'rgba(245,158,11,0.12)', color: '#92400e', lineHeight: 1.4,
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-disabled)' }}>
        <Smartphone size={12} />
        This screen updates by itself once the code is scanned.
      </div>

      <button
        onClick={onRetry}
        style={{
          marginTop: 16, width: '100%', padding: '10px 0', borderRadius: 12,
          fontSize: 13, fontWeight: 600, border: '1px solid var(--border)',
          background: 'var(--bg-subtle)', color: 'var(--text-primary)', cursor: 'pointer',
        }}
      >
        Show a new code
      </button>
    </Overlay>
  );
}

// ── Unlink confirmation ─────────────────────────────────────────────────────

function ConfirmUnlinkModal({
  busy, onCancel, onConfirm,
}: {
  busy: boolean; onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <Overlay onClose={busy ? () => undefined : onCancel}>
      <ModalHeader
        title="Unlink WhatsApp?"
        subtitle="This signs the studio out of WhatsApp"
        onClose={busy ? () => undefined : onCancel}
      />

      <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)', margin: '0 0 20px' }}>
        Messages will stop sending from this number, and reconnecting later will need a
        new QR scan. To pause temporarily instead, use <strong>Disconnect</strong> — that
        keeps the session, so reconnecting needs no scan.
      </p>

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={onCancel}
          disabled={busy}
          style={{
            flex: 1, padding: '10px 0', borderRadius: 12, fontSize: 13, fontWeight: 600,
            border: '1px solid var(--border)', background: 'var(--bg-subtle)',
            color: 'var(--text-primary)', cursor: busy ? 'not-allowed' : 'pointer',
          }}
        >
          Keep it connected
        </button>
        <button
          onClick={onConfirm}
          disabled={busy}
          style={{
            flex: 1, padding: '10px 0', borderRadius: 12, fontSize: 13, fontWeight: 600,
            border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.12)',
            color: '#ef4444', cursor: busy ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          {busy && (
            <m.span
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              style={{ display: 'inline-flex' }}
            >
              <Loader2 size={13} />
            </m.span>
          )}
          Unlink
        </button>
      </div>
    </Overlay>
  );
}
