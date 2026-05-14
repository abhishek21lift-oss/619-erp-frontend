'use client';
import { useState } from 'react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Tag, Percent, IndianRupee, Gift, Plus, Edit2, Trash2, Copy, Clock, CheckCircle2, Users } from 'lucide-react';

interface Offer { id:string; name:string; type:'percent'|'flat'|'free'; value:number; code:string; plan:string; validFrom:string; validUntil:string; usageLimit:number; used:number; status:'active'|'expired'|'draft'; }

const SAMPLE:Offer[] = [
  {id:'1',name:'Summer Splash 30% Off',type:'percent',value:30,code:'SUMMER30',plan:'Quarterly Membership',validFrom:'2026-05-01',validUntil:'2026-05-31',usageLimit:50,used:12,status:'active'},
  {id:'2',name:'Flat ₹1000 Off Annual',type:'flat',value:1000,code:'FLAT1K',plan:'Annual Membership',validFrom:'2026-05-01',validUntil:'2026-06-30',usageLimit:20,used:3,status:'active'},
  {id:'3',name:'1 Month Free PT',type:'free',value:0,code:'FREEPT',plan:'PT Monthly',validFrom:'2026-04-01',validUntil:'2026-04-30',usageLimit:10,used:10,status:'expired'},
  {id:'4',name:'Monsoon Special 25% Off',type:'percent',value:25,code:'MONSOON25',plan:'All Plans',validFrom:'2026-06-15',validUntil:'2026-07-15',usageLimit:100,used:0,status:'draft'},
];

