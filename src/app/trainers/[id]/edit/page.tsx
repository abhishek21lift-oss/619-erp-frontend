'use client';

import { use, useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Save, User, Phone, Mail, MapPin, Award,
  DollarSign, FileText, Briefcase, CheckCircle, AlertCircle,
  Dumbbell, Calendar, Shield, Percent, IndianRupee,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';

const MOBILE_RE = /^[6-9]\d{9}$/;
const EMAIL_RE  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Section config ───────────────────────────────────────────────────
const SECTIONS = [
  { id: 'identity',     label: 'Identity',     icon: User,         color: '#FFB300', gradient: 'linear-gradient(135deg,#FFB300,#FF8F00)' },
  { id: 'employment',   label: 'Employment',   icon: Briefcase,    color: '#8B5CF6', gradient: 'linear-gradient(135deg,#8B5CF6,#A78BFA)' },
  { id: 'expertise',    label: 'Expertise',    icon: Dumbbell,     color: '#00D4FF', gradient: 'linear-gradient(135deg,#00D4FF,#38BDF8)' },
  { id: 'compensation', label: 'Compensation', icon: IndianRupee,  color: '#00E5A8', gradient: 'linear-gradient(135deg,#00E5A8,#34D399)' },
  { id: 'notes',        label: 'Notes',        icon: FileText,     color: '#FF4D7A', gradient: 'linear-gradient(135deg,#FF4D7A,#FB7185)' },
];

// ── FloatLabel ───────────────────────────────────────────────────────
function FloatLabel({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="relative">
      {children}
      <label className="pointer-events-none absolute left-4 top-[10px] text-[10.5px] font-[700] uppercase tracking-[0.10em]"
        style={{ color: 'rgba(148,163,184,0.9)' }}>
        {label}{required && <span className="ml-0.5 text-rose-400">*</span>}
      </label>
    </div>
  );
}

// ── Input ────────────────────────────────────────────────────────────
function FInput({ label, type = 'text', required, value, onChange, placeholder, accent = '#FFB300' }: {
  label: string; type?: string; required?: boolean; placeholder?: string;
  value: string; onChange: (v: string) => void; accent?: string;
}) {
  return (
    <FloatLabel label={label} required={required}>
      <input
        type={type} placeholder={placeholder} value={value}
        onChange={e => onChange(e.target.value)} required={required}
        className="w-full rounded-[16px] px-4 pb-3 pt-[30px] text-[14px] font-[500] outline-none transition-all duration-200"
        style={{ background: '#ffffff', border: '1.5px solid rgba(15,23,42,0.09)', color: 'rgb(15,23,42)', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}
        onFocus={e => { e.currentTarget.style.border = `1.5px solid ${accent}`; e.currentTarget.style.boxShadow = `0 0 0 3.5px ${accent}22`; }}
        onBlur={e => { e.currentTarget.style.border = '1.5px solid rgba(15,23,42,0.09)'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(15,23,42,0.05)'; }}
      />
    </FloatLabel>
  );
}

// ── Select ───────────────────────────────────────────────────────────
function FSelect({ label, options, value, onChange, required, accent = '#FFB300' }: {
  label: string; options: { value: string; label: string }[]; required?: boolean;
  value: string; onChange: (v: string) => void; accent?: string;
}) {
  return (
    <FloatLabel label={label} required={required}>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full appearance-none rounded-[16px] px-4 pb-3 pt-[30px] text-[14px] font-[500] outline-none transition-all duration-200"
        style={{ background: '#ffffff', border: '1.5px solid rgba(15,23,42,0.09)', color: value ? 'rgb(15,23,42)' : 'rgb(148,163,184)', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}
        onFocus={e => { e.currentTarget.style.border = `1.5px solid ${accent}`; e.currentTarget.style.boxShadow = `0 0 0 3.5px ${accent}22`; }}
        onBlur={e => { e.currentTarget.style.border = '1.5px solid rgba(15,23,42,0.09)'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(15,23,42,0.05)'; }}>
        <option value="">— select —</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </FloatLabel>
  );
}

// ── SectionCard ──────────────────────────────────────────────────────
function SectionCard({ sectionId, children }: { sectionId: string; children: React.ReactNode }) {
  const s = SECTIONS.find(x => x.id === sectionId)!;
  const Icon = s.icon;
  return (
    <div className="overflow-hidden rounded-[24px]"
      style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 0 0 1px rgba(255,255,255,0.85)' }}>
      {/* Section header */}
      <div className="flex items-center gap-3 px-5 py-4" style={{ background: s.gradient }}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px]"
          style={{ background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(6px)' }}>
          <Icon size={16} className="text-white" />
        </div>
        <h2 className="text-[14px] font-[800] tracking-[-0.01em] text-white">{s.label}</h2>
      </div>
      {/* Section body */}
      <div className="p-5" style={{ background: 'rgba(255,255,255,0.96)' }}>
        {children}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────
export default function EditTrainerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <Guard role="admin"><EditContent id={id} /></Guard>;
}

function EditContent({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();

  // All trainer fields that the backend PUT accepts and the DB stores
  const [form, setForm] = useState({
    name:           '',
    mobile:         '',
    email:          '',
    dob:            '',
    gender:         '',
    joining_date:   '',
    address:        '',
    specialization: '',
    certifications: '',
    salary:         '',
    incentive_rate: '',
    status:         'active',
    notes:          '',
    role:           '',
  });
  const [trainerName, setTrainerName] = useState('');
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false);

  useEffect(() => {
    api.trainers.get(id).then((t: any) => {
      const loaded = {
        name:           t.name || '',
        mobile:         t.mobile || '',
        email:          t.email || '',
        // date fields: DB returns ISO date string; HTML date input needs YYYY-MM-DD
        dob:            t.dob ? String(t.dob).slice(0, 10) : '',
        // gender must be 'Male'|'Female'|'Other' — matches DB CHECK constraint
        gender:         t.gender || '',
        joining_date:   t.joining_date ? String(t.joining_date).slice(0, 10) : '',
        address:        t.address || '',
        specialization: t.specialization || '',
        // certifications stored as TEXT; show as-is
        certifications: t.certifications || '',
        // incentive_rate stored as decimal (0–1) in DB; multiply back to % for UI
        incentive_rate: t.incentive_rate != null ? String(Math.round(parseFloat(t.incentive_rate) * 100)) : '',
        // salary in rupees; backend stores as NUMERIC(12,2)
        salary:         t.salary != null ? String(t.salary) : '',
        status:         t.status || 'active',
        notes:          t.notes || '',
        role:           t.role || '',
      };
      setForm(loaded);
      setTrainerName(loaded.name);
      setLoading(false);
    }).catch((err: any) => {
      toast.error(err?.message || 'Failed to load trainer');
      setLoading(false);
    });
  }, [id, toast]);

  function set(k: keyof typeof form) {
    return (v: string) => setForm(f => ({ ...f, [k]: v }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Name is required'); return; }
    if (form.email && !EMAIL_RE.test(form.email.trim())) { setError('Please enter a valid email address'); return; }
    if (form.mobile && !MOBILE_RE.test(form.mobile.trim())) { setError('Phone must be a valid 10-digit Indian mobile starting with 6–9'); return; }

    setSaving(true);
    try {
      await api.trainers.update(id, {
        name:           form.name.trim(),
        mobile:         form.mobile || null,
        email:          form.email || null,
        dob:            form.dob || null,
        // gender sent as 'Male'|'Female'|'Other'|null — matches DB CHECK constraint
        gender:         form.gender || null,
        joining_date:   form.joining_date || null,
        address:        form.address || null,
        specialization: form.specialization || null,
        certifications: form.certifications || null,
        // salary as number (rupees)
        salary:         form.salary ? parseFloat(form.salary) : null,
        // incentive_rate as percentage (0–100); backend divides by 100 before DB storage
        incentive_rate: form.incentive_rate ? parseFloat(form.incentive_rate) : null,
        status:         form.status,
        notes:          form.notes || null,
        role:           form.role || null,
      });
      setSuccess(true);
      setTimeout(() => router.push(`/trainers/${id}`), 1400);
    } catch (err: any) {
      setError(err.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  }

  // ── Loading skeleton ─────────────────────────────────────────────
  if (loading) {
    return (
      <AppShell>
        <div className="min-h-screen" style={{ background: 'linear-gradient(160deg,#fff7ed 0%,#fef3c7 30%,#ede9fe 70%,#e0f2fe 100%)' }}>
          <div className="mx-auto max-w-2xl px-5 py-12 space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-36 animate-pulse rounded-[24px]" style={{ background: 'rgba(255,255,255,0.6)' }} />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Edit Trainer">
      {/* Page background — warm amber → violet → sky */}
      <div className="min-h-screen pb-28" style={{
        background: 'linear-gradient(160deg, #fff7ed 0%, #fef3c7 30%, #ede9fe 68%, #e0f2fe 100%)',
      }}>

        {/* ── Sticky page header ─────────────────────────────────────── */}
        <div className="sticky top-0 z-30"
          style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.55)', boxShadow: '0 1px 0 rgba(15,23,42,0.06)' }}>
          <div className="mx-auto flex max-w-2xl items-center gap-3 px-5 py-3.5">
            <Link href={`/trainers/${id}`}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] transition-all duration-200 hover:scale-105 active:scale-95"
              style={{ background: 'rgba(255,179,0,0.12)', border: '1.5px solid rgba(255,179,0,0.30)' }}>
              <ArrowLeft size={16} style={{ color: '#FF8F00' }} />
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[16px] font-[800] tracking-[-0.02em]" style={{ color: 'rgb(15,23,42)' }}>Edit Trainer</h1>
              {trainerName && <p className="truncate text-[12px] font-[600]" style={{ color: '#FF8F00' }}>{trainerName}</p>}
            </div>
            <span className="shrink-0 rounded-full px-3 py-1.5 text-[11.5px] font-[700] text-white"
              style={{ background: 'linear-gradient(135deg,#FFB300,#FF6F00)', boxShadow: '0 3px 10px rgba(255,143,0,0.40)' }}>
              Editing
            </span>
          </div>
          {/* Saffron accent line */}
          <div className="h-[2.5px] w-full" style={{ background: 'linear-gradient(90deg,#FFB300,#FF8F00,#FF6F00)' }} />
        </div>

        <form onSubmit={submit}>
          <div className="mx-auto max-w-2xl space-y-5 px-5 py-7">

            {/* ── Error / Success banners ─────────────────────────────── */}
            <AnimatePresence>
              {error && (
                <motion.div key="error" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-start gap-3 rounded-[16px] p-4"
                  style={{ background: 'rgba(244,63,94,0.07)', border: '1.5px solid rgba(244,63,94,0.22)' }}>
                  <AlertCircle size={15} style={{ color: '#f43f5e', flexShrink: 0, marginTop: 1 }} />
                  <p className="text-[13px] font-[600]" style={{ color: '#be123c' }}>{error}</p>
                </motion.div>
              )}
              {success && (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-3 rounded-[16px] p-4"
                  style={{ background: 'rgba(0,229,168,0.09)', border: '1.5px solid rgba(0,229,168,0.28)' }}>
                  <CheckCircle size={15} style={{ color: '#00E5A8', flexShrink: 0 }} />
                  <p className="text-[13px] font-[600]" style={{ color: '#059669' }}>Trainer updated! Redirecting…</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Section 1: Identity ────────────────────────────────── */}
            <SectionCard sectionId="identity">
              <div className="space-y-3">
                <FInput label="Full Name" required value={form.name} onChange={set('name')} accent="#FFB300" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FInput label="Email Address" type="email" value={form.email} onChange={set('email')} accent="#FFB300" />
                  <FInput label="Mobile Number" type="tel" value={form.mobile} onChange={set('mobile')} accent="#FFB300" />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <FSelect label="Gender" value={form.gender} onChange={set('gender')} accent="#FFB300"
                    options={[
                      { value: 'Male',   label: 'Male'   },
                      { value: 'Female', label: 'Female' },
                      { value: 'Other',  label: 'Other'  },
                    ]} />
                  <FInput label="Date of Birth" type="date" value={form.dob} onChange={set('dob')} accent="#FFB300" />
                  <FInput label="Role / Title" value={form.role} onChange={set('role')} placeholder="Personal Trainer" accent="#FFB300" />
                </div>
              </div>
            </SectionCard>

            {/* ── Section 2: Employment ─────────────────────────────── */}
            <SectionCard sectionId="employment">
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FInput label="Join Date" type="date" value={form.joining_date} onChange={set('joining_date')} accent="#8B5CF6" />
                  {/* Status as a visual card selector */}
                  <div>
                    <p className="mb-2 text-[10.5px] font-[700] uppercase tracking-[0.10em]" style={{ color: 'rgba(148,163,184,0.9)' }}>Status</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(['active', 'inactive'] as const).map(s => {
                        const on = form.status === s;
                        const cfg = s === 'active'
                          ? { g: 'linear-gradient(135deg,#00E5A8,#34D399)', glow: '#00E5A855', label: 'Active' }
                          : { g: 'linear-gradient(135deg,#94A3B8,#64748B)',  glow: '#94A3B855', label: 'Inactive' };
                        return (
                          <button key={s} type="button"
                            onClick={() => setForm(f => ({ ...f, status: s }))}
                            className="rounded-[14px] py-3 text-[13px] font-[700] transition-all duration-200 active:scale-95"
                            style={{
                              background: on ? cfg.g : '#ffffff',
                              color: on ? '#fff' : 'rgb(100,116,139)',
                              border: on ? 'none' : '1.5px solid rgba(15,23,42,0.09)',
                              boxShadow: on ? `0 4px 16px ${cfg.glow}` : '0 1px 3px rgba(15,23,42,0.05)',
                            }}>
                            {cfg.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <FInput label="Address" value={form.address} onChange={set('address')} accent="#8B5CF6" />
              </div>
            </SectionCard>

            {/* ── Section 3: Expertise ──────────────────────────────── */}
            <SectionCard sectionId="expertise">
              <div className="space-y-3">
                <FInput label="Specialization" value={form.specialization} onChange={set('specialization')}
                  placeholder="Strength Training, HIIT, Yoga…" accent="#00D4FF" />
                <FInput label="Certifications" value={form.certifications} onChange={set('certifications')}
                  placeholder="K11 Fitness, ACE Certified, NASM CPT…" accent="#00D4FF" />
              </div>
            </SectionCard>

            {/* ── Section 4: Compensation ───────────────────────────── */}
            <SectionCard sectionId="compensation">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FInput label="Base Salary (₹)" type="number" value={form.salary} onChange={set('salary')} accent="#00E5A8" />
                {/* Displayed as percentage; backend divides by 100 before DB storage */}
                <FInput label="Incentive Rate (%)" type="number" value={form.incentive_rate} onChange={set('incentive_rate')} accent="#00E5A8" />
              </div>
            </SectionCard>

            {/* ── Section 5: Notes ──────────────────────────────────── */}
            <SectionCard sectionId="notes">
              <div className="relative">
                <textarea
                  rows={4}
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Additional notes about this trainer…"
                  className="w-full resize-none rounded-[16px] px-4 py-3.5 text-[14px] font-[500] outline-none transition-all duration-200"
                  style={{ background: '#ffffff', border: '1.5px solid rgba(15,23,42,0.09)', color: 'rgb(15,23,42)', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}
                  onFocus={e => { e.currentTarget.style.border = '1.5px solid #FF4D7A'; e.currentTarget.style.boxShadow = '0 0 0 3.5px rgba(255,77,122,0.13)'; }}
                  onBlur={e => { e.currentTarget.style.border = '1.5px solid rgba(15,23,42,0.09)'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(15,23,42,0.05)'; }}
                />
              </div>
            </SectionCard>

          </div>
        </form>

        {/* ── Floating action bar ─────────────────────────────────────── */}
        <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-6 pt-3 lg:pl-[calc(var(--sidebar-w,256px)+16px)]"
          style={{ background: 'linear-gradient(to top, rgba(255,247,237,0.95) 70%, transparent)', backdropFilter: 'blur(12px)' }}>
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
            <Link href={`/trainers/${id}`}
              className="flex items-center gap-2 rounded-[16px] px-5 py-3 text-[14px] font-[700] transition-all duration-200 active:scale-95"
              style={{ background: 'rgba(255,255,255,0.90)', border: '1.5px solid rgba(15,23,42,0.10)', color: 'rgb(71,85,105)', boxShadow: '0 1px 6px rgba(15,23,42,0.07)' }}>
              <ArrowLeft size={15} /> Cancel
            </Link>
            <button type="button" onClick={submit as any} disabled={saving || success}
              className="flex flex-1 items-center justify-center gap-2 rounded-[16px] py-3 text-[14.5px] font-[800] text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-60 sm:flex-none sm:px-10"
              style={{ background: 'linear-gradient(135deg,#FFB300,#FF8F00,#FF6F00)', boxShadow: '0 6px 24px rgba(255,143,0,0.45)' }}>
              {saving
                ? <><span className="animate-spin text-base">&#9696;</span> Saving…</>
                : success
                ? <><CheckCircle size={16} strokeWidth={3} /> Saved!</>
                : <><Save size={16} strokeWidth={2.5} /> Save Changes</>
              }
            </button>
          </div>
        </div>

      </div>
    </AppShell>
  );
}
