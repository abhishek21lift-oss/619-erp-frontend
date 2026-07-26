'use client';

/**
 * Command Centre design primitives.
 *
 * A deliberately restrained, material-led treatment: layered translucent
 * surfaces, hairline borders, a soft ambient field for depth, precise tabular
 * typography, and motion that expresses cause and effect rather than decorating.
 *
 * ── Two decisions worth knowing ──────────────────────────────────────────────
 *
 * 1. Theme-adaptive, not dark-only. The reference style for this kind of
 *    operator console is dark-primary, but this page renders inside the shared
 *    AppShell chrome. Forcing a dark content area inside a light sidebar would
 *    read as a bug, not a design. Everything here is built on the semantic
 *    tokens so it is designed dark-first yet correct in both themes.
 *
 * 2. No `layoutId` for the tab indicator. AppShell mounts LazyMotion with
 *    `domAnimation` in strict mode, which excludes layout animations — a
 *    layoutId indicator would silently not animate. The indicator is a
 *    transform-driven element instead, which is also cheaper to composite.
 *
 * All motion is gated on prefers-reduced-motion.
 */

import * as React from 'react';
import { m, useReducedMotion } from 'framer-motion';

/** Expo-out. Already the easing used elsewhere in this codebase, so the console
 *  shares the app's rhythm rather than inventing a second one. */
export const EASE_EXPO = [0.16, 1, 0.3, 1] as const;

// ── Ambient field ─────────────────────────────────────────────────────────────
/**
 * Two very soft radial washes behind the content. This is what makes a flat
 * admin page read as a "console": depth without chrome. Deliberately low
 * opacity — it must never compete with data, and it is pointer-events:none so
 * it can never intercept a click.
 */
export function AmbientField() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 0 }}>
      {/* A tinted canvas. Without this the page is white, the cards are white,
          and "layered glass" reads as nothing at all on a phone — which is
          exactly how the first pass failed. The wash gives the surfaces
          something to sit ON so they read as objects. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, color-mix(in srgb, var(--brand) 7%, transparent) 0%, transparent 38%),'
            + 'radial-gradient(120% 70% at 100% 0%, color-mix(in srgb, #8B5CF6 9%, transparent) 0%, transparent 55%)',
        }}
      />
      <div
        className="absolute -top-[16%] left-[4%] h-[42vh] w-[42vh] rounded-full"
        style={{
          background: 'radial-gradient(circle, var(--brand) 0%, transparent 68%)',
          opacity: 0.16, filter: 'blur(80px)',
        }}
      />
      <div
        className="absolute bottom-[-12%] right-[-6%] h-[38vh] w-[38vh] rounded-full"
        style={{
          background: 'radial-gradient(circle, #8B5CF6 0%, transparent 68%)',
          opacity: 0.14, filter: 'blur(90px)',
        }}
      />
    </div>
  );
}

// ── Surface ───────────────────────────────────────────────────────────────────
/**
 * The single surface primitive. One elevation scale, one radius scale, one
 * border treatment — the thing that makes a dashboard feel designed rather than
 * assembled is that every panel agrees.
 *
 * `inset 0 1px 0` is the specular top edge that sells the material; it is what
 * separates a glass panel from a grey box.
 */
export function Panel({
  children, className = '', padded = true, interactive = false, style,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
  /** Adds a hover lift. Only for panels that are actually clickable. */
  interactive?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`relative rounded-[16px] sm:rounded-[18px] ${padded ? 'p-3.5 sm:p-5' : ''} ${interactive ? 'transition-transform duration-200 hover:-translate-y-0.5' : ''} ${className}`}
      style={{
        // --bg-elevated (solid) rather than --bg-card (translucent): on a
        // tinted canvas a translucent surface picks up the wash and stops
        // reading as a distinct object, which is what flattened the first pass.
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-card), inset 0 1px 0 rgba(255,255,255,0.06)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Section heading ───────────────────────────────────────────────────────────
export function SectionLabel({ children, hint }: { children: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between gap-3">
      <h2
        className="text-[10.5px] font-[750] uppercase"
        style={{ color: 'var(--text-muted)', letterSpacing: '0.14em' }}
      >
        {children}
      </h2>
      {hint && <span className="text-[11px]" style={{ color: 'var(--text-disabled)' }}>{hint}</span>}
    </div>
  );
}

// ── Staggered reveal ──────────────────────────────────────────────────────────
/**
 * Entrance motion. 40ms stagger, short travel, expo-out — enough to give the
 * page a sense of assembly without making an operator wait to read a number.
 * Collapses to an instant, non-animated render under reduced-motion.
 */
export function Reveal({
  children, delay = 0, className = '',
}: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, delay, ease: EASE_EXPO }}
    >
      {children}
    </m.div>
  );
}

