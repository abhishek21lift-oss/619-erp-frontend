'use client';

import { m, useReducedMotion } from 'framer-motion';
import {
  BrainCircuit, TrendingUp, Users, Wallet, AlertTriangle, CalendarClock,
  LineChart, BadgeCheck,
} from 'lucide-react';
import { Container, Reveal, Section, SectionHeader } from './primitives';
import { C, EASE, TABULAR } from './tokens';

/**
 * Analytics — honest: the product reports on attendance, packages,
 * payments and engagement (no fabricated marketing metrics). The left panel
 * shows what the platform measures; the right shows the AI's churn-risk view.
 */
export default function AnalyticsSection() {
  const reduce = useReducedMotion();
  const metricBars = [
    { l: 'Collection rate', v: 72, c: C.emerald },
    { l: 'Attendance (30d)', v: 61, c: C.blueHi },
    { l: 'Client retention', v: 84, c: C.gold },
    { l: 'Engagement reach', v: 47, c: C.blue },
  ];

  return (
    <Section id="analytics" aria-labelledby="analytics-title">
      <Container>
        <SectionHeader
          id="analytics-title"
          eyebrow="Analytics"
          title="Numbers you can act on — not dashboards to admire"
          sub="MY PT STUDIO reports what matters to a fitness business: who is paying, who is training, who is at risk — and what to do about it."
        />

        <div className="mt-14 grid gap-4 lg:grid-cols-2">
          {/* What the platform measures */}
          <Reveal className="h-full">
            <div className="flex h-full flex-col rounded-[24px] border p-6 sm:p-7" style={{ background: C.panel, borderColor: C.line }}>
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: C.blueWash, color: C.blueHi }} aria-hidden>
                  <LineChart size={17} />
                </span>
                <div>
                  <h3 className="text-[15px] font-bold" style={{ color: C.ink }}>What the platform tracks</h3>
                  <p className="text-[11px] font-medium" style={{ color: C.faint }}>The reports behind every surface</p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {metricBars.map((b, i) => (
                  <div key={b.l}>
                    <div className="flex items-center justify-between">
                      <span className="text-[12.5px] font-semibold" style={{ color: C.body }}>{b.l}</span>
                      <span className="text-[12px] font-bold tabular-nums" style={{ ...TABULAR, color: C.ink }}>{b.v}%</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full" style={{ background: 'rgba(148,163,184,0.12)' }}>
                      <m.div
                        className="h-full rounded-full"
                        style={{ background: b.c, width: `${b.v}%` }}
                        initial={reduce ? undefined : { width: 0 }}
                        whileInView={reduce ? undefined : { width: `${b.v}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: i * 0.08, ease: EASE }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3 border-t pt-5" style={{ borderColor: C.lineSoft }}>
                {[
                  { icon: <Users size={14} />, v: '248', l: 'Active clients', c: C.blueHi },
                  { icon: <Wallet size={14} />, v: '₹4.3L', l: 'Collected MTD', c: C.emerald },
                  { icon: <TrendingUp size={14} />, v: '18%', l: 'YoY revenue', c: C.gold },
                ].map((s) => (
                  <div key={s.l} className="text-center">
                    <span style={{ color: s.c }} aria-hidden>{s.icon}</span>
                    <p className="mt-1.5 text-[16px] font-[800] tabular-nums" style={{ ...TABULAR, color: C.ink }}>{s.v}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: C.faint }}>{s.l}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* AI risk view */}
          <Reveal delay={0.08} className="h-full">
            <div className="flex h-full flex-col rounded-[24px] border p-6 sm:p-7" style={{ background: C.panel, borderColor: C.line }}>
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: C.goldSoft, color: C.goldHi }} aria-hidden>
                  <BrainCircuit size={17} />
                </span>
                <div>
                  <h3 className="text-[15px] font-bold" style={{ color: C.ink }}>The AI's risk radar</h3>
                  <p className="text-[11px] font-medium" style={{ color: C.faint }}>Who needs a call, and what to say</p>
                </div>
              </div>

              <ul className="mt-6 space-y-3">
                {[
                  { icon: <AlertTriangle size={15} />, c: C.red, t: 'Churn risk — 4 clients', d: 'Attendance dropped below 40% in 3 weeks. Renewals due within 30 days.', a: 'Suggested: renewal WhatsApp + one call' },
                  { icon: <Wallet size={15} />, c: C.gold, t: '₹42K in overdue dues', d: '12 clients overdue, 3 beyond 14 days. All flagged with amounts.', a: 'Suggested: send the 3 due reminders today' },
                  { icon: <CalendarClock size={15} />, c: C.blueHi, t: '7 renewals in 10 days', d: 'Long-standing clients — high retention value, low effort.', a: 'Suggested: early-bird offer to lock renewals' },
                  { icon: <BadgeCheck size={15} />, c: C.emerald, t: '3 wins to celebrate', d: 'Milestones hit this week — perfect for public shoutouts.', a: 'Suggested: WhatsApp wishes from the studio' },
                ].map((r) => (
                  <li
                    key={r.t}
                    className="flex items-start gap-3 rounded-xl border p-3.5"
                    style={{ background: C.panelAlt, borderColor: C.lineSoft }}
                  >
                    <span className="mt-0.5 shrink-0" style={{ color: r.c }} aria-hidden>{r.icon}</span>
                    <div>
                      <p className="text-[12.5px] font-bold" style={{ color: C.ink }}>{r.t}</p>
                      <p className="mt-0.5 text-[11px] leading-[1.55]" style={{ color: C.muted }}>{r.d}</p>
                      <p className="mt-1 text-[11px] font-semibold" style={{ color: r.c }}>{r.a}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <p className="mt-5 text-[11px] font-medium leading-relaxed" style={{ color: C.faint }}>
                The AI ranks every client by renewal likelihood and tells you the highest-leverage action — but the
                call, the offer and the message are yours.
              </p>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.12}>
          <p className="mt-8 text-center text-[12px] font-medium" style={{ color: C.faint }}>
            Illustrative figures — the live dashboard reads your studio&apos;s real records, never a demo.
          </p>
        </Reveal>
      </Container>
    </Section>
  );
}