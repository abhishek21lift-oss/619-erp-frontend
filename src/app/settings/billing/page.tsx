'use client';

import * as React from 'react';
import { m } from 'framer-motion';
import { CreditCard, RefreshCw, Save, AlertCircle, Check } from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';

interface PaymentMethod {
  key: string;
  label: string;
  description: string;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  { key: 'payment_method_cash',          label: 'Cash',          description: 'Accept cash payments at the front desk' },
  { key: 'payment_method_upi',           label: 'UPI / GPay',    description: 'Accept UPI-based payments (GPay, PhonePe, Paytm, etc.)' },
  { key: 'payment_method_card',          label: 'Card',          description: 'Accept debit and credit card payments' },
  { key: 'payment_method_bank_transfer', label: 'Bank Transfer', description: 'Accept NEFT / RTGS / IMPS bank transfers' },
];

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      style={{
        position: 'relative',
        width: 44,
        height: 24,
        borderRadius: 12,
        border: 'none',
        cursor: 'pointer',
        transition: 'background 0.2s',
        background: enabled ? '#10b981' : 'rgba(0,0,0,0.15)',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: enabled ? 23 : 3,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: '#ffffff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
          transition: 'left 0.2s',
        }}
      />
    </button>
  );
}

export default function BillingSettingsPage() {
  const [toggles, setToggles] = React.useState<Record<string, boolean>>({});
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let alive = true;
    api.settings.getAll()
      .then((res) => {
        if (!alive) return;
        const stored = res?.settings ?? {};
        const initial: Record<string, boolean> = {};
        for (const pm of PAYMENT_METHODS) {
          const v = stored[pm.key];
          // Absent key = method enabled by default; stored values may arrive
          // as booleans (typed rows) or 'true'/'false' strings (untyped rows).
          initial[pm.key] = v === undefined ? true : v === true || v === 'true';
        }
        setToggles(initial);
      })
      .catch(() => {
        if (!alive) return;
        const initial: Record<string, boolean> = {};
        for (const pm of PAYMENT_METHODS) initial[pm.key] = true;
        setToggles(initial);
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  async function handleSave() {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const payload: Record<string, string> = {};
      for (const [k, v] of Object.entries(toggles)) {
        payload[k] = String(v);
      }
      await api.settings.update(payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  function handleToggle(key: string, value: boolean) {
    setToggles(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  return (
    <Guard role="admin">
      <AppShell>
        <div className="page-container animate-fade-in" style={{ maxWidth: 640, margin: '0 auto' }}>
          <div className="page-header">
            <h1 className="page-title">Billing Settings</h1>
            <p className="page-subtitle">Payment modes, receipt format and billing preferences</p>
          </div>

          {error && (
            <m.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 16px', borderRadius: 10, marginBottom: 16,
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                color: '#ef4444', fontSize: 13,
              }}
            >
              <AlertCircle size={16} />
              <span style={{ flex: 1 }}>{error}</span>
              <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>&times;</button>
            </m.div>
          )}

          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <CreditCard size={22} color="var(--brand)" />
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Payment Methods</h3>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  Enable or disable accepted payment modes for your studio.
                </p>
              </div>
            </div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {PAYMENT_METHODS.map(pm => (
                  <div key={pm.key} style={{ height: 60, borderRadius: 8, background: 'var(--bg-subtle)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {PAYMENT_METHODS.map(pm => (
                  <div
                    key={pm.key}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      background: 'var(--bg-subtle)',
                      borderRadius: 10,
                      border: `1px solid ${toggles[pm.key] ? 'rgba(16,185,129,0.15)' : 'rgba(0,0,0,0.04)'}`,
                      transition: 'border-color 0.2s',
                    }}
                  >
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{pm.label}</p>
                      <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{pm.description}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: toggles[pm.key] ? '#10b981' : 'var(--text-muted)' }}>
                        {toggles[pm.key] ? 'Enabled' : 'Disabled'}
                      </span>
                      <Toggle enabled={toggles[pm.key]} onChange={v => handleToggle(pm.key, v)} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleSave}
                disabled={saving || loading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 100 }}
              >
                {saving
                  ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
                  : saved
                    ? <><Check size={14} /> Saved!</>
                    : <><Save size={14} /> Save Changes</>}
              </button>
              {saved && (
                <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>
                  Payment methods updated.
                </span>
              )}
            </div>
          </div>
        </div>
      </AppShell>
    </Guard>
  );
}
