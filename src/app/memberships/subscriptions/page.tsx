'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Guard from '@/components/Guard';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
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
    <div className="app-layout">
      <Sidebar />
      <div className="page-main">
        <TopBar
          title="Subscriptions"
          subtitle={`${rows.length} active or historical membership subscriptions`}
          actions={<Link href="/plans" className="btn btn-primary btn-sm">Existing Plans</Link>}
        />

        <div className="page-content fade-up">
          {error && <div className="alert alert-error">{error}</div>}

          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '0.85rem 1.4rem', borderBottom: '1px solid var(--line)', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                className="input"
                placeholder="Search member, code, mobile"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ maxWidth: 320 }}
              />
              <span className="text-muted text-sm">{rows.length} subscriptions</span>
            </div>

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
    </div>
  );
}
