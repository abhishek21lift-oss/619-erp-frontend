'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Guard from '@/components/Guard';
import Sidebar from '@/components/Sidebar';
import { api, DashSummary } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function DashboardPage() {
  return <Guard><DashContent /></Guard>;
}

function fmt(n: number|string) {
  return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}
function fmtK(n: number|string) {
  const v = Number(n);
  if (v >= 100000) return '₹' + (v/100000).toFixed(1) + 'L';
  if (v >= 1000)   return '₹' + (v/1000).toFixed(1) + 'K';
  return '₹' + v.toLocaleString('en-IN');
}
function today() {
  return new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
}
function greet(name?: string) {
  const h = new Date().getHours();
  const g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return `${g}, ${name?.split(' ')[0] || 'there'}! 👋`;
}

function DashContent() {
  const { user } = useAuth();
  const [data, setData]       = useState<DashSummary|null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    api.dashboard.summary()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="page-main">
        {/* Top bar */}
        <div className="topbar">
          <div>
            <div className="topbar-title">{greet(user?.name)}</div>
            <div className="topbar-sub">{today()}</div>
          </div>
          <div className="topbar-right">
            {isAdmin && (
              <Link href="/clients/new" className="btn btn-primary btn-sm">
                + New Client
              </Link>
            )}
            <div style={{
              width:34,height:34,borderRadius:10,
              background:'linear-gradient(135deg,var(--brand),var(--purple))',
              display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:13,fontWeight:700,color:'#fff',
            }}>
              {(user?.name||'U').split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase()}
            </div>
          </div>
        </div>

        <div className="page-content fade-up">
          {error && <div className="alert alert-error">{error}</div>}

          {loading ? <LoadingSkeleton /> : data ? (
            <>
              {/* ── KPI Row ── */}
              <div className="kpi-grid mb-3">
                <KpiCard color="green" icon="👥" label="Active Members"
                  value={data.clients.active} sub={`${data.clients.total} total enrolled`} />
                <KpiCard color="red" icon="💰" label="Month Revenue"
                  value={fmtK(data.revenue.month)} sub={`Year: ${fmtK(data.revenue.year)}`} />
                <KpiCard color="yellow" icon="⚠️" label="Expiring Soon"
                  value={String(data.expiring_soon)} sub="Memberships in 7 days" />
                <KpiCard color="blue" icon="💳" label="Pending Dues"
                  value={fmtK(data.total_dues)} sub="Total outstanding" />
                <KpiCard color="purple" icon="📅" label="Today's Attendance"
                  value={String(data.attendance_today || 0)} sub="Clients checked in" />
                {isAdmin && (
                  <KpiCard color="green" icon="🏆" label="All-Time Revenue"
                    value={fmtK(data.revenue.total)} sub="Total collected" />
                )}
              </div>

              {/* ── Charts Row ── */}
              <div style={{display:'grid',gridTemplateColumns:isAdmin?'1fr 1fr':'1fr',gap:'1rem',marginBottom:'1rem'}}>

                {/* Revenue chart */}
                <div className="card">
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem'}}>
                    <div>
                      <div className="card-title" style={{marginBottom:2}}>Revenue Trend</div>
                      <div className="text-muted text-sm">Last 6 months</div>
                    </div>
                    <div style={{fontSize:22,fontWeight:800,color:'var(--brand2)'}}>
                      {fmtK(data.revenue.month)}
                    </div>
                  </div>
                  {data.monthly_chart.length > 0 ? (
                    <BarChart data={data.monthly_chart} />
                  ) : (
                    <EmptyState msg="No payment data yet" />
                  )}
                </div>

                {/* Top trainers (admin) or quick stats (trainer) */}
                {isAdmin && data.top_trainers.length > 0 ? (
                  <div className="card">
                    <div className="card-title mb-2">Top Trainers This Month</div>
                    <div style={{display:'flex',flexDirection:'column',gap:'.75rem'}}>
                      {data.top_trainers.map((t, i) => (
                        <div key={t.id} style={{display:'flex',alignItems:'center',gap:'.75rem'}}>
                          <div style={{
                            width:28,height:28,borderRadius:8,flexShrink:0,
                            background:['linear-gradient(135deg,#f59e0b,#d97706)',
                              'linear-gradient(135deg,#94a3b8,#64748b)',
                              'linear-gradient(135deg,#b45309,#92400e)',
                              'var(--card2)','var(--card2)'][i] || 'var(--card2)',
                            display:'flex',alignItems:'center',justifyContent:'center',
                            fontSize:12,fontWeight:700,color:i<3?'#000':'var(--muted)',
                          }}>
                            {i < 3 ? ['🥇','🥈','🥉'][i] : i+1}
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontWeight:600,fontSize:13,marginBottom:4}} className="truncate">{t.name}</div>
                            <div className="progress">
                              <div className="progress-fill red" style={{
                                width: data.top_trainers[0].month_revenue > 0
                                  ? `${(t.month_revenue/data.top_trainers[0].month_revenue)*100}%` : '0%'
                              }}/>
                            </div>
                          </div>
                          <div style={{textAlign:'right',flexShrink:0}}>
                            <div style={{fontWeight:700,color:'var(--brand2)',fontSize:13}}>{fmtK(t.month_revenue)}</div>
                            <div className="text-muted text-xs">{t.active_clients} clients</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* ── Bottom Row ── */}
              <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:'1rem'}}>

                {/* Recent Payments */}
                <div className="card" style={{padding:0}}>
                  <div style={{padding:'1.25rem 1.5rem',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div className="card-title" style={{marginBottom:0}}>Recent Payments</div>
                    <Link href="/payments" className="btn btn-ghost btn-sm">View all →</Link>
                  </div>
                  {data.recent_payments.length === 0 ? (
                    <div style={{padding:'2rem'}}><EmptyState msg="No payments recorded yet" /></div>
                  ) : (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Client</th>
                            <th>Amount</th>
                            <th>Method</th>
                            {isAdmin && <th>Trainer</th>}
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.recent_payments.map(p => (
                            <tr key={p.id}>
                              <td style={{fontWeight:600}}>{p.client_name||'—'}</td>
                              <td style={{fontWeight:700,color:'var(--success)'}}>{fmt(p.amount)}</td>
                              <td>
                                <span className={`badge badge-${(p.method||'cash').toLowerCase()}`}>
                                  {p.method}
                                </span>
                              </td>
                              {isAdmin && <td className="text-muted">{(p as any).trainer_name||'—'}</td>}
                              <td className="text-muted">{p.date}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Quick Actions + Status */}
                <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
                  <div className="card">
                    <div className="card-title mb-2">Quick Actions</div>
                    <div style={{display:'flex',flexDirection:'column',gap:'.5rem'}}>
                      <Link href="/clients/new"  className="btn btn-primary" style={{justifyContent:'flex-start'}}>➕ Add Client</Link>
                      <Link href="/payments"     className="btn btn-ghost"   style={{justifyContent:'flex-start'}}>💳 Record Payment</Link>
                      <Link href="/attendance"   className="btn btn-ghost"   style={{justifyContent:'flex-start'}}>📅 Mark Attendance</Link>
                      {isAdmin && <Link href="/trainers" className="btn btn-ghost" style={{justifyContent:'flex-start'}}>🏋️ Manage Trainers</Link>}
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-title mb-2">Studio Overview</div>
                    <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
                      <MiniStat label="Active Members" value={data.clients.active} color="var(--success)" max={Number(data.clients.total)} />
                      <MiniStat label="Expired Members" value={data.clients.expired} color="var(--danger)" max={Number(data.clients.total)} />
                      {data.expiring_soon > 0 && (
                        <div className="alert alert-warning" style={{margin:0,fontSize:12}}>
                          ⚠️ {data.expiring_soon} membership{data.expiring_soon>1?'s':''} expiring in 7 days
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────

function KpiCard({ color, icon, label, value, sub }: { color:string; icon:string; label:string; value:string; sub:string }) {
  return (
    <div className={`kpi-card ${color}`}>
      <div className={`kpi-icon ${color}`}>{icon}</div>
      <div className="kpi-label">{label}</div>
      <div className={`kpi-value ${color}`}>{value}</div>
      <div className="kpi-sub">{sub}</div>
    </div>
  );
}

function BarChart({ data }: { data: {month:string;revenue:number;count:number}[] }) {
  const max = Math.max(...data.map(d => d.revenue), 1);
  return (
    <div className="chart-bars">
      {data.map((d, i) => (
        <div key={i} className="chart-bar-col" title={`${d.month}: ₹${d.revenue.toLocaleString('en-IN')}`}>
          <div className="chart-bar-val" style={{marginTop:'auto',marginBottom:4}}>
            {d.revenue >= 1000 ? '₹'+(d.revenue/1000).toFixed(0)+'K' : '₹'+d.revenue}
          </div>
          <div
            className="chart-bar"
            style={{height:`${Math.max((d.revenue/max)*100,3)}%`, minHeight:4}}
          />
          <div style={{
            fontSize:10,color:'var(--muted)',position:'absolute',bottom:4,
            left:`${(i/data.length)*100 + (1/data.length)*50}%`,transform:'translateX(-50%)',
            whiteSpace:'nowrap',
          }}>{d.month}</div>
        </div>
      ))}
    </div>
  );
}

function MiniStat({ label, value, color, max }: { label:string; value:string; color:string; max:number }) {
  const pct = max > 0 ? Math.min((Number(value)/max)*100, 100) : 0;
  const cls = color === 'var(--success)' ? 'green' : color === 'var(--danger)' ? 'red' : 'blue';
  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
        <span className="text-muted text-sm">{label}</span>
        <span style={{fontWeight:700,color}}>{value}</span>
      </div>
      <div className="progress">
        <div className={`progress-fill ${cls}`} style={{width:`${pct}%`}}/>
      </div>
    </div>
  );
}

function EmptyState({ msg }: { msg:string }) {
  return (
    <div style={{textAlign:'center',padding:'2rem',color:'var(--muted)'}}>
      <div style={{fontSize:32,marginBottom:8}}>📭</div>
      <div style={{fontSize:13}}>{msg}</div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <>
      <div className="kpi-grid mb-3">
        {[...Array(5)].map((_,i) => (
          <div key={i} className="kpi-card" style={{height:130}}>
            <div className="skeleton" style={{width:40,height:40,borderRadius:10,marginBottom:12}}/>
            <div className="skeleton" style={{width:'60%',height:12,marginBottom:8}}/>
            <div className="skeleton" style={{width:'80%',height:30,marginBottom:8}}/>
            <div className="skeleton" style={{width:'50%',height:11}}/>
          </div>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
        {[...Array(2)].map((_,i) => (
          <div key={i} className="card" style={{height:240}}>
            <div className="skeleton" style={{width:'50%',height:18,marginBottom:16}}/>
            <div className="skeleton" style={{height:160}}/>
          </div>
        ))}
      </div>
    </>
  );
}
