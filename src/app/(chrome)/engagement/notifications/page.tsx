'use client';
import { useState, useEffect } from 'react';
import { useStore } from '@tanstack/react-form';
import { m } from 'framer-motion';
import Guard from '@/components/Guard';
import { PullToRefresh, PageContainer, PageHero } from '@/components/ui';
import { Bell, Send, Users, CheckCircle2, Clock, Plus, Trash2, MessageSquare, RefreshCw, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { TextField, TextAreaField, SelectField, FormErrorBanner } from '@/components/ui/form';
import { errorMessage } from '@/lib/forms/errors';
import { useAppForm } from '@/lib/forms/useAppForm';
import {
  notificationSchema, blankNotification, toNotificationPayload,
  AUDIENCE_OPTIONS, TYPE_OPTIONS, audienceLabel, notificationTypeLabel,
  NOTIFICATION_LIMITS, type NotificationValues,
} from '@/lib/forms/schemas/notification';


interface Notif { id:string; title:string; body:string; type:string; audience:string; status:'sent'|'scheduled'; created_at:string; recipients:number; }

const KPIS = [
  { label:'Total', key:'total', color:'#0067e0', icon:<Bell size={18}/>, bg:'linear-gradient(135deg, rgba(0,103,224,0.1), rgba(0,103,224,0.05))' },
  { label:'Sent', key:'sent', color:'#10b981', icon:<CheckCircle2 size={18}/>, bg:'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.05))' },
  { label:'Scheduled', key:'scheduled', color:'#f59e0b', icon:<Clock size={18}/>, bg:'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(217,119,6,0.05))' },
  { label:'Active Members', key:'members', color:'#0067e0', icon:<Users size={18}/>, bg:'linear-gradient(135deg, rgba(0,103,224,0.1), rgba(0,89,206,0.05))' },
];

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const itemVariants = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] } } };

