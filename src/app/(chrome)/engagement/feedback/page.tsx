'use client';
import { useState, useEffect } from 'react';
import { m } from 'framer-motion';
import Guard from '@/components/Guard';
import { PageContainer, PageHero } from '@/components/ui';
import { Star, MessageSquare, ThumbsUp, ThumbsDown, Clock, CheckCircle2, User, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';

interface Feedback { id: string; member: string; trainer?: string; rating: number; category: string; message: string; status: 'open' | 'resolved' | 'in_progress'; date: string; sentiment: 'positive' | 'neutral' | 'negative'; }

const CATS = ['All', 'Trainer', 'Facility', 'Equipment', 'Overall', 'Timing', 'Billing', 'Other'];

const KPIS = [
  { label: 'Avg Rating', key: 'rating', color: '#d97706', bg: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(217,119,6,0.05))' },
  { label: 'Total', key: 'total', color: '#0067e0', bg: 'linear-gradient(135deg, rgba(0,103,224,0.1), rgba(0,103,224,0.05))' },
  { label: 'Positive', key: 'positive', color: '#10b981', bg: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.05))' },
  { label: 'Open', key: 'open', color: '#F59E0B', bg: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(217,119,6,0.05))' },
  { label: 'NPS Score', key: 'nps', color: '#0067e0', bg: 'linear-gradient(135deg, rgba(0,103,224,0.1), rgba(0,89,206,0.05))' },
];

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const itemVariants = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] } } };

export default function FeedbackPage() { return <Guard role="admin"><FeedbackContent /></Guard>; }

