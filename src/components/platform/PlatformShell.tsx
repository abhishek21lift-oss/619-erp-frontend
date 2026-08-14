'use client';

// The Command Center's application shell.
//
// ── Why this exists at all ──────────────────────────────────────────────────
//
// It did not, and that was the bug. (platform)/layout.tsx rendered
// `<div id="main-content">{children}</div>` — no container, no gutters, no
// navigation — so the page had to declare its own, and did so like this:
//
//     mx-auto w-full max-w-5xl pt-6 pb-[…] sm:pt-8 lg:pb-10
//
// Vertical padding only. No `px-*` anywhere. Below max-w-5xl (1024px) every
// card, table and chart sat flush against both viewport edges, which is most
// of what "it doesn't feel like a control center" was describing. On a phone
// the content was literally touching the glass.
//
// The fix is not margins on cards. It is that the shell owns the container, so
// every console page gets the same gutters without asking, and a page added
// tomorrow cannot get them wrong by omission.
//
// ── Navigation lives here, and is URL-driven ────────────────────────────────
//
// The tab used to be `useState` inside page.tsx, synced FROM the query string
// but never TO it — so clicking a tab changed the screen and not the address,
// and no console view was linkable. A sidebar in the layout cannot share that
// state anyway (different component trees), so making `?tab=` the single
// source of truth solves both problems with one change: the shell renders
// links, the page reads the query, and the back button works.
//
// ── The two navigations are different shapes on purpose ─────────────────────
//
// Desktop gets a persistent sidebar: eight modules, always visible, so the
// operator's mental map of the platform is on screen rather than recalled.
// Mobile gets a bottom bar of the five most-used modules plus More, because a
// 256px sidebar on a 390px screen is either a drawer nobody opens or a
// squeezed row of unreadable labels. Every module stays reachable in both.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Activity, Bot, Building2, CreditCard, HeartPulse, LayoutDashboard,
  Menu, ShieldAlert, ToggleRight, Users2, X,
} from 'lucide-react';
import { MODULES, TAB_LABELS, moduleForTab, normalizeTab } from '@/app/(platform)/platform/_shared/types';
import type { ModuleId, Tab } from '@/app/(platform)/platform/_shared/types';

const MODULE_ICON: Record<ModuleId, React.ReactNode> = {
  overview: <LayoutDashboard size={17} />,
  studios: <Building2 size={17} />,
  users: <Users2 size={17} />,
  revenue: <CreditCard size={17} />,
  ai: <Bot size={17} />,
  operations: <HeartPulse size={17} />,
  security: <ShieldAlert size={17} />,
  control: <ToggleRight size={17} />,
};

/**
 * The five modules the bottom bar shows directly; the rest live under More.
 *
 * Chosen by how often an operator opens them, not by the order of MODULES —
 * five is what fits a 390px screen with a readable label under each icon, and
 * a sixth turns them into initials.
 */
const MOBILE_PRIMARY: ModuleId[] = ['overview', 'studios', 'users', 'revenue', 'operations'];

/** `/platform?tab=…`, the one place the console's URLs are built. */
function hrefFor(tab: Tab): string {
  return tab === 'overview' ? '/platform' : `/platform?tab=${tab}`;
}

/**
 * The content container.
 *
 * Gutters step 16 → 24 → 32px and then the width caps, so on a wide monitor
 * the console is a centred column rather than a line of text a metre wide.
 * 1440 rather than something narrower because this is a data-dense control
 * surface — tables want the room, and max-w-5xl (1024) was cramping them on
 * exactly the screens an operator uses.
 */
// Gutters in PIXELS, not Tailwind's rem scale.
//
// This app sets a 14px root font size, so `px-4 sm:px-6 lg:px-8` measured
// 14/21/28px rather than the intended 16/24/32 — every value quietly 12.5%
// short, which is exactly the kind of drift that makes a layout feel slightly
// wrong without anything looking obviously broken. Explicit px is immune to
// the root size, and these three numbers are the layout contract.
const CONTAINER = 'mx-auto w-full max-w-[1440px] px-[16px] sm:px-[24px] lg:px-[32px]';

/** Sidebar width. In px for the same reason, and used by BOTH the aside and
 *  the content offset so they cannot drift apart. */
const SIDEBAR_W = 256;

