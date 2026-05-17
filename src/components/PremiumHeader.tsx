'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { DASHBOARD_ITEM, NAV_GROUPS, SETTINGS_GROUP, isVisibleForRole } from '@/lib/nav-config';
import { Menu, Moon, Sun, Bell, ChevronDown, KeyRound, LogOut, Search } from 'lucide-react';
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
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
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
    return () => {
      window.removeEventListener('keydown', handler);
      document.removeEventListener('mousedown', clickAway);
    };
  }, []);

  useEffect(() => setOpenMenu(null), [pathname]);

  const topGroups = useMemo(() => {
    const visibleGroups = NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => isVisibleForRole(item, user?.role) && !item.hidden),
    })).filter((group) => group.items.length > 0);

    const visibleSettings = {
      ...SETTINGS_GROUP,
      items: SETTINGS_GROUP.items.filter((item) => isVisibleForRole(item, user?.role) && !item.hidden),
    };

    return [
      { id: 'dashboard', label: 'Dashboard', items: [DASHBOARD_ITEM] },
      ...visibleGroups,
      ...(visibleSettings.items.length
        ? [{ id: visibleSettings.id, label: visibleSettings.label, items: visibleSettings.items }]
        : []),
    ];
  }, [user?.role]);

  // First 6 on row-2 line 1, rest on line 2
  const row2Line1 = topGroups.slice(0, 7);
  const row2Line2 = topGroups.slice(7);

  const toggleMenu = (id: string) => setOpenMenu((c) => (c === id ? null : id));
  const handleResetPassword = () => { setOpenMenu(null); router.push('/reset-password'); };
  const handleLogout = () => { setOpenMenu(null); logout(); router.push('/login'); };

  const accountLabel = user?.name || '619 FITNESS STUDIO';
  const roleLabel = user?.role || 'admin';
  const initials = (user?.name || 'A').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();

  const renderGroup = (group: { id: string; label: string; items: typeof DASHBOARD_ITEM[] }) => {
    const active = group.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
    const opened = openMenu === group.id;

    return (
      <div key={group.id} className="relative shrink-0">
        <button
          type="button"
          onClick={() => (group.items.length === 1 ? router.push(group.items[0].href) : toggleMenu(group.id))}
          aria-expanded={opened}
          className={cn(
            'group relative inline-flex h-[38px] items-center gap-1.5 rounded-full px-5 text-[13px] font-semibold tracking-[0.01em] transition-all duration-200',
            active
              ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 text-white shadow-[0_4px_18px_rgba(109,40,217,0.32)] hover:shadow-[0_6px_24px_rgba(109,40,217,0.42)] hover:-translate-y-[1px]'
              : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-950 hover:-translate-y-[1px] hover:shadow-[0_2px_10px_rgba(15,23,42,0.07)]',
          )}
        >
          <span className="whitespace-nowrap">{group.label}</span>
          {group.items.length > 1 && (
            <ChevronDown size={13} className={cn('shrink-0 transition-transform duration-200', opened && 'rotate-180')} />
          )}
          {!active && (
            <span className="absolute inset-x-3 bottom-0 h-[2px] scale-x-0 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 opacity-0 transition-all duration-200 group-hover:scale-x-100 group-hover:opacity-100" />
          )}
        </button>

        {group.items.length > 1 && opened && (
          <div className="absolute left-0 top-[calc(100%+8px)] z-[120] min-w-[220px] overflow-hidden rounded-[20px] border border-slate-200/80 bg-white/95 p-1.5 shadow-[0_20px_60px_rgba(15,23,42,0.14)] backdrop-blur-xl">
            {group.items.map((item) => {
              const itemActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <button
                  type="button"
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-[14px] px-3.5 py-2.5 text-left text-[13px] font-semibold transition-all duration-150',
                    itemActive
                      ? 'bg-gradient-to-r from-violet-50 to-indigo-50 text-violet-700'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950',
                  )}
                >
                  <span>{item.label}</span>
                  {item.isNew && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700">New</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <header
      className="fixed inset-x-0 top-0 z-[100] border-b border-slate-200/70 bg-white/[0.97] shadow-[0_2px_20px_rgba(15,23,42,0.06)] backdrop-blur-2xl"
      style={{ WebkitBackdropFilter: 'blur(24px)' }}
    >
      <div
        ref={headerRef}
        className="mx-auto flex w-full max-w-[1680px] flex-col px-4 sm:px-6 lg:px-8"
      >
        {/* ═══════════════════════════════════════════
            ROW 1 — Brand identity + right utilities
        ═══════════════════════════════════════════ */}
        <div className="flex h-[62px] items-center gap-3 lg:gap-5">

          {/* Mobile hamburger */}
          <button
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 lg:hidden"
            onClick={onMenuClick}
            aria-label="Open navigation"
          >
            <Menu size={18} />
          </button>

          {/* Brand identity */}
          <div className="flex shrink-0 items-center gap-3">
            {/* Logo container */}
            <div
              className="relative flex h-[44px] w-[44px] shrink-0 items-center justify-center overflow-hidden rounded-[13px] border border-violet-200/60 bg-gradient-to-br from-white to-violet-50/60"
              style={{
                boxShadow: '0 4px 16px rgba(109,40,217,0.12), 0 1px 4px rgba(109,40,217,0.08), inset 0 1px 0 rgba(255,255,255,0.9)',
              }}
            >
              <img
                src="/619-logo.png"
                alt="619 Fitness Studio"
                className="h-[32px] w-[32px] object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                  const fb = e.currentTarget.nextElementSibling as HTMLElement | null;
                  if (fb) fb.style.display = 'flex';
                }}
              />
              <span className="hidden h-full w-full items-center justify-center bg-gradient-to-br from-violet-600 to-indigo-700 text-[14px] font-black tracking-tight text-white">
                619
              </span>
            </div>

            {/* Brand text */}
            <div className="hidden flex-col sm:flex">
              <span
                className="text-[14.5px] font-black tracking-[0.11em]"
                style={{
                  background: 'linear-gradient(135deg, #1e1b4b 0%, #4f46e5 50%, #7c3aed 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                619 FITNESS STUDIO
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Management OS
              </span>
            </div>
          </div>

          {/* Right utility strip — pushed to the far right */}
          <div className="ml-auto flex items-center gap-2">
            {/* Search */}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('619-cmd-palette'))}
              className="hidden h-[36px] w-[200px] items-center justify-between rounded-full border border-slate-200 bg-slate-50/80 px-3 text-[13px] text-slate-400 transition hover:border-slate-300 hover:bg-white hover:text-slate-600 xl:inline-flex"
              style={{ boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}
            >
              <span className="flex items-center gap-2">
                <Search size={13} className="text-slate-400" />
                <span>Search...</span>
              </span>
              <span className="rounded-md bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">⌘K</span>
            </button>

            {/* Theme toggle */}
            <button
              type="button"
              className="inline-flex h-[36px] w-[36px] items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
              style={{ boxShadow: '0 1px 4px rgba(15,23,42,0.06)' }}
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {hydrated ? (theme === 'light' ? <Moon size={15} /> : <Sun size={15} />) : <span style={{ width: 15 }} />}
            </button>

            {/* Notifications */}
            <button
              type="button"
              className="relative inline-flex h-[36px] w-[36px] items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
              style={{ boxShadow: '0 1px 4px rgba(15,23,42,0.06)' }}
              aria-label="Notifications"
            >
              <Bell size={15} />
              <span className="absolute right-[8px] top-[8px] h-2 w-2 rounded-full bg-rose-500 ring-[1.5px] ring-white" />
            </button>

            {/* Account pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleMenu('account')}
                aria-expanded={openMenu === 'account'}
                className="inline-flex h-[36px] items-center gap-2 rounded-full border border-slate-200 bg-white pl-1 pr-2.5 transition hover:border-slate-300 hover:bg-slate-50"
                style={{ boxShadow: '0 1px 4px rgba(15,23,42,0.06)' }}
              >
                <div className="flex h-[26px] w-[26px] items-center justify-center overflow-hidden rounded-full border border-violet-200/60 bg-gradient-to-br from-violet-50 to-indigo-100">
                  <img
                    src="/619-logo.png"
                    alt="Account"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                      const fb = e.currentTarget.nextElementSibling as HTMLElement | null;
                      if (fb) fb.style.display = 'flex';
                    }}
                  />
                  <span className="hidden h-full w-full items-center justify-center text-[10px] font-black text-violet-700">{initials}</span>
                </div>
                <div className="hidden text-left xl:block">
                  <div className="max-w-[150px] truncate text-[11.5px] font-bold text-slate-900">{accountLabel}</div>
                  <div className="text-[10px] lowercase tracking-wide text-slate-400">{roleLabel}</div>
                </div>
                <ChevronDown size={13} className={cn('text-slate-400 transition-transform duration-200', openMenu === 'account' && 'rotate-180')} />
              </button>

              {openMenu === 'account' && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-[130] w-[220px] overflow-hidden rounded-[20px] border border-slate-200/80 bg-white/95 p-1.5 shadow-[0_20px_60px_rgba(15,23,42,0.14)] backdrop-blur-xl">
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    className="flex w-full items-center gap-3 rounded-[14px] px-3.5 py-2.5 text-left text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <KeyRound size={15} className="text-violet-600" />
                    Reset password
                  </button>
                  <div className="mx-2 my-1 h-px bg-slate-100" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-[14px] px-3.5 py-2.5 text-left text-[13px] font-semibold text-rose-600 transition hover:bg-rose-50"
                  >
                    <LogOut size={15} />
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════
            ROW 2 — Navigation buttons (desktop only)
            Line 1: first 7 groups
            Line 2: overflow groups (if any)
        ═══════════════════════════════════════════ */}
        <div className="hidden border-t border-slate-100 pb-2 pt-1.5 lg:block">
          <nav aria-label="Primary navigation" className="flex flex-wrap items-center gap-1">
            {row2Line1.map(renderGroup)}
          </nav>
          {row2Line2.length > 0 && (
            <nav aria-label="Secondary navigation" className="mt-1 flex flex-wrap items-center gap-1 pl-1">
              {row2Line2.map(renderGroup)}
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
