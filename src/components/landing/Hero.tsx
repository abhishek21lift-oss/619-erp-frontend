'use client';

import Link from 'next/link';
import { m } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { Container } from './primitives';
import StudioMark from './StudioMark';
import { C, EASE, PRIMARY_BUTTON, STAGE } from './tokens';

/**
 * The first screen.
 *
 * Centred, like a product page: one sentence, one sub-line, one action, and
 * the studio mark standing underneath it. The mark is the real artwork, not a
 * mocked dashboard of invented clients and rupee figures — the page should not
 * show anything the product would not show them.
 */

/** `trialDays` is null until the live plan config has loaded — never a guess. */
export default function Hero({ trialDays }: { trialDays: number | null }) {
  const rise = (delay: number, y = 20) => ({
    initial: { opacity: 0, y },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay, ease: EASE },
  });

  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0" style={{ background: STAGE.light }} />
      </div>

      <Container className="relative pb-10 pt-[calc(max(env(safe-area-inset-top),0px)+7rem)] sm:pb-16 sm:pt-[calc(max(env(safe-area-inset-top),0px)+8.5rem)]">
        <div className="mx-auto max-w-[860px] text-center">
          <m.p {...rise(0, 12)} className="text-[17px] font-[600] tracking-[-0.01em]" style={{ color: C.blueHi }}>
            Software for personal-training studios
          </m.p>

          <m.h1
            id="hero-title"
            {...rise(0.06, 26)}
            className="mt-3 text-[clamp(2.6rem,6.2vw,4.6rem)] font-[600] leading-[1.03] tracking-[-0.035em]"
            style={{ color: C.ink }}
          >
            Your whole PT studio,
            <br className="hidden sm:block" /> built as one.
          </m.h1>

          <m.p
            {...rise(0.14)}
            className="mx-auto mt-6 max-w-[620px] text-[17px] leading-[1.5] sm:text-[20px]"
            style={{ color: C.muted }}
          >
            Clients, programmes, sessions, payments and renewals in one place. AI drafts the
            workouts and diet plans; you review and edit before a client ever sees them.
          </m.p>

          <m.div {...rise(0.22)} className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/start-free" className={`${PRIMARY_BUTTON} h-12 w-auto max-sm:w-full px-7 text-[17px]`}>
              Start free
            </Link>
            <a
              href="#product"
              className="group inline-flex items-center gap-0.5 text-[17px] font-[500] transition-opacity hover:opacity-70"
              style={{ color: C.blueHi }}
            >
              See what’s inside
              <ChevronRight size={17} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
            </a>
          </m.div>

          <m.p {...rise(0.3, 0)} className="mt-4 text-[13px]" style={{ color: C.faint }}>
            {trialDays ? `${trialDays}-day free trial` : 'Free trial'} · No card required
          </m.p>
        </div>

        <m.div {...rise(0.34, 30)} className="mx-auto mt-10 max-w-[420px] sm:mt-14">
          <StudioMark size={340} priority />
        </m.div>
      </Container>
    </section>
  );
}
