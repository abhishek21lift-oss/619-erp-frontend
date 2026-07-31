'use client';

// The client workspace: twelve tabs instead of thirteen tiles.
//
// ── What this replaces ─────────────────────────────────────────────────────
//
// A grid of thirteen coloured tiles that all did the same thing — navigate
// away. Every one of them left the profile, so working on a client meant a
// loop of open profile → tap tile → read → back → tap tile. The grid also gave
// no hint of what was THERE: "Photos" and "Check-in" looked identical whether
// the client had two hundred photos or none.
//
// Tabs keep the trainer on the client. Each one says what it holds before you
// open it, and the ones with nothing in them say so, with the control that
// fills them.
//
// ── Nothing here duplicates a page ─────────────────────────────────────────
//
// Every destination that already exists as its own screen stays that screen.
// A tab shows what can be summarised and links into the full page for the
// rest. This is deliberately NOT a re-implementation of the workout log, the
// diet planner or the photo gallery — those exist, they work, and a second
// copy inside a tab would be two things to keep correct.
//
// ── Empty is a state, not an absence ───────────────────────────────────────
//
// Most of these tables are empty in a new studio. A tab that renders nothing
// teaches the trainer that the feature is broken; a tab that says "no
// check-ins recorded yet" and offers the button that records one teaches them
// what the system does. Every panel below has an explicit empty state and a
// way out of it.

import { useState } from 'react';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  LayoutGrid, Dumbbell, Salad, Ruler, ScrollText, ClipboardCheck, Camera,
  FileSignature, Wallet, StickyNote, Sparkles, FileBarChart, ChevronRight,
} from 'lucide-react';

const EASE = [0.16, 1, 0.3, 1] as const;

export type TabKey =
  | 'overview' | 'training' | 'nutrition' | 'measurements' | 'log' | 'checkins'
  | 'photos' | 'documents' | 'payments' | 'notes' | 'ai' | 'reports';

interface TabDef {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
  /** Shown on the tab when there is something to count. */
  count?: number;
}

/**
 * One link out of a tab, into the screen that already owns this job.
 */
export interface TabLink {
  label: string;
  href: string;
  hint?: string;
}

const TABS: TabDef[] = [
  { key: 'overview', label: 'Overview', icon: <LayoutGrid size={14} /> },
  { key: 'training', label: 'Training', icon: <Dumbbell size={14} /> },
  { key: 'log', label: 'Workout Log', icon: <ScrollText size={14} /> },
  { key: 'measurements', label: 'Measurements', icon: <Ruler size={14} /> },
  { key: 'nutrition', label: 'Nutrition', icon: <Salad size={14} /> },
  { key: 'checkins', label: 'Check-ins', icon: <ClipboardCheck size={14} /> },
  { key: 'photos', label: 'Photos', icon: <Camera size={14} /> },
  { key: 'ai', label: 'AI Coach', icon: <Sparkles size={14} /> },
  { key: 'payments', label: 'Payments', icon: <Wallet size={14} /> },
  { key: 'documents', label: 'Documents', icon: <FileSignature size={14} /> },
  { key: 'notes', label: 'Notes', icon: <StickyNote size={14} /> },
  { key: 'reports', label: 'Reports', icon: <FileBarChart size={14} /> },
];

export interface ClientTabsProps {
  active: TabKey;
  onChange: (key: TabKey) => void;
  /** Badge counts, only for tabs where a number means something. */
  counts?: Partial<Record<TabKey, number>>;
}

/**
 * The tab strip.
 *
 * Horizontally scrollable rather than wrapped: twelve tabs wrap to three rows
 * on a phone, and a three-row tab bar is a menu pretending to be a tab bar.
 * Scrolling keeps it one line and keeps the active tab in view.
 */
