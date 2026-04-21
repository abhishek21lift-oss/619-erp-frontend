'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Guard from '@/components/Guard';
import Sidebar from '@/components/Sidebar';
import { api, Client, Trainer } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  return <Guard><ClientDetail id={params.id} /></Guard>;
}

function ClientDetail({ id }: { id: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const { user } = useAuth();
  const [client, setClient] = useState<Client|null>(null);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(sp.get('edit')==='1');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm]       = useState<any>({});
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    Promise.all([api.clients.get(id), api.trainers.list()])
      .then(([c, t]) => { setClient(c); setTrainers(t); setForm(c); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  function set(k: string, v: any) { setForm((f: any) => ({...f, [k]: v})); }

  async function save() {
    setSaving(true); setError(''); setSuccess('');
    try {
      const res = await api.clients.update(id, form);
      setClient(res.client); setForm(res.client);
      setEditing(false); setSuccess('Client updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch(e:any) { setError(e.message); }
    finally { setSaving(false); }
  }

  const fmt = (n:number) => '₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0});

  if (loading) return (
    <div className="app-layout">
      <Sidebar />
      <div className="page-main">
        <div className="page-content" style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh'}}>
          <div className="text-muted">Loading client…</div>
        </div>
      </div>
    </div>
  );

  if (!client) return (
    <div className="app-layout">
      <Sidebar />
      <div className="page-main">
        <div className="page-content">
          <div className="alert alert-error">{error || 'Client not found'}</div>
          <Link href="/clients" className="btn btn-ghost">← Back</Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="page-main">
        <div className="topbar">
          <div style={{display:'flex',alignItems:'center',gap:'1rem'}}>
            <button onClick={() => router.back()} className="btn btn-ghost btn-sm">←</button>
            <div>
              <div className="topbar-title">{client.name}</div>
              <div className="topbar-sub">{client.client_id} · {client.package_type||'No package'}</div>
            </div>
          </div>
          <div style={{display:'flex',gap:'.5rem'}}>
            {!editing && <button onClick={() => setEditing(true)} className="btn btn-ghost btn-sm">✏️ Edit</button>}
            {editing && <button onClick={() => { setEditing(false); setForm(client); }} className="btn btn-ghost btn-sm">✕ Cancel</button>}
            {editing && <button onClick={save} className="btn btn-primary btn-sm" disabled={saving}>{saving?'Saving…':'💾 Save'}</button>}
          </div>
        </div>

        <div className="page-content fade-up">
          {error   && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {/* Status + balance bar */}
          <div style={{display:'flex',gap:'1rem',marginBottom:'1.25rem',flexWrap:'wrap'}}>
            <span className={`badge badge-${client.status}`} style={{fontSize:13,padding:'5px 14px'}}>{client.status.toUpperCase()}</span>
            {client.balance_amount > 0 && (
              <span className="badge badge-expired" style={{fontSize:13,padding:'5px 14px'}}>
                DUE: {fmt(client.balance_amount)}
              </span>
            )}
            {client.pt_end_date && (
              <span className="badge" style={{fontSize:13,padding:'5px 14px',background:'var(--blue-bg)',color:'var(--blue)'}}>
                📅 Expires: {client.pt_end_date}
              </span>
            )}
          </div>

          <div style={{display:'grid',gap:'1.25rem',gridTemplateColumns:'1fr 1fr'}}>

            {/* Personal Info */}
            <div className="card">
              <div className="card-title">Personal Information</div>
              {editing ? (
                <div style={{display:'flex',flexDirection:'column',gap:'.75rem'}}>
                  {[['name','Name *','text'],['mobile','Mobile','tel'],['email','Email','email'],['dob','Date of Birth','date'],['weight','Weight (kg)','number'],['address','Address','text']].map(([k,lbl,type]) => (
                    <div key={k}>
                      <label>{lbl}</label>
                      <input className="input" type={type} value={form[k]||''} onChange={e => set(k,e.target.value)} />
                    </div>
                  ))}
                  <div>
                    <label>Gender</label>
                    <select className="input select" value={form.gender||''} onChange={e => set('gender',e.target.value)}>
                      <option value="">Select</option>
                      <option>Male</option><option>Female</option><option>Other</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:'.6rem',fontSize:14}}>
                  {[['📱 Mobile',client.mobile],['📧 Email',client.email],['⚥ Gender',client.gender],['🎂 DOB',client.dob],['⚖️ Weight',client.weight?client.weight+'kg':null],['📍 Address',client.address]].map(([lbl,val]) => val ? (
                    <div key={String(lbl)} style={{display:'flex',gap:'1rem'}}>
                      <span className="text-muted" style={{minWidth:100}}>{lbl}</span>
                      <span>{val}</span>
                    </div>
                  ) : null)}
                </div>
              )}
            </div>

            {/* Membership */}
            <div className="card">
              <div className="card-title">Membership & Payments</div>
              {editing ? (
                <div style={{display:'flex',flexDirection:'column',gap:'.75rem'}}>
                  <div>
                    <label>Trainer</label>
                    <select className="input select" value={form.trainer_id||''} onChange={e => {
                      const t = trainers.find(x=>x.id===e.target.value);
                      set('trainer_id',e.target.value); set('trainer_name',t?.name||'');
                    }} disabled={!isAdmin}>
                      <option value="">No trainer</option>
                      {trainers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label>Package</label>
                    <select className="input select" value={form.package_type||''} onChange={e => set('package_type',e.target.value)}>
                      <option value="">Select package</option>
                      {['Monthly','Quarterly','Half Yearly','Yearly','PT'].map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  {[['pt_start_date','PT Start','date'],['pt_end_date','PT End','date'],['base_amount','Base Amount (₹)','number'],['discount','Discount (₹)','number'],['final_amount','Final Amount (₹)','number'],['paid_amount','Paid Amount (₹)','number']].map(([k,lbl,type]) => (
                    <div key={k}>
                      <label>{lbl}</label>
                      <input className="input" type={type} value={form[k]||''} onChange={e => set(k,e.target.value)} />
                    </div>
                  ))}
                  <div>
                    <label>Status</label>
                    <select className="input select" value={form.status} onChange={e => set('status',e.target.value)}>
                      <option>active</option><option>expired</option><option>frozen</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:'.6rem',fontSize:14}}>
                  {[
                    ['🏋️ Trainer',   client.trainer_name],
                    ['📦 Package',    client.package_type],
                    ['📅 Start',      client.pt_start_date],
                    ['📅 End',        client.pt_end_date],
                    ['💰 Final',      fmt(client.final_amount)],
                    ['✅ Paid',       fmt(client.paid_amount)],
                    ['⚠️ Balance',    client.balance_amount > 0 ? fmt(client.balance_amount) : '—'],
                    ['💳 Method',     client.payment_method],
                    ['📋 Notes',      client.notes],
                  ].map(([lbl,val]) => val ? (
                    <div key={String(lbl)} style={{display:'flex',gap:'1rem'}}>
                      <span className="text-muted" style={{minWidth:100}}>{lbl}</span>
                      <span style={{fontWeight: lbl==='⚠️ Balance'&&client.balance_amount>0 ? 700 : 400,
                                    color: lbl==='⚠️ Balance'&&client.balance_amount>0 ? 'var(--danger)' : 'inherit'}}>{val}</span>
                    </div>
                  ) : null)}
                </div>
              )}
            </div>
          </div>

          {/* Payment History */}
          {(client as any).payments?.length > 0 && (
            <div className="card mt-2" style={{padding:0}}>
              <div style={{padding:'1rem 1.5rem',borderBottom:'1px solid var(--border)'}}>
                <div className="card-title" style={{marginBottom:0}}>Payment History</div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Receipt</th><th>Amount</th><th>Method</th><th>Date</th><th>Notes</th></tr>
                  </thead>
                  <tbody>
                    {(client as any).payments.map((p: any) => (
                      <tr key={p.id}>
                        <td><span className="mono text-muted">{p.receipt_no||'—'}</span></td>
                        <td style={{fontWeight:700,color:'var(--success)'}}>{fmt(p.amount)}</td>
                        <td><span className={`badge badge-${(p.method||'cash').toLowerCase()}`}>{p.method}</span></td>
                        <td className="text-muted">{p.date}</td>
                        <td className="text-muted">{p.notes||'—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
