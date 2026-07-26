'use client';

/**
 * BrandLogoWide — the horizontal MY PT STUDIO lockup (cube + wordmark) with a
 * neon halo behind it.
 *
 * Separate from BrandLogo rather than replacing it: this lockup is ~2.5:1, and
 * the square mark is still what the splash, the nav wordmark and the
 * pull-to-refresh indicator need. Forcing a wide lockup into those square boxes
 * would shrink it to an illegible sliver.
 *
 * ── About the neon on a light page ──────────────────────────────────────────
 * Neon is a dark-background idiom. Both surfaces this renders on are light
 * cream/white, so a literal glow would either vanish or turn into a muddy
 * smear. What works instead is a tight, saturated halo close to the mark plus a
 * wider, much fainter bloom — enough to read as emitted light without hazing
 * the text underneath.
 *
 * The blue is sampled from the artwork itself (#0060E0), not guessed, so the
 * halo looks like the mark is glowing rather than sitting on an unrelated
 * coloured cloud.
 */

import Image from 'next/image';
import { useState } from 'react';
import { m, useReducedMotion } from 'framer-motion';

/** Sampled from the dominant saturated blue in the logo artwork. */
const NEON = '#0060E0';

export default function BrandLogoWide({
  width,
  className = '',
  priority = false,
  intensity = 1,
}: {
  /** Rendered width in px. Height follows the artwork's 2.53:1 ratio. */
  width: number;
  className?: string;
  priority?: boolean;
  /** Scales the halo. 1 is the default; lower it on denser surfaces. */
  intensity?: number;
}) {
  const reduce = useReducedMotion();
  const [failed, setFailed] = useState(false);
  const height = Math.round(width / 2.53);

  // Fall back to plain text rather than a broken-image icon — the wordmark is
  // the brand, so losing the file must not lose the name.
  if (failed) {
    return (
      <span className={`inline-block font-[850] tracking-[-0.02em] ${className}`}
        style={{ fontSize: Math.round(width * 0.16), color: '#0F172A' }}>
        MY PT <span style={{ color: NEON }}>STUDIO</span>
      </span>
    );
  }

  return (
    <div className={`relative inline-block ${className}`} style={{ width, height }}>
      {/* Wide bloom — the outer falloff. Very low opacity: this sits behind
          body copy on both screens and must not tint it. */}
      <m.span
        aria-hidden
        className="pointer-events-none absolute rounded-full"
        style={{
          left: '-14%', right: '-14%', top: '-42%', bottom: '-42%',
          background: `radial-gradient(ellipse at center, ${NEON} 0%, transparent 68%)`,
          filter: `blur(${Math.round(width * 0.07)}px)`,
        }}
        initial={{ opacity: 0.16 * intensity }}
        animate={reduce ? { opacity: 0.16 * intensity } : { opacity: [0.13 * intensity, 0.24 * intensity, 0.13 * intensity] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Tight core halo — this is what actually reads as "neon". Kept close to
          the mark so the light looks emitted by it. */}
      <m.span
        aria-hidden
        className="pointer-events-none absolute rounded-full"
        style={{
          left: '4%', right: '4%', top: '-14%', bottom: '-14%',
          background: `radial-gradient(ellipse at center, ${NEON} 0%, transparent 60%)`,
          filter: `blur(${Math.round(width * 0.035)}px)`,
        }}
        initial={{ opacity: 0.3 * intensity }}
        animate={reduce ? { opacity: 0.3 * intensity } : { opacity: [0.24 * intensity, 0.42 * intensity, 0.24 * intensity] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
      />

      <Image
        src="/mypt-logo-wide.png"
        alt="MY PT STUDIO"
        width={1000}
        height={395}
        priority={priority}
        onError={() => setFailed(true)}
        className="relative object-contain"
        style={{
          width, height,
          // Two-stop drop shadow: a tight blue rim that hugs the glyph edges,
          // then a soft neutral shadow for depth. Blue alone reads as a print
          // mis-registration; neutral alone kills the neon.
          filter: `drop-shadow(0 0 ${Math.round(width * 0.02)}px ${NEON}${intensity >= 1 ? '99' : '66'}) drop-shadow(0 ${Math.round(width * 0.03)}px ${Math.round(width * 0.06)}px rgba(15,23,42,0.18))`,
        }}
      />
    </div>
  );
}
