'use client';

// The Command Center application shell. Shell geometry is part of the UI contract.
//
// Styled like an Apple system app: each module owns a gradient squircle (the
// way Settings tints every row), the active module expands to show its
// sections, and the top bar carries search — the only way to open the command
// bar on a phone. The module colours come from ccTheme; state colours never
// appear here.
//
// Two defects fixed with the redesign:
//   - Studio 360 (/platform/studios/:id) has no ?tab=, so the shell resolved it
//     to Overview: the sidebar highlighted Overview and the bar read
//     "Overview • Overview" while an operator was looking at a studio.
//   - A CSS rule hid the page's first element to suppress its old header —
//     which also hid the only on-screen search button. The rule is gone and
//     so is the header it was hiding.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Activity, Bot, Building2, CreditCard, HeartPulse, LayoutDashboard, Menu, Search, ShieldAlert, ToggleRight, Users2, X } from 'lucide-react';
import { MODULES, TAB_LABELS, moduleForTab, normalizeTab } from '@/app/(platform)/platform/_shared/types';
import type { ModuleId, Tab } from '@/app/(platform)/platform/_shared/types';
import { OPEN_COMMAND_BAR } from '@/app/(platform)/platform/_shared/CommandBar';
import { useDialogA11y } from '@/hooks/useDialogA11y';
import { ccGradient, ccModuleTone, ccTones, ccWash } from './ccTheme';
import type { CcToneName } from './ccTheme';

export const MOBILE_PRIMARY: ModuleId[] = ['overview', 'studios', 'users', 'revenue', 'operations'];
export const PLATFORM_CONTAINER = 'mx-auto w-full max-w-[1440px] px-[16px] sm:px-[24px] lg:px-[32px]';
export const CONTAINER = PLATFORM_CONTAINER;
export const SIDEBAR_W = 264;

const MODULE_ICON: Record<ModuleId, (size: number) => React.ReactNode> = {
  overview: (s) => <LayoutDashboard size={s} />, studios: (s) => <Building2 size={s} />, users: (s) => <Users2 size={s} />, revenue: (s) => <CreditCard size={s} />,
  ai: (s) => <Bot size={s} />, operations: (s) => <HeartPulse size={s} />, security: (s) => <ShieldAlert size={s} />, control: (s) => <ToggleRight size={s} />,
};
const toneOf = (id: ModuleId) => ccTones[(ccModuleTone[id] ?? 'blue') as CcToneName];

function hrefFor(tab: Tab): string { return tab === 'overview' ? '/platform' : `/platform?tab=${tab}`; }

function Squircle({ id, size = 28 }: { id: ModuleId; size?: number }) {
  const t = toneOf(id);
  return (
    <span className="flex shrink-0 items-center justify-center text-white" style={{ width: size, height: size, borderRadius: size * 0.3, background: ccGradient(t), boxShadow: `0 4px 10px -4px rgba(${t.rgb},0.7), inset 0 1px 0 rgba(255,255,255,0.3)` }}>
      {MODULE_ICON[id](Math.round(size * 0.55))}
    </span>
  );
}

