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

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
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
 * Scrolling keeps it one line.
 *
 * ── Why the edges fade ─────────────────────────────────────────────────────
 *
 * Twelve tabs do not fit a phone, so the strip was cutting the last visible
 * label in half against a hard container edge — "Mea…" — which reads as a
 * rendering fault rather than an invitation to scroll. The strip now fades out
 * at whichever end has more content, which is the one honest way to say "there
 * is more this way" without spending a row on arrows.
 *
 * It is a mask rather than a gradient overlay on purpose: this sits on a page
 * with a gradient background, and an overlay would have to know the exact
 * colour behind it to disappear into. A mask dissolves the strip itself, so it
 * is correct on any background and in either theme.
 *
 * The fades are driven by measured scroll position, not shown unconditionally
 * — a permanent fade over a strip that is not scrollable is a lie about the
 * content, and on a desktop where all twelve fit it would dim two real tabs.
 */
export function ClientTabs({ active, onChange, counts }: ClientTabsProps) {
  const reduce = useReducedMotion();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const measure = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    // 1px of slack: fractional layout widths mean scrollLeft rarely lands on
    // exactly 0 or exactly max, and a fade that never quite switches off is
    // worse than no fade.
    setEdges({ left: el.scrollLeft > 1, right: el.scrollLeft < max - 1 });
  }, []);

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    // Children too: a count badge appearing changes scrollWidth without
    // changing the scroller's own box.
    for (const child of Array.from(el.children)) ro.observe(child);
    return () => ro.disconnect();
  }, [measure]);

  // Keep the selected tab visible. The active tab can be set from outside this
  // component — a deep link straight to ?tab=reports, or the panel below
  // switching tabs — and landing on a strip scrolled to the far left with the
  // selected tab off-screen looks like nothing happened.
  useEffect(() => {
    const el = scrollerRef.current;
    const tab = el?.querySelector<HTMLElement>(`[data-tab="${active}"]`);
    if (!el || !tab) return;
    const pad = 24; // don't park it flush against a faded edge
    const left = tab.offsetLeft - pad;
    const right = tab.offsetLeft + tab.offsetWidth + pad;
    if (left < el.scrollLeft) {
      el.scrollTo({ left, behavior: reduce ? 'auto' : 'smooth' });
    } else if (right > el.scrollLeft + el.clientWidth) {
      el.scrollTo({ left: right - el.clientWidth, behavior: reduce ? 'auto' : 'smooth' });
    }
  }, [active, reduce]);

  // Fade only the end that has more behind it. Two stops per side so the
  // transition is a soft ramp rather than a visible band.
  const mask = (() => {
    if (!edges.left && !edges.right) return undefined;
    const from = edges.left ? 'transparent 0, #000 28px' : '#000 0';
    const to = edges.right ? '#000 calc(100% - 28px), transparent 100%' : '#000 100%';
    return `linear-gradient(to right, ${from}, ${to})`;
  })();

  // Which edges are faded, as an attribute rather than only as a mask string.
  // The mask is the thing that renders; this is the thing that can be asserted
  // on — jsdom's CSS parser drops a gradient containing calc(), so reading
  // style.maskImage back tests jsdom rather than the component.
  const fade = edges.left && edges.right ? 'both' : edges.left ? 'left' : edges.right ? 'right' : 'none';

  return (
    <div className="relative mb-4">
      <div
        ref={scrollerRef}
        role="tablist"
        aria-label="Client sections"
        data-fade={fade}
        onScroll={measure}
        className="flex gap-1 overflow-x-auto rounded-[16px] p-1.5 [&::-webkit-scrollbar]:hidden"
        style={{
          background: 'var(--bg-subtle)',
          border: '1px solid var(--border)',
          scrollbarWidth: 'none',
          WebkitMaskImage: mask,
          maskImage: mask,
        }}
      >
        {TABS.map((t) => {
          const on = t.key === active;
          const n = counts?.[t.key];
          return (
            <button
              key={t.key}
              data-tab={t.key}
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
                  // Opaque white, not --bg-card's 80% — the pill sits on a grey
                  // trough, and a translucent one picks the trough up and reads
                  // as a disabled control rather than the selected one. The
                  // brand-tinted ring and lift are what make it read as raised;
                  // the shadow alone was too faint against --bg-subtle to
                  // separate them at all.
                  style={{
                    background: 'var(--bg-white)',
                    boxShadow: '0 1px 1px rgba(15,23,42,0.04), 0 4px 12px -2px var(--brand-glow-2)',
                    border: '1px solid var(--brand-soft)',
                  }}
                />
              )}
              <span
                className="relative flex items-center gap-1.5 whitespace-nowrap"
                // The icon carries the selection as well as the pill does, and
                // it reads before the label at a glance.
                style={on ? { color: 'var(--brand)' } : undefined}
              >
                {t.icon}
                <span style={on ? { color: 'var(--text-primary)' } : undefined}>{t.label}</span>
                {n != null && n > 0 && (
                  <span className="rounded-full px-1.5 py-px text-[9.5px] font-[800]"
                    style={{ background: 'var(--brand)', color: 'var(--text-inverse)' }}>{n}</span>
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
                ? { background: 'var(--brand)', color: '#fff', boxShadow: '0 4px 14px rgba(0,103,224,0.35)' }
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
