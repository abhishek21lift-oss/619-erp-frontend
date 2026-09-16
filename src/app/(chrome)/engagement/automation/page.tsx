'use client';
import { useState, useMemo } from 'react';
import { useStore } from '@tanstack/react-form';
import { m } from 'framer-motion';
import { Bot, Plus, Loader2, Power, PowerOff, Edit2, Trash2, Zap, MessageSquare, Clock, Check, CheckCheck, AlertCircle, Info } from 'lucide-react';
import Guard from '@/components/Guard';
import { PageContainer, PageHero } from '@/components/ui';
import { useAsync } from '@/lib/use-async';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import WhatsAppAutomationPermission from '@/components/modules/WhatsAppAutomationPermission';
import {
  deliveryStages, failureLine, failureTone, shortTime, fullTimestamp,
  type CommunicationLogRow,
} from '@/lib/communication-state';
import {
  TextField, TextAreaField, NumberField, SelectField, FormErrorBanner,
} from '@/components/ui/form';
import { errorMessage } from '@/lib/forms/errors';
import { useAppForm } from '@/lib/forms/useAppForm';
import {
  automationRuleSchema, blankAutomationRule, toAutomationRulePayload,
  variablesFor, MAX_DELAY_MINUTES,
  type AutomationRuleValues, type AutomationRuleState,
} from '@/lib/forms/schemas/automationRule';
import { TEMPLATE_MAX_LENGTH } from '@/lib/forms/domain';

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

/** The one card surface on this page. Token-driven, so dark mode works. */
const CARD = {
  borderRadius: 20,
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
} as const;

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const itemVariants = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] } } };

export default function AutomationPage() { return <Guard role="admin"><AutoContent/></Guard>; }
/**
 * A communication log row, as this page renders it.
 *
 * Extends the shape `communication-state.ts` reasons about rather than
 * restating it: those five timestamp fields are what decide whether a message
 * reached a member, and a second copy of them here is a second thing to get
 * wrong. Everything else is display.
 */
interface CommunicationLogEntry extends CommunicationLogRow {
  id: string;
  recipient_name?: string | null;
  recipient_id?: string | null;
  message?: string | null;
  channel?: string | null;
  created_at?: string | null;
}

/** The 30-day delivery counters, as the stats endpoint returns them. */
interface CommunicationStats {
  total?: number; sent?: number; delivered?: number; read?: number; failed?: number;
}

/** A rule as the list endpoint returns it. */
interface AutomationRule {
  id: string;
  name: string;
  trigger_event: string;
  channel: string;
  template: string;
  delay_minutes: number;
  is_active: boolean;
}

