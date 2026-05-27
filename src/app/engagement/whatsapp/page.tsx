'use client';
import { useState, useEffect } from 'react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { MessageCircle, Send, Users, CheckCircle2, Phone, Clock, Plus, ExternalLink, Search, X } from 'lucide-react';
import { api } from '@/lib/api';

const TEMPLATES = [
  { id:'renewal', name:'Renewal Reminder', body:'Hi {name}! 👋 Your membership at 619 Fitness Studio expires on {date}. Renew today and keep your fitness streak going! Call us: 8756562188' },
  { id:'birthday', name:'Birthday Wish', body:'Happy Birthday {name}! 🎂🎉 The entire 619 Fitness Studio family wishes you a fantastic year ahead. Come in today for a special birthday session on us! 💪' },
  { id:'due', name:'Due Reminder', body:'Hi {name}, you have a pending balance of ₹{amount} at 619 Fitness Studio. Please clear it at your earliest convenience. Thank you! 🙏' },
  { id:'welcome', name:'New Member Welcome', body:'Welcome to 619 Fitness Studio, {name}! 🏋️ We are thrilled to have you. Your fitness journey starts today. Our team is here to help you reach your goals. See you at the gym! 💪' },
  { id:'custom', name:'Custom Message', body:'' },
];

export default function WhatsAppPage() {
  return <Guard><WAContent/></Guard>;
}
function WAContent() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [template, setTemplate] = useState(TEMPLATES[0]);
  const [customMsg, setCustomMsg] = useState('');
  const [sent, setSent] = useState(0);

  useEffect(()=>{
    api.clients.list({status:'active'}).then((d:any)=>{setMembers(Array.isArray(d)?d:[]); setLoading(false);}).catch(()=>setLoading(false));
  },[]);

  const filtered = search.trim() ? members.filter(m=>(m.name||'').toLowerCase().includes(search.toLowerCase())||(m.mobile||'').includes(search)) : members;
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

  return (
    <AppShell>
      <div className="page-container animate-fade-in">
        <div className="page-header">
          <div><h1 className="page-title">WhatsApp</h1><p className="page-subtitle">Send personalised WhatsApp messages to members</p></div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            {sent>0&&<span className="badge badge-active">✓ {sent} sent today</span>}
            {selected.length>0&&<button className="btn btn-primary btn-sm" onClick={sendBulk}><Send size={13}/> Send to {selected.length} selected</button>}
          </div>
        </div>
        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20}}>
          {[{l:'Active Members',v:members.length,c:'var(--success)',i:<Users size={16}/>},{l:'Selected',v:selected.length,c:'var(--brand)',i:<CheckCircle2 size={16}/>},{l:'Sent Today',v:sent,c:'var(--info)',i:<MessageCircle size={16}/>}].map(k=>(
            <div key={k.l} className="kpi-card" style={{borderTop:`3px solid ${k.c}`}}>
              <div style={{color:k.c,marginBottom:6}}>{k.i}</div><div className="kpi-value">{k.v}</div><div className="kpi-label">{k.l}</div>
            </div>
          ))}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 380px',gap:20}}>
          {/* Member list */}
          <div className="card" style={{overflow:'hidden'}}>
            <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',display:'flex',gap:10,alignItems:'center'}}>
              <div className="search-bar" style={{flex:1}}>
                <Search size={13}/><input placeholder="Search members…" value={search} onChange={e=>setSearch(e.target.value)}/>
                {search&&<button onClick={()=>setSearch('')} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)'}}><X size={12}/></button>}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={selectAll}>All</button>
              <button className="btn btn-ghost btn-sm" onClick={clearAll}>None</button>
            </div>
            <div style={{maxHeight:480,overflowY:'auto'}}>
              {loading?<div style={{padding:32,textAlign:'center',color:'var(--text-muted)'}}>Loading members…</div>:
              filtered.map(m=>(
                <div key={m.id} onClick={()=>toggleSelect(m.id)} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 16px',borderBottom:'1px solid var(--border)',cursor:'pointer',background:selected.includes(m.id)?'var(--brand-soft)':'transparent',transition:'background 150ms'}}>
                  <input type="checkbox" checked={selected.includes(m.id)} onChange={()=>toggleSelect(m.id)} onClick={e=>e.stopPropagation()}/>
                  <div style={{width:34,height:34,borderRadius:'50%',background:'var(--brand-soft)',color:'var(--brand)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:12,flexShrink:0}}>
                    {m.photo_url?<img src={m.photo_url} alt={m.name} style={{width:34,height:34,borderRadius:'50%',objectFit:'cover'}}/>:(m.name||'?').slice(0,2).toUpperCase()}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:600,fontSize:13,color:'var(--text-primary)'}}>{m.name}</div>
                    <div style={{fontSize:11,color:'var(--text-muted)',display:'flex',gap:8}}>
                      <span><Phone size={9} style={{marginRight:2}}/>{m.mobile||'—'}</span>
                      {m.pt_end_date&&<span><Clock size={9} style={{marginRight:2}}/>Exp: {m.pt_end_date}</span>}
                    </div>
                  </div>
                  <button className="btn btn-outline btn-sm" style={{flexShrink:0,fontSize:11,padding:'3px 10px'}} onClick={e=>{e.stopPropagation();openWhatsApp(m);}} disabled={!m.mobile}>
                    <MessageCircle size={11}/> Send
                  </button>
                </div>
              ))}
            </div>
          </div>
          {/* Template selector */}
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            <div className="card" style={{padding:16}}>
              <h3 style={{margin:'0 0 12px',fontSize:14,fontWeight:700}}>Message Template</h3>
              <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:12}}>
                {TEMPLATES.map(t=>(
                  <button key={t.id} onClick={()=>setTemplate(t)} style={{padding:'8px 12px',borderRadius:8,border:`1px solid ${template.id===t.id?'var(--brand)':'var(--border)'}`,background:template.id===t.id?'var(--brand-soft)':'var(--bg-card)',textAlign:'left',cursor:'pointer',fontSize:13,fontWeight:template.id===t.id?600:400,color:template.id===t.id?'var(--brand)':'var(--text-primary)',transition:'all 150ms'}}>
                    {t.name}
                  </button>
                ))}
              </div>
              {template.id==='custom'?(
                <textarea className="input" rows={6} value={customMsg} onChange={e=>setCustomMsg(e.target.value)} placeholder="Write your custom message. Use {name} for member name, {date} for expiry date, {amount} for balance."/>
              ):(
                <div style={{background:'var(--bg-subtle)',borderRadius:10,padding:12,fontSize:13,color:'var(--text-secondary)',lineHeight:1.7,whiteSpace:'pre-wrap'}}>{template.body}</div>
              )}
            </div>
            <div className="card" style={{padding:16,background:'var(--success-bg)',border:'1px solid var(--success-border)'}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8,color:'var(--success)',fontWeight:700,fontSize:13}}><ExternalLink size={13}/>Opens WhatsApp Web</div>
              <p style={{margin:0,fontSize:12,color:'var(--text-secondary)',lineHeight:1.6}}>Clicking Send opens WhatsApp Web or App with a pre-filled message. No API key needed — direct member communication.</p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
