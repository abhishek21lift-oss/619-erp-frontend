'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, Mail, MessageCircle, FileText, Search, ChevronDown, ExternalLink } from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';

const FAQS = [
  { q: 'How do I add a new member?', a: 'Go to Members → Add Member or click the quick action button from the dashboard.' },
  { q: 'How do I record a payment?', a: 'Navigate to Finance → Record Payment, fill in the member details and amount.' },
  { q: 'How do I assign a PT to a client?', a: 'Open the client profile and click "Assign PT" in the action buttons bar.' },
  { q: 'How do I check attendance?', a: 'Use the Check-In page for QR/biometric check-in, or visit Attendance Records.' },
  { q: 'How do I generate reports?', a: 'Go to Reports section — you can access revenue, member, and attendance reports.' },
  { q: 'How do I reset a user password?', a: 'Admins can manage users under Settings → Staff & Access.' },
];

export default function HelpPage() {
  const [search, setSearch] = useState('');
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const filtered = FAQS.filter((f) => f.q.toLowerCase().includes(search.toLowerCase()));

  return (
    <Guard>
      <AppShell>
        <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-[14px]" style={{ background: 'rgba(99,102,241,0.10)' }}>
                <HelpCircle size={20} style={{ color: '#6366f1' }} />
              </div>
              <div>
                <h1 className="text-[24px] font-[800] tracking-[-0.02em]" style={{ color: 'rgb(15,23,42)' }}>Help & Support</h1>
                <p className="text-[13px]" style={{ color: 'rgb(148,163,184)' }}>Frequently asked questions and resources</p>
              </div>
            </div>

            <div className="relative mt-6 mb-8">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'rgb(148,163,184)' }} />
              <input
                type="text" placeholder="Search FAQs…" value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-[14px] px-11 py-3 text-[13px] outline-none transition-all"
                style={{ background: 'var(--bg-card)', border: '1.5px solid rgba(15,23,42,0.09)', color: 'rgb(15,23,42)' }}
              />
            </div>

            <div className="space-y-2">
              {filtered.map((faq, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="rounded-[16px] overflow-hidden transition-all"
                  style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.95)' }}>
                  <button
                    onClick={() => setOpenIdx(openIdx === i ? null : i)}
                    className="flex w-full items-center justify-between px-5 py-4 text-left"
                  >
                    <span className="text-[13px] font-[600]" style={{ color: 'rgb(15,23,42)' }}>{faq.q}</span>
                    <ChevronDown size={15} style={{ color: 'rgb(148,163,184)' }}
                      className={`transition-transform duration-200 ${openIdx === i ? 'rotate-180' : ''}`} />
                  </button>
                  {openIdx === i && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                      className="px-5 pb-4 text-[12.5px] leading-relaxed" style={{ color: 'rgb(100,116,139)' }}>
                      {faq.a}
                    </motion.div>
                  )}
                </motion.div>
              ))}
              {filtered.length === 0 && (
                <p className="text-center py-8 text-[13px]" style={{ color: 'rgb(148,163,184)' }}>No results found.</p>
              )}
            </div>

            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <a href="mailto:support@619fitness.com"
                className="flex items-center gap-4 rounded-[16px] p-5 transition-all"
                style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.95)' }}>
                <div className="flex h-10 w-10 items-center justify-center rounded-[12px]" style={{ background: 'rgba(99,102,241,0.10)' }}>
                  <Mail size={18} style={{ color: '#6366f1' }} />
                </div>
                <div>
                  <p className="text-[13px] font-[600]" style={{ color: 'rgb(15,23,42)' }}>Email Support</p>
                  <p className="text-[11px]" style={{ color: 'rgb(148,163,184)' }}>support@619fitness.com</p>
                </div>
                <ExternalLink size={14} className="ml-auto" style={{ color: 'rgb(148,163,184)' }} />
              </a>
              <a href="https://wa.me/919999999999" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-4 rounded-[16px] p-5 transition-all"
                style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.95)' }}>
                <div className="flex h-10 w-10 items-center justify-center rounded-[12px]" style={{ background: 'rgba(37,211,102,0.10)' }}>
                  <MessageCircle size={18} style={{ color: '#25d366' }} />
                </div>
                <div>
                  <p className="text-[13px] font-[600]" style={{ color: 'rgb(15,23,42)' }}>WhatsApp Support</p>
                  <p className="text-[11px]" style={{ color: 'rgb(148,163,184)' }}>Chat with our team</p>
                </div>
                <ExternalLink size={14} className="ml-auto" style={{ color: 'rgb(148,163,184)' }} />
              </a>
            </div>
          </motion.div>
        </div>
      </AppShell>
    </Guard>
  );
}
