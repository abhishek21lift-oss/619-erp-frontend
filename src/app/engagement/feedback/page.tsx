'use client';
import { useState, useEffect } from 'react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Star, MessageSquare, TrendingUp, ThumbsUp, ThumbsDown, Clock, CheckCircle2, AlertCircle, User, Filter } from 'lucide-react';
import { api } from '@/lib/api';

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
  const nps = Math.round(((positive-items.filter(f=>f.sentiment==='negative').length)/items.length)*100);

  function stars(n:number){ return Array.from({length:5},(_,i)=>i<n?'★':'☆').join(''); }
  function statusColor(s:string){ return s==='resolved'?'var(--success)':s==='in_progress'?'var(--warning)':'var(--danger)'; }
  function sentimentIcon(s:string){ return s==='positive'?<ThumbsUp size={12} color="var(--success)"/>:s==='negative'?<ThumbsDown size={12} color="var(--danger)"/>:<span style={{fontSize:12}}>😐</span>; }

  function handleResolve(id:string){ setItems(p=>p.map(f=>f.id===id?{...f,status:'resolved'}:f)); setShowReply(null); setReply(''); }

  return (
    <AppShell>
      <div className="page-container animate-fade-in">
        <div className="page-header">
          <div><h1 className="page-title">Member Feedback</h1><p className="page-subtitle">Track, respond &amp; act on member reviews and complaints</p></div>
        </div>
        {/* KPIs */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:20}}>
          {[{l:'Avg Rating',v:avgRating+'⭐',c:'var(--warning)'},{l:'Total',v:items.length,c:'var(--brand)'},{l:'Positive',v:positive,c:'var(--success)'},{l:'Open',v:open,c:'var(--danger)'},{l:'NPS Score',v:nps+'%',c:'var(--accent)'}].map(k=>(
            <div key={k.l} className="kpi-card" style={{borderTop:`3px solid ${k.c}`}}>
              <div className="kpi-value" style={{color:k.c}}>{k.v}</div><div className="kpi-label">{k.l}</div>
            </div>
          ))}
        </div>
        {/* Filters */}
        <div style={{display:'flex',gap:12,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {CATS.map(c=><button key={c} className={`tab-btn ${cat===c?'active':''}`} onClick={()=>setCat(c)} style={{fontSize:12,padding:'4px 12px'}}>{c}</button>)}
          </div>
          <select className="input" style={{maxWidth:160,fontSize:12}} value={statusF} onChange={e=>setStatusF(e.target.value as any)}>
            <option value="all">All Status</option><option value="open">Open</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option>
          </select>
        </div>
        {/* Feedback list */}
        <div style={{display:'grid',gap:12}}>
          {filtered.map(f=>(
            <div key={f.id} className="card" style={{padding:0,overflow:'hidden'}}>
              <div style={{padding:'16px 20px'}}>
                <div style={{display:'flex',gap:14,alignItems:'flex-start'}}>
                  <div style={{width:42,height:42,borderRadius:'50%',background:'var(--brand-soft)',color:'var(--brand)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:14,flexShrink:0}}><User size={18}/></div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
                      <span style={{fontWeight:700,fontSize:14,color:'var(--text-primary)'}}>{f.member}</span>
                      {f.trainer&&<span style={{fontSize:12,color:'var(--text-muted)'}}>→ {f.trainer}</span>}
                      <span style={{color:'var(--warning)',fontSize:16,letterSpacing:'-1px'}}>{stars(f.rating)}</span>
                      <span style={{fontSize:12,fontWeight:600,color:'var(--warning)'}}>{f.rating}/5</span>
                      <span className="badge badge-neutral">{f.category}</span>
                      <span style={{fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:20,background:`${statusColor(f.status)}18`,color:statusColor(f.status),textTransform:'capitalize'}}>{f.status.replace('_',' ')}</span>
                      {sentimentIcon(f.sentiment)}
                    </div>
                    <p style={{margin:'0 0 8px',fontSize:13,color:'var(--text-secondary)',lineHeight:1.6}}>"{f.message}"</p>
                    <div style={{display:'flex',gap:12,alignItems:'center'}}>
                      <span style={{fontSize:11,color:'var(--text-muted)'}}><Clock size={9} style={{marginRight:3}}/>{f.date}</span>
                      {f.status!=='resolved'&&(
                        <>
                          <button className="btn btn-ghost btn-sm" style={{fontSize:12}} onClick={()=>setShowReply(showReply===f.id?null:f.id)}>
                            <MessageSquare size={12}/> Reply
                          </button>
                          <button className="btn btn-outline btn-sm" style={{fontSize:12,color:'var(--success)',borderColor:'var(--success)'}} onClick={()=>handleResolve(f.id)}>
                            <CheckCircle2 size={12}/> Mark Resolved
                          </button>
                        </>
                      )}
                    </div>
                    {showReply===f.id&&(
                      <div style={{marginTop:12,display:'flex',gap:8}}>
                        <input className="input" style={{flex:1,fontSize:13}} value={reply} onChange={e=>setReply(e.target.value)} placeholder="Type your reply to the member…"/>
                        <button className="btn btn-primary btn-sm" onClick={()=>handleResolve(f.id)}>Send &amp; Resolve</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filtered.length===0&&(
            <div className="empty-state"><Star size={28} className="empty-state-icon"/><p className="empty-state-title">No feedback found</p></div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
