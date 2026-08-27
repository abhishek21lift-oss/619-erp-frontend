'use client';

/**
 * The confirmation screen for an `ai-actions` plan, and then what happened.
 *
 * Extracted out of AiCommandCenter.tsx so a screen that only needs to run
 * ONE specific action (see LeadFollowupAction.tsx) doesn't have to mount the
 * whole global assistant to get it. The plan/execute wiring (proposeAction,
 * confirmAction) stays with each caller — this component only ever renders
 * what it's given.
 *
 * This is the only thing standing between a model's suggestion and a hundred
 * WhatsApp messages, so it is deliberately boring: how many people, who some
 * of them are, the exact words they will read, and every warning the server
 * raised — all above the button, none of it behind a disclosure triangle.
 *
 * Warnings come first on purpose. "WhatsApp is not configured" is the single
 * most important thing on this screen when it is true, because confirming
 * would otherwise look like success and deliver nothing.
 */

import { AlertTriangle, Check, Loader2, Send } from 'lucide-react';
import type { AiActionPlan, AiActionResult } from '@/lib/api';

export default function ActionConfirmView({
  plan, result, running, error, onConfirm, onCancel,
}: {
  plan: AiActionPlan | null;
  result: AiActionResult | null;
  running: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (result) {
    // `sent` is the only status that means anything left the building; the
    // rest are named rather than folded into a success count.
    const other = Object.entries(result.tally).filter(([k]) => k !== 'sent');
    return (
      <div className="py-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ background: result.sent > 0 ? 'rgba(16,185,129,0.14)' : 'rgba(148,163,184,0.18)' }}>
            <Check size={15} style={{ color: result.sent > 0 ? '#059669' : '#64748b' }} />
          </span>
          <p className="text-[13px] font-[760]" style={{ color: '#0f172a' }}>
            {result.sent} of {result.total} sent
          </p>
        </div>
        {other.length > 0 && (
          <ul className="mt-2.5 flex flex-col gap-1">
            {other.map(([status, n]) => (
              <li key={status} className="text-[11.5px] font-[620]" style={{ color: '#b45309' }}>
                {n} {status === 'not_configured' ? 'not delivered — WhatsApp is not configured' : status}
              </li>
            ))}
          </ul>
        )}
        <button type="button" onClick={onCancel}
          className="mt-4 h-[38px] w-full rounded-[12px] text-[12.5px] font-[720]"
          style={{ background: 'rgba(15,23,42,0.06)', color: '#0f172a' }}>
          Done
        </button>
      </div>
    );
  }

  if (!plan) return null;

  return (
    <div className="py-1">
      <p className="text-[12.5px] font-[600] leading-[1.55]" style={{ color: '#475569' }}>
        {plan.description}
      </p>

      {plan.warnings.length > 0 && (
        <div className="mt-3 flex flex-col gap-1.5 rounded-[12px] px-3 py-2.5"
          style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.32)' }}>
          {plan.warnings.map((w) => (
            <p key={w} className="flex items-start gap-1.5 text-[11.5px] font-[650]" style={{ color: '#92400e' }}>
              <AlertTriangle size={12} className="mt-[2px] shrink-0" />{w}
            </p>
          ))}
        </div>
      )}

      <p className="mt-3.5 text-[9.5px] font-[800] uppercase tracking-[0.12em]" style={{ color: '#94a3b8' }}>
        {plan.count} {plan.count === 1 ? 'recipient' : 'recipients'}
      </p>
      {plan.count === 0 ? (
        <p className="mt-1 text-[12px] font-[620]" style={{ color: '#64748b' }}>
          Nobody matches right now — there is nothing to send.
        </p>
      ) : (
        <ul className="mt-1.5 flex flex-col gap-1">
          {plan.preview.map((p) => (
            <li key={p.name} className="flex items-center justify-between gap-2 rounded-[10px] px-2.5 py-1.5"
              style={{ background: 'rgba(15,23,42,0.035)' }}>
              <span className="truncate text-[11.5px] font-[660]" style={{ color: '#1e293b' }}>{p.name}</span>
              <span className="shrink-0 text-[10.5px] font-[700] tabular-nums" style={{ color: '#64748b' }}>{p.detail}</span>
            </li>
          ))}
          {plan.count > plan.preview.length && (
            <li className="px-2.5 py-1 text-[11px] font-[620]" style={{ color: '#94a3b8' }}>
              and {plan.count - plan.preview.length} more
            </li>
          )}
        </ul>
      )}

      {plan.sample_message && (
        <>
          <p className="mt-3.5 text-[9.5px] font-[800] uppercase tracking-[0.12em]" style={{ color: '#94a3b8' }}>
            They will read
          </p>
          <p className="mt-1.5 rounded-[12px] px-3 py-2.5 text-[11.5px] font-[560] leading-[1.55]"
            style={{ background: 'rgba(0,103,224,0.07)', color: '#1e293b' }}>
            {plan.sample_message}
          </p>
        </>
      )}

      {error && (
        <p className="mt-3 rounded-[12px] px-3 py-2 text-[12px] font-[620]"
          style={{ background: 'rgba(239,68,68,0.10)', color: '#b91c1c' }}>
          {error}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <button type="button" onClick={onCancel} disabled={running}
          className="h-[40px] flex-1 rounded-[12px] text-[12.5px] font-[720] disabled:opacity-50"
          style={{ background: 'rgba(15,23,42,0.06)', color: '#0f172a' }}>
          Cancel
        </button>
        <button type="button" onClick={onConfirm} disabled={running || plan.count === 0}
          className="flex h-[40px] flex-[1.4] items-center justify-center gap-1.5 rounded-[12px] text-[12.5px] font-[750] text-white disabled:opacity-45"
          style={{ background: 'linear-gradient(135deg,#0067e0,#003f87)' }}>
          {running ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          {running ? 'Sending…' : `Send to ${plan.count}`}
        </button>
      </div>
    </div>
  );
}
