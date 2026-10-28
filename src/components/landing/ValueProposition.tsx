'use client';

import { ArrowRight, ArrowDown } from 'lucide-react';
import { Container, Reveal, Section, SectionHeader } from './primitives';
import { C, SHADOW } from './tokens';

/**
 * The "before / after" story — the gap the product closes. Written against the
 * actual pain points the product documentation names (WhatsApp copy-paste,
 * diaries, Excel, missed renewals, no LTV).
 */
export default function ValueProposition() {
  const before = [
    'Programmes written by hand, repeated for every client',
    'Payments tracked on WhatsApp and a physical diary',
    'Renewals missed until a client quietly disappears',
    'Revenue, attendance and results in three different places',
    'Every question answered with "let me check my notes"',
  ];
  const after = [
    'AI drafts client programmes in seconds — trainers keep final say',
    'Packages, dues and collections tracked automatically',
    'Renewals flagged early, with a WhatsApp nudge ready to send',
    'One dashboard: revenue, sessions, insights, together',
    'Every client answer lives in a searchable profile',
  ];

  return (
    <Section id="the-gap" aria-labelledby="the-gap-title">
      <Container>
        <SectionHeader
          id="the-gap-title"
          eyebrow="The problem"
          title="Personal training businesses run on scraps — and it costs them"
          sub="We rebuilt the operations a training business runs on every day. The gap between how PT businesses run today and what MY PT STUDIO makes possible is visible within a single month."
        />

        <div className="mt-14 grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr]">
          {/* Before */}
          <Reveal className="h-full">
            <div
              className="flex h-full flex-col rounded-[20px] p-6 sm:p-7"
              style={{ background: C.panel, border: `1px solid ${C.lineSoft}`, boxShadow: SHADOW.card }}
            >
              <div className="flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full" style={{ background: C.red }} aria-hidden />
                <h3 className="text-[15px] font-[600]" style={{ color: C.red }}>
                  Before MY PT STUDIO
                </h3>
              </div>
              <ul className="mt-6 space-y-4">
                {before.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full" style={{ background: C.redSoft, color: C.red }} aria-hidden>
                      <span className="text-[11px] leading-none">✕</span>
                    </span>
                    <p className="text-[14px] leading-[1.55]" style={{ color: C.body }}>{item}</p>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          {/* Arrow */}
          <div className="hidden items-center lg:flex" aria-hidden>
            <ArrowRight size={26} style={{ color: C.blueHi }} />
          </div>
          <div className="flex items-center justify-center lg:hidden" aria-hidden>
            <ArrowDown size={20} style={{ color: C.blueHi }} />
          </div>

          {/* After */}
          <Reveal delay={0.08} className="h-full">
            <div
              className="relative flex h-full flex-col overflow-hidden rounded-[20px] p-6 sm:p-7"
              style={{ background: C.panel, border: `1px solid ${C.blue}`, boxShadow: SHADOW.card }}
            >
              <div className="relative flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full" style={{ background: C.emerald }} aria-hidden />
                <h3 className="text-[15px] font-[600]" style={{ color: C.emerald }}>
                  With MY PT STUDIO
                </h3>
              </div>
              <ul className="relative mt-6 space-y-4">
                {after.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full" style={{ background: C.emeraldSoft, color: C.emerald }} aria-hidden>
                      <span className="text-[11px] leading-none">✓</span>
                    </span>
                    <p className="text-[14px] leading-[1.55]" style={{ color: C.ink }}>{item}</p>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}