'use client';
import { useState } from 'react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Send, Target, TrendingUp, Users, Plus, Edit2, Trash2, Calendar, CheckCircle2, Clock, PauseCircle } from 'lucide-react';

const STATUS_COLOR:Record<string,string> = { Active:'var(--success)', Draft:'var(--text-muted)', Scheduled:'var(--warning)', Paused:'var(--info)', Completed:'var(--accent)' };
const CHANNELS = ['WhatsApp','SMS','Email','In-App','All Channels'];

interface Campaign { id:string; name:string; goal:string; channel:string; audience:string; status:string; start:string; end:string; sent:number; opened:number; converted:number; }

const SAMPLE:Campaign[] = [
  {id:'1',name:'Summer Fitness Drive',goal:'New member acquisition',channel:'WhatsApp',audience:'Inactive + Leads',status:'Active',start:'2026-05-01',end:'2026-05-31',sent:120,opened:85,converted:12},
  {id:'2',name:'Renewal Month Push',goal:'Retention & renewals',channel:'SMS',audience:'Expiring This Month',status:'Active',start:'2026-05-10',end:'2026-05-25',sent:45,opened:38,converted:20},
  {id:'3',name:'Monsoon Special Offer',goal:'Revenue growth',channel:'All Channels',audience:'All Members',status:'Draft',start:'2026-06-01',end:'2026-06-30',sent:0,opened:0,converted:0},
  {id:'4',name:'PT Upsell Campaign',goal:'PT package sales',channel:'WhatsApp',audience:'Active Non-PT Members',status:'Scheduled',start:'2026-05-20',end:'2026-06-10',sent:0,opened:0,converted:0},
];