function AutoContent() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AutomationRule | null>(null);
  const { toast } = useToast();

  const rules = useAsync(() => api.automation.rules.list().then(r => r.data as AutomationRule[]), []);
  const logs = useAsync(() => api.automation.communicationLogs.list({ limit: 20 }).then(r => r.data as CommunicationLogEntry[]), []);
  const logStats = useAsync(() => api.automation.communicationLogs.stats().then(r => r.data as CommunicationStats), []);

  const f = useAppForm({
    schema: automationRuleSchema,
    defaultValues: blankAutomationRule(),
    onSubmit: async (values: AutomationRuleValues) => {
      const payload = toAutomationRulePayload(values);
      if (editing) await api.automation.rules.update(editing.id, payload);
      else await api.automation.rules.create(payload);
    },
    onSuccess: () => {
      toast.success(editing ? 'Rule updated' : 'Rule created');
      setEditing(null);
      setShowForm(false);
      rules.refetch();
    },
  });

  /**
   * The variables the SELECTED trigger will actually provide.
   *
   * Subscribed to the live field rather than read once, because the answer
   * changes with the dropdown: `{{amount}}` resolves on a payment and is sent
   * to a member as literal braces on a birthday.
   */
  const selectedEvent = useStore(f.form.store, (st) => st.values.triggerEvent);
  const availableVars = useMemo(
    () => variablesFor(String(selectedEvent ?? 'member_created')),
    [selectedEvent],
  );

  async function toggleRule(rule: AutomationRule) {
    try {
      await api.automation.rules.update(rule.id, { is_active: !rule.is_active });
      rules.refetch();
    } catch (err: unknown) {
      toast.error(errorMessage(err, 'Failed to toggle rule'));
    }
  }

  async function deleteRule(id: string) {
    try {
      await api.automation.rules.delete(id);
      toast.success('Rule deleted');
      rules.refetch();
    } catch (err: unknown) {
      toast.error(errorMessage(err, 'Failed to delete rule'));
    }
  }

  function startEdit(rule: AutomationRule) {
    // `resetTo` rather than a pile of setters: it rebuilds the form from the
    // record AND clears the errors and the success flag, so a red message from
    // the previous rule cannot survive onto this one (§11).
    const next: AutomationRuleState = {
      name: rule.name ?? '',
      triggerEvent: rule.trigger_event ?? 'member_created',
      template: rule.template ?? '',
      delayMinutes: String(rule.delay_minutes ?? 0),
    };
    f.resetTo(next);
    setEditing(rule);
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditing(null);
    f.resetTo(blankAutomationRule());
  }

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
            const keys = ['total','sent','delivered','read','failed'] as const;
            const vals = keys.map(kk => logStats.data?.[kk] ?? 0);
            return (
              <m.div key={k.label} variants={itemVariants}
                style={{ position:'relative', overflow:'hidden', borderRadius:20, padding:'20px 22px', background:k.bg, border:`1px solid ${k.color}22`, boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize:26, fontWeight:800, color:k.color, marginBottom:4 }}>
                  {logStats.loading ? '—' : vals[i]}
                </div>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{k.label}</div>
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
          style={{ ...CARD, boxShadow:'0 4px 20px rgba(0,0,0,0.08)', padding:24, marginBottom:22 }}>
          <h3 style={{ margin:'0 0 20px', fontSize:15, fontWeight:700, color:'var(--text-primary)', display:'flex', gap:8, alignItems:'center' }}>
            <Bot size={16} color="#0067e0"/> {editing?'Edit Rule':'Create Rule'}
          </h3>
          <form noValidate onSubmit={(e) => { e.preventDefault(); f.submit(); }} style={{ display:'grid', gap:14 }}>
            <FormErrorBanner errors={f.errors} />

            <f.form.Field name="name">
              {(field) => (
                <TextField
                  field={field} label="Rule name" required density="compact"
                  placeholder="e.g. Welcome Message" maxLength={120}
                  serverError={f.errors.fieldErrors.name}
                />
              )}
            </f.form.Field>

            <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap:14 }}>
              <f.form.Field name="triggerEvent">
                {(field) => (
                  <SelectField
                    field={field} label="Trigger event" required density="compact"
                    options={TRIGGER_EVENTS.map(ev => ({
                      value: ev.value, label: `${ev.label} — ${ev.hint}`,
                    }))}
                    serverError={f.errors.fieldErrors.trigger_event}
                  />
                )}
              </f.form.Field>
              {/* Only WhatsApp delivers. The rules table accepts sms and email,
                  and the engine filters both out — a studio that picked one got
                  a rule that saved, showed as Active and never fired. Offering
                  a choice with one option is worse than offering none, so this
                  is a disabled field that says what it is rather than a select
                  that pretends. */}
              <div>
                <span className="mb-1 block text-[10px] font-[700] uppercase tracking-wide" style={{ color:'var(--text-muted)' }}>
                  Channel
                </span>
                <p
                  className="flex items-center rounded-[var(--radius-sm)] px-3.5 text-[13px] font-[500]"
                  style={{
                    minHeight: 44, background:'var(--bg-base)',
                    border:'1px solid var(--border-2)', color:'var(--text-muted)',
                  }}
                  title="Automated messages go out on your studio's connected WhatsApp number. SMS and email are not yet delivered."
                >
                  WhatsApp
                </p>
              </div>
            </div>

            <f.form.Field name="template">
              {(field) => (
                <TextAreaField
                  field={field} label="Message" required density="compact" rows={3}
                  maxLength={TEMPLATE_MAX_LENGTH} showCount
                  placeholder={`Hi {{name}}, …`}
                  description={
                    availableVars.length > 1
                      ? `Available for this trigger: ${availableVars.map(v => `{{${v}}}`).join(', ')}`
                      : 'This trigger provides only {{name}} — anything else is sent to the member exactly as typed.'
                  }
                  serverError={f.errors.fieldErrors.template}
                />
              )}
            </f.form.Field>

            <f.form.Field name="delayMinutes">
              {(field) => (
                <NumberField
                  field={field} label="Delay" required density="compact" mode="integer"
                  min={0} max={MAX_DELAY_MINUTES} suffix="min"
                  placeholder="0"
                  description="0 sends immediately. A week is the most this can be held for."
                  serverError={f.errors.fieldErrors.delay_minutes}
                />
              )}
            </f.form.Field>

            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button type="button" onClick={cancelForm}
                style={{ fontSize:12, fontWeight:700, padding:'8px 18px', borderRadius:10, border:'1px solid var(--border-2)', background:'transparent', color:'var(--text-muted)', cursor:'pointer' }}>Cancel</button>
              <button type="submit" disabled={!f.canSubmit}
                style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:700, padding:'8px 20px', borderRadius:12, background:'linear-gradient(135deg, #0067e0, #0059ce)', color:'#fff', border:'none', cursor:f.isSubmitting?'not-allowed':'pointer', opacity:f.isSubmitting?0.7:1, boxShadow:'0 4px 16px rgba(0,103,224,0.35)' }}>
                {f.isSubmitting ? <><Loader2 size={13} className="animate-spin"/> Saving…</> : <><Plus size={13}/> {editing?'Update Rule':'Create Rule'}</>}
              </button>
            </div>
          </form>
        </m.div>
      )}

      {/* ── RULES + LOGS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap:20 }}>
        {/* Active Rules */}
        <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          style={{ ...CARD, boxShadow:'var(--shadow-xs)', padding:20 }}>
          <h2 style={{ fontSize:16, fontWeight:700, color:'var(--text-primary)', margin:'0 0 16px', display:'flex', alignItems:'center', gap:8 }}>
            <Zap size={16} color="#0067e0"/> Active Rules
          </h2>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {((rules.data as AutomationRule[]) || []).map((r) => (
              <m.div key={r.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                style={{ borderRadius:12, padding:'14px 16px', background:r.is_active?'rgba(0,103,224,0.05)':'var(--bg-subtle)', border:`1px solid ${r.is_active?'rgba(0,103,224,0.2)':'var(--border)'}`, opacity:r.is_active?1:0.65, transition:'all 0.2s' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ margin:0, fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>{r.name}</p>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:5, flexWrap:'wrap' }}>
                      <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:5, background:'rgba(0,103,224,0.1)', color:'#0067e0', textTransform:'capitalize' }}>
                        {r.trigger_event?.replace(/_/g, ' ')}
                      </span>
                      <span style={{ fontSize:10, color:'var(--text-muted)' }}>via {r.channel}</span>
                      {r.delay_minutes > 0 && <span style={{ fontSize:10, color:'var(--text-muted)' }}>· {r.delay_minutes}m delay</span>}
                    </div>
                    {r.template && (
                      <p style={{ margin:'6px 0 0', fontSize:11, color:'#94a3b8', lineHeight:1.4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:300 }}>{r.template}</p>
                    )}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
                    <button onClick={() => startEdit(r)} title="Edit rule"
                      style={{ display:'flex', alignItems:'center', justifyContent:'center', width:30, height:30, borderRadius:7, border:'1px solid var(--border)', background:'var(--bg-subtle)', color:'var(--text-muted)', cursor:'pointer' }}>
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
            {(!rules.data || (rules.data as AutomationRule[]).length === 0) && (
              <div style={{ padding:'40px 16px', textAlign:'center' }}>
                <Bot size={32} color="var(--text-disabled)" style={{ marginBottom:12 }}/>
                <p style={{ fontSize:13, fontWeight:600, color:'#334155', margin:0 }}>No automation rules yet.</p>
                <p style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>Click "New Rule" to create your first one.</p>
              </div>
            )}
          </div>
        </m.div>

        {/* Recent Logs */}
        <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay:0.1 }}
          style={{ ...CARD, boxShadow:'var(--shadow-xs)', padding:20 }}>
          <h2 style={{ fontSize:16, fontWeight:700, color:'var(--text-primary)', margin:'0 0 16px', display:'flex', alignItems:'center', gap:8 }}>
            <MessageSquare size={16} color="#0067e0"/> Recent Logs
          </h2>
          <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:480, overflowY:'auto' }}>
            {(logs.data ?? []).map((l) => {
              const stages = deliveryStages(l);
              const failure = failureLine(l);
              const tone = failureTone(l);
              const logStatusColor = l.status === 'delivered' || l.status === 'read' ? '#10b981' : l.status === 'failed' ? '#dc2626' : 'var(--text-muted)';
              const logStatusBg = l.status === 'delivered' || l.status === 'read' ? 'rgba(16,185,129,0.1)' : l.status === 'failed' ? 'rgba(220,38,38,0.08)' : 'var(--bg-subtle)';
              return (
                <div key={l.id}
                  style={{ borderRadius:10, padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', background:'var(--bg-subtle)', border:'1px solid var(--border)' }}>
                  <div style={{ minWidth:0, flex:1 }}>
                    <p style={{ margin:0, fontSize:12, fontWeight:700, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {l.recipient_name || l.recipient_id}
                    </p>
                    <p style={{ margin:'2px 0 0', fontSize:10, color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
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
                            {i > 0 && <span aria-hidden="true" style={{ color:'var(--text-disabled)', fontSize:10, marginRight:3 }}>→</span>}
                            {st.label === 'Read'
                              ? <CheckCheck size={10} color="#10b981" aria-hidden="true"/>
                              : st.label === 'Delivered'
                                ? <CheckCheck size={10} color="var(--text-muted)" aria-hidden="true"/>
                                : <Check size={10} color="#94a3b8" aria-hidden="true"/>}
                            <span
                              title={`${st.label} ${fullTimestamp(st.at)}`}
                              style={{ fontSize:10, color: st.label === 'Read' ? 'var(--success-text, #059669)' : 'var(--text-muted)', fontVariantNumeric:'tabular-nums' }}
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
                        badges.

                        A still-QUEUED row carries the LAST ATTEMPT's reason,
                        not a verdict: the worker records it and leaves the row
                        queued so the next attempt re-sends. Red there would
                        tell a studio their message is lost while it is still
                        on its way, so it reads amber and says which it is. */}
                    {failure && (
                      <div style={{ margin:'4px 0 0', display:'flex', alignItems:'flex-start', gap:4 }}>
                        {tone === 'error'
                          ? <AlertCircle size={11} color="#dc2626" style={{ flexShrink:0, marginTop:1 }} aria-hidden="true"/>
                          : <Info size={11} color={tone === 'retrying' ? '#b45309' : 'var(--text-muted)'} style={{ flexShrink:0, marginTop:1 }} aria-hidden="true"/>}
                        <span style={{ fontSize:10, color: tone === 'error' ? '#b91c1c' : tone === 'retrying' ? '#b45309' : 'var(--text-muted)', lineHeight:1.4 }}>
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
            {(!logs.data || logs.data.length === 0) && (
              <div style={{ padding:'40px 16px', textAlign:'center' }}>
                <MessageSquare size={32} color="var(--text-disabled)" style={{ marginBottom:12 }}/>
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