export function ClientTabs({ active, onChange, counts }: ClientTabsProps) {
  const reduce = useReducedMotion();
  return (
    <div className="relative mb-4">
      <div
        role="tablist"
        aria-label="Client sections"
        className="flex gap-1 overflow-x-auto rounded-[16px] p-1.5"
        style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', scrollbarWidth: 'none' }}
      >
        {TABS.map((t) => {
          const on = t.key === active;
          const n = counts?.[t.key];
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={on}
              onClick={() => onChange(t.key)}
              // 44px explicitly: globals.css sets a 14px root, so a rem-based
              // height lands at 87.5% and a "44px" tab measures 38.
              className="relative flex shrink-0 items-center gap-1.5 rounded-[12px] px-3 text-[12px] font-[720] transition-colors"
              style={{ height: 44, color: on ? 'var(--text-primary)' : 'var(--text-muted)' }}
            >
              {on && (
                <m.span
                  layoutId="client-tab-pill"
                  transition={reduce ? { duration: 0 } : { duration: 0.28, ease: EASE }}
                  className="absolute inset-0 rounded-[12px]"
                  style={{ background: 'var(--bg-card)', boxShadow: '0 1px 3px rgba(15,23,42,0.10)' }}
                />
              )}
              <span className="relative flex items-center gap-1.5 whitespace-nowrap">
                {t.icon}
                {t.label}
                {n != null && n > 0 && (
                  <span className="rounded-full px-1.5 py-px text-[9.5px] font-[800]"
                    style={{ background: 'var(--brand)', color: '#fff' }}>{n}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Wrapper that fades one panel out and the next in, without layout jump. */
export function TabPanel({ id, active, children }: { id: TabKey; active: TabKey; children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence mode="wait" initial={false}>
      {id === active && (
        <m.div
          key={id}
          role="tabpanel"
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0 }}
          transition={{ duration: 0.2, ease: EASE }}
        >
          {children}
        </m.div>
      )}
    </AnimatePresence>
  );
}

/**
 * A panel with nothing in it yet.
 *
 * Says what would be here, why it is not, and gives the control that fills it.
 * "No data" on its own reads as a broken screen; this reads as an instruction.
 */
export function EmptyPanel({
  icon, title, body, actions,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  actions?: TabLink[];
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[22px] bg-white px-6 py-12 text-center"
      style={{ border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      <div className="flex h-12 w-12 items-center justify-center rounded-[16px]"
        style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
        {icon}
      </div>
      <p className="text-[14px] font-[780]" style={{ color: 'var(--text-primary)' }}>{title}</p>
      <p className="max-w-[46ch] text-[12px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{body}</p>
      {actions && actions.length > 0 && (
        <div className="mt-1 flex flex-wrap justify-center gap-2">
          {actions.map((a, i) => (
            <a key={a.href} href={a.href}
              className="flex h-[44px] items-center gap-1.5 rounded-[12px] px-4 text-[12px] font-[750] transition-all hover:-translate-y-0.5"
              style={i === 0
                ? { background: 'var(--brand)', color: '#fff', boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }
                : { background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
              {a.label} <ChevronRight size={13} />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * A panel whose real home is another screen.
 *
 * Carries a short summary and sends you to the page that owns the job, rather
 * than re-implementing it here — two copies of the workout log is two things
 * to keep correct, and the second one always drifts.
 */
export function LinkPanel({
  icon, title, body, links,
}: {
  icon: React.ReactNode;
  title: string;
  body?: string;
  links: TabLink[];
}) {
  return (
    <div className="rounded-[22px] bg-white p-4 sm:p-5"
      style={{ border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      <div className="mb-3.5 flex items-center gap-2.5 pb-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
          style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>{icon}</div>
        <h3 className="text-[13.5px] font-[740]" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      </div>
      {body && <p className="mb-3 max-w-[62ch] text-[12px]" style={{ color: 'var(--text-muted)' }}>{body}</p>}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {links.map((l) => (
          <a key={l.href} href={l.href}
            className="flex min-h-[52px] items-center gap-3 rounded-[14px] px-3.5 py-2.5 transition-all hover:-translate-y-0.5"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
            <span className="min-w-0 flex-1">
              <span className="block text-[12.5px] font-[750]" style={{ color: 'var(--text-primary)' }}>{l.label}</span>
              {l.hint && <span className="mt-0.5 block text-[10.5px] font-[600]" style={{ color: 'var(--text-muted)' }}>{l.hint}</span>}
            </span>
            <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
          </a>
        ))}
      </div>
    </div>
  );
}

export { TABS };
