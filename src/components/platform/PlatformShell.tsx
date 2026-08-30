'use client';

// The Command Center application shell. Navigation, URL state, mobile navigation and the modal More sheet stay unchanged; the shell owns the premium platform topbar so every section gets the same operator chrome.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Activity, Bot, Building2, CreditCard, HeartPulse, LayoutDashboard,
  Menu, ShieldAlert, ToggleRight, Users2, X,
} from 'lucide-react';
import { MODULES, TAB_LABELS, moduleForTab, normalizeTab } from '@/app/(platform)/platform/_shared/types';
import type { ModuleId, Tab } from '@/app/(platform)/platform/_shared/types';
import { useDialogA11y } from '@/hooks/useDialogA11y';

export const MOBILE_PRIMARY: ModuleId[] = ['overview', 'studios', 'users', 'revenue', 'operations'];
export const CONTAINER = 'mx-auto w-full max-w-[1440px] px-[16px] sm:px-[24px] lg:px-[32px]';
export const SIDEBAR_W = 256;

const MODULE_ICON: Record<ModuleId, React.ReactNode> = {
  overview: <LayoutDashboard size={17} />, studios: <Building2 size={17} />, users: <Users2 size={17} />, revenue: <CreditCard size={17} />,
  ai: <Bot size={17} />, operations: <HeartPulse size={17} />, security: <ShieldAlert size={17} />, control: <ToggleRight size={17} />,
};
function hrefFor(tab: Tab): string { return tab === 'overview' ? '/platform' : `/platform?tab=${tab}`; }
function SidebarLink({ id, active }: { id: ModuleId; active: boolean }) {
  const mod = MODULES.find((m) => m.id === id)!;
  return <Link href={hrefFor(mod.tabs[0])} aria-current={active ? 'page' : undefined} className="flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13.5px] font-[650] transition-colors" style={{ background: active ? 'var(--brand-soft, rgba(0,103,224,0.10))' : 'transparent', color: active ? '#0067E0' : 'var(--text-muted)', boxShadow: active ? 'inset 2px 0 0 0 #0067E0' : 'none' }}>{MODULE_ICON[id]}<span>{mod.label}</span></Link>;
}
export default function PlatformShell({ children }: { children: React.ReactNode }) {
  const sp = useSearchParams(); const pathname = usePathname(); const tab = normalizeTab(sp.get('tab')); const active = moduleForTab(tab);
  const [moreOpen, setMoreOpen] = useState(false); const moreRef = useDialogA11y({ open: moreOpen, onClose: () => setMoreOpen(false) });
  useEffect(() => { setMoreOpen(false); }, [pathname, tab]);
  const overflow = MODULES.filter((m) => !MOBILE_PRIMARY.includes(m.id)); const activeModule = MODULES.find((m) => m.id === active);
  const activeLabel = activeModule?.label ?? 'Overview'; const activeTabLabel = TAB_LABELS[tab] ?? activeLabel;
  return <div className="min-h-[100dvh]" style={{ background: 'var(--bg-canvas)' }}>
    <style>{`@media (min-width: 1024px) { .cc-content { --cc-sidebar-offset: ${SIDEBAR_W}px; } }`}</style>
    <aside className="fixed inset-y-0 left-0 z-30 hidden flex-col lg:flex" data-no-pull-refresh style={{ width: SIDEBAR_W, background: 'var(--bg-elevated)', borderRight: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2.5 px-5" style={{ height: 64, borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center justify-center rounded-[9px]" style={{ width: 30, height: 30, background: '#0067E0', color: '#fff' }}><LayoutDashboard size={16} /></div>
        <div className="min-w-0"><div className="truncate text-[13.5px] font-[750]" style={{ color: 'var(--text-primary)' }}>Command Center</div><div className="truncate text-[10.5px] font-[600]" style={{ color: 'var(--text-muted)' }}>MY PT STUDIO</div></div>
      </div>
      <nav className="flex-1 overflow-y-auto p-3" aria-label="Command Center sections"><div className="space-y-0.5">{MODULES.map((m) => <SidebarLink key={m.id} id={m.id} active={m.id === active} />)}</div></nav>
    </aside>
    <div style={{ paddingLeft: 'var(--cc-sidebar-offset, 0px)' }} className="cc-content">
      <header className="sticky top-0 z-20" style={{ background: 'linear-gradient(180deg, color-mix(in srgb, var(--bg-elevated) 94%, #0067E0 6%) 0%, color-mix(in srgb, var(--bg-elevated) 98%, white 2%) 100%)', borderBottom: '1px solid var(--border)', paddingTop: 'env(safe-area-inset-top, 0px)', backdropFilter: 'blur(18px) saturate(150%)', boxShadow: '0 8px 28px rgba(15, 23, 42, 0.06), inset 0 1px 0 rgba(255,255,255,0.55)' }}>
        <div className={CONTAINER}><div className="relative flex items-center justify-between gap-3" style={{ minHeight: 68 }}>
          <div aria-hidden className="pointer-events-none absolute -left-8 -top-12 h-28 w-28 rounded-full" style={{ background: 'radial-gradient(circle, #0067E0 0%, transparent 70%)', opacity: 0.10, filter: 'blur(22px)' }} />
          <div className="relative flex min-w-0 items-center gap-2.5 sm:gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[13px] sm:h-11 sm:w-11 sm:rounded-[14px]" style={{ background: 'linear-gradient(145deg, #7FB4FF 0%, #0067E0 48%, #0053B8 100%)', color: '#fff', boxShadow: '0 7px 18px rgba(0,103,224,0.28), inset 0 1px 0 rgba(255,255,255,0.35)' }}><span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.28), transparent 58%)' }} /><LayoutDashboard size={19} className="relative sm:h-5 sm:w-5" /></div>
            <div className="min-w-0"><div className="flex min-w-0 items-center gap-2"><span className="truncate text-[15px] font-[850] tracking-[-0.02em] sm:text-[17px]" style={{ backgroundImage: 'linear-gradient(90deg, var(--text-primary) 0%, color-mix(in srgb, var(--brand) 68%, var(--text-primary)) 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>Command Center</span><span className="hidden items-center gap-1.5 rounded-full px-2 py-1 text-[9px] font-[800] uppercase tracking-[0.08em] sm:inline-flex" style={{ color: '#059669', background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.18)' }}><span className="relative flex h-1.5 w-1.5"><span className="absolute h-full w-full animate-ping rounded-full bg-emerald-500 opacity-50" /><span className="relative h-1.5 w-1.5 rounded-full bg-emerald-500" /></span>Live</span></div><div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[10.5px] font-[650] sm:text-[11px]" style={{ color: 'var(--text-muted)' }}><span className="truncate">{activeLabel}</span><span aria-hidden>•</span><span className="truncate">{activeTabLabel}</span></div></div>
          </div>
          <div className="relative flex shrink-0 items-center gap-2"><div className="hidden items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-[750] md:flex" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}><Activity size={12} /><span>Platform</span></div><div className="flex items-center rounded-[11px] px-2.5 py-2 text-[10px] font-[750] sm:px-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)', boxShadow: '0 3px 10px rgba(15,23,42,0.05)' }} aria-label="Current section"><span className="hidden sm:inline">{activeLabel}</span><span className="sm:hidden">{activeTabLabel}</span></div></div>
        </div></div>
      </header>
      <main id="main-content" className={`${CONTAINER} pt-5 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:pt-6 lg:pb-12`}>{children}</main>
    </div>
    <nav className="fixed inset-x-0 bottom-0 z-30 lg:hidden" aria-label="Command Center sections" data-no-pull-refresh style={{ background: 'var(--bg-elevated)', borderTop: '1px solid var(--border)', paddingBottom: 'env(safe-area-inset-bottom, 0px)', backdropFilter: 'blur(12px)' }}><div className="flex items-stretch">{MOBILE_PRIMARY.map((id) => { const mod = MODULES.find((m) => m.id === id)!; const on = id === active; return <Link key={id} href={hrefFor(mod.tabs[0])} aria-current={on ? 'page' : undefined} className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2" style={{ minHeight: 52, color: on ? '#0067E0' : 'var(--text-muted)' }}>{MODULE_ICON[id]}<span className="text-[10px] font-[700]">{mod.label}</span></Link>; })}<button onClick={() => setMoreOpen(true)} aria-expanded={moreOpen} aria-haspopup="dialog" className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2" style={{ minHeight: 52, color: overflow.some((m) => m.id === active) ? '#0067E0' : 'var(--text-muted)' }}><Menu size={17} /><span className="text-[10px] font-[700]">More</span></button></div></nav>
    {moreOpen && <div ref={moreRef} className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="More sections" data-no-pull-refresh><button aria-label="Close" onClick={() => setMoreOpen(false)} className="absolute inset-0 h-full w-full" style={{ background: 'rgba(15,23,42,0.45)' }} /><div className="absolute inset-x-0 bottom-0 rounded-t-[18px] p-4" style={{ background: 'var(--bg-elevated)', borderTop: '1px solid var(--border)', paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}><div className="mb-3 flex items-center justify-between"><span className="text-[13px] font-[750]" style={{ color: 'var(--text-primary)' }}>More sections</span><button onClick={() => setMoreOpen(false)} aria-label="Close" className="flex items-center justify-center rounded-[9px]" style={{ width: 32, height: 32, background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}><X size={15} /></button></div><div className="grid grid-cols-2 gap-2">{overflow.map((m) => <Link key={m.id} href={hrefFor(m.tabs[0])} className="flex items-center gap-2.5 rounded-[11px] px-3 py-3 text-[13px] font-[650]" style={{ background: m.id === active ? 'rgba(0,103,224,0.10)' : 'var(--bg-subtle)', border: '1px solid var(--border)', color: m.id === active ? '#0067E0' : 'var(--text-primary)', minHeight: 48 }}>{MODULE_ICON[m.id]}<span>{m.label}</span></Link>)}</div></div></div>}
  </div>;
}
