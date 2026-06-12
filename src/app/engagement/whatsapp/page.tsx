'use client';
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { MessageCircle, Send, Users, CheckCircle2, Phone, Clock, Search, X, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';

const TEMPLATES = [
  { id:'renewal', name:'Renewal Reminder', body:'Hi {name}! 👋 Your membership at 619 Fitness Studio expires on {date}. Renew today and keep your fitness streak going! Call us: 8756562188' },
  { id:'birthday', name:'Birthday Wish', body:'Happy Birthday {name}! 🎂🎉 The entire 619 Fitness Studio family wishes you a fantastic year ahead. Come in today for a special birthday session on us! 💪' },
  { id:'due', name:'Due Reminder', body:'Hi {name}, you have a pending balance of ₹{amount} at 619 Fitness Studio. Please clear it at your earliest convenience. Thank you! 🙏' },
  { id:'welcome', name:'New Member Welcome', body:'Welcome to 619 Fitness Studio, {name}! 🏋️ We are thrilled to have you. Your fitness journey starts today. Our team is here to help you reach your goals. See you at the gym! 💪' },
  { id:'custom', name:'Custom Message', body:'' },
];

export default function WhatsAppPage() {
  return <Guard role="admin"><WAContent/></Guard>;
}
function WAContent() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [template, setTemplate] = useState(TEMPLATES[0]);
  const [customMsg, setCustomMsg] = useState('');
  const [sent, setSent] = useState(0);
  const { toast } = useToast();

  useEffect(()=>{
    api.clients.list({status:'active'}).then((d:any)=>{setMembers(Array.isArray(d)?d:[]); setLoading(false);}).catch((err:any)=>{toast.error(err?.message || 'Failed to load members'); setLoading(false);});
  },[toast]);

  const filtered = useMemo(() => {
    return search.trim() ? members.filter(m=>(m.name||'').toLowerCase().includes(search.toLowerCase())||(m.mobile||'').includes(search)) : members;
  }, [members, search]);
  const toggleSelect = (id:string)=>setSelected(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
  const selectAll = ()=>setSelected(filtered.map(m=>m.id));
  const clearAll = ()=>setSelected([]);

  function buildMsg(member:any){
    const body = template.id==='custom' ? customMsg : template.body;
    return body.replace('{name}',member.name||'there').replace('{date}',member.pt_end_date||'soon').replace('{amount}',String(member.balance_amount||0));
  }

  function openWhatsApp(member:any){
    const phone = (member.mobile||'').replace(/\D/g,'');
    const num = phone.startsWith('91')?phone:`91${phone}`;
    const msg = encodeURIComponent(buildMsg(member));
    window.open(`https://wa.me/${num}?text=${msg}`,'_blank');
    setSent(s=>s+1);
  }

  function sendBulk(){
    const toSend = members.filter(m=>selected.includes(m.id));
    toSend.forEach((m,i)=>setTimeout(()=>openWhatsApp(m),i*300));
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] } }
  };

  return (
    <AppShell>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ position:'relative', overflow:'hidden', borderRadius:24, padding:'36px 40px', marginBottom:24, background:'linear-gradient(135deg, #0f172a, #1e293b)', boxShadow:'0 20px 60px rgba(15,23,42,0.3)' }}>
          <div style={{ position:'relative', zIndex:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
              <div style={{ width:40, height:40, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(168,85,247,0.2)' }}>
                <MessageCircle size={20} color="#A855F7" />
              </div>
              <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#A855F7' }}>Communication</span>
            </div>
            <h1 style={{ fontSize:32, fontWeight:800, letterSpacing:'-0.03em', lineHeight:1.1, color:'#ffffff', margin:0 }}>WhatsApp / SMS</h1>
            <p style={{ marginTop:8, maxWidth:560, fontSize:14, lineHeight:1.6, color:'rgba(255,255,255,0.6)' }}>Send personalised WhatsApp messages to members using templates or custom messages.</p>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <motion.div variants={containerVariants} initial="hidden" animate="visible"
          style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:24 }}>
          {[
            { label:'Total Members', value:members.length, color:'#A855F7', icon:<Users size={18}/> },
            { label:'Selected', value:selected.length, color:'#22c55e', icon:<CheckCircle2 size={18}/> },
            { label:'Sent Today', value:sent, color:'#3b82f6', icon:<MessageCircle size={18}/> },
          ].map(k=>(
            <motion.div key={k.label} variants={itemVariants}
              style={{ background:'rgba(255,255,255,0.95)', backdropFilter:'blur(12px)', borderRadius:20, padding:'20px 24px', border:'1px solid rgba(255,255,255,0.9)', boxShadow:'0 2px 20px rgba(15,23,42,0.07)' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em', color:'#94a3b8' }}>{k.label}</span>
                <span style={{ color:k.color }}>{k.icon}</span>
              </div>
              <div style={{ fontSize:28, fontWeight:800, color:'#0f172a', lineHeight:1.2 }}>{k.value}</div>
            </motion.div>
          ))}
        </motion.div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap:20 }}>
          {/* Member list */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            style={{ background:'rgba(255,255,255,0.95)', backdropFilter:'blur(12px)', borderRadius:20, border:'1px solid rgba(255,255,255,0.9)', boxShadow:'0 2px 20px rgba(15,23,42,0.07)', overflow:'hidden' }}>
            <div style={{ padding:'14px 20px', borderBottom:'1px solid rgba(15,23,42,0.06)', display:'flex', gap:10, alignItems:'center' }}>
              <div style={{ flex:1, display:'flex', alignItems:'center', gap:8, background:'rgba(248,250,252,0.9)', borderRadius:10, padding:'8px 14px', border:'1px solid rgba(15,23,42,0.06)' }}>
                <Search size={14} color="#94a3b8" />
                <input placeholder="Search members…" value={search} onChange={e=>setSearch(e.target.value)}
                  style={{ flex:1, border:'none', background:'transparent', outline:'none', fontSize:13, fontWeight:500, color:'#0f172a' }} />
                {search&&<button onClick={()=>setSearch('')} style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:0 }}><X size={13}/></button>}
              </div>
              <button onClick={selectAll} style={{ fontSize:12, fontWeight:600, color:'#A855F7', background:'rgba(168,85,247,0.08)', border:'none', borderRadius:8, padding:'6px 12px', cursor:'pointer' }}>All</button>
              <button onClick={clearAll} style={{ fontSize:12, fontWeight:600, color:'#64748b', background:'rgba(100,116,139,0.08)', border:'none', borderRadius:8, padding:'6px 12px', cursor:'pointer' }}>None</button>
            </div>
            <div style={{ maxHeight:520, overflowY:'auto' }}>
              {loading?<div style={{ padding:40, textAlign:'center', color:'#94a3b8', fontSize:14 }}>Loading members…</div>:
              filtered.map(m=>(
                <div key={m.id}
                  onClick={()=>toggleSelect(m.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSelect(m.id); } }}
                  role="button" tabIndex={0} aria-pressed={selected.includes(m.id)} aria-label={`Select ${m.name}`}
                  style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 20px', borderBottom:'1px solid rgba(15,23,42,0.06)', cursor:'pointer', background:selected.includes(m.id)?'rgba(168,85,247,0.06)':'transparent', transition:'background 150ms' }}>
                  <input type="checkbox" checked={selected.includes(m.id)} onChange={()=>toggleSelect(m.id)} onClick={e=>e.stopPropagation()}
                    style={{ accentColor:'#A855F7', width:16, height:16 }} />
                  <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(168,85,247,0.1)', color:'#A855F7', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:12, flexShrink:0 }}>
                    {m.photo_url?<img src={m.photo_url} alt={m.name} style={{ width:36, height:36, borderRadius:'50%', objectFit:'cover' }}/>:(m.name||'?').slice(0,2).toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:13, color:'#0f172a' }}>{m.name}</div>
                    <div style={{ fontSize:11, color:'#94a3b8', display:'flex', gap:12 }}>
                      <span style={{ display:'flex', alignItems:'center', gap:3 }}><Phone size={10}/>{m.mobile||'—'}</span>
                      {m.pt_end_date&&<span style={{ display:'flex', alignItems:'center', gap:3 }}><Clock size={10}/>Exp: {m.pt_end_date}</span>}
                    </div>
                  </div>
                  <button onClick={e=>{e.stopPropagation();openWhatsApp(m);}} disabled={!m.mobile}
                    style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, padding:'6px 14px', borderRadius:10, background:m.mobile?'rgba(168,85,247,0.1)':'rgba(100,116,139,0.06)', color:m.mobile?'#A855F7':'#94a3b8', border:'1px solid '+(m.mobile?'rgba(168,85,247,0.2)':'rgba(100,116,139,0.1)'), cursor:m.mobile?'pointer':'not-allowed' }}>
                    <MessageCircle size={12}/> Send
                  </button>
                </div>
              ))}
              {!loading && filtered.length===0 && <div style={{ padding:40, textAlign:'center', color:'#94a3b8', fontSize:14 }}>No members found</div>}
            </div>
            {selected.length>0&&(
              <div style={{ padding:'12px 20px', borderTop:'1px solid rgba(15,23,42,0.06)', display:'flex', justifyContent:'space-between', alignItems:'center', background:'rgba(168,85,247,0.04)' }}>
                <span style={{ fontSize:13, fontWeight:600, color:'#A855F7' }}>{selected.length} member{selected.length>1?'s':''} selected</span>
                <button onClick={sendBulk}
                  style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:700, padding:'8px 18px', borderRadius:12, background:'linear-gradient(135deg, #A855F7, #7c3aed)', color:'#fff', border:'none', cursor:'pointer', boxShadow:'0 4px 14px rgba(168,85,247,0.3)' }}>
                  <Send size={13}/> Send to Selected
                </button>
              </div>
            )}
          </motion.div>

          {/* Template panel */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay:0.1 }}
              style={{ background:'rgba(255,255,255,0.95)', backdropFilter:'blur(12px)', borderRadius:20, border:'1px solid rgba(255,255,255,0.9)', boxShadow:'0 2px 20px rgba(15,23,42,0.07)', padding:20 }}>
              <h3 style={{ margin:'0 0 14px', fontSize:14, fontWeight:700, color:'#0f172a' }}>Message Template</h3>
              <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:14 }}>
                {TEMPLATES.map(t=>(
                  <button key={t.id} onClick={()=>setTemplate(t)}
                    style={{ padding:'9px 14px', borderRadius:10, border:`1px solid ${template.id===t.id?'#A855F7':'rgba(15,23,42,0.08)'}`, background:template.id===t.id?'rgba(168,85,247,0.08)':'transparent', textAlign:'left', cursor:'pointer', fontSize:13, fontWeight:template.id===t.id?700:500, color:template.id===t.id?'#A855F7':'#0f172a', transition:'all 150ms' }}>
                    {t.name}
                  </button>
                ))}
              </div>
              {template.id==='custom'?(
                <textarea rows={6} value={customMsg} onChange={e=>setCustomMsg(e.target.value)} placeholder="Write your custom message. Use {name} for member name, {date} for expiry date, {amount} for balance."
                  style={{ width:'100%', border:'1px solid rgba(15,23,42,0.08)', borderRadius:10, padding:'12px 14px', fontSize:13, fontWeight:500, color:'#0f172a', background:'rgba(248,250,252,0.9)', outline:'none', resize:'vertical', fontFamily:'inherit', lineHeight:1.6 }} />
              ):(
                <div style={{ background:'rgba(15,23,42,0.03)', borderRadius:10, padding:14, fontSize:13, color:'#475569', lineHeight:1.7, whiteSpace:'pre-wrap' }}>{template.body}</div>
              )}
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay:0.15 }}
              style={{ background:'rgba(34,197,94,0.06)', borderRadius:20, border:'1px solid rgba(34,197,94,0.15)', padding:20 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, color:'#16a34a', fontWeight:700, fontSize:13 }}><ExternalLink size={14}/>Opens WhatsApp Web</div>
              <p style={{ margin:0, fontSize:12, color:'#64748b', lineHeight:1.6 }}>Clicking Send opens WhatsApp Web or App with a pre-filled message. No API key needed — direct member communication.</p>
            </motion.div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
