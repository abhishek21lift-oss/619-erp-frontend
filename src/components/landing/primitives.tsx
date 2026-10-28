'use client';

import type { ReactNode } from 'react';
import { m } from 'framer-motion';
import { C, EASE } from './tokens';

/**
 * Scroll-reveal wrapper. Fade + rise, once, with a stagger delay.
 *
 * Reduced motion is handled by the root `MotionConfig reducedMotion="user"`,
 * which collapses the transform for visitors who ask for less motion. It is
 * deliberately NOT branched here: the server cannot read the media query, so a
 * different `initial` style on the client is a hydration mismatch — and React
 * keeps the server's `opacity: 0` without patching it, leaving the whole
 * section invisible for exactly those visitors.
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
  const Tag = as === 'section' ? m.section : m.div;
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-70px' }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </Tag>
  );
}

/** Page content column — the landing's single width rhythm. */
export function Container({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1024px] px-6 ${className}`}>{children}</div>;
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
      className={`relative scroll-mt-24 py-24 sm:py-32 ${className}`}
      style={alt ? { background: C.canvasAlt } : undefined}
    >
      {children}
    </section>
  );
}

/** A short coloured label above a headline — sentence case, no pill. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[17px] font-[600] tracking-[-0.01em]" style={{ color: C.blueHi }}>
      {children}
    </p>
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
    <div className={center ? 'mx-auto max-w-[820px] text-center' : 'max-w-[820px]'}>
      <Reveal>
        <Eyebrow>{eyebrow}</Eyebrow>
      </Reveal>
      <Reveal delay={0.05}>
        <h2
          id={id}
          className="mt-3 text-[clamp(2rem,4.2vw,3.3rem)] font-[600] leading-[1.08] tracking-[-0.022em]"
          style={{ color: C.ink }}
        >
          {title}
        </h2>
      </Reveal>
      {sub && (
        <Reveal delay={0.1}>
          <p className="mt-5 text-[17px] leading-[1.5] sm:text-[19px]" style={{ color: C.muted }}>
            {sub}
          </p>
        </Reveal>
      )}
    </div>
  );
}
