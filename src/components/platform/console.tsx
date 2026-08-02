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
            + 'radial-gradient(120% 70% at 100% 0%, color-mix(in srgb, #0067E0 9%, transparent) 0%, transparent 55%)',
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
          background: 'radial-gradient(circle, #0067E0 0%, transparent 68%)',
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
/**
 * The section switcher.
 *
 * Rewritten when the Control Centre reached twelve tabs. The previous version
 * gave every tab `flex-1` and positioned the sliding indicator arithmetically
 * as `100 / tabs.length` percent. That works while the tabs fit. At twelve
 * tabs on a 390pt phone it does not: the labels refuse to shrink below their
 * text, the row overflows a container with no scrolling, and everything past
 * Announcements is clipped off the right edge with no way to reach it. Five of
 * twelve sections were simply unreachable on a phone.
 *
 * So the row scrolls, tabs keep their natural width, and the indicator is
 * MEASURED from the active button rather than computed from a tab count. The
 * measurement is what makes it correct at any number of tabs and under any
 * font — the arithmetic version was only ever correct when every tab happened
 * to be the same width.
 */
export function SegmentedTabs<T extends string>({
  tabs, value, onChange,
}: {
  tabs: { id: T; label: string; icon?: React.ReactNode }[];
  value: T;
  onChange: (id: T) => void;
}) {
  const reduce = useReducedMotion();
  const scrollerRef = React.useRef<HTMLDivElement | null>(null);
  const btnRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const [box, setBox] = React.useState<{ left: number; width: number } | null>(null);

  // Measure the active tab and park the indicator on it. Runs on selection,
  // on resize, and after fonts settle — a label that reflows after a webfont
  // loads would otherwise leave the indicator behind.
  React.useLayoutEffect(() => {
    const measure = () => {
      const el = btnRefs.current[value];
      if (!el) return;
      setBox({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (scrollerRef.current) ro.observe(scrollerRef.current);
    const el = btnRefs.current[value];
    if (el) ro.observe(el);
    return () => ro.disconnect();
  }, [value, tabs.length]);

  // Keep the selected tab on screen. Selection can change from the sidebar or
  // a ?tab= deep link, not just from tapping this row, in which case the
  // active tab may be scrolled out of sight entirely.
  React.useEffect(() => {
    btnRefs.current[value]?.scrollIntoView({
      behavior: reduce ? 'auto' : 'smooth', block: 'nearest', inline: 'nearest',
    });
  }, [value, reduce]);

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        role="tablist"
        aria-label="Command centre sections"
        className="relative flex overflow-x-auto rounded-[14px] p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          background: 'var(--bg-subtle)',
          border: '1px solid var(--border)',
          boxShadow: 'inset 0 1px 2px rgba(15,23,42,0.05)',
        }}
      >
        {/* Sliding selection. aria-hidden: it is decoration, the buttons carry state. */}
        {box && (
          <div
            aria-hidden
            className="absolute inset-y-1 rounded-[10px]"
            style={{
              left: 0,
              width: box.width,
              transform: `translateX(${box.left}px)`,
              transition: reduce ? 'none' : `transform 420ms cubic-bezier(${EASE_EXPO.join(',')}), width 420ms cubic-bezier(${EASE_EXPO.join(',')})`,
              background: 'var(--bg-elevated)',
              boxShadow: 'var(--shadow-sm), inset 0 1px 0 rgba(255,255,255,0.10)',
              border: '1px solid var(--border)',
            }}
          />
        )}
        {tabs.map((t) => {
          const active = t.id === value;
          return (
            <button
              key={t.id}
              ref={(el) => { btnRefs.current[t.id] = el; }}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(t.id)}
              /* shrink-0, not flex-1: at twelve tabs flex-1 would squeeze each
                 to ~30px and the labels would collide. They keep their natural
                 width and the row scrolls instead.

                 The label is ALWAYS rendered. An icon-only tab bar is a
                 discoverability regression — twelve unlabelled glyphs are not
                 identifiable, and this row is the only way into most of the
                 Control Centre. */
              className="relative z-10 flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-[10px] px-2.5 py-1.5 transition-colors duration-200 sm:flex-row sm:gap-1.5 sm:px-3 sm:py-2"
              style={{ color: active ? 'var(--text-primary)' : 'var(--text-muted)', minHeight: 44 }}
            >
              {t.icon}
              <span className="whitespace-nowrap text-[9.5px] font-[700] leading-tight sm:text-[12.5px] sm:font-[680]">
                {t.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Edge fades. Without them a scrolling row looks like a row that simply
          ends, which is exactly the impression that hid five sections. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-1 left-1 w-6 rounded-l-[13px]"
        style={{ background: 'linear-gradient(90deg, var(--bg-subtle) 0%, transparent 100%)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-1 right-1 w-6 rounded-r-[13px]"
        style={{ background: 'linear-gradient(270deg, var(--bg-subtle) 0%, transparent 100%)' }}
      />
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
        className="relative mb-4 overflow-hidden rounded-[20px] px-4 py-3.5 sm:mb-6 sm:rounded-[22px] sm:px-6 sm:py-6"
        style={{
          background:
            'linear-gradient(135deg, color-mix(in srgb, var(--brand) 16%, var(--bg-elevated)) 0%, '
            + 'color-mix(in srgb, #0067E0 12%, var(--bg-elevated)) 55%, var(--bg-elevated) 100%)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-card), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}
      >
        {/* Ambient colour blobs — decoration only, clipped by the card's own
            overflow-hidden so they never bleed into surrounding layout. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-12 h-36 w-36 rounded-full sm:h-44 sm:w-44"
          style={{ background: 'radial-gradient(circle, #0067E0 0%, transparent 70%)', opacity: 0.28, filter: 'blur(34px)' }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-16 left-12 h-32 w-32 rounded-full sm:h-40 sm:w-40"
          style={{ background: 'radial-gradient(circle, var(--brand) 0%, transparent 70%)', opacity: 0.20, filter: 'blur(36px)' }}
        />

        {/* flex-nowrap on phones: wrapping is what pushed the search button
            onto its own line and doubled the hero's height. The title block
            can shrink (min-w-0 + truncate); the actions slot keeps its size. */}
        <div className="relative flex flex-nowrap items-center justify-between gap-3 sm:flex-wrap">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3.5">
            {icon && (
              <div
                className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[13px] sm:h-[52px] sm:w-[52px] sm:rounded-[16px]"
                style={{
                  background: 'linear-gradient(145deg, #7FB4FF 0%, var(--brand) 45%, #0067E0 100%)',
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
                className="truncate text-[17px] sm:text-[23px]"
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
              {/* Hidden on phones. It wrapped to two lines and, with the
                  actions slot wrapping below it, the hero was eating a sixth
                  of the viewport to explain a page the operator opens daily
                  and already knows. It stays from sm up, where it costs
                  nothing. */}
              {subtitle && (
                <p className="mt-0.5 hidden text-[11.5px] leading-snug sm:block sm:text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
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
