'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api, Client } from '@/lib/api';
import { fmtDate, fmtMoney } from '@/lib/format';

export default function SubscriptionsPage() {
  return (
    <Guard>
      <SubscriptionsContent />
    </Guard>
  );
}

function SubscriptionsContent() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.clients.list({ limit: 1000 })
      .then(setClients)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => {
    const q = search.toLowerCase();
    return clients
      .filter((c) => c.package_type || c.pt_start_date || c.pt_end_date)
      .filter((c) => !q || c.name.toLowerCase().includes(q) || (c.client_id || '').toLowerCase().includes(q) || (c.mobile || '').includes(search));
  }, [clients, search]);

  return (
    <AppShell>
      <div className="page-main">
        <div className="page-content fade-up">
          {error && <div className="alert alert-error">{error}</div>}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <h2 style={{ fontWeight: 700, fontSize: 20, margin: 0 }}>Subscriptions</h2>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="text-muted text-sm">{rows.length} subscriptions</span>
              <input
                className="input"
                placeholder="Search member…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ maxWidth: 220 }}
              />
            </div>
          </div>

          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrap">
              {loading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>Loading subscriptions...</div>
              ) : rows.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>No subscriptions found</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Member</th>
                      <th>Package</th>
                      <th>Start</th>
                      <th>End</th>
                      <th>Paid</th>
                      <th>Balance</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((c) => (
                      <tr key={c.id}>
                        <td><span className="id-chip">{c.client_id || c.member_code || '-'}</span></td>
                        <td><Link href={`/clients/${c.id}`} style={{ color: 'var(--text)', fontWeight: 700, textDecoration: 'none' }}>{c.name}</Link></td>
                        <td>{c.package_type || '-'}</td>
                        <td className="text-muted">{fmtDate(c.pt_start_date)}</td>
                        <td className="text-muted">{fmtDate(c.pt_end_date)}</td>
                        <td style={{ color: 'var(--success)', fontWeight: 700 }}>{fmtMoney(c.paid_amount)}</td>
                        <td style={{ color: Number(c.balance_amount || 0) > 0 ? 'var(--danger)' : 'var(--muted)', fontWeight: 700 }}>{fmtMoney(c.balance_amount)}</td>
                        <td><span className={`badge badge-${c.status || 'active'}`}>{c.status || 'active'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
