'use client';

import { useState, useEffect } from 'react';
import { http } from '@/lib/http';
import { useToast } from '@/lib/toast';
import { Bell, Mail, MessageSquare, Smartphone, Loader2 } from 'lucide-react';

interface NotifPrefs {
  email_logins: boolean;
  email_payments: boolean;
  email_reports: boolean;
  email_marketing: boolean;
  push_logins: boolean;
  push_tasks: boolean;
  push_mentions: boolean;
  whatsapp_alerts: boolean;
  frequency: 'instant' | 'daily' | 'weekly';
}

const DEFAULT: NotifPrefs = {
  email_logins: true, email_payments: true, email_reports: false, email_marketing: false,
  push_logins: true, push_tasks: true, push_mentions: true,
  whatsapp_alerts: false, frequency: 'instant'
};

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      role="switch" aria-checked={checked} onClick={onChange}
      className={`relative w-10 h-5.5 rounded-full transition-all duration-200 flex-shrink-0 ${
        checked ? 'bg-[#FF2E63]' : 'bg-white/[0.12]'
      }`}
      style={{ height: '22px', width: '40px' }}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${
        checked ? 'left-[22px]' : 'left-0.5'
      }`} />
    </button>
  );
}

function NotifRow({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/[0.05] last:border-0">
      <div>
        <p className="text-[13px] text-white/80 font-medium">{label}</p>
        {desc && <p className="text-[12px] text-white/35 mt-0.5">{desc}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

export default function NotificationsPage() {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    http<NotifPrefs>('/api/profile/notifications')
      .then(d => setPrefs({ ...DEFAULT, ...d }))
      .catch((err) => {
        console.error('[profile/notifications] fetch failed', err);
        toast.error('Could not load notification preferences');
      })
      .finally(() => setLoading(false));
  }, []);

  const toggle = (key: keyof NotifPrefs) => {
    setPrefs(p => ({ ...p, [key]: !p[key] }));
  };

  const save = async () => {
    setSaving(true);
    try {
      await http('/api/profile/notifications', { method: 'PUT', body: JSON.stringify(prefs) });
      toast.success('Notification preferences saved');
    } catch {
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="animate-pulse space-y-4">{[1,2,3].map(i => <div key={i} className="h-32 bg-white/[0.04] rounded-2xl" />)}</div>;

  return (
    <div className="space-y-4 pb-10">
      {/* Email */}
      <div className="bg-[#141414] border border-white/[0.07] rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Mail size={14} className="text-[#FF2E63]" />
          <h3 className="text-[14px] font-semibold text-white">Email Notifications</h3>
        </div>
        <NotifRow label="Login alerts" desc="Email on new logins" checked={prefs.email_logins} onChange={() => toggle('email_logins')} />
        <NotifRow label="Payment confirmations" desc="Receipts and billing events" checked={prefs.email_payments} onChange={() => toggle('email_payments')} />
        <NotifRow label="Weekly reports" desc="Studio performance digest" checked={prefs.email_reports} onChange={() => toggle('email_reports')} />
        <NotifRow label="Product updates" desc="Tips and new features" checked={prefs.email_marketing} onChange={() => toggle('email_marketing')} />
      </div>

      {/* Push */}
      <div className="bg-[#141414] border border-white/[0.07] rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Smartphone size={14} className="text-[#FF2E63]" />
          <h3 className="text-[14px] font-semibold text-white">Push Notifications</h3>
        </div>
        <NotifRow label="Login alerts" checked={prefs.push_logins} onChange={() => toggle('push_logins')} />
        <NotifRow label="Task reminders" checked={prefs.push_tasks} onChange={() => toggle('push_tasks')} />
        <NotifRow label="Mentions & tags" checked={prefs.push_mentions} onChange={() => toggle('push_mentions')} />
      </div>

      {/* WhatsApp */}
      <div className="bg-[#141414] border border-white/[0.07] rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare size={14} className="text-[#FF2E63]" />
          <h3 className="text-[14px] font-semibold text-white">WhatsApp Alerts</h3>
        </div>
        <NotifRow label="Critical alerts via WhatsApp" desc="Payment failures, security events" checked={prefs.whatsapp_alerts} onChange={() => toggle('whatsapp_alerts')} />
      </div>

      {/* Frequency */}
      <div className="bg-[#141414] border border-white/[0.07] rounded-2xl p-6 space-y-3">
        <h3 className="text-[14px] font-semibold text-white">Digest Frequency</h3>
        <div className="flex gap-2">
          {(['instant', 'daily', 'weekly'] as const).map(f => (
            <button
              key={f} onClick={() => setPrefs(p => ({ ...p, frequency: f }))}
              className={`px-4 py-2 rounded-xl text-[13px] font-medium capitalize transition-all ${
                prefs.frequency === f
                  ? 'bg-[#FF2E63] text-white'
                  : 'bg-white/[0.05] text-white/45 hover:bg-white/10 hover:text-white/70'
              }`}
            >{f}</button>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF2E63] hover:bg-[#E11D48] text-[13px] text-white font-medium transition-all active:scale-95 disabled:opacity-60">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Bell size={13} />}
          {saving ? 'Saving…' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
}
