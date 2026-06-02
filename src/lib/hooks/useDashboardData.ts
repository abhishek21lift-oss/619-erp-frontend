'use client';

import { useAsync } from '@/lib/use-async';
import { api } from '@/lib/api';

export type DashboardRecentPayment = {
  id: string;
  amount: number;
  method?: string;
  date?: string;
  client_name?: string;
  trainer_name?: string;
  receipt_no?: string;
};

export type DashboardMonthlyPoint = {
  month: string;
  revenue: number;
  count: number;
};

export type DashboardTopTrainer = {
  id: string;
  name: string;
  specialization?: string;
  active_clients: number;
  month_revenue: number;
};

export type DashboardData = {
  period: string;
  clients: {
    total: number;
    active: number;
    expired: number;
    frozen: number;
    new_this_month: number;
  };
  revenue: {
    today: number;
    month: number;
    year: number;
    total: number;
    period: number;
  };
  expiring_soon: number;
  total_dues: number;
  attendance_today: number;
  birthdays_today: number;
  anniversaries_today: number;
  pending_renewals: number;
  active_pt_clients: number;
  recent_payments: DashboardRecentPayment[];
  monthly_chart: DashboardMonthlyPoint[];
  top_trainers: DashboardTopTrainer[];
};

const MOCK_DATA: DashboardData = {
  period: '30d',
  clients: { total: 420, active: 342, expired: 58, frozen: 20, new_this_month: 28 },
  revenue: { today: 18500, month: 1720000, year: 8900000, total: 24500000, period: 1720000 },
  expiring_soon: 12,
  total_dues: 485000,
  attendance_today: 187,
  birthdays_today: 3,
  anniversaries_today: 5,
  pending_renewals: 18,
  active_pt_clients: 68,
  recent_payments: [
    { id: '1', client_name: 'Rahul Sharma', amount: 15000, method: 'UPI', date: '2026-05-30' },
    { id: '2', client_name: 'Priya Singh', amount: 12000, method: 'Cash', date: '2026-05-30' },
    { id: '3', client_name: 'Amit Kumar', amount: 8000, method: 'Card', date: '2026-05-29' },
    { id: '4', client_name: 'Sneha Patel', amount: 5000, method: 'UPI', date: '2026-05-29' },
    { id: '5', client_name: 'Vikram Joshi', amount: 20000, method: 'Bank', date: '2026-05-28' },
  ],
  monthly_chart: [
    { month: 'Dec', revenue: 1240000, count: 42 },
    { month: 'Jan', revenue: 1380000, count: 48 },
    { month: 'Feb', revenue: 1520000, count: 55 },
    { month: 'Mar', revenue: 1480000, count: 52 },
    { month: 'Apr', revenue: 1650000, count: 58 },
    { month: 'May', revenue: 1720000, count: 62 },
  ],
  top_trainers: [
    { id: '1', name: 'Priya Sharma', specialization: 'Strength', active_clients: 18, month_revenue: 320000 },
    { id: '2', name: 'Amit Verma', specialization: 'Yoga', active_clients: 15, month_revenue: 280000 },
    { id: '3', name: 'Rahul Singh', specialization: 'Cardio', active_clients: 12, month_revenue: 240000 },
  ],
};

function mergeData(real: Partial<DashboardData> | null, period: string): DashboardData {
  if (!real) return { ...MOCK_DATA, period };
  return {
    period: real.period ?? period,
    clients: real.clients ?? MOCK_DATA.clients,
    revenue: real.revenue ?? MOCK_DATA.revenue,
    expiring_soon: real.expiring_soon ?? MOCK_DATA.expiring_soon,
    total_dues: real.total_dues ?? MOCK_DATA.total_dues,
    attendance_today: real.attendance_today ?? MOCK_DATA.attendance_today,
    birthdays_today: real.birthdays_today ?? MOCK_DATA.birthdays_today,
    anniversaries_today: real.anniversaries_today ?? MOCK_DATA.anniversaries_today,
    pending_renewals: real.pending_renewals ?? MOCK_DATA.pending_renewals,
    active_pt_clients: real.active_pt_clients ?? MOCK_DATA.active_pt_clients,
    recent_payments: real.recent_payments?.length ? real.recent_payments : MOCK_DATA.recent_payments,
    monthly_chart: real.monthly_chart?.length ? real.monthly_chart : MOCK_DATA.monthly_chart,
    top_trainers: real.top_trainers?.length ? real.top_trainers : MOCK_DATA.top_trainers,
  };
}

export type UseDashboardData = {
  data: DashboardData | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
  hasResolved: boolean;
};

export function useDashboardData(period: string): UseDashboardData {
  const { data, error, loading, refetch, hasResolved } = useAsync<Partial<DashboardData>>(
    () => api.dashboard.summary() as unknown as Promise<Partial<DashboardData>>,
    [period],
  );

  return {
    data: data ? mergeData(data, period) : null,
    loading,
    error,
    refresh: refetch,
    hasResolved,
  };
}
