'use client';
/**
 * Member Profile Page — Premium Glassmorphism Redesign
 * Luxury fitness CRM • Apple + Stripe + Linear quality
 */
import { use, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Guard from '@/components/Guard';
import { api } from '@/lib/api';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import {
  ArrowLeft, User, Phone, Mail, Calendar, CreditCard, Activity,
  ScanFace, RefreshCw, Snowflake, Trash2, Edit2, MessageCircle,
  CheckCircle, XCircle, Clock, AlertCircle, Dumbbell, Camera,
  Fingerprint, Plus, ArrowRightLeft, UserCheck, RotateCcw,
  Zap, MoreHorizontal, ChevronRight, TrendingUp, Star,
} from 'lucide-react';
import FaceEnrollModal from '@/components/FaceEnrollModal';

/* ─── Types ─────────────────────────────────────────────── */
interface ClientDetail {
  id: string; name: string; email?: string; phone?: string;
  dob?: string; gender?: string; address?: string;
  status: 'active' | 'expired' | 'frozen' | 'pending';
  membership_plan?: string; package_type?: string;
  expiry_date?: string; pt_end_date?: string;
  balance_due?: number; face_enrolled?: boolean;
  face_enrolled_at?: string; mobile?: string;
  join_date?: string; joining_date?: string;
  trainer_name?: string; trainer_full_name?: string;
  emergency_contact?: string; notes?: string; photo_url?: string;
}
interface AttendanceLog {
  id: string; date: string; check_in_time: string;
  check_out_time?: string; method: string;
  check_in?: string; check_out?: string;
}
interface PaymentLog {
  id: string; date: string; amount: number; plan: string;
  method: string; receipt?: string;
}

/* ─── Helpers ───────────────────────────────────────────── */
function fmtDate(d?: string) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtTime(t?: string) {
  if (!t) return '—';
  const dt = new Date(t);
  if (isNaN(dt.getTime())) return t;
  return dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}
function daysUntil(d?: string): number {
  if (!d) return 9999;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}
function totalDays(start?: string, end?: string): number {
  if (!start || !end) return 30;
  return Math.max(1, Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86400000));
}

/* ─── Status config ─────────────────────────────────────── */
const STATUS_CFG: Record<string, { label: string; gradient: string; dot: string }> = {
  active:  { label: 'Active',  gradient: 'linear-gradient(135deg,#10b981,#059669)', dot: '#10b981' },
  expired: { label: 'Expired', gradient: 'linear-gradient(135deg,#f43f5e,#e11d48)', dot: '#f43f5e' },
  frozen:  { label: 'Frozen',  gradient: 'linear-gradient(135deg,#06b6d4,#0891b2)', dot: '#06b6d4' },
  pending: { label: 'Pending', gradient: 'linear-gradient(135deg,#f59e0b,#d97706)', dot: '#f59e0b' },
};

/* ─── Glassmorphism card ─────────────────────────────────── */
function GlassCard({ children, style = {}, accent = '#6366f1', className = '' }: {
  children: React.ReactNode; style?: React.CSSProperties; accent?: string; className?: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className={className}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--bg-card)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid var(--border)`,
        borderRadius: 24,
        boxShadow: hovered
          ? `0 20px 48px rgba(0,0,0,0.10), 0 0 0 1px ${accent}22, 0 4px 16px ${accent}18`
          : '0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'all 0.32s cubic-bezier(0.16,1,0.3,1)',
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      <div style={{
        position: 'absolute', top: 0, left: '10%', right: '10%', height: 1,
        background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.6),transparent)',
        borderRadius: 1,
      }} />
      {children}
    </div>
  );
}

/* ─── Info field ─────────────────────────────────────────── */
function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: 10, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 13, color: '#1e293b', fontWeight: 500, lineHeight: 1.4 }}>{value ?? '—'}</span>
    </div>
  );
}

/* ─── Action button ──────────────────────────────────────── */
function ActionBtn({ icon, label, onClick, gradient, outline = false, danger = false, disabled = false, style: extraStyle }: {
  icon: React.ReactNode; label: string; onClick?: () => void;
  gradient?: string; outline?: boolean; danger?: boolean; disabled?: boolean; style?: React.CSSProperties;
}) {
  const [hov, setHov] = useState(false);
  const bg = danger
    ? (hov ? 'linear-gradient(135deg,#f43f5e,#e11d48)' : 'rgba(244,63,94,0.08)')
    : outline
    ? (hov ? 'rgba(99,102,241,0.08)' : 'transparent')
    : (gradient ?? 'linear-gradient(135deg,#6366f1,#8b5cf6)');
  const color = danger ? (hov ? '#fff' : '#f43f5e') : outline ? '#6366f1' : '#fff';
  const border = danger ? '1px solid rgba(244,63,94,0.3)' : outline ? '1px solid rgba(99,102,241,0.3)' : 'none';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      title={label}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
        borderRadius: 12, border, background: bg, color,
        fontSize: 12, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
        transform: hov && !disabled ? 'translateY(-1px) scale(1.02)' : 'none',
        transition: 'all 0.22s cubic-bezier(0.16,1,0.3,1)',
        boxShadow: hov && !disabled && !outline && !danger
          ? `0 8px 24px ${gradient ? gradient.match(/#[a-f0-9]{6}/i)?.[0] ?? '#6366f1' : '#6366f1'}44`
          : 'none',
        whiteSpace: 'nowrap', opacity: disabled ? 0.5 : 1,
        ...extraStyle,
      }}
    >
      {icon} <span style={{ fontSize: 12 }}>{label}</span>
    </button>
  );
}

