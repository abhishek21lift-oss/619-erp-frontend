'use client';

import * as React from 'react';
import Link from 'next/link';
import { m, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { cn } from '@/components/ui/cn';
import { Skeleton } from '@/components/ui/Skeleton';
import { navy, iconChip, saffron, metricTone } from '../theme/colors';
import { fontFamily, fontSize, fontWeight } from '../theme/typography';
import { radius, border, shadow } from '../theme/shape';
import { metricCard } from '../theme/spacing';
import { EASE, duration as durationTokens } from '../theme/motion';
import { defaultFormat } from '../theme/format';
import { PremiumSparkline } from '../PremiumSparkline';
import { ChartEmpty, ChartError } from '../primitives';
import type { Surface } from '../theme/surface';
import type {
  MetricTrend, MetricComparison, MetricStatus, MetricSparklineSpec, MetricProgressSpec,
} from './types';

export type { MetricTrend, MetricComparison, MetricStatus, MetricSparklineSpec, MetricProgressSpec };

export interface PremiumMetricCardProps {
  label: string;
  /** The primary figure. A ReactNode, not a number — callers format their
   *  own currency/compact notation (₹4.25L), exactly like every existing
   *  KPI card in this app already does. */
  value: React.ReactNode;
  icon?: React.ReactNode;
  trend?: MetricTrend;
  comparison?: MetricComparison;
  sparkline?: MetricSparklineSpec;
  progress?: MetricProgressSpec;
  status?: MetricStatus;
  surface?: Surface;
  /** Either makes the whole card a link... */
  href?: string;
  /** ...or a button. Never both — see the render rule below. */
  onClick?: () => void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  /** True when there is genuinely nothing to show. Distinct from `value`
   *  being 0 or "—", which is real, measured data and renders normally. */
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Renders the card's own border/background/padding/entrance-motion.
   *  Set false to embed this card's value/label/context stack inside a
   *  page's own card — the same purpose `bordered` serves on every
   *  chart component, so a metric never doubles up its container. */
  bordered?: boolean;
  /**
   * `default` is a standalone KPI tile — the shape in this file's own doc
   * comment. `compact` is the same hierarchy at the density a dense grid of
   * many small figures needs (a diagnostics panel, a table's summary row):
   * a ~14px value instead of a 30px one, no vertical padding of its own,
   * an uppercase micro-label. Pick `compact` when several of these sit
   * inside one already-bordered card rather than as the card themselves —
   * almost always paired with `bordered={false}`.
   */
  density?: 'default' | 'compact';
  /** Overrides the value's colour with an already-computed one (e.g. a
   *  caller's own semantic red for "3 failed jobs"). Escape hatch for
   *  call sites that compute their own colour rather than using `status`
   *  or `trend` — prefer those two where the colour is genuinely a trend
   *  or a state, since they also carry a non-colour cue (an arrow, a
   *  label) that this override does not add on its own. */
  valueColor?: string;
  ariaLabel?: string;
  className?: string;
}

/**
 * The engine every named variant (MetricWithTrend, MetricWithSparkline, …)
 * forwards to — there is exactly one KPI card implementation in this system,
 * not one per variant. A "variant" is just this component with one of
 * `trend` / `comparison` / `sparkline` / `progress` / `status` / `icon` set;
 * see MetricVariants.tsx for the thin, typed wrappers.
 *
 * ── The render rule ─────────────────────────────────────────────────────
 *
 * Every context field below `value` is optional, and none is ever invented.
 * `trend`, `comparison`, `sparkline`, `progress` and `status` are omitted
 * from the card entirely when the caller has no real data for them — this
 * component never fabricates a delta, a previous value or a trend line. The
 * hierarchy is fixed regardless of which are present: primary value, then
 * label, then trend/comparison context, then the supporting visualization,
 * which stays visually subordinate (small, muted, at the card's bottom edge)
 * to the number it supports.
 */
export function PremiumMetricCard({
  label,
  value,
  icon,
  trend,
  comparison,
  sparkline,
  progress,
  status,
  surface = 'auto',
  href,
  onClick,
  loading = false,
  error = null,
  onRetry,
  empty = false,
  emptyTitle = 'No data yet',
  emptyDescription,
  bordered = true,
  density = 'default',
  valueColor,
  ariaLabel,
  className,
}: PremiumMetricCardProps) {
  const reduce = useReducedMotion();
  const dark = surface === 'dark';
  const interactive = Boolean(href || onClick);
  const isEmpty = empty || value === null || value === undefined;
  const compact = density === 'compact';

  const frameStyle: React.CSSProperties = bordered
    ? {
        borderRadius: radius.card,
        padding: compact ? 0 : metricCard.padding,
        background: dark
          ? `linear-gradient(155deg, ${navy.panel} 0%, ${navy.canvasAlt} 100%)`
          : 'var(--bg-card, #fff)',
        border: `${border.width}px solid ${dark ? navy.line : border.default}`,
        boxShadow: dark ? shadow.cardDark : shadow.card,
      }
    : {};

  const iconSize = compact ? metricCard.iconChip * 0.7 : metricCard.iconChip;

  let body: React.ReactNode;

  if (loading) {
    body = <MetricSkeleton label={label} compact={compact} icon={Boolean(icon)} context={Boolean(trend || comparison || status)} viz={Boolean(sparkline || progress)} dark={dark} />;
  } else if (error) {
    body = <ChartError height={compact ? 60 : metricCard.iconChip + metricCard.vizHeight + 60} message={error} onRetry={onRetry} />;
  } else if (isEmpty) {
    body = <ChartEmpty height={compact ? 60 : metricCard.iconChip + metricCard.vizHeight + 60} title={emptyTitle} description={emptyDescription} />;
  } else {
    body = (
      <>
        {(icon || status) && (
          <div className={compact ? 'mb-1 flex items-center justify-between gap-2' : 'mb-2.5 flex items-center justify-between gap-2'}>
            {icon ? (
              <span
                className="grid flex-shrink-0 place-items-center"
                style={{
                  width: iconSize,
                  height: iconSize,
                  borderRadius: compact ? radius.legendSwatch : radius.chip,
                  background: dark ? iconChip.bgDark : iconChip.bg,
                  color: dark ? iconChip.fgDark : iconChip.fg,
                }}
                aria-hidden
              >
                {icon}
              </span>
            ) : <span />}
            {status && <StatusPill status={status} compact={compact} />}
          </div>
        )}

        {/* Compact swaps the order back to label-above-value on purpose —
            it is standing in for a dense diagnostics row (Command Center's
            Stat), not a headline KPI tile, and that density of grid reads
            top-down by label first, the way every other compact stat row
            in the app already does. The value → label → context hierarchy
            above is for the standalone tile this component is named for. */}
        {compact && (
          <p
            className="truncate uppercase"
            style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, letterSpacing: '0.05em', color: dark ? navy.muted : 'var(--text-tertiary, var(--text-muted))' }}
          >
            {label}
          </p>
        )}
        <p
          className="truncate tabular-nums"
          style={{
            fontFamily: fontFamily.sans,
            fontSize: compact ? fontSize.label : fontSize.hero,
            fontWeight: compact ? fontWeight.bold : fontWeight.black,
            letterSpacing: compact ? 'normal' : '-0.02em',
            lineHeight: 1.1,
            color: valueColor ?? (dark ? navy.ink : 'var(--text-primary)'),
          }}
        >
          {value}
        </p>
        {!compact && (
          <p
            className="mt-1 truncate"
            style={{
              fontSize: fontSize.base,
              fontWeight: fontWeight.semibold,
              color: dark ? navy.muted : 'var(--text-muted)',
            }}
          >
            {label}
          </p>
        )}

        {(trend || comparison) && (
          <div style={{ marginTop: compact ? 2 : metricCard.contextGap }}>
            {comparison ? <ComparisonLine {...comparison} /> : trend ? <TrendMark {...trend} /> : null}
          </div>
        )}

        {(sparkline || progress) && (
          <div style={{ marginTop: compact ? 4 : metricCard.vizGap, height: compact ? 20 : metricCard.vizHeight }}>
            {sparkline ? (
              <PremiumSparkline
                data={sparkline.data}
                color={sparkline.color ?? saffron[500]}
                metric={label}
                height={compact ? 20 : metricCard.vizHeight}
                surface={surface}
              />
            ) : progress ? (
              <ProgressBar {...progress} surface={surface} reduce={!!reduce} compact={compact} />
            ) : null}
          </div>
        )}
      </>
    );
  }

  // The card's content is real text (a heading-weight figure, a label, a
  // trend span that already carries its own spelled-out aria-label) — not a
  // graphic standing in for text the way a chart's SVG is. So the card is
  // left as a plain, unlabelled container: a screen reader reads the value,
  // the label and the trend in the order they appear, same as it would any
  // other text. `role="img"` here would collapse all of that into one flat
  // string and hide the trend's own description — the opposite of what
  // "accessible trend descriptions" asks for.
  const content = (
    <m.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={interactive && !reduce ? { y: -3 } : undefined}
      whileTap={interactive && !reduce ? { scale: 0.99 } : undefined}
      transition={{ duration: reduce ? 0 : durationTokens.base / 1000, ease: EASE }}
      className={cn('relative flex flex-col', interactive && 'cursor-pointer', className)}
      style={frameStyle}
    >
      {body}
    </m.div>
  );

  // An interactive card's accessible name DOES need to be one string — but
  // it should still carry the number, not just the label, or a link reading
  // as "Monthly Revenue" tells a keyboard/screen-reader user nothing a
  // sighted user does not already have for free. Only collapsed to
  // `label` alone when `value` is a composed ReactNode with no plain-text
  // form to read.
  const accessibleName = ariaLabel
    ?? (typeof value === 'string' || typeof value === 'number' ? `${label}: ${value}` : label);

  if (href) {
    return (
      <Link href={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] rounded-[16px]" aria-label={accessibleName}>
        {content}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] rounded-[16px]"
        aria-label={accessibleName}
      >
        {content}
      </button>
    );
  }
  return content;
}

