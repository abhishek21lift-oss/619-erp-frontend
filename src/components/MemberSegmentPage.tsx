'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Guard from '@/components/Guard';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { api, Client } from '@/lib/api';
import { fmtDate } from '@/lib/format';

type Segment = 'active' | 'expiring' | 'lapsed' | 'birthdays';

const TITLES: Record<Segment, { title: string; sub: string }> = {
  active:    { title: 'Active Members',    sub: 'Currently subscribed athletes' },
  expiring:  { title: 'Expiring Soon',     sub: 'Memberships ending in the next 7 days' },
  lapsed:    { title: 'Lapsed Members',    sub: 'Memberships that have expired' },
  birthdays: { title: "Today's Birthdays", sub: 'Send a quick wish to keep them feeling at home' },
};

export default function MemberSegmentPage({ segment }: { segment: Segment }) {
  return (
    <Guard>
      <Inner segment={segment} />
    </Guard>
  );
}

function Inner({ segment }: { segment: Segment }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    const status =
      segment === 'active' ? 'active' :
      segment === 'lapsed' ? 'expired' :
      undefined;
    api.clients
      .list(status ? { status } : {})
      .then((rows) => alive && setClients(rows))
      .catch((e) => alive && setError(e.message || 'Failed to load members'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [segment]);

  const now = Date.now();
  const visible = useMemo(() => {
    let pool: Client[];
    if (segment === 'expiring') {
      pool = clients.filter((c) => {
        if (!c.pt_end_date || c.status !== 'active') return false;
        const days = Math.ceil(
          (new Date(c.pt_end_date).getTime() - now) / 86400000,
        );
        return days >= 0 && days <= 7;
      });
    } else if (segment === 'birthdays') {
      const today = new Date();
      pool = clients.filter((c) => {
        if (!c.dob) return false;
        const d = new Date(c.dob);
        return d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
      });
    } else {
      pool = clients;
    }
    if (!search) return pool;
    const s = search.toLowerCase();
    return pool.filter(
      (c) =>
        c.name?.toLowerCase().includes(s) ||
        (c.mobile || '').includes(s) ||
        (c.client_id || '').toLowerCase().includes(s),
    );
  }, [clients, segment, now, search]);

  const meta = TITLES[segment];

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="page-main">
        <TopBar
          title={meta.title}
          subtitle={meta.sub}
          actions={
            <Link href="/clients/new" className="btn btn-primary btn-sm">
              + Add Member
            </Link>
          }
        />
        <div className="page-content fade-up">
          {error && <div className="alert alert-error">{error}</div>}

          <div className="card" style={{ padding: 0 }}>
            <div
              style={{
                padding: '0.85rem 1.4rem',
                borderBottom: '1px solid var(--line)',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                flexWrap: 'wrap',
              }}
            >
              <input
                className="input"
                placeholder="Search name, ID or mobile"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ maxWidth: 280 }}
              />
              <div className="text-muted text-sm">{visible.length} {visible.length === 1 ? 'member' : 'members'}</div>
            </div>

            <div className="table-wrap">
              {loading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>
                  Loading…
                </div>
              ) : visible.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>
                  No members in this list right now.
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Member</th>
                      <th>Mobile</th>
                      <th>Coach</th>
                      <th>Plan</th>
                      <th>Expiry</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((c) => (
                      <tr key={c.id}>
                        <td><span className="id-chip">{c.member_code || c.client_id || '—'}</span></td>
                        <td style={{ fontWeight: 600 }}>
                          <Link href={`/clients/${c.id}`}>{c.name}</Link>
                        </td>
                        <td className="text-muted tabular">{c.mobile || '—'}</td>
                        <td className="text-muted">{c.trainer_name || '—'}</td>
                        <td className="text-muted">{c.package_type || '—'}</td>
                        <td className="text-muted tabular">{fmtDate(c.pt_end_date)}</td>
                        <td>
                          <span className={`badge badge-${c.status || 'member'}`}>
                            {c.status || '—'}
                          </span>
                        </td>
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
