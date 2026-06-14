'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Bell, Send, Users, CheckCircle2, Clock, Plus, Trash2, MessageSquare, RefreshCw, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';

const TYPES = ['Birthday 🎂', 'Expiry Reminder ⚠️', 'Due Reminder 💳', 'Anniversary 🎉', 'General 📢', 'Custom'];
const AUDIENCES = ['All Active Members', 'Expiring This Week', 'Has Outstanding Dues', 'PT Members', 'Expired Members'];

interface Notif { id:string; title:string; body:string; type:string; audience:string; status:'sent'|'scheduled'; created_at:string; recipients:number; }

const KPIS = [
  { label:'Total', key:'total', color:'#8b5cf6', icon:<Bell size={18}/>, bg:'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(109,40,217,0.06))' },
  { label:'Sent', key:'sent', color:'#22c55e', icon:<CheckCircle2 size={18}/>, bg:'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(22,163,74,0.06))' },
  { label:'Scheduled', key:'scheduled', color:'#f59e0b', icon:<Clock size={18}/>, bg:'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(217,119,6,0.06))' },
  { label:'Active Members', key:'members', color:'#a855f7', icon:<Users size={18}/>, bg:'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(88,28,135,0.06))' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] } }
};

export default function NotificationsPage() {
  return <Guard role="admin"><NContent/></Guard>;
}
function NContent() {
  const toast = useToast();
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({title:'',body:'',type:TYPES[0],audience:AUDIENCES[0]});
  const [memberCount, setMemberCount] = useState(0);
  const [sending, setSending] = useState(false);

  async function load() {
    setLoading(true); setError(null);
    try {
      const [historyRes, membersRes] = await Promise.all([
        api.communication.history(),
        api.clients.list({status:'active'}).catch(() => []),
      ]);
      const history = (Array.isArray(historyRes) ? historyRes : []) as Notif[];
      setItems(history);
      setMemberCount(Array.isArray(membersRes) ? membersRes.length : 0);
    } catch (err: any) {
      setError(err?.message || 'Failed to load history');
    } finally { setLoading(false); }
  }

  async function handleSend(e:React.FormEvent){
    e.preventDefault(); if(!form.title||!form.body) return;
    setSending(true);
    try {
      const res = await api.communication.send(form as any) as { recipients: number };
      const rcpt = res?.recipients ?? 0;
      await load();
      setForm({title:'',body:'',type:TYPES[0],audience:AUDIENCES[0]});
      setShowForm(false);
      toast.success(`Notification sent to ${rcpt} members`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send notification');
    } finally { setSending(false); }
  }

  async function handleDelete(id: string) {
    try {
      await api.communication.delete(id);
      setItems(p => p.filter(x => x.id !== id));
      toast.success('Notification deleted');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete notification');
    }
  }

  useEffect(() => { load(); }, []);

  const total=items.length, sent=items.filter(x=>x.status==='sent').length, scheduled=items.filter(x=>x.status==='scheduled').length;
  const typeColor=(t:string)=>t.includes('Birthday')?'#a855f7':t.includes('Expiry')?'#f59e0b':t.includes('Due')?'#ef4444':t.includes('Anniversary')?'#8b5cf6':'#6d28d9';
  const typeEmoji=(t:string)=>t.includes('Birthday')?'🎂':t.includes('Expiry')?'⚠️':t.includes('Due')?'💳':t.includes('Anniversary')?'🎉':'📢';

  return (
    <AppShell>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ position:'relative', overflow:'hidden', borderRadius:24, padding:'40px 44px', marginBottom:28, background:'linear-gradient(135deg, #1a0a2e, #2d1b69, #1a0a2e)', boxShadow:'0 20px 60px rgba(26,10,46,0.5)' }}>
          <div style={{ position:'absolute', inset:0, background:'radial-gradient(600px circle at 60% 30%, rgba(139,92,246,0.15), transparent 70%)' }}/>
          <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(rgba(139,92,246,0.08) 1px, transparent 1px)', backgroundSize:'24px 24px' }}/>
          <div style={{ position:'absolute', top:-40, left:20, width:180, height:180, borderRadius:'50%', background:'radial-gradient(circle, rgba(168,85,247,0.08), transparent)' }}/>
          <div style={{ position:'relative', zIndex:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
              <div style={{ width:44, height:44, borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(109,40,217,0.1))', backdropFilter:'blur(8px)' }}>
                <Bell size={22} color="#a855f7" />
              </div>
              <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', background:'linear-gradient(135deg, #a855f7, #8b5cf6)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Communication</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <h1 style={{ fontSize:34, fontWeight:800, letterSpacing:'-0.03em', lineHeight:1.1, color:'#ffffff', margin:'0 0 8px' }}>Notifications</h1>
                <p style={{ maxWidth:560, fontSize:14, lineHeight:1.6, color:'rgba(255,255,255,0.55)' }}>Send alerts, reminders &amp; announcements to members.</p>
              </div>
              <button onClick={()=>setShowForm(v=>!v)}
                style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:700, padding:'10px 20px', borderRadius:12, background:'linear-gradient(135deg, #8b5cf6, #6d28d9)', color:'#fff', border:'none', cursor:'pointer', boxShadow:'0 4px 16px rgba(139,92,246,0.35)' }}>
                <Plus size={14}/> {showForm?'Cancel':'Compose'}
              </button>
            </div>
          </div>
        </motion.div>

        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            style={{ borderRadius:14, padding:'14px 20px', marginBottom:22, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', color:'#fca5a5', fontWeight:600, fontSize:13 }}>
            {error}
          </motion.div>
        )}

        <motion.div variants={containerVariants} initial="hidden" animate="visible"
          style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:28 }}>
          {KPIS.map((k,i)=>{
            const vals = [total, sent, scheduled, memberCount];
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
                <div style={{ fontSize:30, fontWeight:800, color:'#ffffff', lineHeight:1.2, letterSpacing:'-0.02em' }}>{loading ? '—' : vals[i]}</div>
              </motion.div>
            );
          })}
        </motion.div>

        {showForm&&(
          <motion.div initial={{ opacity: 0, y: -10, scale:0.98 }} animate={{ opacity: 1, y: 0, scale:1 }}
            style={{ borderRadius:20, background:'rgba(255,255,255,0.06)', backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.1)', boxShadow:'0 8px 32px rgba(0,0,0,0.12)', padding:24, marginBottom:22 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h3 style={{ margin:0, fontSize:15, fontWeight:700, color:'rgba(255,255,255,0.9)', display:'flex', gap:8, alignItems:'center' }}><Send size={16} color="#a855f7"/> Compose Notification</h3>
            </div>
            <form onSubmit={handleSend} style={{ display:'grid', gap:16 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <label style={{ display:'grid', gap:5 }}>
                  <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', color:'rgba(255,255,255,0.4)' }}>Type</span>
                  <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}
                    style={{ width:'100%', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'9px 12px', fontSize:13, fontWeight:500, color:'rgba(255,255,255,0.85)', background:'rgba(255,255,255,0.04)', outline:'none', fontFamily:'inherit' }}>
                    {TYPES.map(t=><option key={t}>{t}</option>)}
                  </select>
                </label>
                <label style={{ display:'grid', gap:5 }}>
                  <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', color:'rgba(255,255,255,0.4)' }}>Audience</span>
                  <select value={form.audience} onChange={e=>setForm(f=>({...f,audience:e.target.value}))}
                    style={{ width:'100%', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'9px 12px', fontSize:13, fontWeight:500, color:'rgba(255,255,255,0.85)', background:'rgba(255,255,255,0.04)', outline:'none', fontFamily:'inherit' }}>
                    {AUDIENCES.map(a=><option key={a}>{a}</option>)}
                  </select>
                </label>
              </div>
              <label style={{ display:'grid', gap:5 }}>
                <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', color:'rgba(255,255,255,0.4)' }}>Title *</span>
                <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Your membership expires soon!" required
                  style={{ width:'100%', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'9px 14px', fontSize:13, fontWeight:500, color:'rgba(255,255,255,0.85)', background:'rgba(255,255,255,0.04)', outline:'none', fontFamily:'inherit' }} />
              </label>
              <label style={{ display:'grid', gap:5 }}>
                <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', color:'rgba(255,255,255,0.4)' }}>Message *</span>
                <textarea rows={4} value={form.body} onChange={e=>setForm(f=>({...f,body:e.target.value}))} placeholder="Write your notification message…" required
                  style={{ width:'100%', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'12px 14px', fontSize:13, fontWeight:500, color:'rgba(255,255,255,0.85)', background:'rgba(255,255,255,0.04)', outline:'none', resize:'vertical', fontFamily:'inherit', lineHeight:1.6 }} />
              </label>
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                <button type="button" onClick={()=>setShowForm(false)}
                  style={{ fontSize:12, fontWeight:700, padding:'8px 18px', borderRadius:10, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:'rgba(255,255,255,0.5)', cursor:'pointer' }}>Cancel</button>
                <button type="submit" disabled={sending}
                  style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:700, padding:'8px 20px', borderRadius:12, background:'linear-gradient(135deg, #8b5cf6, #6d28d9)', color:'#fff', border:'none', cursor:sending?'not-allowed':'pointer', opacity:sending?0.7:1, boxShadow:'0 4px 16px rgba(139,92,246,0.35)' }}>
                  {sending?<><RefreshCw size={13}/> Sending…</>:<><Send size={13}/> Send Now</>}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          style={{ borderRadius:20, background:'rgba(255,255,255,0.06)', backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.1)', boxShadow:'0 8px 32px rgba(0,0,0,0.12)', overflow:'hidden' }}>
          <div style={{ padding:'16px 22px', borderBottom:'1px solid rgba(255,255,255,0.06)', fontWeight:700, fontSize:14, color:'rgba(255,255,255,0.9)', display:'flex', alignItems:'center', gap:8, background:'linear-gradient(90deg, rgba(139,92,246,0.08), rgba(109,40,217,0.04))' }}>
            <MessageSquare size={15} color="#a855f7"/> Notification History ({items.length})
          </div>
          {loading ? (
            <div style={{ padding:'56px 20px', textAlign:'center' }}><Loader2 size={28} color="rgba(255,255,255,0.2)" style={{ animation:'spin 1s linear infinite' }} /></div>
          ) : items.length === 0 ? (
            <div style={{ padding:'56px 20px', textAlign:'center' }}>
              <Bell size={36} color="rgba(255,255,255,0.12)" style={{ marginBottom:14 }}/>
              <p style={{ fontSize:15, fontWeight:700, color:'rgba(255,255,255,0.35)', margin:0 }}>No notifications sent yet</p>
              <p style={{ fontSize:12, color:'rgba(255,255,255,0.2)', marginTop:4 }}>Click "Compose" to send your first notification.</p>
            </div>
          ) : (
            items.map(n=>(
              <div key={n.id} style={{ display:'flex', gap:14, padding:'18px 22px', borderBottom:'1px solid rgba(255,255,255,0.04)', alignItems:'flex-start' }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.03)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <div style={{ width:44, height:44, borderRadius:12, background:`${typeColor(n.type)}20`, color:typeColor(n.type), display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:22, backdropFilter:'blur(4px)' }}>
                  {typeEmoji(n.type)}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:5 }}>
                    <span style={{ fontWeight:700, fontSize:14, color:'rgba(255,255,255,0.9)' }}>{n.title}</span>
                    <span style={{ fontSize:11, fontWeight:700, padding:'2px 10px', borderRadius:20, background:n.status==='sent'?'rgba(34,197,94,0.15)':'rgba(245,158,11,0.15)', color:n.status==='sent'?'#4ade80':'#fbbf24', textTransform:'capitalize' }}>{n.status}</span>
                  </div>
                  <p style={{ margin:'0 0 8px', fontSize:13, color:'rgba(255,255,255,0.5)', lineHeight:1.6 }}>{n.body}</p>
                  <div style={{ display:'flex', gap:16, fontSize:11, color:'rgba(255,255,255,0.35)', alignItems:'center' }}>
                    <span style={{ display:'flex', alignItems:'center', gap:4 }}><Users size={11}/>{n.recipients} recipients</span>
                    <span style={{ display:'flex', alignItems:'center', gap:4 }}><Clock size={11}/>{n.created_at ? new Date(n.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'}</span>
                    <span style={{ background:'rgba(255,255,255,0.05)', padding:'2px 8px', borderRadius:6, fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.45)' }}>{n.audience}</span>
                  </div>
                </div>
                <button onClick={()=>handleDelete(n.id)}
                  style={{ display:'flex', alignItems:'center', justifyContent:'center', width:32, height:32, borderRadius:8, border:'none', background:'rgba(239,68,68,0.12)', color:'#f87171', cursor:'pointer', flexShrink:0 }}>
                  <Trash2 size={14}/>
                </button>
              </div>
            ))
          )}
        </motion.div>
      </div>
    </AppShell>
  );
}
