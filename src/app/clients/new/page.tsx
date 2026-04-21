'use client';
import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Guard from '@/components/Guard';
import Sidebar from '@/components/Sidebar';
import { api, Trainer } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function NewClientPage() { return <Guard><NewClientForm /></Guard>; }

function NewClientForm() {
  const router = useRouter();
  const { user } = useAuth();
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const today = new Date().toISOString().split('T')[0];

  const [f, setF] = useState({
    name:'', mobile:'', email:'', gender:'Male', dob:'', weight:'', address:'',
    trainer_id: user?.role==='trainer' ? (user.trainer_id||'') : '',
    joining_date: today, pt_start_date: today, pt_end_date:'',
    package_type:'Half Yearly',
    base_amount:'', discount:'0', final_amount:'', paid_amount:'',
    payment_method:'CASH', payment_date: today, notes:'', status:'active',
  });

  useEffect(() => {
    api.trainers.list().then(setTrainers).catch(console.error);
  }, []);

  // Auto-compute final amount
  function handleAmt(k: string, v: string) {
    const next = {...f, [k]: v};
    const base = parseFloat(next.base_amount)||0;
    const disc = parseFloat(next.discount)||0;
    next.final_amount = String(Math.max(0, base - disc));
    setF(next);
  }

  // Auto-set end date based on package
  function handlePackage(pkg: string) {
    const start = f.pt_start_date || today;
    const d = new Date(start);
    const durations: Record<string,number> = { 'Monthly':30,'Quarterly':90,'Half Yearly':180,'Yearly':365,'PT':90 };
    d.setDate(d.getDate() + (durations[pkg]||90));
    setF(p => ({...p, package_type: pkg, pt_end_date: d.toISOString().split('T')[0]}));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!f.name.trim()) return setError('Client name is required');
    setSaving(true); setError('');
    try {
      const trainer = trainers.find(t => t.id === f.trainer_id);
      await api.clients.create({
        ...f,
        trainer_name:   trainer?.name || '',
        base_amount:    parseFloat(f.base_amount)||0,
        discount:       parseFloat(f.discount)||0,
        final_amount:   parseFloat(f.final_amount)||0,
        paid_amount:    parseFloat(f.paid_amount)||0,
        weight:         parseFloat(f.weight)||undefined,
      });
      router.push('/clients');
    } catch(e:any) { setError(e.message); }
    finally { setSaving(false); }
  }

  const S = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) => setF(p => ({...p, [k]: e.target.value}));

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="page-main">
        <div className="topbar">
          <div style={{display:'flex',alignItems:'center',gap:'1rem'}}>
            <button onClick={() => router.back()} className="btn btn-ghost btn-sm">←</button>
            <div>
              <div className="topbar-title">Add New Client</div>
              <div className="topbar-sub">Fill in the details below</div>
            </div>
          </div>
          <button type="submit" form="client-form" className="btn btn-primary" disabled={saving}>
            {saving?'Saving…':'💾 Save Client'}
          </button>
        </div>

        <div className="page-content fade-up">
          {error && <div className="alert alert-error">{error}</div>}

          <form id="client-form" onSubmit={submit}>
            <div style={{display:'grid',gap:'1.25rem'}}>

              {/* Personal */}
              <div className="card">
                <div className="card-title">Personal Information</div>
                <div className="form-row form-row-3">
                  <div><label>Full Name *</label><input className="input" value={f.name} onChange={S('name')} required /></div>
                  <div><label>Mobile</label><input className="input" type="tel" value={f.mobile} onChange={S('mobile')} /></div>
                  <div><label>Email</label><input className="input" type="email" value={f.email} onChange={S('email')} /></div>
                  <div>
                    <label>Gender</label>
                    <select className="input select" value={f.gender} onChange={S('gender')}>
                      <option>Male</option><option>Female</option><option>Other</option>
                    </select>
                  </div>
                  <div><label>Date of Birth</label><input className="input" type="date" value={f.dob} onChange={S('dob')} /></div>
                  <div><label>Weight (kg)</label><input className="input" type="number" step="0.1" value={f.weight} onChange={S('weight')} /></div>
                </div>
                <div style={{marginTop:'.75rem'}}>
                  <label>Address</label>
                  <input className="input" value={f.address} onChange={S('address')} />
                </div>
              </div>

              {/* Membership */}
              <div className="card">
                <div className="card-title">Membership Details</div>
                <div className="form-row form-row-3">
                  <div>
                    <label>Trainer</label>
                    <select className="input select" value={f.trainer_id} onChange={S('trainer_id')} disabled={user?.role==='trainer'}>
                      <option value="">No trainer</option>
                      {trainers.filter(t=>t.status==='active').map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label>Package Type</label>
                    <select className="input select" value={f.package_type} onChange={e => handlePackage(e.target.value)}>
                      {['Monthly','Quarterly','Half Yearly','Yearly','PT'].map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label>Status</label>
                    <select className="input select" value={f.status} onChange={S('status')}>
                      <option>active</option><option>frozen</option>
                    </select>
                  </div>
                  <div><label>Joining Date</label><input className="input" type="date" value={f.joining_date} onChange={S('joining_date')} /></div>
                  <div><label>PT Start Date</label><input className="input" type="date" value={f.pt_start_date} onChange={e => {
                    setF(p => ({...p, pt_start_date: e.target.value}));
                    handlePackage(f.package_type);
                  }} /></div>
                  <div><label>PT End Date</label><input className="input" type="date" value={f.pt_end_date} onChange={S('pt_end_date')} /></div>
                </div>
              </div>

              {/* Payment */}
              <div className="card">
                <div className="card-title">Payment Details</div>
                <div className="form-row form-row-4">
                  <div>
                    <label>Base Amount (₹)</label>
                    <input className="input" type="number" value={f.base_amount} onChange={e => handleAmt('base_amount', e.target.value)} />
                  </div>
                  <div>
                    <label>Discount (₹)</label>
                    <input className="input" type="number" value={f.discount} onChange={e => handleAmt('discount', e.target.value)} />
                  </div>
                  <div>
                    <label>Final Amount (₹)</label>
                    <input className="input" type="number" value={f.final_amount} onChange={S('final_amount')}
                      style={{borderColor:'var(--brand)',color:'var(--brand2)',fontWeight:700}} />
                  </div>
                  <div>
                    <label>Amount Paid Today (₹)</label>
                    <input className="input" type="number" value={f.paid_amount} onChange={S('paid_amount')} />
                  </div>
                  <div>
                    <label>Payment Method</label>
                    <select className="input select" value={f.payment_method} onChange={S('payment_method')}>
                      <option>CASH</option><option>UPI</option><option>CARD</option><option>BANK_TRANSFER</option>
                    </select>
                  </div>
                  <div><label>Payment Date</label><input className="input" type="date" value={f.payment_date} onChange={S('payment_date')} /></div>
                </div>
                {f.final_amount && f.paid_amount && parseFloat(f.final_amount) > parseFloat(f.paid_amount) && (
                  <div className="alert alert-warning mt-1">
                    ⚠️ Balance due: ₹{(parseFloat(f.final_amount)-parseFloat(f.paid_amount)).toLocaleString('en-IN')}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="card">
                <label>Notes (optional)</label>
                <textarea className="input" rows={3} value={f.notes} onChange={S('notes')} placeholder="Health conditions, goals, special instructions…" />
              </div>

              <div style={{display:'flex',gap:'.75rem'}}>
                <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
                  {saving?'Saving…':'💾 Save Client'}
                </button>
                <button type="button" className="btn btn-ghost btn-lg" onClick={() => router.back()}>Cancel</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
