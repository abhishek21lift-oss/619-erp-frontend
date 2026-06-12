'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, Plus, Loader2, Power, PowerOff, Edit2, Trash2, Zap, MessageSquare, Clock } from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { useAsync } from '@/lib/use-async';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';

const TRIGGER_EVENTS = [
  { value: 'member_created', label: 'Member Created', channel: 'whatsapp' },
  { value: 'lead_created', label: 'Lead Created', channel: 'whatsapp' },
  { value: 'membership_expiring', label: 'Membership Expiring', channel: 'whatsapp' },
  { value: 'membership_expired', label: 'Membership Expired', channel: 'sms' },
  { value: 'payment_received', label: 'Payment Received', channel: 'whatsapp' },
  { value: 'session_low', label: 'Low Session Balance', channel: 'sms' },
  { value: 'birthday', label: 'Birthday', channel: 'whatsapp' },
  { value: 'anniversary', label: 'Anniversary', channel: 'whatsapp' },
  { value: 'attendance_missed', label: 'Missed Attendance', channel: 'whatsapp' },
  { value: 'trial_scheduled', label: 'Trial Scheduled', channel: 'whatsapp' },
  { value: 'followup_due', label: 'Follow-Up Due', channel: 'whatsapp' },
];

const KPIS = [
  { label:'Total (30d)', key:'total', color:'#8b5cf6', bg:'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(109,40,217,0.06))' },
  { label:'Sent', key:'sent', color:'#3b82f6', bg:'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(37,99,235,0.06))' },
  { label:'Delivered', key:'delivered', color:'#22c55e', bg:'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(22,163,74,0.06))' },
  { label:'Read', key:'read', color:'#a855f7', bg:'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(88,28,135,0.06))' },
  { label:'Failed', key:'failed', color:'#ef4444', bg:'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(220,38,38,0.06))' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] } }
};

