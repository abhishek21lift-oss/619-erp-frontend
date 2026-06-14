'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Star, MessageSquare, ThumbsUp, ThumbsDown, Clock, CheckCircle2, User, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';

interface Feedback { id: string; member: string; trainer?: string; rating: number; category: string; message: string; status: 'open' | 'resolved' | 'in_progress'; date: string; sentiment: 'positive' | 'neutral' | 'negative'; }

const CATS = ['All', 'Trainer', 'Facility', 'Equipment', 'Overall', 'Timing', 'Billing', 'Other'];

const KPIS = [
  { label: 'Avg Rating', key: 'rating', color: '#f59e0b', bg: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(217,119,6,0.06))' },
  { label: 'Total', key: 'total', color: '#8b5cf6', bg: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(109,40,217,0.06))' },
  { label: 'Positive', key: 'positive', color: '#22c55e', bg: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(22,163,74,0.06))' },
  { label: 'Open', key: 'open', color: '#ef4444', bg: 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(220,38,38,0.06))' },
  { label: 'NPS Score', key: 'nps', color: '#a855f7', bg: 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(88,28,135,0.06))' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] } }
};

export default function FeedbackPage() {
  return <Guard role="admin"><FeedbackContent /></Guard>;
}

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
    try {
      const data = await api.feedback.list() as Feedback[];
      setItems(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load feedback');
    } finally { setLoading(false); }
  }

  async function handleResolve(id: string) {
    setResolving(id);
    try {
      await api.feedback.resolve(id);
      setItems(p => p.map(f => f.id === id ? { ...f, status: 'resolved' as const } : f));
      setShowReply(null); setReply('');
      toast.success('Feedback resolved');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to resolve feedback');
    } finally { setResolving(null); }
  }

  async function handleReply(id: string) {
    if (!reply.trim()) return;
    try {
      await api.feedback.reply(id, { message: reply });
      toast.success('Reply sent');
      await handleResolve(id);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send reply');
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = items.filter(f => (cat === 'All' || f.category === cat) && (statusF === 'all' || f.status === statusF));
  const avgRating = items.length ? (items.reduce((s, f) => s + f.rating, 0) / items.length).toFixed(1) : '0';
  const positive = items.filter(f => f.sentiment === 'positive').length;
  const open = items.filter(f => f.status === 'open').length;
  const nps = items.length ? Math.round(((positive - items.filter(f => f.sentiment === 'negative').length) / items.length) * 100) : 0;

  function stars(n: number) { return Array.from({ length: 5 }, (_, i) => i < n ? '★' : '☆').join(''); }
  function statusColor(s: string) { return s === 'resolved' ? '#22c55e' : s === 'in_progress' ? '#f59e0b' : '#ef4444'; }
  function sentimentIcon(s: string) {
    return s === 'positive' ? <ThumbsUp size={13} color="#22c55e" /> : s === 'negative' ? <ThumbsDown size={13} color="#ef4444" /> : <span style={{ fontSize: 14, lineHeight: 1 }}>😐</span>;
  }

  return (
    <AppShell>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ position: 'relative', overflow: 'hidden', borderRadius: 24, padding: '40px 44px', marginBottom: 28, background: 'linear-gradient(135deg, #1a0a2e, #2d1b69, #1a0a2e)', boxShadow: '0 20px 60px rgba(26,10,46,0.5)' }}>
          <div style={{ position: 'relative', zIndex: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(109,40,217,0.1))', backdropFilter: 'blur(8px)' }}>
                <Star size={22} color="#a855f7" />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', background: 'linear-gradient(135deg, #a855f7, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Feedback</span>
            </div>
            <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, color: '#ffffff', margin: '0 0 8px' }}>Member Feedback</h1>
            <p style={{ maxWidth: 560, fontSize: 14, lineHeight: 1.6, color: 'rgba(255,255,255,0.55)' }}>Track, respond &amp; act on member reviews and complaints.</p>
          </div>
        </motion.div>

        {error && (
          <div style={{ borderRadius: 14, padding: '14px 20px', marginBottom: 22, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', fontWeight: 600, fontSize: 13 }}>
            {error}
          </div>
        )}

        <motion.div variants={containerVariants} initial="hidden" animate="visible"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14, marginBottom: 28 }}>
          {KPIS.map((k, i) => {
            const vals = [avgRating, items.length, positive, open, nps];
            const suffixes = [' ⭐', '', '', '', '%'];
            return (
              <motion.div key={k.label} variants={itemVariants}
                style={{ position: 'relative', overflow: 'hidden', borderRadius: 20, padding: '22px 24px', background: k.bg, backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', cursor: 'default', transition: 'all 0.3s ease' }}>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.5)' }}>{k.label}</span>
                <div style={{ fontSize: 30, fontWeight: 800, color: k.color, lineHeight: 1.2, letterSpacing: '-0.02em' }}>{loading ? '—' : vals[i]}{suffixes[i]}</div>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CATS.map(c => (
              <button key={c} onClick={() => setCat(c)}
                style={{ padding: '7px 16px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: cat === c ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)' : 'rgba(255,255,255,0.05)',
                  color: cat === c ? '#fff' : 'rgba(255,255,255,0.5)' }}>{c}</button>
            ))}
          </div>
          <select value={statusF} onChange={e => setStatusF(e.target.value as any)}
            style={{ maxWidth: 160, width: '100%', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '7px 12px', fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.04)', outline: 'none', fontFamily: 'inherit' }}>
            <option value="all">All Status</option><option value="open">Open</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option>
          </select>
        </motion.div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}><Loader2 size={32} color="rgba(255,255,255,0.2)" style={{ animation: 'spin 1s linear infinite' }} /></div>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" style={{ display: 'grid', gap: 12 }}>
            {filtered.map(f => (
              <motion.div key={f.id} variants={itemVariants}
                style={{ borderRadius: 20, background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px' }}>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(109,40,217,0.1))', color: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <User size={22} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: 'rgba(255,255,255,0.9)' }}>{f.member}</span>
                        {f.trainer && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>→ {f.trainer}</span>}
                        <span style={{ color: '#f59e0b', fontSize: 16, letterSpacing: '-1px' }}>{stars(f.rating)}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: `${statusColor(f.status)}20`, color: statusColor(f.status), textTransform: 'capitalize' }}>{f.status.replace('_', ' ')}</span>
                        {sentimentIcon(f.sentiment)}
                      </div>
                      <p style={{ margin: '0 0 10px', fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, fontStyle: 'italic' }}>"{f.message}"</p>
                      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={11} />{f.date}</span>
                        {f.status !== 'resolved' && (
                          <>
                            <button onClick={() => setShowReply(showReply === f.id ? null : f.id)}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
                              <MessageSquare size={12} /> Reply
                            </button>
                            <button onClick={() => handleResolve(f.id)} disabled={resolving === f.id}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 8, border: '1px solid rgba(34,197,94,0.2)', background: 'rgba(34,197,94,0.08)', color: '#4ade80', cursor: 'pointer' }}>
                              {resolving === f.id ? <Loader2 size={12} /> : <CheckCircle2 size={12} />} Mark Resolved
                            </button>
                          </>
                        )}
                      </div>
                      {showReply === f.id && (
                        <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                          <input value={reply} onChange={e => setReply(e.target.value)} placeholder="Type your reply to the member…"
                            style={{ flex: 1, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '9px 14px', fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.04)', outline: 'none', fontFamily: 'inherit' }} />
                          <button onClick={() => handleReply(f.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, padding: '8px 18px', borderRadius: 10, background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(139,92,246,0.3)' }}>
                            Send &amp; Resolve
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: '64px 20px', textAlign: 'center' }}>
                <Star size={40} color="rgba(255,255,255,0.12)" style={{ marginBottom: 14 }} />
                <p style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.35)', margin: 0 }}>No feedback found</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>Try adjusting your filters.</p>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </AppShell>
  );
}