// ── Trend / comparison ──────────────────────────────────────────────────

function toneForTrend(value: number, goodDirection: 'up' | 'down' = 'up') {
  if (value === 0) return 'neutral' as const;
  const isUp = value > 0;
  const isGood = goodDirection === 'up' ? isUp : !isUp;
  return isGood ? 'positive' as const : 'negative' as const;
}

function TrendMark({ value, goodDirection = 'up', label }: MetricTrend) {
  const tone = metricTone[toneForTrend(value, goodDirection)];
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;
  const direction = value > 0 ? 'up' : value < 0 ? 'down' : 'unchanged';
  return (
    <span
      className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5"
      aria-label={`${direction} ${Math.abs(value).toFixed(1)} percent${label ? ` ${label}` : ''}`}
    >
      <span
        className="inline-flex flex-shrink-0 items-center gap-0.5 rounded-full px-1.5 py-[2px]"
        style={{ background: tone.bg, color: tone.color, fontWeight: fontWeight.bold, fontSize: fontSize.base }}
      >
        <Icon size={12} strokeWidth={2.75} aria-hidden />
        {Math.abs(value).toFixed(1)}%
      </span>
      {label && (
        <span className="truncate" style={{ color: 'var(--text-muted)', fontSize: fontSize.base }}>
          {label}
        </span>
      )}
    </span>
  );
}

