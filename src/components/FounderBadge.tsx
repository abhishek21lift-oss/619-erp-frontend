'use client';

/**
 * The Founder badge — one of only twenty, forever.
 *
 * ── What earns it ──────────────────────────────────────────────────────────
 *
 * Nothing here decides that. The backend allocates a founder number when a
 * studio buys a 12-month term while slots remain (src/lib/subscription.js,
 * under a table lock so two simultaneous purchases cannot take the same
 * number), and the number is permanent — it survives renewal, and migration
 * 147 stops it ever being reissued. This component only draws what it is
 * given, and draws nothing at all when the number is missing.
 *
 * That last part is the important one: `number` is the whole gate. A studio
 * that is not a founder renders null, not a dimmed badge, not a placeholder.
 *
 * ── The number gates the badge; it is not printed on it ────────────────────
 *
 * The badge used to read "Founder #7/20". It now reads "Founder". The number
 * is still required, still validated against 1..20, and still the only thing
 * that decides whether anything renders — it just is not shown.
 *
 * Which means the prop is doing the same job it always did. Dropping it and
 * taking a boolean instead would let `isFounder` be computed anywhere by
 * anything; requiring the allocated number keeps the badge tied to a row the
 * backend wrote under a lock.
 *
 * ── Why gold, when the app has five colours ────────────────────────────────
 *
 * Because the five mean things and this must not. See the note beside
 * `founderGold` in lib/palette.ts — amber would read as a warning sitting
 * beside a studio name, and would cost amber its meaning everywhere else.
 *
 * ── Animation, and the cost of it ──────────────────────────────────────────
 *
 * Three effects: a shimmer that travels across the metal, a soft outer glow
 * that breathes, and a gentle scale pulse on the crown. All three are pure CSS
 * on `transform`, `opacity` and `background-position` — compositor properties,
 * so they never trigger layout or paint, and a page carrying twenty of these
 * costs the same as a page carrying one.
 *
 * Deliberately NOT framer-motion, which every other animated thing here uses.
 * This badge renders in the sidebar on every screen, and a JS animation loop
 * running for the life of the session to shimmer a decoration is not a trade
 * worth making. CSS keyframes are handed to the compositor and forgotten.
 *
 * `prefers-reduced-motion` stops all three. The badge stays gold, keeps its
 * crown and its wording, and simply holds still — motion is the decoration,
 * not the message.
 */

import { useId } from 'react';
import { founderGold } from '@/lib/palette';

/**
 * The cap. No longer printed on the badge, but still what makes it mean
 * anything — and still the upper bound the gate below validates against.
 */
export const FOUNDER_LIMIT = 20;

export interface FounderBadgeProps {
  /** 1–20. Anything else renders nothing — this is the entire eligibility gate. */
  number?: number | null;
  /**
   * `full` — crown and "Founder".
   * `crown` — the mark alone, with the wording in its accessible name.
   *
   * There used to be a `compact` variant that dropped the word and kept
   * "#4/20", for the sidebar where the studio name is clamped to 160px. With
   * the number gone it rendered exactly what `full` renders, so it is gone
   * too — "Founder" is short enough for the place compact existed to serve.
   */
  variant?: 'full' | 'crown';
  /** Scales the whole badge from its font size. */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  sm: { font: 10.5, pad: '3px 7px', crown: 11, radius: 7 },
  md: { font: 11.5, pad: '4px 9px', crown: 13, radius: 8 },
  lg: { font: 13, pad: '6px 12px', crown: 15, radius: 10 },
} as const;

export const FOUNDER_TOOLTIP =
  'Founding Member of MY PT STUDIO. One of only 20 lifetime Founder Studios.';

