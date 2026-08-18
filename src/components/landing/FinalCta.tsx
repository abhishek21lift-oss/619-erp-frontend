'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Container, Reveal } from './primitives';
import { C, SHADOW } from './tokens';

/** Closing panel — the page's one unmissable CTA. */
export default function FinalCta({ trialDays = 7 }: { trialDays?: number }) {
  return (
    <section aria-labelledby="final-cta-title" className="relative py-20 sm:py-24">
      <Container>
        <Reveal>
          <div
            className="relative overflow-hidden rounded-[28px] border px-6 py-14 text-center sm:px-12 sm:py-16"
            style={{ background: `linear-gradient(160deg, ${C.ctaFrom} 0%, ${C.ctaTo} 35%, ${C.canvas} 100%)`, borderColor: C.lineBlue, boxShadow: SHADOW.panel }}
          >
            {/* ambient glows */}
            <div
              aria-hidden
              className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full"
              style={{ background: 'radial-gradient(closest-side, rgba(0,103,224,0.30), transparent 70%)' }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-28 -right-16 h-80 w-80 rounded-full"
              style={{ background: 'radial-gradient(closest-side, rgba(245,158,11,0.16), transparent 70%)' }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(28,163,249,0.55), transparent)' }}
            />

            <div className="relative">
              <h2
                id="final-cta-title"
                className="mx-auto max-w-2xl text-[clamp(1.9rem,4.5vw,3rem)] font-[820] leading-[1.06] tracking-[-0.03em]"
                style={{ color: C.ink }}
              >
                Your PT business deserves a{' '}
                <span style={{ background: `linear-gradient(100deg, ${C.blueHi}, ${C.skyHi} 55%, ${C.goldHi})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  professional platform.
                </span>
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-[15px] leading-[1.7]" style={{ color: C.muted }}>
                Stop running your studio on WhatsApp, diaries and hope. Start your free trial today —
                your clients, programmes and revenue in one place within the hour.
              </p>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/start-free"
                  className="inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-[15px] font-bold transition-all duration-200 hover:-translate-y-0.5"
                  style={{
                    background: `linear-gradient(135deg, ${C.goldHi}, ${C.gold})`,
                    color: C.onGold,
                    boxShadow: '0 16px 40px -12px rgba(245,158,11,0.6), inset 0 1px 0 rgba(255,255,255,0.35)',
                  }}
                >
                  Start free <ArrowRight size={16} aria-hidden />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-xl border px-7 py-3.5 text-[15px] font-bold transition-all duration-200 hover:-translate-y-0.5"
                  style={{ borderColor: C.line, color: C.ink }}
                >
                  Log in
                </Link>
              </div>
              <p className="mt-6 text-[12px] font-medium" style={{ color: C.faint }}>
                No card required · {trialDays}-day trial · Founder&apos;s Club places at onboarding
              </p>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}