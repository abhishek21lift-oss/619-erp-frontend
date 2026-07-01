'use client';
import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';

// ─── CONSTANTS ──────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Basic Info',    icon: '👤' },
  { id: 2, label: 'Role & Access', icon: '🔐' },
  { id: 3, label: 'Schedule',      icon: '📅' },
  { id: 4, label: 'Payroll',       icon: '💰' },
  { id: 5, label: 'Address',       icon: '📍' },
  { id: 6, label: 'Review',        icon: '✅' },
];

const ROLE_CARDS = [
  { key: 'admin',        label: 'Admin',          icon: '⚡', color: '#7c3aed', bg: '#f5f3ff', desc: 'Full system access', level: 'Super' },
  { key: 'manager',     label: 'Manager',         icon: '🏆', color: '#2563eb', bg: '#eff6ff', desc: 'Manage teams & ops', level: 'High' },
  { key: 'trainer',     label: 'Trainer',         icon: '💪', color: '#059669', bg: '#f0fdf4', desc: 'Client & PT sessions', level: 'Medium' },
  { key: 'receptionist',label: 'Front Desk',      icon: '🖥️', color: '#d97706', bg: '#fffbeb', desc: 'Check-ins & bookings', level: 'Low' },
  { key: 'accountant',  label: 'Accountant',      icon: '📊', color: '#F59E0B', bg: '#fffbeb', desc: 'Payroll & reports', level: 'Medium' },
  { key: 'support',     label: 'Support Staff',   icon: '🛎️', color: '#0891b2', bg: '#f0f9ff', desc: 'Facility & floor ops', level: 'Basic' },
];

const WEEK_DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

const PERMISSIONS = [
  { key: 'allow_discount',    label: 'Allow Discounting',      desc: 'Can apply discounts to plans',     icon: '🏷️' },
  { key: 'own_clients_only',  label: 'View Own Clients Only',  desc: 'Restricted client visibility',     icon: '👁️' },
  { key: 'auto_alloc_leads',  label: 'Auto Allocate Leads',    desc: 'Gets leads assigned automatically', icon: '🎯' },
  { key: 'payroll_access',    label: 'Payroll Access',         desc: 'Can view payroll data',            icon: '💳' },
  { key: 'analytics_access',  label: 'Analytics Access',       desc: 'Revenue & performance reports',    icon: '📈' },
  { key: 'financial_access',  label: 'Financial Access',       desc: 'Full financial dashboard',         icon: '🏦' },
];

const GENDER_OPTIONS = ['Male','Female','Non-binary','Prefer not to say'];
const PAY_FREQ = ['Monthly','Weekly','Bi-weekly','Daily'];

// ─── TYPES ──────────────────────────────────────────────────────────────────
interface ShiftDay {
  enabled: boolean;
  shift1_start: string;
  shift1_end: string;
  shift2_start: string;
  shift2_end: string;
  break_hours: string;
}

interface FormData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  confirm_password: string;
  phone: string;
  dob: string;
  gender: string;
  role: string;
  permissions: Record<string, boolean>;
  salary: string;
  pay_frequency: string;
  deduct_absent: boolean;
  incentive: string;
  schedule: Record<string, ShiftDay>;
  flat_no: string;
  street: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
}

function defaultSchedule(): Record<string, ShiftDay> {
  const s: Record<string, ShiftDay> = {};
  WEEK_DAYS.forEach(d => {
    s[d] = { enabled: ['Monday','Tuesday','Wednesday','Thursday','Friday'].includes(d),
      shift1_start: '06:00', shift1_end: '14:00',
      shift2_start: '', shift2_end: '',
      break_hours: '1' };
  });
  return s;
}

function initForm(): FormData {
  return {
    first_name: '', last_name: '', email: '', password: '', confirm_password: '',
    phone: '', dob: '', gender: 'Male',
    role: 'trainer',
    permissions: { allow_discount: false, own_clients_only: false, auto_alloc_leads: false,
                   payroll_access: false, analytics_access: false, financial_access: false },
    salary: '', pay_frequency: 'Monthly', deduct_absent: true, incentive: '',
    schedule: defaultSchedule(),
    flat_no: '', street: '', city: 'Lucknow', state: 'Uttar Pradesh', country: 'India', pincode: '',
  };
}

function initials(f: string, l: string) {
  return ((f[0] || '') + (l[0] || '')).toUpperCase() || '??';
}

