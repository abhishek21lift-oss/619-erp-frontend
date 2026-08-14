'use client';

import React from 'react';
import { blue, amber, emerald } from '@/lib/palette';

// Chart primitives for the Control Centre.
//
// Hand-rolled SVG rather than a charting library: the app ships no chart
// dependency, the shapes needed here are simple, and a library would arrive
// with its own theming model to fight with the CSS variables everything else
// uses.
//
// ── The palette is constrained, and separates by lightness ───────────────
//
// This was four distinct hues — emerald, blue, amber and a violet — chosen
// against a colourblind/contrast check: every hue inside its mode's OKLCH
// lightness band, above the chroma floor, worst adjacent pair separating by
// ΔE 27 for normal vision and 24.9 under deuteranopia.
//
// The five-colour system removed violet, so a fourth hue is no longer
// available to spend here. The fourth slot is now a pale blue instead: it is
// the same hue as the first, which would be a problem if hue were doing the
// work, and it is not — the two sit ~55 points of L apart, which reads at a
// glance and survives every form of colour blindness, since none of them
// affect lightness.
//
// Ordered so the two blues are never adjacent. Red is deliberately absent:
// amber against red separates by only ΔE 11.8, under the floor of 15, so a
// viewer with full colour vision could not reliably tell "at risk" from
// "ended".
//
// Two of these drop below 3:1 against the dark surface, which obligates
// visible labels rather than forbidding the colour — so every consumer of
// SERIES renders a legend carrying the label AND the value, and identity
// never rests on colour alone.
export const SERIES = [blue[500], amber[600], emerald[600], blue[200]] as const;

/**
 * Single-hue magnitude. Used where the categories have a natural order
 * (cheapest plan to dearest) or where there is only one measure — a rainbow
 * there would invent distinctions the data does not have.
 */
const RAMP = (pct: number) => `color-mix(in srgb, var(--brand) ${Math.round(22 + pct * 68)}%, transparent)`;

const nf = (n: number) => n.toLocaleString('en-IN');

/* ── Shared chart frame ──────────────────────────────────────────────────── */

function ChartFrame({ title, hint, children, footer }: {
  title: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div
      className="relative flex h-full flex-col rounded-[16px] p-3.5 sm:rounded-[18px] sm:p-4"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-card), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}
    >
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3
          className="text-[10px] font-[750] uppercase"
          style={{ color: 'var(--text-muted)', letterSpacing: '0.13em' }}
        >
          {title}
        </h3>
        {/* Fixed min-height so swapping between the resting hint and a hover
            readout never nudges the chart below it. */}
        <span className="min-h-[15px] text-right text-[11px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
          {hint}
        </span>
      </div>
      {children}
      {footer && <div className="mt-3">{footer}</div>}
    </div>
  );
}

/* ── Vertical bars ───────────────────────────────────────────────────────── */

export type BarPoint = { label: string; value: number; sub?: string };

/**
 * Magnitude per discrete bucket — a month's revenue, a day's requests.
 *
 * Bars rather than a line: a line between two months implies values in
 * between that were never measured. Always zero-anchored, so the height of a
 * bar IS the value rather than its distance from an arbitrary floor.
 */
export function BarChart({ title, points, format = nf, hint, height = 96, accent }: {
  title: string;
  points: BarPoint[];
  format?: (n: number) => string;
  hint?: React.ReactNode;
  height?: number;
  accent?: string;
}) {
  const [hover, setHover] = React.useState<number | null>(null);
  const max = Math.max(1, ...points.map((p) => p.value));
  const active = hover !== null ? points[hover] : null;
  const fill = accent ?? 'var(--brand)';

  return (
    <ChartFrame
      title={title}
      hint={active ? <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{active.label} · {format(active.value)}</span> : hint}
    >
      <div
        className="flex items-end gap-[3px]"
        style={{ height }}
        onMouseLeave={() => setHover(null)}
      >
        {points.map((p, i) => (
          <button
            key={p.label + i}
            type="button"
            className="group relative flex h-full flex-1 items-end"
            // maxWidth is what stops a sparse series rendering as a slab.
            //
            // Each bar is flex-1, so with ONE data point that bar took the
            // full width — and its height is value/max, which for a single
            // point is always 100%. The result was a solid filled rectangle
            // the width and height of the plot area: it read as a broken
            // chart rather than as "one month of data so far", which is what
            // a new platform legitimately has.
            //
            // 40px is above the ~25px twelve bars get in this container, so a
            // full year is unchanged; it only binds when there are few enough
            // bars for them to stretch into blocks.
            style={{ minWidth: 4, maxWidth: 40 }}
            aria-label={`${p.label}: ${format(p.value)}`}
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            // Touch has no hover. Without this the tooltip is desktop-only,
            // and this console is used on a phone more than a laptop.
            onTouchStart={() => setHover(i)}
          >
            <div
              className="w-full rounded-t-[4px] transition-[background] duration-150"
              style={{
                height: `${(p.value / max) * 100}%`,
                // An empty bucket still shows a 2px sliver, so "nothing
                // happened" reads differently from "nothing rendered".
                // minHeight rather than a CSS max() in the height: max() here
                // is valid CSS but makes the computed height unreadable to
                // anything that does not implement it, and the floor is a
                // layout concern rather than part of the scale.
                minHeight: 2,
                background: hover === i ? fill : `color-mix(in srgb, ${fill} 58%, transparent)`,
              }}
            />
          </button>
        ))}
      </div>
      {/* Only the ends are labelled. A tick under every bar is unreadable at
          twelve months on a 390pt screen, and the hover readout names the
          exact bucket anyway. */}
      <div className="mt-1.5 flex justify-between text-[9.5px]" style={{ color: 'var(--text-disabled)' }}>
        <span>{points[0]?.label}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </ChartFrame>
  );
}

