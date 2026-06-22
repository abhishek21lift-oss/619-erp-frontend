'use client';
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
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

const KPIS = [
  { label:'Total Members', key:'members', color:'#8b5cf6', icon:<Users size={18}/>, bg:'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(109,40,217,0.05))' },
  { label:'Selected', key:'selected', color:'#a855f7', icon:<CheckCircle2 size={18}/>, bg:'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(88,28,135,0.05))' },
  { label:'Sent Today', key:'sent', color:'#6d28d9', icon:<MessageCircle size={18}/>, bg:'linear-gradient(135deg, rgba(109,40,217,0.1), rgba(139,92,246,0.05))' },
];

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const itemVariants = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] } } };

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

  const filtered = useMemo(() => search.trim() ? members.filter(m=>(m.name||'').toLowerCase().includes(search.toLowerCase())||(m.mobile||'').includes(search)) : members, [members, search]);
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
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(buildMsg(member))}`,'_blank');
    setSent(s=>s+1);
  }
  function sendBulk(){ members.filter(m=>selected.includes(m.id)).forEach((m,i)=>setTimeout(()=>openWhatsApp(m),i*300)); }

  return (
    <AppShell>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px' }}>
        {/* ── HERO — DO NOT CHANGE ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ position:'relative', overflow:'hidden', borderRadius:24, padding:'40px 44px', marginBottom:28, background:'linear-gradient(135deg, #1a0a2e, #2d1b69, #1a0a2e)', boxShadow:'0 20px 60px rgba(26,10,46,0.5)' }}>
          <div style={{ position:'absolute', inset:0, background:'radial-gradient(600px circle at 30% 40%, rgba(139,92,246,0.15), transparent 70%)' }}/>
          <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(rgba(139,92,246,0.08) 1px, transparent 1px)', backgroundSize:'24px 24px' }}/>
          <div style={{ position:'absolute', top:-30, right:40, width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle, rgba(168,85,247,0.1), transparent)' }}/>
          <div style={{ position:'absolute', bottom:-20, left:60, width:140, height:140, borderRadius:'50%', background:'radial-gradient(circle, rgba(109,40,217,0.08), transparent)' }}/>
          <div style={{ position:'relative', zIndex:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
              <div style={{ width:44, height:44, borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(109,40,217,0.1))', backdropFilter:'blur(8px)' }}>
                <MessageCircle size={22} color="#a855f7" />
              </div>
              <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', background:'linear-gradient(135deg, #a855f7, #8b5cf6)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Communication</span>
            </div>
            <h1 style={{ fontSize:34, fontWeight:800, letterSpacing:'-0.03em', lineHeight:1.1, color:'#ffffff', margin:'0 0 8px' }}>WhatsApp / SMS</h1>
            <p style={{ maxWidth:560, fontSize:14, lineHeight:1.6, color:'rgba(255,255,255,0.55)' }}>Send personalised WhatsApp messages to members using templates or custom messages.</p>
          </div>
        </motion.div>

        {/* ── KPI CARDS ── */}
        <motion.div variants={containerVariants} initial="hidden" animate="visible"
          style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:28 }}>
          {KPIS.map((k,i)=>{
            const vals = [members.length, selected.length, sent];
            return (
              <motion.div key={k.label} variants={itemVariants}
                style={{ position:'relative', overflow:'hidden', borderRadius:20, padding:'22px 24px', background:k.bg, border:`1px solid ${k.color}22`, boxShadow:'0 2px 12px rgba(0,0,0,0.06)', cursor:'default', transition:'all 0.3s ease' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                  <div style={{ width:36, height:36, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', background:`${k.color}18` }}>
                    {k.icon}
                  </div>
                  <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'#6b7280' }}>{k.label}</span>
                </div>
                <div style={{ fontSize:30, fontWeight:800, color:k.color, lineHeight:1.2, letterSpacing:'-0.02em' }}>{vals[i]}</div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* ── MAIN CONTENT ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap:20 }}>
          {/* Member list */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            style={{ borderRadius:20, background:'#ffffff', border:'1px solid #e5e7eb', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', overflow:'hidden' }}>
            <div style={{ padding:'14px 20px', borderBottom:'1px solid #e5e7eb', display:'flex', gap:10, alignItems:'center', background:'#f9fafb' }}>
              <div style={{ flex:1, display:'flex', alignItems:'center', gap:8, background:'#ffffff', borderRadius:10, padding:'8px 14px', border:'1px solid #d1d5db' }}>
                <Search size={14} color="#9ca3af" />
                <input placeholder="Search members…" value={search} onChange={e=>setSearch(e.target.value)}
                  style={{ flex:1, border:'none', background:'transparent', outline:'none', fontSize:13, fontWeight:500, color:'#111827' }} />
                {search&&<button onClick={()=>setSearch('')} style={{ background:'none', border:'none', cursor:'pointer', color:'#9ca3af', padding:0 }}><X size={13}/></button>}
              </div>
              <button onClick={selectAll} style={{ fontSize:12, fontWeight:600, color:'#7c3aed', background:'rgba(124,58,237,0.08)', border:'1px solid rgba(124,58,237,0.15)', borderRadius:8, padding:'6px 14px', cursor:'pointer' }}>All</button>
              <button onClick={clearAll} style={{ fontSize:12, fontWeight:600, color:'#6b7280', background:'#f3f4f6', border:'1px solid #e5e7eb', borderRadius:8, padding:'6px 14px', cursor:'pointer' }}>None</button>
            </div>
            <div style={{ maxHeight:520, overflowY:'auto' }}>
              {loading ? (
                <div style={{ padding:40, textAlign:'center', color:'#9ca3af', fontSize:14 }}>Loading members…</div>
              ) : filtered.map(m=>(
                <div key={m.id} onClick={()=>toggleSelect(m.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSelect(m.id); } }}
                  role="button" tabIndex={0} aria-pressed={selected.includes(m.id)} aria-label={`Select ${m.name}`}
                  style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 20px', borderBottom:'1px solid #f3f4f6', cursor:'pointer', background:selected.includes(m.id)?'rgba(139,92,246,0.06)':'transparent', transition:'background 150ms' }}
                  onMouseEnter={e=>{if(!selected.includes(m.id))e.currentTarget.style.background='#f9fafb';}}
                  onMouseLeave={e=>{if(!selected.includes(m.id))e.currentTarget.style.background='transparent';}}>
                  <input type="checkbox" checked={selected.includes(m.id)} onChange={()=>toggleSelect(m.id)} onClick={e=>e.stopPropagation()}
                    style={{ accentColor:'#8b5cf6', width:16, height:16 }} />
                  <div style={{ width:38, height:38, borderRadius:'50%', background:'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(109,40,217,0.08))', color:'#7c3aed', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:12, flexShrink:0, border:'1px solid rgba(139,92,246,0.15)' }}>
                    {m.photo_url?<Image src={m.photo_url} alt={m.name} width={38} height={38} style={{ borderRadius:'50%', objectFit:'cover' }}/>:(m.name||'?').slice(0,2).toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:13, color:'#111827' }}>{m.name}</div>
                    <div style={{ fontSize:11, color:'#6b7280', display:'flex', gap:14, marginTop:2 }}>
                      <span style={{ display:'flex', alignItems:'center', gap:3 }}><Phone size={10}/>{m.mobile||'—'}</span>
                      {m.pt_end_date&&<span style={{ display:'flex', alignItems:'center', gap:3 }}><Clock size={10}/>Exp: {m.pt_end_date}</span>}
                    </div>
                  </div>
                  <button onClick={e=>{e.stopPropagation();openWhatsApp(m);}} disabled={!m.mobile}
                    style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, padding:'6px 16px', borderRadius:10, background:m.mobile?'linear-gradient(135deg, #8b5cf6, #6d28d9)':'#f3f4f6', color:m.mobile?'#fff':'#9ca3af', border:'none', cursor:m.mobile?'pointer':'not-allowed', boxShadow:m.mobile?'0 4px 12px rgba(139,92,246,0.3)':'none' }}>
                    <MessageCircle size={12}/> Send
                  </button>
                </div>
              ))}
              {!loading && filtered.length===0 && <div style={{ padding:40, textAlign:'center', color:'#9ca3af', fontSize:14 }}>No members found</div>}
            </div>
            {selected.length>0&&(
              <div style={{ padding:'14px 20px', borderTop:'1px solid #e5e7eb', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#f9fafb' }}>
                <span style={{ fontSize:13, fontWeight:600, color:'#7c3aed' }}>{selected.length} member{selected.length>1?'s':''} selected</span>
                <button onClick={sendBulk}
                  style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:700, padding:'9px 20px', borderRadius:12, background:'linear-gradient(135deg, #8b5cf6, #6d28d9)', color:'#fff', border:'none', cursor:'pointer', boxShadow:'0 4px 16px rgba(139,92,246,0.35)' }}>
                  <Send size={13}/> Send to Selected
                </button>
              </div>
            )}
          </motion.div>

          {/* Template panel */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay:0.1 }}
              style={{ borderRadius:20, background:'#ffffff', border:'1px solid #e5e7eb', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', padding:22 }}>
              <h3 style={{ margin:'0 0 16px', fontSize:14, fontWeight:700, color:'#111827', display:'flex', alignItems:'center', gap:8 }}>
                <MessageCircle size={15} color="#a855f7"/> Message Template
              </h3>
              <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:14 }}>
                {TEMPLATES.map(t=>(
                  <button key={t.id} onClick={()=>setTemplate(t)}
                    style={{ padding:'10px 16px', borderRadius:10, border:`1px solid ${template.id===t.id?'#8b5cf6':'#e5e7eb'}`, background:template.id===t.id?'rgba(139,92,246,0.06)':'#f9fafb', textAlign:'left', cursor:'pointer', fontSize:13, fontWeight:template.id===t.id?700:500, color:template.id===t.id?'#7c3aed':'#374151', transition:'all 150ms' }}>
                    {t.name}
                  </button>
                ))}
              </div>
              {template.id==='custom'?(
                <textarea rows={6} value={customMsg} onChange={e=>setCustomMsg(e.target.value)} placeholder="Write your custom message. Use {name} for member name, {date} for expiry date, {amount} for balance."
                  style={{ width:'100%', border:'1px solid #d1d5db', borderRadius:10, padding:'12px 14px', fontSize:13, fontWeight:500, color:'#111827', background:'#f9fafb', outline:'none', resize:'vertical', fontFamily:'inherit', lineHeight:1.6 }} />
              ):(
                <div style={{ background:'#f9fafb', borderRadius:10, padding:14, fontSize:13, color:'#374151', lineHeight:1.7, whiteSpace:'pre-wrap', border:'1px solid #e5e7eb' }}>{template.body}</div>
              )}
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay:0.15 }}
              style={{ borderRadius:20, background:'rgba(34,197,94,0.06)', border:'1px solid rgba(34,197,94,0.2)', padding:20 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, color:'#16a34a', fontWeight:700, fontSize:13 }}><ExternalLink size={14}/>Opens WhatsApp Web</div>
              <p style={{ margin:0, fontSize:12, color:'#374151', lineHeight:1.6 }}>Clicking Send opens WhatsApp Web or App with a pre-filled message. No API key needed — direct member communication.</p>
            </motion.div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