// ── Segmented control ─────────────────────────────────────────────────────────
/**
 * Apple-style segmented control: the selection is one element that SLIDES
 * between segments rather than a background that pops on and off. That
 * continuity is the entire point — it tells the eye where the selection went.
 *
 * Driven by transform (not left/width) so it composites on the GPU and cannot
 * cause layout shift.
 */
export function SegmentedTabs<T extends string>({
  tabs, value, onChange,
}: {
  tabs: { id: T; label: string; icon?: React.ReactNode }[];
  value: T;
  onChange: (id: T) => void;
}) {
  const reduce = useReducedMotion();
  const index = Math.max(0, tabs.findIndex((t) => t.id === value));
  const pct = 100 / tabs.length;

  return (
    <div
      role="tablist"
      aria-label="Command centre sections"
      className="relative flex rounded-[14px] p-1"
      style={{
        background: 'var(--bg-subtle)',
        border: '1px solid var(--border)',
        boxShadow: 'inset 0 1px 2px rgba(15,23,42,0.05)',
      }}
    >
      {/* Sliding selection. aria-hidden: it is decoration, the buttons carry state. */}
      <div
        aria-hidden
        className="absolute inset-y-1 rounded-[10px]"
        style={{
          width: `calc(${pct}% - 0.5rem)`,
          left: '0.25rem',
          transform: `translateX(calc(${index} * (100% + 0.5rem)))`,
          transition: reduce ? 'none' : `transform 420ms cubic-bezier(${EASE_EXPO.join(',')})`,
          background: 'var(--bg-elevated)',
          boxShadow: 'var(--shadow-sm), inset 0 1px 0 rgba(255,255,255,0.10)',
          border: '1px solid var(--border)',
        }}
      />
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            /* Icon stacks above the label on phones and sits beside it from sm
               up. The label is ALWAYS rendered: an icon-only tab bar is a
               discoverability regression, and five unlabelled glyphs are not
               identifiable. */
            className="relative z-10 flex flex-1 flex-col items-center justify-center gap-0.5 rounded-[10px] px-1 py-1.5 transition-colors duration-200 sm:flex-row sm:gap-1.5 sm:py-2"
            style={{ color: active ? 'var(--text-primary)' : 'var(--text-muted)', minHeight: 44 }}
          >
            {t.icon}
            <span className="text-[9.5px] font-[700] leading-tight sm:text-[12.5px] sm:font-[680]">
              {t.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Stat tile ─────────────────────────────────────────────────────────────────
export type StatTone = 'brand' | 'positive' | 'caution' | 'critical' | 'neutral';

const TONE: Record<StatTone, string> = {
  brand: 'var(--brand)',
  positive: '#10B981',
  caution: '#F59E0B',
  critical: '#EF4444',
  neutral: 'var(--text-secondary)',
};

/**
 * The headline number. Three deliberate typographic choices:
 *   • tabular figures, so a value changing 9 → 10 does not shift the layout
 *   • tight tracking on the figure only (large text needs it, small text does not)
 *   • the label is muted ink, never the accent colour — colour belongs to the
 *     mark beside it, not to text
 */
export function StatTile({
  label, value, sub, icon, tone = 'brand', delay = 0,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: StatTone;
  delay?: number;
}) {
  const colour = TONE[tone];
  return (
    <Reveal delay={delay}>
      <Panel className="h-full overflow-hidden">
        {/* Top accent hairline — the tone reads before anything else loads,
            same idea as the plan-tier accent strip on studio cards. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[3px] rounded-t-[16px] sm:rounded-t-[18px]"
          style={{ background: `linear-gradient(90deg, ${colour} 0%, color-mix(in srgb, ${colour} 40%, transparent) 100%)` }}
        />
        {/* Accent wash — identity at a glance, without tinting any text.
            color-mix() (not string-appended alpha) because `colour` is
            sometimes a CSS var() reference — `var(--brand)22` is not a
            valid colour and would silently drop the rule for those tones. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[18px]"
          style={{ background: `radial-gradient(120% 90% at 0% 0%, color-mix(in srgb, ${colour} 13%, transparent) 0%, transparent 62%)` }}
        />
        <div className="relative">
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <span
              className="text-[10px] font-[750] uppercase"
              style={{ color: 'var(--text-muted)', letterSpacing: '0.13em' }}
            >
              {label}
            </span>
            {icon && (
              <span
                className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-[10px]"
                style={{
                  background: `linear-gradient(145deg, ${colour} 0%, color-mix(in srgb, ${colour} 65%, #000) 100%)`,
                  boxShadow: `0 4px 12px color-mix(in srgb, ${colour} 45%, transparent), inset 0 1px 0 rgba(255,255,255,0.28)`,
                  color: '#fff',
                }}
              >
                {icon}
              </span>
            )}
          </div>
          <p
            className="tabular-nums text-[23px] sm:text-[26px]"
            style={{
              color: 'var(--text-primary)',
              fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05,
            }}
          >
            {value}
          </p>
          {sub && (
            <p className="mt-1 text-[10.5px] leading-snug sm:text-[11px]" style={{ color: 'var(--text-muted)' }}>{sub}</p>
          )}
        </div>
      </Panel>
    </Reveal>
  );
}

// ── Console header ────────────────────────────────────────────────────────────
/**
 * The page's hero band. A gradient-washed card rather than bare text-on-canvas
 * — this is the first thing an operator sees on the command centre, so it
 * carries the "premium console" identity the rest of the page follows. Two
 * soft colour blobs give it depth without ever competing with the title or
 * the actions slot, and the icon badge gets the richest treatment on the
 * page since there is exactly one of it.
 */
export function ConsoleHeader({
  title, subtitle, icon, actions,
}: {
  title: string; subtitle?: string; icon?: React.ReactNode; actions?: React.ReactNode;
}) {
  return (
    <Reveal>
      <div
        className="relative mb-6 overflow-hidden rounded-[20px] px-4 py-5 sm:rounded-[22px] sm:px-6 sm:py-6"
        style={{
          background:
            'linear-gradient(135deg, color-mix(in srgb, var(--brand) 16%, var(--bg-elevated)) 0%, '
            + 'color-mix(in srgb, #8B5CF6 12%, var(--bg-elevated)) 55%, var(--bg-elevated) 100%)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-card), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}
      >
        {/* Ambient colour blobs — decoration only, clipped by the card's own
            overflow-hidden so they never bleed into surrounding layout. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-12 h-36 w-36 rounded-full sm:h-44 sm:w-44"
          style={{ background: 'radial-gradient(circle, #8B5CF6 0%, transparent 70%)', opacity: 0.28, filter: 'blur(34px)' }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-16 left-12 h-32 w-32 rounded-full sm:h-40 sm:w-40"
          style={{ background: 'radial-gradient(circle, var(--brand) 0%, transparent 70%)', opacity: 0.20, filter: 'blur(36px)' }}
        />

        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3.5">
            {icon && (
              <div
                className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[16px] sm:h-[52px] sm:w-[52px]"
                style={{
                  background: 'linear-gradient(145deg, #A78BFA 0%, var(--brand) 45%, #6D28D9 100%)',
                  boxShadow: '0 8px 22px color-mix(in srgb, var(--brand) 45%, transparent), inset 0 1px 0 rgba(255,255,255,0.32)',
                  color: '#fff',
                }}
              >
                {/* Specular top-edge sheen — the same "glass" cue as Panel's
                    inset highlight, scaled up for the one hero badge. */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.28) 0%, transparent 55%)' }}
                />
                <span className="relative">{icon}</span>
              </div>
            )}
            <div className="min-w-0">
              <h1
                className="truncate text-[20px] sm:text-[23px]"
                style={{
                  fontWeight: 850,
                  letterSpacing: '-0.024em',
                  backgroundImage: 'linear-gradient(90deg, var(--text-primary) 0%, color-mix(in srgb, var(--brand) 65%, var(--text-primary)) 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                {title}
              </h1>
              {/* Wraps to two lines on a phone instead of truncating mid-sentence
                  to "…account across …", which told the reader nothing. */}
              {subtitle && (
                <p className="mt-0.5 text-[11.5px] leading-snug sm:text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {actions}
        </div>
      </div>
    </Reveal>
  );
}