export default function CampaignsPage() {
  return <Guard role="admin"><CampaignContent/></Guard>;
}
function CampaignContent() {
  const [campaigns, setCampaigns] = useState(SAMPLE);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({name:'',goal:'',channel:CHANNELS[0],audience:'',start:'',end:''});

  const active=campaigns.filter(c=>c.status==='Active').length;
  const totalSent=campaigns.reduce((s,c)=>s+c.sent,0);
  const totalConv=campaigns.reduce((s,c)=>s+c.converted,0);
  const convRate=totalSent>0?((totalConv/totalSent)*100).toFixed(1):'0';

  function addCampaign(e:React.FormEvent){ e.preventDefault();
    setCampaigns(p=>[...p,{id:crypto.randomUUID(),...form,status:'Draft',sent:0,opened:0,converted:0}]);
    setForm({name:'',goal:'',channel:CHANNELS[0],audience:'',start:'',end:''}); setShowForm(false);
  }

  return (
    <AppShell>
      <div className="page-container animate-fade-in">
        <div className="page-header">
          <div><h1 className="page-title">Campaigns</h1><p className="page-subtitle">Plan, launch &amp; track multi-channel marketing campaigns</p></div>
          <button className="btn btn-primary btn-sm" onClick={()=>setShowForm(v=>!v)}><Plus size={14}/> New Campaign</button>
        </div>
        {/* KPIs */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
          {[{l:'Active',v:active,c:'var(--success)',i:<TrendingUp size={16}/>},{l:'Total Sent',v:totalSent,c:'var(--brand)',i:<Send size={16}/>},{l:'Conversions',v:totalConv,c:'var(--accent)',i:<CheckCircle2 size={16}/>},{l:'Conv. Rate',v:convRate+'%',c:'var(--info)',i:<Target size={16}/>}].map(k=>(
            <div key={k.l} className="kpi-card" style={{borderTop:`3px solid ${k.c}`}}>
              <div style={{color:k.c,marginBottom:6}}>{k.i}</div><div className="kpi-value">{k.v}</div><div className="kpi-label">{k.l}</div>
            </div>
          ))}
        </div>
        {/* Create form */}
        {showForm&&(
          <div className="card" style={{padding:20,marginBottom:20}}>
            <h3 style={{margin:'0 0 16px',fontSize:15,fontWeight:700}}>Create Campaign</h3>
            <form onSubmit={addCampaign} style={{display:'grid',gap:14}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <label style={{display:'grid',gap:4}}><span style={{fontSize:11,fontWeight:700,textTransform:'uppercase',color:'var(--text-muted)'}}>Campaign Name *</span>
                  <input className="input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Summer Fitness Drive" required/>
                </label>
                <label style={{display:'grid',gap:4}}><span style={{fontSize:11,fontWeight:700,textTransform:'uppercase',color:'var(--text-muted)'}}>Goal</span>
                  <input className="input" value={form.goal} onChange={e=>setForm(f=>({...f,goal:e.target.value}))} placeholder="e.g. Increase renewals by 20%"/>
                </label>
                <label style={{display:'grid',gap:4}}><span style={{fontSize:11,fontWeight:700,textTransform:'uppercase',color:'var(--text-muted)'}}>Channel</span>
                  <select className="input" value={form.channel} onChange={e=>setForm(f=>({...f,channel:e.target.value}))}>{CHANNELS.map(c=><option key={c}>{c}</option>)}</select>
                </label>
                <label style={{display:'grid',gap:4}}><span style={{fontSize:11,fontWeight:700,textTransform:'uppercase',color:'var(--text-muted)'}}>Target Audience</span>
                  <input className="input" value={form.audience} onChange={e=>setForm(f=>({...f,audience:e.target.value}))} placeholder="e.g. Expiring This Month"/>
                </label>
                <label style={{display:'grid',gap:4}}><span style={{fontSize:11,fontWeight:700,textTransform:'uppercase',color:'var(--text-muted)'}}>Start Date</span>
                  <input className="input" type="date" value={form.start} onChange={e=>setForm(f=>({...f,start:e.target.value}))}/>
                </label>
                <label style={{display:'grid',gap:4}}><span style={{fontSize:11,fontWeight:700,textTransform:'uppercase',color:'var(--text-muted)'}}>End Date</span>
                  <input className="input" type="date" value={form.end} onChange={e=>setForm(f=>({...f,end:e.target.value}))}/>
                </label>
              </div>
              <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                <button type="button" className="btn btn-outline btn-sm" onClick={()=>setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm"><Plus size={13}/> Create Campaign</button>
              </div>
            </form>
          </div>
        )}
        {/* Campaign cards */}
        <div style={{display:'grid',gap:12}}>
          {campaigns.map(c=>{
            const openRate=c.sent>0?((c.opened/c.sent)*100).toFixed(0):'—';
            const convR=c.sent>0?((c.converted/c.sent)*100).toFixed(1):'—';
            return (
              <div key={c.id} className="card" style={{padding:0,overflow:'hidden'}}>
                <div style={{height:3,background:STATUS_COLOR[c.status]||'var(--border)'}}/>
                <div style={{padding:'16px 20px'}}>
                  <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,marginBottom:12}}>
                    <div style={{flex:1}}>
                      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
                        <span style={{fontWeight:700,fontSize:15,color:'var(--text-primary)'}}>{c.name}</span>
                        <span style={{fontSize:11,fontWeight:700,padding:'2px 9px',borderRadius:20,background:`${STATUS_COLOR[c.status]}18`,color:STATUS_COLOR[c.status]}}>{c.status}</span>
                        <span className="badge badge-neutral">{c.channel}</span>
                      </div>
                      {c.goal&&<p style={{margin:'0 0 6px',fontSize:13,color:'var(--text-secondary)'}}>🎯 {c.goal}</p>}
                      <div style={{display:'flex',gap:12,fontSize:11,color:'var(--text-muted)'}}>
                        {c.audience&&<span><Users size={9} style={{marginRight:3}}/>{c.audience}</span>}
                        {c.start&&<span><Calendar size={9} style={{marginRight:3}}/>{c.start} → {c.end||'ongoing'}</span>}
                      </div>
                    </div>
                    <div style={{display:'flex',gap:6}}>
                      <button className="btn btn-ghost btn-icon btn-sm"><Edit2 size={13}/></button>
                      <button className="btn btn-ghost btn-icon btn-sm" style={{color:'var(--danger)'}} onClick={()=>setCampaigns(p=>p.filter(x=>x.id!==c.id))}><Trash2 size={13}/></button>
                    </div>
                  </div>
                  {c.sent>0&&(
                    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,paddingTop:12,borderTop:'1px solid var(--border)'}}>
                      {[{l:'Sent',v:c.sent,c:'var(--text-secondary)'},{l:'Opened',v:c.opened,c:'var(--info)'},{l:'Open Rate',v:openRate+'%',c:'var(--warning)'},{l:'Converted',v:c.converted+' ('+convR+'%)',c:'var(--success)'}].map(m=>(
                        <div key={m.l} style={{textAlign:'center'}}>
                          <div style={{fontSize:18,fontWeight:800,color:m.c}}>{m.v}</div>
                          <div style={{fontSize:10,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.5px'}}>{m.l}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
