'use client';

/**
 * The signed-out frame: both sign-in doors, Start Free, and password recovery.
 *
 * Left, on desktop: what this door is for, and the MY PT STUDIO mark standing
 * on the surface. Right: the form. On a phone the mark shrinks to a header above the form,
 * because the form is the reason somebody is on the page.
 *
 * Every page keeps its own <PublicNav> and its own top padding (tests pin both
 * in each page's source), so both are passed in rather than owned here.
 *
 * Nothing on this surface is illustrative data. The copy states what the
 * product does; the image is the brand mark; there are no sample clients,
 * figures or "live" chips.
 */

import type { CSSProperties, ReactNode } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import StudioMark from './StudioMark';
import { C, CARD, EASE, STAGE } from './tokens';

export type AuthAside = {
  eyebrow: string;
  headline: ReactNode;
  sub: string;
  /** Short plain statements shown under the object — facts, not features. */
  notes?: string[];
};

/** The page behind the frame: canvas, key light, drafting grid, horizon. */
export function StageBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
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
  const reduce = useReducedMotion();

  return (
    <div
      className="relative flex min-h-[100dvh] flex-col"
      style={{ background: C.canvas, color: C.body, fontFamily: "var(--font-inter), 'Inter', system-ui, sans-serif" }}
    >
      {nav}
      <StageBackdrop />

      <main className="relative z-10 flex flex-1 items-center justify-center" style={mainStyle}>
        <div className="grid w-full max-w-[1180px] items-center gap-6 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-16">
          {/* ── The object and what this door is for (desktop) ─────────────── */}
          <m.section
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="hidden lg:block"
          >
            <p className="flex items-center gap-2.5 font-mono text-[11px] font-[600] uppercase tracking-[0.2em]" style={{ color: C.blueHi }}>
              <span className="h-[7px] w-[7px] rounded-[2px]" style={{ background: C.blue }} />
              {aside.eyebrow}
            </p>
            <h1
              className="mt-4 max-w-[560px] text-[44px] font-[820] leading-[1.02] tracking-[-0.038em]"
              style={{ color: C.ink }}
            >
              {aside.headline}
            </h1>
            <p className="mt-4 max-w-[500px] text-[16px] leading-[1.6]" style={{ color: C.muted }}>
              {aside.sub}
            </p>

            <StudioMark size={200} className="mt-6 max-w-[300px] !mx-0" />

            {aside.notes && aside.notes.length > 0 && (
              <ol className="-mt-4 grid max-w-[560px] grid-cols-3 gap-5 border-t pt-5" style={{ borderColor: 'rgba(31,42,61,0.12)' }}>
                {aside.notes.map((n, i) => (
                  <li key={n}>
                    <span className="font-mono text-[10.5px] font-[600] tracking-[0.14em]" style={{ color: C.blueHi }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <p className="mt-1.5 text-[13px] font-[560] leading-[1.45]" style={{ color: C.body }}>{n}</p>
                  </li>
                ))}
              </ol>
            )}
          </m.section>

          {/* ── The form ─────────────────────────────────────────────────── */}
          <m.div
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: reduce ? 0 : 0.08, ease: EASE }}
            className="mx-auto w-full max-w-[440px]"
          >
            <div className="-mb-3 lg:hidden">
              <StudioMark size={84} priority />
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
      <div className="rounded-[28px] p-6 sm:p-8" style={{ ...cardStyle }}>
        <h2 className="text-[26px] font-[800] leading-[1.1] tracking-[-0.03em]" style={{ color: C.ink }}>
          {title}
        </h2>
        {subtitle && (
          <p className="mt-2 text-[14px] leading-[1.55]" style={{ color: C.muted }}>{subtitle}</p>
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