function ComparisonLine({
  currentValue, previousValue, previousLabel = 'previous period', format = defaultFormat, goodDirection = 'up',
}: MetricComparison) {
  // A zero-previous-value comparison has no meaningful percentage change —
  // shown as the plain figures rather than a divide-by-zero delta.
  const delta = previousValue !== 0 ? ((currentValue - previousValue) / Math.abs(previousValue)) * 100 : null;
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
      {delta !== null && <TrendMark value={delta} goodDirection={goodDirection} />}
      <span className="truncate" style={{ color: 'var(--text-muted)', fontSize: fontSize.base }}>
        {format(previousValue)} {previousLabel}
      </span>
    </span>
  );
}

// ── Status pill ─────────────────────────────────────────────────────────

function StatusPill({ status, compact }: { status: MetricStatus; compact: boolean }) {
  const tone = metricTone[status.tone];
  return (
    <span
      className="inline-flex flex-shrink-0 items-center rounded-full"
      style={{
        background: tone.bg,
        color: tone.color,
        fontWeight: fontWeight.bold,
        fontSize: fontSize.xs,
        letterSpacing: '0.02em',
        padding: compact ? '1px 6px' : '3px 8px',
      }}
    >
      {status.label}
    </span>
  );
}

// ── Progress bar ────────────────────────────────────────────────────────
//
// A slim linear bar, not the radial PremiumProgressChart — a KPI card's
// supporting visual must stay subordinate to the number above it, and at
// card scale a linear fill reads that way while a ring competes for the
// eye. This is the one piece of the metric system that isn't a Nivo chart;
// it's a styled div, the same weight-class as the app's own existing
// inline progress bars (AdoptionBars, the Guardian's confidence bar) —
// reusing that established visual language rather than adding a second
// chart library for a shape this simple.

