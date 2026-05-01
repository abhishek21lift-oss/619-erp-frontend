'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Guard from '@/components/Guard';
import Sidebar from '@/components/Sidebar';
import { api, Client } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function ClientsPage() { return <Guard><ClientsContent /></Guard>; }

function ClientsContent() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState('');
  const [deleting, setDeleting] = useState<string|null>(null);
  const isAdmin = user?.role === 'admin';

  const fetch = useCallback(async () => {
    setLoading(true);
    try { setClients(await api.clients.list({ search: search||undefined, status: status||undefined })); }
    catch(e:any) { setError(e.message); }
    finally { setLoading(false); }
  }, [search, status]);

  useEffect(() => { fetch(); }, [fetch]);

  async function del(id: string, name: string) {
    if (!confirm(`Delete client "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try { await api.clients.delete(id); setClients(c => c.filter(x => x.id !== id)); }
    catch(e:any) { setError(e.message); }
    finally { setDeleting(null); }
  }

  const fmt = (n:number) => '₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0});
  const now = Date.now();
  const statusCounts = {
    active:  clients.filter(c => c.status === 'active').length,
    expired: clients.filter(c => c.status === 'expired').length,
    dues:    clients.filter(c => (c.balance_amount ?? 0) > 0).length,
    expiring: clients.filter(c => {
      if (!c.pt_end_date || c.status !== 'active') return false;
      const days = Math.ceil((new Date(c.pt_end_date).getTime() - now) / 86400000);
      return days >= 0 && days <= 7;
    }).length,
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="page-main">
        <div className="topbar">
          <div>
            <div className="topbar-title">Clients</div>
            <div className="topbar-sub">{clients.length} records</div>
          </div>
          <Link href="/clients/new" className="btn btn-primary">+ Add Client</Link>
        </div>

        <div className="page-content fade-up">
          {error && <div className="alert alert-error">{error}</div>}

          {/* Summary pills */}
          <div style={{display:'flex',gap:'.5rem',marginBottom:'1rem',flexWrap:'wrap'}}>
            {[
              ['All','',clients.length,'var(--text2)'],
              ['Active','active',statusCounts.active,'var(--success)'],
              ['Expired','expired',statusCounts.expired,'var(--danger)'],
              ['Has Dues','dues',statusCounts.dues,'var(--warning)'],
              ['Expiring','expiring',statusCounts.expiring,'var(--blue)'],
            ].map(([label,val,count,color]) => (
              <button key={String(val)} onClick={() => setStatus(String(val))}
                style={{
                  padding:'5px 14px',borderRadius:20,cursor:'pointer',
                  fontSize:12,fontWeight:600,border:'1px solid',
                  background: status===String(val) ? `${color}22` : 'transparent',
                  borderColor: status===String(val) ? String(color) : 'var(--border2)',
                  color: status===String(val) ? String(color) : 'var(--muted)',
                  transition:'all .15s',
                }}>
                {label}{count?` (${count})`:''}
              </button>
            ))}
          </div>

          {/* Search + filters */}
          <div style={{display:'flex',gap:'.75rem',marginBottom:'1rem',flexWrap:'wrap'}}>
            <input className="input" style={{maxWidth:300}}
              placeholder="🔍  Search name, mobile, ID, email…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div className="card" style={{padding:0}}>
            <div className="table-wrap">
              {loading ? (
                <div style={{padding:'3rem',textAlign:'center',color:'var(--muted)'}}>
                  <div className="pulse">Loading clients…</div>
                </div>
              ) : clients.length === 0 ? (
                <div style={{padding:'3rem',textAlign:'center'}}>
                  <div style={{fontSize:40,marginBottom:12}}>👥</div>
                  <div style={{color:'var(--muted)'}}>No clients found</div>
                  <Link href="/clients/new" className="btn btn-primary" style={{marginTop:'1rem',display:'inline-flex'}}>Add First Client</Link>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>ID</th><th>Name</th><th>Mobile</th>
                      {isAdmin && <th>Trainer</th>}
                      <th>Package</th><th>End Date</th>
                      <th>Paid</th><th>Balance</th><th>Status</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map(c => {
                      const daysLeft = c.pt_end_date
                        ? Math.ceil((new Date(c.pt_end_date).getTime() - Date.now()) / 86400000) : null;
                      const soonExpiring = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;

                      return (
                        <tr key={c.id} style={{opacity: deleting===c.id ? .4 : 1}}>
                          <td>
                            <span style={{
                              display: 'inline-block',
                              fontFamily: "'JetBrains Mono', monospace",
                              fontWeight: 700, fontSize: 12,
                              padding: '3px 10px',
                              borderRadius: 6,
                              background: 'rgba(255, 71, 87, 0.12)',
                              color: 'var(--brand2)',
                              border: '1px solid rgba(255, 71, 87, 0.25)',
                              letterSpacing: '0.5px',
                            }}>
                              {c.client_id || '—'}
                            </span>
                          </td>
                          <td>
                            <Link href={`/clients/${c.id}`}
                              style={{fontWeight:700,color:'var(--brand2)',textDecoration:'none'}}>
                              {c.name}
                            </Link>
                          </td>
                          <td className="text-muted">{c.mobile||'—'}</td>
                          {isAdmin && <td className="text-muted">{c.trainer_name||'—'}</td>}
                          <td>{c.package_type||'—'}</td>
                          <td>
                            <span style={{color: soonExpiring?'var(--warning)': c.status==='expired'?'var(--danger)':'var(--muted)'}}>
                              {c.pt_end_date||'—'}
                              {soonExpiring && <span style={{marginLeft:4,fontSize:11}}>⚠️{daysLeft}d</span>}
                            </span>
                          </td>
                          <td style={{color:'var(--success)',fontWeight:600}}>{fmt(c.paid_amount ?? 0)}</td>
                          <td style={{color:(c.balance_amount ?? 0)>0?'var(--danger)':'var(--muted)',fontWeight:(c.balance_amount ?? 0)>0?700:400}}>
                            {(c.balance_amount ?? 0)>0 ? fmt(c.balance_amount ?? 0) : '✓'}
                          </td>
                          <td><span className={`badge badge-${c.status || 'active'}`}>{c.status || '—'}</span></td>
                          <td>
                            <div style={{display:'flex',gap:4}}>
                              <Link href={`/clients/${c.id}`} className="btn btn-ghost btn-icon btn-sm" title="View">👁️</Link>
                              <Link href={`/clients/${c.id}?edit=1`} className="btn btn-ghost btn-icon btn-sm" title="Edit">✏️</Link>
                              {isAdmin && (
                                <button onClick={() => del(c.id, c.name)}
                                  className="btn btn-danger btn-icon btn-sm" title="Delete"
                                  disabled={deleting===c.id}>🗑️</button>
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

          <div className="text-muted text-sm mt-1">{clients.length} client{clients.length!==1?'s':''}</div>
        </div>
      </div>
    </div>
  );
}
