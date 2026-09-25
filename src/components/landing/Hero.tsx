'use client';

import Link from 'next/link';
import { m, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Container } from './primitives';
import StudioMark from './StudioMark';
import { C, EASE, PRIMARY_BUTTON, SECONDARY_BUTTON, STAGE } from './tokens';

/**
 * The first screen.
 *
 * The visual is the product's own mark — the MY PT STUDIO artwork, lit as an
 * object on the page and kept still. It replaces a mocked
 * dashboard full of invented clients and rupee figures: a visitor could not
 * tell those numbers were made up, and the page should not show anything the
 * product would not show them.
 */

/** `trialDays` is null until the live plan config has loaded — never a guess. */
export default function Hero({ trialDays }: { trialDays: number | null }) {
  const reduce = useReducedMotion();
  const rise = (delay: number, y = 18) => ({
    initial: reduce ? false : { opacity: 0, y },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay, ease: EASE },
  });

  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      {/* The stage: key light from the upper left, a drafting grid that fades out. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0" style={{ background: STAGE.light }} />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: STAGE.grid,
            backgroundSize: STAGE.gridSize,
            maskImage: STAGE.gridMask,
            WebkitMaskImage: STAGE.gridMask,
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-px" style={{ background: STAGE.horizon }} />
      </div>

      <Container className="relative pb-16 pt-[calc(max(env(safe-area-inset-top),1.5rem)+6.5rem)] sm:pb-24 sm:pt-[calc(max(env(safe-area-inset-top),1.5rem)+8rem)]">
        <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] lg:gap-8">
          <div className="text-center lg:text-left">
            <m.p
              {...rise(0, 12)}
              className="inline-flex items-center gap-2.5 font-mono text-[11px] font-[600] uppercase tracking-[0.2em]"
              style={{ color: C.blueHi }}
            >
              <span className="h-[7px] w-[7px] rounded-[2px]" style={{ background: C.blue }} />
              Software for personal-training studios
            </m.p>

            <m.h1
              id="hero-title"
              {...rise(0.06, 22)}
              className="mt-5 text-[clamp(2.35rem,4.7vw,3.9rem)] font-[850] leading-[1.02] tracking-[-0.045em]"
              style={{ color: C.ink }}
            >
              Your whole PT studio,
              <br className="hidden sm:block" /> built as one.
            </m.h1>

            <m.p
              {...rise(0.14)}
              className="mx-auto mt-6 max-w-[560px] text-[16px] leading-[1.7] sm:text-[18px] lg:mx-0"
              style={{ color: C.muted }}
            >
              Clients, programmes, sessions, payments and renewals live in one place —
              and AI drafts workouts and diet plans for you to review and edit
              before a client ever sees them.
            </m.p>

            <m.div {...rise(0.22)} className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link href="/start-free" className={`${PRIMARY_BUTTON} group h-[54px] w-full px-7 text-[15px] sm:w-auto`}>
                Start free
                <ArrowRight size={17} strokeWidth={2.5} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a href="#product" className={`${SECONDARY_BUTTON} h-[54px] w-full px-7 text-[15px] sm:w-auto`}>
                See what’s inside
              </a>
            </m.div>

            <m.p {...rise(0.3, 0)} className="mt-4 text-[13px] font-[520]" style={{ color: C.faint }}>
              {trialDays ? `${trialDays}-day free trial` : 'Free trial'} · No card required
            </m.p>
          </div>

          <StudioMark size={300} priority />
        </div>
      </Container>
    </section>
  );
}
