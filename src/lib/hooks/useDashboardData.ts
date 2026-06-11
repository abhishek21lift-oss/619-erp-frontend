'use client';

import { useState, useEffect, useCallback } from 'react';
import http from '@/lib/http';

export type DashboardData = {
  revenue: { today: number; week: number; month: number };
  recent_payments: Array<{ id: string; method: string; amount: number; date: string; member?: string }>;
};

export function useDashboardData(period: string) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await http<DashboardData>('/api/dashboard/sales?period=' + encodeURIComponent(period));
      setData(res.data ?? (res as unknown as DashboardData));
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, refresh: load };
}
