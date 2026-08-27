'use client';

import type { ReactNode } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { C, EASE } from './tokens';

/**
 * Scroll-reveal wrapper. Fade + rise, once, with a stagger delay.
 *
 * Framer's global `MotionConfig reducedMotion="user"` (root layout) already
 * collapses transforms for visitors who ask for less motion; the explicit
 * `useReducedMotion` branch additionally skips the hidden start so nothing
 * ever sits invisible for them.
 */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
  as = 'div',
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: 'div' | 'section';
}) {
  const reduce = useReducedMotion();
  const Tag = as === 'section' ? m.section : m.div;
  return (
    <Tag
      className={className}
      initial={reduce ? undefined : { opacity: 0, y }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-70px' }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </Tag>
  );
}

/** Page content column — the landing's single width rhythm. */
export function Container({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1200px] px-5 sm:px-8 ${className}`}>{children}</div>;
}

/** Section shell: vertical rhythm + anchor offset for the fixed nav. */
export function Section({
  id,
  children,
  className = '',
  alt = false,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  /** Alternate band background for rhythm between sections. */
  alt?: boolean;
}) {
  return (
    <section
      id={id}
      className={`relative scroll-mt-24 py-20 sm:py-28 ${className}`}
      style={alt ? { background: C.canvasAlt } : undefined}
    >
      {children}
    </section>
  );
}

/** Saffron eyebrow pill. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em]"
      style={{ color: C.goldHi, background: C.goldSoft, borderColor: 'rgba(245,158,11,0.28)' }}
    >
      {children}
    </span>
  );
}

/**
 * Shared section header: eyebrow → display heading → lead paragraph.
 * `id` is also used as the aria-labelledby target for the section.
 */
export function SectionHeader({
  eyebrow,
  title,
  sub,
  align = 'center',
  id,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  align?: 'center' | 'left';
  id?: string;
}) {
  const center = align === 'center';
  return (
    <div className={center ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}>
      <Reveal>
        <Eyebrow>{eyebrow}</Eyebrow>
      </Reveal>
      <Reveal delay={0.05}>
        <h2
          id={id}
          className="mt-5 text-[clamp(1.7rem,3.4vw,2.5rem)] font-[800] leading-[1.08] tracking-[-0.03em]"
          style={{ color: C.ink }}
        >
          {title}
        </h2>
      </Reveal>
      {sub && (
        <Reveal delay={0.1}>
          <p className="mt-5 text-[15px] leading-[1.7] sm:text-[17px]" style={{ color: C.muted }}>
            {sub}
          </p>
        </Reveal>
      )}
    </div>
  );
}
