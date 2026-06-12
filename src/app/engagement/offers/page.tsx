'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Tag, Gift, Plus, Edit2, Trash2, Copy, Clock, CheckCircle2, Users } from 'lucide-react';
import { uuid } from '@/lib/uuid';

interface Offer { id:string; name:string; type:'percent'|'flat'|'free'; value:number; code:string; plan:string; validFrom:string; validUntil:string; usageLimit:number; used:number; status:'active'|'expired'|'draft'; }

const SAMPLE:Offer[] = [
  {id:'1',name:'Summer Splash 30% Off',type:'percent',value:30,code:'SUMMER30',plan:'Quarterly Membership',validFrom:'2026-05-01',validUntil:'2026-05-31',usageLimit:50,used:12,status:'active'},
  {id:'2',name:'Flat ₹1000 Off Annual',type:'flat',value:1000,code:'FLAT1K',plan:'Annual Membership',validFrom:'2026-05-01',validUntil:'2026-06-30',usageLimit:20,used:3,status:'active'},
  {id:'3',name:'1 Month Free PT',type:'free',value:0,code:'FREEPT',plan:'PT Monthly',validFrom:'2026-04-01',validUntil:'2026-04-30',usageLimit:10,used:10,status:'expired'},
  {id:'4',name:'Monsoon Special 25% Off',type:'percent',value:25,code:'MONSOON25',plan:'All Plans',validFrom:'2026-06-15',validUntil:'2026-07-15',usageLimit:100,used:0,status:'draft'},
];

