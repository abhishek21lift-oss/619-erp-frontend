'use client';

import { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { HelpCircle, Mail, MessageCircle, Phone, Search, ChevronDown, ChevronRight, LifeBuoy } from 'lucide-react';
import Guard from '@/components/Guard';
import { PageHero } from '@/components/ui';

// Answers name the navigation the app actually has.
//
// The first version still described the old information architecture: it sent
// people to "Members → Add Member", told them to click "Assign PT" — a button
// that does not exist — and put the password form under "Settings → Security"
// when it lives in My Profile → Security. A help page that is wrong is worse
// than no help page, because it sends someone looking for a screen that is not
// there. When a nav label changes, this list changes with it.
const FAQS = [
  { q: 'How do I add a new client?', a: 'Open Clients → All Clients and choose New Client, or use the New client quick action on the dashboard.' },
  { q: 'How do I record a payment?', a: 'Go to Finance → Record Payment, choose the client and enter the amount you received.' },
  { q: 'How do I start a client on a programme?', a: 'Open the client and choose Enroll to set up their PT term, then use Workout programmes on their profile to assign a plan.' },
  { q: 'How do I check attendance?', a: 'Open Check In in the sidebar to scan walk-ins, or Sessions → Attendance Records to review the register.' },
  { q: 'How do I see my reports?', a: 'Open Reports for Revenue Report, Renewal Report and Attendance Report.' },
  { q: 'How do I change my password?', a: 'Open My Profile → Security. Members reset theirs from the member sign-in page.' },
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
  const filtered = FAQS.filter((f) =>
    `${f.q} ${f.a}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <Guard>
      {/* No side padding of its own: the shell already provides the gutter
          (see PageHero). */}
      <div style={{ maxWidth: 800, margin: '0 auto', paddingTop: 4, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <PageHero
          icon={<HelpCircle size={20} />}
          title="Help & Support"

        />

        {/* ── Search ── */}
        <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          style={{ ...lightCard, borderRadius: 16, padding: '4px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Search size={16} color="#94a3b8" />
          <input aria-label="Search FAQs"
            type="text" value={search} onChange={(e) => { setOpenIdx(null); setSearch(e.target.value); }}
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
                background: openIdx === i ? 'var(--bg-subtle)' : 'var(--bg-card)',
                border: '1px solid var(--border)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                transition: 'background-color 0.25s',
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
          <div style={{ width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(163,55,87,0.08)', border: '1px solid rgba(163,55,87,0.12)', marginBottom: 16 }}>
            <HelpCircle size={22} color="#A33757" />
          </div>
          <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 20px' }}>Still need help?</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* A ticket first: it keeps the whole thread, with replies, in the
                app (/support). This page used to offer only email, phone and
                WhatsApp, so the ticketing screen was a second "support" page
                nothing pointed to. */}
            <Link href="/support"
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                borderRadius: 16, background: 'rgba(163,55,87,0.06)',
                border: '1px solid rgba(163,55,87,0.18)', textDecoration: 'none',
              }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(163,55,87,0.12)',
              }}>
                <LifeBuoy size={18} color="#A33757" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Raise a support ticket</p>
                <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '1px 0 0' }}>Track replies here in the app</p>
              </div>
              <ChevronRight size={16} color="var(--text-muted)" aria-hidden />
            </Link>
            <a href="mailto:support@myptstudio.com"
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                borderRadius: 16, background: 'var(--bg-subtle)',
                border: '1px solid var(--border)', textDecoration: 'none',
                transition: 'all 0.2s',
              }}
              onMouseOver={e => { e.currentTarget.style.background = 'rgba(163,55,87,0.05)'; e.currentTarget.style.borderColor = 'rgba(163,55,87,0.2)'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.borderColor = 'var(--border)'; }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(163,55,87,0.08)',
              }}>
                <Mail size={18} color="#A33757" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Email Support</p>
                <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '1px 0 0' }}>support@myptstudio.com</p>
              </div>
            </a>
            <a href={`tel:${process.env.NEXT_PUBLIC_SUPPORT_PHONE || '+918756562188'}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                borderRadius: 16, background: 'var(--bg-subtle)',
                border: '1px solid var(--border)', textDecoration: 'none',
                transition: 'all 0.2s',
              }}
              onMouseOver={e => { e.currentTarget.style.background = 'rgba(163,55,87,0.05)'; e.currentTarget.style.borderColor = 'rgba(163,55,87,0.2)'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.borderColor = 'var(--border)'; }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(163,55,87,0.08)',
              }}>
                <Phone size={18} color="#A33757" />
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
              onMouseOver={e => { e.currentTarget.style.background = 'rgba(163,55,87,0.05)'; e.currentTarget.style.borderColor = 'rgba(163,55,87,0.2)'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.borderColor = 'var(--border)'; }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(163,55,87,0.08)',
              }}>
                <MessageCircle size={18} color="#A33757" />
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
