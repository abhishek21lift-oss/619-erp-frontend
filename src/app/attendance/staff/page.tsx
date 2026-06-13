'use client';
import { useEffect, useState, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api, http, Trainer, Attendance } from '@/lib/api';
import {
  Fingerprint, UserCheck, UserX, Clock, Users,
  Search, CheckCircle2, Calendar, RefreshCw,
} from 'lucide-react';

/**
 * Staff (trainer/coach) attendance — the missing piece that was causing
 * "unable to mark staff attendance". Mirrors the member attendance flow
 * but stores rows under type='trainer' so reports keep working.
 */
export default function StaffAttendancePage() {
  return (
    <Guard roles={['admin', 'manager']}>
      <Inner />
    </Guard>
  );
}

function nameGradient(name: string): string {
  const palettes = [
    'linear-gradient(135deg,#6366f1,#8b5cf6)',
    'linear-gradient(135deg,#f43f5e,#e11d48)',
    'linear-gradient(135deg,#0ea5e9,#2563eb)',
    'linear-gradient(135deg,#f59e0b,#d97706)',
    'linear-gradient(135deg,#10b981,#059669)',
    'linear-gradient(135deg,#ec4899,#db2777)',
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return palettes[Math.abs(h) % palettes.length];
}

function Inner() {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [staff, setStaff] = useState<Trainer[]>([]);
  const [records, setRecords] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [bioCode, setBioCode] = useState('');
  const [bioSaving, setBioSaving] = useState(false);
  const successTimer = useRef<ReturnType<typeof setTimeout>>();
  const errorTimer = useRef<ReturnType<typeof setTimeout>>();

  function showSuccess(msg: string) { clearTimeout(successTimer.current); setSuccess(msg); successTimer.current = setTimeout(() => setSuccess(''), 1800); }
  function showError(msg: string) { clearTimeout(errorTimer.current); setError(msg); errorTimer.current = setTimeout(() => setError(''), 5000); }

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    Promise.all([
      api.trainers.list(),
      api.attendance.list({ date, type: 'trainer' }),
    ])
      .then(([t, a]) => {
        if (!alive) return;
        setStaff(t);
        setRecords(Array.isArray(a) ? a : []);
      })
      .catch((e) => { if (alive) showError(e.message || 'Failed to load staff'); })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
      clearTimeout(successTimer.current);
      clearTimeout(errorTimer.current);
    };
  }, [date]);

  async function mark(t: Trainer, status: string) {
    setError('');
    setSaving(t.id);
    try {
      const checkIn = new Date().toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      });
      await api.attendance.mark({
        type: 'trainer',
        ref_id: t.id,
        ref_name: t.name,
        trainer_id: t.id,
        trainer_name: t.name,
        date,
        status,
        check_in: status === 'absent' ? null : checkIn,
      });
      const updated = await api.attendance.list({ date, type: 'trainer' });
      setRecords(Array.isArray(updated) ? updated : []);
      showSuccess(`Marked ${t.name} as ${status}`);
    } catch (e: unknown) {
      showError((e instanceof Error ? e.message : null) || 'Could not save attendance.');
    } finally {
      setSaving(null);
    }
  }

  function getRecord(staffId: string) {
    return records.find((r) => r.ref_id === staffId);
  }

  const STATUS_BTN = [
    { status: 'present', label: 'P', color: 'var(--success)', bg: 'var(--success-bg)' },
    { status: 'absent', label: 'A', color: 'var(--danger)', bg: 'var(--danger-bg)' },
    { status: 'late', label: 'L', color: 'var(--warning)', bg: 'var(--warning-bg)' },
  ];

  const filtered = useMemo(() => {
    if (!search) return staff;
    const s = search.toLowerCase();
    return staff.filter(
      (t) =>
        t.name.toLowerCase().includes(s) ||
        (t.mobile || '').includes(search) ||
        (t.role || '').toLowerCase().includes(s),
    );
  }, [staff, search]);

  const summary = {
    present: records.filter((r) => r.status === 'present').length,
    absent: records.filter((r) => r.status === 'absent').length,
    late: records.filter((r) => r.status === 'late').length,
    unmarked: staff.length - records.length,
  };

  async function markAllPresent() {
    for (const t of filtered) {
      if (!getRecord(t.id)) await mark(t, 'present');
    }
  }

  async function biometricCheckIn() {
    if (!bioCode.trim()) return;
    setBioSaving(true);
    setError('');
    try {
      const res = await http<{ message: string }>('/api/attendance/biometric', { method: 'POST', body: JSON.stringify({ biometric_code: bioCode.trim(), type: 'trainer' }) });
      const updated = await api.attendance.list({ date, type: 'trainer' });
      setRecords(Array.isArray(updated) ? updated : []);
      showSuccess(res.message);
      setBioCode('');
    } catch (e: unknown) {
      showError((e instanceof Error ? e.message : null) || 'Biometric check-in failed');
    } finally {
      setBioSaving(false);
    }
  }

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px 48px' }}>

        {/* ── Hero Section ── */}
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 24, background: 'linear-gradient(135deg,#0f172a,#1e293b)', padding: '32px 36px', marginBottom: 20, boxShadow: '0 8px 32px rgba(15,23,42,0.4)' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,#6366f1,#8b5cf6,#a855f7)', borderRadius: '24px 24px 0 0' }} />
          <motion.div style={{ position: 'absolute', top: -80, right: -40, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,0.2),transparent 70%)', pointerEvents: 'none' }}
            animate={{ x: [0, 30, -20, 0], y: [0, -40, 20, 0] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} />
          <motion.div style={{ position: 'absolute', bottom: -60, left: '30%', width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle,rgba(139,92,246,0.15),transparent 70%)', pointerEvents: 'none' }}
            animate={{ x: [0, -30, 40, 0], y: [0, 30, -20, 0] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }} />
          <motion.div style={{ position: 'absolute', top: '40%', left: -60, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(168,85,247,0.12),transparent 70%)', pointerEvents: 'none' }}
            animate={{ x: [0, 40, -10, 0], y: [0, -20, 30, 0] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(99,102,241,0.35)' }}>
                  <Users size={18} color="white" />
                </div>
                <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.02em', background: 'linear-gradient(135deg,#818cf8,#a78bfa,#c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Staff Attendance</h1>
              </div>
              <h2 style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '1.5px', margin: '0 0 4px' }}>Total Staff</h2>
              <div style={{ fontSize: 44, fontWeight: 900, color: 'white', letterSpacing: '-0.03em', lineHeight: 1, textShadow: '0 2px 20px rgba(255,255,255,0.1)' }}>{staff.length}</div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: '8px 0 0' }}>{filtered.length} staff · {records.length} marked today</p>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: 14, padding: '12px 18px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Calendar size={16} color="rgba(255,255,255,0.5)" />
                <input
                  type="date" value={date}
                  onChange={e => setDate(e.target.value)}
                  max={today}
                  style={{ background: 'transparent', border: 'none', color: 'white', fontSize: 13, fontWeight: 600, outline: 'none', padding: 0, fontFamily: 'inherit', colorScheme: 'dark' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Alerts ── */}
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 14, padding: '12px 16px', fontSize: 14, color: '#dc2626', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700 }}>⚠</span> {error}
          </div>
        )}
        {success && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: '12px 16px', fontSize: 14, color: '#16a34a', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={16} /> {success}
          </div>
        )}

        {/* ── Biometric Form ── */}
        <form
          onSubmit={(e) => { e.preventDefault(); biometricCheckIn(); }}
          style={{
            background: 'white', borderRadius: 20, border: '1px solid #f1f5f9',
            padding: '20px 24px', marginBottom: 20,
            boxShadow: '0 2px 12px rgba(0,0,0,0.04)', position: 'relative', overflow: 'hidden',
            display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, background: 'linear-gradient(180deg,#6366f1,#8b5cf6)', borderRadius: '20px 0 0 20px' }} />
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#eef2ff,#ede9fe)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Fingerprint size={20} style={{ color: '#6366f1' }} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', whiteSpace: 'nowrap' }}>Biometric Check-in</div>
          <input
            placeholder="Scan fingerprint / enter staff code"
            value={bioCode}
            onChange={(e) => setBioCode(e.target.value)}
            style={{
              flex: 1, minWidth: 200, padding: '9px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0',
              fontSize: 13, color: '#1e293b', background: '#fafafa', outline: 'none', fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={bioSaving || !bioCode.trim()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 12,
              border: 'none', background: bioSaving || !bioCode.trim() ? '#94a3b8' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              color: 'white', fontSize: 13, fontWeight: 700, cursor: bioSaving || !bioCode.trim() ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', transition: 'all 150ms', boxShadow: bioSaving || !bioCode.trim() ? 'none' : '0 4px 14px rgba(99,102,241,0.3)',
            }}
            onMouseEnter={(e) => { if (!bioSaving && bioCode.trim()) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(99,102,241,0.4)'; } }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; if (!bioSaving && bioCode.trim()) e.currentTarget.style.boxShadow = '0 4px 14px rgba(99,102,241,0.3)'; }}
          >
            {bioSaving ? 'Checking…' : <><Fingerprint size={14} /> Check In</>}
          </button>
          <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 'auto' }}>Device can POST code to /api/attendance/biometric</span>
        </form>

        {/* ── KPI Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Present', value: summary.present, icon: <UserCheck size={18} />, accent: '#10b981', bg: '#ecfdf5' },
            { label: 'Absent', value: summary.absent, icon: <UserX size={18} />, accent: '#ef4444', bg: '#fef2f2' },
            { label: 'Late', value: summary.late, icon: <Clock size={18} />, accent: '#f59e0b', bg: '#fffbeb' },
            { label: 'Unmarked', value: summary.unmarked, icon: <Users size={18} />, accent: '#94a3b8', bg: '#f8fafc' },
          ].map((k) => (
            <div key={k.label}
              style={{
                background: 'white', borderRadius: 20, padding: '22px 24px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)',
                display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', overflow: 'hidden',
                transition: 'all 200ms ease', cursor: 'default',
              }}
              onMouseEnter={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 8px 28px rgba(0,0,0,0.1)'; el.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'; el.style.transform = 'translateY(0)'; }}>
              <div style={{ position: 'absolute', top: 0, left: 24, right: 24, height: 3, background: `linear-gradient(90deg,${k.accent},${k.accent}88)`, borderRadius: '0 0 3px 3px', opacity: 0.8 }} />
              <div style={{ width: 40, height: 40, borderRadius: 12, background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: k.accent }}>{k.icon}</div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1 }}>{k.value}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: 500 }}>{k.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Staff Table ── */}
        <div style={{ background: 'white', borderRadius: 20, border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          {/* ── Search Bar ── */}
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 340 }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="search" placeholder="Search staff name, mobile or role"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%', padding: '9px 12px 9px 34px', borderRadius: 12, border: '1.5px solid #e2e8f0',
                  fontSize: 13, color: '#1e293b', background: '#fafafa', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                }}
              />
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{filtered.length} staff</div>
            {date === today && filtered.length > 0 && (
              <button
                onClick={markAllPresent}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 12,
                  border: 'none', background: 'linear-gradient(135deg,#10b981,#059669)',
                  color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all 150ms', boxShadow: '0 4px 14px rgba(16,185,129,0.3)', marginLeft: 'auto',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(16,185,129,0.4)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(16,185,129,0.3)'; }}
              >
                <CheckCircle2 size={14} /> Mark All Present
              </button>
            )}
          </div>

          <div style={{ overflowX: 'auto' }}>
            {loading ? (
              <div style={{ padding: '48px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} style={{ display: 'flex', gap: 16, padding: '14px 0', borderBottom: '1px solid #f8fafc' }}>
                    {[40, 160, 100, 80].map((w, j) => (
                      <motion.div key={j} style={{ height: 13, width: w, borderRadius: 6, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%' }}
                        animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }} />
                    ))}
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '72px 32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#eef2ff,#ede9fe)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #c7d2fe' }}>
                  <Users size={36} style={{ color: '#6366f1' }} />
                </div>
                <div>
                  <p style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>No staff found</p>
                  <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>{search ? 'No staff match your search.' : 'Add coaches in the Coaches section first.'}</p>
                </div>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Staff', 'Attendance'].map((h, i) => (
                      <th key={i} style={{
                        padding: '14px 16px', textAlign: i === 1 ? 'center' : 'left',
                        fontSize: 11, fontWeight: 700, color: 'white', textTransform: 'uppercase',
                        letterSpacing: '0.8px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => {
                    const rec = getRecord(t.id);
                    const initials = (t.name || '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                    return (
                      <tr key={t.id}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#fafbff' }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '' }}
                        style={{ borderBottom: '1px solid #f8fafc', transition: 'background 150ms' }}
                      >
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: nameGradient(t.name || '?'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: 'white', flexShrink: 0 }}>{initials}</div>
                            <div>
                              <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 14 }}>{t.name}</div>
                              <div style={{ fontSize: 11, color: '#94a3b8' }}>{t.role || 'Coach'}{t.mobile ? ` · ${t.mobile}` : ''}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                            {STATUS_BTN.map(({ status, label, color, bg }) => (
                              <button
                                key={status}
                                onClick={() => mark(t, status)}
                                disabled={saving === t.id}
                                style={{
                                  width: 34, height: 34, borderRadius: 10, border: '1.5px solid',
                                  cursor: saving === t.id ? 'not-allowed' : 'pointer',
                                  fontWeight: 700, fontSize: 13,
                                  transition: 'all 150ms', fontFamily: 'inherit',
                                  background: rec?.status === status ? bg : '#ffffff',
                                  color: rec?.status === status ? color : '#94a3b8',
                                  borderColor: rec?.status === status ? color : '#e2e8f0',
                                  opacity: saving === t.id ? 0.6 : 1,
                                }}
                                onMouseEnter={(e) => {
                                  if (saving !== t.id) {
                                    const el = e.currentTarget;
                                    el.style.transform = 'scale(1.1)';
                                    el.style.boxShadow = `0 2px 8px ${color}30`;
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  const el = e.currentTarget;
                                  el.style.transform = 'scale(1)';
                                  el.style.boxShadow = 'none';
                                }}
                              >
                                {saving === t.id ? '…' : label}
                              </button>
                            ))}
                            {rec && rec.check_in && (
                              <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace', marginLeft: 4 }}>
                                {rec.check_in}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── Legend ── */}
        <div style={{
          marginTop: 16, textAlign: 'center', display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap',
          fontSize: 11, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.6px', textTransform: 'uppercase',
        }}>
          <span><span style={{ color: '#10b981', fontWeight: 800 }}>●</span> P · Present</span>
          <span><span style={{ color: '#ef4444', fontWeight: 800 }}>●</span> A · Absent</span>
          <span><span style={{ color: '#f59e0b', fontWeight: 800 }}>●</span> L · Late</span>
        </div>

      </motion.div>
    </AppShell>
  );
}