/* ─── Main ──────────────────────────────────────────────── */
export default function ClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();

  const [client, setClient]         = useState<ClientDetail | null>(null);
  const [attendance, setAttendance] = useState<AttendanceLog[]>([]);
  const [payments, setPayments]     = useState<PaymentLog[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [activeTab, setActiveTab]   = useState<'overview' | 'attendance' | 'payments'>('overview');
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [deleting, setDeleting]     = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [enrollOpen, setEnrollOpen] = useState(false);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setPhotoUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = reader.result as string;
        await api.clients.uploadPhoto(id, dataUrl);
        setClient((c: any) => c ? { ...c, photo_url: dataUrl } : c);
      } catch (err: any) { alert('Photo upload failed: ' + err.message); }
      finally { setPhotoUploading(false); }
    };
    reader.readAsDataURL(file);
  }

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [cRes, aRes, pRes] = await Promise.allSettled([
        api.clients.get(id),
        api.attendance.list({ ref_id: id }),
        api.payments.list({ client_id: id }),
      ]);
      if (cRes.status === 'fulfilled') setClient(cRes.value as any);
      else throw new Error('Member not found');
      if (aRes.status === 'fulfilled') {
        const raw = Array.isArray(aRes.value) ? aRes.value : [];
        setAttendance(raw.map((a: any) => ({
          ...a,
          check_in_time: a.check_in_time || a.check_in || '',
          check_out_time: a.check_out_time || a.check_out || undefined,
        })));
      }
      if (pRes.status === 'fulfilled') {
        const raw = Array.isArray(pRes.value) ? pRes.value : [];
        setPayments(raw.map((p: any) => ({
          id: p.id, date: p.date, amount: p.amount, method: p.method || '',
          plan: p.plan || p.package_type || '',
          receipt: p.receipt || p.receipt_no,
        })));
      }
    } catch (e: any) { setError(e.message || 'Failed to load member.'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleDelete() {
    setDeleting(true);
    try { await api.clients.delete(id); router.push('/clients'); }
    catch (e: any) { alert(`Delete failed: ${e.message}`); setDeleting(false); }
  }

  const whatsappHref = () => {
    if (!client?.phone && !client?.mobile) return '#';
    const n = (client.mobile || (client as any).phone || '').replace(/\D/g, '');
    const num = n.startsWith('91') ? n : `91${n}`;
    const msg = encodeURIComponent(`Hi ${client?.name}, this is a message from 619 Fitness Studio.`);
    return `https://wa.me/${num}?text=${msg}`;
  };

  /* ── Loading ── */
  if (loading) return (
    <Guard><AppShell>
      <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
        {[200, 120, 360].map((h, i) => (
          <div key={i} style={{
            height: h, borderRadius: 24, marginBottom: 16,
            background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s ease-in-out infinite',
          }} />
        ))}
        <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
      </div>
    </AppShell></Guard>
  );

  if (error || !client) return (
    <Guard><AppShell>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: 16 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#f1f5f9,#e2e8f0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <User size={28} color="#94a3b8" />
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 15, fontWeight: 500 }}>{error || 'Member not found'}</p>
        <button onClick={() => router.back()} style={{ padding: '8px 20px', borderRadius: 12, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
          Go back
        </button>
      </div>
    </AppShell></Guard>
  );

  const membershipPlan  = client.membership_plan || client.package_type;
  const joinDate        = client.join_date || client.joining_date || (client as any).created_at;
  const expiryDate      = client.expiry_date || client.pt_end_date;
  const assignedTrainer = client.trainer_name || client.trainer_full_name;
  const phone           = client.mobile || (client as any).phone;
  const days            = daysUntil(expiryDate);
  const total           = totalDays(joinDate, expiryDate);
  const elapsed         = total - Math.max(0, days);
  const progress        = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  const isAdmin         = user?.role === 'admin' || user?.role === 'manager';
  const statusCfg       = STATUS_CFG[client.status] ?? STATUS_CFG.active;
  const initials        = client.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  const RING_GRADIENT = client.status === 'active'
    ? 'conic-gradient(#10b981, #6366f1, #8b5cf6, #ec4899, #10b981)'
    : client.status === 'frozen'
    ? 'conic-gradient(#06b6d4, #0ea5e9, #6366f1, #06b6d4)'
    : client.status === 'expired'
    ? 'conic-gradient(#f43f5e, #e11d48, #f43f5e)'
    : 'conic-gradient(#f59e0b, #fbbf24, #f59e0b)';

  return (
    <Guard>
      <AppShell>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
          .profile-page * { font-family: 'Inter', sans-serif; }
          @keyframes pulse-ring { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(1.08)} }
          @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
          @keyframes spin { to{transform:rotate(360deg)} }
          @keyframes fade-in { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
          @keyframes tab-in { from{opacity:0;transform:translateX(8px)} to{opacity:1;transform:translateX(0)} }
          @keyframes progress-fill { from{width:0} to{width:var(--w)} }
          .profile-page { animation: fade-in 0.4s ease both; }
          .tab-content { animation: tab-in 0.28s cubic-bezier(0.16,1,0.3,1) both; }
          .action-btn-group::-webkit-scrollbar { height: 0; }
          @media(max-width:768px){
            .hero-inner { flex-direction: column !important; align-items: flex-start !important; }
            .action-btn-group { gap: 6px !important; }
            .overview-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>

        <div className="profile-page" style={{ padding: '20px 20px 100px', maxWidth: 1100, margin: '0 auto' }}>

          {/* Ambient blobs */}
          <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,0.12),transparent 70%)', filter: 'blur(40px)' }} />
            <div style={{ position: 'absolute', top: '30%', left: '-8%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle,rgba(16,185,129,0.09),transparent 70%)', filter: 'blur(40px)' }} />
            <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle,rgba(236,72,153,0.08),transparent 70%)', filter: 'blur(40px)' }} />
          </div>

          {/* Back nav */}
          <div style={{ position: 'relative', zIndex: 1, marginBottom: 20 }}>
            <button
              onClick={() => router.back()}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
                borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border)',
                color: 'var(--text-muted)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                backdropFilter: 'blur(12px)', transition: 'all 0.2s',
              }}
            >
              <ArrowLeft size={14} /> Back to Members
            </button>
          </div>

          {/* ══ HERO CARD ══ */}
          <div style={{ position: 'relative', zIndex: 1, marginBottom: 16 }}>
            <GlassCard style={{ padding: '28px 28px 24px' }} accent="#6366f1">
              <div className="hero-inner" style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

                {/* Avatar */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{
                    width: 100, height: 100, borderRadius: '50%', padding: 3,
                    background: RING_GRADIENT,
                    animation: client.status === 'active' ? 'pulse-ring 3s ease-in-out infinite' : undefined,
                  }}>
                    <div style={{
                      width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden',
                      background: 'linear-gradient(135deg,#1e293b,#334155)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 32, fontWeight: 800, color: '#fff', border: '3px solid #fff',
                    }}>
                      {client.photo_url
                        ? <img src={client.photo_url} alt={client.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : initials
                      }
                    </div>
                  </div>
                  <div style={{
                    position: 'absolute', bottom: 4, right: 4, width: 16, height: 16,
                    borderRadius: '50%', background: statusCfg.dot,
                    border: '3px solid #fff', boxShadow: `0 0 0 3px ${statusCfg.dot}44`,
                    animation: client.status === 'active' ? 'pulse-ring 2s ease-in-out infinite' : undefined,
                  }} />
                  <label style={{
                    position: 'absolute', top: 0, right: 0, width: 26, height: 26, borderRadius: '50%',
                    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', border: '2px solid #fff', boxShadow: '0 2px 8px rgba(99,102,241,0.4)',
                  }} title="Upload photo">
                    <Camera size={11} />
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
                  </label>
                  {photoUploading && (
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <RefreshCw size={16} color="#fff" style={{ animation: 'spin 0.9s linear infinite' }} />
                    </div>
                  )}
                </div>

                {/* Member meta */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                    <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                      {client.name}
                    </h1>
                    <span style={{
                      padding: '3px 12px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                      background: statusCfg.gradient, color: '#fff', letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}>{statusCfg.label}</span>
                    {client.face_enrolled && (
                      <span style={{
                        padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                        background: 'rgba(6,182,212,0.12)', color: '#0891b2',
                        border: '1px solid rgba(6,182,212,0.3)', display: 'flex', alignItems: 'center', gap: 4,
                      }}><ScanFace size={11} /> Face ID</span>
                    )}
                  </div>
                  {phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, color: 'var(--text-muted)', fontSize: 13, fontWeight: 500 }}>
                      <Phone size={13} color="#94a3b8" /> {phone}
                      {client.email && <><span style={{ color: '#cbd5e1', margin: '0 4px' }}>·</span><Mail size={13} color="#94a3b8" />{client.email}</>}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                    {membershipPlan && (
                      <span style={{ padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: 'rgba(99,102,241,0.1)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Dumbbell size={10} /> {membershipPlan}
                      </span>
                    )}
                    {joinDate && (
                      <span style={{ padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: 'var(--bg-subtle)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Calendar size={10} /> Joined {fmtDate(joinDate)}
                      </span>
                    )}
                    {assignedTrainer && (
                      <span style={{ padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: 'rgba(139,92,246,0.1)', color: '#7c3aed', border: '1px solid rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <UserCheck size={10} /> {assignedTrainer}
                      </span>
                    )}
                    {attendance.length > 0 && (
                      <span style={{ padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: 'rgba(16,185,129,0.1)', color: '#059669', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Activity size={10} /> {attendance.length} sessions
                      </span>
                    )}
                  </div>
                  {client.status === 'active' && days <= 30 && days > 0 && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 10, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#b45309', fontSize: 12, fontWeight: 600, marginTop: 2 }}>
                      <Clock size={12} /> Expires in {days} day{days !== 1 ? 's' : ''} — {fmtDate(expiryDate)}
                    </div>
                  )}
                  {client.status === 'expired' && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 10, background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)', color: '#e11d48', fontSize: 12, fontWeight: 600, marginTop: 2 }}>
                      <XCircle size={12} /> Membership expired {fmtDate(expiryDate)}
                    </div>
                  )}
                </div>

                {/* WhatsApp */}
                <div style={{ flexShrink: 0 }}>
                  <a href={whatsappHref()} target="_blank" rel="noopener noreferrer" style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px',
                    borderRadius: 14, background: 'linear-gradient(135deg,#25d366,#128c7e)',
                    color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none',
                    boxShadow: '0 4px 16px rgba(37,211,102,0.35)', transition: 'all 0.2s',
                  }}>
                    <MessageCircle size={15} /> WhatsApp
                  </a>
                </div>
              </div>

              {/* ── ACTION BUTTON BAR ── */}
              <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(226,232,240,0.7)' }}>
                <div
                  className="action-btn-group"
                  style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}
                >
                  <ActionBtn icon={<Plus size={13} />} label="Add Membership" gradient="linear-gradient(135deg,#6366f1,#8b5cf6)" onClick={() => router.push(`/clients/${id}/add-subscription`)} />
                  <ActionBtn icon={<RefreshCw size={13} />} label="Renew" gradient="linear-gradient(135deg,#10b981,#059669)" onClick={() => router.push(`/clients/${id}/renew-subscription`)} />
                  <ActionBtn icon={<Clock size={13} />} label="Extension" outline onClick={() => router.push(`/clients/${id}/extension`)} />
                  <ActionBtn icon={<ArrowRightLeft size={13} />} label="Transfer" outline onClick={() => router.push(`/clients/${id}/transfer`)} />
                  <ActionBtn icon={<Snowflake size={13} />} label="Freeze" gradient="linear-gradient(135deg,#06b6d4,#0891b2)" onClick={() => router.push(`/clients/${id}/freeze`)} />
                  <ActionBtn icon={<UserCheck size={13} />} label="Assign PT" gradient="linear-gradient(135deg,#8b5cf6,#7c3aed)" onClick={() => router.push(`/clients/${id}/assign-pt`)} />
                  <ActionBtn icon={<RotateCcw size={13} />} label="Renew PT" outline onClick={() => router.push(`/clients/${id}/renew-pt`)} />
                  <ActionBtn icon={<Zap size={13} />} label="Combo" outline onClick={() => router.push(`/clients/${id}/combo`)} />
                  <ActionBtn icon={<TrendingUp size={13} />} label="Downgrade" outline onClick={() => router.push(`/clients/${id}/downgrade`)} />
                  <ActionBtn icon={<Star size={13} />} label="Trial" outline onClick={() => router.push(`/clients/${id}/trial`)} />
                  <button
                    onClick={() => setEnrollOpen(true)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                      borderRadius: 12, border: '1px solid rgba(6,182,212,0.3)',
                      background: 'rgba(6,182,212,0.08)', color: '#0891b2',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                      transition: 'all 0.22s',
                    }}
                  >
                    <ScanFace size={13} /> {client.face_enrolled_at ? 'Re-enroll Face' : 'Enroll Face ID'}
                  </button>
                  <ActionBtn icon={<Fingerprint size={13} />} label="Biometric" outline onClick={() => router.push(`/clients/${id}/biometric`)} />
                  {isAdmin && (
                    <ActionBtn icon={<Edit2 size={13} />} label="Edit" outline onClick={() => router.push(`/clients/new?edit=${id}`)} style={{ marginLeft: 'auto' }} />
                  )}
                  {isAdmin && (
                    <ActionBtn icon={<Trash2 size={13} />} label="Delete" danger onClick={() => setDeleteStep(1)} />
                  )}
                </div>
              </div>
            </GlassCard>
          </div>

          {/* ══ TABS ══ */}
          <div style={{ position: 'relative', zIndex: 1, marginBottom: 16 }}>
            <div style={{
              display: 'inline-flex', gap: 4, padding: 4,
              background: 'var(--bg-card)', backdropFilter: 'blur(16px)',
              borderRadius: 16, border: '1px solid var(--border)',
            }}>
              {(['overview', 'attendance', 'payments'] as const).map((t) => (
                <button key={t} onClick={() => setActiveTab(t)} style={{
                  padding: '8px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, transition: 'all 0.22s cubic-bezier(0.16,1,0.3,1)',
                  background: activeTab === t ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'transparent',
                  color: activeTab === t ? '#fff' : 'var(--text-muted)',
                  boxShadow: activeTab === t ? '0 4px 16px rgba(99,102,241,0.35)' : 'none',
                }}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* ══ OVERVIEW TAB ══ */}
          {activeTab === 'overview' && (
            <div className="tab-content overview-grid" style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>

              {/* Personal Information */}
              <GlassCard style={{ padding: '18px 22px' }} accent="#6366f1">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={13} color="#fff" />
                  </div>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Personal Information</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="Date of Birth" value={fmtDate(client.dob)} />
                  <Field label="Gender" value={client.gender} />
                  <Field label="Phone" value={phone} />
                  <Field label="Email" value={client.email} />
                  <div style={{ gridColumn: '1/-1' }}><Field label="Address" value={client.address} /></div>
                  <div style={{ gridColumn: '1/-1' }}><Field label="Emergency Contact" value={client.emergency_contact} /></div>
                </div>
              </GlassCard>

              {/* Membership */}
              <GlassCard style={{ padding: '18px 22px' }} accent="#10b981">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CreditCard size={13} color="#fff" />
                  </div>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Membership</h3>
                  {client.status === 'active' && days < 9999 && (
                    <span style={{
                      marginLeft: 'auto', padding: '2px 10px', borderRadius: 99, fontSize: 10, fontWeight: 700,
                      background: days <= 7 ? 'rgba(244,63,94,0.1)' : days <= 30 ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                      color: days <= 7 ? '#e11d48' : days <= 30 ? '#b45309' : '#059669',
                    }}>{days}d left</span>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <Field label="Plan" value={membershipPlan} />
                  <Field label="Status" value={
                    <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: statusCfg.gradient, color: '#fff' }}>{statusCfg.label}</span>
                  } />
                  <Field label="Join Date" value={fmtDate(joinDate)} />
                  <Field label="Expiry Date" value={fmtDate(expiryDate)} />
                  <Field label="Assigned Trainer" value={assignedTrainer} />
                  <Field label="Balance Due" value={
                    (client.balance_due ?? 0) > 0
                      ? <span style={{ color: '#e11d48', fontWeight: 700 }}>₹{client.balance_due?.toLocaleString('en-IN')}</span>
                      : <span style={{ color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={11} /> Cleared</span>
                  } />
                </div>
                {client.status === 'active' && days < 9999 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 10, color: 'var(--text-disabled)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Progress</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{progress}% used</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 99, background: 'var(--bg-subtle)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 99, width: `${progress}%`,
                        background: progress >= 80 ? 'linear-gradient(90deg,#f59e0b,#f43f5e)' : 'linear-gradient(90deg,#10b981,#06b6d4)',
                        transition: 'width 1s cubic-bezier(0.16,1,0.3,1)',
                      }} />
                    </div>
                  </div>
                )}
              </GlassCard>

              {/* Attendance Summary */}
              <GlassCard style={{ padding: '18px 22px' }} accent="#f59e0b">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#f59e0b,#d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Activity size={13} color="#fff" />
                  </div>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Attendance</h3>
                  <span style={{ marginLeft: 'auto', fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{attendance.length}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {[
                    { label: 'This Month', val: attendance.filter(a => new Date(a.date).getMonth() === new Date().getMonth()).length },
                    { label: 'Last Month', val: attendance.filter(a => new Date(a.date).getMonth() === new Date().getMonth() - 1).length },
                    { label: 'Total', val: attendance.length },
                  ].map(({ label, val }) => (
                    <div key={label} style={{ textAlign: 'center', padding: '10px 6px', borderRadius: 12, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{val}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-disabled)', fontWeight: 600, marginTop: 2 }}>{label}</div>
                    </div>
                  ))}
                </div>
                {attendance.length > 0 && (
                  <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 10, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-disabled)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Last check-in</div>
                    <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 600 }}>{fmtDate(attendance[0]?.date)} · {fmtTime(attendance[0]?.check_in_time)}</div>
                  </div>
                )}
              </GlassCard>

              {/* Payment Insights */}
              <GlassCard style={{ padding: '18px 22px' }} accent="#8b5cf6">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingUp size={13} color="#fff" />
                  </div>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Payment Insights</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { label: 'Total Paid', val: `₹${payments.reduce((s, p) => s + p.amount, 0).toLocaleString('en-IN')}`, accent: '#8b5cf6' },
                    { label: 'Transactions', val: payments.length, accent: '#6366f1' },
                    { label: 'Last Payment', val: payments[0] ? fmtDate(payments[0].date) : '—', accent: '#0891b2' },
                    { label: 'Balance Due', val: (client.balance_due ?? 0) > 0 ? `₹${client.balance_due?.toLocaleString('en-IN')}` : 'Clear', accent: (client.balance_due ?? 0) > 0 ? '#e11d48' : '#10b981' },
                  ].map(({ label, val, accent }) => (
                    <div key={label} style={{ padding: '10px', borderRadius: 12, background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.1)' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-disabled)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: accent }}>{val}</div>
                    </div>
                  ))}
                </div>
              </GlassCard>

              {client.notes && (
                <GlassCard style={{ padding: '18px 22px', gridColumn: '1/-1' }} accent="#94a3b8">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#64748b,#475569)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MessageCircle size={13} color="#fff" />
                    </div>
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Trainer Notes</h3>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0, padding: '12px 14px', borderRadius: 10, background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                    {client.notes}
                  </p>
                </GlassCard>
              )}
            </div>
          )}

          {/* ══ ATTENDANCE TAB ══ */}
          {activeTab === 'attendance' && (
            <div className="tab-content" style={{ position: 'relative', zIndex: 1 }}>
              <GlassCard style={{ overflow: 'hidden' }} accent="#f59e0b">
                <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(226,232,240,0.6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#f59e0b,#d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Activity size={13} color="#fff" /></div>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Attendance History</h3>
                  </div>
                  <span style={{ padding: '3px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700, background: 'rgba(245,158,11,0.1)', color: '#d97706' }}>{attendance.length} records</span>
                </div>
                {attendance.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 24px', gap: 12 }}>
                    <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Activity size={24} color="#d97706" /></div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>No attendance records yet</p>
                    <p style={{ fontSize: 13, color: 'var(--text-disabled)', margin: 0 }}>Check-in history will appear here</p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-subtle)' }}>
                          {['Date', 'Check In', 'Check Out', 'Method', 'Duration'].map(h => (
                            <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {attendance.slice(0, 100).map((a, i) => {
                          const inTime  = a.check_in_time  ? new Date(a.check_in_time)  : null;
                          const outTime = a.check_out_time ? new Date(a.check_out_time) : null;
                          const durMin  = inTime && outTime ? Math.round((outTime.getTime() - inTime.getTime()) / 60000) : null;
                          return (
                            <tr key={a.id} style={{ borderTop: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-subtle)' }}>
                              <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{fmtDate(a.date)}</td>
                              <td style={{ padding: '12px 20px', fontSize: 13, color: 'var(--text-muted)' }}>{fmtTime(a.check_in_time)}</td>
                              <td style={{ padding: '12px 20px', fontSize: 13, color: 'var(--text-muted)' }}>{fmtTime(a.check_out_time)}</td>
                              <td style={{ padding: '12px 20px' }}>
                                <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: a.method === 'face' ? 'rgba(6,182,212,0.1)' : 'rgba(99,102,241,0.1)', color: a.method === 'face' ? '#0891b2' : '#6366f1' }}>{a.method}</span>
                              </td>
                              <td style={{ padding: '12px 20px', fontSize: 13, color: 'var(--text-disabled)' }}>{durMin !== null ? `${durMin} min` : '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </GlassCard>
            </div>
          )}

          {/* ══ PAYMENTS TAB ══ */}
          {activeTab === 'payments' && (
            <div className="tab-content" style={{ position: 'relative', zIndex: 1 }}>
              <GlassCard style={{ overflow: 'hidden' }} accent="#8b5cf6">
                <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(226,232,240,0.6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CreditCard size={13} color="#fff" /></div>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Payment History</h3>
                  </div>
                  <span style={{ padding: '3px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700, background: 'rgba(139,92,246,0.1)', color: '#7c3aed' }}>₹{payments.reduce((s, p) => s + p.amount, 0).toLocaleString('en-IN')} total</span>
                </div>
                {payments.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 24px', gap: 12 }}>
                    <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CreditCard size={24} color="#7c3aed" /></div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>No payment records yet</p>
                    <p style={{ fontSize: 13, color: 'var(--text-disabled)', margin: 0 }}>Payment history will appear here</p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-subtle)' }}>
                          {['Date', 'Plan', 'Amount', 'Method', 'Receipt'].map(h => (
                            <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((p, i) => (
                          <tr key={p.id} style={{ borderTop: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-subtle)' }}>
                            <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{fmtDate(p.date)}</td>
                            <td style={{ padding: '12px 20px', fontSize: 13, color: 'var(--text-muted)' }}>{p.plan}</td>
                            <td style={{ padding: '12px 20px', fontSize: 15, fontWeight: 800, color: '#059669' }}>₹{p.amount.toLocaleString('en-IN')}</td>
                            <td style={{ padding: '12px 20px' }}>
                              <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>{p.method}</span>
                            </td>
                            <td style={{ padding: '12px 20px' }}>
                              {p.receipt ? (
                                <a href={p.receipt} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#6366f1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>View <ChevronRight size={12} /></a>
                              ) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </GlassCard>
            </div>
          )}

        </div>

        {/* Face Enroll Modal */}
        {enrollOpen && (
          <FaceEnrollModal
            clientId={id} clientName={client.name}
            open={enrollOpen}
            onClose={() => setEnrollOpen(false)}
            onEnrolled={() => {
              setEnrollOpen(false);
              setClient((c: any) => c ? { ...c, face_enrolled: true, face_enrolled_at: new Date().toISOString() } : c);
            }}
          />
        )}

        {/* Delete step 1 */}
        {deleteStep === 1 && (
          <div role="presentation" onClick={() => setDeleteStep(0)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 440, borderRadius: 24, background: 'var(--bg-card)', backdropFilter: 'blur(20px)', border: '1px solid var(--border)', boxShadow: '0 32px 80px rgba(0,0,0,0.15)', padding: 32, animation: 'fade-in 0.28s ease both' }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(244,63,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}><Trash2 size={24} color="#e11d48" /></div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>Delete member?</h3>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 24 }}>You are about to permanently delete <strong>{client.name}</strong>. All data will be removed. This <strong>cannot be undone</strong>.</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setDeleteStep(0)} style={{ flex: 1, padding: '12px', borderRadius: 14, border: '1px solid rgba(226,232,240,0.8)', background: 'transparent', color: 'var(--text-muted)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button onClick={() => setDeleteStep(2)} style={{ flex: 1, padding: '12px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#f43f5e,#e11d48)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Continue</button>
              </div>
            </div>
          </div>
        )}

        {/* Delete step 2 */}
        {deleteStep === 2 && (
          <div role="presentation" onClick={() => setDeleteStep(0)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 440, borderRadius: 24, background: 'var(--bg-card)', backdropFilter: 'blur(20px)', border: '2px solid rgba(244,63,94,0.3)', boxShadow: '0 32px 80px rgba(244,63,94,0.15)', padding: 32, animation: 'fade-in 0.28s ease both' }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(244,63,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}><AlertCircle size={24} color="#e11d48" /></div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#e11d48', marginBottom: 8 }}>Final confirmation</h3>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 24 }}>Type <strong style={{ color: 'var(--text-primary)' }}>DELETE</strong> to confirm permanent deletion of <strong>{client.name}</strong>.</p>
              <input placeholder="Type DELETE to confirm" id="delete-confirm-input" style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(244,63,94,0.3)', background: 'rgba(244,63,94,0.04)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16, boxSizing: 'border-box', outline: 'none' }} />
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setDeleteStep(0)} style={{ flex: 1, padding: '12px', borderRadius: 14, border: '1px solid rgba(226,232,240,0.8)', background: 'transparent', color: 'var(--text-muted)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button disabled={deleting} onClick={() => {
                  const val = (document.getElementById('delete-confirm-input') as HTMLInputElement)?.value;
                  if (val !== 'DELETE') { alert('Type DELETE exactly to confirm.'); return; }
                  handleDelete();
                }} style={{ flex: 1, padding: '12px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#f43f5e,#be123c)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1 }}>
                  {deleting ? 'Deleting…' : '🗑 Delete permanently'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile sticky bottom bar */}
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, padding: '12px 16px', display: 'flex', gap: 8, background: 'var(--bg-card)', backdropFilter: 'blur(20px)', borderTop: '1px solid var(--border)' }} className="mobile-bar">
          <style>{`@media(min-width:769px){.mobile-bar{display:none!important}}`}</style>
          <Link href={`/clients/${id}/add-subscription`} style={{ flex: 1, textDecoration: 'none' }}>
            <button style={{ width: '100%', padding: '12px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              <Plus size={14} style={{ display: 'inline', marginRight: 6 }} /> Add Membership
            </button>
          </Link>
          <Link href={`/clients/${id}/renew-subscription`} style={{ textDecoration: 'none' }}>
            <button style={{ padding: '12px 16px', borderRadius: 14, border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.08)', color: '#059669', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              <RefreshCw size={14} />
            </button>
          </Link>
          <a href={whatsappHref()} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
            <button style={{ padding: '12px 16px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#25d366,#128c7e)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              <MessageCircle size={14} />
            </button>
          </a>
        </div>

      </AppShell>
    </Guard>
  );
}
