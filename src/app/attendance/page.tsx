'use client';
import { useEffect, useState } from 'react';
import Guard from '@/components/Guard';
import Sidebar from '@/components/Sidebar';
import { api, Client, Attendance } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function AttendancePage() { return <Guard><AttendanceContent /></Guard>; }

function AttendanceContent() {
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];
  const [date,       setDate]       = useState(today);
  const [clients,    setClients]    = useState<Client[]>([]);
  const [records,    setRecords]    = useState<Attendance[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState<string|null>(null);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');
  const [search,     setSearch]     = useState('');

  useEffect(() => {
    Promise.all([
      api.clients.list({ status: 'active' }),
      api.attendance.list({ date, type: 'client' }),
    ]).then(([c, a]) => { setClients(c); setRecords(a); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [date]);

  async function mark(client: Client, status: string) {
    setSaving(client.id);
    try {
      await api.attendance.mark({
        type: 'client', ref_id: client.id, ref_name: client.name,
        trainer_id: client.trainer_id, trainer_name: client.trainer_name,
        date, status,
      });
      const updated = await api.attendance.list({ date, type: 'client' });
      setRecords(updated);
      setSuccess(`Marked ${client.name} as ${status}`);
      setTimeout(() => setSuccess(''), 2000);
    } catch(e:any) { setError(e.message); }
    finally { setSaving(null); }
  }

  function getRecord(clientId: string) {
    return records.find(r => r.ref_id === clientId);
  }

  const STATUS_BTN = [
    { status: 'present',  label: 'P',  color: 'var(--success)', bg: 'var(--success-bg)' },
    { status: 'absent',   label: 'A',  color: 'var(--danger)',  bg: 'var(--danger-bg)' },
    { status: 'late',     label: 'L',  color: 'var(--warning)', bg: 'var(--warning-bg)' },
  ];

  const filtered = clients.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.mobile||'').includes(search) || (c.client_id||'').includes(search)
  );

  const summary = {
    present: records.filter(r => r.status === 'present').length,
    absent:  records.filter(r => r.status === 'absent').length,
    late:    records.filter(r => r.status === 'late').length,
    unmarked: clients.length - records.length,
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="page-main">
        <div className="topbar">
          <div>
            <div className="topbar-title">Attendance</div>
            <div className="topbar-sub">{date === today ? 'Today' : date}</div>
          </div>
          <input className="input" type="date" value={date}
            onChange={e => setDate(e.target.value)}
            style={{ maxWidth: 180 }} />
        </div>

        <div className="page-content fade-up">
          {error   && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {/* Summary cards */}
          <div className="kpi-grid mb-3" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
            {[
              ['✅ Present', summary.present, 'var(--success)'],
              ['❌ Absent',  summary.absent,  'var(--danger)'],
              ['⏰ Late',    summary.late,    'var(--warning)'],
              ['❓ Unmarked',summary.unmarked,'var(--muted)'],
            ].map(([lbl, val, color]) => (
              <div key={String(lbl)} className="card" style={{ padding: '1rem', textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: String(color) }}>{val}</div>
                <div className="text-muted text-sm">{lbl}</div>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: 0 }}>
            {/* Search bar inside card header */}
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <input className="input" placeholder="🔍 Search client…" value={search}
                onChange={e => setSearch(e.target.value)} style={{ maxWidth: 280 }} />
              <div className="text-muted text-sm">{filtered.length} clients</div>
              {date === today && (
                <button className="btn btn-success btn-sm" style={{ marginLeft: 'auto' }}
                  onClick={async () => {
                    for (const c of filtered) {
                      if (!getRecord(c.id)) await mark(c, 'present');
                    }
                  }}>
                  ✅ Mark All Present
                </button>
              )}
            </div>

            <div className="table-wrap">
              {loading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>Loading…</div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>No active clients found</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Client</th>
                      <th>Trainer</th>
                      <th>Package</th>
                      <th style={{ textAlign: 'center' }}>Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(c => {
                      const rec = getRecord(c.id);
                      return (
                        <tr key={c.id}>
                          <td className="mono text-muted text-xs">{c.client_id}</td>
                          <td style={{ fontWeight: 600 }}>{c.name}</td>
                          <td className="text-muted">{c.trainer_name || '—'}</td>
                          <td className="text-muted">{c.package_type || '—'}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                              {STATUS_BTN.map(({ status, label, color, bg }) => (
                                <button key={status}
                                  onClick={() => mark(c, status)}
                                  disabled={saving === c.id}
                                  style={{
                                    width: 34, height: 34, borderRadius: 8, border: '1px solid',
                                    cursor: 'pointer', fontWeight: 700, fontSize: 12,
                                    transition: 'all .15s',
                                    background: rec?.status === status ? bg : 'transparent',
                                    color: rec?.status === status ? color : 'var(--muted)',
                                    borderColor: rec?.status === status ? color : 'var(--border2)',
                                    transform: rec?.status === status ? 'scale(1.1)' : 'none',
                                  }}>
                                  {saving === c.id ? '…' : label}
                                </button>
                              ))}
                              {rec && (
                                <span className="text-muted text-xs" style={{ alignSelf: 'center', marginLeft: 4 }}>
                                  {rec.check_in || ''}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="text-muted text-xs mt-1" style={{ textAlign: 'center' }}>
            P = Present · A = Absent · L = Late · Click to toggle
          </div>
        </div>
      </div>
    </div>
  );
}
