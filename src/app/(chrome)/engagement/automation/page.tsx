'use client';
import { useState } from 'react';
import { m } from 'framer-motion';
import { Bot, Plus, Loader2, Power, PowerOff, Edit2, Trash2, Zap, MessageSquare, Clock, Check, CheckCheck, AlertCircle, Info } from 'lucide-react';
import Guard from '@/components/Guard';
import { PageContainer, PageHero } from '@/components/ui';
import { useAsync } from '@/lib/use-async';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import WhatsAppAutomationPermission from '@/components/modules/WhatsAppAutomationPermission';
import { deliveryStages, failureText, isBenignFailure, shortTime, fullTimestamp } from '@/lib/communication-state';

// The eleven events that something in the backend actually emits, and a note
// on when each one fires — because "Missed Attendance" tells a studio owner
// what the rule is called and not whether it will reach anybody today.
//
// The twelfth value the database allows, `trial_completed`, is deliberately
// absent: nothing writes a completed trial anywhere in the product, so a rule
// bound to it could never fire. It has never been offered here, and it stays
// unoffered rather than becoming a switch that does nothing.
//
// Every one of these is `whatsapp`. The channel column accepts sms and email
// too and two entries in this list used to default to sms — which produced a
// rule the automation engine filters out on the way past, because there is no
// SMS transport behind it. The rule saved, showed as Active, and could never
// fire. See the channel selector below.
const TRIGGER_EVENTS = [
  { value: 'member_created', label: 'Member Created', hint: 'when a client is enrolled' },
  { value: 'lead_created', label: 'Lead Created', hint: 'when a lead is captured' },
  { value: 'payment_received', label: 'Payment Received', hint: 'when a payment is recorded' },
  { value: 'session_low', label: 'Low Session Balance', hint: 'at 3 sessions or fewer remaining' },
  { value: 'trial_scheduled', label: 'Trial Scheduled', hint: 'when a lead is marked trial scheduled' },
  { value: 'membership_expiring', label: 'Membership Expiring', hint: '7, 3 and 1 days before expiry' },
  { value: 'membership_expired', label: 'Membership Expired', hint: 'the morning after expiry' },
  { value: 'birthday', label: 'Birthday', hint: 'on the day, current clients only' },
  { value: 'anniversary', label: 'Anniversary', hint: 'each year they joined' },
  { value: 'attendance_missed', label: 'Missed Attendance', hint: 'after 14 days without a check-in' },
  { value: 'followup_due', label: 'Follow-Up Due', hint: "when a lead's follow-up date passes" },
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
      // 'whatsapp' rather than a form value. The engine serves this channel
      // and no other, so saving an edited rule as anything else stores a rule
      // that will not fire — and re-saving a legacy sms rule through this form
      // repairs it rather than preserving the reason it never worked.
      const payload = {
        name, trigger_event: triggerEvent, channel: 'whatsapp',
        template, delay_minutes: parseInt(delayMinutes),
      };
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
    setName(rule.name); setTriggerEvent(rule.trigger_event);
    setTemplate(rule.template || ''); setDelayMinutes(String(rule.delay_minutes || 0));
    setEditing(rule); setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false); setEditing(null);
    setName(''); setTemplate(''); setDelayMinutes('0'); setTriggerEvent('member_created');
  }

  const inp = { width:'100%', border:'1px solid #cbd5e1', borderRadius:10, padding:'10px 14px', fontSize:13, fontWeight:500, color:'#0F172A', background:'#f8fafc', fontFamily:'inherit' } as const;

  return (
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

      {/* Permission first, deliberately. A studio that writes three rules and
          wonders why nothing sends should find the answer above the form
          rather than in Settings — and it is the reason the log below stays
          empty until somebody switches this on. */}
      <WhatsAppAutomationPermission />

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
              <select aria-label="Trigger event" value={triggerEvent} onChange={e => setTriggerEvent(e.target.value)} style={inp}>
                {TRIGGER_EVENTS.map(ev => (
                  <option key={ev.value} value={ev.value}>{ev.label} — {ev.hint}</option>
                ))}
              </select>
              {/* Only WhatsApp delivers. The rules table accepts sms and email,
                  and the engine filters both out — a studio that picked one got
                  a rule that saved, showed as Active and never fired. Offering
                  a choice with one option is worse than offering none, so this
                  is a disabled field that says what it is rather than a select
                  that pretends. */}
              <input aria-label="Channel" value="WhatsApp" readOnly disabled
                title="Automated messages go out on your studio's connected WhatsApp number. SMS and email are not yet delivered."
                style={{ ...inp, background:'#f8fafc', color:'#64748b', cursor:'not-allowed' }} />
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
              const stages = deliveryStages(l);
              const failure = failureText(l.failure_reason);
              const benign = isBenignFailure(l.failure_reason);
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

                    {/* What actually happened to this message.
                        Driven by the timestamps rather than by `status`: status
                        is one forward-only value, so a READ message reports
                        'read' and says nothing about when it was delivered —
                        and delivered_at is the figure a studio chasing a silent
                        client actually wants. Tabular numerals so the times
                        line up down the list instead of jittering. */}
                    {stages.length > 0 && (
                      <div style={{ margin:'4px 0 0', display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                        {stages.map((st, i) => (
                          <span key={st.label} style={{ display:'flex', alignItems:'center', gap:3 }}>
                            {i > 0 && <span aria-hidden="true" style={{ color:'#cbd5e1', fontSize:10, marginRight:3 }}>→</span>}
                            {st.label === 'Read'
                              ? <CheckCheck size={10} color="#10b981" aria-hidden="true"/>
                              : st.label === 'Delivered'
                                ? <CheckCheck size={10} color="#64748b" aria-hidden="true"/>
                                : <Check size={10} color="#94a3b8" aria-hidden="true"/>}
                            <span
                              title={`${st.label} ${fullTimestamp(st.at)}`}
                              style={{ fontSize:10, color: st.label === 'Read' ? '#059669' : '#64748b', fontVariantNumeric:'tabular-nums' }}
                            >
                              {st.label} {shortTime(st.at)}
                            </span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Why it failed, in words, with the fix where there is one.
                        The reason was already on the row and never shown, so a
                        studio whose WhatsApp had logged out saw "failed" and no
                        way to learn that rescanning the QR resolves it.
                        duplicate_in_flight is send-once working correctly, so
                        it reads as a note — a red badge for "we declined to
                        message your client twice" teaches people to ignore red
                        badges. */}
                    {failure && (
                      <div style={{ margin:'4px 0 0', display:'flex', alignItems:'flex-start', gap:4 }}>
                        {benign
                          ? <Info size={11} color="#64748b" style={{ flexShrink:0, marginTop:1 }} aria-hidden="true"/>
                          : <AlertCircle size={11} color="#dc2626" style={{ flexShrink:0, marginTop:1 }} aria-hidden="true"/>}
                        <span style={{ fontSize:10, color: benign ? '#64748b' : '#b91c1c', lineHeight:1.4 }}>
                          {failure}
                        </span>
                      </div>
                    )}
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
  );
}
