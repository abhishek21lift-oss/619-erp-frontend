'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, MapPin, Clock, Globe, IndianRupee, Building2, Shield,
  Bell, Mail, MessageSquare, Smartphone, CreditCard, Camera,
  MapPin as MapPinIcon, Brain, RefreshCw, Clock as ClockIcon,
  Database, FileText, ChevronRight, CheckCircle2, X, Save,
  Palette, ToggleLeft, Users, Lock, Key, Activity, AlertTriangle,
  HardDrive, Download, Upload,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { PremiumButton } from '@/components/premium/PremiumButton';

/* ────────────────────────────────────────────────────────────────────
   FLOAT INPUT
──────────────────────────────────────────────────────────────────── */
function FloatInput({
  label, type = 'text', value, onChange, placeholder = ' ', suffix, required, multiline,
}: {
  label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
  suffix?: React.ReactNode; required?: boolean; multiline?: boolean;
}) {
  const id = React.useId();
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;
  return (
    <div className="relative">
      <div className="relative overflow-hidden rounded-[13px] transition-all"
        style={{
          background: focused ? 'rgba(255,255,255,0.95)' : 'rgba(248,250,252,0.9)',
          border: focused ? '1.5px solid rgba(220,38,38,0.40)' : '1.5px solid rgba(15,23,42,0.09)',
          boxShadow: focused ? '0 0 0 3px rgba(220,38,38,0.08)' : '0 1px 2px rgba(15,23,42,0.04)',
          transition: 'all 180ms cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <label htmlFor={id}
          className="pointer-events-none absolute left-4 font-[500] transition-all"
          style={{
            top: lifted ? 8 : 18,
            fontSize: lifted ? 10 : 13,
            color: lifted ? (focused ? '#dc2626' : 'rgb(148,163,184)') : 'rgb(148,163,184)',
            transition: 'all 150ms cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          {label}{required && ' *'}
        </label>
        {multiline ? (
          <textarea id={id} value={value} onChange={e => onChange(e.target.value)}
            placeholder={lifted ? placeholder : ''}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            className="w-full bg-transparent px-4 pb-3 pt-7 text-[13.5px] font-[500] outline-none resize-none"
            style={{ color: 'rgb(15,23,42)', caretColor: '#dc2626', minHeight: 80 }}
          />
        ) : (
          <input id={id} type={type} value={value} placeholder={lifted ? placeholder : ''}
            onChange={e => onChange(e.target.value)}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            className="w-full bg-transparent px-4 pb-3 pt-7 text-[13.5px] font-[500] outline-none"
            style={{ color: 'rgb(15,23,42)', caretColor: '#dc2626' }}
          />
        )}
        {suffix && <div className="absolute right-4 top-1/2 -translate-y-1/2">{suffix}</div>}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   TOGGLE SWITCH
──────────────────────────────────────────────────────────────────── */
function Toggle({ enabled, onChange, label }: { enabled: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <div className="flex items-center gap-3">
      {label && <span className="text-[12.5px] font-[500]" style={{ color: 'rgb(100,116,139)' }}>{label}</span>}
      <button
        onClick={() => onChange(!enabled)}
        className="relative h-6 w-10 rounded-full transition-all"
        style={{
          background: enabled ? 'rgba(220,38,38,0.85)' : 'rgba(15,23,42,0.12)',
          boxShadow: enabled ? '0 0 12px rgba(220,38,38,0.25)' : 'none',
        }}
      >
        <motion.span
          animate={{ x: enabled ? 17 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-white shadow-sm"
          style={{ boxShadow: '0 1px 4px rgba(15,23,42,0.15)' }}
        />
      </button>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   SECTION CARD
──────────────────────────────────────────────────────────────────── */
function SectionCard({ title, subtitle, icon, children, defaultOpen = true }: {
  title: string; subtitle: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <motion.div layout className="rounded-[22px] overflow-hidden transition-all"
      style={{ background: 'rgba(255,255,255,0.82)', border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 2px 20px rgba(15,23,42,0.07)' }}
    >
      <button onClick={() => setOpen(v => !v)} className="flex w-full items-center gap-3 px-5 py-4 text-left">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]" style={{ background: 'rgba(220,38,38,0.10)' }}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-[720]" style={{ color: 'rgb(15,23,42)' }}>{title}</p>
          <p className="text-[11.5px]" style={{ color: 'rgb(148,163,184)' }}>{subtitle}</p>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronRight size={14} style={{ color: 'rgb(148,163,184)' }} />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="px-5 pb-5 pt-1 border-t" style={{ borderColor: 'rgba(15,23,42,0.06)' }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   SETTING ROW
──────────────────────────────────────────────────────────────────── */
function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-[660]" style={{ color: 'rgb(15,23,42)' }}>{label}</p>
        {description && <p className="text-[11px] mt-0.5" style={{ color: 'rgb(148,163,184)' }}>{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   BRANCH CARD
──────────────────────────────────────────────────────────────────── */
function BranchCard({ name, location, status, members }: { name: string; location: string; status: 'active' | 'inactive'; members: number }) {
  return (
    <div className="flex items-center gap-3 rounded-[14px] px-4 py-3" style={{ background: 'rgba(248,250,252,0.9)', border: '1px solid rgba(15,23,42,0.07)' }}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]" style={{ background: 'rgba(99,102,241,0.10)' }}>
        <Building2 size={15} style={{ color: '#6366f1' }} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-[680]" style={{ color: 'rgb(15,23,42)' }}>{name}</p>
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-[660]"
            style={{ background: status === 'active' ? 'rgba(16,185,129,0.08)' : 'rgba(107,114,128,0.08)', color: status === 'active' ? '#059669' : '#6b7280' }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: status === 'active' ? '#10b981' : '#9ca3af' }} />
            {status === 'active' ? 'Active' : 'Inactive'}
          </span>
        </div>
        <p className="text-[11px]" style={{ color: 'rgb(148,163,184)' }}>{location} · {members} members</p>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   SEGMENTED CONTROL
──────────────────────────────────────────────────────────────────── */
function Segmented<T extends string>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: { id: T; label: string }[];
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-[11px] p-0.5" style={{ background: 'rgba(15,23,42,0.06)' }}>
      {options.map(o => {
        const active = o.id === value;
        return (
          <button key={o.id} onClick={() => onChange(o.id)}
            className="px-3.5 py-1.5 text-[11.5px] font-[660] rounded-[9px] transition-all"
            style={{
              background: active ? 'rgba(255,255,255,0.95)' : 'transparent',
              color: active ? 'rgb(15,23,42)' : 'rgb(148,163,184)',
              boxShadow: active ? '0 1px 3px rgba(15,23,42,0.08)' : 'none',
            }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   ACCESS ROW
──────────────────────────────────────────────────────────────────── */
function AccessRow({ role, permissions }: { role: string; permissions: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[12px] px-4 py-3" style={{ background: 'rgba(248,250,252,0.9)' }}>
      <div>
        <p className="text-[12.5px] font-[660]" style={{ color: 'rgb(15,23,42)' }}>{role}</p>
        <p className="text-[10.5px]" style={{ color: 'rgb(148,163,184)' }}>{permissions}</p>
      </div>
      <Toggle enabled onChange={() => {}} />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   PAGE
──────────────────────────────────────────────────────────────────── */
export default function StudioSettingsPage() {
  const [studioName, setStudioName] = useState('619 Fitness Studio');
  const [location, setLocation] = useState('Lucknow, Uttar Pradesh');
  const [timezone, setTimezone] = useState('Asia/Kolkata (IST +05:30)');
  const [currency, setCurrency] = useState('INR (₹)');
  const [gst, setGst] = useState('18%');
  const [invoicePrefix, setInvoicePrefix] = useState('INV-619-');
  const [paymentTerms, setPaymentTerms] = useState('Net 15');
  const [checkInMethod, setCheckInMethod] = useState<'face' | 'pin' | 'otp'>('face');
  const [geoFencing, setGeoFencing] = useState(true);
  const [aiInsights, setAiInsights] = useState(true);
  const [autoRenewals, setAutoRenewals] = useState(true);
  const [smartReminders, setSmartReminders] = useState(true);
  const [autoBackup, setAutoBackup] = useState(true);
  const [retentionPeriod, setRetentionPeriod] = useState('90 days');

  const [emailNotif, setEmailNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);

  return (
    <Guard role="admin">
      <AppShell>
        <div className="min-h-screen" style={{ background: 'linear-gradient(145deg,#f8fafc 0%,#f1f5f9 50%,#fafafe 100%)' }}>
          {/* ── PAGE HEADER ── */}
          <div className="border-b" style={{ background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(20px)', borderColor: 'rgba(15,23,42,0.07)' }}>
            <div className="mx-auto max-w-screen-xl px-5 py-6 sm:px-8">
              <div className="flex items-center gap-1.5 text-[11px] font-[500] mb-3" style={{ color: 'rgb(148,163,184)' }}>
                <span>Settings</span>
                <ChevronRight size={10} />
                <span style={{ color: 'rgb(100,116,139)' }}>Studio</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-[12px]" style={{ background: 'rgba(220,38,38,0.10)' }}>
                  <Settings size={16} style={{ color: '#dc2626' }} />
                </div>
                <div>
                  <h1 className="text-[22px] font-[860] tracking-[-0.03em]" style={{ color: 'rgb(15,23,42)' }}>Studio Settings</h1>
                  <p className="mt-0.5 text-[13px]" style={{ color: 'rgb(148,163,184)' }}>Premium enterprise control center</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── MAIN CONTENT ── */}
          <div className="mx-auto max-w-screen-xl px-5 py-6 sm:px-8">
            <div className="mx-auto max-w-3xl flex flex-col gap-4">
              {/* A. General Settings */}
              <SectionCard title="General Settings" subtitle="Studio name, location, timezone & currency" icon={<Settings size={14} style={{ color: '#dc2626' }} />}>
                <div className="flex flex-col gap-3">
                  <FloatInput label="Studio Name" value={studioName} onChange={setStudioName} required />
                  <FloatInput label="Location" value={location} onChange={setLocation} required />
                  <FloatInput label="Timezone" value={timezone} onChange={setTimezone} required />
                  <FloatInput label="Currency" value={currency} onChange={setCurrency} required />
                </div>
              </SectionCard>

              {/* B. Branch Management */}
              <SectionCard title="Branch Management" subtitle="Manage gym locations" icon={<Building2 size={14} style={{ color: '#dc2626' }} />}>
                <div className="flex flex-col gap-2.5">
                  <BranchCard name="619 Fitness Studio — HQ" location="Lucknow, Uttar Pradesh" status="active" members={342} />
                  <BranchCard name="619 Fitness Studio — Gomti Nagar" location="Lucknow, Uttar Pradesh" status="active" members={189} />
                  <BranchCard name="619 Fitness Studio — Hazratganj" location="Lucknow, Uttar Pradesh" status="inactive" members={0} />
                  <button className="mt-2 flex items-center gap-2 rounded-[12px] px-4 py-2.5 text-[12px] font-[660] transition-all hover:bg-slate-50" style={{ color: '#dc2626', background: 'rgba(220,38,38,0.06)', border: '1px dashed rgba(220,38,38,0.20)' }}>
                    <Building2 size={13} /> Add Branch
                  </button>
                </div>
              </SectionCard>

              {/* C. Access Control */}
              <SectionCard title="Access Control" subtitle="Role-based access permissions" icon={<Shield size={14} style={{ color: '#dc2626' }} />}>
                <div className="flex flex-col gap-2">
                  <AccessRow role="Admin" permissions="Full system access" />
                  <AccessRow role="Manager" permissions="Operations & reporting" />
                  <AccessRow role="Coach" permissions="PT portal, clients, schedule" />
                  <AccessRow role="Receptionist" permissions="Check-in, payments, enquiries" />
                </div>
              </SectionCard>

              {/* D. Notifications */}
              <SectionCard title="Notifications" subtitle="Email, SMS & push notification settings" icon={<Bell size={14} style={{ color: '#dc2626' }} />}>
                <div className="flex flex-col gap-1">
                  <SettingRow label="Email Notifications" description="Send renewal reminders and alerts via email">
                    <Toggle enabled={emailNotif} onChange={setEmailNotif} />
                  </SettingRow>
                  <SettingRow label="SMS Notifications" description="WhatsApp and SMS-based member communication">
                    <Toggle enabled={smsNotif} onChange={setSmsNotif} />
                  </SettingRow>
                  <SettingRow label="Push Notifications" description="In-app and browser push alerts">
                    <Toggle enabled={pushNotif} onChange={setPushNotif} />
                  </SettingRow>
                </div>
              </SectionCard>

              {/* E. Billing Settings */}
              <SectionCard title="Billing Settings" subtitle="GST, invoice prefix & payment terms" icon={<CreditCard size={14} style={{ color: '#dc2626' }} />}>
                <div className="flex flex-col gap-3">
                  <FloatInput label="GST Rate" value={gst} onChange={setGst} required />
                  <FloatInput label="Invoice Prefix" value={invoicePrefix} onChange={setInvoicePrefix} required />
                  <FloatInput label="Payment Terms" value={paymentTerms} onChange={setPaymentTerms} required />
                </div>
              </SectionCard>

              {/* F. Attendance Settings */}
              <SectionCard title="Attendance Settings" subtitle="Check-in method & geo-fencing" icon={<Camera size={14} style={{ color: '#dc2626' }} />}>
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="mb-2 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Check-in Method</p>
                    <Segmented value={checkInMethod} onChange={setCheckInMethod} options={[
                      { id: 'face', label: 'Face Recognition' },
                      { id: 'pin', label: 'PIN Code' },
                      { id: 'otp', label: 'OTP Verification' },
                    ]} />
                  </div>
                  <SettingRow label="Geo-Fencing" description="Restrict check-in to studio location">
                    <Toggle enabled={geoFencing} onChange={setGeoFencing} />
                  </SettingRow>
                </div>
              </SectionCard>

              {/* G. AI & Automation */}
              <SectionCard title="AI & Automation Settings" subtitle="Smart features & automation" icon={<Brain size={14} style={{ color: '#dc2626' }} />}>
                <div className="flex flex-col gap-1">
                  <SettingRow label="AI Insights" description="Machine learning retention predictions">
                    <Toggle enabled={aiInsights} onChange={setAiInsights} />
                  </SettingRow>
                  <SettingRow label="Auto-Renewals" description="Automatic membership renewal processing">
                    <Toggle enabled={autoRenewals} onChange={setAutoRenewals} />
                  </SettingRow>
                  <SettingRow label="Smart Reminders" description="AI-optimized reminder timing">
                    <Toggle enabled={smartReminders} onChange={setSmartReminders} />
                  </SettingRow>
                </div>
              </SectionCard>

              {/* H. Backup & Security */}
              <SectionCard title="Backup & Security" subtitle="Auto-backup, retention & audit logs" icon={<Lock size={14} style={{ color: '#dc2626' }} />}>
                <div className="flex flex-col gap-3">
                  <SettingRow label="Auto-Backup" description="Daily automatic database backup">
                    <Toggle enabled={autoBackup} onChange={setAutoBackup} />
                  </SettingRow>
                  <FloatInput label="Retention Period" value={retentionPeriod} onChange={setRetentionPeriod} required />
                  <div className="rounded-[14px] px-4 py-3 flex items-center gap-3" style={{ background: 'rgba(248,250,252,0.9)', border: '1px solid rgba(15,23,42,0.07)' }}>
                    <Activity size={14} style={{ color: '#6366f1' }} />
                    <div className="flex-1">
                      <p className="text-[12px] font-[660]" style={{ color: 'rgb(15,23,42)' }}>Audit Log</p>
                      <p className="text-[10.5px]" style={{ color: 'rgb(148,163,184)' }}>Last 30 days of activity tracked</p>
                    </div>
                    <button className="text-[11px] font-[660] px-3 py-1.5 rounded-[8px] transition-all hover:bg-slate-100" style={{ color: '#6366f1', background: 'rgba(99,102,241,0.08)' }}>
                      View Log
                    </button>
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>

          {/* ── STICKY BOTTOM ACTION BAR ── */}
          <div className="sticky bottom-4 z-20 mx-auto max-w-screen-xl px-5 sm:px-8">
            <div className="mx-auto max-w-3xl rounded-[18px] px-5 py-4 flex items-center justify-between gap-4"
              style={{
                background: 'rgba(255,255,255,0.92)',
                border: '1px solid rgba(255,255,255,0.85)',
                boxShadow: '0 8px 32px rgba(15,23,42,0.10), 0 1px 4px rgba(15,23,42,0.06)',
                backdropFilter: 'blur(24px)',
              }}>
              <div className="flex items-center gap-2.5">
                <span className="flex h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.6)]" />
                <div>
                  <p className="text-[12px] font-[680]" style={{ color: 'rgb(15,23,42)' }}>Unsaved changes</p>
                  <p className="text-[10.5px]" style={{ color: 'rgb(148,163,184)' }}>Review before saving</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <PremiumButton tone="secondary" size="sm" icon={<X size={13} />}>Discard</PremiumButton>
                <PremiumButton tone="primary" size="sm" icon={<Save size={13} />}>Save Changes</PremiumButton>
              </div>
            </div>
          </div>

          <style>{`
            @media (prefers-reduced-motion: reduce) {
              *, *::before, *::after { animation-duration:.01ms!important; transition-duration:.01ms!important }
            }
          `}</style>
        </div>
      </AppShell>
    </Guard>
  );
}
