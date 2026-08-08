'use client';
import { useState, useEffect } from 'react';
import { m } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { PageContainer, PageHero } from '@/components/ui';
import { Tag, Gift, Plus, Edit2, Trash2, Copy, Clock, CheckCircle2, Users, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';

interface Offer { id:string; name:string; type:'percent'|'flat'|'free'; value:number; code:string; plan:string; validFrom:string; validUntil:string; usageLimit:number; used:number; status:'active'|'expired'|'draft'; }

const KPIS = [
  { label:'Total Offers', key:'total', color:'#0067e0', icon:<Tag size={18}/>, bg:'linear-gradient(135deg, rgba(0,103,224,0.1), rgba(0,103,224,0.05))' },
  { label:'Active', key:'active', color:'#10b981', icon:<CheckCircle2 size={18}/>, bg:'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.05))' },
  { label:'Total Used', key:'used', color:'#0067e0', icon:<Users size={18}/>, bg:'linear-gradient(135deg, rgba(0,103,224,0.1), rgba(0,89,206,0.05))' },
  { label:'Expired', key:'expired', color:'#ef4444', icon:<Clock size={18}/>, bg:'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(220,38,38,0.05))' },
];

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const itemVariants = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] } } };

const statusColor:{[k:string]:string} = { active:'#10b981', expired:'#dc2626', draft:'#64748b' };
const statusBg:{[k:string]:string} = { active:'rgba(16,185,129,0.1)', expired:'rgba(220,38,38,0.08)', draft:'#f1f5f9' };

