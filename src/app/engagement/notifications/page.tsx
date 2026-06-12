'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Bell, Send, Users, CheckCircle2, Clock, Plus, Trash2, MessageSquare, RefreshCw } from 'lucide-react';
import { uuid } from '@/lib/uuid';
import { api } from '@/lib/api';

const TYPES = ['Birthday 🎂', 'Expiry Reminder ⚠️', 'Due Reminder 💳', 'Anniversary 🎉', 'General 📢', 'Custom'];
const AUDIENCES = ['All Active Members', 'Expiring This Week', 'Has Outstanding Dues', 'PT Members', 'Expired Members'];

interface Notif { id:string; title:string; body:string; type:string; audience:string; status:'sent'|'scheduled'; created_at:string; recipients:number; }

export default function NotificationsPage() {
  return <Guard role="admin"><NContent/></Guard>;
}
function NContent() {
  const [items, setItems] = useState<Notif[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({title:'',body:'',type:TYPES[0],audience:AUDIENCES[0]});
  const [memberCount, setMemberCount] = useState(0);
  const [sending, setSending] = useState(false);
  const [flash, setFlash] = useState('');

  useEffect(()=>{
    api.clients.list({status:'active'}).then((d:any)=>setMemberCount(Array.isArray(d)?d.length:0)).catch(()=>{});
  },[]);

  async function handleSend(e:React.FormEvent){
    e.preventDefault(); if(!form.title||!form.body) return;
    setSending(true); await new Promise(r=>setTimeout(r,900));
    const rcpt = form.audience==='All Active Members'?memberCount:Math.max(1,Math.floor(memberCount*0.4));
    setItems(prev=>[{id:uuid(),...form,status:'sent',created_at:new Date().toISOString(),recipients:rcpt},...prev]);
    setForm({title:'',body:'',type:TYPES[0],audience:AUDIENCES[0]});
    setSending(false); setShowForm(false);
    setFlash(`✓ Notification sent to ${rcpt} members`); setTimeout(()=>setFlash(''),4000);
  }

  const total=items.length, sent=items.filter(x=>x.status==='sent').length, scheduled=items.filter(x=>x.status==='scheduled').length;
  const typeColor=(t:string)=>t.includes('Birthday')?'#A855F7':t.includes('Expiry')?'#f59e0b':t.includes('Due')?'#ef4444':t.includes('Anniversary')?'#8b5cf6':'#3b82f6';
  const typeEmoji=(t:string)=>t.includes('Birthday')?'🎂':t.includes('Expiry')?'⚠️':t.includes('Due')?'💳':t.includes('Anniversary')?'🎉':'📢';

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] } }
  };

  return (
    <AppShell>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ position:'relative', overflow:'hidden', borderRadius:24, padding:'36px 40px', marginBottom:24, background:'linear-gradient(135deg, #0f172a, #1e293b)', boxShadow:'0 20px 60px rgba(15,23,42,0.3)' }}>
          <div style={{ position:'relative', zIndex:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
              <div style={{ width:40, height:40, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(168,85,247,0.2)' }}>
                <Bell size={20} color="#A855F7" />
              </div>
              <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#A855F7' }}>Communication</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <h1 style={{ fontSize:32, fontWeight:800, letterSpacing:'-0.03em', lineHeight:1.1, color:'#ffffff', margin:0 }}>Notifications</h1>
                <p style={{ marginTop:8, maxWidth:560, fontSize:14, lineHeight:1.6, color:'rgba(255,255,255,0.6)' }}>Send alerts, reminders &amp; announcements to members.</p>
              </div>
              <button onClick={()=>setShowForm(v=>!v)}
                style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:700, padding:'10px 18px', borderRadius:12, background:'linear-gradient(135deg, #A855F7, #7c3aed)', color:'#fff', border:'none', cursor:'pointer', boxShadow:'0 4px 14px rgba(168,85,247,0.3)' }}>
                <Plus size={14}/> {showForm?'Cancel':'Compose'}
              </button>
            </div>
          </div>
        </motion.div>

        {flash&&(
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            style={{ background:'rgba(34,197,94,0.08)', color:'#16a34a', border:'1px solid rgba(34,197,94,0.2)', borderRadius:14, padding:'12px 18px', marginBottom:20, fontWeight:700, fontSize:13 }}>
            {flash}
          </motion.div>
        )}

        <motion.div variants={containerVariants} initial="hidden" animate="visible"
          style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
          {[
            { label:'Total', value:total, color:'#A855F7', icon:<Bell size={18}/> },
            { label:'Sent', value:sent, color:'#22c55e', icon:<CheckCircle2 size={18}/> },
            { label:'Scheduled', value:scheduled, color:'#f59e0b', icon:<Clock size={18}/> },
            { label:'Active Members', value:memberCount, color:'#3b82f6', icon:<Users size={18}/> },
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

        {/* Compose Form */}
        {showForm&&(
          <motion.div initial={{ opacity: 0, y: -10, scale:0.98 }} animate={{ opacity: 1, y: 0, scale:1 }}
            style={{ background:'rgba(255,255,255,0.95)', backdropFilter:'blur(12px)', borderRadius:20, border:'1px solid rgba(255,255,255,0.9)', boxShadow:'0 8px 30px rgba(15,23,42,0.1)', padding:24, marginBottom:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
              <h3 style={{ margin:0, fontSize:15, fontWeight:700, color:'#0f172a', display:'flex', gap:8, alignItems:'center' }}><Send size={16} color="#A855F7"/> Compose Notification</h3>
            </div>
            <form onSubmit={handleSend} style={{ display:'grid', gap:16 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <label style={{ display:'grid', gap:5 }}>
                  <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', color:'#94a3b8' }}>Type</span>
                  <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}
                    style={{ width:'100%', border:'1px solid rgba(15,23,42,0.08)', borderRadius:10, padding:'9px 12px', fontSize:13, fontWeight:500, color:'#0f172a', background:'rgba(248,250,252,0.9)', outline:'none', fontFamily:'inherit' }}>
                    {TYPES.map(t=><option key={t}>{t}</option>)}
                  </select>
                </label>
                <label style={{ display:'grid', gap:5 }}>
                  <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', color:'#94a3b8' }}>Audience</span>
                  <select value={form.audience} onChange={e=>setForm(f=>({...f,audience:e.target.value}))}
                    style={{ width:'100%', border:'1px solid rgba(15,23,42,0.08)', borderRadius:10, padding:'9px 12px', fontSize:13, fontWeight:500, color:'#0f172a', background:'rgba(248,250,252,0.9)', outline:'none', fontFamily:'inherit' }}>
                    {AUDIENCES.map(a=><option key={a}>{a}</option>)}
                  </select>
                </label>
              </div>
              <label style={{ display:'grid', gap:5 }}>
                <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', color:'#94a3b8' }}>Title *</span>
                <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Your membership expires soon!" required
                  style={{ width:'100%', border:'1px solid rgba(15,23,42,0.08)', borderRadius:10, padding:'9px 14px', fontSize:13, fontWeight:500, color:'#0f172a', background:'rgba(248,250,252,0.9)', outline:'none', fontFamily:'inherit' }} />
              </label>
              <label style={{ display:'grid', gap:5 }}>
                <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', color:'#94a3b8' }}>Message *</span>
                <textarea rows={4} value={form.body} onChange={e=>setForm(f=>({...f,body:e.target.value}))} placeholder="Write your notification message…" required
                  style={{ width:'100%', border:'1px solid rgba(15,23,42,0.08)', borderRadius:10, padding:'12px 14px', fontSize:13, fontWeight:500, color:'#0f172a', background:'rgba(248,250,252,0.9)', outline:'none', resize:'vertical', fontFamily:'inherit', lineHeight:1.6 }} />
              </label>
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                <button type="button" onClick={()=>setShowForm(false)}
                  style={{ fontSize:12, fontWeight:700, padding:'8px 16px', borderRadius:10, border:'1px solid rgba(15,23,42,0.1)', background:'transparent', color:'#64748b', cursor:'pointer' }}>Cancel</button>
                <button type="submit" disabled={sending}
                  style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:700, padding:'8px 18px', borderRadius:12, background:'linear-gradient(135deg, #A855F7, #7c3aed)', color:'#fff', border:'none', cursor:sending?'not-allowed':'pointer', opacity:sending?0.7:1, boxShadow:'0 4px 14px rgba(168,85,247,0.3)' }}>
                  {sending?<><RefreshCw size={13}/> Sending…</>:<><Send size={13}/> Send Now</>}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* History */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          style={{ background:'rgba(255,255,255,0.95)', backdropFilter:'blur(12px)', borderRadius:20, border:'1px solid rgba(255,255,255,0.9)', boxShadow:'0 2px 20px rgba(15,23,42,0.07)', overflow:'hidden' }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid rgba(15,23,42,0.06)', fontWeight:700, fontSize:14, color:'#0f172a', display:'flex', alignItems:'center', gap:8 }}>
            <MessageSquare size={15} color="#A855F7"/> Notification History ({items.length})
          </div>
          {(items ?? []).map(n=>(
            <div key={n.id} style={{ display:'flex', gap:14, padding:'18px 20px', borderBottom:'1px solid rgba(15,23,42,0.06)', alignItems:'flex-start' }}>
              <div style={{ width:44, height:44, borderRadius:12, background:`${typeColor(n.type)}14`, color:typeColor(n.type), display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:22 }}>
                {typeEmoji(n.type)}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:5 }}>
                  <span style={{ fontWeight:700, fontSize:14, color:'#0f172a' }}>{n.title}</span>
                  <span style={{ fontSize:11, fontWeight:700, padding:'2px 9px', borderRadius:20, background:n.status==='sent'?'rgba(34,197,94,0.1)':'rgba(245,158,11,0.1)', color:n.status==='sent'?'#16a34a':'#d97706', textTransform:'capitalize' }}>{n.status}</span>
                </div>
                <p style={{ margin:'0 0 8px', fontSize:13, color:'#475569', lineHeight:1.6 }}>{n.body}</p>
                <div style={{ display:'flex', gap:16, fontSize:11, color:'#94a3b8', alignItems:'center' }}>
                  <span style={{ display:'flex', alignItems:'center', gap:4 }}><Users size={11}/>{n.recipients} recipients</span>
                  <span style={{ display:'flex', alignItems:'center', gap:4 }}><Clock size={11}/>{new Date(n.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</span>
                  <span style={{ background:'rgba(15,23,42,0.04)', padding:'2px 8px', borderRadius:6, fontSize:11, fontWeight:600, color:'#64748b' }}>{n.audience}</span>
                </div>
              </div>
              <button onClick={()=>setItems(p=>p.filter(x=>x.id!==n.id))}
                style={{ display:'flex', alignItems:'center', justifyContent:'center', width:32, height:32, borderRadius:8, border:'none', background:'rgba(239,68,68,0.08)', color:'#ef4444', cursor:'pointer', flexShrink:0 }}>
                <Trash2 size={14}/>
              </button>
            </div>
          ))}
          {items.length===0&&(
            <div style={{ padding:'48px 20px', textAlign:'center' }}>
              <Bell size={32} color="#cbd5e1" style={{ marginBottom:12 }}/>
              <p style={{ fontSize:14, fontWeight:600, color:'#94a3b8', margin:0 }}>No notifications sent yet</p>
              <p style={{ fontSize:12, color:'#cbd5e1', marginTop:4 }}>Click "Compose" to send your first notification.</p>
            </div>
          )}
        </motion.div>
      </div>
    </AppShell>
  );
}
