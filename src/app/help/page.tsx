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

const card = {
  borderRadius: 24,
  background: 'rgba(255,255,255,0.03)',
  backdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.06)',
  padding: 24,
};

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
          <motion.div {...fadeUp} style={{
            background: 'linear-gradient(135deg, #0f172a, #1e293b)',
            borderRadius: 24, padding: '28px 32px',
            display: 'flex', alignItems: 'center', gap: 20,
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(129,140,248,0.15)',
            }}>
              <HelpCircle size={26} color="#818cf8" />
            </div>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: '#fff', margin: 0 }}>Help &amp; Support</h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 4, margin: 0 }}>Find answers to common questions</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} style={{ position: 'relative' }}>
            <Search size={16} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text" placeholder="Search FAQs\u2026" value={search} onChange={(e) => { setOpenIdx(null); setSearch(e.target.value); }}
              style={{
                width: '100%', borderRadius: 16, padding: '14px 16px 14px 46px',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                color: '#e2e8f0', fontSize: 13, outline: 'none',
              }}
            />
          </motion.div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.04 }}
                style={{
                  borderRadius: 18, overflow: 'hidden',
                  background: 'rgba(255,255,255,0.03)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255,255,255,0.06)',
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
                    style={{ display: 'flex', lineHeight: 0 }}
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
                      <div style={{ padding: '0 20px 16px', fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}>
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
            {filtered.length === 0 && (
              <p style={{ textAlign: 'center', padding: '32px 0', fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>No results found.</p>
            )}
          </div>

          <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.25 }} style={{ ...card, marginTop: 8 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', margin: 0 }}>Still need help?</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '4px 0 20px' }}>Reach out to our support team</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <a href="mailto:support@619fitness.com"
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                  borderRadius: 16, background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)', textDecoration: 'none',
                }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(129,140,248,0.12)',
                }}>
                  <Mail size={18} color="#818cf8" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', margin: 0 }}>Email Support</p>
                  <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.4)', margin: '1px 0 0' }}>support@619fitness.com</p>
                </div>
              </a>
              <a href="tel:+918756562188"
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                  borderRadius: 16, background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)', textDecoration: 'none',
                }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(34,197,94,0.12)',
                }}>
                  <Phone size={18} color="#22c55e" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', margin: 0 }}>Call Us</p>
                  <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.4)', margin: '1px 0 0' }}>+91-8756562188</p>
                </div>
              </a>
              <a href="https://wa.me/918756562188" target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                  borderRadius: 16, background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)', textDecoration: 'none',
                }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(37,211,102,0.12)',
                }}>
                  <MessageCircle size={18} color="#25d366" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', margin: 0 }}>WhatsApp Support</p>
                  <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.4)', margin: '1px 0 0' }}>+91-8756562188</p>
                </div>
              </a>
            </div>
          </motion.div>
        </div>
      </AppShell>
    </Guard>
  );
}
