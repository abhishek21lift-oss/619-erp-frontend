'use client';

import { Building2, IndianRupee, Radar } from 'lucide-react';
import { Container, Reveal, Section, SectionHeader } from './primitives';
import { C } from './tokens';
import type { PublicStats } from './types';

/**
 * "Built for modern fitness businesses" — replaces the fabricated logo band and
 * invented testimonials with three things the product genuinely is, plus live
 * platform figures that are only shown once they are worth stating.
 */
export default function TrustBar({ stats }: { stats: PublicStats | null }) {
  const statBand = stats
    ? ([
        ['Studios', stats.studios],
        ['Coaches', stats.trainers],
        ['Clients managed', stats.active_clients],
        ['Sessions delivered', stats.sessions_completed],
      ] as const).filter(([, v]) => v > 0)
    : [];
  const showStats = stats != null && stats.studios >= 25;

  return (
    <Section id="built-for" className="py-16 sm:py-20" aria-labelledby="built-for-title">
      <Container>
        <SectionHeader
          id="built-for-title"
          eyebrow="Built for modern fitness businesses"
          title="Software made for how fitness businesses actually run"
          sub="MY PT STUDIO was built around the way studios, personal trainers and coaches work in India — not adapted from a generic CRM."
        />

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          <Reveal>
            <div
              className="h-full rounded-2xl border p-6"
              style={{ background: C.panel, borderColor: C.line }}
            >
              <span
                className="grid h-10 w-10 place-items-center rounded-xl"
                style={{ background: C.blueWash, color: C.blueHi }}
                aria-hidden
              >
                <Building2 size={18} />
              </span>
              <h3 className="mt-4 text-[15px] font-bold" style={{ color: C.ink }}>
                One platform for every kind of fitness business
              </h3>
              <p className="mt-2 text-[13px] leading-[1.65]" style={{ color: C.muted }}>
                Boutique studios, strength gyms, independent personal trainers,
                online coaches, sports academies — single studios or multi-branch
                chains.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.06}>
            <div
              className="h-full rounded-2xl border p-6"
              style={{ background: C.panel, borderColor: C.line }}
            >
              <span
                className="grid h-10 w-10 place-items-center rounded-xl"
                style={{ background: C.goldSoft, color: C.goldHi }}
                aria-hidden
              >
                <IndianRupee size={18} />
              </span>
              <h3 className="mt-4 text-[15px] font-bold" style={{ color: C.ink }}>
                Built for India, from the ground up
              </h3>
              <p className="mt-2 text-[13px] leading-[1.65]" style={{ color: C.muted }}>
                INR pricing in lakhs and crores, mobile-first signup, WhatsApp
                follow-ups and a member check-in flow your staff can run on a
                phone at the front desk.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.12}>
            <div
              className="h-full rounded-2xl border p-6"
              style={{ background: C.panel, borderColor: C.line }}
            >
              <span
                className="grid h-10 w-10 place-items-center rounded-xl"
                style={{ background: C.emeraldSoft, color: C.emerald }}
                aria-hidden
              >
                <Radar size={18} />
              </span>
              <h3 className="mt-4 text-[15px] font-bold" style={{ color: C.ink }}>
                One source of truth for the whole team
              </h3>
              <p className="mt-2 text-[13px] leading-[1.65]" style={{ color: C.muted }}>
                Members, training, payments and analytics read from the same
                data. The dashboard, the trainer and the front desk can never
                disagree.
              </p>
            </div>
          </Reveal>
        </div>

        {showStats && statBand.length > 0 && (
          <Reveal delay={0.1}>
            <div
              className="mt-10 grid grid-cols-2 gap-y-6 rounded-2xl border px-6 py-8 text-center sm:grid-cols-4"
              style={{ background: C.canvasAlt, borderColor: C.lineSoft }}
            >
              {statBand.map(([l, v]) => (
                <div key={l}>
                  <div
                    className="text-[26px] font-[850] tracking-[-0.03em] tabular-nums"
                    style={{
                      color: C.ink,
                      background: `linear-gradient(180deg, ${C.ink} 30%, ${C.muted} 130%)`,
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    {v.toLocaleString('en-IN')}
                  </div>
                  <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: C.faint }}>
                    {l}
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        )}
      </Container>
    </Section>
  );
}