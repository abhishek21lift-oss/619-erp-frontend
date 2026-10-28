'use client';

import { ShieldCheck, Sparkles, HeartHandshake } from 'lucide-react';
import Link from 'next/link';
import { Container } from './primitives';
import { C } from './tokens';
import { Wordmark } from './Wordmark';

/**
 * Public navigation columns — every link points at a public route or anchor.
 *
 * The app routes these used to name (/ai-coach, /attendance, /finance/forecast,
 * /reports, /settings, /help, /support, /subscription, ...) are authenticated,
 * robots-disallowed and redirect a logged-out visitor to /login. Linking them
 * from the marketing pages sent crawlers at blocked URLs and sent prospects at
 * a sign-in wall. The only app links left are the two sign-in doors, which are
 * meant to be linked and are intentionally kept out of the index.
 */
const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Product',
    links: [
      { label: 'Overview', href: '/#product' },
      { label: 'AI Training Layer', href: '/#ai' },
      { label: 'All features', href: '/#features' },
      { label: 'Pricing', href: '/#pricing' },
      { label: 'Trust & security', href: '/#trust' },
    ],
  },
  {
    title: 'Platform',
    links: [
      { label: 'PT OS', href: '/pt-os' },
      { label: 'Why PT OS', href: '/pt-os#product' },
      { label: 'PT OS for India', href: '/pt-os#india' },
      { label: 'Switching', href: '/pt-os#switch' },
      { label: 'Questions', href: '/pt-os#questions' },
    ],
  },
  {
    title: 'Why us',
    links: [
      { label: 'For personal trainers', href: '/#for-trainers' },
      { label: 'For PT businesses', href: '/#for-pt-business' },
      { label: 'Workflow', href: '/#workflow' },
      { label: 'The gap we close', href: '/#the-gap' },
      { label: 'Built for India', href: '/#built-for' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'FAQ', href: '/#resources' },
      { label: 'Start free', href: '/start-free' },
      { label: 'Member login', href: '/member-login' },
      { label: 'Trainer login', href: '/login' },
    ],
  },
];

/** Footer — public routes and anchors only; the app is reached through sign-in. */
export default function Footer() {
  return (
    <footer className="border-t" style={{ borderColor: C.lineSoft, background: C.canvasAlt }}>
      <Container>
        <div className="grid gap-12 py-16 lg:grid-cols-[1.3fr_2fr]">
          <div>
            <Wordmark />
            <p className="mt-5 max-w-sm text-[12px] leading-[1.6]" style={{ color: C.muted }}>
              The business management platform for personal trainers — client management, AI-powered
              training and diet plans, payments, analytics and engagement in one platform.
            </p>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
              <span className="inline-flex items-center gap-1.5 text-[12px]" style={{ color: C.muted }}>
                <ShieldCheck size={14} style={{ color: C.emerald }} aria-hidden /> Tenant isolation
              </span>
              <span className="inline-flex items-center gap-1.5 text-[12px]" style={{ color: C.muted }}>
                <Sparkles size={14} style={{ color: C.goldHi }} aria-hidden /> AI Training Layer
              </span>
              <span className="inline-flex items-center gap-1.5 text-[12px]" style={{ color: C.muted }}>
                <HeartHandshake size={14} style={{ color: C.blueHi }} aria-hidden /> Built for India
              </span>
            </div>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <h3 className="text-[12px] font-[600]" style={{ color: C.ink }}>
                  {col.title}
                </h3>
                <ul className="mt-3 space-y-2">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className="text-[12px] transition-opacity duration-150 hover:opacity-60"
                        style={{ color: C.muted }}
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