function FeedbackContent() {
  const { toast } = useToast();
  const [items, setItems] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cat, setCat] = useState('All');
  const [statusF, setStatusF] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');
  const [showReply, setShowReply] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [resolving, setResolving] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try { const data = await api.feedback.list() as Feedback[]; setItems(Array.isArray(data) ? data : []); }
    catch (err: any) { setError(err?.message || 'Failed to load feedback'); }
    finally { setLoading(false); }
  }

  async function handleResolve(id: string) {
    setResolving(id);
    try {
      await api.feedback.resolve(id);
      setItems(p => p.map(f => f.id === id ? { ...f, status: 'resolved' as const } : f));
      setShowReply(null); setReply('');
      toast.success('Feedback resolved');
    } catch (err: any) { toast.error(err?.message || 'Failed to resolve feedback'); }
    finally { setResolving(null); }
  }

  async function handleReply(id: string) {
    if (!reply.trim()) return;
    try {
      await api.feedback.reply(id, { reply: reply });
      toast.success('Reply sent');
      await handleResolve(id);
    } catch (err: any) { toast.error(err?.message || 'Failed to send reply'); }
  }

  useEffect(() => { load(); }, []);

  const filtered = items.filter(f => (cat === 'All' || f.category === cat) && (statusF === 'all' || f.status === statusF));
  const avgRating = items.length ? (items.reduce((s, f) => s + f.rating, 0) / items.length).toFixed(1) : '0';
  const positive = items.filter(f => f.sentiment === 'positive').length;
  const open = items.filter(f => f.status === 'open').length;
  const nps = items.length ? Math.round(((positive - items.filter(f => f.sentiment === 'negative').length) / items.length) * 100) : 0;

  function stars(n: number) { return Array.from({ length: 5 }, (_, i) => i < n ? '★' : '☆').join(''); }
  function statusColor(s: string) { return s === 'resolved' ? '#10b981' : s === 'in_progress' ? '#d97706' : '#F59E0B'; }
  function statusBg(s: string) { return s === 'resolved' ? 'rgba(16,185,129,0.1)' : s === 'in_progress' ? 'rgba(217,119,6,0.1)' : 'rgba(245,158,11,0.08)'; }
  function sentimentIcon(s: string) {
    return s === 'positive' ? <ThumbsUp size={13} color="#10b981" /> : s === 'negative' ? <ThumbsDown size={13} color="#F59E0B" /> : <span style={{ fontSize: 14, lineHeight: 1 }}>😐</span>;
  }

  return (
    <PageContainer>
      <PageHero
        icon={<Star size={20} />}
        title="Member Feedback"
        subtitle="Track, respond & act on member reviews and complaints."
      />

      {error && <div style={{ borderRadius: 14, padding: '14px 20px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontWeight: 600, fontSize: 13 }}>{error}</div>}

      {/* ── KPI CARDS ── */}
      <m.div variants={containerVariants} initial="hidden" animate="visible"
        className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {KPIS.map((k, i) => {
          const vals = [avgRating, items.length, positive, open, nps];
          const suffixes = [' ⭐', '', '', '', '%'];
          return (
            <m.div key={k.label} variants={itemVariants}
              style={{ position: 'relative', overflow: 'hidden', borderRadius: 20, padding: '22px 24px', background: k.bg, border: `1px solid ${k.color}22`, boxShadow: 'var(--shadow-xs)' }}>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>{k.label}</span>
              <div style={{ fontSize: 30, fontWeight: 800, color: k.color, lineHeight: 1.2, letterSpacing: '-0.02em' }}>{loading ? '—' : vals[i]}{suffixes[i]}</div>
            </m.div>
          );
        })}
      </m.div>

      {/* ── FILTERS ── */}
      <m.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {CATS.map(c => (
            <button key={c} onClick={() => setCat(c)}
              style={{ padding: '7px 16px', borderRadius: 8, border: `1px solid ${cat === c ? '#0067e0' : '#e2e8f0'}`, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: cat === c ? 'linear-gradient(135deg, #0067e0, #0059ce)' : '#ffffff', color: cat === c ? '#fff' : '#334155' }}>{c}</button>
          ))}
        </div>
        <select aria-label="Filter by status" value={statusF} onChange={e => setStatusF(e.target.value as any)}
          style={{ maxWidth: 160, width: '100%', border: '1px solid #cbd5e1', borderRadius: 10, padding: '7px 12px', fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', background: '#ffffff', outline: 'none', fontFamily: 'inherit' }}>
          <option value="all">All Status</option><option value="open">Open</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option>
        </select>
      </m.div>

      {/* ── FEEDBACK LIST ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}><Loader2 size={32} color="#cbd5e1" style={{ animation: 'spin 1s linear infinite' }} /></div>
      ) : (
        <m.div variants={containerVariants} initial="hidden" animate="visible" style={{ display: 'grid', gap: 12 }}>
          {filtered.map(f => (
            <m.div key={f.id} variants={itemVariants}
              style={{ borderRadius: 20, background: '#ffffff', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)', overflow: 'hidden' }}>
              <div style={{ padding: '18px 22px' }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(0,103,224,0.12), rgba(0,103,224,0.06))', color: '#0067e0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(0,103,224,0.15)' }}>
                    <User size={22} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{f.member}</span>
                      {f.trainer && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>→ {f.trainer}</span>}
                      <span style={{ color: '#d97706', fontSize: 16, letterSpacing: '-1px' }}>{stars(f.rating)}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: statusBg(f.status), color: statusColor(f.status), textTransform: 'capitalize' }}>{f.status.replace('_', ' ')}</span>
                      {sentimentIcon(f.sentiment)}
                    </div>
                    <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, fontStyle: 'italic' }}>"{f.message}"</p>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-disabled)', display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={11} />{f.date}</span>
                      {f.status !== 'resolved' && (
                        <>
                          <button onClick={() => setShowReply(showReply === f.id ? null : f.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 8, border: '1px solid #cbd5e1', background: 'var(--bg-subtle)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                            <MessageSquare size={12} /> Reply
                          </button>
                          <button onClick={() => handleResolve(f.id)} disabled={resolving === f.id}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 8, border: '1px solid rgba(16,185,129,0.25)', background: 'rgba(16,185,129,0.08)', color: '#10b981', cursor: 'pointer' }}>
                            {resolving === f.id ? <Loader2 size={12} /> : <CheckCircle2 size={12} />} Mark Resolved
                          </button>
                        </>
                      )}
                    </div>
                    {showReply === f.id && (
                      <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                        <input value={reply} onChange={e => setReply(e.target.value)} placeholder="Type your reply to the member…"
                          style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: 10, padding: '9px 14px', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', background: 'var(--bg-subtle)', outline: 'none', fontFamily: 'inherit' }} />
                        <button onClick={() => handleReply(f.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, padding: '8px 18px', borderRadius: 10, background: 'linear-gradient(135deg, #0067e0, #0059ce)', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,103,224,0.3)' }}>
                          Send &amp; Resolve
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </m.div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: '64px 20px', textAlign: 'center', background: '#ffffff', borderRadius: 20, border: '1px solid var(--border)' }}>
              <Star size={40} color="#cbd5e1" style={{ marginBottom: 14 }} />
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-secondary)', margin: 0 }}>No feedback found</p>
              <p style={{ fontSize: 12, color: 'var(--text-disabled)', marginTop: 4 }}>Try adjusting your filters.</p>
            </div>
          )}
        </m.div>
      )}
    </PageContainer>
  );
}
