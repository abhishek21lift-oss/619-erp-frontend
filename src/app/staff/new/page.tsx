'use client';
import { useState, useEffect, useCallback } from 'react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function AddStaffAccountPage() {
  return (
    <Guard>
      <Inner />
    </Guard>
  );
}

// ─── constants ─────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Personal Info',   icon: '👤' },
  { id: 2, label: 'Role & Access',   icon: '🔑' },
  { id: 3, label: 'Compensation',    icon: '💰' },
  { id: 4, label: 'Work Schedule',   icon: '📅' },
  { id: 5, label: 'Documents',       icon: '📋' },
  { id: 6, label: 'Review',          icon: '✅' },
];

const ROLE_CARDS = [
  { value: 'admin',        label: 'Admin',            icon: '⚙️',  desc: 'Full system access',       level: 'Super',    color: '#dc2626' },
  { value: 'manager',      label: 'General Manager',  icon: '👔',  desc: 'Manage staff & operations', level: 'High',     color: '#7c3aed' },
  { value: 'trainer',      label: 'Trainer',          icon: '💪',  desc: 'PT sessions & members',     level: 'Medium',   color: '#059669' },
  { value: 'receptionist', label: 'Front Desk',       icon: '🎯',  desc: 'Check-ins & renewals',      level: 'Limited',  color: '#2563eb' },
  { value: 'accountant',   label: 'Accountant',       icon: '📊',  desc: 'Finance & payroll access',  level: 'Finance',  color: '#d97706' },
  { value: 'hr',           label: 'HR',               icon: '🧑‍💼', desc: 'Staff & recruitment',       level: 'HR',       color: '#db2777' },
];

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];

const GENDER_OPTIONS = [
  { value: 'male',   label: 'Male',   icon: '♂' },
  { value: 'female', label: 'Female', icon: '♀' },
  { value: 'other',  label: 'Other',  icon: '⚧' },
];

// ─── password strength ─────────────────────────────────────────────────────────

function pwStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: 'Weak',   color: '#dc2626' };
  if (score <= 2) return { score, label: 'Fair',   color: '#f59e0b' };
  if (score <= 3) return { score, label: 'Good',   color: '#3b82f6' };
  return            { score, label: 'Strong', color: '#10b981' };
}

// ─── avatar initials ───────────────────────────────────────────────────────────

function avatarInitials(name: string) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function generateStaffId() {
  return '619-STF-' + String(Math.floor(1000 + Math.random() * 9000));
}

// ─── main component ────────────────────────────────────────────────────────────

