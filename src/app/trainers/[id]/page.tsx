'use client';
import React, { use, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { m, AnimatePresence } from 'framer-motion';
import Guard from '@/components/Guard';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';
import {
  ArrowLeft, User, Phone, Mail, Edit2, Trash2, Users,
  MessageCircle, Award, Calendar, Dumbbell, CheckCircle, XCircle,
  Star, Clock, MapPin, AlertTriangle, Sparkles,
} from 'lucide-react';
import { CopyId } from '@/components/ui/CopyId';

interface TrainerDetail {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  specialization?: string;
  bio?: string;
  status: 'active' | 'inactive';
  join_date?: string;
  certifications?: string[];
  schedule?: string;
}

interface AssignedMember {
  id: number;
  name: string;
  status: 'active' | 'expired' | 'frozen' | 'pending';
  membership_plan?: string;
  expiry_date?: string;
  phone?: string;
}

function fmtDate(d?: string) {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  active: { bg: 'rgba(16,185,129,0.12)', color: '#059669' },
  expired: { bg: 'rgba(239,68,68,0.12)', color: '#dc2626' },
  frozen: { bg: 'rgba(59,130,246,0.12)', color: '#2563eb' },
  pending: { bg: 'rgba(245,158,11,0.12)', color: '#d97706' },
  inactive: { bg: 'rgba(148,163,184,0.12)', color: 'var(--text-muted)' },
};

import { avatarGradient, initialsAvatar } from '@/lib/avatar';

const initials = initialsAvatar;

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.inactive;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: s.bg, color: s.color, padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>
      {status === 'active' ? <CheckCircle size={11} /> : <XCircle size={11} />}
      {status}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: 10, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{value ?? '—'}</span>
    </div>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } }
};

