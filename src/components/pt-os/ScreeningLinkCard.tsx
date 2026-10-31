'use client';

// Remote screening, from the trainer's side.
//
// One button issues a one-time link the client opens on their own phone to
// fill the PAR-Q and sign the informed consent — no login, no PT package. The
// server emails it when there is a valid address, but the copyable URL is the
// delivery method that always works (the client may only be on WhatsApp, or
// standing in front of the trainer), so it is always shown.

import { useState } from 'react';
import { Check, Copy, Link2, Loader2, MessageCircle, Send } from 'lucide-react';
import { api } from '@/lib/api';
import type { ScreeningLinkResult } from '@/lib/api';
import { errorMessage } from '@/lib/forms/errors';
import { whatsAppHref } from '@/lib/phone';
import { stateTone } from '@/lib/state-tone';

export default function ScreeningLinkCard({ clientId, clientName, phone }: {
  clientId: string;
  clientName?: string;
  phone?: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ScreeningLinkResult | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const create = async () => {
    setBusy(true); setError(''); setCopied(false);
    try {
      const r = await api.screeningLink.create(clientId);
      setResult(r.data);
    } catch (e: unknown) {
      setError(errorMessage(e, 'Could not create a signing link.'));
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy. Select the link and copy it manually.');
    }
  };

  const message = result
    ? `Hi ${clientName || ''}, please fill your health screening and sign your consent here: ${result.url}`
    : '';
  const wa = result ? whatsAppHref(phone, message) : null;

  return (
    <div className="rounded-[16px] px-4 py-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="flex items-start gap-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px]"
          style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
          <Link2 size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-[700]" style={{ color: 'var(--text-primary)' }}>Remote screening</p>
          <p className="mt-0.5 text-[11.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            A one-time link to fill the PAR-Q and sign the informed consent from their own phone.
            Works without a login. It can be used once.
          </p>
        </div>
      </div>

      {!result && (
        <button
          type="button"
          onClick={create}
          disabled={busy}
          className="mt-3 flex h-[44px] w-full items-center justify-center gap-1.5 rounded-[11px] px-3 text-[12.5px] font-[720] transition-opacity disabled:opacity-45"
          style={{ background: 'var(--brand)', color: '#fff' }}
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={13} />}
          {busy ? 'Creating link…' : 'Create signing link'}
        </button>
      )}

      {result && (
        <div className="mt-3 space-y-2.5">
          <div className="flex gap-2">
            <code
              className="flex h-[44px] min-w-0 flex-1 select-all items-center overflow-hidden rounded-[11px] px-3 text-[12px]"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              <span className="truncate">{result.url}</span>
            </code>
            <button
              type="button"
              onClick={copy}
              className="flex h-[44px] shrink-0 items-center gap-1.5 rounded-[11px] px-3.5 text-[12px] font-[720]"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          <p className="text-[11.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {result.emailed
              ? `Emailed to ${result.email}.`
              : result.email
                ? `The email to ${result.email} could not be sent — share the link instead.`
                : 'No email on file — share this link yourself.'}
            {' '}Expires {new Date(result.expires_at).toLocaleString('en-IN', {
              day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
            })}.
          </p>

          <div className="flex gap-2">
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-[44px] flex-1 items-center justify-center gap-1.5 rounded-[11px] px-3 text-[12px] font-[720]"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              >
                <MessageCircle size={13} /> WhatsApp
              </a>
            )}
            <button
              type="button"
              onClick={create}
              disabled={busy}
              className="flex h-[44px] flex-1 items-center justify-center gap-1.5 rounded-[11px] px-3 text-[12px] font-[720] disabled:opacity-45"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              Replace link
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2.5 text-[11.5px] font-[600] leading-relaxed" style={{ color: stateTone.danger.fg }}>
          {error}
        </p>
      )}
    </div>
  );
}
