'use client';
import { useEffect, useState, FormEvent } from 'react';
import Guard from '@/components/Guard';
import Sidebar from '@/components/Sidebar';
import { api, Trainer } from '@/lib/api';

export default function TrainersPage() { return <Guard role="admin"><TrainersContent /></Guard>; }

function TrainersContent() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [modal, setModal]       = useState<Trainer|'new'|null>(null);
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState<string|null>(null);

  const EMPTY = { name:'', mobile:'', email:'', role:'Personal Trainer', joining_date:'', salary:'', incentive_rate:'50', specialization:'', certifications:'', status:'active', notes:'' };
  const [form, setForm] = useState<any>(EMPTY);

  const load = () => {
    setLoading(true);
    api.trainers.list().then(setTrainers).catch(e => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  function openEdit(t: Trainer) {
    setForm({ ...t, incentive_rate: String(Math.round((t.incentive_rate||0.5)*100)), salary: String(t.salary||0) });
    setModal(t);
  }
  function openNew() { setForm(EMPTY); setModal('new'); }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess('');
    try {
      if (modal === 'new') {
        await api.trainers.create(form);
        setSuccess('Trainer created!');
      } else {
        await api.trainers.update((modal as Trainer).id, form);
        setSuccess('Trainer updated!');
      }
      setModal(null); load();
      setTimeout(() => setSuccess(''), 3000);
    } catch(e:any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function del(id: string, name: string) {
    if (!confirm(`Delete trainer "${name}"? Their client assignments will be cleared.`)) return;
    setDeleting(id);
    try { await api.trainers.delete(id); load(); }
    catch(e:any) { setError(e.message); }
    finally { setDeleting(null); }
  }

  const S = (k: string) => (e: React.ChangeEvent<any>) => setForm((f: any) => ({...f, [k]: e.target.value}));
  const fmt = (n:any) => '₹'+(Number(n)||0).toLocaleString('en-IN',{maximumFractionDigits:0});

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="page-main">
        <div className="topbar">
          <div>
            <div className="topbar-title">Trainers</div>
            <div className="topbar-sub">{trainers.length} staff members</div>
          </div>
          <button className="btn btn-primary" onClick={openNew}>+ Add Trainer</button>
        </div>

        <div className="page-content fade-up">
          {error   && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {loading ? (
            <div className="text-muted">Loading…</div>
          ) : (
            <div style={{display:'grid',gap:'1rem',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))'}}>
              {trainers.map(t => (
                <div key={t.id} className="card card-hover" style={{opacity:deleting===t.id?.0.4:1}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1rem'}}>
                    <div style={{display:'flex',gap:10,alignItems:'center'}}>
                      <div style={{
                        width:44,height:44,borderRadius:12,flexShrink:0,
                        background:'linear-gradient(135deg,var(--brand),var(--purple))',
                        display:'flex',alignItems:'center',justifyContent:'center',
                        fontSize:16,fontWeight:700,color:'#fff',
                      }}>
                        {t.name.split(' ').map((w:string)=>w[0]).join('').slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{fontWeight:700,fontSize:15}}>{t.name}</div>
                        <div className="text-muted text-sm">{t.role||'Personal Trainer'}</div>
                      </div>
                    </div>
                    <span className={`badge badge-${t.status}`}>{t.status}</span>
                  </div>

                  {t.specialization && (
                    <div className="text-muted text-sm" style={{marginBottom:'.75rem'}}>
                      🎯 {t.specialization}
                    </div>
                  )}

                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'.75rem',marginBottom:'1rem'}}>
                    {[
                      ['👥 Clients', t.active_clients, 'var(--success)'],
                      ['💰 Month',   fmt(t.month_revenue), 'var(--brand2)'],
                      ['🎁 Incentive', fmt(t.month_incentive), 'var(--warning)'],
                      ['📊 All-Time',  fmt(t.all_time_revenue), 'var(--blue)'],
                    ].map(([lbl,val,color]) => (
                      <div key={String(lbl)} style={{background:'var(--dark)',borderRadius:8,padding:'.6rem'}}>
                        <div className="text-muted text-xs">{lbl}</div>
                        <div style={{fontWeight:700,color:String(color),fontSize:15}}>{val}</div>
                      </div>
                    ))}
                  </div>

                  {t.mobile && <div className="text-muted text-sm mb-1">📱 {t.mobile}</div>}

                  <div style={{display:'flex',gap:'.5rem',marginTop:'.5rem'}}>
                    <button onClick={() => openEdit(t)} className="btn btn-ghost btn-sm" style={{flex:1}}>✏️ Edit</button>
                    <button onClick={() => del(t.id, t.name)} className="btn btn-danger btn-sm" disabled={deleting===t.id}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => { if (e.target===e.currentTarget) setModal(null); }}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{modal==='new'?'Add Trainer':'Edit Trainer'}</div>
              <button onClick={() => setModal(null)} className="btn btn-ghost btn-icon btn-sm">✕</button>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSave}>
              <div style={{display:'flex',flexDirection:'column',gap:'.75rem'}}>
                <div className="form-row form-row-2">
                  <div><label>Name *</label><input className="input" value={form.name} onChange={S('name')} required /></div>
                  <div><label>Mobile</label><input className="input" type="tel" value={form.mobile||''} onChange={S('mobile')} /></div>
                  <div><label>Email</label><input className="input" type="email" value={form.email||''} onChange={S('email')} /></div>
                  <div><label>Joining Date</label><input className="input" type="date" value={form.joining_date||''} onChange={S('joining_date')} /></div>
                  <div><label>Monthly Salary (₹)</label><input className="input" type="number" value={form.salary||''} onChange={S('salary')} /></div>
                  <div><label>Incentive Rate (%)</label><input className="input" type="number" min="0" max="100" value={form.incentive_rate||'50'} onChange={S('incentive_rate')} /></div>
                </div>
                <div><label>Specialization</label><input className="input" value={form.specialization||''} onChange={S('specialization')} placeholder="e.g. Weight Loss, Bodybuilding" /></div>
                <div><label>Status</label>
                  <select className="input select" value={form.status||'active'} onChange={S('status')}>
                    <option>active</option><option>inactive</option>
                  </select>
                </div>
                <div><label>Notes</label><textarea className="input" rows={2} value={form.notes||''} onChange={S('notes')} /></div>
              </div>
              <div style={{display:'flex',gap:'.75rem',marginTop:'1.25rem'}}>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{flex:1}}>
                  {saving?'Saving…':(modal==='new'?'Add Trainer':'Save Changes')}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
