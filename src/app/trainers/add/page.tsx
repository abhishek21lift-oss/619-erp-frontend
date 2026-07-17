'use client';

import React, { useState, useRef, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  User, Phone, Mail, MapPin, Award, DollarSign,
  Clock, Users, Target, FileText, Shield,
  ChevronRight, ChevronLeft, Check, Upload, Plus, X,
  Dumbbell, Star, Zap, Calendar, Camera, AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';

// ── Types ────────────────────────────────────────────────────────────
type Step = {
  id: number; title: string; subtitle: string; icon: React.ReactNode;
  color: string; gradient: string; soft: string;
};

const STEPS: Step[] = [
  { id: 1, title: 'Personal Details',        subtitle: 'Basic info & photo',        icon: <User size={18}/>,       color: '#6366f1', gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)', soft: 'rgba(99,102,241,0.12)'  },
  { id: 2, title: 'Contact Information',     subtitle: 'Phone, email, address',     icon: <Phone size={18}/>,      color: '#0ea5e9', gradient: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', soft: 'rgba(14,165,233,0.12)'  },
  { id: 3, title: 'Coaching Specialization', subtitle: 'Expertise & certifications',icon: <Dumbbell size={18}/>,  color: '#f43f5e', gradient: 'linear-gradient(135deg,#f43f5e,#fb7185)', soft: 'rgba(244,63,94,0.12)'   },
  { id: 4, title: 'Salary & Payroll',        subtitle: 'Compensation details',      icon: <DollarSign size={18}/>, color: '#10b981', gradient: 'linear-gradient(135deg,#10b981,#34d399)', soft: 'rgba(16,185,129,0.12)'  },
  { id: 5, title: 'Shift & Schedule',        subtitle: 'Working hours',             icon: <Clock size={18}/>,      color: '#f59e0b', gradient: 'linear-gradient(135deg,#f59e0b,#fbbf24)', soft: 'rgba(245,158,11,0.12)'  },
  { id: 6, title: 'Clients & Permissions',   subtitle: 'Access & assignments',      icon: <Shield size={18}/>,     color: '#8b5cf6', gradient: 'linear-gradient(135deg,#8b5cf6,#a78bfa)', soft: 'rgba(139,92,246,0.12)'  },
];

const SPECIALIZATIONS = ['Strength Training', 'HIIT', 'Yoga', 'Pilates', 'Cardio', 'Powerlifting', 'CrossFit', 'Functional Training', 'Rehabilitation', 'Nutrition', 'Weight Loss', 'Muscle Gain', 'Endurance', 'Flexibility'];
const CERTIFICATIONS  = ['K11 Fitness', 'ACE Certified', 'NASM CPT', 'ISSA', 'ACSM', 'CrossFit L1', 'Yoga RYT 200', 'Sports Nutrition', 'First Aid CPR'];
const DAYS            = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MOBILE_RE = /^[6-9]\d{9}$/;
const EMAIL_RE  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── FloatLabel ───────────────────────────────────────────────────────
function FloatLabel({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="relative">
      {children}
      <label className="pointer-events-none absolute left-4 top-[10px] text-[10.5px] font-[700] uppercase tracking-[0.10em]"
        style={{ color: 'rgb(148,163,184)' }}>
        {label}{required && <span className="ml-0.5" style={{ color: '#f43f5e' }}>*</span>}
      </label>
    </div>
  );
}

// ── Input ────────────────────────────────────────────────────────────
function Input({ label, type = 'text', placeholder, required, value, onChange, accentColor = '#6366f1' }: {
  label: string; type?: string; placeholder?: string; required?: boolean;
  value?: string; onChange?: (v: string) => void; accentColor?: string;
}) {
  return (
    <FloatLabel label={label} required={required}>
      <input
        type={type} placeholder={placeholder}
        value={value ?? ''}
        onChange={e => onChange?.(e.target.value)}
        className="w-full rounded-[16px] px-4 pb-3 pt-[30px] text-[14px] font-[500] outline-none transition-all duration-200"
        style={{ background: '#ffffff', border: '1.5px solid rgba(15,23,42,0.09)', color: 'rgb(15,23,42)', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}
        onFocus={e => {
          e.currentTarget.style.border = `1.5px solid ${accentColor}`;
          e.currentTarget.style.boxShadow = `0 0 0 3.5px ${accentColor}22, 0 1px 4px rgba(15,23,42,0.05)`;
        }}
        onBlur={e => {
          e.currentTarget.style.border = '1.5px solid rgba(15,23,42,0.09)';
          e.currentTarget.style.boxShadow = '0 1px 4px rgba(15,23,42,0.05)';
        }}
      />
    </FloatLabel>
  );
}

// ── Select ───────────────────────────────────────────────────────────
function Select({ label, options, required, value, onChange, accentColor = '#6366f1' }: {
  label: string; options: string[]; required?: boolean;
  value?: string; onChange?: (v: string) => void; accentColor?: string;
}) {
  return (
    <FloatLabel label={label} required={required}>
      <select
        value={value ?? ''}
        onChange={e => onChange?.(e.target.value)}
        className="w-full appearance-none rounded-[16px] px-4 pb-3 pt-[30px] text-[14px] font-[500] outline-none transition-all duration-200"
        style={{ background: '#ffffff', border: '1.5px solid rgba(15,23,42,0.09)', color: 'rgb(15,23,42)', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}
        onFocus={e => {
          e.currentTarget.style.border = `1.5px solid ${accentColor}`;
          e.currentTarget.style.boxShadow = `0 0 0 3.5px ${accentColor}22, 0 1px 4px rgba(15,23,42,0.05)`;
        }}
        onBlur={e => {
          e.currentTarget.style.border = '1.5px solid rgba(15,23,42,0.09)';
          e.currentTarget.style.boxShadow = '0 1px 4px rgba(15,23,42,0.05)';
        }}
      >
        <option value="">Select</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </FloatLabel>
  );
}

// ── ChipGroup ────────────────────────────────────────────────────────
function ChipGroup({ options, selected, onChange, gradient, color }: {
  options: string[]; selected: string[]; onChange: (v: string[]) => void;
  gradient: string; color: string;
}) {
  function toggle(o: string) {
    onChange(selected.includes(o) ? selected.filter(s => s !== o) : [...selected, o]);
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => {
        const on = selected.includes(o);
        return (
          <button key={o} type="button" onClick={() => toggle(o)}
            className="flex items-center gap-1 rounded-full px-3.5 py-2 text-[12.5px] font-[600] transition-all duration-200 active:scale-95"
            style={{
              background: on ? gradient : 'rgba(15,23,42,0.04)',
              color: on ? '#fff' : 'rgb(71,85,105)',
              border: on ? 'none' : '1.5px solid rgba(15,23,42,0.07)',
              boxShadow: on ? `0 4px 14px ${color}40` : 'none',
            }}>
            {on && <Check size={11} strokeWidth={3} />}
            {o}
          </button>
        );
      })}
    </div>
  );
}

// ── ToggleSwitch — fully controlled ─────────────────────────────────
function ToggleSwitch({ label, sublabel, checked, onChange, accentColor = '#6366f1' }: {
  label: string; sublabel?: string;
  checked: boolean; onChange: (v: boolean) => void; accentColor?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-[16px] px-4 py-3.5 transition-all duration-200"
      style={{
        background: checked ? accentColor + '0D' : '#ffffff',
        border: `1.5px solid ${checked ? accentColor + '35' : 'rgba(15,23,42,0.08)'}`,
        boxShadow: '0 1px 4px rgba(15,23,42,0.05)',
      }}>
      <div>
        <p className="text-[13.5px] font-[600]" style={{ color: 'rgb(15,23,42)' }}>{label}</p>
        {sublabel && <p className="mt-0.5 text-[11.5px]" style={{ color: 'rgb(148,163,184)' }}>{sublabel}</p>}
      </div>
      <button type="button" onClick={() => onChange(!checked)}
        className="relative ml-4 h-7 w-[50px] shrink-0 rounded-full transition-all duration-300"
        style={{ background: checked ? accentColor : 'rgba(15,23,42,0.14)' }}
        aria-checked={checked} role="switch">
        <span className="absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white transition-all duration-300"
          style={{ left: checked ? '25px' : '3px', boxShadow: '0 2px 6px rgba(0,0,0,0.22)' }} />
      </button>
    </div>
  );
}

// ── DragDropUpload ───────────────────────────────────────────────────
function DragDropUpload({ label, accept, accentColor = '#6366f1', accentGradient }: {
  label: string; accept: string; accentColor?: string; accentGradient?: string;
}) {
  const [dragging, setDragging] = useState(false);
  const [files, setFiles]       = useState<string[]>([]);
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <p className="mb-2.5 text-[10.5px] font-[700] uppercase tracking-[0.10em]" style={{ color: 'rgb(148,163,184)' }}>{label}</p>
      <div
        onClick={() => ref.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); setFiles(p => [...p, ...Array.from(e.dataTransfer.files).map(f => f.name)]); }}
        className="flex cursor-pointer flex-col items-center gap-3 rounded-[20px] px-6 py-8 text-center transition-all duration-200"
        style={{
          border: `2px dashed ${dragging ? accentColor : 'rgba(15,23,42,0.11)'}`,
          background: dragging ? accentColor + '08' : 'rgba(248,250,252,0.7)',
        }}>
        <div className="flex h-12 w-12 items-center justify-center rounded-[14px]"
          style={{ background: accentGradient || accentColor, boxShadow: `0 6px 18px ${accentColor}45` }}>
          <Upload size={20} className="text-white" />
        </div>
        <div>
          <p className="text-[13px] font-[600]" style={{ color: 'rgb(71,85,105)' }}>
            Drop files here or <span style={{ color: accentColor }}>browse</span>
          </p>
          <p className="mt-0.5 text-[11px]" style={{ color: 'rgb(148,163,184)' }}>{accept}</p>
        </div>
        <input ref={ref} type="file" accept={accept} multiple className="hidden"
          onChange={e => setFiles(p => [...p, ...Array.from(e.target.files || []).map(f => f.name)])} />
      </div>
      {files.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {files.map((f, i) => (
            <span key={i} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-[600]"
              style={{ background: accentColor + '12', color: accentColor, border: `1px solid ${accentColor}28` }}>
              <FileText size={10} />{f}
              <button onClick={() => setFiles(p => p.filter((_, j) => j !== i))} className="ml-0.5 opacity-60 hover:opacity-100">
                <X size={9} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── SectionLabel ─────────────────────────────────────────────────────
function SectionLabel({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <p className="mb-3 text-[10.5px] font-[700] uppercase tracking-[0.12em]" style={{ color }}>
      {children}
    </p>
  );
}

// ── Page ─────────────────────────────────────────────────────────────
export default function AddCoachPage() {
  const router = useRouter();
  const [step, setStep]           = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState('');
  const [specs, setSpecs]         = useState<string[]>([]);
  const [certs, setCerts]         = useState<string[]>([]);
  const [workDays, setWorkDays]   = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  // Step 1
  const [firstName, setFirstName]           = useState('');
  const [lastName, setLastName]             = useState('');
  // gender values must match DB CHECK constraint: 'Male'|'Female'|'Other'|null
  const [gender, setGender]                 = useState('');
  const [dob, setDob]                       = useState('');
  const [joinDate, setJoinDate]             = useState('');
  // Step 2
  const [mobile, setMobile]                 = useState('');
  const [altPhone, setAltPhone]             = useState('');
  const [email, setEmail]                   = useState('');
  const [emergencyName, setEmergencyName]   = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [address, setAddress]               = useState('');
  const [city, setCity]                     = useState('');
  const [stateField, setStateField]         = useState('');
  const [pinCode, setPinCode]               = useState('');
  // Step 3
  const [experience, setExperience]         = useState('');
  const [language, setLanguage]             = useState('');
  const [bio, setBio]                       = useState('');
  const [notes, setNotes]                   = useState('');
  // Step 4
  const [salaryType, setSalaryType]         = useState('');
  // salary stored in rupees (NUMERIC(12,2))
  const [salary, setSalary]                 = useState('');
  const [sessionRate, setSessionRate]       = useState('');
  // incentive_rate is a percentage (0-100); backend divides by 100 before DB storage
  const [incentiveRate, setIncentiveRate]   = useState('');
  const [paymentFrequency, setPaymentFrequency] = useState('');
  const [bank, setBank]                     = useState('');
  const [accountNumber, setAccountNumber]   = useState('');
  const [ifsc, setIfsc]                     = useState('');
  const [pan, setPan]                       = useState('');
  const [pfEsi, setPfEsi]                   = useState(false);
  const [bonusEligible, setBonusEligible]   = useState(true);
  // Step 5
  const [shiftStart, setShiftStart]         = useState('');
  const [shiftEnd, setShiftEnd]             = useState('');
  const [maxSessions, setMaxSessions]       = useState('');
  const [maxClients, setMaxClients]         = useState('');
  const [weekendAvail, setWeekendAvail]     = useState(true);
  const [earlyMorningAvail, setEarlyMorningAvail] = useState(false);
  // Step 6
  const [monthlyClientTarget, setMonthlyClientTarget]   = useState('');
  const [monthlyRevenueTarget, setMonthlyRevenueTarget] = useState('');
  const [studioAccess, setStudioAccess]                 = useState('');
  const [permManageClients, setPermManageClients]       = useState(true);
  const [permViewFinancials, setPermViewFinancials]     = useState(false);
  const [permAttendance, setPermAttendance]             = useState(true);
  const [permContent, setPermContent]                   = useState(false);
  const [permLeaveApproval, setPermLeaveApproval]       = useState(false);

  const current  = STEPS[step - 1];
  const progress = ((step - 1) / (STEPS.length - 1)) * 100;
  const ac       = current.color;
  const ag       = current.gradient;
  const as_      = current.soft;

  const handleSubmit = useCallback(async () => {
    if (!firstName.trim()) { setError('First name is required'); setStep(1); return; }
    if (!email.trim()) { setError('Email address is required'); setStep(2); return; }
    if (!EMAIL_RE.test(email.trim())) { setError('Please enter a valid email address'); setStep(2); return; }
    if (!mobile.trim()) { setError('Phone number is required'); setStep(2); return; }
    if (!MOBILE_RE.test(mobile.trim())) { setError('Phone must be a valid 10-digit Indian mobile number starting with 6–9'); setStep(2); return; }
    setSubmitting(true);
    setError('');
    try {
      const fullAddress = [address, city, stateField, pinCode].filter(Boolean).join(', ');
      await api.trainers.create({
        name:           (firstName.trim() + ' ' + lastName.trim()).trim(),
        mobile:         mobile.trim(),
        email:          email.trim(),
        dob:            dob || null,
        gender:         gender || null,
        joining_date:   joinDate || null,
        address:        fullAddress || null,
        specialization: specs.length > 0 ? specs.join(', ') : null,
        certifications: certs.length > 0 ? certs.join(', ') : null,
        salary:         salary ? parseFloat(salary) : null,
        incentive_rate: incentiveRate ? parseFloat(incentiveRate) : null,
        bio:            bio || null,
        notes:          notes || null,
        schedule:       workDays.length > 0 ? workDays.join(', ') : null,
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
      router.push('/trainers');
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Failed to create coach');
    } finally {
      setSubmitting(false);
    }
  }, [
    firstName, lastName, mobile, email, dob, gender, joinDate,
    address, city, stateField, pinCode, specs, certs,
    salary, incentiveRate, bio, notes, workDays,
    altPhone, emergencyName, emergencyPhone, language, experience,
    salaryType, sessionRate, paymentFrequency, bank, accountNumber, ifsc, pan, pfEsi, bonusEligible,
    shiftStart, shiftEnd, maxSessions, maxClients, weekendAvail, earlyMorningAvail,
    monthlyClientTarget, monthlyRevenueTarget, studioAccess,
    permManageClients, permViewFinancials, permAttendance, permContent, permLeaveApproval,
    router,
  ]);

  const stepContent: Record<number, React.ReactNode> = {
    1: (
      <div className="space-y-4">
        <div className="flex justify-center pb-2">
          <button type="button" onClick={() => photoRef.current?.click()}
            className="group relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-[28px] transition-all duration-300"
            style={{ background: photoPreview ? 'transparent' : ag, boxShadow: `0 10px 36px ${ac}45` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {photoPreview
              ? <img src={photoPreview} alt="" className="h-full w-full rounded-[28px] object-cover" />
              : <Camera size={30} className="text-white" />
            }
            <span className="absolute inset-0 flex items-center justify-center rounded-[28px] bg-black/25 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <Camera size={22} className="text-white" />
            </span>
          </button>
          <input ref={photoRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) setPhotoPreview(URL.createObjectURL(f)); }} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="First Name" required value={firstName} onChange={setFirstName} accentColor={ac} />
          <Input label="Last Name" value={lastName} onChange={setLastName} accentColor={ac} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select label="Gender" options={['Male', 'Female', 'Other']} value={gender} onChange={setGender} accentColor={ac} />
          <Input label="Date of Birth" type="date" value={dob} onChange={setDob} accentColor={ac} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Employee ID" placeholder="AUTO-GENERATED" accentColor={ac} />
          <Input label="Join Date" type="date" value={joinDate} onChange={setJoinDate} accentColor={ac} />
        </div>
      </div>
    ),
    2: (
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Phone Number" type="tel" required value={mobile} onChange={setMobile} accentColor={ac} />
          <Input label="Alternate Phone" type="tel" value={altPhone} onChange={setAltPhone} accentColor={ac} />
        </div>
        <Input label="Email Address" type="email" required value={email} onChange={setEmail} accentColor={ac} />
        <Input label="Emergency Contact Name" value={emergencyName} onChange={setEmergencyName} accentColor={ac} />
        <Input label="Emergency Contact Phone" type="tel" value={emergencyPhone} onChange={setEmergencyPhone} accentColor={ac} />
        <Input label="Address Line 1" value={address} onChange={setAddress} accentColor={ac} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input label="City" value={city} onChange={setCity} accentColor={ac} />
          <Input label="State" value={stateField} onChange={setStateField} accentColor={ac} />
          <Input label="PIN Code" value={pinCode} onChange={setPinCode} accentColor={ac} />
        </div>
      </div>
    ),
    3: (
      <div className="space-y-5">
        <div>
          <SectionLabel color={ac}>Coaching Specializations</SectionLabel>
          <ChipGroup options={SPECIALIZATIONS} selected={specs} onChange={setSpecs} gradient={ag} color={ac} />
        </div>
        <div>
          <SectionLabel color={ac}>Certifications</SectionLabel>
          <ChipGroup options={CERTIFICATIONS} selected={certs} onChange={setCerts} gradient={ag} color={ac} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Years of Experience" type="number" value={experience} onChange={setExperience} accentColor={ac} />
          <Select label="Primary Language" options={['Hindi', 'English', 'Both']} value={language} onChange={setLanguage} accentColor={ac} />
        </div>
        <Input label="Bio / About Coach" value={bio} onChange={setBio} accentColor={ac} />
        <DragDropUpload label="Certification Documents" accept=".pdf,.jpg,.png" accentColor={ac} accentGradient={ag} />
      </div>
    ),
    4: (
      <div className="space-y-3">
        <Select label="Salary Type" options={['Fixed Monthly', 'Per Session', 'Revenue Share', 'Hybrid']} value={salaryType} onChange={setSalaryType} accentColor={ac} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Base Salary (₹)" type="number" value={salary} onChange={setSalary} accentColor={ac} />
          <Input label="Session Rate (₹)" type="number" value={sessionRate} onChange={setSessionRate} accentColor={ac} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Revenue Share %" type="number" value={incentiveRate} onChange={setIncentiveRate} accentColor={ac} />
          <Select label="Payment Frequency" options={['Monthly', 'Bi-Weekly', 'Weekly']} value={paymentFrequency} onChange={setPaymentFrequency} accentColor={ac} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select label="Bank" options={['SBI', 'HDFC', 'ICICI', 'Axis', 'Kotak', 'Other']} value={bank} onChange={setBank} accentColor={ac} />
          <Input label="Account Number" value={accountNumber} onChange={setAccountNumber} accentColor={ac} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="IFSC Code" value={ifsc} onChange={setIfsc} accentColor={ac} />
          <Input label="PAN Number" value={pan} onChange={setPan} accentColor={ac} />
        </div>
        <div className="space-y-2.5">
          <ToggleSwitch label="Include PF / ESI" sublabel="Statutory deductions applicable" checked={pfEsi} onChange={setPfEsi} accentColor={ac} />
          <ToggleSwitch label="Bonus Eligible" sublabel="Performance-based bonus" checked={bonusEligible} onChange={setBonusEligible} accentColor={ac} />
        </div>
      </div>
    ),
    5: (
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Shift Start Time" type="time" value={shiftStart} onChange={setShiftStart} accentColor={ac} />
          <Input label="Shift End Time" type="time" value={shiftEnd} onChange={setShiftEnd} accentColor={ac} />
        </div>
        <div>
          <SectionLabel color={ac}>Working Days</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {DAYS.map(d => {
              const on = workDays.includes(d);
              return (
                <button key={d} type="button"
                  onClick={() => setWorkDays(on ? workDays.filter(x => x !== d) : [...workDays, d])}
                  className="h-11 w-14 rounded-[14px] text-[13px] font-[700] transition-all duration-200 active:scale-95"
                  style={{
                    background: on ? ag : '#ffffff',
                    color: on ? '#fff' : 'rgb(100,116,139)',
                    border: on ? 'none' : '1.5px solid rgba(15,23,42,0.09)',
                    boxShadow: on ? `0 4px 16px ${ac}45` : '0 1px 4px rgba(15,23,42,0.05)',
                  }}>
                  {d}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Max Sessions / Day" type="number" value={maxSessions} onChange={setMaxSessions} accentColor={ac} />
          <Input label="Max Clients" type="number" value={maxClients} onChange={setMaxClients} accentColor={ac} />
        </div>
        <div className="space-y-2.5">
          <ToggleSwitch label="Available for Weekends" sublabel="Saturday & Sunday availability" checked={weekendAvail} onChange={setWeekendAvail} accentColor={ac} />
          <ToggleSwitch label="Available for Early Morning" sublabel="Before 7:00 AM shifts" checked={earlyMorningAvail} onChange={setEarlyMorningAvail} accentColor={ac} />
        </div>
      </div>
    ),
    6: (
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Monthly Client Target" type="number" value={monthlyClientTarget} onChange={setMonthlyClientTarget} accentColor={ac} />
          <Input label="Monthly Revenue Target (₹)" type="number" value={monthlyRevenueTarget} onChange={setMonthlyRevenueTarget} accentColor={ac} />
        </div>
        <Select label="Studio Access Level" options={['Full Access', 'Floor Only', 'Limited Hours', 'Custom']} value={studioAccess} onChange={setStudioAccess} accentColor={ac} />
        <div>
          <SectionLabel color={ac}>Studio Permissions</SectionLabel>
          <div className="space-y-2.5">
            <ToggleSwitch label="Manage Own Clients"    sublabel="Add/remove client assignments"  checked={permManageClients}  onChange={setPermManageClients}  accentColor={ac} />
            <ToggleSwitch label="View Financial Data"   sublabel="Revenue and payment reports"    checked={permViewFinancials} onChange={setPermViewFinancials} accentColor={ac} />
            <ToggleSwitch label="Attendance Management" sublabel="Mark and edit attendance"       checked={permAttendance}     onChange={setPermAttendance}     accentColor={ac} />
            <ToggleSwitch label="Content Publishing"    sublabel="Post to engagement channels"   checked={permContent}        onChange={setPermContent}        accentColor={ac} />
            <ToggleSwitch label="Leave Self-Approval"   sublabel="Approve own leave requests"    checked={permLeaveApproval}  onChange={setPermLeaveApproval}  accentColor={ac} />
          </div>
        </div>
        <DragDropUpload label="Identity Documents (Aadhaar / PAN)" accept=".pdf,.jpg,.png" accentColor={ac} accentGradient={ag} />
      </div>
    ),
  };

  return (
    <Guard role="admin">
      <AppShell title="Add New Coach">
        <div className="min-h-screen" style={{
          background: 'linear-gradient(160deg, #ede9fe 0%, #e0f2fe 32%, #dcfce7 62%, #fef3c7 100%)',
        }}>

          <div className="sticky below-topbar z-30"
            style={{
              background: 'rgba(255,255,255,0.82)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderBottom: '1px solid rgba(255,255,255,0.55)',
              boxShadow: '0 1px 0 rgba(15,23,42,0.06)',
            }}>
            <div className="mx-auto flex max-w-3xl items-center gap-4 px-5 py-3.5">
              <Link href="/trainers"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] transition-all duration-200 hover:scale-105 active:scale-95"
                style={{ background: as_, border: `1.5px solid ${ac}30` }}>
                <ChevronLeft size={16} style={{ color: ac }} />
              </Link>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-[16px] font-[800] tracking-[-0.02em]" style={{ color: 'rgb(15,23,42)' }}>Add New Coach</h1>
                <p className="text-[12px] font-[600]" style={{ color: ac }}>Step {step} of {STEPS.length} — {current.title}</p>
              </div>
              <m.span
                key={step}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="rounded-full px-3.5 py-1.5 text-[12px] font-[800] text-white"
                style={{ background: ag, boxShadow: `0 3px 12px ${ac}45` }}>
                {Math.round(progress)}%
              </m.span>
            </div>
            <div className="h-[3px] w-full" style={{ background: 'rgba(15,23,42,0.06)' }}>
              <m.div className="h-full" style={{ background: ag }}
                animate={{ width: progress + '%' }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }} />
            </div>
          </div>

          <div className="mx-auto max-w-3xl px-5 py-8">

            <div className="mb-8 flex gap-2 overflow-x-auto pb-1">
              {STEPS.map(s => (
                <button key={s.id} type="button" onClick={() => setStep(s.id)}
                  className="flex shrink-0 items-center gap-2 rounded-[16px] px-4 py-2.5 transition-all duration-200 active:scale-95"
                  style={{
                    background: step === s.id ? s.gradient : step > s.id ? 'rgba(16,185,129,0.09)' : 'rgba(255,255,255,0.80)',
                    border: step === s.id ? 'none' : step > s.id ? '1.5px solid rgba(16,185,129,0.28)' : '1.5px solid rgba(15,23,42,0.08)',
                    boxShadow: step === s.id ? `0 4px 18px ${s.color}42` : step > s.id ? 'none' : '0 1px 4px rgba(15,23,42,0.05)',
                  }}>
                  <span style={{ color: step === s.id ? '#fff' : step > s.id ? '#059669' : 'rgb(148,163,184)' }}>
                    {step > s.id ? <Check size={14} strokeWidth={3} /> : s.icon}
                  </span>
                  <span className="hidden text-[12.5px] font-[700] sm:block"
                    style={{ color: step === s.id ? '#fff' : step > s.id ? '#059669' : 'rgb(100,116,139)' }}>
                    {s.title}
                  </span>
                </button>
              ))}
            </div>

            <AnimatePresence>
              {error && (
                <m.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="mb-5 flex items-start gap-3 rounded-[16px] p-4"
                  style={{ background: 'rgba(244,63,94,0.07)', border: '1.5px solid rgba(244,63,94,0.20)' }}>
                  <AlertCircle size={16} style={{ color: '#f43f5e', flexShrink: 0, marginTop: '1px' }} />
                  <p className="text-[13px] font-[600]" style={{ color: '#be123c' }}>{error}</p>
                </m.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              <m.div key={step}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}>

                <div className="mb-6 flex items-center gap-3 border-b pb-5" style={{ borderColor: 'rgba(15,23,42,0.10)' }}>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]"
                    style={{ background: ag }}>
                    <span style={{ color: '#fff' }}>{current.icon}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-[17px] font-[800] tracking-[-0.01em]" style={{ color: 'rgb(15,23,42)' }}>{current.title}</h2>
                    <p className="text-[12px] font-[500]" style={{ color: 'rgb(100,116,139)' }}>{current.subtitle}</p>
                  </div>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                    style={{ background: ag }}>
                    <span className="text-[14px] font-[800] text-white">{step}</span>
                  </div>
                </div>

                <div>
                  {stepContent[step]}
                </div>

              </m.div>
            </AnimatePresence>

            <div className="mt-6 flex items-center justify-between gap-3">
              <button type="button"
                onClick={() => setStep(s => Math.max(1, s - 1))}
                disabled={step === 1}
                className="flex items-center gap-2 rounded-[16px] px-5 py-3 text-[14px] font-[700] transition-all duration-200 active:scale-95 disabled:opacity-30"
                style={{
                  background: 'rgba(255,255,255,0.85)',
                  border: '1.5px solid rgba(15,23,42,0.10)',
                  color: 'rgb(71,85,105)',
                  boxShadow: '0 1px 5px rgba(15,23,42,0.07)',
                }}>
                <ChevronLeft size={16} /> Previous
              </button>

              {step < STEPS.length ? (
                <button type="button"
                  onClick={() => setStep(s => Math.min(STEPS.length, s + 1))}
                  className="flex items-center gap-2 rounded-[16px] px-7 py-3 text-[14px] font-[700] text-white transition-all duration-200 active:scale-95"
                  style={{ background: ag, boxShadow: `0 4px 20px ${ac}48` }}>
                  Continue <ChevronRight size={16} />
                </button>
              ) : (
                <button type="button" onClick={handleSubmit} disabled={submitting}
                  className="flex items-center gap-2 rounded-[16px] px-7 py-3 text-[14px] font-[700] text-white transition-all duration-200 active:scale-95 disabled:opacity-60"
                  style={{ background: ag, boxShadow: `0 4px 20px ${ac}48` }}>
                  {submitting ? <span className="animate-spin">&#9696;</span> : <Check size={16} strokeWidth={3} />}
                  {submitting ? 'Creating…' : 'Add Coach'}
                </button>
              )}
            </div>

          </div>
        </div>
      </AppShell>
    </Guard>
  );
}
