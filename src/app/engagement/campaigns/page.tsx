'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Send, Target, TrendingUp, Users, Plus, Edit2, Trash2, Calendar, CheckCircle2 } from 'lucide-react';
import { uuid } from '@/lib/uuid';

const STATUS_COLOR:Record<string,string> = { Active:'#22c55e', Draft:'#94a3b8', Scheduled:'#f59e0b', Paused:'#3b82f6', Completed:'#8b5cf6' };
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
    setCampaigns(p=>[...p,{id:uuid(),...form,status:'Draft',sent:0,opened:0,converted:0}]);
    setForm({name:'',goal:'',channel:CHANNELS[0],audience:'',start:'',end:''}); setShowForm(false);
  }

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
                <Send size={20} color="#A855F7" />
              </div>
              <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#A855F7' }}>Marketing</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <h1 style={{ fontSize:32, fontWeight:800, letterSpacing:'-0.03em', lineHeight:1.1, color:'#ffffff', margin:0 }}>Campaigns</h1>
                <p style={{ marginTop:8, maxWidth:560, fontSize:14, lineHeight:1.6, color:'rgba(255,255,255,0.6)' }}>Plan, launch &amp; track multi-channel marketing campaigns.</p>
              </div>
              <button onClick={()=>setShowForm(v=>!v)}
                style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:700, padding:'10px 18px', borderRadius:12, background:'linear-gradient(135deg, #A855F7, #7c3aed)', color:'#fff', border:'none', cursor:'pointer', boxShadow:'0 4px 14px rgba(168,85,247,0.3)' }}>
                <Plus size={14}/> {showForm?'Cancel':'New Campaign'}
              </button>
            </div>
          </div>
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible"
          style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
          {[
            { label:'Active', value:active, color:'#22c55e', icon:<TrendingUp size={18}/> },
            { label:'Total Sent', value:totalSent, color:'#A855F7', icon:<Send size={18}/> },
            { label:'Conversions', value:totalConv, color:'#8b5cf6', icon:<CheckCircle2 size={18}/> },
            { label:'Conv. Rate', value:convRate+'%', color:'#3b82f6', icon:<Target size={18}/> },
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

        {/* Create form */}
        {showForm&&(
          <motion.div initial={{ opacity: 0, y: -10, scale:0.98 }} animate={{ opacity: 1, y: 0, scale:1 }}
            style={{ background:'rgba(255,255,255,0.95)', backdropFilter:'blur(12px)', borderRadius:20, border:'1px solid rgba(255,255,255,0.9)', boxShadow:'0 8px 30px rgba(15,23,42,0.1)', padding:24, marginBottom:20 }}>
            <h3 style={{ margin:'0 0 18px', fontSize:15, fontWeight:700, color:'#0f172a', display:'flex', gap:8, alignItems:'center' }}><TrendingUp size={16} color="#A855F7"/> Create Campaign</h3>
            <form onSubmit={addCampaign} style={{ display:'grid', gap:16 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <label style={{ display:'grid', gap:5 }}>
                  <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', color:'#94a3b8' }}>Campaign Name *</span>
                  <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Summer Fitness Drive" required
                    style={{ width:'100%', border:'1px solid rgba(15,23,42,0.08)', borderRadius:10, padding:'9px 14px', fontSize:13, fontWeight:500, color:'#0f172a', background:'rgba(248,250,252,0.9)', outline:'none', fontFamily:'inherit' }} />
                </label>
                <label style={{ display:'grid', gap:5 }}>
                  <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', color:'#94a3b8' }}>Goal</span>
                  <input value={form.goal} onChange={e=>setForm(f=>({...f,goal:e.target.value}))} placeholder="e.g. Increase renewals by 20%"
                    style={{ width:'100%', border:'1px solid rgba(15,23,42,0.08)', borderRadius:10, padding:'9px 14px', fontSize:13, fontWeight:500, color:'#0f172a', background:'rgba(248,250,252,0.9)', outline:'none', fontFamily:'inherit' }} />
                </label>
                <label style={{ display:'grid', gap:5 }}>
                  <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', color:'#94a3b8' }}>Channel</span>
                  <select value={form.channel} onChange={e=>setForm(f=>({...f,channel:e.target.value}))}
                    style={{ width:'100%', border:'1px solid rgba(15,23,42,0.08)', borderRadius:10, padding:'9px 12px', fontSize:13, fontWeight:500, color:'#0f172a', background:'rgba(248,250,252,0.9)', outline:'none', fontFamily:'inherit' }}>
                    {CHANNELS.map(c=><option key={c}>{c}</option>)}
                  </select>
                </label>
                <label style={{ display:'grid', gap:5 }}>
                  <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', color:'#94a3b8' }}>Target Audience</span>
                  <input value={form.audience} onChange={e=>setForm(f=>({...f,audience:e.target.value}))} placeholder="e.g. Expiring This Month"
                    style={{ width:'100%', border:'1px solid rgba(15,23,42,0.08)', borderRadius:10, padding:'9px 14px', fontSize:13, fontWeight:500, color:'#0f172a', background:'rgba(248,250,252,0.9)', outline:'none', fontFamily:'inherit' }} />
                </label>
                <label style={{ display:'grid', gap:5 }}>
                  <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', color:'#94a3b8' }}>Start Date</span>
                  <input type="date" value={form.start} onChange={e=>setForm(f=>({...f,start:e.target.value}))}
                    style={{ width:'100%', border:'1px solid rgba(15,23,42,0.08)', borderRadius:10, padding:'9px 14px', fontSize:13, fontWeight:500, color:'#0f172a', background:'rgba(248,250,252,0.9)', outline:'none', fontFamily:'inherit' }} />
                </label>
                <label style={{ display:'grid', gap:5 }}>
                  <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', color:'#94a3b8' }}>End Date</span>
                  <input type="date" value={form.end} onChange={e=>setForm(f=>({...f,end:e.target.value}))}
                    style={{ width:'100%', border:'1px solid rgba(15,23,42,0.08)', borderRadius:10, padding:'9px 14px', fontSize:13, fontWeight:500, color:'#0f172a', background:'rgba(248,250,252,0.9)', outline:'none', fontFamily:'inherit' }} />
                </label>
              </div>
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                <button type="button" onClick={()=>setShowForm(false)}
                  style={{ fontSize:12, fontWeight:700, padding:'8px 16px', borderRadius:10, border:'1px solid rgba(15,23,42,0.1)', background:'transparent', color:'#64748b', cursor:'pointer' }}>Cancel</button>
                <button type="submit"
                  style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:700, padding:'8px 18px', borderRadius:12, background:'linear-gradient(135deg, #A855F7, #7c3aed)', color:'#fff', border:'none', cursor:'pointer', boxShadow:'0 4px 14px rgba(168,85,247,0.3)' }}>
                  <Plus size={13}/> Create Campaign
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Campaign cards */}
        <motion.div variants={containerVariants} initial="hidden" animate="visible" style={{ display:'grid', gap:12 }}>
          {(campaigns ?? []).map(c=>{
            const openRate=c.sent>0?((c.opened/c.sent)*100).toFixed(0):'—';
            const convR=c.sent>0?((c.converted/c.sent)*100).toFixed(1):'—';
            return (
              <motion.div key={c.id} variants={itemVariants}
                style={{ background:'rgba(255,255,255,0.95)', backdropFilter:'blur(12px)', borderRadius:20, border:'1px solid rgba(255,255,255,0.9)', boxShadow:'0 2px 20px rgba(15,23,42,0.07)', overflow:'hidden' }}>
                <div style={{ height:4, background:STATUS_COLOR[c.status]||'rgba(15,23,42,0.06)' }}/>
                <div style={{ padding:'18px 22px' }}>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:14 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6, flexWrap:'wrap' }}>
                        <span style={{ fontWeight:700, fontSize:15, color:'#0f172a' }}>{c.name}</span>
                        <span style={{ fontSize:11, fontWeight:700, padding:'2px 10px', borderRadius:20, background:`${STATUS_COLOR[c.status]}18`, color:STATUS_COLOR[c.status], textTransform:'capitalize' }}>{c.status}</span>
                        <span style={{ fontSize:11, fontWeight:600, padding:'2px 10px', borderRadius:20, background:'rgba(15,23,42,0.05)', color:'#64748b' }}>{c.channel}</span>
                      </div>
                      {c.goal&&<p style={{ margin:'0 0 6px', fontSize:13, color:'#475569' }}>🎯 {c.goal}</p>}
                      <div style={{ display:'flex', gap:16, fontSize:11, color:'#94a3b8', alignItems:'center', flexWrap:'wrap' }}>
                        {c.audience&&<span style={{ display:'flex', alignItems:'center', gap:4 }}><Users size={11}/>{c.audience}</span>}
                        {c.start&&<span style={{ display:'flex', alignItems:'center', gap:4 }}><Calendar size={11}/>{c.start} → {c.end||'ongoing'}</span>}
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:4 }}>
                      <button style={{ display:'flex', alignItems:'center', justifyContent:'center', width:32, height:32, borderRadius:8, border:'1px solid rgba(15,23,42,0.08)', background:'transparent', color:'#64748b', cursor:'pointer' }}><Edit2 size={13}/></button>
                      <button onClick={()=>setCampaigns(p=>p.filter(x=>x.id!==c.id))}
                        style={{ display:'flex', alignItems:'center', justifyContent:'center', width:32, height:32, borderRadius:8, border:'none', background:'rgba(239,68,68,0.08)', color:'#ef4444', cursor:'pointer' }}><Trash2 size={13}/></button>
                    </div>
                  </div>
                  {c.sent>0&&(
                    <div style={{ paddingTop:14, borderTop:'1px solid rgba(15,23,42,0.06)', display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                      {[
                        { label:'Sent', value:c.sent, color:'#64748b' },
                        { label:'Opened', value:c.opened, color:'#3b82f6' },
                        { label:'Open Rate', value:openRate+'%', color:'#f59e0b' },
                        { label:'Converted', value:c.converted+' ('+convR+'%)', color:'#22c55e' },
                      ].map(m=>(
                        <div key={m.label} style={{ textAlign:'center' }}>
                          <div style={{ fontSize:20, fontWeight:800, color:m.color }}>{m.value}</div>
                          <div style={{ fontSize:10, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.5px', fontWeight:600 }}>{m.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </AppShell>
  );
}