const KPIS = [
  { label:'Total Offers', key:'total', color:'#8b5cf6', icon:<Tag size={18}/>, bg:'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(109,40,217,0.06))' },
  { label:'Active', key:'active', color:'#22c55e', icon:<CheckCircle2 size={18}/>, bg:'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(22,163,74,0.06))' },
  { label:'Total Used', key:'used', color:'#a855f7', icon:<Users size={18}/>, bg:'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(88,28,135,0.06))' },
  { label:'Expired', key:'expired', color:'#ef4444', icon:<Clock size={18}/>, bg:'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(220,38,38,0.06))' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] } }
};

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
    setOffers(p=>[...p,{id:uuid(),...form,used:0,status:'draft'}]);
    setForm({name:'',type:'percent',value:0,code:'',plan:'',validFrom:'',validUntil:'',usageLimit:50}); setShowForm(false);
  }
  function genCode(){ const r=Math.random().toString(36).slice(2,8).toUpperCase(); setForm(f=>({...f,code:r})); }

  const statusColor:{[k:string]:string} = {active:'#22c55e', expired:'#ef4444', draft:'#94a3b8'};
  const typeDisplay = (o:Offer) => o.type==='percent' ? <>{o.value}%</> : o.type==='flat' ? <>₹{o.value}</> : <Gift size={18} color="#a855f7"/>;

  return (
    <AppShell>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ position:'relative', overflow:'hidden', borderRadius:24, padding:'40px 44px', marginBottom:28, background:'linear-gradient(135deg, #1a0a2e, #2d1b69, #1a0a2e)', boxShadow:'0 20px 60px rgba(26,10,46,0.5)' }}>
          <div style={{ position:'absolute', inset:0, background:'radial-gradient(600px circle at 50% 30%, rgba(139,92,246,0.12), transparent 70%)' }}/>
          <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(rgba(139,92,246,0.08) 1px, transparent 1px)', backgroundSize:'24px 24px' }}/>
          <div style={{ position:'absolute', top:-20, right:80, width:140, height:140, borderRadius:'50%', background:'radial-gradient(circle, rgba(168,85,247,0.08), transparent)' }}/>
          <div style={{ position:'relative', zIndex:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
              <div style={{ width:44, height:44, borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(109,40,217,0.1))', backdropFilter:'blur(8px)' }}>
                <Tag size={22} color="#a855f7" />
              </div>
              <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', background:'linear-gradient(135deg, #a855f7, #8b5cf6)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Promotions</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <h1 style={{ fontSize:34, fontWeight:800, letterSpacing:'-0.03em', lineHeight:1.1, color:'#ffffff', margin:'0 0 8px' }}>Offers &amp; Promotions</h1>
                <p style={{ maxWidth:560, fontSize:14, lineHeight:1.6, color:'rgba(255,255,255,0.55)' }}>Create discount codes, referral offers &amp; promotional deals for members.</p>
              </div>
              <button onClick={()=>setShowForm(v=>!v)}
                style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:700, padding:'10px 20px', borderRadius:12, background:'linear-gradient(135deg, #8b5cf6, #6d28d9)', color:'#fff', border:'none', cursor:'pointer', boxShadow:'0 4px 16px rgba(139,92,246,0.35)' }}>
                <Plus size={14}/> {showForm?'Cancel':'New Offer'}
              </button>
            </div>
          </div>
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible"
          style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:28 }}>
          {KPIS.map((k,i)=>{
            const vals = [offers.length, active, totalUsed, offers.filter(o=>o.status==='expired').length];
            return (
              <motion.div key={k.label} variants={itemVariants}
                style={{ position:'relative', overflow:'hidden', borderRadius:20, padding:'22px 24px', background:k.bg, backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.1)', boxShadow:'0 8px 32px rgba(0,0,0,0.12)', cursor:'default', transition:'all 0.3s ease' }}
                onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 12px 40px rgba(0,0,0,0.2)';}}
                onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 8px 32px rgba(0,0,0,0.12)';}}>
                <div style={{ position:'absolute', top:-20, right:-20, width:100, height:100, borderRadius:'50%', background:`radial-gradient(circle, ${k.color}15, transparent)` }}/>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:3 }}>
                    <div style={{ width:36, height:36, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', background:`${k.color}20`, backdropFilter:'blur(4px)' }}>
                      {k.icon}
                    </div>
                    <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'rgba(255,255,255,0.5)', marginLeft:6 }}>{k.label}</span>
                  </div>
                </div>
                <div style={{ fontSize:30, fontWeight:800, color:'#ffffff', lineHeight:1.2, letterSpacing:'-0.02em' }}>{vals[i]}</div>
              </motion.div>
            );
          })}
        </motion.div>

        {showForm&&(
          <motion.div initial={{ opacity: 0, y: -10, scale:0.98 }} animate={{ opacity: 1, y: 0, scale:1 }}
            style={{ borderRadius:20, background:'rgba(255,255,255,0.06)', backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.1)', boxShadow:'0 8px 32px rgba(0,0,0,0.12)', padding:24, marginBottom:22 }}>
            <h3 style={{ margin:'0 0 20px', fontSize:15, fontWeight:700, color:'rgba(255,255,255,0.9)', display:'flex', gap:8, alignItems:'center' }}><Gift size={16} color="#a855f7"/> Create New Offer</h3>
            <form onSubmit={addOffer} style={{ display:'grid', gap:16 }}>
              <label style={{ display:'grid', gap:5 }}>
                <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', color:'rgba(255,255,255,0.4)' }}>Offer Name *</span>
                <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Summer Splash 30% Off" required
                  style={{ width:'100%', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'9px 14px', fontSize:13, fontWeight:500, color:'rgba(255,255,255,0.85)', background:'rgba(255,255,255,0.04)', outline:'none', fontFamily:'inherit' }} />
              </label>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 }}>
                <label style={{ display:'grid', gap:5 }}>
                  <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', color:'rgba(255,255,255,0.4)' }}>Discount Type</span>
                  <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value as any}))}
                    style={{ width:'100%', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'9px 12px', fontSize:13, fontWeight:500, color:'rgba(255,255,255,0.85)', background:'rgba(255,255,255,0.04)', outline:'none', fontFamily:'inherit' }}>
                    <option value="percent">Percentage %</option><option value="flat">Flat ₹ Amount</option><option value="free">Free / Complimentary</option>
                  </select>
                </label>
                {form.type!=='free'&&<label style={{ display:'grid', gap:5 }}>
                  <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', color:'rgba(255,255,255,0.4)' }}>{form.type==='percent'?'Discount %':'Amount (₹)'}</span>
                  <input type="number" min={1} value={form.value} onChange={e=>setForm(f=>({...f,value:Number(e.target.value)}))}
                    style={{ width:'100%', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'9px 14px', fontSize:13, fontWeight:500, color:'rgba(255,255,255,0.85)', background:'rgba(255,255,255,0.04)', outline:'none', fontFamily:'inherit' }} />
                </label>}
                <label style={{ display:'grid', gap:5 }}>
                  <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', color:'rgba(255,255,255,0.4)' }}>Usage Limit</span>
                  <input type="number" min={1} value={form.usageLimit} onChange={e=>setForm(f=>({...f,usageLimit:Number(e.target.value)}))}
                    style={{ width:'100%', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'9px 14px', fontSize:13, fontWeight:500, color:'rgba(255,255,255,0.85)', background:'rgba(255,255,255,0.04)', outline:'none', fontFamily:'inherit' }} />
                </label>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <label style={{ display:'grid', gap:5 }}>
                  <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', color:'rgba(255,255,255,0.4)' }}>Coupon Code</span>
                  <div style={{ display:'flex', gap:6 }}>
                    <input value={form.code} onChange={e=>setForm(f=>({...f,code:e.target.value.toUpperCase()}))} placeholder="e.g. SUMMER30"
                      style={{ flex:1, border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'9px 14px', fontSize:13, fontWeight:500, color:'rgba(255,255,255,0.85)', background:'rgba(255,255,255,0.04)', outline:'none', fontFamily:'inherit' }} />
                    <button type="button" onClick={genCode}
                      style={{ fontSize:12, fontWeight:700, padding:'8px 14px', borderRadius:10, border:'1px solid rgba(139,92,246,0.25)', background:'rgba(139,92,246,0.1)', color:'#a855f7', cursor:'pointer' }}>Auto</button>
                  </div>
                </label>
                <label style={{ display:'grid', gap:5 }}>
                  <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', color:'rgba(255,255,255,0.4)' }}>Applicable Plan</span>
                  <input value={form.plan} onChange={e=>setForm(f=>({...f,plan:e.target.value}))} placeholder="All Plans / Quarterly…"
                    style={{ width:'100%', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'9px 14px', fontSize:13, fontWeight:500, color:'rgba(255,255,255,0.85)', background:'rgba(255,255,255,0.04)', outline:'none', fontFamily:'inherit' }} />
                </label>
                <label style={{ display:'grid', gap:5 }}>
                  <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', color:'rgba(255,255,255,0.4)' }}>Valid From</span>
                  <input type="date" value={form.validFrom} onChange={e=>setForm(f=>({...f,validFrom:e.target.value}))}
                    style={{ width:'100%', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'9px 14px', fontSize:13, fontWeight:500, color:'rgba(255,255,255,0.85)', background:'rgba(255,255,255,0.04)', outline:'none', fontFamily:'inherit' }} />
                </label>
                <label style={{ display:'grid', gap:5 }}>
                  <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', color:'rgba(255,255,255,0.4)' }}>Valid Until</span>
                  <input type="date" value={form.validUntil} onChange={e=>setForm(f=>({...f,validUntil:e.target.value}))}
                    style={{ width:'100%', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'9px 14px', fontSize:13, fontWeight:500, color:'rgba(255,255,255,0.85)', background:'rgba(255,255,255,0.04)', outline:'none', fontFamily:'inherit' }} />
                </label>
              </div>
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                <button type="button" onClick={()=>setShowForm(false)}
                  style={{ fontSize:12, fontWeight:700, padding:'8px 18px', borderRadius:10, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:'rgba(255,255,255,0.5)', cursor:'pointer' }}>Cancel</button>
                <button type="submit"
                  style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:700, padding:'8px 20px', borderRadius:12, background:'linear-gradient(135deg, #8b5cf6, #6d28d9)', color:'#fff', border:'none', cursor:'pointer', boxShadow:'0 4px 16px rgba(139,92,246,0.35)' }}>
                  <Plus size={13}/> Create Offer
                </button>
              </div>
            </form>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          style={{ display:'flex', gap:6, marginBottom:20, flexWrap:'wrap' }}>
          {(['all','active','expired','draft'] as const).map(t=>{
            const isActive = tab===t;
            return (
              <button key={t} onClick={()=>setTab(t)}
                style={{ padding:'8px 18px', borderRadius:10, border:'none', fontSize:12, fontWeight:600, textTransform:'capitalize', cursor:'pointer',
                  background:isActive?'linear-gradient(135deg, #8b5cf6, #6d28d9)':'rgba(255,255,255,0.05)',
                  color:isActive?'#fff':'rgba(255,255,255,0.5)',
                  boxShadow:isActive?'0 4px 14px rgba(139,92,246,0.3)':'none' }}>
                {t} {t==='all'?`(${offers.length})`:t==='active'?`(${active})`:''}
              </button>
            );
          })}
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible"
          style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:14 }}>
          {visible.map(o=>{
            const pct=o.usageLimit>0?(o.used/o.usageLimit)*100:0;
            const statusC=statusColor[o.status];
            return (
              <motion.div key={o.id} variants={itemVariants}
                style={{ borderRadius:20, background:'rgba(255,255,255,0.06)', backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.1)', boxShadow:'0 8px 32px rgba(0,0,0,0.12)', overflow:'hidden', transition:'all 0.3s ease' }}
                onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='0 14px 44px rgba(0,0,0,0.2)';}}
                onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 8px 32px rgba(0,0,0,0.12)';}}>
                <div style={{ height:4, background:`linear-gradient(90deg, ${statusC}, ${statusC}88)` }}/>
                <div style={{ padding:'20px 22px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:15, color:'rgba(255,255,255,0.9)', marginBottom:4 }}>{o.name}</div>
                      <span style={{ fontSize:11, fontWeight:700, padding:'2px 10px', borderRadius:20, background:`${statusC}20`, color:statusC, textTransform:'capitalize' }}>{o.status}</span>
                    </div>
                    <div style={{ fontSize:26, fontWeight:900, background:'linear-gradient(135deg, #a855f7, #8b5cf6)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginLeft:12, whiteSpace:'nowrap' }}>
                      {typeDisplay(o)}
                    </div>
                  </div>
                  {o.plan&&<div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', marginBottom:10, display:'flex', alignItems:'center', gap:4 }}>
                    <span>📦 {o.plan}</span>
                  </div>}
                  <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(255,255,255,0.04)', borderRadius:10, padding:'8px 14px', marginBottom:12, border:'1px solid rgba(255,255,255,0.06)' }}>
                    <Tag size={13} color='rgba(255,255,255,0.3)'/>
                    <span style={{ fontFamily:'monospace', fontWeight:800, letterSpacing:'1px', fontSize:14, color:'#a855f7', flex:1 }}>{o.code}</span>
                    <button onClick={()=>copyCode(o.code)} title="Copy code"
                      style={{ display:'flex', alignItems:'center', justifyContent:'center', width:28, height:28, borderRadius:6, border:'none', background:'transparent', color:copied===o.code?'#4ade80':'rgba(255,255,255,0.3)', cursor:'pointer' }}>
                      {copied===o.code?<CheckCircle2 size={14}/>:<Copy size={14}/>}
                    </button>
                  </div>
                  <div style={{ marginBottom:12 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'rgba(255,255,255,0.4)', marginBottom:4 }}>
                      <span>Used: {o.used}/{o.usageLimit}</span><span>{Math.round(pct)}%</span>
                    </div>
                    <div style={{ height:6, background:'rgba(255,255,255,0.06)', borderRadius:999, overflow:'hidden' }}>
                      <div style={{ height:'100%', background:'linear-gradient(90deg, #8b5cf6, #6d28d9)', borderRadius:999, width:`${Math.min(100,pct)}%`, transition:'width 0.3s' }}/>
                    </div>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:11, color:'rgba(255,255,255,0.35)' }}>
                    <span style={{ display:'flex', alignItems:'center', gap:3 }}><Clock size={11}/>{o.validFrom} → {o.validUntil}</span>
                    <div style={{ display:'flex', gap:4 }}>
                      <button style={{ display:'flex', alignItems:'center', justifyContent:'center', width:28, height:28, borderRadius:6, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:'rgba(255,255,255,0.45)', cursor:'pointer' }}><Edit2 size={12}/></button>
                      <button onClick={()=>setOffers(p=>p.filter(x=>x.id!==o.id))}
                        style={{ display:'flex', alignItems:'center', justifyContent:'center', width:28, height:28, borderRadius:6, border:'none', background:'rgba(239,68,68,0.12)', color:'#f87171', cursor:'pointer' }}><Trash2 size={12}/></button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </AppShell>
  );
}
