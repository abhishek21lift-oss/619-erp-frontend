'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Star, MessageSquare, ThumbsUp, ThumbsDown, Clock, CheckCircle2, User } from 'lucide-react';

interface Feedback { id:string; member:string; trainer?:string; rating:number; category:string; message:string; status:'open'|'resolved'|'in_progress'; date:string; sentiment:'positive'|'neutral'|'negative'; }

const SAMPLE:Feedback[] = [
  {id:'1',member:'Shivam Chaudhari',trainer:'Abhishek Katiyar',rating:5,category:'Trainer',message:'Abhishek sir is amazing! Very knowledgeable and motivating. My form has improved a lot in just 2 months.',status:'resolved',date:'2026-05-10',sentiment:'positive'},
  {id:'2',member:'Ankush Thakur',rating:4,category:'Facility',message:'The gym is well-maintained. AC could be a bit cooler during peak hours. Overall very happy with 619.',status:'resolved',date:'2026-05-08',sentiment:'positive'},
  {id:'3',member:'Gaurav Sonkar',rating:2,category:'Equipment',message:'The treadmill near the window has been broken for 2 weeks. Please fix it soon.',status:'in_progress',date:'2026-05-06',sentiment:'negative'},
  {id:'4',member:'Prakhar Shivhare',rating:5,category:'Overall',message:'Best gym in Lucknow! The ambiance, equipment, and trainers are all top notch. Highly recommended.',status:'resolved',date:'2026-05-03',sentiment:'positive'},
  {id:'5',member:'Vikram Joshi',rating:3,category:'Timing',message:'The gym gets very crowded between 6-8pm. Wish there were more off-peak offers.',status:'open',date:'2026-05-01',sentiment:'neutral'},
];

const CATS = ['All','Trainer','Facility','Equipment','Overall','Timing','Billing','Other'];