/** The crown. Inline SVG so it takes the shimmer gradient rather than a flat fill. */
function Crown({ size, gradientId }: { size: number; gradientId: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="founder-crown"
      style={{ flexShrink: 0, display: 'block' }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={founderGold[200]} />
          <stop offset="45%" stopColor={founderGold[400]} />
          <stop offset="100%" stopColor={founderGold[600]} />
        </linearGradient>
      </defs>
      {/* A crown with a flat base and three points, drawn solid rather than
          stroked: at 11px a stroked outline turns to mush, a filled silhouette
          stays legible.

          A jewel sat under the base in the first pass. Magnified it read as a
          detached dot rather than a gem — at badge size it was simply a speck
          below the crown, so it is gone. */}
      <path
        d="M3 8.2l3.6 2.7L12 4l5.4 6.9L21 8.2l-1.7 9.1a1.3 1.3 0 0 1-1.28 1.05H5.98A1.3 1.3 0 0 1 4.7 17.3L3 8.2z"
        fill={`url(#${gradientId})`}
      />
    </svg>
  );
}

export default function FounderBadge({
  number,
  variant = 'full',
  size = 'md',
  className = '',
}: FounderBadgeProps) {
  // Rendered before the early return: hooks cannot be called conditionally,
  // and a non-founder hitting this component is the common case.
  const uid = useId();
  const gradientId = `founder-crown-${uid.replace(/:/g, '')}`;

  // The gate. Not a founder, or a number outside the cap that was sold —
  // nothing renders. No dimmed badge, no "not a founder" state.
  if (typeof number !== 'number' || !Number.isInteger(number)) return null;
  if (number < 1 || number > FOUNDER_LIMIT) return null;

  const s = SIZES[size];
  // The accessible name matches the visible word rather than announcing a
  // number the badge no longer shows. The tooltip carries the rest.
  const label = 'Founder';

  return (
    <span
      className={`founder-badge ${className}`}
      // title gives the tooltip everywhere for free, including on touch via
      // long-press, and needs no portal — which matters because this renders
      // inside the sidebar and inside table cells, both of which clip.
      title={FOUNDER_TOOLTIP}
      aria-label={`${label}. ${FOUNDER_TOOLTIP}`}
      role="img"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: variant === 'crown' ? 0 : 5,
        padding: variant === 'crown' ? 0 : s.pad,
        borderRadius: s.radius,
        fontSize: s.font,
        fontWeight: 750,
        letterSpacing: '-0.01em',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        verticalAlign: 'middle',
        cursor: 'default',
        ...(variant === 'crown'
          ? {}
          : {
              // Near-black plate. The gold reads as metal against black in a
              // way it never does against white — and it keeps the badge
              // legible on both themes without a second set of values.
              background: 'linear-gradient(145deg,#1E293B 0%,#0F172A 100%)',
              border: `1px solid ${founderGold[600]}66`,
              boxShadow: `0 1px 2px rgba(15,23,42,0.30), inset 0 1px 0 ${founderGold[300]}22`,
            }),
      }}
    >
      <Crown size={s.crown} gradientId={gradientId} />
      {variant !== 'crown' && (
        <span
          className="founder-text"
          style={{
            // The shimmer: a wide gradient clipped to the glyphs, slid across
            // by background-position. Clipping to text means the highlight
            // travels through the letterforms rather than over a rectangle.
            backgroundImage: `linear-gradient(100deg, ${founderGold[300]} 0%, ${founderGold[200]} 18%, ${founderGold[100]} 30%, ${founderGold[300]} 45%, ${founderGold[400]} 70%, ${founderGold[300]} 100%)`,
            backgroundSize: '260% 100%',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          Founder
        </span>
      )}

      <style jsx>{`
        .founder-badge {
          position: relative;
          isolation: isolate;
        }
        /* The glow. A blurred copy of the plate behind the badge, breathing.
           ::before rather than a box-shadow animation, because animating a
           shadow repaints and animating opacity does not. */
        .founder-badge::before {
          content: '';
          position: absolute;
          inset: -3px;
          border-radius: inherit;
          background: radial-gradient(
            60% 60% at 50% 50%,
            ${founderGold[400]}55 0%,
            transparent 70%
          );
          opacity: 0.5;
          z-index: -1;
          animation: founder-glow 3.6s ease-in-out infinite;
          pointer-events: none;
        }
        .founder-text {
          animation: founder-shimmer 4.5s linear infinite;
        }
        :global(.founder-crown) {
          animation: founder-pulse 3.6s ease-in-out infinite;
          transform-origin: center;
        }

        @keyframes founder-shimmer {
          0% { background-position: 180% 0; }
          /* Rests for the back half of the cycle. A shimmer that never stops
             travelling reads as a loading state, which is the opposite of
             what this says. */
          55%, 100% { background-position: -80% 0; }
        }
        @keyframes founder-glow {
          0%, 100% { opacity: 0.32; }
          50% { opacity: 0.62; }
        }
        @keyframes founder-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.07); }
        }

        /* Motion is the decoration, not the message: the badge keeps its
           gold, its crown and its number, and simply stops moving. */
        @media (prefers-reduced-motion: reduce) {
          .founder-badge::before,
          .founder-text,
          :global(.founder-crown) {
            animation: none;
          }
          .founder-text {
            background-position: 40% 0;
          }
        }
      `}</style>
    </span>
  );
}