function strengthScore(p: string): number {
  let s = 0;
  if (p.length >= 8)  s++;
  if (/[A-Z]/.test(p)) s++;
  if (/[0-9]/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return s;
}

function weeklyHours(schedule: Record<string, ShiftDay>): number {
  let total = 0;
  Object.values(schedule).forEach(d => {
    if (!d.enabled) return;
    if (d.shift1_start && d.shift1_end) {
      const [sh, sm] = d.shift1_start.split(':').map(Number);
      const [eh, em] = d.shift1_end.split(':').map(Number);
      total += (eh * 60 + em - sh * 60 - sm) / 60;
    }
    if (d.shift2_start && d.shift2_end) {
      const [sh, sm] = d.shift2_start.split(':').map(Number);
      const [eh, em] = d.shift2_end.split(':').map(Number);
      total += (eh * 60 + em - sh * 60 - sm) / 60;
    }
    total -= parseFloat(d.break_hours || '0');
  });
  return Math.max(0, total);
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────
export default function NewStaffPage() {
  return <Guard><StaffWizard /></Guard>;
}

function StaffWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(initForm());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [showPw, setShowPw] = useState(false);

  const set = useCallback(<K extends keyof FormData>(key: K, val: FormData[K]) => {
    setForm(prev => ({ ...prev, [key]: val }));
  }, []);

  function showToast(msg: string) {
    setToast(msg); setTimeout(() => setToast(''), 2800);
  }

  function goNext() { setStep(s => Math.min(s + 1, 6)); setError(''); }
  function goPrev() { setStep(s => Math.max(s - 1, 1)); setError(''); }

  async function handleCreate() {
    setError('');
    if (!form.first_name || !form.last_name) { setError('Please fill first and last name.'); return; }
    if (!form.email) { setError('Email is required.'); return; }
    if (!form.password) { setError('Password is required.'); return; }
    if (form.password !== form.confirm_password) { setError('Passwords do not match.'); return; }
    setSaving(true);
    try {
      await api.staff.create({
        name: `${form.first_name} ${form.last_name}`.trim(),
        email: form.email,
        phone: form.phone,
        role: form.role,
        password: form.password,
        dob: form.dob,
        gender: form.gender,
        salary: form.salary ? parseFloat(form.salary) : undefined,
        pay_frequency: form.pay_frequency,
        deduct_absent: form.deduct_absent,
        incentive: form.incentive ? parseFloat(form.incentive) : undefined,
        schedule: form.schedule,
        permissions: form.permissions,
        address: {
          flat_no: form.flat_no, street: form.street, city: form.city,
          state: form.state, country: form.country, pincode: form.pincode,
        },
      });
      showToast('✅ Staff account created!');
      setTimeout(() => router.push('/settings/staff'), 900);
    } catch (e: any) {
      setError(e.message || 'Failed to create staff account');
    } finally {
      setSaving(false);
    }
  }

  const strength = strengthScore(form.password);
  const strengthLabels = ['','Weak','Fair','Good','Strong'];
  const strengthColors = ['#e2e8f0','#ef4444','#f59e0b','#3b82f6','#22c55e'];
  const whrs = weeklyHours(form.schedule);
  const estMonthly = parseFloat(form.salary || '0');
  const roleInfo = ROLE_CARDS.find(r => r.key === form.role);

  return (
    <AppShell>
      <style>{`
        /* ─── CSS RESET & TOKENS ─── */
        .sw-root {
          --crimson: #e11d48;
          --crimson-dark: #be123c;
          --crimson-glow: rgba(225,29,72,0.15);
          --violet: #7c3aed;
          --surface: #ffffff;
          --surface-2: #f8fafc;
          --surface-3: #f1f5f9;
          --border: #e2e8f0;
          --border-soft: #f1f5f9;
          --text: #0f172a;
          --text-muted: #64748b;
          --text-faint: #94a3b8;
          --radius: 12px;
          --radius-lg: 16px;
          --shadow-sm: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
          --shadow-md: 0 4px 16px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04);
          --shadow-lg: 0 12px 40px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.04);
          --trans: 180ms cubic-bezier(0.16,1,0.3,1);
          font-family: -apple-system, 'Inter', BlinkMacSystemFont, sans-serif;
          color: var(--text);
        }

        /* ─── LAYOUT ─── */
        .sw-wrap { display: flex; gap: 24px; max-width: 1160px; margin: 0 auto;
          padding: 28px 24px 120px; align-items: flex-start; }
        .sw-main { flex: 1; min-width: 0; }
        .sw-panel { width: 280px; flex-shrink: 0; position: sticky; top: 24px; }
        @media (max-width: 900px) { .sw-wrap { flex-direction: column; padding: 16px 16px 120px; }
          .sw-panel { width: 100%; position: static; } }

        /* ─── HERO ─── */
        .sw-hero {
          background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #1e0a2e 100%);
          border-radius: var(--radius-lg); padding: 32px; margin-bottom: 24px;
          position: relative; overflow: hidden;
        }
        .sw-hero::before {
          content: ''; position: absolute; inset: 0;
          background: radial-gradient(ellipse at 80% 50%, rgba(124,58,237,0.35) 0%, transparent 60%),
                      radial-gradient(ellipse at 20% 80%, rgba(225,29,72,0.25) 0%, transparent 50%);
          pointer-events: none;
        }
        .sw-hero-badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(225,29,72,0.2); border: 1px solid rgba(225,29,72,0.4);
          color: #fca5a5; border-radius: 100px; padding: 4px 12px;
          font-size: 11px; font-weight: 700; letter-spacing: 0.06em;
          text-transform: uppercase; margin-bottom: 14px; position: relative;
        }
        .sw-hero-title {
          font-size: clamp(22px,3vw,32px); font-weight: 900; color: #fff;
          letter-spacing: -0.04em; line-height: 1.15; position: relative;
        }
        .sw-hero-title span { color: #f87171; }
        .sw-hero-sub {
          font-size: 14px; color: rgba(255,255,255,0.55); margin-top: 8px;
          max-width: 480px; line-height: 1.6; position: relative;
        }
        .sw-hero-chips {
          display: flex; gap: 10px; margin-top: 18px; flex-wrap: wrap; position: relative;
        }
        .sw-hero-chip {
          background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.75); border-radius: 100px;
          padding: 5px 14px; font-size: 12px; font-weight: 600;
        }

        /* ─── PROGRESS RAIL ─── */
        .sw-steps {
          display: flex; gap: 0; margin-bottom: 24px;
          background: var(--surface); border: 1px solid var(--border-soft);
          border-radius: var(--radius-lg); padding: 6px;
          box-shadow: var(--shadow-sm);
        }
        .sw-step-btn {
          flex: 1; display: flex; flex-direction: column; align-items: center;
          padding: 10px 6px; border-radius: 10px; border: none; cursor: pointer;
          transition: all var(--trans); background: transparent; gap: 4px;
        }
        .sw-step-btn.active {
          background: linear-gradient(135deg, var(--crimson), #be123c);
          box-shadow: 0 4px 16px var(--crimson-glow);
        }
        .sw-step-btn.done { background: #f0fdf4; }
        .sw-step-icon { font-size: 18px; line-height: 1; }
        .sw-step-label { font-size: 10px; font-weight: 700; letter-spacing: 0.04em;
          text-transform: uppercase; color: var(--text-faint); }
        .sw-step-btn.active .sw-step-label { color: rgba(255,255,255,0.9); }
        .sw-step-btn.done .sw-step-label { color: #15803d; }
        .sw-step-num { font-size: 9px; font-weight: 800; color: var(--text-faint); }
        .sw-step-btn.active .sw-step-num { color: rgba(255,255,255,0.7); }
        @media (max-width: 600px) { .sw-step-label { display: none; } }

        /* ─── CARD ─── */
        .sw-card {
          background: var(--surface); border: 1px solid var(--border-soft);
          border-radius: var(--radius-lg); padding: 28px;
          box-shadow: var(--shadow-md); margin-bottom: 16px;
        }
        .sw-card-title {
          font-size: 17px; font-weight: 800; color: var(--text);
          letter-spacing: -0.03em; margin-bottom: 4px;
          display: flex; align-items: center; gap: 10px;
        }
        .sw-card-sub { font-size: 13px; color: var(--text-muted); margin-bottom: 22px; }
        .sw-divider { border: none; border-top: 1px solid var(--border-soft); margin: 20px 0; }

        /* ─── GRID ─── */
        .sw-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .sw-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
        @media (max-width: 640px) { .sw-grid-2, .sw-grid-3 { grid-template-columns: 1fr; } }

        /* ─── FIELD ─── */
        .sw-field { display: flex; flex-direction: column; gap: 6px; }
        .sw-label {
          font-size: 11.5px; font-weight: 700; color: var(--text-muted);
          letter-spacing: 0.04em; text-transform: uppercase;
        }
        .sw-input {
          background: var(--surface-2); border: 1.5px solid var(--border);
          border-radius: 10px; padding: 10px 14px;
          font-size: 14px; color: var(--text); outline: none;
          transition: border-color var(--trans), box-shadow var(--trans), background var(--trans);
          width: 100%; font-family: inherit;
        }
        .sw-input:focus {
          border-color: var(--crimson); background: #fff;
          box-shadow: 0 0 0 3px rgba(225,29,72,0.10);
        }
        .sw-input::placeholder { color: var(--text-faint); }
        .sw-input-wrap { position: relative; }
        .sw-input-wrap .sw-input { padding-right: 40px; }
        .sw-eye-btn {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; color: var(--text-faint);
          font-size: 16px; padding: 0; line-height: 1;
        }

        /* ─── STRENGTH METER ─── */
        .sw-strength { display: flex; gap: 4px; margin-top: 6px; align-items: center; }
        .sw-strength-bar {
          height: 4px; flex: 1; border-radius: 2px; transition: background var(--trans);
        }
        .sw-strength-lbl { font-size: 11px; font-weight: 700; min-width: 44px; text-align: right; }

        /* ─── GENDER CHIPS ─── */
        .sw-gender-row { display: flex; gap: 8px; flex-wrap: wrap; }
        .sw-gender-chip {
          padding: 7px 16px; border-radius: 100px;
          border: 1.5px solid var(--border); background: var(--surface-2);
          font-size: 13px; font-weight: 600; cursor: pointer;
          transition: all var(--trans); color: var(--text-muted);
        }
        .sw-gender-chip.selected {
          background: var(--crimson); color: #fff; border-color: var(--crimson);
          box-shadow: 0 2px 8px var(--crimson-glow);
        }

        /* ─── ROLE CARDS ─── */
        .sw-roles { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px,1fr)); gap: 12px; }
        .sw-role-card {
          border: 1.5px solid var(--border); border-radius: var(--radius);
          padding: 16px 14px; cursor: pointer; transition: all var(--trans);
          background: var(--surface-2);
        }
        .sw-role-card:hover {
          border-color: #c4b5fd; box-shadow: 0 4px 16px rgba(124,58,237,0.10);
          transform: translateY(-2px);
        }
        .sw-role-card.selected {
          border-color: var(--crimson); background: #fff5f7;
          box-shadow: 0 4px 20px var(--crimson-glow);
        }
        .sw-role-icon { font-size: 24px; margin-bottom: 8px; line-height: 1; }
        .sw-role-name { font-size: 13px; font-weight: 800; color: var(--text); margin-bottom: 3px; }
        .sw-role-desc { font-size: 11px; color: var(--text-muted); margin-bottom: 6px; line-height: 1.4; }
        .sw-role-level {
          font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 100px;
          background: var(--surface-3); color: var(--text-muted);
          display: inline-block; letter-spacing: 0.04em;
        }
        .sw-role-card.selected .sw-role-level {
          background: var(--crimson); color: #fff;
        }

        /* ─── PERMISSION TOGGLES ─── */
        .sw-perms { display: flex; flex-direction: column; gap: 10px; }
        .sw-perm-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 16px; background: var(--surface-2); border-radius: 10px;
          border: 1.5px solid var(--border-soft); gap: 12px;
          transition: border-color var(--trans);
        }
        .sw-perm-row.on { border-color: #bbf7d0; background: #f0fdf4; }
        .sw-perm-info { display: flex; align-items: center; gap: 10px; }
        .sw-perm-icon { font-size: 18px; flex-shrink: 0; }
        .sw-perm-label { font-size: 13.5px; font-weight: 700; color: var(--text); }
        .sw-perm-desc { font-size: 11.5px; color: var(--text-muted); margin-top: 1px; }
        .sw-toggle {
          width: 44px; height: 24px; border-radius: 100px;
          border: none; cursor: pointer; position: relative;
          flex-shrink: 0; transition: background var(--trans);
          background: var(--border);
        }
        .sw-toggle.on { background: #22c55e; }
        .sw-toggle::after {
          content: ''; position: absolute; width: 18px; height: 18px;
          background: #fff; border-radius: 50%;
          top: 3px; left: 3px; transition: transform var(--trans);
          box-shadow: 0 1px 4px rgba(0,0,0,0.18);
        }
        .sw-toggle.on::after { transform: translateX(20px); }

        /* ─── SHIFT SCHEDULER ─── */
        .sw-sched { display: flex; flex-direction: column; gap: 10px; }
        .sw-day-card {
          border: 1.5px solid var(--border-soft); border-radius: 12px;
          overflow: hidden; transition: border-color var(--trans);
        }
        .sw-day-card.enabled-day { border-color: #bfdbfe; }
        .sw-day-header {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 16px; cursor: pointer;
          background: var(--surface-2);
        }
        .sw-day-card.enabled-day .sw-day-header { background: #eff6ff; }
        .sw-day-name { font-size: 13px; font-weight: 800; color: var(--text); min-width: 90px; }
        .sw-day-status {
          font-size: 11px; font-weight: 700; padding: 2px 10px; border-radius: 100px;
          background: var(--surface-3); color: var(--text-faint);
        }
        .sw-day-card.enabled-day .sw-day-status { background: #dbeafe; color: #1d4ed8; }
        .sw-day-hours { font-size: 12px; color: var(--text-muted); margin-left: auto; }
        .sw-day-body {
          padding: 14px 16px 16px; border-top: 1px solid var(--border-soft);
          display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px;
        }
        .sw-shift-block { display: flex; flex-direction: column; gap: 5px; }
        .sw-shift-label { font-size: 10.5px; font-weight: 700; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.04em; }
        .sw-time-pair { display: flex; align-items: center; gap: 6px; }
        .sw-time-sep { font-size: 11px; color: var(--text-faint); }

        /* ─── PAYROLL ─── */
        .sw-payroll-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        @media (max-width: 540px) { .sw-payroll-grid { grid-template-columns: 1fr; } }
        .sw-salary-preview {
          background: linear-gradient(135deg, #0f172a, #1e1b4b);
          border-radius: 14px; padding: 22px 20px; margin-top: 16px;
          position: relative; overflow: hidden;
        }
        .sw-salary-preview::before {
          content: ''; position: absolute; inset: 0;
          background: radial-gradient(ellipse at 80% 20%, rgba(124,58,237,0.3) 0%, transparent 60%);
          pointer-events: none;
        }
        .sw-sp-label { font-size: 11px; color: rgba(255,255,255,0.5); font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px; position: relative; }
        .sw-sp-amount { font-size: 34px; font-weight: 900; color: #fff; letter-spacing: -0.04em;
          position: relative; }
        .sw-sp-amount span { font-size: 16px; color: rgba(255,255,255,0.5); margin-right: 4px; }
        .sw-sp-freq { font-size: 12px; color: rgba(255,255,255,0.45); margin-top: 4px; position: relative; }

        /* ─── REVIEW ─── */
        .sw-review-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        @media (max-width: 600px) { .sw-review-grid { grid-template-columns: 1fr; } }
        .sw-review-block {
          background: var(--surface-2); border: 1.5px solid var(--border-soft);
          border-radius: 12px; padding: 16px;
        }
        .sw-review-block-title {
          font-size: 11px; font-weight: 700; color: var(--text-faint);
          text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 10px;
        }
        .sw-review-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
        .sw-review-k { font-size: 12px; color: var(--text-muted); }
        .sw-review-v { font-size: 12px; font-weight: 700; color: var(--text); text-align: right; }

        /* ─── LIVE PANEL ─── */
        .sw-live {
          background: var(--surface); border: 1px solid var(--border-soft);
          border-radius: var(--radius-lg); padding: 22px;
          box-shadow: var(--shadow-md);
        }
        .sw-live-avatar {
          width: 72px; height: 72px; border-radius: 50%;
          background: linear-gradient(135deg, #7c3aed, #e11d48);
          display: flex; align-items: center; justify-content: center;
          font-size: 24px; font-weight: 900; color: #fff;
          margin: 0 auto 12px; letter-spacing: 0.02em;
        }
        .sw-live-name { font-size: 16px; font-weight: 800; color: var(--text); text-align: center; }
        .sw-live-email { font-size: 12px; color: var(--text-muted); text-align: center; margin-top: 2px; }
        .sw-live-divider { border: none; border-top: 1px solid var(--border-soft); margin: 14px 0; }
        .sw-live-row { display: flex; justify-content: space-between; margin-bottom: 8px; align-items: baseline; }
        .sw-live-k { font-size: 11.5px; color: var(--text-faint); font-weight: 600; }
        .sw-live-v { font-size: 12.5px; font-weight: 700; color: var(--text); }
        .sw-live-section { font-size: 10px; font-weight: 700; color: var(--text-faint);
          text-transform: uppercase; letter-spacing: 0.06em; margin: 12px 0 8px; }
        .sw-live-role-badge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 5px 12px; border-radius: 100px; font-size: 12px; font-weight: 700;
        }
        .sw-live-progress { margin-top: 16px; }
        .sw-lp-label { font-size: 11px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;
          display: flex; justify-content: space-between; }
        .sw-lp-track { height: 6px; background: var(--surface-3); border-radius: 3px; overflow: hidden; }
        .sw-lp-fill {
          height: 100%; border-radius: 3px;
          background: linear-gradient(90deg, var(--crimson), #7c3aed);
          transition: width 0.4s ease;
        }
        .sw-weekly-chip {
          background: #eff6ff; color: #1d4ed8; border-radius: 100px;
          padding: 4px 12px; font-size: 11px; font-weight: 700; display: inline-block;
          margin-top: 8px;
        }

        /* ─── ACTION BAR ─── */
        .sw-bar {
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 100;
          background: rgba(255,255,255,0.92); backdrop-filter: blur(20px);
          border-top: 1px solid var(--border-soft);
          box-shadow: 0 -8px 32px rgba(0,0,0,0.06);
          padding: 14px 24px;
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
        }
        .sw-bar-left { display: flex; align-items: center; gap: 12px; }
        .sw-bar-right { display: flex; align-items: center; gap: 10px; }
        .sw-bar-step { font-size: 12px; font-weight: 700; color: var(--text-muted); white-space: nowrap; }
        .sw-bar-progress {
          width: 120px; height: 4px; background: var(--surface-3); border-radius: 2px; overflow: hidden;
        }
        .sw-bar-progress-fill {
          height: 100%; border-radius: 2px;
          background: linear-gradient(90deg, var(--crimson), #7c3aed);
          transition: width 0.3s ease;
        }

        /* ─── BUTTONS ─── */
        .sw-btn {
          padding: 9px 20px; border-radius: 10px; border: none;
          font-size: 13px; font-weight: 700; cursor: pointer;
          transition: all var(--trans); display: inline-flex; align-items: center; gap: 6px;
          white-space: nowrap;
        }
        .sw-btn-ghost {
          background: transparent; color: var(--text-muted);
          border: 1.5px solid var(--border);
        }
        .sw-btn-ghost:hover { background: var(--surface-2); color: var(--text); }
        .sw-btn-primary {
          background: linear-gradient(135deg, var(--crimson), #be123c);
          color: #fff; box-shadow: 0 4px 16px var(--crimson-glow);
        }
        .sw-btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(225,29,72,0.25);
        }
        .sw-btn-primary:disabled { opacity: 0.5; cursor: default; transform: none; box-shadow: none; }
        .sw-btn-violet {
          background: linear-gradient(135deg, #7c3aed, #6d28d9);
          color: #fff; box-shadow: 0 4px 16px rgba(124,58,237,0.2);
        }
        .sw-btn-violet:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(124,58,237,0.3);
        }

        /* ─── ALERTS ─── */
        .sw-alert-error {
          background: #fff1f2; border: 1px solid #fecdd3; color: #9f1239;
          border-radius: 10px; padding: 12px 16px; font-size: 13px; font-weight: 500;
          margin-bottom: 14px; display: flex; align-items: center; gap: 8px;
        }

        /* ─── TOAST ─── */
        .sw-toast {
          position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%) translateY(0);
          background: #0f172a; color: #fff; border-radius: 12px; padding: 12px 22px;
          font-size: 14px; font-weight: 700; z-index: 200;
          box-shadow: 0 8px 32px rgba(0,0,0,0.25);
          animation: sw-toast-in 0.3s cubic-bezier(0.16,1,0.3,1);
        }
        @keyframes sw-toast-in {
          from { opacity: 0; transform: translateX(-50%) translateY(12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        /* ─── MISC ─── */
        select.sw-input { appearance: none; background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2394a3b8' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px; }
      `}</style>

      <div className="sw-root">
        {toast && <div className="sw-toast">{toast}</div>}

        <div className="sw-wrap">
          {/* ─────── MAIN ─────── */}
          <div className="sw-main">

            {/* HERO */}
            <div className="sw-hero">
              <div className="sw-hero-badge">
                <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" fill="#f87171"/></svg>
                619 Fitness Studio · Staff Onboarding
              </div>
              <div className="sw-hero-title">Create <span>Staff</span> Account</div>
              <div className="sw-hero-sub">Onboard trainers, managers, and staff into your fitness operating system. Complete all steps to grant access.</div>
              <div className="sw-hero-chips">
                <span className="sw-hero-chip">🔐 Roles & Permissions</span>
                <span className="sw-hero-chip">📅 Smart Scheduling</span>
                <span className="sw-hero-chip">💰 Payroll Setup</span>
                <span className="sw-hero-chip">⚡ Instant Access</span>
              </div>
            </div>

            {/* STEP RAIL */}
            <div className="sw-steps">
              {STEPS.map(s => (
                <button
                  key={s.id}
                  className={`sw-step-btn${step === s.id ? ' active' : step > s.id ? ' done' : ''}`}
                  onClick={() => { if (s.id <= step + 1) { setStep(s.id); setError(''); } }}
                >
                  <span className="sw-step-icon">{step > s.id ? '✓' : s.icon}</span>
                  <span className="sw-step-label">{s.label}</span>
                  <span className="sw-step-num">{s.id}</span>
                </button>
              ))}
            </div>

            {error && <div className="sw-alert-error"><span>⚠</span> {error}</div>}

            {/* ─── STEP 1: BASIC INFO ─── */}
            {step === 1 && (
              <>
                <div className="sw-card">
                  <div className="sw-card-title">👤 Personal Details</div>
                  <div className="sw-card-sub">The staff member's identity information and login credentials.</div>
                  <div className="sw-grid-2" style={{ marginBottom: 16 }}>
                    <div className="sw-field">
                      <label className="sw-label">First Name *</label>
                      <input className="sw-input" placeholder="e.g. Rahul" value={form.first_name}
                        onChange={e => set('first_name', e.target.value)} />
                    </div>
                    <div className="sw-field">
                      <label className="sw-label">Last Name *</label>
                      <input className="sw-input" placeholder="e.g. Sharma" value={form.last_name}
                        onChange={e => set('last_name', e.target.value)} />
                    </div>
                  </div>
                  <div className="sw-field" style={{ marginBottom: 16 }}>
                    <label className="sw-label">Email Address *</label>
                    <input className="sw-input" type="email" placeholder="rahul@619fitness.com"
                      value={form.email} onChange={e => set('email', e.target.value)} />
                  </div>
                  <div className="sw-grid-2" style={{ marginBottom: 16 }}>
                    <div className="sw-field">
                      <label className="sw-label">Password *</label>
                      <div className="sw-input-wrap">
                        <input className="sw-input" type={showPw ? 'text' : 'password'}
                          placeholder="Min. 8 characters" value={form.password}
                          onChange={e => set('password', e.target.value)} />
                        <button className="sw-eye-btn" type="button" onClick={() => setShowPw(v => !v)}>{showPw ? '🙈' : '👁️'}</button>
                      </div>
                      {form.password && (
                        <div className="sw-strength">
                          {[1,2,3,4].map(i => (
                            <div key={i} className="sw-strength-bar"
                              style={{ background: i <= strength ? strengthColors[strength] : '#e2e8f0' }} />
                          ))}
                          <span className="sw-strength-lbl" style={{ color: strengthColors[strength] }}>
                            {strengthLabels[strength]}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="sw-field">
                      <label className="sw-label">Confirm Password *</label>
                      <div className="sw-input-wrap">
                        <input className="sw-input" type={showPw ? 'text' : 'password'}
                          placeholder="Re-enter password" value={form.confirm_password}
                          onChange={e => set('confirm_password', e.target.value)} />
                      </div>
                      {form.confirm_password && (
                        <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4,
                          color: form.password === form.confirm_password ? '#15803d' : '#dc2626' }}>
                          {form.password === form.confirm_password ? '✓ Passwords match' : '✗ Do not match'}
                        </div>
                      )}
                    </div>
                  </div>
                  <hr className="sw-divider" />
                  <div className="sw-grid-2" style={{ marginBottom: 16 }}>
                    <div className="sw-field">
                      <label className="sw-label">Mobile Number</label>
                      <input className="sw-input" type="tel" placeholder="+91 9876 543210"
                        value={form.phone} onChange={e => set('phone', e.target.value)} />
                    </div>
                    <div className="sw-field">
                      <label className="sw-label">Date of Birth</label>
                      <input className="sw-input" type="date" value={form.dob}
                        onChange={e => set('dob', e.target.value)} />
                    </div>
                  </div>
                  <div className="sw-field">
                    <label className="sw-label">Gender</label>
                    <div className="sw-gender-row">
                      {GENDER_OPTIONS.map(g => (
                        <button key={g} type="button"
                          className={`sw-gender-chip${form.gender === g ? ' selected' : ''}`}
                          onClick={() => set('gender', g)}>{g}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ─── STEP 2: ROLE & PERMISSIONS ─── */}
            {step === 2 && (
              <>
                <div className="sw-card">
                  <div className="sw-card-title">🔐 Select Role</div>
                  <div className="sw-card-sub">Choose the staff member's role — this determines their default access level and permissions.</div>
                  <div className="sw-roles">
                    {ROLE_CARDS.map(r => (
                      <div key={r.key}
                        className={`sw-role-card${form.role === r.key ? ' selected' : ''}`}
                        onClick={() => set('role', r.key)}
                        style={form.role === r.key ? { borderColor: r.color, background: r.bg } : {}}
                      >
                        <div className="sw-role-icon">{r.icon}</div>
                        <div className="sw-role-name">{r.label}</div>
                        <div className="sw-role-desc">{r.desc}</div>
                        <span className="sw-role-level"
                          style={form.role === r.key ? { background: r.color, color: '#fff' } : {}}>
                          {r.level} Access
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="sw-card">
                  <div className="sw-card-title">⚙️ Permissions</div>
                  <div className="sw-card-sub">Fine-tune what this staff member can see and do within the system.</div>
                  <div className="sw-perms">
                    {PERMISSIONS.map(p => (
                      <div key={p.key}
                        className={`sw-perm-row${form.permissions[p.key] ? ' on' : ''}`}>
                        <div className="sw-perm-info">
                          <span className="sw-perm-icon">{p.icon}</span>
                          <div>
                            <div className="sw-perm-label">{p.label}</div>
                            <div className="sw-perm-desc">{p.desc}</div>
                          </div>
                        </div>
                        <button type="button"
                          className={`sw-toggle${form.permissions[p.key] ? ' on' : ''}`}
                          onClick={() => set('permissions', { ...form.permissions, [p.key]: !form.permissions[p.key] })}
                          aria-label={p.label}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ─── STEP 3: SCHEDULE ─── */}
            {step === 3 && (
              <div className="sw-card">
                <div className="sw-card-title">📅 Weekly Schedule</div>
                <div className="sw-card-sub">
                  Set working days, shift times, and break hours.
                  <span style={{ marginLeft: 8 }} className="sw-weekly-chip">⏱ {whrs.toFixed(1)} hrs / week</span>
                </div>
                <div className="sw-sched">
                  {WEEK_DAYS.map(day => {
                    const d = form.schedule[day];
                    let dayHrs = 0;
                    if (d.shift1_start && d.shift1_end) {
                      const [sh,sm] = d.shift1_start.split(':').map(Number);
                      const [eh,em] = d.shift1_end.split(':').map(Number);
                      dayHrs += (eh*60+em-sh*60-sm)/60;
                    }
                    if (d.shift2_start && d.shift2_end) {
                      const [sh,sm] = d.shift2_start.split(':').map(Number);
                      const [eh,em] = d.shift2_end.split(':').map(Number);
                      dayHrs += (eh*60+em-sh*60-sm)/60;
                    }
                    dayHrs -= parseFloat(d.break_hours || '0');
                    dayHrs = Math.max(0, dayHrs);
                    return (
                      <div key={day} className={`sw-day-card${d.enabled ? ' enabled-day' : ''}`}>
                        <div className="sw-day-header"
                          onClick={() => set('schedule', { ...form.schedule, [day]: { ...d, enabled: !d.enabled } })}>
                          <button type="button" className={`sw-toggle${d.enabled ? ' on' : ''}`}
                            style={{ flexShrink: 0 }}
                            onClick={e => { e.stopPropagation();
                              set('schedule', { ...form.schedule, [day]: { ...d, enabled: !d.enabled } }); }}
                          />
                          <span className="sw-day-name">{day}</span>
                          <span className="sw-day-status">{d.enabled ? 'Working' : 'Off'}</span>
                          {d.enabled && <span className="sw-day-hours">{dayHrs.toFixed(1)}h</span>}
                        </div>
                        {d.enabled && (
                          <div className="sw-day-body">
                            <div className="sw-shift-block">
                              <div className="sw-shift-label">Shift 1</div>
                              <div className="sw-time-pair">
                                <input className="sw-input" type="time" style={{ padding: '6px 10px', fontSize: 13 }}
                                  value={d.shift1_start}
                                  onChange={e => set('schedule', { ...form.schedule, [day]: { ...d, shift1_start: e.target.value } })} />
                                <span className="sw-time-sep">→</span>
                                <input className="sw-input" type="time" style={{ padding: '6px 10px', fontSize: 13 }}
                                  value={d.shift1_end}
                                  onChange={e => set('schedule', { ...form.schedule, [day]: { ...d, shift1_end: e.target.value } })} />
                              </div>
                            </div>
                            <div className="sw-shift-block">
                              <div className="sw-shift-label">Shift 2 (opt)</div>
                              <div className="sw-time-pair">
                                <input className="sw-input" type="time" style={{ padding: '6px 10px', fontSize: 13 }}
                                  value={d.shift2_start}
                                  onChange={e => set('schedule', { ...form.schedule, [day]: { ...d, shift2_start: e.target.value } })} />
                                <span className="sw-time-sep">→</span>
                                <input className="sw-input" type="time" style={{ padding: '6px 10px', fontSize: 13 }}
                                  value={d.shift2_end}
                                  onChange={e => set('schedule', { ...form.schedule, [day]: { ...d, shift2_end: e.target.value } })} />
                              </div>
                            </div>
                            <div className="sw-shift-block">
                              <div className="sw-shift-label">Break (hrs)</div>
                              <input className="sw-input" type="number" min="0" max="4" step="0.5"
                                style={{ padding: '6px 10px', fontSize: 13 }}
                                value={d.break_hours}
                                onChange={e => set('schedule', { ...form.schedule, [day]: { ...d, break_hours: e.target.value } })} />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── STEP 4: PAYROLL ─── */}
            {step === 4 && (
              <div className="sw-card">
                <div className="sw-card-title">💰 Compensation & Payroll</div>
                <div className="sw-card-sub">Configure salary, pay schedule, and deduction rules for this staff member.</div>
                <div className="sw-payroll-grid">
                  <div className="sw-field">
                    <label className="sw-label">Base Salary (₹)</label>
                    <input className="sw-input" type="number" placeholder="e.g. 25000"
                      value={form.salary} onChange={e => set('salary', e.target.value)} />
                  </div>
                  <div className="sw-field">
                    <label className="sw-label">Pay Frequency</label>
                    <select className="sw-input" value={form.pay_frequency}
                      onChange={e => set('pay_frequency', e.target.value)}>
                      {PAY_FREQ.map(f => <option key={f}>{f}</option>)}
                    </select>
                  </div>
                  <div className="sw-field">
                    <label className="sw-label">Incentive / Bonus (₹)</label>
                    <input className="sw-input" type="number" placeholder="e.g. 2000"
                      value={form.incentive} onChange={e => set('incentive', e.target.value)} />
                  </div>
                  <div className="sw-field" style={{ justifyContent: 'flex-end' }}>
                    <div className="sw-perm-row" style={{ marginTop: 'auto' }}>
                      <div className="sw-perm-info">
                        <span className="sw-perm-icon">📉</span>
                        <div>
                          <div className="sw-perm-label" style={{ fontSize: 13 }}>Deduct for Absent Days</div>
                          <div className="sw-perm-desc">Pro-rate salary for absent days</div>
                        </div>
                      </div>
                      <button type="button"
                        className={`sw-toggle${form.deduct_absent ? ' on' : ''}`}
                        onClick={() => set('deduct_absent', !form.deduct_absent)} />
                    </div>
                  </div>
                </div>
                {form.salary && (
                  <div className="sw-salary-preview">
                    <div className="sw-sp-label">Estimated Monthly Payout</div>
                    <div className="sw-sp-amount">
                      <span>₹</span>
                      {(estMonthly + parseFloat(form.incentive || '0')).toLocaleString('en-IN')}
                    </div>
                    <div className="sw-sp-freq">
                      Base ₹{parseFloat(form.salary).toLocaleString('en-IN')}
                      {form.incentive ? ` + Incentive ₹${parseFloat(form.incentive).toLocaleString('en-IN')}` : ''}
                      · {form.pay_frequency}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─── STEP 5: ADDRESS ─── */}
            {step === 5 && (
              <div className="sw-card">
                <div className="sw-card-title">📍 Address Details</div>
                <div className="sw-card-sub">Staff member's residential or correspondence address.</div>
                <div className="sw-grid-2" style={{ marginBottom: 16 }}>
                  <div className="sw-field">
                    <label className="sw-label">Flat / Building No.</label>
                    <input className="sw-input" placeholder="e.g. B-204" value={form.flat_no}
                      onChange={e => set('flat_no', e.target.value)} />
                  </div>
                  <div className="sw-field">
                    <label className="sw-label">Street / Area</label>
                    <input className="sw-input" placeholder="e.g. Hazratganj" value={form.street}
                      onChange={e => set('street', e.target.value)} />
                  </div>
                </div>
                <div className="sw-grid-3">
                  <div className="sw-field">
                    <label className="sw-label">City</label>
                    <input className="sw-input" placeholder="City" value={form.city}
                      onChange={e => set('city', e.target.value)} />
                  </div>
                  <div className="sw-field">
                    <label className="sw-label">State</label>
                    <input className="sw-input" placeholder="State" value={form.state}
                      onChange={e => set('state', e.target.value)} />
                  </div>
                  <div className="sw-field">
                    <label className="sw-label">Pincode</label>
                    <input className="sw-input" placeholder="226001" value={form.pincode}
                      onChange={e => set('pincode', e.target.value)} />
                  </div>
                </div>
                <div className="sw-field" style={{ marginTop: 16 }}>
                  <label className="sw-label">Country</label>
                  <input className="sw-input" style={{ maxWidth: 260 }} value={form.country}
                    onChange={e => set('country', e.target.value)} />
                </div>
              </div>
            )}

            {/* ─── STEP 6: REVIEW ─── */}
            {step === 6 && (
              <>
                <div className="sw-card">
                  <div className="sw-card-title">✅ Final Review</div>
                  <div className="sw-card-sub">Review all details before creating the staff account.</div>
                  <div className="sw-review-grid">
                    <div className="sw-review-block">
                      <div className="sw-review-block-title">Personal</div>
                      <div className="sw-review-row"><span className="sw-review-k">Full Name</span><span className="sw-review-v">{form.first_name} {form.last_name}</span></div>
                      <div className="sw-review-row"><span className="sw-review-k">Email</span><span className="sw-review-v">{form.email || '—'}</span></div>
                      <div className="sw-review-row"><span className="sw-review-k">Phone</span><span className="sw-review-v">{form.phone || '—'}</span></div>
                      <div className="sw-review-row"><span className="sw-review-k">DOB</span><span className="sw-review-v">{form.dob || '—'}</span></div>
                      <div className="sw-review-row"><span className="sw-review-k">Gender</span><span className="sw-review-v">{form.gender}</span></div>
                    </div>
                    <div className="sw-review-block">
                      <div className="sw-review-block-title">Role & Access</div>
                      <div className="sw-review-row"><span className="sw-review-k">Role</span>
                        <span className="sw-review-v" style={{ textTransform: 'capitalize' }}>{form.role}</span></div>
                      {PERMISSIONS.filter(p => form.permissions[p.key]).map(p => (
                        <div key={p.key} className="sw-review-row">
                          <span className="sw-review-k">{p.label}</span>
                          <span className="sw-review-v" style={{ color: '#15803d' }}>✓ Enabled</span>
                        </div>
                      ))}
                      {!PERMISSIONS.some(p => form.permissions[p.key]) &&
                        <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>Default permissions only</div>}
                    </div>
                    <div className="sw-review-block">
                      <div className="sw-review-block-title">Schedule</div>
                      <div className="sw-review-row"><span className="sw-review-k">Weekly Hours</span><span className="sw-review-v">{whrs.toFixed(1)}h</span></div>
                      {WEEK_DAYS.filter(d => form.schedule[d].enabled).map(d => (
                        <div key={d} className="sw-review-row">
                          <span className="sw-review-k">{d.slice(0,3)}</span>
                          <span className="sw-review-v">{form.schedule[d].shift1_start} – {form.schedule[d].shift1_end}</span>
                        </div>
                      ))}
                    </div>
                    <div className="sw-review-block">
                      <div className="sw-review-block-title">Payroll</div>
                      <div className="sw-review-row"><span className="sw-review-k">Base Salary</span><span className="sw-review-v">{form.salary ? '₹' + parseFloat(form.salary).toLocaleString('en-IN') : '—'}</span></div>
                      <div className="sw-review-row"><span className="sw-review-k">Frequency</span><span className="sw-review-v">{form.pay_frequency}</span></div>
                      <div className="sw-review-row"><span className="sw-review-k">Incentive</span><span className="sw-review-v">{form.incentive ? '₹' + parseFloat(form.incentive).toLocaleString('en-IN') : '—'}</span></div>
                      <div className="sw-review-row"><span className="sw-review-k">Deduct Absent</span><span className="sw-review-v">{form.deduct_absent ? 'Yes' : 'No'}</span></div>
                      <div className="sw-review-row"><span className="sw-review-k">City</span><span className="sw-review-v">{form.city || '—'}</span></div>
                    </div>
                  </div>
                </div>
              </>
            )}

          </div>
          {/* ─────── END MAIN ─────── */}

          {/* ─────── LIVE PANEL ─────── */}
          <div className="sw-panel">
            <div className="sw-live">
              <div className="sw-live-avatar">{initials(form.first_name, form.last_name)}</div>
              <div className="sw-live-name">
                {form.first_name || form.last_name
                  ? `${form.first_name} ${form.last_name}`.trim()
                  : 'New Staff Member'}
              </div>
              <div className="sw-live-email">{form.email || 'email@619fitness.com'}</div>

              <hr className="sw-live-divider" />
              <div className="sw-live-section">Identity</div>
              <div className="sw-live-row"><span className="sw-live-k">Phone</span><span className="sw-live-v">{form.phone || '—'}</span></div>
              <div className="sw-live-row"><span className="sw-live-k">DOB</span><span className="sw-live-v">{form.dob || '—'}</span></div>
              <div className="sw-live-row"><span className="sw-live-k">Gender</span><span className="sw-live-v">{form.gender}</span></div>

              <hr className="sw-live-divider" />
              <div className="sw-live-section">Role</div>
              {roleInfo && (
                <span className="sw-live-role-badge" style={{ background: roleInfo.bg, color: roleInfo.color }}>
                  {roleInfo.icon} {roleInfo.label}
                </span>
              )}

              <hr className="sw-live-divider" />
              <div className="sw-live-section">Schedule</div>
              <div className="sw-live-row">
                <span className="sw-live-k">Working Days</span>
                <span className="sw-live-v">{WEEK_DAYS.filter(d => form.schedule[d].enabled).length}d / wk</span>
              </div>
              <div className="sw-live-row">
                <span className="sw-live-k">Weekly Hours</span>
                <span className="sw-live-v">{whrs.toFixed(1)}h</span>
              </div>

              <hr className="sw-live-divider" />
              <div className="sw-live-section">Compensation</div>
              <div className="sw-live-row">
                <span className="sw-live-k">Salary</span>
                <span className="sw-live-v">{form.salary ? '₹' + parseFloat(form.salary).toLocaleString('en-IN') : '—'}</span>
              </div>
              <div className="sw-live-row">
                <span className="sw-live-k">Frequency</span>
                <span className="sw-live-v">{form.pay_frequency}</span>
              </div>

              <div className="sw-live-progress">
                <div className="sw-lp-label">
                  <span>Onboarding</span>
                  <span>{Math.round((step / 6) * 100)}%</span>
                </div>
                <div className="sw-lp-track">
                  <div className="sw-lp-fill" style={{ width: `${(step / 6) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>
          {/* ─────── END LIVE PANEL ─────── */}
        </div>

        {/* ─── STICKY ACTION BAR ─── */}
        <div className="sw-bar">
          <div className="sw-bar-left">
            <span className="sw-bar-step">Step {step} of 6 · {STEPS[step - 1].label}</span>
            <div className="sw-bar-progress">
              <div className="sw-bar-progress-fill" style={{ width: `${(step / 6) * 100}%` }} />
            </div>
          </div>
          <div className="sw-bar-right">
            <button className="sw-btn sw-btn-ghost"
              onClick={() => step === 1 ? router.push('/settings/staff') : goPrev()}>
              {step === 1 ? '← Back to Staff' : '← Back'}
            </button>
            {step < 6 ? (
              <button className="sw-btn sw-btn-primary" onClick={goNext}>
                Continue →
              </button>
            ) : (
              <button className="sw-btn sw-btn-violet" onClick={handleCreate}
                disabled={saving}>
                {saving ? '⏳ Creating…' : '⚡ Create Staff Account'}
              </button>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
