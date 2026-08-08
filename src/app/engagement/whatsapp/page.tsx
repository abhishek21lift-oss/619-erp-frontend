'use client';
import { useState, useEffect, useMemo } from 'react';
import { m } from 'framer-motion';
import Image from 'next/image';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { PageContainer, PageHero } from '@/components/ui';
import { MessageCircle, Send, Users, CheckCircle2, Phone, Clock, Search, X, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';

const TEMPLATES = [
  { id:'renewal', name:'Renewal Reminder', body:`Hi {name}! 👋 Your membership with MY PT STUDIO expires on {date}. Renew today and keep your fitness streak going! Call us: ${process.env.NEXT_PUBLIC_SUPPORT_PHONE || '8756562188'}` },
  { id:'birthday', name:'Birthday Wish', body:'Happy Birthday {name}! 🎂🎉 MY PT STUDIO wishes you a fantastic year ahead. Come in today for a special birthday session on us! 💪' },
  { id:'due', name:'Due Reminder', body:'Hi {name}, you have a pending balance of ₹{amount} with MY PT STUDIO. Please clear it at your earliest convenience. Thank you! 🙏' },
  { id:'welcome', name:'New Member Welcome', body:'Welcome to MY PT STUDIO, {name}! 🏋️ We are thrilled to have you. Your fitness journey starts today. Here to help you reach your goals. See you soon! 💪' },
  { id:'custom', name:'Custom Message', body:'' },
];

const KPIS = [
  { label:'Total Members', key:'members', color:'#0067e0', icon:<Users size={18}/>, bg:'linear-gradient(135deg, rgba(0,103,224,0.1), rgba(0,103,224,0.05))' },
  { label:'Selected', key:'selected', color:'#0067e0', icon:<CheckCircle2 size={18}/>, bg:'linear-gradient(135deg, rgba(0,103,224,0.1), rgba(0,89,206,0.05))' },
  { label:'Sent Today', key:'sent', color:'#0067e0', icon:<MessageCircle size={18}/>, bg:'linear-gradient(135deg, rgba(0,103,224,0.1), rgba(0,103,224,0.05))' },
];

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const itemVariants = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] } } };