export default function NotificationsPage() { return <Guard role="trainer"><NContent/></Guard>; }
function NContent() {
  const { toast } = useToast();
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [memberCount, setMemberCount] = useState(0);

  async function load() {
    setLoading(true); setError(null);
    try {
      const [historyRes, membersRes] = await Promise.all([
        api.communication.history(),
        api.clients.list({status:'active'}).catch(() => []),
      ]);
      setItems((Array.isArray(historyRes) ? historyRes : []) as Notif[]);
      setMemberCount(Array.isArray(membersRes) ? membersRes.length : 0);
    } catch (err: unknown) { setError(errorMessage(err, 'Failed to load history')); }
    finally { setLoading(false); }
  }

  const f = useAppForm({
    schema: notificationSchema,
    defaultValues: blankNotification(),
    onSubmit: async (values: NotificationValues) => {
      // `toNotificationPayload` sends the CANONICAL audience — 'dues', not
      // 'Has Outstanding Dues'. See the note in the schema: the label matched
      // no branch in routes/communication.js, so every targeted send fell
      // through to "every active member".
      const res = await api.communication.send(toNotificationPayload(values)) as { recipients: number };
      await load();
      toast.success(`Notification sent to ${res?.recipients ?? 0} members`);
    },
    onSuccess: () => {
      setShowForm(false);
      f.resetTo(blankNotification());
    },
  });

  /** The chosen audience, so the form can say who it will actually reach. */
  const chosenAudience = useStore(f.form.store, (st) => String(st.values.audience ?? 'all'));
  const audienceHint = AUDIENCE_OPTIONS.find((a) => a.value === chosenAudience)?.hint ?? '';

  async function handleDelete(id: string) {
    try { await api.communication.delete(id); setItems(p => p.filter(x => x.id !== id)); toast.success('Notification deleted'); }
    catch (err: unknown) { toast.error(errorMessage(err, 'Failed to delete notification')); }
  }

  useEffect(() => { load(); }, []);

  const total=items.length, sent=items.filter(x=>x.status==='sent').length, scheduled=items.filter(x=>x.status==='scheduled').length;
  /*
   * Both read the CANONICAL type and tolerate the display labels already in
   * the column. New rows store 'birthday'; rows sent before this store
   * 'Birthday 🎂'. Matching only one spelling would give every historic row
   * the default icon, or every new one.
   */
  const typeKey = (t: string) => {
    const k = String(t ?? '').toLowerCase();
    if (k.includes('birthday')) return 'birthday';
    if (k.includes('expiry')) return 'expiry';
    if (k.includes('due')) return 'dues';
    if (k.includes('anniversary')) return 'anniversary';
    return 'announcement';
  };
  const typeColor = (t: string) => {
    const k = typeKey(t);
    return k === 'expiry' ? '#f59e0b' : k === 'dues' ? '#ef4444' : '#0067e0';
  };
  const typeEmoji = (t: string) => {
    const k = typeKey(t);
    return k === 'birthday' ? '🎂' : k === 'expiry' ? '⚠️'
      : k === 'dues' ? '💳' : k === 'anniversary' ? '🎉' : '📢';
  };

  return (
    <PullToRefresh onRefresh={load}>
    <PageContainer>
      <PageHero
        icon={<Bell size={20} />}
        title="Notifications"
        subtitle="Send alerts, reminders & announcements to members."
        actions={
          <button type="button" onClick={()=>setShowForm(v=>!v)}
            className="inline-flex items-center gap-1.5 rounded-full h-9 px-3.5 text-[12px] font-semibold transition active:scale-95"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', color: '#fff' }}>
            <Plus size={14}/> {showForm?'Cancel':'Compose'}
          </button>
        }
      />

      {error && (
        <m.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          style={{ borderRadius:14, padding:'14px 20px', background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626', fontWeight:600, fontSize:13 }}>
          {error}
        </m.div>
      )}

      {/* ── KPI CARDS ── */}
      <m.div variants={containerVariants} initial="hidden" animate="visible"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {KPIS.map((k,i)=>{
          const vals = [total, sent, scheduled, memberCount];
          return (
            <m.div key={k.label} variants={itemVariants}
              style={{ position:'relative', overflow:'hidden', borderRadius:20, padding:'22px 24px', background:k.bg, border:`1px solid ${k.color}22`, boxShadow:'0 2px 12px rgba(0,0,0,0.06)', cursor:'default', transition:'all 0.3s ease' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                <div style={{ width:36, height:36, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', background:`${k.color}18` }}>
                  {k.icon}
                </div>
                <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)' }}>{k.label}</span>
              </div>
              <div style={{ fontSize:30, fontWeight:800, color:k.color, lineHeight:1.2, letterSpacing:'-0.02em' }}>{loading ? '—' : vals[i]}</div>
            </m.div>
          );
        })}
      </m.div>

      {/* ── COMPOSE FORM ── */}
      {showForm&&(
        <m.div initial={{ opacity: 0, y: -10, scale:0.98 }} animate={{ opacity: 1, y: 0, scale:1 }}
          style={{ borderRadius:20, background:'var(--bg-card)', border:'1px solid var(--border)', boxShadow:'0 4px 20px rgba(0,0,0,0.08)', padding:24 }}>
          <h3 style={{ margin:'0 0 20px', fontSize:15, fontWeight:700, color:'var(--text-primary)', display:'flex', gap:8, alignItems:'center' }}><Send size={16} color="#0067e0"/> Compose Notification</h3>
          <form noValidate onSubmit={(e) => { e.preventDefault(); f.submit(); }} style={{ display:'grid', gap:16 }}>
            <FormErrorBanner errors={f.errors} />
            <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap:14 }}>
              <f.form.Field name="type">
                {(field) => (
                  <SelectField
                    field={field} label="Type" required density="compact"
                    options={TYPE_OPTIONS}
                    serverError={f.errors.fieldErrors.type}
                  />
                )}
              </f.form.Field>
              <f.form.Field name="audience">
                {(field) => (
                  <SelectField
                    field={field} label="Audience" required density="compact"
                    options={AUDIENCE_OPTIONS.map(({ value, label }) => ({ value, label }))}
                    // Who this will actually reach, stated BEFORE the send.
                    // The count used to appear only in the success toast,
                    // after the message had already gone out.
                    description={audienceHint}
                    serverError={f.errors.fieldErrors.audience}
                  />
                )}
              </f.form.Field>
            </div>
            <f.form.Field name="title">
              {(field) => (
                <TextField
                  field={field} label="Title" required density="compact"
                  placeholder="e.g. Your membership expires soon!"
                  maxLength={NOTIFICATION_LIMITS.title} showCount
                  serverError={f.errors.fieldErrors.title}
                />
              )}
            </f.form.Field>
            <f.form.Field name="body">
              {(field) => (
                <TextAreaField
                  field={field} label="Message" required density="compact" rows={4}
                  placeholder="Write your notification message…"
                  maxLength={NOTIFICATION_LIMITS.body} showCount
                  serverError={f.errors.fieldErrors.body}
                />
              )}
            </f.form.Field>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button type="button" onClick={()=>setShowForm(false)}
                style={{ fontSize:12, fontWeight:700, padding:'8px 18px', borderRadius:10, border:'1px solid var(--border-2)', background:'transparent', color:'var(--text-muted)', cursor:'pointer' }}>Cancel</button>
              <button type="submit" disabled={!f.canSubmit}
                style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:700, padding:'8px 20px', borderRadius:12, background:'linear-gradient(135deg, #0067e0, #0059ce)', color:'#fff', border:'none', cursor:f.isSubmitting?'not-allowed':'pointer', opacity:f.isSubmitting?0.7:1, boxShadow:'0 4px 16px rgba(0,103,224,0.35)' }}>
                {f.isSubmitting?<><RefreshCw size={13} className="animate-spin"/> Sending…</>:<><Send size={13}/> Send Now</>}
              </button>
            </div>
          </form>
        </m.div>
      )}

      {/* ── HISTORY LIST ── */}
      <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        style={{ borderRadius:20, background:'var(--bg-card)', border:'1px solid var(--border)', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', overflow:'hidden' }}>
        <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', fontWeight:700, fontSize:14, color:'var(--text-primary)', display:'flex', alignItems:'center', gap:8, background:'var(--bg-subtle)' }}>
          <MessageSquare size={15} color="#0067e0"/> Notification History ({items.length})
        </div>
        {loading ? (
          <div style={{ padding:'56px 20px', textAlign:'center' }}><Loader2 size={28} color="#cbd5e1" style={{ animation:'spin 1s linear infinite' }} /></div>
        ) : items.length === 0 ? (
          <div style={{ padding:'56px 20px', textAlign:'center' }}>
            <Bell size={36} color="#cbd5e1" style={{ marginBottom:14 }}/>
            <p style={{ fontSize:15, fontWeight:700, color:'var(--text-secondary)', margin:0 }}>No notifications sent yet</p>
            <p style={{ fontSize:12, color:'#94a3b8', marginTop:4 }}>Click "Compose" to send your first notification.</p>
          </div>
        ) : (
          items.map(n=>(
            <div key={n.id} style={{ display:'flex', gap:14, padding:'16px 20px', borderBottom:'1px solid #f1f5f9', alignItems:'flex-start', transition:'background 150ms' }}
              onMouseEnter={e=>e.currentTarget.style.background='var(--bg-subtle)'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <div style={{ width:44, height:44, borderRadius:12, background:`${typeColor(n.type)}15`, color:typeColor(n.type), display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:22 }}>
                {typeEmoji(n.type)}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:4 }}>
                  <span style={{ fontWeight:700, fontSize:14, color:'var(--text-primary)' }}>{n.title}</span>
                  <span style={{ fontSize:11, fontWeight:700, padding:'2px 10px', borderRadius:20, background:n.status==='sent'?'rgba(16,185,129,0.12)':'rgba(245,158,11,0.12)', color:n.status==='sent'?'#10b981':'#d97706', textTransform:'capitalize' }}>{n.status}</span>
                </div>
                <p style={{ margin:'0 0 8px', fontSize:13, color:'var(--text-secondary)', lineHeight:1.6 }}>{n.body}</p>
                <div style={{ display:'flex', gap:16, fontSize:11, color:'var(--text-muted)', alignItems:'center', flexWrap:'wrap' }}>
                  <span style={{ display:'flex', alignItems:'center', gap:4 }}><Users size={11}/>{n.recipients} recipients</span>
                  <span style={{ display:'flex', alignItems:'center', gap:4 }}><Clock size={11}/>{n.created_at ? new Date(n.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'}</span>
                  <span style={{ background:'var(--bg-subtle)', padding:'2px 8px', borderRadius:6, fontSize:11, fontWeight:600, color:'var(--text-muted)', border:'1px solid var(--border)' }}>{audienceLabel(n.audience)}</span>
                </div>
              </div>
              <button onClick={()=>handleDelete(n.id)}
                style={{ display:'flex', alignItems:'center', justifyContent:'center', width:32, height:32, borderRadius:8, border:'none', background:'rgba(239,68,68,0.08)', color:'#dc2626', cursor:'pointer', flexShrink:0 }}>
                <Trash2 size={14}/>
              </button>
            </div>
          ))
        )}
      </m.div>
    </PageContainer>
    </PullToRefresh>
  );
}
