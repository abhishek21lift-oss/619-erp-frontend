'use client';

import { ShieldCheck, Sparkles, HeartHandshake } from 'lucide-react';
import Link from 'next/link';
import { Container } from './primitives';
import { C } from './tokens';
import { Wordmark } from './Wordmark';

/** Product navigation columns — every link points at a real route or anchor. */
const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Product',
    links: [
      { label: 'Overview', href: '#product' },
      { label: 'AI Training Layer', href: '#ai' },
      { label: 'All features', href: '#features' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'Trust & security', href: '#trust' },
    ],
  },
  {
    title: 'Platform',
    links: [
      { label: 'PT OS', href: '/pt-os' },
      { label: 'AI Coach', href: '/ai-coach' },
      { label: 'Workout generator', href: '/ai/workout-generator' },
      { label: 'Diet generator', href: '/ai/diet-generator' },
      { label: 'Knowledge base', href: '/ai-coach/knowledge' },
    ],
  },
  {
    title: 'Business',
    links: [
      { label: 'Attendance', href: '/attendance' },
      { label: 'Finance & forecast', href: '/finance' },
      { label: 'Engagement', href: '/engagement' },
      { label: 'Reports', href: '/reports' },
      { label: 'Settings', href: '/settings' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'FAQ', href: '#resources' },
      { label: 'Help centre', href: '/help' },
      { label: 'Support', href: '/support' },
      { label: 'Subscription', href: '/subscription' },
      { label: 'Member login', href: '/member-login' },
    ],
  },
];

/** Footer — real routes and anchors only. No legal pages exist; none are linked. */
export default function Footer() {
  return (
    <footer className="border-t" style={{ borderColor: C.lineSoft, background: C.canvas }}>
      <Container>
        <div className="grid gap-12 py-14 lg:grid-cols-[1.3fr_2fr]">
          <div>
            <Wordmark />
            <p className="mt-5 max-w-sm text-[13px] leading-[1.7]" style={{ color: C.muted }}>
              The business management platform for personal trainers — client management, AI-powered
              training and diet plans, payments, analytics and engagement in one platform.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold" style={{ borderColor: C.lineSoft, color: C.muted }}>
                <ShieldCheck size={13} style={{ color: C.emerald }} aria-hidden /> Tenant isolation
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold" style={{ borderColor: C.lineSoft, color: C.muted }}>
                <Sparkles size={13} style={{ color: C.goldHi }} aria-hidden /> AI Training Layer
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold" style={{ borderColor: C.lineSoft, color: C.muted }}>
                <HeartHandshake size={13} style={{ color: C.blueHi }} aria-hidden /> Built for India
              </span>
            </div>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: C.faint }}>
                  {col.title}
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className="text-[13px] font-medium transition-opacity duration-150 hover:opacity-90"
                        style={{ color: C.body }}
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div
          className="flex flex-col items-center justify-between gap-3 border-t py-6 sm:flex-row"
          style={{ borderColor: C.lineSoft }}
        >
          <p className="text-[12px] font-medium" style={{ color: C.faint }}>
            © {new Date().getFullYear()} MY PT STUDIO. All rights reserved.
          </p>
          <p className="text-[12px] font-medium" style={{ color: C.faint }}>
            Made for the trainers who build India&apos;s strongest studios.
          </p>
        </div>
      </Container>
    </footer>
  );
}