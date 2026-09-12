/**
 * Canonical Insights metric definitions — frontend mirror of
 * backend src/modules/insights/metric-definitions.js.
 *
 * ONE source of truth for labels, units and formulas. Pages must import types
 * and helpers from here (or @/lib/api endpoints that return these shapes) and
 * must NOT re-derive KPIs from row lists when a canonical aggregate exists.
 *
 * Business rules (mirrored from backend):
 * - Revenue = collected money (pt_payments, deleted_at IS NULL). Never label
 *   contracted amounts as revenue.
 * - Attendance visit = status IN ('present','late'). See @/lib/checkin.
 * - renewal_rate = TRUE conversion (renewed_of_cohort / expired_cohort).
 *   active_share_pct is a snapshot and MUST be labelled as such.
 * - Totals come from unbounded SQL aggregates; LIMITed row lists are top-N.
 */

export const CHECKED_IN_STATUSES = ['present', 'late'] as const;

export interface CanonicalWindow {
  from: string;
  to: string;
}

export interface RevenueMetric {
  metric?: string;
  from?: string;
  to?: string;
  count: number;
  total: number;
  total_incentives: number;
}

export interface DuesSummaryMetric {
  metric?: string;
  total_outstanding: number;
  debtor_count: number;
  high_risk_count: number;
  medium_risk_count: number;
}

export interface AttendancePoint {
  date: string;
  present: number;
  absent: number;
  late: number;
  total: number;
  visits: number;
  attendance_rate?: number | null;
}

export interface AttendanceMetric {
  metric?: string;
  from: string;
  to: string;
  granularity: 'day' | 'week' | 'month';
  series: AttendancePoint[];
  totals: {
    present: number;
    late: number;
    absent: number;
    total: number;
    visits: number;
    attendance_rate: number | null;
  };
}

export interface RenewalMetric {
  metric?: string;
  from: string;
  to: string;
  expired_cohort: number;
  renewed_in_period: number;
  renewed_of_cohort: number;
  /** TRUE renewal conversion. Null when no packages expired in window — render as "—", never 0%. */
  renewal_rate: number | null;
  renewal_revenue: number;
  renewal_transactions: number;
  active: number;
  expired: number;
  expiring_7d: number;
  expiring_30d: number;
  /** Snapshot only. Never label as renewal rate. */
  active_share_pct: number | null;
}

export interface UtilisationMetric {
  metric?: string;
  this_month_total: number;
  this_month_completed: number;
  last_month_completed: number;
  utilisation_pct: number | null;
}

export interface TrainerMetricRow {
  id: string;
  name: string;
  specialization?: string | null;
  active_clients: number;
  total_clients: number;
  month_revenue: number;
  total_revenue: number;
}

export interface InsightsOverview {
  metric_engine: string;
  window: CanonicalWindow;
  revenue: RevenueMetric;
  dues: DuesSummaryMetric;
  attendance: AttendanceMetric;
  renewals: RenewalMetric;
  utilisation: UtilisationMetric;
  monthly: Array<{
    month_num: number;
    month_name: string;
    payment_count: number;
    revenue: number;
    incentives: number;
  }>;
  trainers: TrainerMetricRow[];
}

export interface BusinessInsight {
  id: string;
  urgency: 'critical' | 'warning' | 'info';
  count: number;
  title: string;
  detail: string;
  href: string;
  action?: { label: string; href: string };
}

/** Render a nullable percent honestly: null → em dash, never 0%. */
export function fmtRate(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  return `${v.toFixed(digits).replace(/\.0$/, '')}%`;
}

export const num = (v: string | number | null | undefined): number => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};
