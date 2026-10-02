'use client';

// A client's automated-message preferences (migration 226 on the backend).
//
// Recorded when the client asks the studio to stop a channel. An opt-out
// stops reminders and offers on that channel — birthday wishes, expiry and
// payment-due reminders, follow-ups, broadcasts. A payment receipt the client
// is owed still goes. Every message an opt-out stops is still recorded on the
// server as "suppressed", so the studio can see it was not sent on purpose.

import { useState } from 'react';
import { Mail, MessageCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { errorMessage } from '@/lib/forms/errors';

type Channel = 'whatsapp_opt_out' | 'email_opt_out';

export interface MessagePreferencesProps {
  clientId: string;
  whatsappOptOut: boolean;
  emailOptOut: boolean;
  updatedAt?: string | null;
  /** Called with the saved flags so the profile can update its copy. */
  onSaved?: (flags: Record<Channel, boolean>) => void;
}

const ROWS: { key: Channel; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'whatsapp_opt_out', label: 'WhatsApp reminders & offers', icon: <MessageCircle size={14} />, color: '#10b981' },
  { key: 'email_opt_out', label: 'Email reminders & offers', icon: <Mail size={14} />, color: '#0067E0' },
];

export default function MessagePreferences({ clientId, whatsappOptOut, emailOptOut, updatedAt, onSaved }: MessagePreferencesProps) {
  const [flags, setFlags] = useState<Record<Channel, boolean>>({
    whatsapp_opt_out: whatsappOptOut,
    email_opt_out: emailOptOut,
  });
  const [saving, setSaving] = useState<Channel | null>(null);
  const { toast } = useToast();

  const toggle = async (key: Channel) => {
    if (saving) return;
    const next = { ...flags, [key]: !flags[key] };
    setFlags(next);
    setSaving(key);
    try {
      await api.pt.updateClient(clientId, { [key]: next[key] });
      onSaved?.(next);
      toast.success(next[key] ? 'Opt-out recorded. Reminders and offers on this channel will stop.' : 'Messages on this channel are back on.');
    } catch (err: unknown) {
      setFlags(flags); // the server did not take it; show what is really stored
      toast.error(errorMessage(err, 'Could not save the message preference.'));
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-2">
      {ROWS.map(({ key, label, icon, color }) => {
        // The switch reads "receives messages": on means NOT opted out.
        const receives = !flags[key];
        return (
          <div key={key} className="flex min-h-[52px] items-center justify-between gap-3 rounded-[14px] px-3 py-2.5"
            style={{ background: 'var(--bg-subtle)' }}>
            <div className="flex min-w-0 items-center gap-2.5">
              <span aria-hidden className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[8px] text-white"
                style={{ background: color }}>{icon}</span>
              <span className="truncate text-[13px] font-[650]" style={{ color: 'var(--text-primary)' }}>{label}</span>
            </div>
            <button type="button" role="switch" aria-checked={receives} aria-label={label}
              disabled={saving !== null} onClick={() => toggle(key)}
              className="relative h-[28px] w-[48px] shrink-0 rounded-full transition disabled:opacity-60"
              style={{ background: receives ? '#10B981' : 'var(--border)' }}>
              <span className="absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow transition-all"
                style={{ left: receives ? 23 : 3 }} />
            </button>
          </div>
        );
      })}
      <p className="px-1 pt-1 text-[11.5px] leading-snug" style={{ color: 'var(--text-muted)' }}>
        Turn a channel off when the client asks you to stop. Payment receipts are always sent.
        {updatedAt ? ` Last changed ${new Date(updatedAt).toLocaleDateString()}.` : ''}
      </p>
    </div>
  );
}
