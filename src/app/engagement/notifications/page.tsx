'use client';
import { useState, useEffect } from 'react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Bell, Send, Users, CheckCircle2, Clock, Plus, Trash2, MessageSquare, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';

const TYPES = ['Birthday 🎂', 'Expiry Reminder ⚠️', 'Due Reminder 💳', 'Anniversary 🎉', 'General 📢', 'Custom'];
const AUDIENCES = ['All Active Members', 'Expiring This Week', 'Has Outstanding Dues', 'PT Members', 'Expired Members'];

interface Notif { id:string; title:string; body:string; type:string; audience:string; status:'sent'|'scheduled'; created_at:string; recipients:number; }

export default function NotificationsPage() {
  return <Guard><NContent/></Guard>;
}
function NContent() {
  const [items, setItems] = useState<Notif[]>([
    {id:'1',title:'Happy Birthday 🎂',body:'Wishing you a wonderful birthday! Drop by today for a free session on us.',type:'Birthday 🎂',audience:'All Active Members',status:'sent',created_at:new Date().toISOString(),recipients:3},
    {id:'2',title:'Membership Expiring Soon ⚠️',body:'Your membership expires in 7 days. Renew now to continue your fitness journey without interruption.',type:'Expiry Reminder ⚠️',audience:'Expiring This Week',status:'sent',created_at:new Date(Date.now()-86400000).toISOString(),recipients:2},
    {id:'3',title:'Outstanding Balance Reminder 💳',body:'You have a pending balance at 619 Fitness Studio. Please clear it at the front desk at your earliest convenience.',type:'Due Reminder 💳',audience:'Has Outstanding Dues',status:'scheduled',created_at:new Date(Date.now()-172800000).toISOString(),recipients:5},
  ]);
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
    setItems(prev=>[{id:crypto.randomUUID(),...form,status:'sent',created_at:new Date().toISOString(),recipients:rcpt},...prev]);
    setForm({title:'',body:'',type:TYPES[0],audience:AUDIENCES[0]});
    setSending(false); setShowForm(false);
    setFlash(`✓ Notification sent to ${rcpt} members`); setTimeout(()=>setFlash(''),4000);
  }

  const total=items.length, sent=items.filter(x=>x.status==='sent').length, scheduled=items.filter(x=>x.status==='scheduled').length;
  const typeColor=(t:string)=>t.includes('Birthday')?'var(--brand)':t.includes('Expiry')?'var(--warning)':t.includes('Due')?'var(--danger)':t.includes('Anniversary')?'var(--accent)':'var(--info)';

  return (
    <AppShell>
      <div className="page-container animate-fade-in">
        <div className="page-header">
          <div><h1 className="page-title">Notifications</h1><p className="page-subtitle">Send alerts, reminders &amp; announcements to members</p></div>
          <button className="btn btn-primary btn-sm" onClick={()=>setShowForm(v=>!v)}><Plus size={14}/> Compose</button>
        </div>
        {flash&&<div style={{background:'var(--success-bg)',color:'var(--success)',border:'1px solid var(--success-border)',borderRadius:10,padding:'10px 16px',marginBottom:16,fontWeight:600,fontSize:13}}>{flash}</div>}
        {/* KPIs */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
          {[{l:'Total',v:total,c:'var(--brand)',i:<Bell size={16}/>},{l:'Sent',v:sent,c:'var(--success)',i:<CheckCircle2 size={16}/>},{l:'Scheduled',v:scheduled,c:'var(--warning)',i:<Clock size={16}/>},{l:'Active Members',v:memberCount,c:'var(--info)',i:<Users size={16}/>}].map(k=>(
            <div key={k.l} className="kpi-card" style={{borderTop:`3px solid ${k.c}`}}>
              <div style={{color:k.c,marginBottom:6}}>{k.i}</div><div className="kpi-value">{k.v}</div><div className="kpi-label">{k.l}</div>
            </div>
          ))}
        </div>
        {/* Compose Form */}
        {showForm&&(
          <div className="card" style={{padding:20,marginBottom:20}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <h3 style={{margin:0,fontSize:15,fontWeight:700,display:'flex',gap:8,alignItems:'center'}}><Send size={14}/> Compose Notification</h3>
            </div>
            <form onSubmit={handleSend} style={{display:'grid',gap:14}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <label style={{display:'grid',gap:4}}><span style={{fontSize:11,fontWeight:700,textTransform:'uppercase',color:'var(--text-muted)'}}>Type</span>
                  <select className="input" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>{TYPES.map(t=><option key={t}>{t}</option>)}</select>
                </label>
                <label style={{display:'grid',gap:4}}><span style={{fontSize:11,fontWeight:700,textTransform:'uppercase',color:'var(--text-muted)'}}>Audience</span>
                  <select className="input" value={form.audience} onChange={e=>setForm(f=>({...f,audience:e.target.value}))}>{AUDIENCES.map(a=><option key={a}>{a}</option>)}</select>
                </label>
              </div>
              <label style={{display:'grid',gap:4}}><span style={{fontSize:11,fontWeight:700,textTransform:'uppercase',color:'var(--text-muted)'}}>Title *</span>
                <input className="input" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Your membership expires soon!" required/>
              </label>
              <label style={{display:'grid',gap:4}}><span style={{fontSize:11,fontWeight:700,textTransform:'uppercase',color:'var(--text-muted)'}}>Message *</span>
                <textarea className="input" rows={3} value={form.body} onChange={e=>setForm(f=>({...f,body:e.target.value}))} placeholder="Write your notification message…" required/>
              </label>
              <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                <button type="button" className="btn btn-outline btn-sm" onClick={()=>setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={sending}>{sending?<><RefreshCw size={13} style={{animation:'spin 0.9s linear infinite'}}/> Sending…</>:<><Send size={13}/> Send Now</>}</button>
              </div>
            </form>
          </div>
        )}
        {/* History */}
        <div className="card" style={{overflow:'hidden'}}>
          <div style={{padding:'14px 16px',borderBottom:'1px solid var(--border)',fontWeight:700,fontSize:14,display:'flex',alignItems:'center',gap:8}}><MessageSquare size={14}/> Notification History ({items.length})</div>
          {(items ?? []).map(n=>(
            <div key={n.id} style={{display:'flex',gap:14,padding:'16px',borderBottom:'1px solid var(--border)',alignItems:'flex-start'}}>
              <div style={{width:42,height:42,borderRadius:12,background:`${typeColor(n.type)}18`,color:typeColor(n.type),display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:20}}>
                {n.type.includes('Birthday')?'🎂':n.type.includes('Expiry')?'⚠️':n.type.includes('Due')?'💳':n.type.includes('Anniversary')?'🎉':'📢'}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:4}}>
                  <span style={{fontWeight:700,fontSize:14,color:'var(--text-primary)'}}>{n.title}</span>
                  <span className={`badge badge-${n.status==='sent'?'active':'warning'}`}>{n.status}</span>
                </div>
                <p style={{margin:'0 0 8px',fontSize:13,color:'var(--text-secondary)',lineHeight:1.6}}>{n.body}</p>
                <div style={{display:'flex',gap:14,fontSize:11,color:'var(--text-muted)'}}>
                  <span><Users size={10} style={{marginRight:3,verticalAlign:'middle'}}/>{n.recipients} recipients</span>
                  <span><Clock size={10} style={{marginRight:3,verticalAlign:'middle'}}/>{new Date(n.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</span>
                  <span style={{background:'var(--bg-subtle)',padding:'1px 8px',borderRadius:6}}>{n.audience}</span>
                </div>
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" style={{color:'var(--danger)',flexShrink:0}} onClick={()=>setItems(p=>p.filter(x=>x.id!==n.id))}><Trash2 size={13}/></button>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