function SidebarLink({ id, active }: { id: ModuleId; active: boolean }) {
  const mod = MODULES.find((m) => m.id === id)!;
  return (
    <Link
      href={hrefFor(mod.tabs[0])}
      aria-current={active ? 'page' : undefined}
      className="flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13.5px] font-[650] transition-colors"
      style={{
        background: active ? 'var(--brand-soft, rgba(0,103,224,0.10))' : 'transparent',
        color: active ? '#0067E0' : 'var(--text-muted)',
        // The active row carries a left rule as well as a fill: on a dark
        // theme the fill alone is nearly invisible, and "which section am I in"
        // is the one question a sidebar exists to answer.
        boxShadow: active ? 'inset 2px 0 0 0 #0067E0' : 'none',
      }}
    >
      {MODULE_ICON[id]}
      <span>{mod.label}</span>
    </Link>
  );
}

export default function PlatformShell({ children }: { children: React.ReactNode }) {
  const sp = useSearchParams();
  const pathname = usePathname();
  const tab = normalizeTab(sp.get('tab'));
  const active = moduleForTab(tab);
  const [moreOpen, setMoreOpen] = useState(false);

  // Close the sheet on navigation. Without this it stays open over the page it
  // just navigated to, which reads as the tap not having worked.
  useEffect(() => { setMoreOpen(false); }, [pathname, tab]);

  const overflow = MODULES.filter((m) => !MOBILE_PRIMARY.includes(m.id));

  return (
    <div className="min-h-[100dvh]" style={{ background: 'var(--bg-canvas)' }}>
      {/* The offset is a media-query-scoped custom property rather than a
          Tailwind class, because the value comes from SIDEBAR_W and Tailwind
          cannot read a JS constant. One declaration, both breakpoints. */}
      <style>{`@media (min-width: 1024px) { .cc-content { --cc-sidebar-offset: ${SIDEBAR_W}px; } }`}</style>
      {/* ── Desktop sidebar ────────────────────────────────────────────────
          Fixed, so it does not scroll away from a long table, and the content
          column is offset by exactly its width — never overlapped. */}
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden flex-col lg:flex"
        // Dragging inside a fixed overlay must not pull-to-refresh the page
        // underneath it. pull-refresh-optout.test.ts holds this for every
        // floating surface in the app.
        data-no-pull-refresh
        style={{
          width: SIDEBAR_W,
          background: 'var(--bg-elevated)',
          borderRight: '1px solid var(--border)',
        }}
      >
        <div
          className="flex items-center gap-2.5 px-5"
          style={{ height: 64, borderBottom: '1px solid var(--border)' }}
        >
          <div
            className="flex items-center justify-center rounded-[9px]"
            style={{ width: 30, height: 30, background: '#0067E0', color: '#fff' }}
          >
            <LayoutDashboard size={16} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[13.5px] font-[750]" style={{ color: 'var(--text-primary)' }}>
              Command Center
            </div>
            <div className="truncate text-[10.5px] font-[600]" style={{ color: 'var(--text-muted)' }}>
              MY PT STUDIO
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3" aria-label="Command Center sections">
          <div className="space-y-0.5">
            {MODULES.map((m) => <SidebarLink key={m.id} id={m.id} active={m.id === active} />)}
          </div>
        </nav>
      </aside>

      {/* ── Content column ─────────────────────────────────────────────────
          lg:pl-64 matches the sidebar width exactly. This is the only place
          the two are related, so they cannot drift apart. */}
      {/* The offset is the sidebar's width, read from the same constant, so a
          change to one cannot leave the content overlapped by the other. */}
      <div style={{ paddingLeft: 'var(--cc-sidebar-offset, 0px)' }} className="cc-content">
        {/* Top bar. Sticky rather than fixed: it participates in the layout, so
            nothing needs a magic top offset to clear it. Its inner row uses the
            same CONTAINER as the page below, which is what makes the logo, the
            page heading and the first card share one left edge. */}
        <header
          className="sticky top-0 z-20"
          style={{
            background: 'var(--bg-elevated)',
            borderBottom: '1px solid var(--border)',
            // The notch. Padding rather than margin so the bar's background
            // extends INTO the inset instead of leaving a transparent strip.
            paddingTop: 'env(safe-area-inset-top, 0px)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div className={CONTAINER}>
            <div className="flex items-center justify-between gap-3" style={{ height: 60 }}>
              <div className="flex min-w-0 items-center gap-2.5">
                {/* The wordmark is the sidebar's job on desktop; showing it in
                    both places wastes the row's only wide slot. */}
                <div className="lg:hidden">
                  <div className="text-[14px] font-[750]" style={{ color: 'var(--text-primary)' }}>
                    Command Center
                  </div>
                  <div className="text-[10.5px] font-[600]" style={{ color: 'var(--text-muted)' }}>
                    {MODULES.find((m) => m.id === active)?.label}
                  </div>
                </div>
                <div className="hidden min-w-0 lg:block">
                  <div className="truncate text-[14px] font-[750]" style={{ color: 'var(--text-primary)' }}>
                    {MODULES.find((m) => m.id === active)?.label}
                  </div>
                  <div className="truncate text-[10.5px] font-[600]" style={{ color: 'var(--text-muted)' }}>
                    {TAB_LABELS[tab]}
                  </div>
                </div>
              </div>

              {/* Reserved for the page's own actions. The command bar lives in
                  page.tsx because it needs the page's navigation callback; this
                  slot exists so it has somewhere aligned to sit. */}
              <div id="platform-topbar-actions" className="flex shrink-0 items-center gap-2" />
            </div>
          </div>
        </header>

        {/* The page. Same container as the top bar, so every section on every
            console page shares one left and right edge.

            Bottom padding clears the mobile bar and the home indicator, and
            drops to a normal gap at lg where that bar is hidden. The old value
            cleared the STUDIO app's bottom nav, which this portal does not
            render at all — left over from when /platform lived in (chrome). */}
        <main
          id="main-content"
          className={`${CONTAINER} pt-5 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:pt-6 lg:pb-12`}
        >
          {children}
        </main>
      </div>

      {/* ── Mobile bottom navigation ───────────────────────────────────────
          Five modules plus More. Fixed, thumb-reachable, and every target is
          at least 44px tall before the safe-area padding is added. */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 lg:hidden"
        aria-label="Command Center sections"
        data-no-pull-refresh
        style={{
          background: 'var(--bg-elevated)',
          borderTop: '1px solid var(--border)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="flex items-stretch">
          {MOBILE_PRIMARY.map((id) => {
            const mod = MODULES.find((m) => m.id === id)!;
            const on = id === active;
            return (
              <Link
                key={id}
                href={hrefFor(mod.tabs[0])}
                aria-current={on ? 'page' : undefined}
                className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2"
                style={{ minHeight: 52, color: on ? '#0067E0' : 'var(--text-muted)' }}
              >
                {MODULE_ICON[id]}
                <span className="text-[10px] font-[700]">{mod.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            aria-expanded={moreOpen}
            aria-haspopup="dialog"
            className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2"
            style={{
              minHeight: 52,
              // More is highlighted when the section you are in lives inside
              // it, so the bar never shows nothing selected.
              color: overflow.some((m) => m.id === active) ? '#0067E0' : 'var(--text-muted)',
            }}
          >
            <Menu size={17} />
            <span className="text-[10px] font-[700]">More</span>
          </button>
        </div>
      </nav>

      {/* The More sheet. A sheet rather than a full-screen page so the context
          behind it stays visible — it is a menu, not a destination. */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="More sections"
          data-no-pull-refresh
        >
          <button
            aria-label="Close"
            onClick={() => setMoreOpen(false)}
            className="absolute inset-0 h-full w-full"
            style={{ background: 'rgba(15,23,42,0.45)' }}
          />
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-[18px] p-4"
            style={{
              background: 'var(--bg-elevated)',
              borderTop: '1px solid var(--border)',
              paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
            }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[13px] font-[750]" style={{ color: 'var(--text-primary)' }}>
                More sections
              </span>
              <button
                onClick={() => setMoreOpen(false)}
                aria-label="Close"
                className="flex items-center justify-center rounded-[9px]"
                style={{ width: 32, height: 32, background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
              >
                <X size={15} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {overflow.map((m) => (
                <Link
                  key={m.id}
                  href={hrefFor(m.tabs[0])}
                  className="flex items-center gap-2.5 rounded-[11px] px-3 py-3 text-[13px] font-[650]"
                  style={{
                    background: m.id === active ? 'rgba(0,103,224,0.10)' : 'var(--bg-subtle)',
                    border: '1px solid var(--border)',
                    color: m.id === active ? '#0067E0' : 'var(--text-primary)',
                    minHeight: 48,
                  }}
                >
                  {MODULE_ICON[m.id]}
                  <span>{m.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Exported for tests: the container's classes are the layout contract. */
export const PLATFORM_CONTAINER = CONTAINER;
export { MOBILE_PRIMARY };
