'use client';
import { useEffect, useState, useMemo } from 'react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';

export default function TrainerRevenuePage() {
  return (
    <Guard role="admin">
      <Inner />
    </Guard>
  );
}

const fmt = (n: number) =>
  '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

// Package duration mappings
const PKG_MONTHS: Record<string, number> = {
  'Monthly': 1,
  'Quarterly': 3,
  'Half Yearly': 6,
  'Yearly': 12,
  'PT': 3,
  '3 months': 3,
  '6 months': 6,
  '12 months': 12,
};

interface TrainerData {
  id: string;
  name: string;
  photo_url?: string;
  clients_count: number;
  monthly_pt_revenue: number;
  incentive_rate: number;
  incentive_amount: number;
  revenue_percentage: number;
}

function Inner() {
  const [trainers, setTrainers] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentMonth] = useState(new Date().getMonth() + 1);

  useEffect(() => {
    let alive = true;
    setLoading(true);

    Promise.all([
      api.trainers.list().catch(() => []),
      api.clients.list({ limit: 1000 }).catch(() => []),
    ])
      .then(([trainersData, clientsData]) => {
        if (alive) {
          setTrainers(Array.isArray(trainersData) ? trainersData : []);
          setClients(Array.isArray(clientsData) ? clientsData : []);
        }
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, []);

  // Calculate trainer revenue data
  const trainerRevenueData = useMemo(() => {
    // Filter only active PT clients
    const ptClients = clients.filter(
      (c: any) =>
        c.trainer_id &&
        c.package_type &&
        (c.package_type.toLowerCase().includes('pt') ||
          c.package_type === 'PT' ||
          c.package_type === '3 months' ||
          c.package_type === '6 months' ||
          c.package_type === '12 months') &&
        c.status === 'active'
    );

    // Group by trainer
    const byTrainer = new Map<string, any[]>();
    ptClients.forEach((client: any) => {
      const tid = client.trainer_id;
      if (!byTrainer.has(tid)) {
        byTrainer.set(tid, []);
      }
      byTrainer.get(tid)!.push(client);
    });

    // Calculate metrics per trainer
    const trainerMetrics: TrainerData[] = trainers.map((trainer: any) => {
      const trainerClients = byTrainer.get(trainer.id) || [];
      const clientsCount = trainerClients.length;

      // Calculate monthly PT revenue
      let monthlyRevenue = 0;
      trainerClients.forEach((client: any) => {
        const finalAmount = Number(client.final_amount || 0);
        const pkgMonths =
          PKG_MONTHS[client.package_type] ||
          (client.package_type ? 3 : 0);
        const monthly = pkgMonths > 0 ? finalAmount / pkgMonths : 0;
        monthlyRevenue += monthly;
      });

      return {
        id: trainer.id,
        name: trainer.name,
        photo_url: trainer.photo_url,
        clients_count: clientsCount,
        monthly_pt_revenue: monthlyRevenue,
        incentive_rate: monthlyRevenue >= 50000 ? 50 : 40,
        incentive_amount:
          monthlyRevenue >= 50000
            ? monthlyRevenue * 0.5
            : monthlyRevenue * 0.4,
        revenue_percentage: 0, // Will calculate below
      };
    });

    // Calculate total revenue and percentages
    const totalRevenue = trainerMetrics.reduce(
      (sum, t) => sum + t.monthly_pt_revenue,
      0
    );

    return trainerMetrics.map((t) => ({
      ...t,
      revenue_percentage:
        totalRevenue > 0 ? (t.monthly_pt_revenue / totalRevenue) * 100 : 0,
    }));
  }, [trainers, clients]);

  // Summary calculations
  const summaryKpis = useMemo(() => {
    const totalTrainers = trainers.length;
    const totalClients = trainerRevenueData.reduce(
      (sum, t) => sum + t.clients_count,
      0
    );
    const totalMonthlyRevenue = trainerRevenueData.reduce(
      (sum, t) => sum + t.monthly_pt_revenue,
      0
    );
    const totalIncentives = trainerRevenueData.reduce(
      (sum, t) => sum + t.incentive_amount,
      0
    );

    return {
      totalTrainers,
      totalClients,
      totalMonthlyRevenue,
      totalIncentives,
    };
  }, [trainerRevenueData]);

  // Sort by revenue descending
  const sortedTrainers = useMemo(
    () =>
      [...trainerRevenueData].sort(
        (a, b) => b.monthly_pt_revenue - a.monthly_pt_revenue
      ),
    [trainerRevenueData]
  );

  return (
    <AppShell>
      <div className="page-main">
        <div className="page-content fade-up">
          {error && <div className="alert alert-error">{error}</div>}

          {/* Summary KPI Cards */}
          <div
            className="kpi-grid mb-3"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}
          >
            <div className="kpi-card">
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: 'var(--brand)',
                  letterSpacing: '-0.03em',
                }}
                className="tabular"
              >
                {summaryKpis.totalTrainers}
              </div>
              <div
                className="text-muted"
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: '1.4px',
                  textTransform: 'uppercase',
                  marginTop: 4,
                }}
              >
                Total Trainers
              </div>
            </div>

            <div className="kpi-card">
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: 'var(--brand)',
                  letterSpacing: '-0.03em',
                }}
                className="tabular"
              >
                {summaryKpis.totalClients}
              </div>
              <div
                className="text-muted"
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: '1.4px',
                  textTransform: 'uppercase',
                  marginTop: 4,
                }}
              >
                Active PT Clients
              </div>
            </div>

            <div className="kpi-card">
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: 'var(--success)',
                  letterSpacing: '-0.03em',
                }}
                className="tabular"
              >
                {fmt(summaryKpis.totalMonthlyRevenue)}
              </div>
              <div
                className="text-muted"
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: '1.4px',
                  textTransform: 'uppercase',
                  marginTop: 4,
                }}
              >
                Monthly PT Revenue
              </div>
            </div>

            <div className="kpi-card">
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: 'var(--success)',
                  letterSpacing: '-0.03em',
                }}
                className="tabular"
              >
                {fmt(summaryKpis.totalIncentives)}
              </div>
              <div
                className="text-muted"
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: '1.4px',
                  textTransform: 'uppercase',
                  marginTop: 4,
                }}
              >
                Total Incentives
              </div>
            </div>
          </div>

          {/* Trainer Revenue Cards / Table */}
          <div className="card" style={{ padding: 0 }}>
            <div
              style={{
                padding: '0.85rem 1.4rem',
                borderBottom: '1px solid var(--line)',
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ fontWeight: 600 }}>Trainer PT Revenue Breakdown</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                Month: {new Date().toLocaleDateString('en-IN', {
                  month: 'long',
                  year: 'numeric',
                })}
              </div>
            </div>

            <div className="table-wrap">
              {loading ? (
                <div
                  style={{
                    padding: '3rem',
                    textAlign: 'center',
                    color: 'var(--muted)',
                  }}
                >
                  Loading…
                </div>
              ) : sortedTrainers.length === 0 ? (
                <div
                  style={{
                    padding: '3rem',
                    textAlign: 'center',
                    color: 'var(--muted)',
                  }}
                >
                  <div style={{ fontSize: 26, marginBottom: 8, opacity: 0.55 }}>
                    ✓
                  </div>
                  No PT clients assigned yet.
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Trainer</th>
                      <th>PT Clients</th>
                      <th>Monthly Revenue</th>
                      <th>Incentive %</th>
                      <th>Incentive Amount</th>
                      <th>Revenue Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTrainers.map((trainer) => (
                      <tr key={trainer.id}>
                        <td style={{ fontWeight: 600 }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                            }}
                          >
                            <div
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                backgroundColor: 'var(--line)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 12,
                                fontWeight: 700,
                                color: 'var(--brand)',
                              }}
                            >
                              {trainer.name
                                .split(' ')
                                .map((n: string) => n[0])
                                .join('')
                                .toUpperCase()
                                .slice(0, 2)}
                            </div>
                            {trainer.name}
                          </div>
                        </td>
                        <td className="text-muted tabular">
                          {trainer.clients_count}
                        </td>
                        <td
                          style={{ fontWeight: 700, color: 'var(--success)' }}
                          className="tabular"
                        >
                          {fmt(trainer.monthly_pt_revenue)}
                        </td>
                        <td className="tabular">
                          <span className="badge badge-success">
                            {trainer.incentive_rate}%
                          </span>
                        </td>
                        <td
                          style={{ fontWeight: 700, color: 'var(--success)' }}
                          className="tabular"
                        >
                          {fmt(trainer.incentive_amount)}
                        </td>
                        <td>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                            }}
                          >
                            <div
                              style={{
                                flex: 1,
                                height: 6,
                                backgroundColor: 'var(--line)',
                                borderRadius: 3,
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  width: `${Math.min(
                                    trainer.revenue_percentage,
                                    100
                                  )}%`,
                                  height: '100%',
                                  backgroundColor: 'var(--brand)',
                                  transition: 'width 0.3s ease',
                                }}
                              />
                            </div>
                            <span
                              className="text-muted tabular"
                              style={{ fontSize: 12, minWidth: 30 }}
                            >
                              {trainer.revenue_percentage.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div
              style={{
                padding: '0.85rem 1.4rem',
                borderTop: '1px solid var(--line)',
                fontSize: 12,
                color: 'var(--muted)',
              }}
            >
              💡 Tip: Export this data or schedule a report for deeper analysis.
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
