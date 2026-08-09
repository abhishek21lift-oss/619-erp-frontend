'use client';

import { use, useState, useEffect, useCallback, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { m, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Save, User, Phone, Briefcase,
  CheckCircle, AlertCircle, Dumbbell, Calendar,
  IndianRupee, FileText, Target, CreditCard,
} from 'lucide-react';
import Guard from '@/components/Guard';
import { PageTitle } from '@/components/ui';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';

const MOBILE_RE = /^[6-9]\d{9}$/;
const EMAIL_RE  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const SECTIONS = [
  { id: 'identity',     label: 'Identity',         icon: User,         gradient: 'linear-gradient(135deg,#F59E0B,#D97706)' },
  { id: 'contact',      label: 'Contact Details',  icon: Phone,        gradient: 'linear-gradient(135deg,#0067E0,#7FB4FF)' },
  { id: 'employment',   label: 'Employment',        icon: Briefcase,    gradient: 'linear-gradient(135deg,#0067E0,#0059CE)' },
  { id: 'expertise',    label: 'Expertise',         icon: Dumbbell,     gradient: 'linear-gradient(135deg,#10B981,#34D399)' },
  { id: 'schedule',     label: 'Schedule',          icon: Calendar,     gradient: 'linear-gradient(135deg,#FCD34D,#FBBF24)' },
  { id: 'compensation', label: 'Compensation',      icon: IndianRupee,  gradient: 'linear-gradient(135deg,#0067E0,#F87171)' },
  { id: 'banking',      label: 'Banking & Tax',     icon: CreditCard,   gradient: 'linear-gradient(135deg,#0067e0,#0059ce)' },
  { id: 'targets',      label: 'Targets & Access',  icon: Target,       gradient: 'linear-gradient(135deg,#7fb4ff,#ef4444)' },
  { id: 'notes',        label: 'Notes',             icon: FileText,     gradient: 'linear-gradient(135deg,#64748B,#94A3B8)' },
];

// ── FloatLabel ───────────────────────────────────────────────────────
function FloatLabel({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    // See trainers/add — the caption wraps the field so it is a real label.
    <label className="relative block">
      {children}
      <span className="pointer-events-none absolute left-4 top-[10px] text-[10.5px] font-[700] uppercase tracking-[0.10em]"
        style={{ color: 'rgba(148,163,184,0.9)' }}>
        {label}{required && <span className="ml-0.5 text-rose-400">*</span>}
      </span>
    </label>
  );
}

// ── Input ────────────────────────────────────────────────────────────
function FInput({ label, type = 'text', required, value, onChange, placeholder, accent = '#F59E0B' }: {
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
function FSelect({ label, options, value, onChange, required, accent = '#F59E0B' }: {
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

// ── Toggle ───────────────────────────────────────────────────────────
function Toggle({ label, sub, value, onChange, accent = '#10B981' }: {
  label: string; sub?: string; value: boolean; onChange: (v: boolean) => void; accent?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-[14px] px-4 py-3"
      style={{ background: 'rgba(255,255,255,0.8)', border: '1.5px solid rgba(15,23,42,0.07)' }}>
      <div>
        <p className="text-[13px] font-[600]" style={{ color: 'rgb(15,23,42)' }}>{label}</p>
        {sub && <p className="text-[11px]" style={{ color: 'rgb(100,116,139)' }}>{sub}</p>}
      </div>
      <button type="button" onClick={() => onChange(!value)}
        className="relative h-7 w-12 shrink-0 rounded-full transition-all duration-200"
        style={{ background: value ? `linear-gradient(135deg,${accent},${accent}cc)` : 'rgba(148,163,184,0.3)', boxShadow: value ? `0 2px 8px ${accent}44` : 'none' }}>
        <span className="absolute top-1 h-5 w-5 rounded-full bg-white transition-all duration-200"
          style={{ left: value ? '23px' : '4px', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
      </button>
    </div>
  );
}

// ── SectionCard ──────────────────────────────────────────────────────
function SectionCard({ sectionId, children }: { sectionId: string; children: React.ReactNode }) {
  const s = SECTIONS.find(x => x.id === sectionId)!;
  const Icon = s.icon;
  return (
    <div className="pb-8 border-b" style={{ borderColor: 'rgba(15,23,42,0.10)' }}>
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px]"
          style={{ background: s.gradient }}>
          <Icon size={16} className="text-white" />
        </div>
        <h2 className="text-[15px] font-[800] tracking-[-0.01em]" style={{ color: 'rgb(15,23,42)' }}>{s.label}</h2>
      </div>
      {children}
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

  // Core DB fields
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
    bio:            '',
  });

  // Extended contact (metadata)
  const [altPhone, setAltPhone]             = useState('');
  const [emergencyName, setEmergencyName]   = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  // Expertise (metadata)
  const [experience, setExperience] = useState('');
  const [language, setLanguage]     = useState('');

  // Schedule (DB column + metadata)
  const [workingDays, setWorkingDays]         = useState<string[]>([]);
  const [shiftStart, setShiftStart]           = useState('');
  const [shiftEnd, setShiftEnd]               = useState('');
  const [maxSessions, setMaxSessions]         = useState('');
  const [maxClients, setMaxClients]           = useState('');
  const [weekendAvail, setWeekendAvail]       = useState(false);
  const [earlyMorningAvail, setEarlyMorning]  = useState(false);

  // Compensation (metadata)
  const [salaryType, setSalaryType]               = useState('');
  const [sessionRate, setSessionRate]             = useState('');
  const [paymentFrequency, setPaymentFrequency]   = useState('');
  const [pfEsi, setPfEsi]                         = useState(false);
  const [bonusEligible, setBonusEligible]         = useState(false);

  // Banking (metadata)
  const [bank, setBank]                   = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc]                   = useState('');
  const [pan, setPan]                     = useState('');

  // Targets & Access (metadata)
  const [monthlyClientTarget, setMonthlyClientTarget]   = useState('');
  const [monthlyRevenueTarget, setMonthlyRevenueTarget] = useState('');
  const [studioAccess, setStudioAccess]                 = useState('');

  // Permissions (metadata)
  const [permManageClients, setPermManageClients]   = useState(true);
  const [permViewFinancials, setPermViewFinancials] = useState(false);
  const [permAttendance, setPermAttendance]         = useState(true);
  const [permContent, setPermContent]               = useState(false);
  const [permLeaveApproval, setPermLeaveApproval]   = useState(false);

  const [trainerName, setTrainerName] = useState('');
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState(false);

  useEffect(() => {
    api.trainers.get(id).then((t: any) => {
      const meta: Record<string, any> = t.metadata || {};

      setForm({
        name:           t.name || '',
        mobile:         t.mobile || '',
        email:          t.email || '',
        dob:            t.dob ? String(t.dob).slice(0, 10) : '',
        gender:         t.gender || '',
        joining_date:   t.joining_date ? String(t.joining_date).slice(0, 10) : '',
        address:        t.address || '',
        specialization: t.specialization || '',
        certifications: t.certifications || '',
        // incentive_rate stored as decimal 0–1 in DB; convert back to % for UI
        incentive_rate: t.incentive_rate != null ? String(Math.round(parseFloat(t.incentive_rate) * 100)) : '',
        salary:         t.salary != null ? String(t.salary) : '',
        status:         t.status || 'active',
        notes:          t.notes || '',
        role:           t.role || '',
        bio:            t.bio || '',
      });

      setAltPhone(meta.alternate_phone || '');
      setEmergencyName(meta.emergency_contact_name || '');
      setEmergencyPhone(meta.emergency_contact_phone || '');
      setExperience(meta.experience_years != null ? String(meta.experience_years) : '');
      setLanguage(meta.primary_language || '');
      setWorkingDays(
        t.schedule
          ? t.schedule.split(',').map((d: string) => d.trim()).filter(Boolean)
          : []
      );
      setShiftStart(meta.shift_start || '');
      setShiftEnd(meta.shift_end || '');
      setMaxSessions(meta.max_sessions_per_day != null ? String(meta.max_sessions_per_day) : '');
      setMaxClients(meta.max_clients != null ? String(meta.max_clients) : '');
      setWeekendAvail(!!meta.weekend_available);
      setEarlyMorning(!!meta.early_morning_available);
      setSalaryType(meta.salary_type || '');
      setSessionRate(meta.session_rate != null ? String(meta.session_rate) : '');
      setPaymentFrequency(meta.payment_frequency || '');
      setPfEsi(!!meta.include_pf_esi);
      setBonusEligible(!!meta.bonus_eligible);
      setBank(meta.bank || '');
      setAccountNumber(meta.account_number || '');
      setIfsc(meta.ifsc_code || '');
      setPan(meta.pan_number || '');
      setMonthlyClientTarget(meta.monthly_client_target != null ? String(meta.monthly_client_target) : '');
      setMonthlyRevenueTarget(meta.monthly_revenue_target != null ? String(meta.monthly_revenue_target) : '');
      setStudioAccess(meta.studio_access_level || '');
      setPermManageClients(meta.perm_manage_clients !== false);
      setPermViewFinancials(!!meta.perm_view_financials);
      setPermAttendance(meta.perm_attendance !== false);
      setPermContent(!!meta.perm_content);
      setPermLeaveApproval(!!meta.perm_leave_approval);

      setTrainerName(t.name || '');
      setLoading(false);
    }).catch((err: any) => {
      toast.error(err?.message || 'Failed to load trainer');
      setLoading(false);
    });
  }, [id, toast]);

  function set(k: keyof typeof form) {
    return (v: string) => setForm(f => ({ ...f, [k]: v }));
  }

  function toggleDay(day: string) {
    setWorkingDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  }

  const submit = useCallback(async (e?: FormEvent) => {
    e?.preventDefault();
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
        gender:         (form.gender as 'Male' | 'Female' | 'Other') || null,
        joining_date:   form.joining_date || null,
        address:        form.address || null,
        specialization: form.specialization || null,
        certifications: form.certifications || null,
        salary:         form.salary ? parseFloat(form.salary) : null,
        // send as percentage (0–100); backend divides by 100 before DB storage
        incentive_rate: form.incentive_rate ? parseFloat(form.incentive_rate) : null,
        status:         form.status as 'active' | 'inactive',
        notes:          form.notes || null,
        role:           form.role || null,
        bio:            form.bio || null,
        schedule:       workingDays.length > 0 ? workingDays.join(', ') : null,
        metadata: {
          alternate_phone:          altPhone || null,
          emergency_contact_name:   emergencyName || null,
          emergency_contact_phone:  emergencyPhone || null,
          primary_language:         language || null,
          experience_years:         experience ? parseInt(experience, 10) : null,
          salary_type:              salaryType || null,
          session_rate:             sessionRate ? parseFloat(sessionRate) : null,
          payment_frequency:        paymentFrequency || null,
          bank:                     bank || null,
          account_number:           accountNumber || null,
          ifsc_code:                ifsc || null,
          pan_number:               pan || null,
          include_pf_esi:           pfEsi,
          bonus_eligible:           bonusEligible,
          shift_start:              shiftStart || null,
          shift_end:                shiftEnd || null,
          max_sessions_per_day:     maxSessions ? parseInt(maxSessions, 10) : null,
          max_clients:              maxClients ? parseInt(maxClients, 10) : null,
          weekend_available:        weekendAvail,
          early_morning_available:  earlyMorningAvail,
          monthly_client_target:    monthlyClientTarget ? parseInt(monthlyClientTarget, 10) : null,
          monthly_revenue_target:   monthlyRevenueTarget ? parseFloat(monthlyRevenueTarget) : null,
          studio_access_level:      studioAccess || null,
          perm_manage_clients:      permManageClients,
          perm_view_financials:     permViewFinancials,
          perm_attendance:          permAttendance,
          perm_content:             permContent,
          perm_leave_approval:      permLeaveApproval,
        },
      });
      setSuccess(true);
      setTimeout(() => router.push(`/trainers/${id}`), 1400);
    } catch (err: any) {
      setError(err.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  }, [
    form, id, router,
    workingDays, altPhone, emergencyName, emergencyPhone, language, experience,
    salaryType, sessionRate, paymentFrequency, bank, accountNumber, ifsc, pan, pfEsi, bonusEligible,
    shiftStart, shiftEnd, maxSessions, maxClients, weekendAvail, earlyMorningAvail,
    monthlyClientTarget, monthlyRevenueTarget, studioAccess,
    permManageClients, permViewFinancials, permAttendance, permContent, permLeaveApproval,
  ]);

  // ── Loading skeleton ──────────────────────────────────────────────
  if (loading) {
    return (
      <div>
        <div className="mx-auto max-w-2xl space-y-4 py-12">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-36 animate-pulse rounded-[24px]" style={{ background: 'rgba(255,255,255,0.6)' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <PageTitle>Edit Trainer</PageTitle>
      <div className="pb-28">

        {/* ── Sticky page header ─────────────────────────────────────── */}
        <div className=""
          style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.55)', boxShadow: '0 1px 0 rgba(15,23,42,0.06)' }}>
          <div className="mx-auto flex max-w-2xl items-center gap-3 py-3.5">
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[16px] font-[800] tracking-[-0.02em]" style={{ color: 'rgb(15,23,42)' }}>Edit Trainer</h1>
              {trainerName && <p className="truncate text-[12px] font-[600]" style={{ color: '#F59E0B' }}>{trainerName}</p>}
            </div>
            <span className="shrink-0 rounded-full px-3 py-1.5 text-[11.5px] font-[700] text-white"
              style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)', boxShadow: '0 3px 10px rgba(245,158,11,0.40)' }}>
              Editing
            </span>
          </div>
          <div className="h-[2.5px] w-full" style={{ background: 'linear-gradient(90deg,#F59E0B,#D97706,#D97706)' }} />
        </div>

        <form onSubmit={submit}>
          <div className="mx-auto max-w-2xl space-y-5 py-7">

            {/* ── Banners ────────────────────────────────────────────── */}
            <AnimatePresence>
              {error && (
                <m.div key="error" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-start gap-3 rounded-[16px] p-4"
                  style={{ background: 'rgba(239,68,68,0.07)', border: '1.5px solid rgba(239,68,68,0.22)' }}>
                  <AlertCircle size={15} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
                  <p className="text-[13px] font-[600]" style={{ color: '#b91c1c' }}>{error}</p>
                </m.div>
              )}
              {success && (
                <m.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-3 rounded-[16px] p-4"
                  style={{ background: 'rgba(16,185,129,0.09)', border: '1.5px solid rgba(16,185,129,0.28)' }}>
                  <CheckCircle size={15} style={{ color: '#10B981', flexShrink: 0 }} />
                  <p className="text-[13px] font-[600]" style={{ color: '#059669' }}>Trainer updated! Redirecting…</p>
                </m.div>
              )}
            </AnimatePresence>

            {/* ── 1. Identity ────────────────────────────────────────── */}
            <SectionCard sectionId="identity">
              <div className="space-y-3">
                <FInput label="Full Name" required value={form.name} onChange={set('name')} accent="#F59E0B" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FInput label="Email Address" type="email" value={form.email} onChange={set('email')} accent="#F59E0B" />
                  <FInput label="Mobile Number" type="tel" value={form.mobile} onChange={set('mobile')} accent="#F59E0B" />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <FSelect label="Gender" value={form.gender} onChange={set('gender')} accent="#F59E0B"
                    options={[
                      { value: 'Male',   label: 'Male'   },
                      { value: 'Female', label: 'Female' },
                      { value: 'Other',  label: 'Other'  },
                    ]} />
                  <FInput label="Date of Birth" type="date" value={form.dob} onChange={set('dob')} accent="#F59E0B" />
                  <FInput label="Role / Title" value={form.role} onChange={set('role')} placeholder="Personal Trainer" accent="#F59E0B" />
                </div>
              </div>
            </SectionCard>

            {/* ── 2. Contact Details ─────────────────────────────────── */}
            <SectionCard sectionId="contact">
              <div className="space-y-3">
                <FInput label="Address" value={form.address} onChange={set('address')} accent="#0067E0" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FInput label="Alternate Phone" type="tel" value={altPhone} onChange={setAltPhone} accent="#0067E0" />
                  <FInput label="Emergency Contact Name" value={emergencyName} onChange={setEmergencyName} accent="#0067E0" />
                </div>
                <FInput label="Emergency Contact Phone" type="tel" value={emergencyPhone} onChange={setEmergencyPhone} accent="#0067E0" />
              </div>
            </SectionCard>

            {/* ── 3. Employment ──────────────────────────────────────── */}
            <SectionCard sectionId="employment">
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FInput label="Join Date" type="date" value={form.joining_date} onChange={set('joining_date')} accent="#0067E0" />
                  <div>
                    <p className="mb-2 text-[10.5px] font-[700] uppercase tracking-[0.10em]" style={{ color: 'rgba(148,163,184,0.9)' }}>Status</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(['active', 'inactive'] as const).map(s => {
                        const on = form.status === s;
                        const cfg = s === 'active'
                          ? { g: 'linear-gradient(135deg,#10B981,#34D399)', glow: '#00E5A855', label: 'Active'   }
                          : { g: 'linear-gradient(135deg,#94A3B8,#64748B)', glow: '#94A3B855', label: 'Inactive' };
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
              </div>
            </SectionCard>

            {/* ── 4. Expertise ───────────────────────────────────────── */}
            <SectionCard sectionId="expertise">
              <div className="space-y-3">
                <FInput label="Specialization" value={form.specialization} onChange={set('specialization')}
                  placeholder="Strength Training, HIIT, Yoga…" accent="#10B981" />
                <FInput label="Certifications" value={form.certifications} onChange={set('certifications')}
                  placeholder="K11 Fitness, ACE Certified, NASM CPT…" accent="#10B981" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FInput label="Experience (years)" type="number" value={experience} onChange={setExperience} accent="#10B981" />
                  <FSelect label="Primary Language" value={language} onChange={setLanguage} accent="#10B981"
                    options={[
                      { value: 'Hindi',   label: 'Hindi'   },
                      { value: 'English', label: 'English' },
                      { value: 'Both',    label: 'Both'    },
                    ]} />
                </div>
                <FloatLabel label="Bio">
                  <textarea rows={3} value={form.bio}
                    onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                    placeholder="Professional background, key achievements…"
                    className="w-full resize-none rounded-[16px] px-4 pb-3 pt-[30px] text-[14px] font-[500] outline-none transition-all duration-200"
                    style={{ background: '#ffffff', border: '1.5px solid rgba(15,23,42,0.09)', color: 'rgb(15,23,42)', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}
                    onFocus={e => { e.currentTarget.style.border = '1.5px solid #10B981'; e.currentTarget.style.boxShadow = '0 0 0 3.5px rgba(16,185,129,0.13)'; }}
                    onBlur={e => { e.currentTarget.style.border = '1.5px solid rgba(15,23,42,0.09)'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(15,23,42,0.05)'; }}
                  />
                </FloatLabel>
              </div>
            </SectionCard>

            {/* ── 5. Schedule ────────────────────────────────────────── */}
            <SectionCard sectionId="schedule">
              <div className="space-y-4">
                <div>
                  <p className="mb-2.5 text-[10.5px] font-[700] uppercase tracking-[0.10em]" style={{ color: 'rgba(148,163,184,0.9)' }}>Working Days</p>
                  <div className="flex flex-wrap gap-2">
                    {DAYS.map(day => {
                      const on = workingDays.includes(day);
                      return (
                        <button key={day} type="button" onClick={() => toggleDay(day)}
                          className="rounded-[10px] px-3.5 py-1.5 text-[12.5px] font-[700] transition-all duration-200 active:scale-95"
                          style={{
                            background: on ? 'linear-gradient(135deg,#FCD34D,#FBBF24)' : '#ffffff',
                            color: on ? '#fff' : 'rgb(100,116,139)',
                            border: on ? 'none' : '1.5px solid rgba(15,23,42,0.10)',
                            boxShadow: on ? '0 3px 10px rgba(252,211,77,0.40)' : '0 1px 3px rgba(15,23,42,0.05)',
                          }}>
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FInput label="Shift Start" type="time" value={shiftStart} onChange={setShiftStart} accent="#FCD34D" />
                  <FInput label="Shift End"   type="time" value={shiftEnd}   onChange={setShiftEnd}   accent="#FCD34D" />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FInput label="Max Sessions / Day" type="number" value={maxSessions} onChange={setMaxSessions} accent="#FCD34D" />
                  <FInput label="Max Clients"        type="number" value={maxClients}  onChange={setMaxClients}  accent="#FCD34D" />
                </div>
                <div className="space-y-2">
                  <Toggle label="Weekend Available"  sub="Available to work on Sat / Sun" value={weekendAvail}     onChange={setWeekendAvail}  accent="#FCD34D" />
                  <Toggle label="Early Morning Slots" sub="6 AM – 8 AM availability"      value={earlyMorningAvail} onChange={setEarlyMorning} accent="#FCD34D" />
                </div>
              </div>
            </SectionCard>

            {/* ── 6. Compensation ────────────────────────────────────── */}
            <SectionCard sectionId="compensation">
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FSelect label="Salary Type" value={salaryType} onChange={setSalaryType} accent="#0067E0"
                    options={[
                      { value: 'Fixed',      label: 'Fixed Monthly' },
                      { value: 'Hourly',     label: 'Hourly'        },
                      { value: 'Commission', label: 'Commission'    },
                      { value: 'Hybrid',     label: 'Hybrid'        },
                    ]} />
                  <FInput label="Base Salary (₹)" type="number" value={form.salary} onChange={set('salary')} accent="#0067E0" />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FInput label="Session Rate (₹)" type="number" value={sessionRate} onChange={setSessionRate} accent="#0067E0" />
                  <FInput label="Incentive Rate (%)" type="number" value={form.incentive_rate} onChange={set('incentive_rate')} accent="#0067E0" />
                </div>
                <FSelect label="Payment Frequency" value={paymentFrequency} onChange={setPaymentFrequency} accent="#0067E0"
                  options={[
                    { value: 'Monthly',     label: 'Monthly'     },
                    { value: 'Weekly',      label: 'Weekly'      },
                    { value: 'Bi-weekly',   label: 'Bi-weekly'   },
                    { value: 'Per-Session', label: 'Per Session' },
                  ]} />
                <div className="space-y-2">
                  <Toggle label="Include PF / ESI"  sub="Statutory deduction applies"    value={pfEsi}         onChange={setPfEsi}         accent="#0067E0" />
                  <Toggle label="Bonus Eligible"    sub="Eligible for performance bonus" value={bonusEligible} onChange={setBonusEligible} accent="#0067E0" />
                </div>
              </div>
            </SectionCard>

            {/* ── 7. Banking & Tax ───────────────────────────────────── */}
            <SectionCard sectionId="banking">
              <div className="space-y-3">
                <FInput label="Bank Name" value={bank} onChange={setBank} accent="#0067e0" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FInput label="Account Number" value={accountNumber} onChange={setAccountNumber} accent="#0067e0" />
                  <FInput label="IFSC Code"      value={ifsc}          onChange={setIfsc}          accent="#0067e0" />
                </div>
                <FInput label="PAN Number" value={pan} onChange={setPan} accent="#0067e0" />
              </div>
            </SectionCard>

            {/* ── 8. Targets & Access ────────────────────────────────── */}
            <SectionCard sectionId="targets">
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FInput label="Monthly Client Target"      type="number" value={monthlyClientTarget}  onChange={setMonthlyClientTarget}  accent="#7fb4ff" />
                  <FInput label="Monthly Revenue Target (₹)" type="number" value={monthlyRevenueTarget} onChange={setMonthlyRevenueTarget} accent="#7fb4ff" />
                </div>
                <FSelect label="Studio Access Level" value={studioAccess} onChange={setStudioAccess} accent="#7fb4ff"
                  options={[
                    { value: 'Basic',    label: 'Basic'    },
                    { value: 'Standard', label: 'Standard' },
                    { value: 'Premium',  label: 'Premium'  },
                    { value: 'Full',     label: 'Full'     },
                  ]} />
                <p className="pt-1 text-[10.5px] font-[700] uppercase tracking-[0.10em]" style={{ color: 'rgba(148,163,184,0.9)' }}>Permissions</p>
                <div className="space-y-2">
                  <Toggle label="Manage Clients"  sub="Can add/edit assigned clients"    value={permManageClients}  onChange={setPermManageClients}  accent="#7fb4ff" />
                  <Toggle label="View Financials" sub="Can see revenue & payment data"   value={permViewFinancials} onChange={setPermViewFinancials} accent="#7fb4ff" />
                  <Toggle label="Attendance"      sub="Can mark client attendance"       value={permAttendance}     onChange={setPermAttendance}     accent="#7fb4ff" />
                  <Toggle label="Content"         sub="Can upload workout/diet content"  value={permContent}        onChange={setPermContent}        accent="#7fb4ff" />
                  <Toggle label="Leave Approval"  sub="Can approve team leave requests"  value={permLeaveApproval}  onChange={setPermLeaveApproval}  accent="#7fb4ff" />
                </div>
              </div>
            </SectionCard>

            {/* ── 9. Notes ───────────────────────────────────────────── */}
            <SectionCard sectionId="notes">
              <textarea
                rows={4}
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Additional notes about this trainer…"
                className="w-full resize-none rounded-[16px] px-4 py-3.5 text-[14px] font-[500] outline-none transition-all duration-200"
                style={{ background: '#ffffff', border: '1.5px solid rgba(15,23,42,0.09)', color: 'rgb(15,23,42)', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}
                onFocus={e => { e.currentTarget.style.border = '1.5px solid #64748B'; e.currentTarget.style.boxShadow = '0 0 0 3.5px rgba(100,116,139,0.13)'; }}
                onBlur={e => { e.currentTarget.style.border = '1.5px solid rgba(15,23,42,0.09)'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(15,23,42,0.05)'; }}
              />
            </SectionCard>

          </div>
        </form>

        {/* ── Floating action bar ─────────────────────────────────────── */}
        <div className="page-action-bar px-4 pb-6 pt-3 lg:pl-[calc(var(--sidebar-w,256px)+16px)]"
          style={{ background: 'linear-gradient(to top, rgba(255,251,235,0.95) 70%, transparent)', backdropFilter: 'blur(12px)' }}>
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
            <Link href={`/trainers/${id}`}
              className="flex items-center gap-2 rounded-[16px] px-5 py-3 text-[14px] font-[700] transition-all duration-200 active:scale-95"
              style={{ background: 'rgba(255,255,255,0.90)', border: '1.5px solid rgba(15,23,42,0.10)', color: 'rgb(71,85,105)', boxShadow: '0 1px 6px rgba(15,23,42,0.07)' }}>
              <ArrowLeft size={15} /> Cancel
            </Link>
            <button type="button" onClick={() => submit()} disabled={saving || success}
              className="flex flex-1 items-center justify-center gap-2 rounded-[16px] py-3 text-[14.5px] font-[800] text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-60 sm:flex-none sm:px-10"
              style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706,#D97706)', boxShadow: '0 6px 24px rgba(245,158,11,0.45)' }}>
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
    </>
  );
}