export default function OffersPage() {
  return <Guard role="admin"><OffersContent/></Guard>;
}
function OffersContent() {
  const [offers, setOffers] = useState(SAMPLE);
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState<'all'|'active'|'expired'|'draft'>('all');
  const [form, setForm] = useState({name:'',type:'percent' as 'percent'|'flat'|'free',value:0,code:'',plan:'',validFrom:'',validUntil:'',usageLimit:50});
  const [copied, setCopied] = useState('');

  const visible = tab==='all' ? offers : offers.filter(o=>o.status===tab);
  const active=offers.filter(o=>o.status==='active').length;
  const totalUsed=offers.reduce((s,o)=>s+o.used,0);

  function copyCode(code:string){ navigator.clipboard.writeText(code); setCopied(code); setTimeout(()=>setCopied(''),2000); }
  function addOffer(e:React.FormEvent){ e.preventDefault();
    setOffers(p=>[...p,{id:crypto.randomUUID(),...form,used:0,status:'draft'}]);
    setForm({name:'',type:'percent',value:0,code:'',plan:'',validFrom:'',validUntil:'',usageLimit:50}); setShowForm(false);
  }
  function genCode(){ const r=Math.random().toString(36).slice(2,8).toUpperCase(); setForm(f=>({...f,code:r})); }

  const statusColor={active:'var(--success)',expired:'var(--danger)',draft:'var(--text-muted)'};

  return (
    <AppShell>
      <div className="page-container animate-fade-in">
        <div className="page-header">
          <div><h1 className="page-title">Offers &amp; Promos</h1><p className="page-subtitle">Create discount codes, referral offers &amp; promotional deals</p></div>
          <button className="btn btn-primary btn-sm" onClick={()=>setShowForm(v=>!v)}><Plus size={14}/> New Offer</button>
        </div>
        {/* KPIs */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
          {[{l:'Total Offers',v:offers.length,c:'var(--brand)',i:<Tag size={16}/>},{l:'Active',v:active,c:'var(--success)',i:<CheckCircle2 size={16}/>},{l:'Total Used',v:totalUsed,c:'var(--accent)',i:<Users size={16}/>},{l:'Expired',v:offers.filter(o=>o.status==='expired').length,c:'var(--danger)',i:<Clock size={16}/>}].map(k=>(
            <div key={k.l} className="kpi-card" style={{borderTop:`3px solid ${k.c}`}}>
              <div style={{color:k.c,marginBottom:6}}>{k.i}</div><div className="kpi-value">{k.v}</div><div className="kpi-label">{k.l}</div>
            </div>
          ))}
        </div>
        {/* Create form */}
        {showForm&&(
          <div className="card" style={{padding:20,marginBottom:20}}>
            <h3 style={{margin:'0 0 16px',fontSize:15,fontWeight:700,display:'flex',gap:8,alignItems:'center'}}><Gift size={15}/>Create New Offer</h3>
            <form onSubmit={addOffer} style={{display:'grid',gap:14}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14}}>
                <label style={{display:'grid',gap:4,gridColumn:'1/-1'}}><span style={{fontSize:11,fontWeight:700,textTransform:'uppercase',color:'var(--text-muted)'}}>Offer Name *</span>
                  <input className="input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Summer Splash 30% Off" required/>
                </label>
                <label style={{display:'grid',gap:4}}><span style={{fontSize:11,fontWeight:700,textTransform:'uppercase',color:'var(--text-muted)'}}>Discount Type</span>
                  <select className="input" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value as any}))}>
                    <option value="percent">Percentage %</option><option value="flat">Flat ₹ Amount</option><option value="free">Free / Complimentary</option>
                  </select>
                </label>
                {form.type!=='free'&&<label style={{display:'grid',gap:4}}><span style={{fontSize:11,fontWeight:700,textTransform:'uppercase',color:'var(--text-muted)'}}>{form.type==='percent'?'Discount %':'Amount (₹)'}</span>
                  <input className="input" type="number" min={1} value={form.value} onChange={e=>setForm(f=>({...f,value:Number(e.target.value)}))}/>
                </label>}
                <label style={{display:'grid',gap:4}}><span style={{fontSize:11,fontWeight:700,textTransform:'uppercase',color:'var(--text-muted)'}}>Coupon Code</span>
                  <div style={{display:'flex',gap:6}}>
                    <input className="input" style={{flex:1}} value={form.code} onChange={e=>setForm(f=>({...f,code:e.target.value.toUpperCase()}))} placeholder="e.g. SUMMER30"/>
                    <button type="button" className="btn btn-outline btn-sm" onClick={genCode}>Auto</button>
                  </div>
                </label>
                <label style={{display:'grid',gap:4}}><span style={{fontSize:11,fontWeight:700,textTransform:'uppercase',color:'var(--text-muted)'}}>Applicable Plan</span>
                  <input className="input" value={form.plan} onChange={e=>setForm(f=>({...f,plan:e.target.value}))} placeholder="All Plans / Quarterly…"/>
                </label>
                <label style={{display:'grid',gap:4}}><span style={{fontSize:11,fontWeight:700,textTransform:'uppercase',color:'var(--text-muted)'}}>Usage Limit</span>
                  <input className="input" type="number" min={1} value={form.usageLimit} onChange={e=>setForm(f=>({...f,usageLimit:Number(e.target.value)}))}/>
                </label>
                <label style={{display:'grid',gap:4}}><span style={{fontSize:11,fontWeight:700,textTransform:'uppercase',color:'var(--text-muted)'}}>Valid From</span>
                  <input className="input" type="date" value={form.validFrom} onChange={e=>setForm(f=>({...f,validFrom:e.target.value}))}/>
                </label>
                <label style={{display:'grid',gap:4}}><span style={{fontSize:11,fontWeight:700,textTransform:'uppercase',color:'var(--text-muted)'}}>Valid Until</span>
                  <input className="input" type="date" value={form.validUntil} onChange={e=>setForm(f=>({...f,validUntil:e.target.value}))}/>
                </label>
              </div>
              <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                <button type="button" className="btn btn-outline btn-sm" onClick={()=>setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm"><Plus size={13}/> Create Offer</button>
              </div>
            </form>
          </div>
        )}
        {/* Tabs */}
        <div className="tab-bar" style={{marginBottom:16}}>
          {(['all','active','expired','draft'] as const).map(t=>(
            <button key={t} className={`tab-btn ${tab===t?'active':''}`} onClick={()=>setTab(t)} style={{textTransform:'capitalize'}}>{t} {t==='all'?`(${offers.length})`:t==='active'?`(${active})`:''}</button>
          ))}
        </div>
        {/* Offer cards */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14}}>
          {visible.map(o=>{
            const pct=o.usageLimit>0?(o.used/o.usageLimit)*100:0;
            const statusC=statusColor[o.status];
            return (
              <div key={o.id} className="card" style={{padding:0,overflow:'hidden'}}>
                <div style={{height:4,background:statusC}}/>
                <div style={{padding:'16px 18px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:15,color:'var(--text-primary)',marginBottom:3}}>{o.name}</div>
                      <span style={{fontSize:11,fontWeight:700,padding:'2px 9px',borderRadius:20,background:`${statusC}18`,color:statusC,textTransform:'capitalize'}}>{o.status}</span>
                    </div>
                    <div style={{fontSize:22,fontWeight:900,color:'var(--brand)'}}>
                      {o.type==='percent'?<>{o.value}%</>:o.type==='flat'?<span style={{fontSize:18}}>₹{o.value}</span>:<Gift size={20} color="var(--brand)"/>}
                    </div>
                  </div>
                  {o.plan&&<div style={{fontSize:12,color:'var(--text-muted)',marginBottom:10}}>📦 {o.plan}</div>}
                  {/* Coupon code */}
                  <div style={{display:'flex',alignItems:'center',gap:8,background:'var(--bg-subtle)',borderRadius:8,padding:'7px 12px',marginBottom:10}}>
                    <Tag size={12} color="var(--text-muted)"/>
                    <span style={{fontFamily:'monospace',fontWeight:700,letterSpacing:'1px',fontSize:14,color:'var(--text-primary)',flex:1}}>{o.code}</span>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>copyCode(o.code)} title="Copy code">
                      {copied===o.code?<CheckCircle2 size={13} color="var(--success)"/>:<Copy size={13}/>}
                    </button>
                  </div>
                  {/* Usage bar */}
                  <div style={{marginBottom:8}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'var(--text-muted)',marginBottom:4}}>
                      <span>Used: {o.used}/{o.usageLimit}</span><span>{Math.round(pct)}%</span>
                    </div>
                    <div style={{height:5,background:'var(--border)',borderRadius:999}}><div style={{height:'100%',background:'var(--brand)',borderRadius:999,width:`${Math.min(100,pct)}%`,transition:'width 0.3s'}}/></div>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:11,color:'var(--text-muted)'}}>
                    <span>{o.validFrom} → {o.validUntil}</span>
                    <div style={{display:'flex',gap:4}}>
                      <button className="btn btn-ghost btn-icon btn-sm"><Edit2 size={12}/></button>
                      <button className="btn btn-ghost btn-icon btn-sm" style={{color:'var(--danger)'}} onClick={()=>setOffers(p=>p.filter(x=>x.id!==o.id))}><Trash2 size={12}/></button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