export default function FeedbackPage() {
  return <Guard role="admin"><FeedbackContent/></Guard>;
}
function FeedbackContent() {
  const [items, setItems] = useState(SAMPLE);
  const [cat, setCat] = useState('All');
  const [statusF, setStatusF] = useState<'all'|'open'|'in_progress'|'resolved'>('all');
  const [showReply, setShowReply] = useState<string|null>(null);
  const [reply, setReply] = useState('');

  const filtered = items.filter(f=>(cat==='All'||f.category===cat)&&(statusF==='all'||f.status===statusF));
  const avgRating = items.length ? (items.reduce((s,f)=>s+f.rating,0)/items.length).toFixed(1) : '0';
  const positive = items.filter(f=>f.sentiment==='positive').length;
  const open = items.filter(f=>f.status==='open').length;
  const nps = items.length ? Math.round(((positive-items.filter(f=>f.sentiment==='negative').length)/items.length)*100) : 0;

  function stars(n:number){ return Array.from({length:5},(_,i)=>i<n?'★':'☆').join(''); }
  function statusColor(s:string){ return s==='resolved'?'#22c55e':s==='in_progress'?'#f59e0b':'#ef4444'; }
  function sentimentIcon(s:string){ 
    return s==='positive'
      ? <ThumbsUp size={13} color="#22c55e"/>
      : s==='negative'
        ? <ThumbsDown size={13} color="#ef4444"/>
        : <span style={{fontSize:14,lineHeight:1}}>😐</span>;
  }

  function handleResolve(id:string){ setItems(p=>p.map(f=>f.id===id?{...f,status:'resolved' as const}:f)); setShowReply(null); setReply(''); }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
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
                <Star size={20} color="#A855F7" />
              </div>
              <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#A855F7' }}>Feedback</span>
            </div>
            <h1 style={{ fontSize:32, fontWeight:800, letterSpacing:'-0.03em', lineHeight:1.1, color:'#ffffff', margin:0 }}>Member Feedback</h1>
            <p style={{ marginTop:8, maxWidth:560, fontSize:14, lineHeight:1.6, color:'rgba(255,255,255,0.6)' }}>Track, respond &amp; act on member reviews and complaints.</p>
          </div>
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible"
          style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:24 }}>
          {[
            { label:'Avg Rating', value:avgRating, color:'#f59e0b', suffix:'⭐' },
            { label:'Total', value:items.length, color:'#A855F7', suffix:'' },
            { label:'Positive', value:positive, color:'#22c55e', suffix:'' },
            { label:'Open', value:open, color:'#ef4444', suffix:'' },
            { label:'NPS Score', value:nps, color:'#8b5cf6', suffix:'%' },
          ].map(k=>(
            <motion.div key={k.label} variants={itemVariants}
              style={{ background:'rgba(255,255,255,0.95)', backdropFilter:'blur(12px)', borderRadius:20, padding:'20px 24px', border:'1px solid rgba(255,255,255,0.9)', boxShadow:'0 2px 20px rgba(15,23,42,0.07)' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em', color:'#94a3b8' }}>{k.label}</span>
              </div>
              <div style={{ fontSize:28, fontWeight:800, color:k.color, lineHeight:1.2 }}>{k.value}{k.suffix}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Filters */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          style={{ display:'flex', gap:12, marginBottom:18, flexWrap:'wrap', alignItems:'center' }}>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {CATS.map(c=>(
              <button key={c} onClick={()=>setCat(c)}
                style={{ padding:'6px 14px', borderRadius:8, border:'none', fontSize:12, fontWeight:600, cursor:'pointer',
                  background:cat===c?'linear-gradient(135deg, #A855F7, #7c3aed)':'rgba(15,23,42,0.04)',
                  color:cat===c?'#fff':'#64748b',
                  boxShadow:cat===c?'0 4px 12px rgba(168,85,247,0.25)':'none' }}>{c}</button>
            ))}
          </div>
          <select value={statusF} onChange={e=>setStatusF(e.target.value as any)}
            style={{ maxWidth:160, width:'100%', border:'1px solid rgba(15,23,42,0.08)', borderRadius:10, padding:'7px 12px', fontSize:12, fontWeight:500, color:'#0f172a', background:'rgba(248,250,252,0.9)', outline:'none', fontFamily:'inherit' }}>
            <option value="all">All Status</option><option value="open">Open</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option>
          </select>
        </motion.div>

        {/* Feedback list */}
        <motion.div variants={containerVariants} initial="hidden" animate="visible" style={{ display:'grid', gap:12 }}>
          {filtered.map(f=>(
            <motion.div key={f.id} variants={itemVariants}
              style={{ background:'rgba(255,255,255,0.95)', backdropFilter:'blur(12px)', borderRadius:20, border:'1px solid rgba(255,255,255,0.9)', boxShadow:'0 2px 20px rgba(15,23,42,0.07)', overflow:'hidden' }}>
              <div style={{ padding:'18px 22px' }}>
                <div style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
                  <div style={{ width:44, height:44, borderRadius:'50%', background:'rgba(168,85,247,0.1)', color:'#A855F7', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:14, flexShrink:0 }}>
                    <User size={20}/>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5, flexWrap:'wrap' }}>
                      <span style={{ fontWeight:700, fontSize:14, color:'#0f172a' }}>{f.member}</span>
                      {f.trainer&&<span style={{ fontSize:12, color:'#94a3b8' }}>→ {f.trainer}</span>}
                      <span style={{ color:'#f59e0b', fontSize:16, letterSpacing:'-1px' }}>{stars(f.rating)}</span>
                      <span style={{ fontSize:12, fontWeight:700, color:'#f59e0b' }}>{f.rating}/5</span>
                      <span style={{ fontSize:11, fontWeight:600, padding:'2px 10px', borderRadius:20, background:'rgba(15,23,42,0.05)', color:'#64748b' }}>{f.category}</span>
                      <span style={{ fontSize:11, fontWeight:700, padding:'2px 10px', borderRadius:20, background:`${statusColor(f.status)}18`, color:statusColor(f.status), textTransform:'capitalize' }}>{f.status.replace('_',' ')}</span>
                      {sentimentIcon(f.sentiment)}
                    </div>
                    <p style={{ margin:'0 0 10px', fontSize:13, color:'#475569', lineHeight:1.6, fontStyle:'italic' }}>"{f.message}"</p>
                    <div style={{ display:'flex', gap:14, alignItems:'center', flexWrap:'wrap' }}>
                      <span style={{ fontSize:11, color:'#94a3b8', display:'flex', alignItems:'center', gap:3 }}><Clock size={11}/>{f.date}</span>
                      {f.status!=='resolved'&&(
                        <>
                          <button onClick={()=>setShowReply(showReply===f.id?null:f.id)}
                            style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, fontWeight:600, padding:'5px 12px', borderRadius:8, border:'1px solid rgba(15,23,42,0.1)', background:'transparent', color:'#64748b', cursor:'pointer' }}>
                            <MessageSquare size={12}/> Reply
                          </button>
                          <button onClick={()=>handleResolve(f.id)}
                            style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, fontWeight:600, padding:'5px 12px', borderRadius:8, border:'1px solid rgba(34,197,94,0.2)', background:'rgba(34,197,94,0.08)', color:'#16a34a', cursor:'pointer' }}>
                            <CheckCircle2 size={12}/> Mark Resolved
                          </button>
                        </>
                      )}
                    </div>
                    {showReply===f.id&&(
                      <div style={{ marginTop:14, display:'flex', gap:8 }}>
                        <input value={reply} onChange={e=>setReply(e.target.value)} placeholder="Type your reply to the member…"
                          style={{ flex:1, border:'1px solid rgba(15,23,42,0.08)', borderRadius:10, padding:'9px 14px', fontSize:13, fontWeight:500, color:'#0f172a', background:'rgba(248,250,252,0.9)', outline:'none', fontFamily:'inherit' }} />
                        <button onClick={()=>handleResolve(f.id)}
                          style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, fontWeight:700, padding:'8px 16px', borderRadius:10, background:'linear-gradient(135deg, #A855F7, #7c3aed)', color:'#fff', border:'none', cursor:'pointer', boxShadow:'0 4px 14px rgba(168,85,247,0.3)' }}>
                          Send &amp; Resolve
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          {filtered.length===0&&(
            <div style={{ padding:'60px 20px', textAlign:'center' }}>
              <Star size={36} color="#cbd5e1" style={{ marginBottom:12 }}/>
              <p style={{ fontSize:15, fontWeight:600, color:'#94a3b8', margin:0 }}>No feedback found</p>
              <p style={{ fontSize:12, color:'#cbd5e1', marginTop:4 }}>Try adjusting your filters.</p>
            </div>
          )}
        </motion.div>
      </div>
    </AppShell>
  );
}