export default function TrainerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const [trainer, setTrainer] = useState<TrainerDetail | null>(null);
  const [members, setMembers] = useState<AssignedMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'profile' | 'members'>('profile');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [tRes, mRes] = await Promise.allSettled([
        api.trainers.get(id),
        api.clients.list({ trainer_id: id }),
      ]);
      if (tRes.status === 'fulfilled') {
        setTrainer(tRes.value as any);
      } else throw new Error('Trainer not found');
      if (mRes.status === 'fulfilled') {
        const d = mRes.value as any;
        const raw = Array.isArray(d) ? d : (d.members ?? []);
        setMembers(raw.map((c: any) => ({
          id: c.id, name: c.name, status: c.status,
          membership_plan: c.membership_plan || c.package_type,
          expiry_date: c.expiry_date || c.pt_end_date,
          phone: c.phone || c.mobile,
        })));
      }
    } catch (e: any) { setError(e.message || 'Failed to load trainer.'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleDelete() {
    setDeleting(true);
    try { await api.trainers.delete(id); }
    catch (e: any) { toast.error(`Failed: ${e.message}`); setDeleting(false); }
  }

  const whatsappHref = () => {
    if (!trainer?.phone) return '#';
    const n = trainer.phone.replace(/\D/g, '');
    const num = n.startsWith('91') ? n : `91${n}`;
    return `https://wa.me/${num}?text=${encodeURIComponent(`Hi ${trainer.name}, this is a message from 619 Fitness Studio.`)}`;
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  if (loading) {
    return (
      <Guard roles={['admin', 'manager']}>
        <AppShell>
          <div style={{ padding: '32px', maxWidth: 1000, margin: '0 auto' }}>
            <m.div animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}
              style={{ height: 200, borderRadius: 20, background: 'var(--bg-subtle)', marginBottom: 16, border: '1px solid var(--border)' }} />
            <m.div animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
              style={{ height: 350, borderRadius: 20, background: 'var(--bg-subtle)', border: '1px solid var(--border)' }} />
          </div>
        </AppShell>
      </Guard>
    );
  }

  if (error || !trainer) {
    return (
      <Guard roles={['admin', 'manager']}>
        <AppShell>
          <div style={{ padding: '60px 32px', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(220,38,38,0.08))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '1px solid rgba(239,68,68,0.2)' }}>
              <User size={28} color="#dc2626" />
            </div>
            <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-muted)', marginBottom: 8 }}>{error || 'Trainer not found'}</div>
            <button onClick={() => router.back()}
              style={{ padding: '8px 20px', borderRadius: 10, border: '1px solid #d1d5db', background: 'var(--bg-subtle)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Go back
            </button>
          </div>
        </AppShell>
      </Guard>
    );
  }

  const mg = avatarGradient(trainer.name);

  return (
    <Guard roles={['admin', 'manager']}>
      <AppShell>
        <div style={{ minHeight: '100vh', background: 'var(--bg-subtle)' }}>
          {/* ── Hero ── */}
          <div style={{ position: 'relative', overflow: 'hidden', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', padding: '28px 32px 36px', borderRadius: '0 0 40px 40px' }}>
            <button onClick={() => router.back()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 20, transition: 'background 0.2s', position: 'relative', zIndex: 1 }}>
              <ArrowLeft size={13} /> Back to Trainers
            </button>

            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
              <m.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as const }}
                style={{ width: 76, height: 76, borderRadius: 20, flexShrink: 0, background: mg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: '#fff', boxShadow: '0 8px 32px rgba(99,102,241,0.3)' }}>
                {initials(trainer.name)}
              </m.div>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>{trainer.name}</h2>
                  <StatusBadge status={trainer.status} />
                </div>
                {trainer.specialization && (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                    <Dumbbell size={13} color="#9ca3af" /> {trainer.specialization}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 4 }}>
                  {trainer.phone && (
                    <span style={{ fontSize: 12.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Phone size={12} color="#9ca3af" /> {trainer.phone}
                    </span>
                  )}
                  {trainer.email && (
                    <span style={{ fontSize: 12.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Mail size={12} color="#9ca3af" /> {trainer.email}
                    </span>
                  )}
                  <span style={{ fontSize: 12.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Users size={12} color="#9ca3af" /> {members.length} member{members.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {trainer.phone && (
                  <a href={whatsappHref()} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)', color: '#059669', fontSize: 11.5, fontWeight: 600, textDecoration: 'none', transition: 'all 0.2s' }}>
                    <MessageCircle size={13} /> WhatsApp
                  </a>
                )}
                {isAdmin && (
                  <Link href={`/trainers/${id}/edit`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#4f46e5', fontSize: 11.5, fontWeight: 600, textDecoration: 'none', transition: 'all 0.2s' }}>
                    <Edit2 size={13} /> Edit
                  </Link>
                )}
                {user?.role === 'admin' && (
                  <button onClick={() => setDeleteConfirm(true)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}>
                    <Trash2 size={13} /> Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          <div style={{ padding: '24px 32px', maxWidth: 1100, margin: '0 auto' }}>
            {/* ── Quick Stats ── */}
            <m.div variants={containerVariants} initial="hidden" animate="visible"
              className="rg-3" style={{ gap: 14, marginBottom: 24 }}>
              {[
                { label: 'Total Members', value: members.length, icon: <Users size={14} />, color: '#6366f1' },
                { label: 'Active Members', value: members.filter(m => m.status === 'active').length, icon: <CheckCircle size={14} />, color: '#10b981' },
                { label: 'Joined Date', value: fmtDate(trainer.join_date), icon: <Calendar size={14} />, color: '#f59e0b' },
              ].map((s, i) => (
                <m.div key={s.label} variants={itemVariants}
                  style={{ borderRadius: 16, padding: '16px 18px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>{s.icon}</div>
                    <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>{s.label}</span>
                  </div>
                  <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{s.value}</span>
                </m.div>
              ))}
            </m.div>

            {/* ── Tabs ── */}
            <div style={{ display: 'inline-flex', gap: 4, marginBottom: 20, background: 'var(--bg-subtle)', borderRadius: 12, padding: 3 }}>
              {(['profile', 'members'] as const).map((t) => (
                <button key={t} onClick={() => setActiveTab(t)}
                  style={{
                    padding: '8px 20px', borderRadius: 9, border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 700, fontFamily: 'inherit', transition: 'all 0.2s',
                    background: activeTab === t ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                    color: activeTab === t ? '#fff' : '#6b7280',
                    boxShadow: activeTab === t ? '0 4px 12px rgba(99,102,241,0.3)' : 'none',
                  }}>
                  {t === 'members' ? `Members (${members.length})` : 'Profile'}
                </button>
              ))}
            </div>

            {/* ── Profile Tab ── */}
            {activeTab === 'profile' && (
              <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
                style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                <div style={{ borderRadius: 20, padding: 22, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <User size={14} color="#9ca3af" /> Personal Details
                  </h3>
                  <div className="rg-2" style={{ gap: 16 }}>
                    <InfoRow label="Full Name" value={trainer.name} />
                    <InfoRow label="Trainer ID" value={(trainer as any).unique_id ? <CopyId id={(trainer as any).unique_id} color="#f97316" /> : '—'} />
                    <InfoRow label="Status" value={<StatusBadge status={trainer.status} />} />
                    <InfoRow label="Phone" value={trainer.phone} />
                    <InfoRow label="Email" value={trainer.email} />
                    <InfoRow label="Specialization" value={trainer.specialization} />
                    <InfoRow label="Joined" value={fmtDate(trainer.join_date)} />
                  </div>
                </div>

                <div style={{ borderRadius: 20, padding: 22, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Award size={14} color="#9ca3af" /> Certifications & Schedule
                  </h3>
                  {trainer.certifications && trainer.certifications.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                      {trainer.certifications.map((c, i) => (
                        <span key={i} style={{ padding: '4px 12px', borderRadius: 20, background: 'rgba(99,102,241,0.1)', color: '#4f46e5', fontSize: 11.5, fontWeight: 600, border: '1px solid rgba(99,102,241,0.15)' }}>{c}</span>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: 13, color: 'var(--text-disabled)', marginBottom: 16 }}>No certifications listed.</p>
                  )}
                  <InfoRow label="Schedule / Timing" value={trainer.schedule} />
                </div>

                {trainer.bio && (
                  <div style={{ borderRadius: 20, padding: 22, background: 'var(--bg-card)', border: '1px solid var(--border)', gridColumn: '1/-1' }}>
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Star size={14} color="#9ca3af" /> Bio
                    </h3>
                    <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{trainer.bio}</p>
                  </div>
                )}
              </m.div>
            )}

            {/* ── Members Tab ── */}
            {activeTab === 'members' && (
              <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
                style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', background: 'var(--bg-card)' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Users size={14} color="#9ca3af" /> Assigned Members
                    <span style={{ padding: '1px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: 'rgba(99,102,241,0.1)', color: '#4f46e5' }}>{members.length}</span>
                  </h3>
                </div>
                {members.length === 0 ? (
                  <div style={{ padding: '50px', textAlign: 'center' }}>
                    <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', border: '1px solid rgba(99,102,241,0.15)' }}>
                      <Users size={24} color="#6366f1" />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-secondary)', marginBottom: 4 }}>No members assigned</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 300, margin: '0 auto' }}>Assign members to this trainer from the Members page.</div>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.05))' }}>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4f46e5' }}>Name</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4f46e5' }}>Status</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4f46e5' }}>Plan</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4f46e5' }}>Expiry</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4f46e5' }}>Phone</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(members ?? []).map((member, i) => (
                          <m.tr key={member.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                            style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'background 0.2s', background: i % 2 === 0 ? '#f9fafb' : '#fff' }}
                            onClick={() => router.push(`/clients/${member.id}`)}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.04)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? '#f9fafb' : '#fff'; }}>
                            <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>{member.name}</td>
                            <td style={{ padding: '12px 16px' }}><StatusBadge status={member.status} /></td>
                            <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{member.membership_plan ?? '—'}</td>
                            <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{fmtDate(member.expiry_date)}</td>
                            <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{member.phone ?? '—'}</td>
                          </m.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </m.div>
            )}
          </div>

          {/* ── Delete Modal ── */}
          <AnimatePresence>
            {deleteConfirm && (
              <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
                onClick={() => setDeleteConfirm(false)}>
                <m.div initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
                  style={{ background: 'var(--bg-card)', borderRadius: 22, padding: 28, width: '100%', maxWidth: 420, border: '1px solid var(--border)', boxShadow: '0 24px 80px rgba(0,0,0,0.15)' }}
                  onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <AlertTriangle size={18} color="#dc2626" />
                    </div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Remove Trainer</h3>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
                    Remove <strong style={{ color: 'var(--text-primary)' }}>{trainer.name}</strong>? Their {members.length} assigned member{members.length !== 1 ? 's' : ''} will become unassigned.
                  </p>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button onClick={() => setDeleteConfirm(false)}
                      style={{ padding: '9px 20px', borderRadius: 10, border: '1px solid #d1d5db', background: 'var(--bg-subtle)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Cancel
                    </button>
                    <button onClick={handleDelete} disabled={deleting}
                      style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: deleting ? 'default' : 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(239,68,68,0.25)' }}>
                      {deleting ? 'Removing…' : 'Remove trainer'}
                    </button>
                  </div>
                </m.div>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </AppShell>
    </Guard>
  );
}