export default function OffersPage() { return <Guard role="admin"><OffersContent/></Guard>; }
function OffersContent() {
  const { toast } = useToast();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState<'all'|'active'|'expired'|'draft'>('all');
  const [form, setForm] = useState({name:'',type:'percent' as 'percent'|'flat'|'free',value:0,code:'',plan:'',validFrom:'',validUntil:'',usageLimit:50});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copied, setCopied] = useState('');

  const blankForm = {name:'',type:'percent' as 'percent'|'flat'|'free',value:0,code:'',plan:'',validFrom:'',validUntil:'',usageLimit:50};

  function openNewOfferForm() {
    setForm(blankForm);
    setEditingId(null);
    setShowForm(true);
  }

  function openEditOfferForm(o: Offer) {
    setForm({ name: o.name, type: o.type, value: o.value, code: o.code, plan: o.plan, validFrom: o.validFrom, validUntil: o.validUntil, usageLimit: o.usageLimit });
    setEditingId(o.id);
    setShowForm(true);
  }

  async function load() {
    setLoading(true); setError(null);
    try { const data = await api.offers.list() as Offer[]; setOffers(Array.isArray(data) ? data : []); }
    catch (err: any) { setError(err?.message || 'Failed to load offers'); }
    finally { setLoading(false); }
  }

  async function addOffer(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = {
        title: form.name,
        discount_type: form.type,
        discount_value: form.value,
        code: form.code,
        audience: form.plan,
        max_uses: form.usageLimit,
        valid_from: form.validFrom || null,
        valid_until: form.validUntil || null,
      };
      if (editingId) {
        const res = await api.offers.update(editingId, payload as any) as { message?: string; offer: Offer };
        if (res?.offer) setOffers(p => p.map(o => o.id === editingId ? res.offer : o)); else load();
        toast.success('Offer updated');
      } else {
        const res = await api.offers.create(payload as any) as { message?: string; offer: Offer };
        if (res?.offer) setOffers(p => [...p, res.offer]); else load();
        toast.success('Offer created');
      }
      setForm(blankForm);
      setEditingId(null);
      setShowForm(false);
    } catch (err: any) { toast.error(err?.message || (editingId ? 'Failed to update offer' : 'Failed to create offer')); }
  }

  async function handleDelete(id: string) {
    try { await api.offers.delete(id); setOffers(p => p.filter(x => x.id !== id)); toast.success('Offer deleted'); }
    catch (err: any) { toast.error(err?.message || 'Failed to delete offer'); }
  }

  useEffect(() => { load(); }, []);
  function genCode(){ setForm(f=>({...f,code:Math.random().toString(36).slice(2,8).toUpperCase()})); }

  const visible = tab==='all' ? offers : offers.filter(o=>o.status===tab);
  const active=offers.filter(o=>o.status==='active').length;
  const totalUsed=offers.reduce((s,o)=>s+o.used,0);

  const inp = { width:'100%', border:'1px solid #cbd5e1', borderRadius:10, padding:'9px 14px', fontSize:13, fontWeight:500, color:'#0F172A', background:'#f8fafc', outline:'none', fontFamily:'inherit' } as const;

  return (
    <AppShell>
      <PageContainer>
        <PageHero
          icon={<Tag size={20} />}
          title="Offers & Promotions"
          subtitle="Create discount codes, referral offers & promotional deals for members."
          actions={
            <button type="button" onClick={()=>{ if (showForm) { setShowForm(false); setEditingId(null); } else { openNewOfferForm(); } }}
              className="inline-flex items-center gap-1.5 rounded-full h-9 px-3.5 text-[12px] font-semibold transition active:scale-95"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', color: '#fff' }}>
              <Plus size={14}/> {showForm?'Cancel':'New Offer'}
            </button>
          }
        />

        {error && <div style={{ borderRadius:14, padding:'14px 20px', background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626', fontWeight:600, fontSize:13 }}>{error}</div>}

        {/* ── KPI CARDS ── */}
        <m.div variants={containerVariants} initial="hidden" animate="visible"
          className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {KPIS.map((k,i)=>{
            const vals = [offers.length, active, totalUsed, offers.filter(o=>o.status==='expired').length];
            return (
              <m.div key={k.label} variants={itemVariants}
                style={{ position:'relative', overflow:'hidden', borderRadius:20, padding:'22px 24px', background:k.bg, border:`1px solid ${k.color}22`, boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                  <div style={{ width:36, height:36, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', background:`${k.color}18` }}>{k.icon}</div>
                  <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'#64748b' }}>{k.label}</span>
                </div>
                <div style={{ fontSize:30, fontWeight:800, color:k.color, lineHeight:1.2, letterSpacing:'-0.02em' }}>{loading ? '—' : vals[i]}</div>
              </m.div>
            );
          })}
        </m.div>

        {/* ── CREATE FORM ── */}
        {showForm&&(
          <m.div initial={{ opacity: 0, y: -10, scale:0.98 }} animate={{ opacity: 1, y: 0, scale:1 }}
            style={{ borderRadius:20, background:'#ffffff', border:'1px solid #e2e8f0', boxShadow:'0 4px 20px rgba(0,0,0,0.08)', padding:24 }}>
            <h3 style={{ margin:'0 0 20px', fontSize:15, fontWeight:700, color:'#0F172A', display:'flex', gap:8, alignItems:'center' }}><Gift size={16} color="#0067e0"/> {editingId ? 'Edit Offer' : 'Create New Offer'}</h3>
            <form onSubmit={addOffer} style={{ display:'grid', gap:16 }}>
              <label style={{ display:'grid', gap:5 }}>
                <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', color:'#334155' }}>Offer Name *</span>
                <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Summer Splash 30% Off" required style={inp} />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap:14 }}>
                <label style={{ display:'grid', gap:5 }}>
                  <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', color:'#334155' }}>Discount Type</span>
                  <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value as any}))} style={inp}>
                    <option value="percent">Percentage %</option><option value="flat">Flat ₹ Amount</option><option value="free">Free / Complimentary</option>
                  </select>
                </label>
                {form.type!=='free'&&<label style={{ display:'grid', gap:5 }}>
                  <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', color:'#334155' }}>{form.type==='percent'?'Discount %':'Amount (₹)'}</span>
                  <input type="number" min={1} value={form.value} onChange={e=>setForm(f=>({...f,value:Number(e.target.value)}))} style={inp} />
                </label>}
                <label style={{ display:'grid', gap:5 }}>
                  <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', color:'#334155' }}>Usage Limit</span>
                  <input type="number" min={1} value={form.usageLimit} onChange={e=>setForm(f=>({...f,usageLimit:Number(e.target.value)}))} style={inp} />
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap:14 }}>
                <label style={{ display:'grid', gap:5 }}>
                  <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', color:'#334155' }}>Coupon Code</span>
                  <div style={{ display:'flex', gap:6 }}>
                    <input value={form.code} onChange={e=>setForm(f=>({...f,code:e.target.value.toUpperCase()}))} placeholder="e.g. SUMMER30" style={{ ...inp, flex:1 }} />
                    <button type="button" onClick={genCode} style={{ fontSize:12, fontWeight:700, padding:'8px 14px', borderRadius:10, border:'1px solid #0067e0', background:'rgba(0,103,224,0.08)', color:'#0067e0', cursor:'pointer' }}>Auto</button>
                  </div>
                </label>
                <label style={{ display:'grid', gap:5 }}>
                  <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', color:'#334155' }}>Applicable Plan</span>
                  <input value={form.plan} onChange={e=>setForm(f=>({...f,plan:e.target.value}))} placeholder="All Plans / Quarterly…" style={inp} />
                </label>
                <label style={{ display:'grid', gap:5 }}>
                  <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', color:'#334155' }}>Valid From</span>
                  <input type="date" value={form.validFrom} onChange={e=>setForm(f=>({...f,validFrom:e.target.value}))} style={inp} />
                </label>
                <label style={{ display:'grid', gap:5 }}>
                  <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', color:'#334155' }}>Valid Until</span>
                  <input type="date" value={form.validUntil} onChange={e=>setForm(f=>({...f,validUntil:e.target.value}))} style={inp} />
                </label>
              </div>
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                <button type="button" onClick={()=>{ setShowForm(false); setEditingId(null); }} style={{ fontSize:12, fontWeight:700, padding:'8px 18px', borderRadius:10, border:'1px solid #cbd5e1', background:'transparent', color:'#64748b', cursor:'pointer' }}>Cancel</button>
                <button type="submit" style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:700, padding:'8px 20px', borderRadius:12, background:'linear-gradient(135deg, #0067e0, #0059ce)', color:'#fff', border:'none', cursor:'pointer', boxShadow:'0 4px 16px rgba(0,103,224,0.35)' }}>
                  <Plus size={13}/> {editingId ? 'Save Changes' : 'Create Offer'}
                </button>
              </div>
            </form>
          </m.div>
        )}

        {/* ── TABS ── */}
        {!loading && (
          <m.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {(['all','active','expired','draft'] as const).map(t=>{
              const isActive = tab===t;
              return (
                <button key={t} onClick={()=>setTab(t)}
                  style={{ padding:'7px 18px', borderRadius:10, border:`1px solid ${isActive?'#0067e0':'#e2e8f0'}`, fontSize:12, fontWeight:600, textTransform:'capitalize', cursor:'pointer',
                    background:isActive?'linear-gradient(135deg, #0067e0, #0059ce)':'#ffffff', color:isActive?'#fff':'#334155',
                    boxShadow:isActive?'0 4px 14px rgba(0,103,224,0.3)':'none' }}>
                  {t} {t==='all'?`(${offers.length})`:t==='active'?`(${active})`:''}
                </button>
              );
            })}
          </m.div>
        )}

        {/* ── OFFERS GRID ── */}
        {loading ? (
          <div style={{ textAlign:'center', padding:'60px 20px' }}><Loader2 size={32} color="#cbd5e1" style={{ animation:'spin 1s linear infinite' }} /></div>
        ) : (
          <m.div variants={containerVariants} initial="hidden" animate="visible"
            style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:14 }}>
            {visible.map(o=>{
              const pct=o.usageLimit>0?(o.used/o.usageLimit)*100:0;
              const sc=statusColor[o.status]||'#64748b';
              const sb=statusBg[o.status]||'#f1f5f9';
              return (
                <m.div key={o.id} variants={itemVariants}
                  style={{ borderRadius:20, background:'#ffffff', border:'1px solid #e2e8f0', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', overflow:'hidden', transition:'all 0.2s ease' }}
                  onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 6px 24px rgba(0,0,0,0.1)';e.currentTarget.style.transform='translateY(-2px)';}}
                  onMouseLeave={e=>{e.currentTarget.style.boxShadow='0 2px 12px rgba(0,0,0,0.06)';e.currentTarget.style.transform='translateY(0)';}}>
                  <div style={{ height:4, background:`linear-gradient(90deg, ${sc}, ${sc}aa)` }}/>
                  <div style={{ padding:'18px 20px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:15, color:'#0F172A', marginBottom:4 }}>{o.name}</div>
                        <span style={{ fontSize:11, fontWeight:700, padding:'2px 10px', borderRadius:20, background:sb, color:sc, textTransform:'capitalize' }}>{o.status}</span>
                      </div>
                      <div style={{ fontSize:24, fontWeight:900, color:'#0067e0', marginLeft:12, whiteSpace:'nowrap' }}>
                        {o.type==='percent'?<>{o.value}%</>:o.type==='flat'?<>₹{o.value}</>:<Gift size={18} color="#0067e0"/>}
                      </div>
                    </div>
                    {o.plan&&<div style={{ fontSize:12, color:'#64748b', marginBottom:10 }}>📦 {o.plan}</div>}
                    <div style={{ display:'flex', alignItems:'center', gap:8, background:'#f8fafc', borderRadius:10, padding:'8px 14px', marginBottom:12, border:'1px solid #e2e8f0' }}>
                      <Tag size={13} color='#94a3b8'/>
                      <span style={{ fontFamily:'monospace', fontWeight:800, letterSpacing:'1px', fontSize:14, color:'#0067e0', flex:1 }}>{o.code}</span>
                      <button onClick={()=>{navigator.clipboard.writeText(o.code);setCopied(o.id);setTimeout(()=>setCopied(''),2000);}} title="Copy code"
                        style={{ display:'flex', alignItems:'center', justifyContent:'center', width:28, height:28, borderRadius:6, border:'none', background:'transparent', color:copied===o.id?'#10b981':'#94a3b8', cursor:'pointer' }}>
                        {copied===o.id?<CheckCircle2 size={14}/>:<Copy size={14}/>}
                      </button>
                    </div>
                    <div style={{ marginBottom:12 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#64748b', marginBottom:5 }}>
                        <span>Used: {o.used}/{o.usageLimit}</span><span>{Math.round(pct)}%</span>
                      </div>
                      <div style={{ height:6, background:'#f1f5f9', borderRadius:999, overflow:'hidden', border:'1px solid #e2e8f0' }}>
                        <div style={{ height:'100%', background:'linear-gradient(90deg, #0067e0, #0059ce)', borderRadius:999, width:`${Math.min(100,pct)}%`, transition:'width 0.3s' }}/>
                      </div>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:11, color:'#94a3b8' }}>
                      <span style={{ display:'flex', alignItems:'center', gap:3 }}><Clock size={11}/>{o.validFrom||'—'} → {o.validUntil||'—'}</span>
                      <div style={{ display:'flex', gap:4 }}>
                        <button onClick={()=>openEditOfferForm(o)} style={{ display:'flex', alignItems:'center', justifyContent:'center', width:28, height:28, borderRadius:6, border:'1px solid #e2e8f0', background:'transparent', color:'#64748b', cursor:'pointer' }}><Edit2 size={12}/></button>
                        <button onClick={()=>handleDelete(o.id)} style={{ display:'flex', alignItems:'center', justifyContent:'center', width:28, height:28, borderRadius:6, border:'none', background:'rgba(239,68,68,0.08)', color:'#dc2626', cursor:'pointer' }}><Trash2 size={12}/></button>
                      </div>
                    </div>
                  </div>
                </m.div>
              );
            })}
            {visible.length === 0 && (
              <div style={{ padding:'64px 20px', textAlign:'center', gridColumn:'1/-1', background:'#ffffff', borderRadius:20, border:'1px solid #e2e8f0' }}>
                <Tag size={40} color="#cbd5e1" style={{ marginBottom:14 }} />
                <p style={{ fontSize:15, fontWeight:700, color:'#334155', margin:0 }}>No offers found</p>
                <p style={{ fontSize:12, color:'#94a3b8', marginTop:4 }}>Click "New Offer" to create one.</p>
              </div>
            )}
          </m.div>
        )}
      </PageContainer>
    </AppShell>
  );
}
