'use client';
// The cockpit's "do this now" card.
//
// It promotes the first insight out of the same prioritisation the AI Coach
// board uses (lib/coach-insights), with the actions the board keeps one tap
// deep: message the next contact, call them, or open the list. The board
// below renders with `excludeTop`, so the same insight is never on screen
// twice.
//
// The insight list is derived from data the dashboard has already fetched —
// no request of its own, and the ordering stays in the testable pure module
// rather than being re-judged here.
import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, ChevronRight, Clock, MessageCircle, Phone, Sparkles,
} from 'lucide-react';
import {
  buildCoachInsights, reachable, whatsappLink, telLink,
  type CoachBirthday, type Urgency,
} from '@/lib/coach-insights';
import { palette, rgba } from '@/lib/palette';
import type { DashData, OpsData } from '@/components/dashboards/PtOsDashboard';

const TONE: Record<Urgency, { fg: string; wash: string; label: string; Icon: typeof AlertTriangle }> = {
  critical: { fg: palette.red[600], wash: rgba(palette.red[600], 0.07), label: 'Urgent', Icon: AlertTriangle },
  warning: { fg: palette.amber[600], wash: rgba(palette.amber[600], 0.09), label: 'Soon', Icon: Clock },
  info: { fg: palette.blue[500], wash: rgba(palette.blue[500], 0.06), label: 'Nice to do', Icon: Sparkles },
};

export default function NextBestActionCard({ d, ops, birthdays, studioName }: {
  d: DashData;
  ops: OpsData | null;
  birthdays: CoachBirthday[];
  studioName: string;
}) {
  const insights = useMemo(() => buildCoachInsights({
    dash: d,
    renewals: ops?.renewals_due?.map((r) => ({
      id: r.id, name: r.name, mobile: r.mobile,
      days_left: r.days_left, balance_amount: r.balance_amount,
    })),
    dues: ops?.top_dues?.map((t) => ({
      id: t.id, name: t.name, mobile: t.mobile,
      balance_amount: t.balance_amount, due_status: t.due_status,
    })),
    unscheduled: ops?.today_unscheduled?.map((u) => ({
      client_id: u.client_id, client_name: u.client_name,
      client_mobile: u.client_mobile, plan_name: u.plan_name,
    })),
    birthdays,
    studioName,
  }), [d, ops, birthdays, studioName]);

  // Which contact the next tap reaches — same cursor idea as the board, so
  // two consecutive sends never hit the same person twice.
  const [cursor, setCursor] = useState(0);

  const top = insights[0] ?? null;
  const targets = useMemo(() => (top ? reachable(top.contacts) : []), [top]);
  const next = targets[Math.min(cursor, Math.max(targets.length - 1, 0))] ?? null;
  const remaining = Math.max(targets.length - cursor, 0);

  if (!top) return null;

  const t = TONE[top.urgency];
  const whatsapp = next ? whatsappLink(next, top.message(next.name)) : null;
  const tel = next ? telLink(next) : null;
  const advance = () => setCursor((c) => Math.min(c + 1, targets.length));

  const primary = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 44, flex: 1, borderRadius: 12, fontSize: 12.5, fontWeight: 780,
    color: '#FFFFFF', textDecoration: 'none',
  } as const;

  return (
    <section className="glass-panel relative overflow-hidden p-4 sm:p-5" aria-label="Next best action">
      {/* Urgency wash — decoration over the glass, never the surface itself. */}
      <div aria-hidden className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(120% 90% at 100% 0%, ${t.wash}, transparent 62%)` }} />

      <div className="relative">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] text-white"
            style={{ background: t.fg, boxShadow: `0 6px 18px ${rgba(palette.gray[900], 0.18)}` }}>
            <t.Icon size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-[800] tracking-[-0.015em] sm:text-[16px]" style={{ color: 'var(--text-primary)' }}>
              Next Best Action
            </h3>
            <p className="text-[11px] font-[600]" style={{ color: 'var(--text-muted)' }}>
              What moves the needle right now
            </p>
          </div>
          {/* Urgency in words as well as colour. */}
          <span className="shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-[800]"
            style={{ background: t.wash, color: t.fg }}>
            {t.label}
          </span>
        </div>

        <p className="text-[17px] font-[820] leading-tight tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>
          {top.title}
        </p>
        <p className="mt-1 text-[12.5px] leading-snug" style={{ color: 'var(--text-muted)' }}>
          {top.detail}
        </p>

        <div className="mt-4">
          {next ? (
            <>
              <p className="mb-2.5 truncate text-[11.5px] font-[600]" style={{ color: 'var(--text-primary)' }}>
                {remaining > 0
                  ? <>Next: <span style={{ color: palette.blue[600] }}>{next.name}</span> · {remaining} of {targets.length} left</>
                  : 'Everyone on this list has been contacted.'}
              </p>
              <div className="flex gap-2">
                {whatsapp && remaining > 0 && (
                  <a href={whatsapp} target="_blank" rel="noopener noreferrer" onClick={advance}
                    aria-label={`Send WhatsApp to ${next.name}`}
                    className="transition active:scale-[0.98]"
                    style={{ ...primary, background: `linear-gradient(135deg, ${palette.emerald[500]}, ${palette.emerald[600]})`, boxShadow: `0 6px 16px ${rgba(palette.emerald[500], 0.34)}` }}>
                    <MessageCircle size={15} /> Send WhatsApp
                  </a>
                )}
                {tel && remaining > 0 && (
                  <a href={tel} onClick={advance}
                    aria-label={`Call ${next.name}`}
                    className="transition active:scale-[0.98]"
                    style={{ ...primary, background: `linear-gradient(135deg, ${palette.blue[450]}, ${palette.blue[600]})`, boxShadow: `0 6px 16px ${rgba(palette.blue[500], 0.34)}` }}>
                    <Phone size={15} /> Call
                  </a>
                )}
              </div>
            </>
          ) : (
            <p className="mb-2.5 text-[11.5px] leading-snug" style={{ color: 'var(--text-muted)' }}>
              No mobile number on file for these clients — open the list to see who they are.
            </p>
          )}

          <Link href={top.href}
            className="mt-2.5 flex h-11 items-center justify-center gap-1.5 rounded-[12px] text-[12.5px] font-[750] transition active:scale-[0.98]"
            style={{ background: rgba(palette.blue[500], 0.10), color: palette.blue[600] }}>
            Open list <ChevronRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}
