'use client';
// Who may have automated WhatsApp messages sent on their behalf.
//
// ── Why this panel exists, and why it is not in Settings → Permissions ──────
//
// The rest of the role matrix lives in Settings and is stored in
// `system_settings`, a table with no organization_id: one studio changing a
// perm_* value changes it for every studio on the platform. That is tolerable
// for a flag that hides a menu item and is not tolerable for the flag that
// decides whether a studio's clients get messaged, so the backend gives these
// two their own tenanted tables and serves them from /api/automation.
//
// It sits on the automation page rather than in Settings for a second reason
// that matters more to the person using it: the switch and the rules it
// governs should be visible at once. A studio owner who writes three rules and
// wonders why nothing sends should find the answer on the same screen.

import { useState } from 'react';
import { m } from 'framer-motion';
import { ShieldCheck, ShieldOff, Loader2, AlertTriangle } from 'lucide-react';
import { useAsync } from '@/lib/use-async';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import type {
  AutomationTrainerGrant, WhatsappAutomationSettings,
} from '@/lib/api/endpoints/engagement';

const card = {
  borderRadius: 20, background: '#ffffff', border: '1px solid #e2e8f0',
  boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: 24, marginBottom: 22,
} as const;

export default function WhatsAppAutomationPermission() {
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const settings = useAsync<WhatsappAutomationSettings>(
    () => api.automation.whatsappSettings.get().then((r) => r.data), [],
  );

  const enabled = Boolean(settings.data?.automation_enabled);
  const trainers: AutomationTrainerGrant[] = settings.data?.trainers ?? [];
  const granted = trainers.filter((t) => t.whatsapp_automation_granted).length;

  async function toggleStudio() {
    setBusy('studio');
    try {
      await api.automation.whatsappSettings.update({ automation_enabled: !enabled });
      toast.success(enabled ? 'Automated messaging switched off' : 'Automated messaging switched on');
      settings.refetch();
    } catch (err) {
      // `instanceof Error`, matching WhatsAppCard and ModuleWorkspace. `any`
      // here would type-check and would also lose the fallback the moment the
      // thrown value is not an Error — a rejected fetch, a string — leaving
      // the studio with an empty toast.
      toast.error(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setBusy(null);
    }
  }

  async function toggleTrainer(t: AutomationTrainerGrant) {
    setBusy(t.id);
    try {
      if (t.whatsapp_automation_granted) await api.automation.whatsappSettings.revokeTrainer(t.id);
      else await api.automation.whatsappSettings.grantTrainer(t.id);
      settings.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setBusy(null);
    }
  }

  return (
    <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={card}>
      <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: '#0F172A', display: 'flex', gap: 8, alignItems: 'center' }}>
        <ShieldCheck size={16} color="#0067e0" /> Automated WhatsApp permission
      </h3>
      <p style={{ margin: '0 0 18px', fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
        Messages are sent from your own connected WhatsApp number, never a shared one.
        Both switches below must be on: the studio switch, and a grant for the trainer
        each client belongs to.
      </p>

      {settings.loading && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: '#64748b' }}>
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      )}

      {!settings.loading && (
        <>
          {/* ── The studio switch ───────────────────────────────────────── */}
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
                  ? `On. Active rules can send, for ${granted} of ${trainers.length} trainers.`
                  : 'Off. No rule will send, whatever its settings say.'}
              </div>
            </div>
            <button
              type="button"
              onClick={toggleStudio}
              disabled={busy === 'studio'}
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
              {busy === 'studio' ? <Loader2 size={13} className="animate-spin" />
                : enabled ? <ShieldOff size={13} /> : <ShieldCheck size={13} />}
              {enabled ? 'Switch off' : 'Switch on'}
            </button>
          </div>

          {/* The honest warning. A studio with rules and no grants sends
              nothing, and the reason is not visible anywhere else. */}
          {enabled && trainers.length > 0 && granted === 0 && (
            <div style={{
              display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 12,
              padding: '10px 12px', borderRadius: 10,
              background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)',
            }}>
              <AlertTriangle size={14} color="#b45309" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 11.5, color: '#92400e', lineHeight: 1.5 }}>
                No trainer has been granted permission yet, so clients who have a trainer
                will not be messaged. Clients with no trainer assigned still will be.
              </div>
            </div>
          )}

          {/* ── Per-trainer grants ──────────────────────────────────────── */}
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              Trainers
            </div>

            {trainers.length === 0 && (
              <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
                No trainers yet. Clients with no trainer are covered by the studio switch alone.
              </p>
            )}

            <div style={{ display: 'grid', gap: 8 }}>
              {trainers.map((t) => (
                <div key={t.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  padding: '10px 14px', borderRadius: 10,
                  background: '#f8fafc', border: '1px solid #e2e8f0',
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.name}
                    </div>
                    <div style={{ fontSize: 10.5, color: '#94a3b8' }}>
                      {t.whatsapp_automation_granted ? 'Messages may be sent on their behalf' : 'Not permitted'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleTrainer(t)}
                    disabled={busy === t.id}
                    aria-pressed={t.whatsapp_automation_granted}
                    aria-label={`${t.whatsapp_automation_granted ? 'Revoke' : 'Grant'} WhatsApp automation for ${t.name}`}
                    style={{
                      padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                      cursor: 'pointer', flexShrink: 0, border: '1px solid', background: '#fff',
                      borderColor: t.whatsapp_automation_granted ? '#cbd5e1' : '#0067e0',
                      color: t.whatsapp_automation_granted ? '#64748b' : '#0067e0',
                    }}
                  >
                    {busy === t.id ? <Loader2 size={12} className="animate-spin" />
                      : t.whatsapp_automation_granted ? 'Revoke' : 'Grant'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </m.div>
  );
}
