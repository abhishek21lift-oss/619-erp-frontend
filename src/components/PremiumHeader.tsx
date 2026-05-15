
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { DASHBOARD_ITEM, NAV_GROUPS, SETTINGS_GROUP, findItemByPath, isVisibleForRole } from '@/lib/nav-config';
import { Menu, Moon, Sun, Bell, ChevronDown, KeyRound, LogOut } from 'lucide-react';
import { cn } from '@/components/ui';

interface Props {
  onMenuClick?: () => void;
}

export default function PremiumHeader({ onMenuClick }: Props) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [hydrated, setHydrated] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('619-cmd-palette'));
      }
      if (e.key === 'Escape') setOpenMenu(null);
    };
    const clickAway = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    window.addEventListener('keydown', handler);
    document.addEventListener('mousedown', clickAway);
    return (
    <header className="fixed inset-x-0 top-0 z-[100] border-b border-white/60 bg-white/82 backdrop-blur-xl shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
      <div ref={headerRef} className="mx-auto flex w-full max-w-[1600px] items-start gap-3 overflow-visible px-4 py-3 sm:px-6 lg:px-8">
        <button
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/80 text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md md:hidden"
          onClick={onMenuClick}
          aria-label="Open navigation"
        >
          <Menu size={18} />
        </button>

        <div className="min-w-0 shrink-0 pr-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">619 Fitness Studio</div>
          <h1 className="truncate text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">{pageTitle}</h1>
        </div>

        <nav className="relative z-[110] hidden min-w-0 flex-1 flex-wrap items-center gap-2 overflow-visible lg:flex">
          {topGroups.map((group) => {
            const active = group.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
            const opened = openMenu === group.id;
            return (
              <div key={group.id} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => group.items.length === 1 ? router.push(group.items[0].href) : toggleMenu(group.id)}
                  className={active
                    ? 'inline-flex items-center gap-2 whitespace-nowrap rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(109,40,217,0.25)]'
                    : 'inline-flex items-center gap-2 whitespace-nowrap rounded-2xl px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-slate-900 hover:shadow-sm'}
                  aria-expanded={opened}
                >
                  <span>{group.label}</span>
                  {group.items.length > 1 && <ChevronDown size={15} className={cn('transition-transform', opened && 'rotate-180')} />}
                </button>

                {group.items.length > 1 && opened && (
                  <div className="absolute left-0 top-[calc(100%+12px)] z-[120] min-w-[240px] rounded-[22px] border border-white/70 bg-white/95 p-2 shadow-[0_20px_50px_rgba(15,23,42,0.12)] backdrop-blur-xl">
                    {group.items.map((item) => {
                      const itemActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                      return (
                        <button
                          type="button"
                          key={item.href}
                          onClick={() => router.push(item.href)}
                          className={itemActive
                            ? 'flex w-full items-center justify-between rounded-2xl bg-violet-50 px-3 py-2.5 text-left text-sm font-semibold text-violet-700'
                            : 'flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50'}
                        >
                          <span>{item.label}</span>
                          {item.isNew && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">New</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 flex-col items-end gap-3">
          <div className="flex items-center justify-end gap-2">
            <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-white/80 text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:text-slate-900 hover:shadow-md" onClick={toggleTheme} aria-label="Toggle theme">
              {hydrated ? (theme === 'light' ? <Moon size={18} /> : <Sun size={18} />) : <span style={{ width: 18 }} />}
            </button>
            <button type="button" className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-white/80 text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:text-slate-900 hover:shadow-md" aria-label="Notifications">
              <Bell size={18} />
              <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleMenu('account')}
                className="inline-flex items-center gap-3 rounded-2xl border border-white/70 bg-white/80 px-2.5 py-2 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                aria-label="Account menu"
                aria-expanded={openMenu === 'account'}
              >
                <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm">
                  <img src="/logo.png" alt="619 Fitness Studio logo" className="h-full w-full object-cover" />
                </span>
                <span className="hidden text-left md:block">
                  <span className="block max-w-[220px] truncate text-sm font-bold uppercase tracking-[0.08em] text-slate-900">619 FITNESS STUDIO</span>
                  <span className="block text-xs text-slate-500">admin</span>
                </span>
                <ChevronDown size={16} className={cn('hidden text-slate-400 md:block transition-transform', openMenu === 'account' && 'rotate-180')} />
              </button>

              {openMenu === 'account' && (
                <div className="absolute right-0 top-[calc(100%+12px)] z-[120] min-w-[220px] rounded-[22px] border border-white/70 bg-white/95 p-2 shadow-[0_20px_50px_rgba(15,23,42,0.12)] backdrop-blur-xl">
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <KeyRound size={16} />
                    <span>Reset Password</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                  >
                    <LogOut size={16} />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="hidden w-full max-w-[320px] items-center gap-2 self-end rounded-2xl border border-white/70 bg-white/72 px-3 py-2 shadow-sm lg:flex">
            <button
              type="button"
              className="flex w-full items-center gap-2 text-sm text-slate-500"
              onClick={() => window.dispatchEvent(new CustomEvent('619-cmd-palette'))}
              title="Search — ⌘K"
            >
              <span className="truncate">Search for pages, members, payments…</span>
              <kbd className="ml-auto rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-500">⌘K</kbd>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
