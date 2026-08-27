'use client';

import * as React from 'react';
import { PremiumMetricCard, type PremiumMetricCardProps } from './PremiumMetricCard';
import type {
  MetricTrend, MetricComparison, MetricSparklineSpec, MetricProgressSpec, MetricStatus,
} from './types';

/**
 * Named, typed entry points onto PremiumMetricCard — one engine, seven
 * doors. Each of these renders through PremiumMetricCard directly; none of
 * them own layout, colour or state logic of their own, so there is exactly
 * one KPI card implementation in this system to keep visually consistent,
 * not eight. What each wrapper adds is a narrowed prop type: `MetricWithTrend`
 * cannot compile without a `trend`, so a page reaching for it cannot forget
 * the one thing that variant exists to show.
 *
 * Prefer `PremiumMetricCard` directly for a card that composes more than one
 * of these at once (a trend AND a sparkline, say) — the variants are for the
 * common single-purpose case a page usually wants.
 */

/** Standard — a large value and a label. No trend, no comparison, no viz. */
export function PremiumMetricCardStandard(props: Omit<PremiumMetricCardProps, 'trend' | 'comparison' | 'sparkline' | 'progress'>) {
  return <PremiumMetricCard {...props} />;
}

export interface MetricWithTrendProps extends Omit<PremiumMetricCardProps, 'trend'> {
  trend: MetricTrend;
}
/** Value + a positive/negative/neutral percentage change. */
export function MetricWithTrend(props: MetricWithTrendProps) {
  return <PremiumMetricCard {...props} />;
}

export interface MetricWithSparklineProps extends Omit<PremiumMetricCardProps, 'sparkline'> {
  sparkline: MetricSparklineSpec;
}
/** Value + a small trend line beneath it. */
export function MetricWithSparkline(props: MetricWithSparklineProps) {
  return <PremiumMetricCard {...props} />;
}

export interface MetricWithProgressProps extends Omit<PremiumMetricCardProps, 'progress'> {
  progress: MetricProgressSpec;
}
/** Value + a progress bar against a real ceiling. */
export function MetricWithProgress(props: MetricWithProgressProps) {
  return <PremiumMetricCard {...props} />;
}

export interface MetricWithComparisonProps extends Omit<PremiumMetricCardProps, 'comparison'> {
  comparison: MetricComparison;
}
/** Current value against a named previous period, with the delta computed from both. */
export function MetricWithComparison(props: MetricWithComparisonProps) {
  return <PremiumMetricCard {...props} />;
}

export interface MetricWithStatusProps extends Omit<PremiumMetricCardProps, 'status'> {
  status: MetricStatus;
}
/** Value + a contextual status pill (e.g. "On track", "Behind"). */
export function MetricWithStatus(props: MetricWithStatusProps) {
  return <PremiumMetricCard {...props} />;
}

export interface MetricWithIconProps extends Omit<PremiumMetricCardProps, 'icon'> {
  icon: React.ReactNode;
}
/** Value + a meaningful icon in its own accent chip. */
export function MetricWithIcon(props: MetricWithIconProps) {
  return <PremiumMetricCard {...props} />;
}
