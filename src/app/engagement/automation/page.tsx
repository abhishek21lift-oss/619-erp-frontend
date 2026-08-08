'use client';
import { useState } from 'react';
import { m } from 'framer-motion';
import { Bot, Plus, Loader2, Power, PowerOff, Edit2, Trash2, Zap, MessageSquare, Clock } from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { PageContainer, PageHero } from '@/components/ui';
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
  { label:'Total (30d)', key:'total', color:'#0067e0', bg:'linear-gradient(135deg, rgba(0,103,224,0.1), rgba(0,103,224,0.05))' },
  { label:'Sent', key:'sent', color:'#0067e0', bg:'linear-gradient(135deg, rgba(0,103,224,0.1), rgba(0,103,224,0.05))' },
  { label:'Delivered', key:'delivered', color:'#10b981', bg:'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.05))' },
  { label:'Read', key:'read', color:'#0067e0', bg:'linear-gradient(135deg, rgba(0,103,224,0.1), rgba(0,89,206,0.05))' },
  { label:'Failed', key:'failed', color:'#dc2626', bg:'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(220,38,38,0.05))' },
];

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const itemVariants = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] } } };

export default function AutomationPage() { return <Guard role="admin"><AutoContent/></Guard>; }
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
    e.preventDefault(); setSaving(true);
    try {
      const payload = { name, trigger_event: triggerEvent, channel, template, delay_minutes: parseInt(delayMinutes) };
      if (editing) { await api.automation.rules.update(editing.id, payload); toast.success('Rule updated'); }
      else { await api.automation.rules.create(payload); toast.success('Rule created'); }
      setName(''); setTemplate(''); setDelayMinutes('0'); setEditing(null); setShowForm(false); rules.refetch();
    } catch (err: any) { toast.error(err?.message || 'Failed to save rule'); }
    finally { setSaving(false); }
  }

  async function toggleRule(rule: any) {
    try { await api.automation.rules.update(rule.id, { is_active: !rule.is_active }); rules.refetch(); }
    catch { toast.error('Failed to toggle rule'); }
  }

  async function deleteRule(id: string) {
    try { await api.automation.rules.delete(id); toast.success('Rule deleted'); rules.refetch(); }
    catch { toast.error('Failed to delete rule'); }
  }

  function startEdit(rule: any) {
    setName(rule.name); setTriggerEvent(rule.trigger_event); setChannel(rule.channel);
    setTemplate(rule.template || ''); setDelayMinutes(String(rule.delay_minutes || 0));
    setEditing(rule); setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false); setEditing(null);
    setName(''); setTemplate(''); setDelayMinutes('0'); setTriggerEvent('member_created'); setChannel('whatsapp');
  }

  const inp = { width:'100%', border:'1px solid #cbd5e1', borderRadius:10, padding:'10px 14px', fontSize:13, fontWeight:500, color:'#0F172A', background:'#f8fafc', outline:'none', fontFamily:'inherit' } as const;

  return (
    <AppShell>
      <PageContainer>
        <PageHero
          icon={<Bot size={20} />}
          title="Automation Rules"
          subtitle="Automate WhatsApp, SMS, and email messages for welcome, follow-up, renewal, birthday, and promotions."
          actions={
            <button type="button" onClick={()=>{cancelForm(); setShowForm(!showForm);}}
              className="inline-flex items-center gap-1.5 rounded-full h-9 px-3.5 text-[12px] font-semibold transition active:scale-95"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', color: '#fff' }}>
              <Plus size={14}/> {showForm?'Cancel':'New Rule'}
            </button>
          }
        />

        {/* ── KPI STATS ── */}
        {(logStats.data || logStats.loading) && (
          <m.div variants={containerVariants} initial="hidden" animate="visible"
            className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {KPIS.map((k,i)=>{
              const keys = ['total','sent','delivered','read','failed'];
              const vals = keys.map(kk => (logStats.data as any)?.[kk] || 0);
              return (
                <m.div key={k.label} variants={itemVariants}
                  style={{ position:'relative', overflow:'hidden', borderRadius:20, padding:'20px 22px', background:k.bg, border:`1px solid ${k.color}22`, boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
                  <div style={{ fontSize:26, fontWeight:800, color:k.color, marginBottom:4 }}>
                    {logStats.loading ? '—' : vals[i]}
                  </div>
                  <div style={{ fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.06em' }}>{k.label}</div>
                </m.div>
              );
            })}
          </m.div>
        )}

        {/* ── CREATE/EDIT FORM ── */}
        {showForm && (
          <m.div initial={{ opacity: 0, y: -10, scale:0.98 }} animate={{ opacity: 1, y: 0, scale:1 }}
            style={{ borderRadius:20, background:'#ffffff', border:'1px solid #e2e8f0', boxShadow:'0 4px 20px rgba(0,0,0,0.08)', padding:24, marginBottom:22 }}>
            <h3 style={{ margin:'0 0 20px', fontSize:15, fontWeight:700, color:'#0F172A', display:'flex', gap:8, alignItems:'center' }}>
              <Bot size={16} color="#0067e0"/> {editing?'Edit Rule':'Create Rule'}
            </h3>
            <form onSubmit={handleCreate} style={{ display:'grid', gap:14 }}>
              <input required placeholder="Rule name (e.g., Welcome Message)" value={name} onChange={e => setName(e.target.value)} style={inp} />
              <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap:14 }}>
                <select value={triggerEvent} onChange={e => {
                  setTriggerEvent(e.target.value);
                  const ev = TRIGGER_EVENTS.find(t => t.value === e.target.value);
                  if (ev) setChannel(ev.channel);
                }} style={inp}>
                  {TRIGGER_EVENTS.map(ev => <option key={ev.value} value={ev.value}>{ev.label}</option>)}
                </select>
                <select value={channel} onChange={e => setChannel(e.target.value)} style={inp}>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                </select>
              </div>
              <textarea required placeholder="Message template (use {{name}}, {{amount}}, etc.)" rows={3} value={template} onChange={e => setTemplate(e.target.value)}
                style={{ ...inp, resize:'vertical', lineHeight:1.6 }} />
              <input type="number" placeholder="Delay (minutes, 0 = instant)" value={delayMinutes} onChange={e => setDelayMinutes(e.target.value)} style={inp} />
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                <button type="button" onClick={cancelForm}
                  style={{ fontSize:12, fontWeight:700, padding:'8px 18px', borderRadius:10, border:'1px solid #cbd5e1', background:'transparent', color:'#64748b', cursor:'pointer' }}>Cancel</button>
                <button type="submit" disabled={saving}
                  style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:700, padding:'8px 20px', borderRadius:12, background:'linear-gradient(135deg, #0067e0, #0059ce)', color:'#fff', border:'none', cursor:saving?'not-allowed':'pointer', opacity:saving?0.7:1, boxShadow:'0 4px 16px rgba(0,103,224,0.35)' }}>
                  {saving ? <><Loader2 size={13}/> Saving...</> : <><Plus size={13}/> {editing?'Update Rule':'Create Rule'}</>}
                </button>
              </div>
            </form>
          </m.div>
        )}

        {/* ── RULES + LOGS ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap:20 }}>
          {/* Active Rules */}
          <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            style={{ borderRadius:20, background:'#ffffff', border:'1px solid #e2e8f0', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', padding:20 }}>
            <h2 style={{ fontSize:16, fontWeight:700, color:'#0F172A', margin:'0 0 16px', display:'flex', alignItems:'center', gap:8 }}>
              <Zap size={16} color="#0067e0"/> Active Rules
            </h2>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {((rules.data as any[]) || []).map((r: any) => (
                <m.div key={r.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  style={{ borderRadius:12, padding:'14px 16px', background:r.is_active?'rgba(0,103,224,0.05)':'#f8fafc', border:`1px solid ${r.is_active?'rgba(0,103,224,0.2)':'#e2e8f0'}`, opacity:r.is_active?1:0.65, transition:'all 0.2s' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ margin:0, fontSize:14, fontWeight:700, color:'#0F172A' }}>{r.name}</p>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:5, flexWrap:'wrap' }}>
                        <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:5, background:'rgba(0,103,224,0.1)', color:'#0067e0', textTransform:'capitalize' }}>
                          {r.trigger_event?.replace(/_/g, ' ')}
                        </span>
                        <span style={{ fontSize:10, color:'#64748b' }}>via {r.channel}</span>
                        {r.delay_minutes > 0 && <span style={{ fontSize:10, color:'#64748b' }}>· {r.delay_minutes}m delay</span>}
                      </div>
                      {r.template && (
                        <p style={{ margin:'6px 0 0', fontSize:11, color:'#94a3b8', lineHeight:1.4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:300 }}>{r.template}</p>
                      )}
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
                      <button onClick={() => startEdit(r)} title="Edit rule"
                        style={{ display:'flex', alignItems:'center', justifyContent:'center', width:30, height:30, borderRadius:7, border:'1px solid #e2e8f0', background:'#f8fafc', color:'#64748b', cursor:'pointer' }}>
                        <Edit2 size={12}/>
                      </button>
                      <button onClick={() => deleteRule(r.id)} title="Delete rule"
                        style={{ display:'flex', alignItems:'center', justifyContent:'center', width:30, height:30, borderRadius:7, border:'none', background:'rgba(239,68,68,0.08)', color:'#dc2626', cursor:'pointer' }}>
                        <Trash2 size={12}/>
                      </button>
                      <button onClick={() => toggleRule(r)} title={r.is_active?'Disable':'Enable'}
                        style={{ display:'flex', alignItems:'center', justifyContent:'center', width:30, height:30, borderRadius:7, border:'none',
                          background:r.is_active?'rgba(16,185,129,0.1)':'#f1f5f9', cursor:'pointer' }}>
                        {r.is_active ? <Power size={13} color="#10b981"/> : <PowerOff size={13} color="#94a3b8"/>}
                      </button>
                    </div>
                  </div>
                </m.div>
              ))}
              {(!rules.data || (rules.data as any[]).length === 0) && (
                <div style={{ padding:'40px 16px', textAlign:'center' }}>
                  <Bot size={32} color="#cbd5e1" style={{ marginBottom:12 }}/>
                  <p style={{ fontSize:13, fontWeight:600, color:'#334155', margin:0 }}>No automation rules yet.</p>
                  <p style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>Click "New Rule" to create your first one.</p>
                </div>
              )}
            </div>
          </m.div>

          {/* Recent Logs */}
          <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay:0.1 }}
            style={{ borderRadius:20, background:'#ffffff', border:'1px solid #e2e8f0', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', padding:20 }}>
            <h2 style={{ fontSize:16, fontWeight:700, color:'#0F172A', margin:'0 0 16px', display:'flex', alignItems:'center', gap:8 }}>
              <MessageSquare size={16} color="#0067e0"/> Recent Logs
            </h2>
            <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:480, overflowY:'auto' }}>
              {((logs.data || []) as any[]).map((l: any) => {
                const logStatusColor = l.status === 'delivered' || l.status === 'read' ? '#10b981' : l.status === 'failed' ? '#dc2626' : '#64748b';
                const logStatusBg = l.status === 'delivered' || l.status === 'read' ? 'rgba(16,185,129,0.1)' : l.status === 'failed' ? 'rgba(220,38,38,0.08)' : '#f1f5f9';
                return (
                  <div key={l.id}
                    style={{ borderRadius:10, padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', background:'#f8fafc', border:'1px solid #f1f5f9' }}>
                    <div style={{ minWidth:0, flex:1 }}>
                      <p style={{ margin:0, fontSize:12, fontWeight:700, color:'#0F172A', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {l.recipient_name || l.recipient_id}
                      </p>
                      <p style={{ margin:'2px 0 0', fontSize:10, color:'#64748b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {l.message?.slice(0, 80)}
                      </p>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginLeft:8, flexShrink:0 }}>
                      <span style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', padding:'2px 7px', borderRadius:4, background:logStatusBg, color:logStatusColor }}>{l.status}</span>
                      <span style={{ fontSize:9, fontWeight:600, textTransform:'uppercase', color:'#94a3b8' }}>{l.channel}</span>
                      {l.created_at&&<span style={{ fontSize:9, color:'#94a3b8', display:'flex', alignItems:'center', gap:2 }}><Clock size={8}/>{new Date(l.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}</span>}
                    </div>
                  </div>
                );
              })}
              {(!logs.data || (logs.data as any[]).length === 0) && (
                <div style={{ padding:'40px 16px', textAlign:'center' }}>
                  <MessageSquare size={32} color="#cbd5e1" style={{ marginBottom:12 }}/>
                  <p style={{ fontSize:13, fontWeight:600, color:'#334155', margin:0 }}>No communication logs yet.</p>
                  <p style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>Logs will appear here once automation rules fire.</p>
                </div>
              )}
            </div>
          </m.div>
        </div>
      </PageContainer>
    </AppShell>
  );
}
