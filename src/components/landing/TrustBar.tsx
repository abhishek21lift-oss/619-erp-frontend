'use client';

import { Building2, IndianRupee, Radar } from 'lucide-react';
import { Container, Reveal, Section, SectionHeader } from './primitives';
import { C, SHADOW } from './tokens';
import type { PublicStats } from './types';

/**
 * "Built for personal training businesses" — replaces the fabricated logo band
 * and invented testimonials with three things the product genuinely is, plus
 * live platform figures that are only shown once they are worth stating.
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
          eyebrow="Built for personal training businesses"
          title="Software made for how personal training businesses actually run"
          sub="MY PT STUDIO was built around the way independent trainers and PT studios work in India — not adapted from a generic CRM."
        />

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          <Reveal>
            <div
              className="h-full rounded-[20px] p-6"
              style={{ background: C.panel, boxShadow: SHADOW.card }}
            >
              <span
                className="grid h-10 w-10 place-items-center rounded-xl"
                style={{ background: C.blueWash, color: C.blueHi }}
                aria-hidden
              >
                <Building2 size={18} />
              </span>
              <h3 className="mt-4 text-[16px] font-[600]" style={{ color: C.ink }}>
                One platform for every kind of personal training business
              </h3>
              <p className="mt-2 text-[13px] leading-[1.55]" style={{ color: C.muted }}>
                Independent personal trainers, boutique PT studios, strength
                coaches and online coaches — built around the trainer who
                also runs the business.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.06}>
            <div
              className="h-full rounded-[20px] p-6"
              style={{ background: C.panel, boxShadow: SHADOW.card }}
            >
              <span
                className="grid h-10 w-10 place-items-center rounded-xl"
                style={{ background: C.goldSoft, color: C.goldHi }}
                aria-hidden
              >
                <IndianRupee size={18} />
              </span>
              <h3 className="mt-4 text-[16px] font-[600]" style={{ color: C.ink }}>
                Built for India, from the ground up
              </h3>
              <p className="mt-2 text-[13px] leading-[1.55]" style={{ color: C.muted }}>
                INR pricing in lakhs and crores, mobile-first signup, WhatsApp
                follow-ups and a client check-in flow your staff can run on a
                phone.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.12}>
            <div
              className="h-full rounded-[20px] p-6"
              style={{ background: C.panel, boxShadow: SHADOW.card }}
            >
              <span
                className="grid h-10 w-10 place-items-center rounded-xl"
                style={{ background: C.emeraldSoft, color: C.emerald }}
                aria-hidden
              >
                <Radar size={18} />
              </span>
              <h3 className="mt-4 text-[16px] font-[600]" style={{ color: C.ink }}>
                One source of truth for the whole team
              </h3>
              <p className="mt-2 text-[13px] leading-[1.55]" style={{ color: C.muted }}>
                Clients, training, payments and analytics read from the same
                data. The dashboard, the trainer and the desk can never
                disagree.
              </p>
            </div>
          </Reveal>
        </div>

        {showStats && statBand.length > 0 && (
          <Reveal delay={0.1}>
            <div
              className="mt-10 grid grid-cols-2 gap-y-6 rounded-[20px] px-6 py-8 text-center sm:grid-cols-4"
              style={{ background: C.canvasAlt }}
            >
              {statBand.map(([l, v]) => (
                <div key={l}>
                  <div
                    className="text-[32px] font-[600] tracking-[-0.03em] tabular-nums"
                    style={{ color: C.ink }}
                  >
                    {v.toLocaleString('en-IN')}
                  </div>
                  <div className="mt-1 text-[12px]" style={{ color: C.muted }}>
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