'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Mail, MessageCircle, Phone, Search, ChevronDown } from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';

const FAQS = [
  { q: 'How do I add a new member?', a: 'Go to Members \u2192 Add Member or click the quick action button from the dashboard.' },
  { q: 'How do I record a payment?', a: 'Navigate to Finance \u2192 Record Payment, fill in the member details and amount.' },
  { q: 'How do I assign a PT to a client?', a: 'Open the client profile and click "Assign PT" in the action buttons bar.' },
  { q: 'How do I check attendance?', a: 'Use the Check-In page for QR/biometric check-in, or visit Attendance Records.' },
  { q: 'How do I generate reports?', a: 'Go to Reports section \u2014 you can access revenue, member, and attendance reports.' },
  { q: 'How do I reset a user password?', a: 'Admins can manage users under Settings \u2192 Staff & Access.' },
];

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const itemVariants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };
const glass = { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' };

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: 'easeOut' as const },
};

export default function HelpPage() {
  const [search, setSearch] = useState('');
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const filtered = FAQS.filter((f) => f.q.toLowerCase().includes(search.toLowerCase()));

  return (
    <Guard>
      <AppShell>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* ── Hero ── */}
          <motion.div {...fadeUp}
            style={{
              position: 'relative', overflow: 'hidden',
              borderRadius: 24, padding: '32px 36px',
              display: 'flex', alignItems: 'center', gap: 20,
              background: 'linear-gradient(135deg, #0a0f1a 0%, #1e1b4b 25%, #312e81 50%, #1e1b4b 75%, #0a0f1a 100%)',
              border: '1px solid rgba(99,102,241,0.15)',
              boxShadow: '0 25px 60px -12px rgba(30,27,75,0.6)',
            }}
          >
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 20% 40%, rgba(99,102,241,0.12) 0%, transparent 60%), radial-gradient(ellipse at 80% 60%, rgba(139,92,246,0.08) 0%, transparent 50%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: -80, right: -40, width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -60, left: -20, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(255,255,255,0.015) 1px, rgba(255,255,255,0.015) 2px), repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(255,255,255,0.015) 1px, rgba(255,255,255,0.015) 2px)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1, width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(99,102,241,0.3)' }}>
              <HelpCircle size={26} color="#fff" />
            </div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: '#fff', margin: 0 }}>Help &amp; Support</h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>Find answers to common questions</p>
            </div>
          </motion.div>

          {/* ── Search ── */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
            style={{ ...glass, borderRadius: 16, padding: '4px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Search size={16} color="rgba(255,255,255,0.3)" />
            <input
              type="text" placeholder="Search FAQs\u2026" value={search} onChange={(e) => { setOpenIdx(null); setSearch(e.target.value); }}
              style={{
                flex: 1, border: 'none', outline: 'none', padding: '12px 0',
                background: 'transparent', color: '#ffffff', fontSize: 13,
              }}
            />
          </motion.div>

          {/* ── FAQ Accordion ── */}
          <motion.div variants={containerVariants} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map((faq, i) => (
              <motion.div key={i} variants={itemVariants}
                style={{
                  borderRadius: 16, overflow: 'hidden',
                  ...glass,
                  borderLeft: `3px solid ${openIdx === i ? '#6366f1' : 'rgba(255,255,255,0.06)'}`,
                  transition: 'border-color 0.25s',
                }}
              >
                <button
                  onClick={() => setOpenIdx(openIdx === i ? null : i)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: '#e2e8f0' }}>{faq.q}</span>
                  <motion.span
                    animate={{ rotate: openIdx === i ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    style={{ display: 'flex', lineHeight: 0, flexShrink: 0, marginLeft: 12 }}
                  >
                    <ChevronDown size={15} color="rgba(255,255,255,0.3)" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {openIdx === i && (
                    <motion.div
                      key="answer"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{
                        padding: '0 20px 16px', fontSize: 13,
                        color: 'rgba(255,255,255,0.55)', lineHeight: 1.7,
                        borderTop: '1px solid rgba(255,255,255,0.04)',
                      }}>
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
            {filtered.length === 0 && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ textAlign: 'center', padding: '32px 0', fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
                No results found.
              </motion.p>
            )}
          </motion.div>

          {/* ── Support contacts ── */}
          <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.25 }}
            style={{ ...glass, borderRadius: 20, padding: 28, marginTop: 8 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))', marginBottom: 16 }}>
              <HelpCircle size={22} color="#818cf8" />
            </div>
            <p style={{ fontSize: 17, fontWeight: 700, color: '#e2e8f0', margin: 0 }}>Still need help?</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '4px 0 20px' }}>Reach out to our support team</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <a href="mailto:support@619fitness.com"
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                  borderRadius: 16, background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)', textDecoration: 'none',
                  transition: 'all 0.2s',
                }}
                onMouseOver={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))',
                }}>
                  <Mail size={18} color="#818cf8" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', margin: 0 }}>Email Support</p>
                  <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.4)', margin: '1px 0 0' }}>support@619fitness.com</p>
                </div>
              </a>
              <a href={`tel:${process.env.NEXT_PUBLIC_SUPPORT_PHONE || '+918756562188'}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                  borderRadius: 16, background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)', textDecoration: 'none',
                  transition: 'all 0.2s',
                }}
                onMouseOver={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))',
                }}>
                  <Phone size={18} color="#818cf8" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', margin: 0 }}>Call Us</p>
                  <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.4)', margin: '1px 0 0' }}>{process.env.NEXT_PUBLIC_SUPPORT_PHONE || '+91-8756562188'}</p>
                </div>
              </a>
              <a href={`https://wa.me/${(process.env.NEXT_PUBLIC_SUPPORT_PHONE || '918756562188').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                  borderRadius: 16, background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)', textDecoration: 'none',
                  transition: 'all 0.2s',
                }}
                onMouseOver={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))',
                }}>
                  <MessageCircle size={18} color="#818cf8" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', margin: 0 }}>WhatsApp Support</p>
                  <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.4)', margin: '1px 0 0' }}>{process.env.NEXT_PUBLIC_SUPPORT_PHONE || '+91-8756562188'}</p>
                </div>
              </a>
            </div>
          </motion.div>
        </div>
      </AppShell>
    </Guard>
  );
}
