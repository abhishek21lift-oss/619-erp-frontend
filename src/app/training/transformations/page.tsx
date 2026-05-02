'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Guard from '@/components/Guard';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { api, Client } from '@/lib/api';

export default function TransformationsPage() {
  return (
    <Guard>
      <Inner />
    </Guard>
  );
}

function Inner() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let alive = true;
    api.clients
      .list({ status: 'active' })
      .then((r) => alive && setClients(r))
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!search) return clients;
    const s = search.toLowerCase();
    return clients.filter(
      (c) =>
        c.name?.toLowerCase().includes(s) ||
        (c.client_id || '').toLowerCase().includes(s) ||
        (c.trainer_name || '').toLowerCase().includes(s),
    );
  }, [clients, search]);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="page-main">
        <TopBar
          title="Transformations"
          subtitle="Track each athlete's body metrics over time"
        />
        <div className="page-content fade-up">
          {error && <div className="alert alert-error">{error}</div>}

          <div className="card mb-3">
            <div className="card-title">How this works</div>
            <p className="text-muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
              Pick any active member to record measurements (weight, body fat,
              lifts) and upload before/after photos on their profile. Over
              time, this view will surface the most-improved athletes for
              social proof and case studies.
            </p>
          </div>

          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '0.85rem 1.4rem', borderBottom: '1px solid var(--line)', display: 'flex', gap: 12 }}>
              <input
                className="input"
                placeholder="Search active members"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ maxWidth: 320 }}
              />
              <div className="text-muted text-sm" style={{ alignSelf: 'center' }}>
                {filtered.length} {filtered.length === 1 ? 'member' : 'members'}
              </div>
            </div>
            <div className="table-wrap">
              {loading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>Loading…</div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>
                  No active members yet.
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Member</th>
                      <th>Coach</th>
                      <th>Start Weight</th>
                      <th>Joined</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c) => (
                      <tr key={c.id}>
                        <td><span className="id-chip">{c.client_id || '—'}</span></td>
                        <td style={{ fontWeight: 600 }}>{c.name}</td>
                        <td className="text-muted">{c.trainer_name || '—'}</td>
                        <td className="text-muted tabular">
                          {c.weight ? `${c.weight} kg` : '—'}
                        </td>
                        <td className="text-muted tabular">{c.joining_date || c.pt_start_date || '—'}</td>
                        <td>
                          <Link href={`/clients/${c.id}`} className="btn btn-ghost btn-sm">
                            Log progress →
                          </Link>
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