function SidebarLink({ id, active, tab }: { id: ModuleId; active: boolean; tab: Tab | null }) {
  const mod = MODULES.find((m) => m.id === id)!;
  const t = toneOf(id);
  return (
    <div>
      <Link href={hrefFor(mod.tabs[0])} aria-current={active && (tab === null || tab === mod.tabs[0]) ? 'page' : undefined}
        className="flex items-center gap-3 rounded-[12px] px-2.5 py-2 text-[13.5px] font-[700] transition-colors"
        style={{ background: active ? ccWash(t, 0.12) : 'transparent', color: active ? t.ink : 'var(--text-secondary)' }}>
        <Squircle id={id} />
        <span>{mod.label}</span>
      </Link>
      {active && mod.tabs.length > 1 && (
        <div className="ml-[22px] mt-1 space-y-0.5 border-l pl-3" style={{ borderColor: ccWash(t, 0.35) }}>
          {mod.tabs.map((sub) => {
            const on = sub === tab;
            return (
              <Link key={sub} href={hrefFor(sub)} aria-current={on ? 'page' : undefined}
                className="block rounded-[9px] px-2.5 py-1.5 text-[12.5px] font-[650] transition-colors"
                style={{ color: on ? t.ink : 'var(--text-muted)', background: on ? ccWash(t, 0.08) : 'transparent' }}>
                {TAB_LABELS[sub]}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function PlatformShell({ children }: { children: React.ReactNode }) {
  const sp = useSearchParams(); const pathname = usePathname();
  const onStudio = pathname.startsWith('/platform/studios/');
  const tab: Tab | null = onStudio ? null : normalizeTab(sp.get('tab'));
  const active: ModuleId = onStudio ? 'studios' : moduleForTab(tab as Tab);
  const [moreOpen, setMoreOpen] = useState(false); const moreRef = useDialogA11y({ open: moreOpen, onClose: () => setMoreOpen(false) });
  useEffect(() => { setMoreOpen(false); }, [pathname, tab]);
  const overflow = MODULES.filter((m) => !MOBILE_PRIMARY.includes(m.id)); const activeModule = MODULES.find((m) => m.id === active);
  const activeLabel = activeModule?.label ?? 'Overview';
  const activeTabLabel = onStudio ? 'Studio 360' : TAB_LABELS[tab as Tab] ?? activeLabel;
  const t = toneOf(active);
  const openSearch = () => window.dispatchEvent(new Event(OPEN_COMMAND_BAR));

  return <div className="min-h-[100dvh]" style={{ background: 'var(--bg-canvas)' }}>
    <style>{`@media (min-width: 1024px) { .cc-content { --cc-sidebar-offset: ${SIDEBAR_W}px; } }`}</style>
    <aside className="fixed inset-y-0 left-0 z-30 hidden flex-col lg:flex" data-no-pull-refresh style={{ width: SIDEBAR_W, background: 'var(--bg-elevated)', borderRight: '1px solid var(--border)' }}>
      <div className="flex items-center gap-3 px-5" style={{ height: 68, borderBottom: '1px solid var(--border)' }}>
        <Squircle id="overview" size={34} />
        <div className="min-w-0"><div className="truncate text-[14px] font-[800] tracking-[-0.01em]" style={{ color: 'var(--text-primary)' }}>Command Center</div><div className="truncate text-[10.5px] font-[650] uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>My PT Studio</div></div>
      </div>
      <nav className="flex-1 overflow-y-auto p-3" aria-label="Command Center sections"><div className="space-y-1">{MODULES.map((m) => <SidebarLink key={m.id} id={m.id} active={m.id === active} tab={tab} />)}</div></nav>
      <div className="p-3" style={{ borderTop: '1px solid var(--border)' }}>
        <button type="button" onClick={openSearch} className="flex w-full items-center gap-2 rounded-[12px] px-3 py-2.5 text-[12.5px] font-[650]" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
          <Search size={14} /><span className="flex-1 text-left">Search</span><kbd className="rounded-[6px] px-1.5 py-0.5 text-[10px] font-[750]" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>⌘K</kbd>
        </button>
      </div>
    </aside>
    <div style={{ paddingLeft: 'var(--cc-sidebar-offset, 0px)' }} className="cc-content">
      <header className="sticky top-0 z-20" style={{ background: 'color-mix(in srgb, var(--bg-elevated) 82%, transparent)', borderBottom: '1px solid var(--border)', paddingTop: 'env(safe-area-inset-top, 0px)', backdropFilter: 'blur(20px) saturate(170%)', WebkitBackdropFilter: 'blur(20px) saturate(170%)' }}>
        <div className={CONTAINER}><div className="relative flex items-center justify-between gap-3" style={{ minHeight: 60 }}>
          <div className="relative flex min-w-0 items-center gap-3">
            <Squircle id={active} size={36} />
            <div className="min-w-0">
              <div className="truncate text-[15px] font-[800] tracking-[-0.02em] sm:text-[16px]" style={{ color: 'var(--text-primary)' }}>{activeLabel}</div>
              {activeTabLabel !== activeLabel && <div className="truncate text-[11px] font-[650]" style={{ color: t.ink }}>{activeTabLabel}</div>}
            </div>
          </div>
          <div className="relative flex shrink-0 items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-[800] uppercase tracking-[0.08em] sm:inline-flex" style={{ color: 'var(--text-muted)', background: 'var(--bg-subtle)' }}><Activity size={11} />Platform</span>
            <button type="button" onClick={openSearch} aria-label="Search the platform" className="flex items-center gap-2 rounded-full px-3 py-2 text-[12px] font-[650] lg:hidden" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              <Search size={14} /><span className="hidden sm:inline">Search</span>
            </button>
          </div>
        </div></div>
      </header>
      <main id="main-content" className={`${CONTAINER} pt-5 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:pt-6 lg:pb-12`}>{children}</main>
    </div>
    <nav className="fixed inset-x-0 bottom-0 z-30 lg:hidden" aria-label="Command Center sections" data-no-pull-refresh style={{ background: 'color-mix(in srgb, var(--bg-elevated) 88%, transparent)', borderTop: '1px solid var(--border)', paddingBottom: 'env(safe-area-inset-bottom, 0px)', backdropFilter: 'blur(20px) saturate(170%)', WebkitBackdropFilter: 'blur(20px) saturate(170%)' }}><div className="flex items-stretch">{MOBILE_PRIMARY.map((id) => { const mod = MODULES.find((m) => m.id === id)!; const on = id === active; const mt = toneOf(id); return <Link key={id} href={hrefFor(mod.tabs[0])} aria-current={on ? 'page' : undefined} className="flex flex-1 flex-col items-center justify-center gap-1 py-2" style={{ minHeight: 56, color: on ? mt.ink : 'var(--text-muted)' }}>{on ? <Squircle id={id} size={26} /> : MODULE_ICON[id](19)}<span className="text-[10px] font-[750]">{mod.label}</span></Link>; })}<button onClick={() => setMoreOpen(true)} aria-expanded={moreOpen} aria-haspopup="dialog" className="flex flex-1 flex-col items-center justify-center gap-1 py-2" style={{ minHeight: 56, color: overflow.some((m) => m.id === active) ? t.ink : 'var(--text-muted)' }}><Menu size={19} /><span className="text-[10px] font-[750]">More</span></button></div></nav>
    {moreOpen && <div ref={moreRef} className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="More sections" data-no-pull-refresh><button aria-label="Close" onClick={() => setMoreOpen(false)} className="absolute inset-0 h-full w-full" style={{ background: 'rgba(15,23,42,0.45)' }} /><div className="absolute inset-x-0 bottom-0 rounded-t-[22px] p-4" style={{ background: 'var(--bg-elevated)', borderTop: '1px solid var(--border)', paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}><div className="mb-3 flex items-center justify-between"><span className="text-[14px] font-[800]" style={{ color: 'var(--text-primary)' }}>More sections</span><button onClick={() => setMoreOpen(false)} aria-label="Close" className="flex items-center justify-center rounded-full" style={{ width: 32, height: 32, background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}><X size={15} /></button></div><div className="grid grid-cols-2 gap-2">{overflow.map((m) => <Link key={m.id} href={hrefFor(m.tabs[0])} className="flex items-center gap-2.5 rounded-[14px] px-3 py-3 text-[13px] font-[700]" style={{ background: m.id === active ? ccWash(toneOf(m.id), 0.12) : 'var(--bg-subtle)', color: 'var(--text-primary)', minHeight: 52 }}><Squircle id={m.id} size={28} /><span>{m.label}</span></Link>)}</div></div></div>}
  </div>;
}
