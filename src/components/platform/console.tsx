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
      <div
        className="absolute -top-[18%] left-[8%] h-[46vh] w-[46vh] rounded-full"
        style={{
          background: 'radial-gradient(circle, var(--brand) 0%, transparent 68%)',
          opacity: 0.10, filter: 'blur(90px)',
        }}
      />
      <div
        className="absolute bottom-[-14%] right-[4%] h-[40vh] w-[40vh] rounded-full"
        style={{
          background: 'radial-gradient(circle, #8B5CF6 0%, transparent 68%)',
          opacity: 0.09, filter: 'blur(100px)',
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
      className={`relative rounded-[18px] ${padded ? 'p-4 sm:p-5' : ''} ${interactive ? 'transition-transform duration-200 hover:-translate-y-0.5' : ''} ${className}`}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-card), inset 0 1px 0 rgba(255,255,255,0.06)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
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
            className="relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-[10px] py-2 text-[12.5px] font-[680] transition-colors duration-200"
            style={{ color: active ? 'var(--text-primary)' : 'var(--text-muted)', minHeight: 40 }}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
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
        {/* Accent wash — identity at a glance, without tinting any text. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[18px]"
          style={{ background: `radial-gradient(120% 90% at 0% 0%, ${colour}14 0%, transparent 60%)` }}
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
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px]"
                style={{ background: `${colour}1a`, color: colour }}
              >
                {icon}
              </span>
            )}
          </div>
          <p
            className="tabular-nums"
            style={{
              color: 'var(--text-primary)',
              fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05,
            }}
          >
            {value}
          </p>
          {sub && (
            <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>{sub}</p>
          )}
        </div>
      </Panel>
    </Reveal>
  );
}

// ── Console header ────────────────────────────────────────────────────────────
export function ConsoleHeader({
  title, subtitle, icon, actions,
}: {
  title: string; subtitle?: string; icon?: React.ReactNode; actions?: React.ReactNode;
}) {
  return (
    <Reveal>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {icon && (
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]"
              style={{
                background: 'linear-gradient(145deg, var(--brand) 0%, color-mix(in srgb, var(--brand) 62%, #000) 100%)',
                boxShadow: '0 6px 18px color-mix(in srgb, var(--brand) 35%, transparent), inset 0 1px 0 rgba(255,255,255,0.22)',
                color: '#fff',
              }}
            >
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h1
              className="truncate"
              style={{ color: 'var(--text-primary)', fontSize: 21, fontWeight: 830, letterSpacing: '-0.022em' }}
            >
              {title}
            </h1>
            {subtitle && (
              <p className="mt-0.5 truncate text-[12px]" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
            )}
          </div>
        </div>
        {actions}
      </div>
    </Reveal>
  );
}