function ProgressBar({
  value, max = 100, format = defaultFormat, surface, reduce, compact,
}: MetricProgressSpec & { surface: Surface; reduce: boolean; compact: boolean }) {
  const dark = surface === 'dark';
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    // No role/aria-label wrapper: the percentage and the "value / max"
    // figures below are already plain visible text, so a screen reader
    // already has the real information without an extra image label. Only
    // the coloured fill track itself is decorative.
    <div>
      <div
        aria-hidden
        className={cn('w-full overflow-hidden rounded-full', compact ? 'h-[4px]' : 'h-[6px]')}
        style={{ background: dark ? 'rgba(255,255,255,0.08)' : 'var(--bg-subtle)' }}
      >
        <m.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${saffron[500]}, ${saffron[600]})` }}
          initial={reduce ? false : { width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: reduce ? 0 : durationTokens.slow / 1000, ease: EASE }}
        />
      </div>
      {!compact && (
        <div className="mt-1 flex items-center justify-between" style={{ fontSize: fontSize.xs, color: dark ? navy.muted : 'var(--text-muted)' }}>
          <span className="tabular-nums">{Math.round(pct)}%</span>
          <span className="tabular-nums">{format(value)} / {format(max)}</span>
        </div>
      )}
    </div>
  );
}

// ── Loading skeleton ────────────────────────────────────────────────────
//
// Shaped like the card it stands in for — icon chip, value, label, and
// (only when the caller says this card WILL have one) a context line and a
// full-width visualization block — so nothing shifts height when the real
// content arrives.

function MetricSkeleton({
  label, icon, context, viz, dark, compact,
}: { label: string; icon: boolean; context: boolean; viz: boolean; dark: boolean; compact: boolean }) {
  // The app's own --bg-subtle/--bg-hover skeleton tokens track the app's
  // light/dark toggle, not this card's own `surface` override — on a card
  // pinned to the dark navy surface while the app itself is in light mode,
  // those tokens would resolve light and paint mismatched bars over a dark
  // background. Overridden to a translucent white wash in that one case.
  const tone = dark ? { background: 'rgba(255,255,255,0.08)' } : undefined;
  const iconSize = compact ? metricCard.iconChip * 0.7 : metricCard.iconChip;
  return (
    <div role="status" aria-label={`Loading ${label}`}>
      <div aria-hidden>
        {compact && <Skeleton width="45%" height={11} className="mb-1" style={tone} />}
        {icon && !compact && <Skeleton variant="circle" width={iconSize} height={iconSize} className="mb-2.5" style={tone} />}
        <Skeleton width={compact ? '60%' : '55%'} height={compact ? fontSize.label + 2 : fontSize.hero + 4} style={tone} />
        {!compact && <Skeleton width="40%" height={14} className="mt-2" style={tone} />}
        {context && <Skeleton width={compact ? '50%' : '65%'} height={compact ? 12 : 18} className={compact ? 'mt-1' : 'mt-2.5'} style={tone} />}
        {viz && <Skeleton width="100%" height={compact ? 20 : metricCard.vizHeight} className={compact ? 'mt-1' : 'mt-3'} style={tone} />}
      </div>
    </div>
  );
}
