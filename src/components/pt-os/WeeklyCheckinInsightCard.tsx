'use client';

/**
 * A short, on-demand AI read of one client's recent weekly check-ins.
 *
 * Same "generate, review" shape as ClientAiGenerateCard, but with nothing to
 * save: this is purely advisory. If the trainer wants to act on it — message
 * the client, adjust a plan — that's a manual step outside this card. If a
 * trainer dismisses the card, that's remembered per-browser (localStorage)
 * against the exact insight shown, so dismissing today's read doesn't hide a
 * different one generated next week.
 */

import { useEffect, useRef, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { AlertCircle, ArrowRight, Loader2, Sparkles, X } from 'lucide-react';
import { api } from '@/lib/api';
import type { CheckinInsight } from '@/lib/api';
import { palette, rgba } from '@/lib/palette';

const BLUE = palette.blue[500];
const AMBER = palette.amber[500];
const EASE = [0.16, 1, 0.3, 1] as const;

function dismissKey(clientId: string) {
  return `checkin-insight-dismissed:${clientId}`;
}

/** A stable fingerprint of the shown insight, so dismissing one doesn't hide a later, different one. */
function insightKey(insight: Extract<CheckinInsight, { available: true }>) {
  return `${insight.summary}|${insight.notable_change ?? ''}|${insight.suggested_action ?? ''}`;
}

export interface WeeklyCheckinInsightCardProps {
  clientId: string;
  /** Disabled rather than hidden below this many check-ins — same floor the backend enforces. */
  checkinsCount: number;
}

export default function WeeklyCheckinInsightCard({ clientId, checkinsCount }: WeeklyCheckinInsightCardProps) {
  const [busy, setBusy] = useState(false);
  const [insight, setInsight] = useState<CheckinInsight | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const busyRef = useRef(false);

  // Reset per client — switching who's selected must not carry over a stale
  // insight or a dismissal that belonged to somebody else.
  useEffect(() => {
    setInsight(null);
    setError(null);
    setDismissed(false);
  }, [clientId]);

  const generate = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const res = await api.pt.checkinInsight(clientId);
      setInsight(res.data);
      if (res.data.available) {
        try {
          const stored = localStorage.getItem(dismissKey(clientId));
          setDismissed(stored === insightKey(res.data));
        } catch { /* private mode / storage blocked — never dismissed, harmless */ }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not get an insight. Please try again.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const dismiss = () => {
    if (!insight?.available) return;
    setDismissed(true);
    try {
      localStorage.setItem(dismissKey(clientId), insightKey(insight));
    } catch { /* private mode / storage blocked — dismissal just won't persist across reloads */ }
  };

  if (checkinsCount < 2) return null;
  if (dismissed) return null;

  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="relative overflow-hidden rounded-[16px] p-4"
      style={{
        background: `linear-gradient(150deg, ${rgba(BLUE, 0.08)} 0%, var(--bg-elevated) 60%)`,
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex items-start gap-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] text-white"
          style={{ background: `linear-gradient(135deg, ${BLUE}, ${palette.blue[600]})` }}>
          <Sparkles size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[12.5px] font-[780] tracking-[-0.01em]" style={{ color: 'var(--text-primary)' }}>
              AI check-in insight
            </p>
            {insight?.available && (
              <button type="button" onClick={dismiss} aria-label="Dismiss"
                className="rounded-full p-1 transition-opacity hover:opacity-70"
                style={{ color: 'var(--text-disabled)' }}>
                <X size={13} />
              </button>
            )}
          </div>

          {!insight && (
            <>
              <p className="mt-0.5 text-[11px] font-[600]" style={{ color: 'var(--text-muted)' }}>
                What changed across their recent check-ins &mdash; advisory only.
              </p>
              <button
                type="button"
                onClick={() => void generate()}
                disabled={busy}
                className="mt-2.5 flex h-[32px] items-center gap-1.5 rounded-[9px] px-3 text-[11.5px] font-[700] text-white transition-transform active:scale-[0.98] disabled:opacity-45"
                style={{ background: `linear-gradient(135deg, ${BLUE}, ${palette.blue[600]})` }}
              >
                {busy ? <><Loader2 size={12} className="animate-spin" /> Reading check-ins&hellip;</> : <><Sparkles size={12} /> Get insight</>}
              </button>
            </>
          )}

          {error && (
            <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed" style={{ color: palette.red[500] }}>
              <AlertCircle size={12} className="mt-0.5 shrink-0" /> {error}
            </p>
          )}

          <AnimatePresence>
            {insight && insight.available && (
              <m.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 overflow-hidden"
              >
                <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                  {insight.summary}
                </p>
                {insight.notable_change && (
                  <p className="mt-2 rounded-[10px] px-2.5 py-2 text-[11.5px] font-[600] leading-relaxed"
                    style={{ background: rgba(AMBER, 0.10), color: '#92400e' }}>
                    {insight.notable_change}
                  </p>
                )}
                {insight.suggested_action && (
                  <p className="mt-2 flex items-start gap-1.5 text-[11.5px] font-[650] leading-relaxed" style={{ color: BLUE }}>
                    <ArrowRight size={12} className="mt-0.5 shrink-0" /> {insight.suggested_action}
                  </p>
                )}
              </m.div>
            )}
          </AnimatePresence>

          {insight && !insight.available && (
            <>
              <p className="mt-2 text-[11px] font-[600]" style={{ color: 'var(--text-muted)' }}>
                {insight.reason === 'ai_unavailable'
                  ? 'AI is unavailable right now.'
                  : 'Nothing notable to report from these check-ins.'}
              </p>
              {insight.reason === 'ai_unavailable' && (
                <button
                  type="button"
                  onClick={() => void generate()}
                  disabled={busy}
                  className="mt-2 flex h-[28px] items-center gap-1.5 rounded-[8px] px-2.5 text-[11px] font-[700] transition-opacity hover:opacity-80 disabled:opacity-45"
                  style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
                >
                  {busy ? <Loader2 size={11} className="animate-spin" /> : null} Try again
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </m.div>
  );
}
