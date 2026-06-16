'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Building2, MapPin, Clock, Globe, IndianRupee, Fingerprint, Palette,
  Zap, DatabaseBackup, GitMerge, Bell, Mail, MessageSquare, Smartphone,
  Save, RefreshCw, Loader, ChevronRight, CheckCircle2, AlertTriangle,
  X, Settings, CreditCard, Users, Shield,
} from 'lucide-react';
import { api } from '@/lib/api';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';

/* ── Helpers ── */
function fmtMembers(n: number) {
  return n === 1 ? '1 member' : `${n} members`;
}

/* ── Float-label input ── */
function Field({
  label, value, onChange, type = 'text', hint,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; hint?: string;
}) {
  const id = React.useId();
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;
  return (
    <div>
      <div className="relative overflow-hidden rounded-[13px] transition-all"
        style={{
          background: focused ? '#fff' : 'rgba(248,250,252,1)',
          border: focused ? '1.5px solid rgba(220,38,38,0.40)' : '1.5px solid rgba(15,23,42,0.09)',
          boxShadow: focused ? '0 0 0 3px rgba(220,38,38,0.07)' : '0 1px 3px rgba(15,23,42,0.04)',
          transition: 'all 170ms ease',
        }}>
        <label htmlFor={id}
          className="pointer-events-none absolute left-4 font-[500] transition-all"
          style={{
            top: lifted ? 7 : 17, fontSize: lifted ? 10 : 13,
            color: lifted ? (focused ? '#dc2626' : 'rgb(148,163,184)') : 'rgb(148,163,184)',
            transition: 'all 150ms ease',
          }}>
          {label}
        </label>
        <input id={id} type={type} value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          className="w-full bg-transparent px-4 pb-3 pt-7 text-[13.5px] font-[500] outline-none"
          style={{ color: 'rgb(15,23,42)', caretColor: '#dc2626' }}
        />
      </div>
      {hint && <p className="mt-1 text-[11px] pl-1" style={{ color: 'rgb(148,163,184)' }}>{hint}</p>}
    </div>
  );
}

/* ── Toggle ── */
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)}
      className="relative h-[22px] w-9 rounded-full flex-shrink-0 transition-all"
      style={{ background: on ? '#dc2626' : 'rgba(15,23,42,0.15)', boxShadow: on ? '0 0 10px rgba(220,38,38,0.3)' : 'none' }}>
      <motion.span animate={{ x: on ? 16 : 2 }} transition={{ type: 'spring', stiffness: 600, damping: 35 }}
        className="absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.18)' }} />
    </button>
  );
}