function Inner() {
  const router = useRouter();
  const [step, setStep]   = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [showPw, setShowPw]   = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);

  // ── Personal Info
  const [personal, setPersonal] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    gender: '', dob: '', blood_group: '', joining_date: '',
    emergency_contact: '', staff_id: generateStaffId(),
    password: '', confirm_password: '',
  });

  // ── Role & Access
  const [role, setRole]           = useState('trainer');
  const [allowDiscount, setAllowDiscount]   = useState(false);
  const [ownClientsOnly, setOwnClientsOnly] = useState(false);
  const [autoLeads, setAutoLeads]           = useState(false);

  // ── Compensation
  const [salary, setSalary]     = useState('');
  const [incentive, setIncentive] = useState('');
  const [ptShare, setPtShare]   = useState('');
  const [deductAbsent, setDeductAbsent] = useState(false);
  const [payPeriod, setPayPeriod] = useState('monthly');

  // ── Schedule
  const [schedule, setSchedule] = useState<Record<string, { enabled: boolean; from: string; to: string }>>(
    Object.fromEntries(DAYS.map(d => [d, { enabled: d !== 'Sunday', from: '09:00', to: '18:00' }]))
  );

  // ── Documents
  const [docNotes, setDocNotes] = useState('');

  // ── Address
  const [address, setAddress] = useState({ city: '', state: '', pincode: '' });

  // auto-save simulation
  useEffect(() => {
    const t = setTimeout(() => { setAutoSaved(true); setTimeout(() => setAutoSaved(false), 2000); }, 3000);
    return () => clearTimeout(t);
  }, [personal, role, salary]);

  // ── helpers
  const sp = useCallback((k: string, v: string) => setPersonal(f => ({ ...f, [k]: v })), []);

  const fullName = [personal.first_name, personal.last_name].filter(Boolean).join(' ');
  const pwInfo   = pwStrength(personal.password);
  const pwMatch  = personal.password && personal.confirm_password && personal.password === personal.confirm_password;
  const estPayout = salary ? (Number(salary) + Number(incentive || 0)).toLocaleString('en-IN') : '—';

  // ── validation per step
  function canProceed(): boolean {
    if (step === 1) return !!(personal.first_name && personal.email && personal.password && personal.password === personal.confirm_password && personal.password.length >= 8);
    if (step === 2) return !!role;
    return true;
  }

  // ── final submit — preserves original api.staff.create call
  async function handleSubmit() {
    setError('');
    if (!personal.first_name.trim()) { setError('First name is required'); return; }
    if (!personal.email.trim())      { setError('Email is required'); return; }
    if (!personal.password)          { setError('Password is required'); return; }
    if (personal.password !== personal.confirm_password) { setError('Passwords do not match'); return; }
    if (personal.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setSubmitting(true);
    try {
      await api.staff.create({
        name:     fullName,
        email:    personal.email.trim(),
        phone:    personal.phone.trim(),
        role:     role,
        password: personal.password,
        // extended fields — stored if backend supports them
        staff_id:          personal.staff_id,
        gender:            personal.gender,
        dob:               personal.dob,
        blood_group:       personal.blood_group,
        joining_date:      personal.joining_date,
        emergency_contact: personal.emergency_contact,
        salary:            salary ? Number(salary) : undefined,
        incentive_rate:    incentive ? Number(incentive) : undefined,
        pt_revenue_share:  ptShare ? Number(ptShare) : undefined,
        deduct_absent:     deductAbsent,
        pay_period:        payPeriod,
        allow_discount:    allowDiscount,
        own_clients_only:  ownClientsOnly,
        auto_leads:        autoLeads,
        city:              address.city,
        state:             address.state,
        pincode:           address.pincode,
        notes:             docNotes,
      });
      setSuccess('Staff account created successfully!');
      setTimeout(() => router.push('/staff'), 1800);
    } catch (e: any) {
      setError(e.message || 'Failed to create account');
    } finally {
      setSubmitting(false);
    }
  }

  // ─── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <AppShell>
      <style>{`
        /* ── Premium theme overrides ────────────────────────── */
        .onboard-wrap { background: #0a0a0a; min-height: 100vh; }

        /* hero */
        .onboard-hero {
          background: linear-gradient(135deg, #0f0f0f 0%, #1a0505 40%, #0f0f0f 100%);
          border-bottom: 1px solid rgba(220,38,38,0.15);
          position: relative; overflow: hidden; padding: 32px 40px 28px;
        }
        .onboard-hero::before {
          content: '';
          position: absolute; inset: 0;
          background: radial-gradient(ellipse 60% 120% at 80% 50%, rgba(220,38,38,0.12) 0%, transparent 70%);
          pointer-events: none;
        }
        .onboard-hero::after {
          content: '';
          position: absolute; bottom: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(220,38,38,0.4), transparent);
        }

        /* steps */
        .step-bar {
          display: flex; gap: 0; background: #111; border-bottom: 1px solid #1f1f1f;
          padding: 0 40px; overflow-x: auto;
        }
        .step-item {
          display: flex; align-items: center; gap: 8px;
          padding: 14px 20px; cursor: pointer; font-size: 12px; font-weight: 600;
          letter-spacing: 0.3px; white-space: nowrap;
          border-bottom: 2px solid transparent;
          color: #555; transition: all 0.2s; position: relative;
        }
        .step-item.active   { color: #dc2626; border-bottom-color: #dc2626; }
        .step-item.done     { color: #10b981; border-bottom-color: transparent; }
        .step-item.done .step-num { background: #10b981; color: #fff; }
        .step-num {
          width: 22px; height: 22px; border-radius: 50%; display: flex;
          align-items: center; justify-content: center; font-size: 10px; font-weight: 800;
          background: #222; color: #666; flex-shrink: 0; transition: all 0.2s;
        }
        .step-item.active .step-num { background: #dc2626; color: #fff; }

        /* body */
        .onboard-body {
          background: #0a0a0a; padding: 36px 40px 120px;
          max-width: 1000px; margin: 0 auto;
        }

        /* section headers */
        .section-title {
          font-size: 18px; font-weight: 800; color: #f5f5f5;
          letter-spacing: -0.03em; margin-bottom: 4px;
        }
        .section-sub {
          font-size: 12px; color: #555; margin-bottom: 28px; letter-spacing: 0.2px;
        }

        /* premium input */
        .pm-field { display: flex; flex-direction: column; gap: 6px; }
        .pm-label {
          font-size: 11px; font-weight: 700; color: #888;
          letter-spacing: 0.8px; text-transform: uppercase;
        }
        .pm-input {
          background: #111; border: 1px solid #1f1f1f; border-radius: 10px;
          color: #f0f0f0; font-size: 13.5px; padding: 11px 14px;
          outline: none; transition: all 0.2s; font-family: inherit;
          width: 100%;
        }
        .pm-input:focus {
          border-color: rgba(220,38,38,0.6);
          box-shadow: 0 0 0 3px rgba(220,38,38,0.08);
          background: #141414;
        }
        .pm-input::placeholder { color: #3a3a3a; }
        .pm-input:disabled { opacity: 0.4; cursor: not-allowed; }

        .pm-select {
          background: #111 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23555' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat right 14px center;
          border: 1px solid #1f1f1f; border-radius: 10px;
          color: #f0f0f0; font-size: 13.5px; padding: 11px 36px 11px 14px;
          outline: none; transition: all 0.2s; font-family: inherit;
          width: 100%; appearance: none; cursor: pointer;
        }
        .pm-select:focus { border-color: rgba(220,38,38,0.6); box-shadow: 0 0 0 3px rgba(220,38,38,0.08); }
        .pm-select option { background: #111; color: #f0f0f0; }

        /* grid */
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
        .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 18px; }

        /* avatar preview */
        .avatar-preview {
          width: 80px; height: 80px; border-radius: 50%;
          background: linear-gradient(135deg, #dc2626, #7f1d1d);
          display: flex; align-items: center; justify-content: center;
          font-size: 26px; font-weight: 900; color: #fff;
          border: 3px solid rgba(220,38,38,0.3);
          box-shadow: 0 0 30px rgba(220,38,38,0.2);
          flex-shrink: 0;
        }

        /* password strength */
        .pw-bar-wrap { display: flex; gap: 4px; margin-top: 8px; }
        .pw-bar {
          flex: 1; height: 3px; border-radius: 99px;
          background: #1f1f1f; transition: background 0.3s;
        }

        /* role cards */
        .role-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; }
        .role-card {
          background: #111; border: 1.5px solid #1c1c1c; border-radius: 14px;
          padding: 18px; cursor: pointer; transition: all 0.2s; position: relative;
          overflow: hidden;
        }
        .role-card:hover { border-color: #333; background: #151515; transform: translateY(-1px); }
        .role-card.selected {
          border-color: rgba(220,38,38,0.6);
          background: linear-gradient(135deg, rgba(220,38,38,0.06), rgba(220,38,38,0.02));
          box-shadow: 0 0 20px rgba(220,38,38,0.1);
        }
        .role-card.selected::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, #dc2626, #ef4444);
        }
        .role-icon { font-size: 24px; margin-bottom: 10px; }
        .role-name { font-size: 13px; font-weight: 700; color: #e5e5e5; margin-bottom: 4px; }
        .role-desc { font-size: 11px; color: #555; margin-bottom: 10px; }
        .role-level {
          font-size: 10px; font-weight: 700; letter-spacing: 0.8px;
          text-transform: uppercase; padding: 2px 8px; border-radius: 99px;
          background: rgba(255,255,255,0.05); color: #888; display: inline-flex;
        }
        .role-check {
          position: absolute; top: 12px; right: 12px;
          width: 20px; height: 20px; border-radius: 50%;
          background: #dc2626; display: flex; align-items: center; justify-content: center;
          font-size: 10px; color: #fff; opacity: 0; transition: opacity 0.2s;
        }
        .role-card.selected .role-check { opacity: 1; }

        /* toggle switch */
        .toggle-row {
          display: flex; align-items: flex-start; justify-content: space-between;
          padding: 16px; background: #111; border: 1px solid #1c1c1c;
          border-radius: 12px; gap: 16px;
        }
        .toggle-label { font-size: 13px; font-weight: 600; color: #e0e0e0; }
        .toggle-hint  { font-size: 11px; color: #555; margin-top: 3px; }
        .toggle {
          position: relative; width: 42px; height: 24px; flex-shrink: 0; cursor: pointer;
        }
        .toggle input { opacity: 0; width: 0; height: 0; }
        .toggle-slider {
          position: absolute; inset: 0; background: #222;
          border-radius: 99px; transition: all 0.25s;
          border: 1px solid #2a2a2a;
        }
        .toggle-slider::before {
          content: ''; position: absolute;
          width: 16px; height: 16px; left: 3px; top: 3px;
          background: #555; border-radius: 50%; transition: all 0.25s;
        }
        .toggle input:checked + .toggle-slider { background: #dc2626; border-color: #dc2626; }
        .toggle input:checked + .toggle-slider::before { transform: translateX(18px); background: #fff; }

        /* schedule */
        .schedule-row {
          display: grid; grid-template-columns: 100px 1fr 1fr 48px; gap: 12px;
          align-items: center; padding: 12px 16px;
          background: #111; border: 1px solid #1c1c1c;
          border-radius: 10px; margin-bottom: 8px; transition: all 0.2s;
        }
        .schedule-row.off { opacity: 0.4; }
        .day-label { font-size: 12px; font-weight: 700; color: #ccc; letter-spacing: 0.3px; }

        /* kpi card */
        .kpi-card {
          background: #111; border: 1px solid #1c1c1c; border-radius: 14px;
          padding: 20px; text-align: center;
        }
        .kpi-val  { font-size: 24px; font-weight: 900; color: #f0f0f0; letter-spacing: -0.05em; font-variant-numeric: tabular-nums; }
        .kpi-lab  { font-size: 10px; font-weight: 700; color: #555; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }

        /* review card */
        .review-section {
          background: #111; border: 1px solid #1c1c1c; border-radius: 14px;
          padding: 20px; margin-bottom: 14px;
        }
        .review-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 8px 0; border-bottom: 1px solid #1a1a1a;
        }
        .review-row:last-child { border-bottom: none; }
        .review-key { font-size: 11px; color: #555; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        .review-val { font-size: 13px; color: #e0e0e0; font-weight: 600; }

        /* gender selector */
        .gender-row { display: flex; gap: 10px; }
        .gender-opt {
          flex: 1; padding: 10px; border-radius: 10px;
          border: 1.5px solid #1c1c1c; background: #111;
          text-align: center; cursor: pointer; transition: all 0.2s;
          color: #777; font-size: 12px; font-weight: 700;
        }
        .gender-opt:hover { border-color: #333; color: #ccc; }
        .gender-opt.sel { border-color: rgba(220,38,38,0.6); color: #dc2626; background: rgba(220,38,38,0.05); }
        .gender-icon { font-size: 18px; display: block; margin-bottom: 4px; }

        /* sticky bar */
        .sticky-bar {
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 100;
          background: rgba(10,10,10,0.95);
          backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
          border-top: 1px solid rgba(220,38,38,0.15);
          padding: 16px 40px;
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
        }

        /* buttons */
        .btn-prim {
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          color: #fff; border: none; border-radius: 10px;
          padding: 11px 24px; font-size: 13px; font-weight: 700;
          cursor: pointer; transition: all 0.2s; font-family: inherit;
          box-shadow: 0 4px 16px rgba(220,38,38,0.3);
          letter-spacing: 0.2px;
        }
        .btn-prim:hover:not(:disabled) { background: linear-gradient(135deg, #ef4444, #dc2626); box-shadow: 0 6px 24px rgba(220,38,38,0.45); transform: translateY(-1px); }
        .btn-prim:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-ghost {
          background: transparent; color: #888;
          border: 1px solid #222; border-radius: 10px;
          padding: 11px 20px; font-size: 13px; font-weight: 600;
          cursor: pointer; transition: all 0.2s; font-family: inherit;
        }
        .btn-ghost:hover { border-color: #444; color: #ccc; background: #111; }
        .btn-text { background: none; border: none; color: #555; font-size: 13px; cursor: pointer; font-family: inherit; padding: 11px 8px; }
        .btn-text:hover { color: #999; }

        /* divider */
        .pm-divider { height: 1px; background: #1a1a1a; margin: 28px 0; }

        /* pill badge */
        .pill { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 99px; font-size: 11px; font-weight: 700; }
        .pill-red   { background: rgba(220,38,38,0.15); color: #f87171; }
        .pill-green { background: rgba(16,185,129,0.15); color: #34d399; }
        .pill-blue  { background: rgba(59,130,246,0.15); color: #60a5fa; }

        /* alerts */
        .pm-alert-error   { background: rgba(220,38,38,0.1); border: 1px solid rgba(220,38,38,0.3); color: #fca5a5; border-radius: 10px; padding: 12px 16px; font-size: 13px; margin-bottom: 20px; }
        .pm-alert-success { background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); color: #6ee7b7; border-radius: 10px; padding: 12px 16px; font-size: 13px; margin-bottom: 20px; }

        /* password toggle */
        .pw-wrap { position: relative; }
        .pw-eye  {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; color: #555; padding: 4px;
          font-size: 14px; transition: color 0.15s;
        }
        .pw-eye:hover { color: #999; }

        /* doc upload stub */
        .doc-drop {
          border: 1.5px dashed #2a2a2a; border-radius: 12px;
          padding: 28px; text-align: center; color: #555;
          transition: all 0.2s; cursor: pointer; background: #0f0f0f;
        }
        .doc-drop:hover { border-color: rgba(220,38,38,0.4); color: #888; background: rgba(220,38,38,0.03); }

        @media (max-width: 768px) {
          .onboard-hero { padding: 20px; }
          .onboard-body  { padding: 20px 16px 120px; }
          .step-bar { padding: 0 16px; }
          .grid-2, .grid-3 { grid-template-columns: 1fr; }
          .role-grid { grid-template-columns: 1fr 1fr; }
          .sticky-bar { padding: 12px 16px; }
          .schedule-row { grid-template-columns: 80px 1fr 1fr 36px; }
        }
      `}</style>

      <div className="onboard-wrap">

        {/* ─── HERO ──────────────────────────────────────────────────────── */}
        <div className="onboard-hero">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24 }}>
            <div style={{ flex: 1 }}>
              {/* breadcrumb */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                <button className="btn-text" style={{ padding: 0, fontSize: 12 }} onClick={() => router.push('/staff')}>
                  ← Staff
                </button>
                <span style={{ color: '#333', fontSize: 12 }}>/</span>
                <span style={{ color: '#555', fontSize: 12 }}>New Account</span>
              </div>

              {/* title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'linear-gradient(135deg, #dc2626, #7f1d1d)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, flexShrink: 0,
                  boxShadow: '0 0 20px rgba(220,38,38,0.35)',
                }}>👤</div>
                <div>
                  <h1 style={{ fontSize: 26, fontWeight: 900, color: '#f5f5f5', letterSpacing: '-0.04em', lineHeight: 1.1, margin: 0 }}>
                    Create Staff Account
                  </h1>
                  <p style={{ fontSize: 13, color: '#555', margin: '4px 0 0', letterSpacing: '0.2px' }}>
                    Onboard trainers, managers & staff into 619 Fitness Operating System
                  </p>
                </div>
              </div>

              {/* studio badge + stat pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{
                  background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.25)',
                  color: '#dc2626', fontSize: 11, fontWeight: 800, letterSpacing: '1.5px',
                  padding: '4px 12px', borderRadius: 99,
                }}>619 FITNESS STUDIO</span>
                <span className="pill pill-blue">🔐 Secured Onboarding</span>
                <span className="pill pill-green">⚡ Live Preview</span>
              </div>
            </div>

            {/* live avatar preview card */}
            <div style={{
              background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16,
              padding: '20px 24px', minWidth: 200, textAlign: 'center',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            }}>
              <div className="avatar-preview">
                {avatarInitials(fullName || 'NEW')}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#e0e0e0' }}>
                {fullName || <span style={{ color: '#333' }}>Your Staff</span>}
              </div>
              <div style={{ fontSize: 11, color: '#555' }}>{personal.email || 'email@619gym.com'}</div>
              {role && (
                <span className="pill pill-red" style={{ marginTop: 2 }}>
                  {ROLE_CARDS.find(r => r.value === role)?.label || role}
                </span>
              )}
              <div style={{ borderTop: '1px solid #1a1a1a', width: '100%', marginTop: 6, paddingTop: 10 }}>
                <div style={{ fontSize: 10, color: '#333', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 2 }}>Staff ID</div>
                <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#555' }}>{personal.staff_id}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── STEP BAR ─────────────────────────────────────────────────── */}
        <div className="step-bar">
          {STEPS.map(s => (
            <button
              key={s.id}
              className={`step-item ${step === s.id ? 'active' : step > s.id ? 'done' : ''}`}
              onClick={() => step > s.id && setStep(s.id)}
              style={{ cursor: step > s.id ? 'pointer' : step === s.id ? 'default' : 'not-allowed' }}
            >
              <div className="step-num">
                {step > s.id ? '✓' : s.id}
              </div>
              <span>{s.label}</span>
            </button>
          ))}
        </div>

        {/* ─── BODY ─────────────────────────────────────────────────────── */}
        <div className="onboard-body">

          {error   && <div className="pm-alert-error">⚠ {error}</div>}
          {success && <div className="pm-alert-success">✓ {success}</div>}

          {/* ── STEP 1 ── Personal Info ──────────────────────────────── */}
          {step === 1 && (
            <div>
              <div className="section-title">Personal Information</div>
              <div className="section-sub">Basic identity details for the new staff member</div>

              {/* avatar + staff id row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28, padding: 20, background: '#111', borderRadius: 14, border: '1px solid #1c1c1c' }}>
                <div className="avatar-preview" style={{ width: 64, height: 64, fontSize: 20 }}>
                  {avatarInitials(fullName || '?')}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#e0e0e0', marginBottom: 4 }}>
                    {fullName || <span style={{ color: '#333' }}>Enter name below to preview</span>}
                  </div>
                  <div style={{ fontSize: 11, color: '#555' }}>Auto-generated profile avatar</div>
                </div>
                <div className="pm-field" style={{ minWidth: 180 }}>
                  <label className="pm-label">Staff ID</label>
                  <input className="pm-input" value={personal.staff_id} readOnly style={{ fontFamily: 'monospace', fontSize: 12, cursor: 'not-allowed', opacity: 0.7 }} />
                </div>
              </div>

              <div className="grid-2" style={{ marginBottom: 18 }}>
                <div className="pm-field">
                  <label className="pm-label">First Name *</label>
                  <input className="pm-input" placeholder="e.g. Rahul" value={personal.first_name} onChange={e => sp('first_name', e.target.value)} />
                </div>
                <div className="pm-field">
                  <label className="pm-label">Last Name</label>
                  <input className="pm-input" placeholder="e.g. Sharma" value={personal.last_name} onChange={e => sp('last_name', e.target.value)} />
                </div>
              </div>

              <div className="grid-2" style={{ marginBottom: 18 }}>
                <div className="pm-field">
                  <label className="pm-label">Work Email *</label>
                  <input className="pm-input" type="email" placeholder="rahul@619gym.com" value={personal.email} onChange={e => sp('email', e.target.value)} />
                </div>
                <div className="pm-field">
                  <label className="pm-label">Mobile Number</label>
                  <input className="pm-input" type="tel" placeholder="+91 98765 43210" value={personal.phone} onChange={e => sp('phone', e.target.value)} />
                </div>
              </div>

              <div className="grid-3" style={{ marginBottom: 18 }}>
                <div className="pm-field">
                  <label className="pm-label">Date of Birth</label>
                  <input className="pm-input" type="date" value={personal.dob} onChange={e => sp('dob', e.target.value)} />
                </div>
                <div className="pm-field">
                  <label className="pm-label">Blood Group</label>
                  <select className="pm-select" value={personal.blood_group} onChange={e => sp('blood_group', e.target.value)}>
                    <option value="">— Select —</option>
                    {BLOOD_GROUPS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className="pm-field">
                  <label className="pm-label">Joining Date</label>
                  <input className="pm-input" type="date" value={personal.joining_date} onChange={e => sp('joining_date', e.target.value)} />
                </div>
              </div>

              <div className="pm-field" style={{ marginBottom: 18 }}>
                <label className="pm-label">Gender</label>
                <div className="gender-row">
                  {GENDER_OPTIONS.map(g => (
                    <div
                      key={g.value}
                      className={`gender-opt ${personal.gender === g.value ? 'sel' : ''}`}
                      onClick={() => sp('gender', g.value)}
                    >
                      <span className="gender-icon">{g.icon}</span>
                      {g.label}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pm-field" style={{ marginBottom: 18 }}>
                <label className="pm-label">Emergency Contact</label>
                <input className="pm-input" placeholder="Contact name & phone number" value={personal.emergency_contact} onChange={e => sp('emergency_contact', e.target.value)} />
              </div>

              <div className="pm-divider" />

              <div style={{ marginBottom: 4 }}>
                <div className="section-title" style={{ fontSize: 15 }}>Set Password</div>
                <div className="section-sub" style={{ marginBottom: 16 }}>Secure login credentials for this staff account</div>
              </div>

              <div className="grid-2">
                <div className="pm-field">
                  <label className="pm-label">Password *</label>
                  <div className="pw-wrap">
                    <input
                      className="pm-input" type={showPw ? 'text' : 'password'}
                      placeholder="Min 8 characters"
                      value={personal.password} onChange={e => sp('password', e.target.value)}
                      style={{ paddingRight: 40 }}
                    />
                    <button className="pw-eye" type="button" onClick={() => setShowPw(p => !p)}>{showPw ? '🙈' : '👁'}</button>
                  </div>
                  {personal.password && (
                    <>
                      <div className="pw-bar-wrap">
                        {[1,2,3,4,5].map(i => (
                          <div key={i} className="pw-bar" style={{ background: i <= pwInfo.score ? pwInfo.color : '#1f1f1f' }} />
                        ))}
                      </div>
                      <div style={{ fontSize: 11, color: pwInfo.color, fontWeight: 700, marginTop: 2 }}>{pwInfo.label} password</div>
                    </>
                  )}
                </div>
                <div className="pm-field">
                  <label className="pm-label">Confirm Password *</label>
                  <div className="pw-wrap">
                    <input
                      className="pm-input" type={showConfirmPw ? 'text' : 'password'}
                      placeholder="Repeat password"
                      value={personal.confirm_password} onChange={e => sp('confirm_password', e.target.value)}
                      style={{ paddingRight: 40 }}
                    />
                    <button className="pw-eye" type="button" onClick={() => setShowConfirmPw(p => !p)}>{showConfirmPw ? '🙈' : '👁'}</button>
                  </div>
                  {personal.confirm_password && (
                    <div style={{ fontSize: 11, marginTop: 6, fontWeight: 700, color: pwMatch ? '#10b981' : '#dc2626' }}>
                      {pwMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2 ── Role & Access ──────────────────────────────── */}
          {step === 2 && (
            <div>
              <div className="section-title">Role & Access Level</div>
              <div className="section-sub">Select the staff member's role and configure permissions</div>

              <div className="role-grid" style={{ marginBottom: 28 }}>
                {ROLE_CARDS.map(rc => (
                  <div
                    key={rc.value}
                    className={`role-card ${role === rc.value ? 'selected' : ''}`}
                    onClick={() => setRole(rc.value)}
                  >
                    <div className="role-check">✓</div>
                    <div className="role-icon">{rc.icon}</div>
                    <div className="role-name">{rc.label}</div>
                    <div className="role-desc">{rc.desc}</div>
                    <span className="role-level" style={{ color: rc.color, background: `${rc.color}18` }}>
                      {rc.level}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pm-divider" />

              <div style={{ marginBottom: 16 }}>
                <div className="section-title" style={{ fontSize: 15 }}>Permission Settings</div>
                <div className="section-sub" style={{ marginBottom: 16 }}>Fine-tune what this staff member can do</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="toggle-row">
                  <div>
                    <div className="toggle-label">Allow Discounting</div>
                    <div className="toggle-hint">Staff can apply discounts on memberships and services</div>
                  </div>
                  <label className="toggle">
                    <input type="checkbox" checked={allowDiscount} onChange={e => setAllowDiscount(e.target.checked)} />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div className="toggle-row">
                  <div>
                    <div className="toggle-label">Own Clients Only</div>
                    <div className="toggle-hint">Restrict access — staff sees only their assigned members</div>
                  </div>
                  <label className="toggle">
                    <input type="checkbox" checked={ownClientsOnly} onChange={e => setOwnClientsOnly(e.target.checked)} />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div className="toggle-row">
                  <div>
                    <div className="toggle-label">Auto Allocate Leads</div>
                    <div className="toggle-hint">System automatically assigns new leads to this staff member</div>
                  </div>
                  <label className="toggle">
                    <input type="checkbox" checked={autoLeads} onChange={e => setAutoLeads(e.target.checked)} />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>

              {/* permission summary */}
              <div style={{ marginTop: 20, padding: 16, background: '#0f0f0f', borderRadius: 12, border: '1px solid #1a1a1a' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12 }}>Access Summary</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <span className="pill pill-red">{ROLE_CARDS.find(r => r.value === role)?.label || role}</span>
                  {allowDiscount  && <span className="pill pill-green">✓ Can Discount</span>}
                  {ownClientsOnly && <span className="pill pill-blue">👁 Own Clients</span>}
                  {autoLeads      && <span className="pill pill-green">⚡ Auto Leads</span>}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3 ── Compensation ───────────────────────────────── */}
          {step === 3 && (
            <div>
              <div className="section-title">Payroll & Compensation</div>
              <div className="section-sub">Configure salary, incentives, and payroll rules</div>

              {/* KPI preview */}
              <div className="grid-3" style={{ marginBottom: 28 }}>
                <div className="kpi-card">
                  <div className="kpi-val">₹{salary ? Number(salary).toLocaleString('en-IN') : '—'}</div>
                  <div className="kpi-lab">Base Salary</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-val">₹{incentive ? Number(incentive).toLocaleString('en-IN') : '—'}</div>
                  <div className="kpi-lab">Incentive</div>
                </div>
                <div className="kpi-card" style={{ borderColor: 'rgba(16,185,129,0.2)' }}>
                  <div className="kpi-val" style={{ color: '#34d399' }}>₹{estPayout}</div>
                  <div className="kpi-lab">Est. Monthly Payout</div>
                </div>
              </div>

              <div className="grid-2" style={{ marginBottom: 18 }}>
                <div className="pm-field">
                  <label className="pm-label">Base Salary (₹)</label>
                  <input className="pm-input" type="number" min={0} placeholder="e.g. 25000" value={salary} onChange={e => setSalary(e.target.value)} />
                </div>
                <div className="pm-field">
                  <label className="pm-label">Pay Period</label>
                  <select className="pm-select" value={payPeriod} onChange={e => setPayPeriod(e.target.value)}>
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="daily">Daily</option>
                  </select>
                </div>
              </div>

              <div className="grid-2" style={{ marginBottom: 18 }}>
                <div className="pm-field">
                  <label className="pm-label">Monthly Incentive (₹)</label>
                  <input className="pm-input" type="number" min={0} placeholder="e.g. 5000" value={incentive} onChange={e => setIncentive(e.target.value)} />
                </div>
                <div className="pm-field">
                  <label className="pm-label">PT Revenue Share (%)</label>
                  <input className="pm-input" type="number" min={0} max={100} placeholder="e.g. 15" value={ptShare} onChange={e => setPtShare(e.target.value)} />
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <div className="toggle-row">
                  <div>
                    <div className="toggle-label">Deduct Salary for Absent Days</div>
                    <div className="toggle-hint">Automatically deduct per-day salary for unmarked absences</div>
                  </div>
                  <label className="toggle">
                    <input type="checkbox" checked={deductAbsent} onChange={e => setDeductAbsent(e.target.checked)} />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 4 ── Work Schedule ──────────────────────────────── */}
          {step === 4 && (
            <div>
              <div className="section-title">Work Schedule</div>
              <div className="section-sub">Set weekly working days and shift timings</div>

              {/* summary bar */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                {DAYS.map(d => (
                  <span
                    key={d}
                    className="pill"
                    style={{
                      background: schedule[d].enabled ? 'rgba(220,38,38,0.12)' : 'rgba(255,255,255,0.04)',
                      color: schedule[d].enabled ? '#f87171' : '#333',
                    }}
                  >
                    {d.slice(0,3)}
                  </span>
                ))}
              </div>

              {DAYS.map(d => (
                <div key={d} className={`schedule-row ${schedule[d].enabled ? '' : 'off'}`}>
                  <div className="day-label">{d}</div>
                  <div className="pm-field">
                    <label className="pm-label">From</label>
                    <input
                      className="pm-input" type="time"
                      value={schedule[d].from}
                      disabled={!schedule[d].enabled}
                      onChange={e => setSchedule(s => ({ ...s, [d]: { ...s[d], from: e.target.value } }))}
                    />
                  </div>
                  <div className="pm-field">
                    <label className="pm-label">To</label>
                    <input
                      className="pm-input" type="time"
                      value={schedule[d].to}
                      disabled={!schedule[d].enabled}
                      onChange={e => setSchedule(s => ({ ...s, [d]: { ...s[d], to: e.target.value } }))}
                    />
                  </div>
                  <label className="toggle" style={{ marginTop: 20 }}>
                    <input
                      type="checkbox"
                      checked={schedule[d].enabled}
                      onChange={e => setSchedule(s => ({ ...s, [d]: { ...s[d], enabled: e.target.checked } }))}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              ))}

              {/* working hours summary */}
              <div style={{ marginTop: 20, padding: 16, background: '#0f0f0f', borderRadius: 12, border: '1px solid #1a1a1a', display: 'flex', gap: 24, alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#f0f0f0', fontVariantNumeric: 'tabular-nums' }}>
                    {Object.values(schedule).filter(s => s.enabled).length}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '1px' }}>Working Days / Week</div>
                </div>
                <div style={{ width: 1, height: 40, background: '#1f1f1f' }} />
                <div style={{ fontSize: 12, color: '#555' }}>
                  {Object.entries(schedule).filter(([,v]) => v.enabled).map(([d]) => d.slice(0,3)).join(' · ')}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 5 ── Documents ──────────────────────────────────── */}
          {step === 5 && (
            <div>
              <div className="section-title">Documents & Profile</div>
              <div className="section-sub">Upload ID proofs, certifications, and contact information</div>

              <div className="grid-2" style={{ marginBottom: 18 }}>
                <div>
                  <div className="pm-label" style={{ marginBottom: 8 }}>Profile Photo</div>
                  <div className="doc-drop">
                    <div style={{ fontSize: 28, marginBottom: 8 }}>📷</div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Upload Profile Photo</div>
                    <div style={{ fontSize: 11 }}>JPG, PNG · Max 5MB</div>
                  </div>
                </div>
                <div>
                  <div className="pm-label" style={{ marginBottom: 8 }}>ID Proof</div>
                  <div className="doc-drop">
                    <div style={{ fontSize: 28, marginBottom: 8 }}>🪪</div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Aadhaar / PAN Card</div>
                    <div style={{ fontSize: 11 }}>PDF, JPG · Max 10MB</div>
                  </div>
                </div>
              </div>

              <div className="grid-2" style={{ marginBottom: 18 }}>
                <div>
                  <div className="pm-label" style={{ marginBottom: 8 }}>Fitness Certifications</div>
                  <div className="doc-drop">
                    <div style={{ fontSize: 28, marginBottom: 8 }}>🏋️</div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Upload Certifications</div>
                    <div style={{ fontSize: 11 }}>ACE, NSCA, NASM, etc.</div>
                  </div>
                </div>
                <div>
                  <div className="pm-label" style={{ marginBottom: 8 }}>Contract / Agreement</div>
                  <div className="doc-drop">
                    <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Employment Contract</div>
                    <div style={{ fontSize: 11 }}>PDF · Max 20MB</div>
                  </div>
                </div>
              </div>

              <div className="pm-divider" />

              {/* address */}
              <div style={{ marginBottom: 16 }}>
                <div className="section-title" style={{ fontSize: 15 }}>Home Address</div>
                <div className="section-sub" style={{ marginBottom: 16 }}>For official records and emergency contact</div>
              </div>

              <div className="grid-3" style={{ marginBottom: 18 }}>
                <div className="pm-field">
                  <label className="pm-label">City</label>
                  <input className="pm-input" placeholder="e.g. Lucknow" value={address.city} onChange={e => setAddress(a => ({ ...a, city: e.target.value }))} />
                </div>
                <div className="pm-field">
                  <label className="pm-label">State</label>
                  <input className="pm-input" placeholder="e.g. Uttar Pradesh" value={address.state} onChange={e => setAddress(a => ({ ...a, state: e.target.value }))} />
                </div>
                <div className="pm-field">
                  <label className="pm-label">Pincode</label>
                  <input className="pm-input" placeholder="e.g. 226001" value={address.pincode} onChange={e => setAddress(a => ({ ...a, pincode: e.target.value }))} />
                </div>
              </div>

              <div className="pm-field">
                <label className="pm-label">Additional Notes</label>
                <textarea
                  className="pm-input"
                  rows={3}
                  placeholder="Certifications, special notes, equipment access…"
                  value={docNotes}
                  onChange={e => setDocNotes(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>
          )}

          {/* ── STEP 6 ── Review & Confirm ───────────────────────────── */}
          {step === 6 && (
            <div>
              <div className="section-title">Review & Confirm</div>
              <div className="section-sub">Verify all details before creating the account</div>

              {/* profile card */}
              <div style={{
                background: 'linear-gradient(135deg, #1a0505, #0f0f0f)',
                border: '1px solid rgba(220,38,38,0.2)', borderRadius: 16,
                padding: 24, marginBottom: 20,
                display: 'flex', alignItems: 'center', gap: 20,
              }}>
                <div className="avatar-preview" style={{ width: 72, height: 72, fontSize: 24 }}>
                  {avatarInitials(fullName || '?')}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#f5f5f5', letterSpacing: '-0.03em' }}>
                    {fullName || '—'}
                  </div>
                  <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>{personal.email}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                    <span className="pill pill-red">{ROLE_CARDS.find(r => r.value === role)?.label || role}</span>
                    {personal.joining_date && <span className="pill pill-blue">Joins {personal.joining_date}</span>}
                    {salary && <span className="pill pill-green">₹{Number(salary).toLocaleString('en-IN')}/mo</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: '#333', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Staff ID</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#555' }}>{personal.staff_id}</div>
                </div>
              </div>

              <div className="review-section">
                <div style={{ fontSize: 11, fontWeight: 800, color: '#444', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 14 }}>Personal Details</div>
                <div className="review-row"><span className="review-key">Full Name</span><span className="review-val">{fullName || '—'}</span></div>
                <div className="review-row"><span className="review-key">Email</span><span className="review-val">{personal.email || '—'}</span></div>
                <div className="review-row"><span className="review-key">Phone</span><span className="review-val">{personal.phone || '—'}</span></div>
                <div className="review-row"><span className="review-key">Gender</span><span className="review-val" style={{ textTransform: 'capitalize' }}>{personal.gender || '—'}</span></div>
                <div className="review-row"><span className="review-key">DOB</span><span className="review-val">{personal.dob || '—'}</span></div>
                <div className="review-row"><span className="review-key">Blood Group</span><span className="review-val">{personal.blood_group || '—'}</span></div>
                <div className="review-row"><span className="review-key">Emergency Contact</span><span className="review-val">{personal.emergency_contact || '—'}</span></div>
              </div>

              <div className="review-section">
                <div style={{ fontSize: 11, fontWeight: 800, color: '#444', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 14 }}>Role & Access</div>
                <div className="review-row"><span className="review-key">Role</span><span className="review-val" style={{ textTransform: 'capitalize' }}>{ROLE_CARDS.find(r => r.value === role)?.label || role}</span></div>
                <div className="review-row"><span className="review-key">Allow Discounting</span><span className="review-val">{allowDiscount ? '✓ Yes' : '✗ No'}</span></div>
                <div className="review-row"><span className="review-key">Own Clients Only</span><span className="review-val">{ownClientsOnly ? '✓ Yes' : '✗ No'}</span></div>
                <div className="review-row"><span className="review-key">Auto Allocate Leads</span><span className="review-val">{autoLeads ? '✓ Yes' : '✗ No'}</span></div>
              </div>

              <div className="review-section">
                <div style={{ fontSize: 11, fontWeight: 800, color: '#444', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 14 }}>Compensation</div>
                <div className="review-row"><span className="review-key">Base Salary</span><span className="review-val">{salary ? `₹${Number(salary).toLocaleString('en-IN')}` : '—'}</span></div>
                <div className="review-row"><span className="review-key">Incentive</span><span className="review-val">{incentive ? `₹${Number(incentive).toLocaleString('en-IN')}` : '—'}</span></div>
                <div className="review-row"><span className="review-key">PT Revenue Share</span><span className="review-val">{ptShare ? `${ptShare}%` : '—'}</span></div>
                <div className="review-row"><span className="review-key">Pay Period</span><span className="review-val" style={{ textTransform: 'capitalize' }}>{payPeriod}</span></div>
                <div className="review-row"><span className="review-key">Deduct for Absences</span><span className="review-val">{deductAbsent ? '✓ Yes' : '✗ No'}</span></div>
                <div className="review-row" style={{ borderBottom: 'none', paddingTop: 12 }}>
                  <span className="review-key">Est. Monthly Payout</span>
                  <span style={{ fontSize: 16, fontWeight: 900, color: '#34d399' }}>₹{estPayout}</span>
                </div>
              </div>

              <div className="review-section">
                <div style={{ fontSize: 11, fontWeight: 800, color: '#444', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 14 }}>Work Schedule</div>
                <div className="review-row">
                  <span className="review-key">Working Days</span>
                  <span className="review-val">{Object.values(schedule).filter(s => s.enabled).length} days / week</span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  {DAYS.map(d => (
                    <span
                      key={d}
                      className="pill"
                      style={{
                        background: schedule[d].enabled ? 'rgba(220,38,38,0.12)' : 'rgba(255,255,255,0.03)',
                        color: schedule[d].enabled ? '#f87171' : '#2a2a2a',
                        fontSize: 10,
                      }}
                    >
                      {d.slice(0,3)}
                    </span>
                  ))}
                </div>
              </div>

              {/* final CTA notice */}
              <div style={{
                marginTop: 24, padding: 16, background: 'rgba(220,38,38,0.06)',
                border: '1px solid rgba(220,38,38,0.2)', borderRadius: 12,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <span style={{ fontSize: 20 }}>🔐</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#f87171', marginBottom: 2 }}>Ready to Create Account</div>
                  <div style={{ fontSize: 12, color: '#555' }}>A login will be created with the role and permissions you configured. Staff can log in immediately after creation.</div>
                </div>
              </div>
            </div>
          )}

        </div>{/* end onboard-body */}

        {/* ─── STICKY ACTION BAR ─────────────────────────────────────── */}
        <div className="sticky-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {step > 1 && (
              <button className="btn-ghost" onClick={() => setStep(s => s - 1)}>
                ← Back
              </button>
            )}
            {step === 1 && (
              <button className="btn-ghost" onClick={() => router.push('/staff')}>
                Cancel
              </button>
            )}
            {/* auto-save indicator */}
            <span style={{ fontSize: 11, color: autoSaved ? '#10b981' : '#333', transition: 'color 0.3s', letterSpacing: '0.5px' }}>
              {autoSaved ? '✓ Draft saved' : '• Unsaved changes'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* step counter */}
            <span style={{ fontSize: 11, color: '#333', letterSpacing: '0.5px' }}>
              Step {step} of {STEPS.length}
            </span>

            {step < STEPS.length ? (
              <button
                className="btn-prim"
                onClick={() => {
                  if (!canProceed()) {
                    if (step === 1) setError('Please fill in required fields and ensure passwords match.');
                    return;
                  }
                  setError('');
                  setStep(s => s + 1);
                }}
              >
                Continue →
              </button>
            ) : (
              <button
                className="btn-prim"
                onClick={handleSubmit}
                disabled={submitting}
                style={{ minWidth: 160 }}
              >
                {submitting ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ animation: 'spin 0.8s linear infinite', display: 'inline-block' }}>⟳</span>
                    Creating…
                  </span>
                ) : '🚀 Create Staff Account'}
              </button>
            )}
          </div>
        </div>

      </div>{/* end onboard-wrap */}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </AppShell>
  );
}