export default function WhatsAppPage() {
  return <Guard role="admin"><WAContent/></Guard>;
}
function WAContent() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [template, setTemplate] = useState(TEMPLATES[0]);
  const [customMsg, setCustomMsg] = useState('');
  const [sent, setSent] = useState(0);
  const { toast } = useToast();

  useEffect(()=>{
    api.clients.list({status:'active'})
      .then((d:any)=>{ setMembers(Array.isArray(d)?d:[]); setLoading(false); })
      .catch((err:any)=>{
        const msg = err?.message || 'Failed to load members';
        setLoadError(msg);
        toast.error(msg);
        setLoading(false);
      });
  },[toast]);

  const filtered = useMemo(() => search.trim() ? members.filter(m=>(m.name||'').toLowerCase().includes(search.toLowerCase())||(m.mobile||'').includes(search)) : members, [members, search]);
  const toggleSelect = (id:string)=>setSelected(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
  const selectAll = ()=>setSelected(filtered.map(m=>m.id));
  const clearAll = ()=>setSelected([]);

  function buildMsg(member:any){
    const body = template.id==='custom' ? customMsg : template.body;
    return body.replace('{name}',member.name||'there').replace('{date}',member.pt_end_date||'soon').replace('{amount}',String(member.balance_amount||0));
  }
  function openWhatsApp(member:any){
    try {
      const phone = (member.mobile||'').replace(/\D/g,'');
      if (!phone) {
        toast.error(`${member.name || 'Member'} has no phone number on file`);
        return;
      }
      const num = phone.startsWith('91')?phone:`91${phone}`;
      window.open(`https://wa.me/${num}?text=${encodeURIComponent(buildMsg(member))}`,'_blank');
      setSent(s=>s+1);
    } catch {
      toast.error('Could not open WhatsApp — please check your browser settings');
    }
  }
  function sendBulk(){ members.filter(m=>selected.includes(m.id)).forEach((m,i)=>setTimeout(()=>openWhatsApp(m),i*300)); }

  return (
    <AppShell>
      <PageContainer>
        <PageHero
          icon={<MessageCircle size={20} />}
          title="WhatsApp / SMS"
          subtitle="Send personalised WhatsApp messages to members using templates or custom messages."
        />

        {/* ── ERROR BANNER ── */}
        {loadError && (
          <m.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            style={{ borderRadius: 14, padding: '14px 18px', background: '#fef2f2', border: '1px solid #fecaca', fontSize: 13, color: '#dc2626', lineHeight: 1.5 }}>
            <strong style={{ color: '#b91c1c' }}>Unable to load members:</strong> {loadError}. WhatsApp integration is not configured — contact your administrator if this problem persists.
          </m.div>
        )}

        {/* ── KPI CARDS ── */}
        <m.div variants={containerVariants} initial="hidden" animate="visible"
          className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {KPIS.map((k,i)=>{
            const vals = [members.length, selected.length, sent];
            return (
              <m.div key={k.label} variants={itemVariants}
                style={{ position:'relative', overflow:'hidden', borderRadius:20, padding:'22px 24px', background:k.bg, border:`1px solid ${k.color}22`, boxShadow:'0 2px 12px rgba(0,0,0,0.06)', cursor:'default', transition:'all 0.3s ease' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                  <div style={{ width:36, height:36, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', background:`${k.color}18` }}>
                    {k.icon}
                  </div>
                  <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'#64748b' }}>{k.label}</span>
                </div>
                <div style={{ fontSize:30, fontWeight:800, color:k.color, lineHeight:1.2, letterSpacing:'-0.02em' }}>{vals[i]}</div>
              </m.div>
            );
          })}
        </m.div>

        {/* ── MAIN CONTENT ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px]" style={{ gap:20 }}>
          {/* Member list */}
          <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            style={{ borderRadius:20, background:'#ffffff', border:'1px solid #e2e8f0', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', overflow:'hidden' }}>
            <div style={{ padding:'14px 20px', borderBottom:'1px solid #e2e8f0', display:'flex', gap:10, alignItems:'center', background:'#f8fafc' }}>
              <div style={{ flex:1, display:'flex', alignItems:'center', gap:8, background:'#ffffff', borderRadius:10, padding:'8px 14px', border:'1px solid #cbd5e1' }}>
                <Search size={14} color="#94a3b8" />
                <input placeholder="Search members…" value={search} onChange={e=>setSearch(e.target.value)}
                  style={{ flex:1, border:'none', background:'transparent', outline:'none', fontSize:13, fontWeight:500, color:'#0F172A' }} />
                {search&&<button onClick={()=>setSearch('')} style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:0 }}><X size={13}/></button>}
              </div>
              <button onClick={selectAll} style={{ fontSize:12, fontWeight:600, color:'#0067e0', background:'rgba(0,103,224,0.08)', border:'1px solid rgba(0,103,224,0.15)', borderRadius:8, padding:'6px 14px', cursor:'pointer' }}>All</button>
              <button onClick={clearAll} style={{ fontSize:12, fontWeight:600, color:'#64748b', background:'#f1f5f9', border:'1px solid #e2e8f0', borderRadius:8, padding:'6px 14px', cursor:'pointer' }}>None</button>
            </div>
            <div style={{ maxHeight:520, overflowY:'auto' }}>
              {loading ? (
                <div style={{ padding:40, textAlign:'center', color:'#94a3b8', fontSize:14 }}>Loading members…</div>
              ) : filtered.map(m=>(
                <div key={m.id} onClick={()=>toggleSelect(m.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSelect(m.id); } }}
                  role="button" tabIndex={0} aria-pressed={selected.includes(m.id)} aria-label={`Select ${m.name}`}
                  style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 20px', borderBottom:'1px solid #f1f5f9', cursor:'pointer', background:selected.includes(m.id)?'rgba(0,103,224,0.06)':'transparent', transition:'background 150ms' }}
                  onMouseEnter={e=>{if(!selected.includes(m.id))e.currentTarget.style.background='#f8fafc';}}
                  onMouseLeave={e=>{if(!selected.includes(m.id))e.currentTarget.style.background='transparent';}}>
                  <input type="checkbox" checked={selected.includes(m.id)} onChange={()=>toggleSelect(m.id)} onClick={e=>e.stopPropagation()}
                    style={{ accentColor:'#0067e0', width:16, height:16 }} />
                  <div style={{ width:38, height:38, borderRadius:'50%', background:'linear-gradient(135deg, rgba(0,103,224,0.15), rgba(0,103,224,0.08))', color:'#0067e0', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:12, flexShrink:0, border:'1px solid rgba(0,103,224,0.15)' }}>
                    {m.photo_url?<Image src={m.photo_url} alt={m.name} width={38} height={38} style={{ borderRadius:'50%', objectFit:'cover' }}/>:(m.name||'?').slice(0,2).toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:13, color:'#0F172A' }}>{m.name}</div>
                    <div style={{ fontSize:11, color:'#64748b', display:'flex', gap:14, marginTop:2 }}>
                      <span style={{ display:'flex', alignItems:'center', gap:3 }}><Phone size={10}/>{m.mobile||'—'}</span>
                      {m.pt_end_date&&<span style={{ display:'flex', alignItems:'center', gap:3 }}><Clock size={10}/>Exp: {m.pt_end_date}</span>}
                    </div>
                  </div>
                  <button onClick={e=>{e.stopPropagation();openWhatsApp(m);}} disabled={!m.mobile}
                    style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, padding:'6px 16px', borderRadius:10, background:m.mobile?'linear-gradient(135deg, #0067e0, #0059ce)':'#f1f5f9', color:m.mobile?'#fff':'#94a3b8', border:'none', cursor:m.mobile?'pointer':'not-allowed', boxShadow:m.mobile?'0 4px 12px rgba(0,103,224,0.3)':'none' }}>
                    <MessageCircle size={12}/> Send
                  </button>
                </div>
              ))}
              {!loading && filtered.length===0 && <div style={{ padding:40, textAlign:'center', color:'#94a3b8', fontSize:14 }}>No members found</div>}
            </div>
            {selected.length>0&&(
              <div style={{ padding:'14px 20px', borderTop:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#f8fafc' }}>
                <span style={{ fontSize:13, fontWeight:600, color:'#0067e0' }}>{selected.length} member{selected.length>1?'s':''} selected</span>
                <button onClick={sendBulk}
                  style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:700, padding:'9px 20px', borderRadius:12, background:'linear-gradient(135deg, #0067e0, #0059ce)', color:'#fff', border:'none', cursor:'pointer', boxShadow:'0 4px 16px rgba(0,103,224,0.35)' }}>
                  <Send size={13}/> Send to Selected
                </button>
              </div>
            )}
          </m.div>

          {/* Template panel */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay:0.1 }}
              style={{ borderRadius:20, background:'#ffffff', border:'1px solid #e2e8f0', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', padding:22 }}>
              <h3 style={{ margin:'0 0 16px', fontSize:14, fontWeight:700, color:'#0F172A', display:'flex', alignItems:'center', gap:8 }}>
                <MessageCircle size={15} color="#0067e0"/> Message Template
              </h3>
              <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:14 }}>
                {TEMPLATES.map(t=>(
                  <button key={t.id} onClick={()=>setTemplate(t)}
                    style={{ padding:'10px 16px', borderRadius:10, border:`1px solid ${template.id===t.id?'#0067e0':'#e2e8f0'}`, background:template.id===t.id?'rgba(0,103,224,0.06)':'#f8fafc', textAlign:'left', cursor:'pointer', fontSize:13, fontWeight:template.id===t.id?700:500, color:template.id===t.id?'#0067e0':'#334155', transition:'all 150ms' }}>
                    {t.name}
                  </button>
                ))}
              </div>
              {template.id==='custom'?(
                <textarea rows={6} value={customMsg} onChange={e=>setCustomMsg(e.target.value)} placeholder="Write your custom message. Use {name} for member name, {date} for expiry date, {amount} for balance."
                  style={{ width:'100%', border:'1px solid #cbd5e1', borderRadius:10, padding:'12px 14px', fontSize:13, fontWeight:500, color:'#0F172A', background:'#f8fafc', outline:'none', resize:'vertical', fontFamily:'inherit', lineHeight:1.6 }} />
              ):(
                <div style={{ background:'#f8fafc', borderRadius:10, padding:14, fontSize:13, color:'#334155', lineHeight:1.7, whiteSpace:'pre-wrap', border:'1px solid #e2e8f0' }}>{template.body}</div>
              )}
            </m.div>
            <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay:0.15 }}
              style={{ borderRadius:20, background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.2)', padding:20 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, color:'#10b981', fontWeight:700, fontSize:13 }}><ExternalLink size={14}/>Opens WhatsApp Web</div>
              <p style={{ margin:0, fontSize:12, color:'#334155', lineHeight:1.6 }}>Clicking Send opens WhatsApp Web or App with a pre-filled message. No API key needed — direct member communication.</p>
            </m.div>
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
}
