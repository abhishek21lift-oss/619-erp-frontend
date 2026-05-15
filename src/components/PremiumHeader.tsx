'use client';
/**
 * TopBar (PremiumHeader)
 *
 * Sticky glassmorphic top bar with:
 *  • Mobile hamburger (triggers Sidebar drawer)
 *  • Breadcrumb / page title (auto-resolved from pathname)
 *  • ⌘K shortcut to fire the command palette
 *  • Dark/light mode toggle (persisted)
 *  • Notification bell
 *  • User avatar (click → settings)
 */

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { DASHBOARD_ITEM, NAV_GROUPS, findItemByPath, isVisibleForRole } from '@/lib/nav-config';
import { Menu, Moon, Sun, Bell, Settings, ChevronDown } from 'lucide-react';

interface Props {
  /** Propagated up from AppShell to toggle mobile drawer */
  onMenuClick?: () => void;
}

export default function PremiumHeader({ onMenuClick }: Props) {
  const { user } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();

  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [hydrated, setHydrated] = useState(false);

  // ── Theme init ─────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = (localStorage.getItem('619_theme') as 'light' | 'dark') ?? 'light';
      setTheme(saved);
      document.documentElement.setAttribute('data-theme', saved);
    } catch {}
    setHydrated(true);
  }, []);

  const toggleTheme = () => {
    if (!hydrated) return;
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('619_theme', next); } catch {}
  };

  // ── ⌘K → command palette ─────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('619-cmd-palette'));
      }
    };
    window.addEventListener('keydown', handler);
  
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/60 bg-white/78 backdrop-blur-xl shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
      <div className="mx-auto flex w-full max-w-[1600px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <button
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-white/80 text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md md:hidden"
          onClick={onMenuClick}
          aria-label="Open navigation"
        >
          <Menu size={18} />
        </button>

        <div className="min-w-0 pr-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">619 Fitness Studio</div>
          <h1 className="truncate text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">{pageTitle}</h1>
        </div>

        <nav className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto lg:flex">
          {topItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={active
                  ? 'inline-flex items-center gap-2 whitespace-nowrap rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(109,40,217,0.25)]'
                  : 'inline-flex items-center gap-2 whitespace-nowrap rounded-2xl px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-slate-900 hover:shadow-sm'}
              >
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 rounded-2xl border border-white/70 bg-white/72 px-3 py-2 shadow-sm md:flex md:min-w-[260px] lg:min-w-[320px]">
          <button
            className="flex w-full items-center gap-2 text-sm text-slate-500"
            onClick={() => window.dispatchEvent(new CustomEvent('619-cmd-palette'))}
            title="Search — ⌘K"
          >
            <span className="truncate">Search for pages, members, payments…</span>
            <kbd className="ml-auto rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-500">⌘K</kbd>
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-white/80 text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:text-slate-900 hover:shadow-md" onClick={toggleTheme} aria-label="Toggle theme">
            {hydrated ? (theme === 'light' ? <Moon size={18} /> : <Sun size={18} />) : <span style={{ width: 18 }} />}
          </button>
          <button className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-white/80 text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:text-slate-900 hover:shadow-md" aria-label="Notifications">
            <Bell size={18} />
            <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
          </button>
          <button onClick={() => router.push('/settings')} className="inline-flex items-center gap-3 rounded-2xl border border-white/70 bg-white/80 px-2.5 py-2 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" aria-label="Account settings">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-purple-500 text-sm font-bold text-white shadow-[0_10px_20px_rgba(109,40,217,0.28)]">{initials}</span>
            <span className="hidden text-left md:block">
              <span className="block max-w-[140px] truncate text-sm font-semibold text-slate-900">{user?.name ?? 'Account'}</span>
              <span className="block text-xs text-slate-500">{user?.role ?? 'member'}</span>
            </span>
            <ChevronDown size={16} className="hidden text-slate-400 md:block" />
          </button>
        </div>
      </div>
    </header>
  );
}
