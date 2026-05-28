'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarCheck, Plus, Loader2 } from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { useAsync } from '@/lib/use-async';
import { api } from '@/lib/api';
import { Button } from '@/components/ui';

export default function TrialSessionsPage() {
  const [leadId, setLeadId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [trainerId, setTrainerId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const leads = useAsync(() => api.leads.list({ status: 'interested' }).then(r => r.data), []);
  const trainers = useAsync(() => api.trainers.list(), []);
  const trials = useAsync(() => {
    const all: any[] = [];
    return all;
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!leadId || !scheduledAt) return;
    setSaving(true);
    try {
      await api.leads.update(leadId, { status: 'trial_booked' });
      setScheduledAt(''); setNotes('');
    } finally { setSaving(false); }
  }

  return (
    <Guard>
      <AppShell>
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-[24px] p-8 sm:p-10 mb-6"
            style={{ background: 'linear-gradient(135deg, #155e75 0%, #0369a1 50%, #0ea5e9 100%)', boxShadow: '0 20px 60px rgba(3,105,161,0.3)' }}>
            <div className="relative z-10">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <CalendarCheck size={16} style={{ color: '#7dd3fc' }} />
                </div>
                <span className="text-[11px] font-[650] uppercase tracking-[0.08em]" style={{ color: '#7dd3fc' }}>Lead CRM</span>
              </div>
              <h1 className="text-[32px] sm:text-[40px] font-[860] tracking-[-0.03em] leading-tight" style={{ color: '#ffffff' }}>
                Trial Sessions
              </h1>
              <p className="mt-3 max-w-xl text-[14px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Schedule trial sessions for interested leads to convert them into members.
              </p>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-[20px] p-6" style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.95)' }}>
              <h2 className="text-[18px] font-[760] mb-5" style={{ color: 'rgb(15,23,42)' }}>Schedule Trial</h2>
              <form onSubmit={handleSubmit} className="space-y-3">
                <select value={leadId} onChange={e => setLeadId(e.target.value)}
                  className="w-full rounded-[12px] px-4 py-2.5 text-sm outline-none"
                  style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)', color: 'rgb(15,23,42)' }}>
                  <option value="">Select interested lead...</option>
                  {((leads.data || []) as any[]).map((l: any) => (
                    <option key={l.id} value={l.id}>{l.name} {l.mobile ? `(${l.mobile})` : ''}</option>
                  ))}
                </select>
                <input required type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
                  className="w-full rounded-[12px] px-4 py-2.5 text-sm outline-none"
                  style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)', color: 'rgb(15,23,42)' }} />
                <select value={trainerId} onChange={e => setTrainerId(e.target.value)}
                  className="w-full rounded-[12px] px-4 py-2.5 text-sm outline-none"
                  style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)', color: 'rgb(15,23,42)' }}>
                  <option value="">Assign trainer (optional)</option>
                  {(trainers.data as any[] || []).map((t: any) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <textarea placeholder="Trial notes..." rows={2} value={notes} onChange={e => setNotes(e.target.value)}
                  className="w-full rounded-[12px] px-4 py-2.5 text-sm outline-none resize-none"
                  style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }} />
                <Button type="submit" disabled={!leadId || !scheduledAt || saving}
                  className="!w-full !rounded-[14px] !py-3 !font-[700]"
                  style={{ background: !leadId || !scheduledAt || saving ? 'rgba(0,0,0,0.1)' : 'linear-gradient(135deg, #0369a1, #0ea5e9)', color: '#fff' }}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Schedule Trial
                </Button>
              </form>
            </div>

            <div className="rounded-[20px] p-6" style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.95)' }}>
              <h2 className="text-[18px] font-[760] mb-4" style={{ color: 'rgb(15,23,42)' }}>Trial → Membership Funnel</h2>
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-3"
                  style={{ background: 'rgba(14,165,233,0.1)' }}>
                  <CalendarCheck size={28} style={{ color: '#0ea5e9' }} />
                </div>
                <p className="text-[13px] font-medium" style={{ color: 'rgb(100,116,139)' }}>
                  Trial sessions are scheduled directly from the Lead Inbox.
                  <br />Mark leads as "Interested" first, then schedule their trial.
                </p>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    </Guard>
  );
}
