'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, Plus, Loader2, Power, PowerOff } from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { useAsync } from '@/lib/use-async';
import { api } from '@/lib/api';
import { Button } from '@/components/ui';

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

export default function AutomationPage() {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [triggerEvent, setTriggerEvent] = useState('member_created');
  const [channel, setChannel] = useState('whatsapp');
  const [template, setTemplate] = useState('');
  const [delayMinutes, setDelayMinutes] = useState('0');
  const [saving, setSaving] = useState(false);

  const rules = useAsync(() => api.automation.rules.list().then(r => r.data as any[]), []);
  const logs = useAsync(() => api.automation.communicationLogs.list({ limit: 20 }).then(r => r.data as any[]), []);
  const logStats = useAsync(() => api.automation.communicationLogs.stats().then(r => r.data as any), []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.automation.rules.create({
        name, trigger_event: triggerEvent, channel,
        template, delay_minutes: parseInt(delayMinutes),
      });
      setName(''); setTemplate(''); setDelayMinutes('0');
      setShowForm(false); rules.refetch();
    } finally { setSaving(false); }
  }

  async function toggleRule(rule: any) {
    await api.automation.rules.update(rule.id, { is_active: !rule.is_active });
    rules.refetch();
  }

  return (
    <Guard role="admin">
      <AppShell>
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-[24px] p-8 sm:p-10 mb-6"
            style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #3730a3 50%, #6366f1 100%)', boxShadow: '0 20px 60px rgba(55,48,163,0.3)' }}>
            <div className="relative z-10">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <Bot size={16} style={{ color: '#a5b4fc' }} />
                </div>
                <span className="text-[11px] font-[650] uppercase tracking-[0.08em]" style={{ color: '#a5b4fc' }}>Communication</span>
              </div>
              <h1 className="text-[32px] sm:text-[40px] font-[860] tracking-[-0.03em] leading-tight" style={{ color: '#ffffff' }}>
                Automation Rules
              </h1>
              <p className="mt-3 max-w-xl text-[14px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Automate WhatsApp, SMS, and email messages for welcome, follow-up, renewal, birthday, and promotions.
              </p>
            </div>
          </motion.div>

          {/* Stats */}
          {logStats.data && (
            <div className="grid grid-cols-5 gap-3 mb-6">
              {[
                { label: 'Total (30d)', value: (logStats.data as any).total, color: '#6366f1' },
                { label: 'Sent', value: (logStats.data as any).sent, color: '#3b82f6' },
                { label: 'Delivered', value: (logStats.data as any).delivered, color: '#10b981' },
                { label: 'Read', value: (logStats.data as any).read, color: '#8b5cf6' },
                { label: 'Failed', value: (logStats.data as any).failed, color: '#ef4444' },
              ].map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="rounded-[14px] p-4 text-center" style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.9)' }}>
                  <p className="text-[20px] font-[800]" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[10px] font-medium mt-1" style={{ color: 'rgb(148,163,184)' }}>{s.label}</p>
                </motion.div>
              ))}
            </div>
          )}

          <div className="flex justify-end mb-4">
            <Button onClick={() => setShowForm(!showForm)} className="!rounded-[14px] !font-[700]"
              style={{ background: 'linear-gradient(135deg, #3730a3, #6366f1)', color: '#fff' }}>
              <Plus size={16} /> {showForm ? 'Cancel' : 'New Rule'}
            </Button>
          </div>

          {showForm && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-[20px] p-6 mb-6" style={{ background: 'var(--bg-card)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.95)' }}>
              <form onSubmit={handleCreate} className="space-y-3">
                <input required placeholder="Rule name (e.g., Welcome Message)" value={name} onChange={e => setName(e.target.value)}
                  className="w-full rounded-[12px] px-4 py-2.5 text-sm outline-none"
                  style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)', color: 'rgb(15,23,42)' }} />
                <div className="grid grid-cols-2 gap-3">
                  <select value={triggerEvent} onChange={e => {
                    setTriggerEvent(e.target.value);
                    const ev = TRIGGER_EVENTS.find(t => t.value === e.target.value);
                    if (ev) setChannel(ev.channel);
                  }} className="rounded-[12px] px-4 py-2.5 text-sm outline-none"
                    style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)', color: 'rgb(15,23,42)' }}>
                    {TRIGGER_EVENTS.map(ev => <option key={ev.value} value={ev.value}>{ev.label}</option>)}
                  </select>
                  <select value={channel} onChange={e => setChannel(e.target.value)}
                    className="rounded-[12px] px-4 py-2.5 text-sm outline-none"
                    style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)', color: 'rgb(15,23,42)' }}>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="sms">SMS</option>
                    <option value="email">Email</option>
                  </select>
                </div>
                <textarea required placeholder="Message template (use {{name}}, {{amount}}, etc.)" rows={3} value={template}
                  onChange={e => setTemplate(e.target.value)}
                  className="w-full rounded-[12px] px-4 py-2.5 text-sm outline-none resize-none"
                  style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)', color: 'rgb(15,23,42)' }} />
                <input type="number" placeholder="Delay (minutes, 0 = instant)" value={delayMinutes} onChange={e => setDelayMinutes(e.target.value)}
                  className="w-full rounded-[12px] px-4 py-2.5 text-sm outline-none"
                  style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)', color: 'rgb(15,23,42)' }} />
                <Button type="submit" disabled={saving} className="!w-full !rounded-[14px] !py-3 !font-[700]"
                  style={{ background: 'linear-gradient(135deg, #3730a3, #6366f1)', color: '#fff' }}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Create Rule
                </Button>
              </form>
            </motion.div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-[20px] p-6" style={{ background: 'var(--bg-card)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.95)' }}>
              <h2 className="text-[18px] font-[760] mb-4" style={{ color: 'rgb(15,23,42)' }}>Active Rules</h2>
              <div className="space-y-3">
                {(rules.data as any[] || []).map((r: any) => (
                  <div key={r.id} className="rounded-[14px] p-4 flex items-center justify-between"
                    style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.04)', opacity: r.is_active ? 1 : 0.5 }}>
                    <div>
                      <p className="text-[13px] font-[700]" style={{ color: 'rgb(15,23,42)' }}>{r.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-[4px] capitalize"
                          style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>{r.trigger_event?.replace(/_/g, ' ')}</span>
                        <span className="text-[10px]" style={{ color: 'rgb(148,163,184)' }}>via {r.channel}</span>
                        {r.delay_minutes > 0 && <span className="text-[10px]" style={{ color: 'rgb(148,163,184)' }}>· {r.delay_minutes}m delay</span>}
                      </div>
                    </div>
                    <button onClick={() => toggleRule(r)} className="p-2 rounded-[8px] transition-colors"
                      style={{ background: r.is_active ? 'rgba(16,185,129,0.1)' : 'rgba(100,116,139,0.1)' }}>
                      {r.is_active ? <Power size={14} style={{ color: '#10b981' }} /> : <PowerOff size={14} style={{ color: 'rgb(148,163,184)' }} />}
                    </button>
                  </div>
                ))}
                {(!rules.data || (rules.data as any[]).length === 0) && (
                  <p className="text-center py-6 text-sm" style={{ color: 'rgb(148,163,184)' }}>No automation rules yet.</p>
                )}
              </div>
            </div>

            <div className="rounded-[20px] p-6" style={{ background: 'var(--bg-card)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.95)' }}>
              <h2 className="text-[18px] font-[760] mb-4" style={{ color: 'rgb(15,23,42)' }}>Recent Communication Logs</h2>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {((logs.data || []) as any[]).map((l: any) => (
                  <div key={l.id} className="rounded-[10px] p-3 flex items-center justify-between"
                    style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.04)' }}>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold truncate" style={{ color: 'rgb(15,23,42)' }}>{l.recipient_name || l.recipient_id}</p>
                      <p className="text-[10px] truncate" style={{ color: 'rgb(148,163,184)' }}>{l.message?.slice(0, 60)}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-2 shrink-0">
                      <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-[4px]"
                        style={{
                          background: l.status === 'delivered' || l.status === 'read' ? 'rgba(16,185,129,0.1)' :
                            l.status === 'failed' ? 'rgba(239,68,68,0.1)' : 'rgba(148,163,184,0.1)',
                          color: l.status === 'delivered' || l.status === 'read' ? '#10b981' :
                            l.status === 'failed' ? '#ef4444' : 'rgb(148,163,184)',
                        }}>{l.status}</span>
                      <span className="text-[9px] font-medium uppercase" style={{ color: 'rgb(148,163,184)' }}>{l.channel}</span>
                    </div>
                  </div>
                ))}
                {(!logs.data || (logs.data as any[]).length === 0) && (
                  <p className="text-center py-6 text-sm" style={{ color: 'rgb(148,163,184)' }}>No communication logs yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    </Guard>
  );
}
