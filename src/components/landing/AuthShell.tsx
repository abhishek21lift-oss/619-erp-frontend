'use client';

/**
 * The signed-out frame: both sign-in doors, Start Free, and password recovery.
 *
 * Left, on desktop: what this door is for, and the MY PT STUDIO mark standing
 * on the surface. Right: the form. On a phone the mark shrinks to a header
 * above the form, because the form is the reason somebody is on the page.
 *
 * Every page keeps its own <PublicNav> and its own top padding (tests pin both
 * in each page's source), so both are passed in rather than owned here.
 *
 * Nothing on this surface is illustrative data. The copy states what the
 * product does; the image is the brand mark; there are no sample clients,
 * figures or "live" chips.
 */

import type { CSSProperties, ReactNode } from 'react';
import { m } from 'framer-motion';
import StudioMark from './StudioMark';
import { C, CARD, EASE, STAGE } from './tokens';

export type AuthAside = {
  eyebrow: string;
  headline: ReactNode;
  sub: string;
  /** Short plain statements shown under the object — facts, not features. */
  notes?: string[];
};

/** The page behind the frame: white light falling into the grey band. */
export function StageBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0" style={{ background: STAGE.light }} />
    </div>
  );
}

export default function AuthShell({
  nav,
  mainStyle,
  aside,
  children,
}: {
  nav: ReactNode;
  mainStyle: CSSProperties;
  aside: AuthAside;
  children: ReactNode;
}) {
  return (
    <div
      className="relative flex min-h-[100dvh] flex-col"
      style={{ background: C.canvasAlt, color: C.body, fontFamily: "var(--font-inter), 'Inter', system-ui, sans-serif" }}
    >
      {nav}
      <StageBackdrop />

      <main className="relative z-10 flex flex-1 items-center justify-center" style={mainStyle}>
        <div className="grid w-full max-w-[1000px] items-center gap-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-16">
          {/* ── What this door is for (desktop) ───────────────────────────── */}
          <m.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="hidden lg:block"
          >
            <p className="text-[17px] font-[600] tracking-[-0.01em]" style={{ color: C.blueHi }}>
              {aside.eyebrow}
            </p>
            <h1
              className="mt-3 max-w-[520px] text-[clamp(2.2rem,3.4vw,3.1rem)] font-[600] leading-[1.07] tracking-[-0.028em]"
              style={{ color: C.ink }}
            >
              {aside.headline}
            </h1>
            <p className="mt-4 max-w-[460px] text-[16px] leading-[1.55]" style={{ color: C.muted }}>
              {aside.sub}
            </p>

            <StudioMark size={180} className="mt-8 max-w-[260px] !mx-0" />

            {aside.notes && aside.notes.length > 0 && (
              <ol
                className={`mt-8 grid max-w-[520px] gap-5 border-t pt-5 ${aside.notes.length === 4 ? 'grid-cols-2' : 'grid-cols-3'}`}
                style={{ borderColor: C.lineSoft }}
              >
                {aside.notes.map((n, i) => (
                  <li key={n}>
                    <span className="text-[12px] font-[600] tabular-nums" style={{ color: C.blueHi }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <p className="mt-1.5 text-[13px] leading-[1.45]" style={{ color: C.body }}>{n}</p>
                  </li>
                ))}
              </ol>
            )}
          </m.section>

          {/* ── The form ─────────────────────────────────────────────────── */}
          <m.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.06, ease: EASE }}
            className="mx-auto w-full max-w-[400px]"
          >
            <div className="-mb-3 lg:hidden">
              <StudioMark size={80} priority />
            </div>
            {children}
          </m.div>
        </div>
      </main>
    </div>
  );
}

/**
 * The card every signed-out form sits in, with its heading inside it — so the
 * page title is part of the object you are filling in, not floating above it.
 */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div>
      <div className="rounded-[20px] p-6 sm:p-8" style={cardStyle}>
        <h2 className="text-[26px] font-[600] leading-[1.12] tracking-[-0.022em]" style={{ color: C.ink }}>
          {title}
        </h2>
        {subtitle && (
          <p className="mt-2 text-[14px] leading-[1.5]" style={{ color: C.muted }}>{subtitle}</p>
        )}
        {children}
      </div>
      {footer}
    </div>
  );
}

// A module constant so the card's style object is not rebuilt per render.
const cardStyle: CSSProperties = {
  background: CARD.background,
  border: CARD.border,
  boxShadow: CARD.boxShadow,
  backdropFilter: CARD.backdropFilter,
  WebkitBackdropFilter: CARD.backdropFilter,
};