/* ── Nav card linking to a sub-settings page ── */
function NavCard({
  icon, label, subtitle, href, accent = '#6366f1', badge,
}: {
  icon: React.ReactNode; label: string; subtitle: string; href: string;
  accent?: string; badge?: string;
}) {
  const router = useRouter();
  return (
    <motion.button whileHover={{ y: -2, boxShadow: '0 8px 28px rgba(15,23,42,0.10)' }} whileTap={{ scale: 0.98 }}
      onClick={() => router.push(href)}
      className="group flex flex-col items-start gap-3 rounded-[18px] p-4 text-left transition-all w-full"
      style={{ background: 'rgba(255,255,255,0.80)', border: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 2px 12px rgba(15,23,42,0.05)' }}>
      <div className="flex w-full items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-[11px]"
          style={{ background: `${accent}14` }}>
          <span style={{ color: accent }}>{icon}</span>
        </div>
        {badge && (
          <span className="text-[9px] font-[800] uppercase tracking-wider px-1.5 py-0.5 rounded-[5px]"
            style={{ background: `${accent}14`, color: accent }}>{badge}</span>
        )}
        <ChevronRight size={13} style={{ color: 'rgb(203,213,225)' }}
          className="group-hover:translate-x-0.5 transition-transform" />
      </div>
      <div>
        <p className="text-[12.5px] font-[700]" style={{ color: 'rgb(15,23,42)' }}>{label}</p>
        <p className="text-[11px] mt-0.5" style={{ color: 'rgb(148,163,184)' }}>{subtitle}</p>
      </div>
    </motion.button>
  );
}

/* ── Page ── */
export default function StudioSettingsPage() {
  const [studioName, setStudioName] = useState('');
  const [location, setLocation] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [currency, setCurrency] = useState('INR');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gstRate, setGstRate] = useState('');
  const [invoicePrefix, setInvoicePrefix] = useState('');

  const [emailNotif, setEmailNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(false);

  const [branchCount, setBranchCount] = useState(0);
  const [memberCount, setMemberCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [studioRes, branchRes] = await Promise.all([
        api.settings.getStudio(),
        api.settings.getBranches(),
      ]);
      const s: Record<string, unknown> = studioRes.settings ?? {};
      setStudioName(String(s.name ?? s.studio_name ?? '619 Fitness Studio'));
      setLocation(String(s.location ?? ''));
      setTimezone(String(s.timezone ?? 'Asia/Kolkata'));
      setCurrency(String(s.currency ?? 'INR'));
      setPhone(String(s.phone ?? ''));
      setEmail(String(s.email ?? ''));
      setGstRate(String(s.gst_rate ?? s.gst ?? ''));
      setInvoicePrefix(String(s.invoice_prefix ?? 'INV'));
      setEmailNotif(s.email_notifications !== false && s.email_notifications !== 'false');
      setSmsNotif(s.sms_notifications !== false && s.sms_notifications !== 'false');
      setPushNotif(s.push_notifications === true || s.push_notifications === 'true');

      const branches = branchRes as { id: string; member_count: number }[];
      setBranchCount(branches.length);
      setMemberCount(branches.reduce((t, b) => t + (Number(b.member_count) || 0), 0));
    } catch {
      setError('Failed to load settings. Please try again.');
    } finally {
      setLoading(false);
      setDirty(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Mark dirty on any field change
  const wrap = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setDirty(true); };

  const save = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await api.settings.update({
        name: studioName,
        studio_name: studioName,
        location,
        timezone,
        currency,
        phone,
        email,
        gst_rate: gstRate,
        gst: gstRate,
        invoice_prefix: invoicePrefix,
        email_notifications: String(emailNotif),
        sms_notifications: String(smsNotif),
        push_notifications: String(pushNotif),
      });
      setSuccess('Settings saved');
      setDirty(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const SUB_PAGES = [
    { href: '/settings/branches',        label: 'Branches',         subtitle: `${branchCount} location${branchCount !== 1 ? 's' : ''} · ${fmtMembers(memberCount)}`, icon: <Building2 size={16} />,    accent: '#6366f1' },
    { href: '/settings/biometric',       label: 'Biometric & Face', subtitle: 'Face ID, GPS & check-in config',   icon: <Fingerprint size={16} />,  accent: '#0ea5e9' },
    { href: '/settings/billing',         label: 'GST / Invoice',    subtitle: 'Tax rates, invoice prefix & terms', icon: <CreditCard size={16} />,   accent: '#10b981' },
    { href: '/settings/branding',        label: 'Branding',         subtitle: 'Colors, logo & theme customization',icon: <Palette size={16} />,      accent: '#f59e0b', badge: 'Custom' },
    { href: '/settings/integrations',    label: 'Integrations',     subtitle: 'AI, payment gateways & APIs',       icon: <Zap size={16} />,          accent: '#8b5cf6', badge: 'New' },
    { href: '/settings/profile',         label: 'My Profile',       subtitle: 'Account info & password',           icon: <Users size={16} />,        accent: '#14b8a6' },
    { href: '/settings/import-database', label: 'Import Database',  subtitle: 'Bulk CSV import of client data',    icon: <DatabaseBackup size={16} />,accent: '#dc2626' },
    { href: '/settings/merge-duplicates',label: 'Merge Duplicates', subtitle: 'Find & consolidate duplicate clients',icon: <GitMerge size={16} />,   accent: '#f97316', badge: 'New' },
  ];

  if (loading) {
    return (
      <Guard role="admin">
        <AppShell>
          <div className="flex min-h-screen items-center justify-center"
            style={{ background: 'linear-gradient(145deg,#f8fafc,#f1f5f9,#fafafe)' }}>
            <div className="flex flex-col items-center gap-3">
              <Loader size={22} className="animate-spin" style={{ color: '#dc2626' }} />
              <p className="text-[13px]" style={{ color: 'rgb(148,163,184)' }}>Loading settings…</p>
            </div>
          </div>
        </AppShell>
      </Guard>
    );
  }

  return (
    <Guard role="admin">
      <AppShell>
        <div className="min-h-screen" style={{ background: 'linear-gradient(145deg,#f8fafc 0%,#f1f5f9 60%,#fafafe 100%)' }}>

          {/* ── HERO ── */}
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 55%,#1e1b4b 100%)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
            {/* ambient orbs */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -top-20 right-1/4 h-64 w-64 rounded-full opacity-20"
                style={{ background: 'radial-gradient(circle,#818cf8,transparent 70%)', filter: 'blur(40px)' }} />
              <div className="absolute -bottom-16 left-1/3 h-48 w-48 rounded-full opacity-15"
                style={{ background: 'radial-gradient(circle,#dc2626,transparent 70%)', filter: 'blur(40px)' }} />
            </div>
            <div className="relative z-10 mx-auto max-w-screen-xl px-5 py-8 sm:px-8">
              {/* breadcrumb */}
              <div className="mb-4 flex items-center gap-1.5 text-[11px] font-[500]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                <Settings size={10} />
                <span>Settings</span>
                <ChevronRight size={9} />
                <span style={{ color: 'rgba(255,255,255,0.65)' }}>Studio</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-end gap-4 justify-between">
                <div>
                  <h1 className="text-[26px] font-[860] tracking-[-0.03em]" style={{ color: '#fff' }}>
                    {studioName || 'Studio Settings'}
                  </h1>
                  <p className="mt-1 text-[13px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    {location ? `📍 ${location}` : 'Configure your fitness studio'}
                  </p>
                </div>
                {/* quick stats */}
                <div className="flex gap-3">
                  {[
                    { label: 'Branches', value: branchCount },
                    { label: 'Members', value: memberCount },
                  ].map(s => (
                    <div key={s.label} className="rounded-[12px] px-4 py-2.5 text-center"
                      style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                      <p className="text-[18px] font-[800]" style={{ color: '#fff' }}>{s.value}</p>
                      <p className="text-[10px] font-[600] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.40)' }}>{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── ALERTS ── */}
          <div className="mx-auto max-w-screen-xl px-5 sm:px-8">
            {error && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="mt-4 flex items-center gap-2.5 rounded-[13px] px-4 py-3 text-[12.5px] font-[500]"
                style={{ background: 'rgba(239,68,68,0.09)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.18)' }}>
                <AlertTriangle size={13} />{error}
                <button onClick={() => setError(null)} className="ml-auto opacity-60 hover:opacity-100"><X size={13} /></button>
              </motion.div>
            )}
            {success && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="mt-4 flex items-center gap-2.5 rounded-[13px] px-4 py-3 text-[12.5px] font-[500]"
                style={{ background: 'rgba(16,185,129,0.09)', color: '#059669', border: '1px solid rgba(16,185,129,0.18)' }}>
                <CheckCircle2 size={13} />{success}
                <button onClick={() => setSuccess(null)} className="ml-auto opacity-60 hover:opacity-100"><X size={13} /></button>
              </motion.div>
            )}
          </div>

          {/* ── MAIN ── */}
          <div className="mx-auto max-w-screen-xl px-5 py-6 sm:px-8 flex flex-col gap-6">

            {/* STUDIO INFO */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="rounded-[22px] p-5 sm:p-6"
              style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 2px 20px rgba(15,23,42,0.06)' }}>
              <div className="flex items-center gap-2.5 mb-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: 'rgba(220,38,38,0.10)' }}>
                  <Building2 size={14} style={{ color: '#dc2626' }} />
                </div>
                <div>
                  <h2 className="text-[14px] font-[720]" style={{ color: 'rgb(15,23,42)' }}>Studio Information</h2>
                  <p className="text-[11px]" style={{ color: 'rgb(148,163,184)' }}>Core identity &amp; contact details</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Studio Name" value={studioName} onChange={wrap(setStudioName)} />
                <Field label="Location / Address" value={location} onChange={wrap(setLocation)} />
                <Field label="Phone Number" value={phone} onChange={wrap(setPhone)} type="tel" />
                <Field label="Email Address" value={email} onChange={wrap(setEmail)} type="email" />
                <Field label="Timezone" value={timezone} onChange={wrap(setTimezone)}
                  hint="e.g. Asia/Kolkata" />
                <Field label="Currency Code" value={currency} onChange={wrap(setCurrency)}
                  hint="e.g. INR, USD, AED" />
              </div>
            </motion.div>

            {/* BILLING QUICK-EDIT */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.10 }}
              className="rounded-[22px] p-5 sm:p-6"
              style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 2px 20px rgba(15,23,42,0.06)' }}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: 'rgba(16,185,129,0.10)' }}>
                    <IndianRupee size={14} style={{ color: '#10b981' }} />
                  </div>
                  <div>
                    <h2 className="text-[14px] font-[720]" style={{ color: 'rgb(15,23,42)' }}>Billing Defaults</h2>
                    <p className="text-[11px]" style={{ color: 'rgb(148,163,184)' }}>GST rate &amp; invoice format — full config in GST / Invoice</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="GST Rate (%)" value={gstRate} onChange={wrap(setGstRate)} type="number" hint="Leave blank if not applicable" />
                <Field label="Invoice Prefix" value={invoicePrefix} onChange={wrap(setInvoicePrefix)} hint="e.g. INV, 619, GYM" />
              </div>
            </motion.div>

            {/* NOTIFICATIONS */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="rounded-[22px] p-5 sm:p-6"
              style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 2px 20px rgba(15,23,42,0.06)' }}>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: 'rgba(245,158,11,0.10)' }}>
                  <Bell size={14} style={{ color: '#f59e0b' }} />
                </div>
                <div>
                  <h2 className="text-[14px] font-[720]" style={{ color: 'rgb(15,23,42)' }}>Notifications</h2>
                  <p className="text-[11px]" style={{ color: 'rgb(148,163,184)' }}>Choose how to alert members &amp; staff</p>
                </div>
              </div>
              <div className="divide-y" style={{ borderColor: 'rgba(15,23,42,0.05)' }}>
                {[
                  { label: 'Email Notifications', desc: 'Renewal reminders & payment receipts via email', icon: <Mail size={13} />, on: emailNotif, set: wrap(setEmailNotif) },
                  { label: 'SMS / WhatsApp', desc: 'WhatsApp and SMS alerts to members', icon: <MessageSquare size={13} />, on: smsNotif, set: wrap(setSmsNotif) },
                  { label: 'Push Notifications', desc: 'In-app and browser push alerts', icon: <Smartphone size={13} />, on: pushNotif, set: wrap(setPushNotif) },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between gap-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span style={{ color: 'rgb(148,163,184)' }}>{row.icon}</span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-[640]" style={{ color: 'rgb(15,23,42)' }}>{row.label}</p>
                        <p className="text-[11px]" style={{ color: 'rgb(148,163,184)' }}>{row.desc}</p>
                      </div>
                    </div>
                    <Toggle on={row.on} onChange={row.set} />
                  </div>
                ))}
              </div>
            </motion.div>

            {/* SUB-SETTINGS NAV CARDS */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.20 }}>
              <div className="flex items-center gap-2 mb-3">
                <Shield size={13} style={{ color: 'rgb(148,163,184)' }} />
                <h2 className="text-[12px] font-[700] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>
                  Settings Areas
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {SUB_PAGES.map(p => (
                  <NavCard key={p.href} {...p} />
                ))}
              </div>
            </motion.div>
          </div>

          {/* ── STICKY SAVE BAR (only when dirty) ── */}
          {dirty && (
            <motion.div
              initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              className="fixed bottom-4 left-1/2 z-30 -translate-x-1/2"
              style={{ width: 'min(480px, calc(100vw - 32px))' }}>
              <div className="rounded-[18px] px-5 py-3.5 flex items-center justify-between gap-4"
                style={{
                  background: 'rgba(15,23,42,0.94)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 8px 40px rgba(15,23,42,0.30)',
                }}>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]" />
                  <p className="text-[12px] font-[640]" style={{ color: 'rgba(255,255,255,0.85)' }}>Unsaved changes</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => load()}
                    className="flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[11.5px] font-[660] transition-all hover:bg-white/10"
                    style={{ color: 'rgba(255,255,255,0.55)' }}>
                    <RefreshCw size={11} /> Discard
                  </button>
                  <button onClick={save} disabled={saving}
                    className="flex items-center gap-1.5 rounded-[10px] px-4 py-1.5 text-[11.5px] font-[700] transition-all hover:opacity-90 disabled:opacity-60"
                    style={{ background: '#dc2626', color: '#fff', boxShadow: '0 2px 10px rgba(220,38,38,0.4)' }}>
                    {saving ? <Loader size={11} className="animate-spin" /> : <Save size={11} />}
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </AppShell>
    </Guard>
  );
}
