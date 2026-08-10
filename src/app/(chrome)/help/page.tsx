'use client';

import { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { HelpCircle, Mail, MessageCircle, Phone, Search, ChevronDown } from 'lucide-react';
import Guard from '@/components/Guard';

const FAQS = [
  { q: 'How do I add a new member?', a: 'Go to Members → Add Member or click the quick action button from the dashboard.' },
  { q: 'How do I record a payment?', a: 'Navigate to Finance → Record Payment, fill in the member details and amount.' },
  { q: 'How do I assign a PT to a client?', a: 'Open the client profile and click "Assign PT" in the action buttons bar.' },
  { q: 'How do I check attendance?', a: 'Use the Check-In page for QR/biometric check-in, or visit Attendance Records.' },
  { q: 'How do I generate reports?', a: 'Go to Reports section — you can access revenue, member, and attendance reports.' },
  { q: 'How do I reset a user password?', a: 'The studio owner manages users under Settings → Staff & Access.' },
];

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const itemVariants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };
const lightCard: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' };

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
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* ── Hero ── */}
        <m.div {...fadeUp}
          style={{
            position: 'relative', overflow: 'hidden',
            borderRadius: 24, padding: '32px 36px',
            display: 'flex', alignItems: 'center', gap: 20,
            background: 'linear-gradient(135deg, #f1f5f9, #f8fafc, #f8fafc)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ position: 'relative', zIndex: 1, width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #0067e0, #0059ce)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,103,224,0.3)' }}>
            <HelpCircle size={26} color="#fff" />
          </div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)', margin: 0 }}>Help &amp; Support</h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Find answers to common questions</p>
          </div>
        </m.div>

        {/* ── Search ── */}
        <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          style={{ ...lightCard, borderRadius: 16, padding: '4px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Search size={16} color="#94a3b8" />
          <input
            type="text" placeholder="Search FAQs…" value={search} onChange={(e) => { setOpenIdx(null); setSearch(e.target.value); }}
            style={{
              flex: 1, border: 'none', padding: '12px 0',
              background: 'transparent', color: 'var(--text-primary)', fontSize: 13,
            }}
          />
        </m.div>

        {/* ── FAQ Accordion ── */}
        <m.div variants={containerVariants} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((faq, i) => (
            <m.div key={i} variants={itemVariants}
              style={{
                borderRadius: 16, overflow: 'hidden',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                borderLeft: `3px solid ${openIdx === i ? '#0067e0' : 'rgba(0,0,0,0.07)'}`,
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
                <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>{faq.q}</span>
                <m.span
                  animate={{ rotate: openIdx === i ? 180 : 0 }}
                  transition={{ duration: 0.25 }}
                  style={{ display: 'flex', lineHeight: 0, flexShrink: 0, marginLeft: 12 }}
                >
                  <ChevronDown size={15} color="#94a3b8" />
                </m.span>
              </button>
              <AnimatePresence initial={false}>
                {openIdx === i && (
                  <m.div
                    key="answer"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{
                      padding: '0 20px 16px', fontSize: 13,
                      color: 'var(--text-muted)', lineHeight: 1.7,
                      borderTop: '1px solid rgba(0,0,0,0.06)',
                    }}>
                      {faq.a}
                    </div>
                  </m.div>
                )}
              </AnimatePresence>
            </m.div>
          ))}
          {filtered.length === 0 && (
            <m.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ textAlign: 'center', padding: '32px 0', fontSize: 13, color: 'var(--text-disabled)' }}>
              No results found.
            </m.p>
          )}
        </m.div>

        {/* ── Support contacts ── */}
        <m.div {...fadeUp} transition={{ duration: 0.5, delay: 0.25 }}
          style={{ ...lightCard, borderRadius: 20, padding: 28, marginTop: 8 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,103,224,0.08)', border: '1px solid rgba(0,103,224,0.12)', marginBottom: 16 }}>
            <HelpCircle size={22} color="#0067e0" />
          </div>
          <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Still need help?</p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 20px' }}>Reach out to our support team</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <a href="mailto:support@619fitness.com"
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                borderRadius: 16, background: 'var(--bg-subtle)',
                border: '1px solid var(--border)', textDecoration: 'none',
                transition: 'all 0.2s',
              }}
              onMouseOver={e => { e.currentTarget.style.background = 'rgba(0,103,224,0.05)'; e.currentTarget.style.borderColor = 'rgba(0,103,224,0.2)'; }}
              onMouseOut={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.07)'; }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,103,224,0.08)',
              }}>
                <Mail size={18} color="#0067e0" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Email Support</p>
                <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '1px 0 0' }}>support@619fitness.com</p>
              </div>
            </a>
            <a href={`tel:${process.env.NEXT_PUBLIC_SUPPORT_PHONE || '+918756562188'}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                borderRadius: 16, background: 'var(--bg-subtle)',
                border: '1px solid var(--border)', textDecoration: 'none',
                transition: 'all 0.2s',
              }}
              onMouseOver={e => { e.currentTarget.style.background = 'rgba(0,103,224,0.05)'; e.currentTarget.style.borderColor = 'rgba(0,103,224,0.2)'; }}
              onMouseOut={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.07)'; }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,103,224,0.08)',
              }}>
                <Phone size={18} color="#0067e0" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Call Us</p>
                <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '1px 0 0' }}>{process.env.NEXT_PUBLIC_SUPPORT_PHONE || '+91-8756562188'}</p>
              </div>
            </a>
            <a href={`https://wa.me/${(process.env.NEXT_PUBLIC_SUPPORT_PHONE || '918756562188').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                borderRadius: 16, background: 'var(--bg-subtle)',
                border: '1px solid var(--border)', textDecoration: 'none',
                transition: 'all 0.2s',
              }}
              onMouseOver={e => { e.currentTarget.style.background = 'rgba(0,103,224,0.05)'; e.currentTarget.style.borderColor = 'rgba(0,103,224,0.2)'; }}
              onMouseOut={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.07)'; }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,103,224,0.08)',
              }}>
                <MessageCircle size={18} color="#0067e0" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>WhatsApp Support</p>
                <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '1px 0 0' }}>{process.env.NEXT_PUBLIC_SUPPORT_PHONE || '+91-8756562188'}</p>
              </div>
            </a>
          </div>
        </m.div>
      </div>
    </Guard>
  );
}
