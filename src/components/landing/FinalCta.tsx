'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Container, Reveal } from './primitives';
import { C, PRIMARY_BUTTON } from './tokens';

/** Closing panel — the page's one unmissable CTA, on the grey band. */
export default function FinalCta({ trialDays = 7 }: { trialDays?: number }) {
  return (
    <section aria-labelledby="final-cta-title" style={{ background: C.canvasAlt }}>
      <Container className="py-24 text-center sm:py-32">
        <Reveal>
          <h2
            id="final-cta-title"
            className="mx-auto max-w-[760px] text-[clamp(2rem,4.6vw,3.4rem)] font-[600] leading-[1.08] tracking-[-0.028em]"
            style={{ color: C.ink }}
          >
            Your PT business deserves a professional platform.
          </h2>
          <p className="mx-auto mt-5 max-w-[560px] text-[17px] leading-[1.5] sm:text-[19px]" style={{ color: C.muted }}>
            Stop running your studio on WhatsApp, diaries and hope. Your clients, programmes and
            revenue in one place within the hour.
          </p>
          <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/start-free" className={`${PRIMARY_BUTTON} h-12 w-auto max-sm:w-full px-7 text-[17px]`}>
              Start free
            </Link>
            <Link
              href="/login"
              className="group inline-flex items-center gap-0.5 text-[17px] font-[500] transition-opacity hover:opacity-70"
              style={{ color: C.blueHi }}
            >
              Log in
              <ChevronRight size={17} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </div>
          <p className="mt-5 text-[13px]" style={{ color: C.faint }}>
            No card required · {trialDays}-day trial · Founder&apos;s Club places at onboarding
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