export default function AutomationPage() {
  return <Guard role="admin"><AutoContent/></Guard>;
}
function AutoContent() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState('');
  const [triggerEvent, setTriggerEvent] = useState('member_created');
  const [channel, setChannel] = useState('whatsapp');
  const [template, setTemplate] = useState('');
  const [delayMinutes, setDelayMinutes] = useState('0');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const rules = useAsync(() => api.automation.rules.list().then(r => r.data as any[]), []);
  const logs = useAsync(() => api.automation.communicationLogs.list({ limit: 20 }).then(r => r.data as any[]), []);
  const logStats = useAsync(() => api.automation.communicationLogs.stats().then(r => r.data as any), []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.automation.rules.update(editing.id, {
          name, trigger_event: triggerEvent, channel,
          template, delay_minutes: parseInt(delayMinutes),
        });
        toast.success('Rule updated');
      } else {
        await api.automation.rules.create({
          name, trigger_event: triggerEvent, channel,
          template, delay_minutes: parseInt(delayMinutes),
        });
        toast.success('Rule created');
      }
      setName(''); setTemplate(''); setDelayMinutes('0'); setEditing(null);
      setShowForm(false); rules.refetch();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save rule');
    } finally { setSaving(false); }
  }

  async function toggleRule(rule: any) {
    try {
      await api.automation.rules.update(rule.id, { is_active: !rule.is_active });
      rules.refetch();
    } catch { toast.error('Failed to toggle rule'); }
  }

  async function deleteRule(id: string) {
    try {
      await api.automation.rules.delete(id);
      toast.success('Rule deleted');
      rules.refetch();
    } catch { toast.error('Failed to delete rule'); }
  }

  function startEdit(rule: any) {
    setName(rule.name);
    setTriggerEvent(rule.trigger_event);
    setChannel(rule.channel);
    setTemplate(rule.template || '');
    setDelayMinutes(String(rule.delay_minutes || 0));
    setEditing(rule);
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false); setEditing(null);
    setName(''); setTemplate(''); setDelayMinutes('0'); setTriggerEvent('member_created'); setChannel('whatsapp');
  }

  return (
    <AppShell>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ position:'relative', overflow:'hidden', borderRadius:24, padding:'40px 44px', marginBottom:28, background:'linear-gradient(135deg, #1a0a2e, #2d1b69, #1a0a2e)', boxShadow:'0 20px 60px rgba(26,10,46,0.5)' }}>
          <div style={{ position:'absolute', inset:0, background:'radial-gradient(600px circle at 70% 40%, rgba(139,92,246,0.12), transparent 70%)' }}/>
          <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(rgba(139,92,246,0.08) 1px, transparent 1px)', backgroundSize:'24px 24px' }}/>
          <div style={{ position:'absolute', bottom:-30, left:40, width:180, height:180, borderRadius:'50%', background:'radial-gradient(circle, rgba(109,40,217,0.08), transparent)' }}/>
          <div style={{ position:'relative', zIndex:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
              <div style={{ width:44, height:44, borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(109,40,217,0.1))', backdropFilter:'blur(8px)' }}>
                <Bot size={22} color="#a855f7" />
              </div>
              <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', background:'linear-gradient(135deg, #a855f7, #8b5cf6)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Automation</span>
            </div>
            <h1 style={{ fontSize:34, fontWeight:800, letterSpacing:'-0.03em', lineHeight:1.1, color:'#ffffff', margin:'0 0 8px' }}>Automation Rules</h1>
            <p style={{ maxWidth:560, fontSize:14, lineHeight:1.6, color:'rgba(255,255,255,0.55)' }}>Automate WhatsApp, SMS, and email messages for welcome, follow-up, renewal, birthday, and promotions.</p>
          </div>
        </motion.div>

        {logStats.data && (
          <motion.div variants={containerVariants} initial="hidden" animate="visible"
            style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:14, marginBottom:28 }}>
            {KPIS.map((k,i)=>{
              const keys = ['total','sent','delivered','read','failed'];
              const vals = keys.map(kk => (logStats.data as any)[kk] || 0);
              return (
                <motion.div key={k.label} variants={itemVariants}
                  style={{ position:'relative', overflow:'hidden', borderRadius:20, padding:'22px 24px', background:k.bg, backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.1)', boxShadow:'0 8px 32px rgba(0,0,0,0.12)', cursor:'default', transition:'all 0.3s ease' }}
                  onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 12px 40px rgba(0,0,0,0.2)';}}
                  onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 8px 32px rgba(0,0,0,0.12)';}}>
                  <div style={{ position:'absolute', top:-20, right:-20, width:100, height:100, borderRadius:'50%', background:'radial-gradient(circle, ' + k.color + '15, transparent)' }}/>
                  <div style={{ fontSize:28, fontWeight:800, color:k.color, marginBottom:2 }}>{vals[i]}</div>
                  <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{k.label}</div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:18 }}>
          <button onClick={()=>{cancelForm(); setShowForm(!showForm);}}
            style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:700, padding:'10px 20px', borderRadius:12, background:'linear-gradient(135deg, #8b5cf6, #6d28d9)', color:'#fff', border:'none', cursor:'pointer', boxShadow:'0 4px 16px rgba(139,92,246,0.35)' }}>
            <Plus size={14}/> {showForm?'Cancel':'New Rule'}
          </button>
        </div>

        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10, scale:0.98 }} animate={{ opacity: 1, y: 0, scale:1 }}
            style={{ borderRadius:20, background:'rgba(255,255,255,0.06)', backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.1)', boxShadow:'0 8px 32px rgba(0,0,0,0.12)', padding:24, marginBottom:22 }}>
            <h3 style={{ margin:'0 0 20px', fontSize:15, fontWeight:700, color:'rgba(255,255,255,0.9)', display:'flex', gap:8, alignItems:'center' }}>
              <Bot size={16} color="#a855f7"/> {editing?'Edit Rule':'Create Rule'}
            </h3>
            <form onSubmit={handleCreate} style={{ display:'grid', gap:14 }}>
              <input required placeholder="Rule name (e.g., Welcome Message)" value={name} onChange={e => setName(e.target.value)}
                style={{ width:'100%', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'10px 14px', fontSize:13, fontWeight:500, color:'rgba(255,255,255,0.85)', background:'rgba(255,255,255,0.04)', outline:'none', fontFamily:'inherit' }} />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <select value={triggerEvent} onChange={e => {
                  setTriggerEvent(e.target.value);
                  const ev = TRIGGER_EVENTS.find(t => t.value === e.target.value);
                  if (ev) setChannel(ev.channel);
                }}
                  style={{ width:'100%', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'10px 12px', fontSize:13, fontWeight:500, color:'rgba(255,255,255,0.85)', background:'rgba(255,255,255,0.04)', outline:'none', fontFamily:'inherit' }}>
                  {TRIGGER_EVENTS.map(ev => <option key={ev.value} value={ev.value}>{ev.label}</option>)}
                </select>
                <select value={channel} onChange={e => setChannel(e.target.value)}
                  style={{ width:'100%', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'10px 12px', fontSize:13, fontWeight:500, color:'rgba(255,255,255,0.85)', background:'rgba(255,255,255,0.04)', outline:'none', fontFamily:'inherit' }}>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                </select>
              </div>
              <textarea required placeholder="Message template (use {{name}}, {{amount}}, etc.)" rows={3} value={template}
                onChange={e => setTemplate(e.target.value)}
                style={{ width:'100%', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'10px 14px', fontSize:13, fontWeight:500, color:'rgba(255,255,255,0.85)', background:'rgba(255,255,255,0.04)', outline:'none', resize:'vertical', fontFamily:'inherit', lineHeight:1.6 }} />
              <input type="number" placeholder="Delay (minutes, 0 = instant)" value={delayMinutes} onChange={e => setDelayMinutes(e.target.value)}
                style={{ width:'100%', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'10px 14px', fontSize:13, fontWeight:500, color:'rgba(255,255,255,0.85)', background:'rgba(255,255,255,0.04)', outline:'none', fontFamily:'inherit' }} />
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                <button type="button" onClick={cancelForm}
                  style={{ fontSize:12, fontWeight:700, padding:'8px 18px', borderRadius:10, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:'rgba(255,255,255,0.5)', cursor:'pointer' }}>Cancel</button>
                <button type="submit" disabled={saving}
                  style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:700, padding:'8px 20px', borderRadius:12, background:'linear-gradient(135deg, #8b5cf6, #6d28d9)', color:'#fff', border:'none', cursor:saving?'not-allowed':'pointer', opacity:saving?0.7:1, boxShadow:'0 4px 16px rgba(139,92,246,0.35)' }}>
                  {saving ? <><Loader2 size={13}/> Saving...</> : <><Plus size={13}/> {editing?'Update Rule':'Create Rule'}</>}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            style={{ borderRadius:20, background:'rgba(255,255,255,0.06)', backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.1)', boxShadow:'0 8px 32px rgba(0,0,0,0.12)', padding:20 }}>
            <h2 style={{ fontSize:16, fontWeight:700, color:'rgba(255,255,255,0.9)', margin:'0 0 18px', display:'flex', alignItems:'center', gap:8 }}>
              <Zap size={16} color="#a855f7"/> Active Rules
            </h2>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {((rules.data as any[]) || []).map((r: any) => (
                <motion.div key={r.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  style={{ borderRadius:14, padding:'14px 16px', background:r.is_active?'rgba(139,92,246,0.08)':'rgba(255,255,255,0.03)', border:'1px solid '+(r.is_active?'rgba(139,92,246,0.15)':'rgba(255,255,255,0.06)'), opacity:r.is_active?1:0.5, transition:'all 0.2s' }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(139,92,246,0.3)';}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=r.is_active?'rgba(139,92,246,0.15)':'rgba(255,255,255,0.06)';}}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ margin:0, fontSize:14, fontWeight:700, color:'rgba(255,255,255,0.9)' }}>{r.name}</p>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:5, flexWrap:'wrap' }}>
                        <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:5, background:'rgba(139,92,246,0.15)', color:'#a855f7', textTransform:'capitalize' }}>
                          {r.trigger_event?.replace(/_/g, ' ')}
                        </span>
                        <span style={{ fontSize:10, color:'rgba(255,255,255,0.35)' }}>via {r.channel}</span>
                        {r.delay_minutes > 0 && <span style={{ fontSize:10, color:'rgba(255,255,255,0.35)' }}>· {r.delay_minutes}m delay</span>}
                      </div>
                      {r.template && (
                        <p style={{ margin:'6px 0 0', fontSize:11, color:'rgba(255,255,255,0.35)', lineHeight:1.4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:300 }}>{r.template}</p>
                      )}
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
                      <button onClick={() => startEdit(r)} title="Edit rule"
                        style={{ display:'flex', alignItems:'center', justifyContent:'center', width:30, height:30, borderRadius:7, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:'rgba(255,255,255,0.45)', cursor:'pointer' }}>
                        <Edit2 size={12}/>
                      </button>
                      <button onClick={() => deleteRule(r.id)} title="Delete rule"
                        style={{ display:'flex', alignItems:'center', justifyContent:'center', width:30, height:30, borderRadius:7, border:'none', background:'rgba(239,68,68,0.12)', color:'#f87171', cursor:'pointer' }}>
                        <Trash2 size={12}/>
                      </button>
                      <button onClick={() => toggleRule(r)} title={r.is_active?'Disable':'Enable'}
                        style={{ display:'flex', alignItems:'center', justifyContent:'center', width:30, height:30, borderRadius:7, border:'none',
                          background:r.is_active?'rgba(34,197,94,0.12)':'rgba(255,255,255,0.06)', cursor:'pointer' }}>
                        {r.is_active ? <Power size={13} color="#4ade80"/> : <PowerOff size={13} color="rgba(255,255,255,0.35)"/>}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
              {(!rules.data || (rules.data as any[]).length === 0) && (
                <div style={{ padding:'40px 16px', textAlign:'center' }}>
                  <Bot size={32} color="rgba(255,255,255,0.12)" style={{ marginBottom:12 }}/>
                  <p style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.35)', margin:0 }}>No automation rules yet.</p>
                  <p style={{ fontSize:11, color:'rgba(255,255,255,0.2)', marginTop:4 }}>Click "New Rule" to create your first one.</p>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay:0.1 }}
            style={{ borderRadius:20, background:'rgba(255,255,255,0.06)', backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.1)', boxShadow:'0 8px 32px rgba(0,0,0,0.12)', padding:20 }}>
            <h2 style={{ fontSize:16, fontWeight:700, color:'rgba(255,255,255,0.9)', margin:'0 0 18px', display:'flex', alignItems:'center', gap:8 }}>
              <MessageSquare size={16} color="#a855f7"/> Recent Logs
            </h2>
            <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:480, overflowY:'auto' }}>
              {((logs.data || []) as any[]).map((l: any) => {
                const logStatusColor = l.status === 'delivered' || l.status === 'read' ? '#22c55e' :
                  l.status === 'failed' ? '#ef4444' : '#94a3b8';
                const logStatusBg = l.status === 'delivered' || l.status === 'read' ? 'rgba(34,197,94,0.15)' :
                  l.status === 'failed' ? 'rgba(239,68,68,0.12)' : 'rgba(148,163,184,0.1)';
                return (
                  <div key={l.id}
                    style={{ borderRadius:10, padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ minWidth:0, flex:1 }}>
                      <p style={{ margin:0, fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.85)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {l.recipient_name || l.recipient_id}
                      </p>
                      <p style={{ margin:'2px 0 0', fontSize:10, color:'rgba(255,255,255,0.35)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {l.message?.slice(0, 80)}
                      </p>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginLeft:8, flexShrink:0 }}>
                      <span style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', padding:'2px 7px', borderRadius:4, background:logStatusBg, color:logStatusColor }}>{l.status}</span>
                      <span style={{ fontSize:9, fontWeight:600, textTransform:'uppercase', color:'rgba(255,255,255,0.35)' }}>{l.channel}</span>
                      {l.created_at&&<span style={{ fontSize:9, color:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', gap:2 }}><Clock size={8}/>{new Date(l.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}</span>}
                    </div>
                  </div>
                );
              })}
              {(!logs.data || (logs.data as any[]).length === 0) && (
                <div style={{ padding:'40px 16px', textAlign:'center' }}>
                  <MessageSquare size={32} color="rgba(255,255,255,0.12)" style={{ marginBottom:12 }}/>
                  <p style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.35)', margin:0 }}>No communication logs yet.</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </AppShell>
  );
}
