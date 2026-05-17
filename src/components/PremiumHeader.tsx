'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { DASHBOARD_ITEM, NAV_GROUPS, SETTINGS_GROUP, findItemByPath, isVisibleForRole } from '@/lib/nav-config';
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
      ...(visibleSettings.items.length ? [{ id: visibleSettings.id, label: visibleSettings.label, items: visibleSettings.items }] : []),
    ];
  }, [user?.role]);

  // Keep exact current split: first 6 on row-1, rest on row-2
  const primaryGroups = topGroups.slice(0, 6);
  const secondaryGroups = topGroups.slice(6);

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
            'group relative inline-flex h-[42px] items-center gap-1.5 whitespace-nowrap rounded-full px-5 text-[13.5px] font-semibold tracking-[0.005em] transition-all duration-200 ease-out',
            active
              ? [
                  'bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 text-white',
                  'shadow-[0_4px_20px_rgba(109,40,217,0.30),0_1px_3px_rgba(109,40,217,0.15)]',
                  'hover:-translate-y-[1px] hover:shadow-[0_8px_28px_rgba(109,40,217,0.38)]',
                ].join(' ')
              : [
                  'text-slate-600 hover:text-slate-950',
                  'hover:bg-white hover:shadow-[0_2px_12px_rgba(15,23,42,0.08)]',
                  'hover:-translate-y-[1px]',
                ].join(' '),
          )}
        >
          {/* Animated underline for inactive hover */}
          {!active && (
            <span
              className="absolute inset-x-4 bottom-[6px] h-[2px] scale-x-0 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 opacity-0 transition-all duration-200 group-hover:scale-x-100 group-hover:opacity-100"
            />
          )}
          <span>{group.label}</span>
          {group.items.length > 1 && (
            <ChevronDown size={13} className={cn('shrink-0 opacity-70 transition-transform duration-200', opened && 'rotate-180')} />
          )}
        </button>

        {group.items.length > 1 && opened && (
          <div
            className="absolute left-0 top-[calc(100%+8px)] z-[120] min-w-[230px] overflow-hidden rounded-[20px] border border-slate-200/80 bg-white/95 p-1.5 backdrop-blur-xl"
            style={{ boxShadow: '0 20px_60px_rgba(15,23,42,0.12), 0 4px 16px rgba(15,23,42,0.06)' }}
          >
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
                      ? 'bg-gradient-to-r from-violet-50 to-indigo-50/80 text-violet-700'
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
      className="fixed inset-x-0 top-0 z-[100] border-b border-slate-200/80 bg-white/[0.96] backdrop-blur-2xl"
      style={{
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: '0 1px 0 rgba(15,23,42,0.06), 0 4px_24px_rgba(15,23,42,0.05)',
      }}
    >
      <div
        ref={headerRef}
        className="mx-auto flex w-full max-w-[1680px] flex-col px-3 pb-2.5 pt-3 sm:px-6 lg:px-8"
      >
        {/* ══════════════════════════════════════════════
            TOP ROW: Brand identity + right utility strip
        ══════════════════════════════════════════════ */}
        <div className="flex items-center gap-3 lg:gap-4">

          {/* Mobile hamburger */}
          <button
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white/80 text-slate-700 shadow-sm backdrop-blur-sm transition-all duration-150 hover:bg-white hover:shadow-md lg:hidden"
            onClick={onMenuClick}
            aria-label="Open navigation"
          >
            <Menu size={17} />
          </button>

          {/* ─── Premium Brand Section ─── */}
          <div className="flex shrink-0 items-center gap-3">
            {/* Logo container — glassmorphism rounded square */}
            <div
              className="relative flex h-[46px] w-[46px] shrink-0 items-center justify-center overflow-hidden rounded-[14px] border border-violet-200/50"
              style={{
                background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(237,233,254,0.6) 100%)',
                boxShadow: [
                  '0 4px 16px rgba(109,40,217,0.14)',
                  '0 1px 4px rgba(109,40,217,0.08)',
                  'inset 0 1px 0 rgba(255,255,255,0.95)',
                ].join(', '),
              }}
            >
              <img
                src="/619-logo.png"
                alt="619 Fitness Studio"
                width={34}
                height={34}
                className="h-[34px] w-[34px] object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                  const fb = e.currentTarget.nextElementSibling as HTMLElement | null;
                  if (fb) fb.style.display = 'flex';
                }}
              />
              {/* Fallback monogram */}
              <span
                className="hidden h-full w-full items-center justify-center bg-gradient-to-br from-violet-600 to-indigo-700 text-[14px] font-black tracking-tight text-white"
              >
                619
              </span>
            </div>

            {/* Brand text */}
            <div className="hidden flex-col gap-0.5 sm:flex">
              <span
                className="text-[15px] font-black leading-none tracking-[0.10em]"
                style={{
                  background: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 45%, #7c3aed 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                619 FITNESS STUDIO
              </span>
              <span className="text-[9.5px] font-bold uppercase tracking-[0.26em] text-slate-400/90">
                Management OS
              </span>
            </div>
          </div>

          {/* Thin divider (desktop only) */}
          <div className="mx-1 hidden h-8 w-px bg-gradient-to-b from-transparent via-slate-200 to-transparent lg:block" />

          {/* ─── Right utility strip — pushed to far right ─── */}
          <div className="ml-auto flex items-center gap-2">

            {/* Search */}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('619-cmd-palette'))}
              className="hidden h-[38px] w-[230px] items-center justify-between rounded-full border border-slate-200/90 bg-slate-50/70 px-3.5 text-[13px] text-slate-400 backdrop-blur-sm transition-all duration-150 hover:border-slate-300 hover:bg-white hover:text-slate-600 hover:shadow-[0_2px_12px_rgba(15,23,42,0.07)] xl:inline-flex"
            >
              <span className="flex items-center gap-2">
                <Search size={13} className="shrink-0 text-slate-400" />
                <span>Search pages, members...</span>
              </span>
              <kbd className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 shadow-[0_1px_0_rgba(15,23,42,0.08)]">⌘K</kbd>
            </button>

            {/* Theme toggle */}
            <button
              type="button"
              className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-full border border-slate-200/90 bg-white/80 text-slate-500 backdrop-blur-sm transition-all duration-150 hover:border-slate-300 hover:bg-white hover:text-slate-800 hover:shadow-[0_2px_10px_rgba(15,23,42,0.08)]"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {hydrated ? (theme === 'light' ? <Moon size={16} /> : <Sun size={16} />) : <span style={{ width: 16 }} />}
            </button>

            {/* Notifications */}
            <button
              type="button"
              className="relative inline-flex h-[38px] w-[38px] items-center justify-center rounded-full border border-slate-200/90 bg-white/80 text-slate-500 backdrop-blur-sm transition-all duration-150 hover:border-slate-300 hover:bg-white hover:text-slate-800 hover:shadow-[0_2px_10px_rgba(15,23,42,0.08)]"
              aria-label="Notifications"
            >
              <Bell size={16} />
              <span className="absolute right-[9px] top-[9px] h-[8px] w-[8px] rounded-full bg-rose-500 ring-[1.5px] ring-white" />
            </button>

            {/* Account pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleMenu('account')}
                aria-expanded={openMenu === 'account'}
                className="inline-flex h-[38px] items-center gap-2.5 rounded-full border border-slate-200/90 bg-white/80 pl-1.5 pr-3 backdrop-blur-sm transition-all duration-150 hover:border-slate-300 hover:bg-white hover:shadow-[0_2px_10px_rgba(15,23,42,0.08)]"
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
                  <div className="max-w-[160px] truncate text-[12.5px] font-bold leading-none text-slate-900">{accountLabel}</div>
                  <div className="mt-0.5 text-[10px] lowercase tracking-wide text-slate-400">{roleLabel}</div>
                </div>
                <ChevronDown
                  size={13}
                  className={cn('text-slate-400 transition-transform duration-200', openMenu === 'account' && 'rotate-180')}
                />
              </button>

              {openMenu === 'account' && (
                <div
                  className="absolute right-0 top-[calc(100%+8px)] z-[130] w-[228px] overflow-hidden rounded-[20px] border border-slate-200/80 bg-white/95 p-1.5 backdrop-blur-xl"
                  style={{ boxShadow: '0 20px 60px rgba(15,23,42,0.12), 0 4px 16px rgba(15,23,42,0.06)' }}
                >
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    className="flex w-full items-center gap-3 rounded-[14px] px-3.5 py-2.5 text-left text-[13px] font-semibold text-slate-700 transition-all duration-150 hover:bg-slate-50 hover:text-slate-950"
                  >
                    <KeyRound size={15} className="text-violet-600" />
                    Reset password
                  </button>
                  <div className="mx-2 my-1 h-px bg-slate-100" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-[14px] px-3.5 py-2.5 text-left text-[13px] font-semibold text-rose-600 transition-all duration-150 hover:bg-rose-50"
                  >
                    <LogOut size={15} />
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            NAV ROWS: Exact same multi-row structure kept.
            Row 1 — primary groups (first 6)
            Row 2 — secondary groups (remaining)
        ══════════════════════════════════════════════ */}
        <div className="hidden pt-1 lg:block">
          {/* Subtle top rule */}
          <div className="mb-1.5 h-px bg-gradient-to-r from-transparent via-slate-200/80 to-transparent" />

          {/* Row 1 */}
          <nav aria-label="Primary navigation" className="flex flex-wrap items-center gap-1">
            {primaryGroups.map(renderGroup)}
          </nav>

          {/* Row 2 (only if overflow groups exist) */}
          {secondaryGroups.length > 0 && (
            <nav aria-label="Secondary navigation" className="mt-0.5 flex flex-wrap items-center gap-1 pl-1">
              {secondaryGroups.map(renderGroup)}
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
