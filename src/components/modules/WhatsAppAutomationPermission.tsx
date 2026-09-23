'use client';
// Whether this studio's automation rules may send WhatsApp messages at all.
//
// ── One switch, owned by the trainer ────────────────────────────────────────
//
// There used to be a second layer: a per-coach grant saying on whose behalf a
// message could go out, so an assistant coach's clients were only messaged
// once the owner granted that coach. With the studio being one trainer and
// their members, the trainer IS the owner, and the studio switch is the whole
// decision. The engine re-checks it when it sends, because a rule's delay can
// be hours.
//
// It sits on the automation page rather than in Settings because the switch
// and the rules it governs should be visible at once. A trainer who writes
// three rules and wonders why nothing sends should find the answer on the same
// screen.

import { useState } from 'react';
import { m } from 'framer-motion';
import { ShieldCheck, ShieldOff, Loader2 } from 'lucide-react';
import { useAsync } from '@/lib/use-async';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import type { WhatsappAutomationSettings } from '@/lib/api/endpoints/engagement';
import { errorMessage } from '@/lib/forms/errors';

const card = {
  borderRadius: 20, background: '#ffffff', border: '1px solid #e2e8f0',
  boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: 24, marginBottom: 22,
} as const;

export default function WhatsAppAutomationPermission() {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const settings = useAsync<WhatsappAutomationSettings>(
    () => api.automation.whatsappSettings.get().then((r) => r.data), [],
  );

  const enabled = Boolean(settings.data?.automation_enabled);

  async function toggleStudio() {
    setBusy(true);
    try {
      await api.automation.whatsappSettings.update({ automation_enabled: !enabled });
      toast.success(enabled ? 'Automated messaging switched off' : 'Automated messaging switched on');
      settings.refetch();
    } catch (err) {
      // errorMessage rather than `err.message`: the thrown value is not always
      // an Error (a rejected fetch, a string), and the trainer should never be
      // shown an empty toast.
      toast.error(errorMessage(err, 'Could not save'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={card}>
      <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: '#0F172A', display: 'flex', gap: 8, alignItems: 'center' }}>
        <ShieldCheck size={16} color="#0067e0" /> Automated WhatsApp permission
      </h3>
      <p style={{ margin: '0 0 18px', fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
        Messages are sent from your own connected WhatsApp number, never a shared one.
        While this switch is off, no rule sends anything.
      </p>

      {settings.loading && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: '#64748b' }}>
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      )}

      {!settings.loading && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
          padding: '14px 16px', borderRadius: 12,
          background: enabled ? 'rgba(16,185,129,0.06)' : '#f8fafc',
          border: `1px solid ${enabled ? 'rgba(16,185,129,0.25)' : '#e2e8f0'}`,
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
              Automated messaging for this studio
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
              {enabled
                ? 'On. Active rules can send to your clients.'
                : 'Off. No rule will send, whatever its settings say.'}
            </div>
          </div>
          <button
            type="button"
            onClick={toggleStudio}
            disabled={busy}
            aria-pressed={enabled}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px',
              borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              border: '1px solid', flexShrink: 0,
              borderColor: enabled ? '#dc2626' : '#0067e0',
              color: enabled ? '#dc2626' : '#0067e0',
              background: '#fff',
            }}
          >
            {busy ? <Loader2 size={13} className="animate-spin" />
              : enabled ? <ShieldOff size={13} /> : <ShieldCheck size={13} />}
            {enabled ? 'Switch off' : 'Switch on'}
          </button>
        </div>
      )}
    </m.div>
  );
}