/* ── Horizontal bars ─────────────────────────────────────────────────────── */

export type HBarRow = { label: string; value: number; sub?: string };

/**
 * Ranked categories with long names — plan tiers, top studios. Horizontal
 * because a vertical bar cannot carry "Founder Club (12 months)" under it
 * without rotating the text.
 */
export function HBarChart({ title, rows, format = nf, hint, empty }: {
  title: string;
  rows: HBarRow[];
  format?: (n: number) => string;
  hint?: React.ReactNode;
  empty?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));

  return (
    <ChartFrame title={title} hint={hint}>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-[12px]" style={{ color: 'var(--text-muted)' }}>
          {empty ?? 'Nothing to show yet.'}
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {rows.map((r) => (
            <div key={r.label}>
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-[12px] font-[650]" style={{ color: 'var(--text-primary)' }}>
                  {r.label}
                </span>
                <span className="shrink-0 text-[11px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                  {r.sub ? `${r.sub} · ` : ''}{format(r.value)}
                </span>
              </div>
              <div className="h-[6px] w-full overflow-hidden rounded-full" style={{ background: 'var(--bg-subtle)' }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, background: RAMP(r.value / max) }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </ChartFrame>
  );
}

/* ── Part-to-whole ───────────────────────────────────────────────────────── */

export type Segment = { label: string; value: number; hint?: string };

/**
 * One bar, split into parts, with a legend that carries every label AND its
 * value. Not a pie: comparing angles is harder than comparing lengths, and a
 * pie with eight slices is unreadable at any size.
 *
 * The legend is not optional decoration — two of the four hues fall below 3:1
 * against the dark surface, so the written label is what makes each segment
 * identifiable rather than merely visible.
 */
export function StackedBar({ title, segments, hint, total: totalOverride }: {
  title: string;
  segments: Segment[];
  hint?: React.ReactNode;
  total?: number;
}) {
  const shown = segments.filter((s) => s.value > 0);
  const total = totalOverride ?? segments.reduce((a, s) => a + s.value, 0);

  return (
    <ChartFrame title={title} hint={hint}>
      {total === 0 ? (
        <p className="py-6 text-center text-[12px]" style={{ color: 'var(--text-muted)' }}>Nothing to show yet.</p>
      ) : (
        <>
          {/* gap-[2px] is the surface showing through between fills — without
              it two adjacent segments of similar weight read as one. */}
          <div className="flex h-[26px] w-full gap-[2px] overflow-hidden rounded-[7px]">
            {shown.map((s, i) => (
              <div
                key={s.label}
                title={`${s.label}: ${nf(s.value)}`}
                style={{
                  width: `${(s.value / total) * 100}%`,
                  background: SERIES[segments.indexOf(s) % SERIES.length],
                  minWidth: 3,
                  borderRadius: i === 0 ? '7px 2px 2px 7px' : i === shown.length - 1 ? '2px 7px 7px 2px' : 2,
                }}
              />
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
            {segments.map((s, i) => (
              <div key={s.label} className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 shrink-0 rounded-[3px]"
                  style={{ background: SERIES[i % SERIES.length], opacity: s.value > 0 ? 1 : 0.35 }}
                />
                <span className="min-w-0 flex-1 truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {s.label}
                </span>
                <span className="shrink-0 text-[11.5px] font-[700] tabular-nums" style={{ color: 'var(--text-primary)' }}>
                  {nf(s.value)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </ChartFrame>
  );
}

/* ── Progress ring ───────────────────────────────────────────────────────── */

/**
 * A single ratio that has a natural ceiling — trial conversion, founder slots
 * taken. A ring rather than a bar because the ceiling is the point: the gap
 * left in the circle is what is still available.
 */
export function Ring({ title, value, max, label, sub, hint, tone = 'var(--brand)' }: {
  title: string;
  value: number;
  max: number;
  label: string;
  sub?: string;
  hint?: React.ReactNode;
  tone?: string;
}) {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const R = 34;
  const C = 2 * Math.PI * R;

  return (
    <ChartFrame title={title} hint={hint}>
      <div className="flex items-center gap-4">
        <svg width={84} height={84} viewBox="0 0 84 84" className="shrink-0" role="img" aria-label={`${label}: ${Math.round(pct * 100)}%`}>
          <circle cx={42} cy={42} r={R} fill="none" stroke="var(--bg-subtle)" strokeWidth={9} />
          <circle
            cx={42} cy={42} r={R} fill="none" stroke={tone} strokeWidth={9} strokeLinecap="round"
            strokeDasharray={`${C * pct} ${C}`}
            // Start at twelve o'clock rather than three, which is where a
            // reader expects a progress arc to begin.
            transform="rotate(-90 42 42)"
          />
          <text
            x={42} y={42} textAnchor="middle" dominantBaseline="central"
            style={{ fill: 'var(--text-primary)', fontSize: 17, fontWeight: 800, letterSpacing: '-0.03em' }}
          >
            {Math.round(pct * 100)}%
          </text>
        </svg>
        <div className="min-w-0">
          <p className="text-[13px] font-[750]" style={{ color: 'var(--text-primary)' }}>{label}</p>
          {sub && <p className="mt-0.5 text-[11.5px] leading-snug" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
        </div>
      </div>
    </ChartFrame>
  );
}
