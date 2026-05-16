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
    try {
      localStorage.setItem('619_theme', next);
    } catch {}
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

  const navItem = findItemByPath(pathname);
  const pageTitle = navItem?.label ?? 'Dashboard';

  const topGroups = useMemo(() => {
    const visibleGroups = NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => isVisibleForRole(item, user?.role) && !item.hidden),
    })).filter((group) => group.items.length > 0);

    const visibleSettings = {
      ...SETTINGS_GROUP,
      items: SETTINGS_GROUP.items.filter((item) => isVisibleForRole(item, user?.role) && !item.hidden),
    };

    const groups = [
      { id: 'dashboard', label: 'Dashboard', items: [DASHBOARD_ITEM] },
      ...visibleGroups,
      ...(visibleSettings.items.length ? [{ id: visibleSettings.id, label: visibleSettings.label, items: visibleSettings.items }] : []),
    ];

    return groups;
  }, [user?.role]);

  const primaryGroups = topGroups.slice(0, 6);
  const secondaryGroups = topGroups.slice(6);
  const toggleMenu = (id: string) => setOpenMenu((current) => (current === id ? null : id));

  const handleResetPassword = () => {
    setOpenMenu(null);
    router.push('/reset-password');
  };

  const handleLogout = () => {
    setOpenMenu(null);
    logout();
    router.push('/login');
  };

  const accountLabel = user?.name || '619 FITNESS STUDIO';
  const roleLabel = user?.role || 'admin';
  const initials = (user?.name || 'A').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  const renderGroup = (group: { id: string; label: string; items: typeof DASHBOARD_ITEM[] }) => {
    const active = group.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
    const opened = openMenu === group.id;

    return (
      <div key={group.id} className="relative shrink-0">
        <button
          type="button"
          onClick={() => (group.items.length === 1 ? router.push(group.items[0].href) : toggleMenu(group.id))}
          className={active
            ? 'inline-flex h-11 items-center gap-2 rounded-[16px] bg-gradient-to-r from-violet-700 to-purple-600 px-6 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(109,40,217,0.24)]'
            : 'inline-flex h-11 items-center gap-2 rounded-[16px] px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950'}
          aria-expanded={opened}
        >
          <span className="whitespace-nowrap">{group.label}</span>
          {group.items.length > 1 && <ChevronDown size={15} className={cn('shrink-0 transition-transform', opened && 'rotate-180')} />}
        </button>

        {group.items.length > 1 && opened && (
          <div className="absolute left-0 top-[calc(100%+10px)] z-[120] min-w-[240px] rounded-[22px] border border-slate-200 bg-white p-2 shadow-[0_24px_50px_rgba(15,23,42,0.12)]">
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
  };

  return (
    <header className="fixed inset-x-0 top-0 z-[100] border-b border-slate-200 bg-white/96 shadow-[0_8px_24px_rgba(15,23,42,0.04)] backdrop-blur-xl">
      <div ref={headerRef} className="mx-auto flex w-full max-w-[1680px] flex-col gap-3 px-3 py-3 sm:px-6 lg:px-8">
        <div className="flex items-start gap-3">
          <button
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 lg:hidden"
            onClick={onMenuClick}
            aria-label="Open navigation"
          >
            <Menu size={18} />
          </button>

          <div className="min-w-0 shrink-0 pr-2">
            <div className="truncate text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">619 Fitness Studio</div>
            <h1 className="truncate pt-1 text-[18px] font-semibold tracking-tight text-slate-950">{pageTitle}</h1>
          </div>

          <div className="hidden min-w-0 flex-1 flex-col gap-2 lg:flex">
            <nav className="flex min-w-0 flex-wrap items-center gap-2">
              {primaryGroups.map(renderGroup)}
            </nav>
            {secondaryGroups.length > 0 && (
              <nav className="flex min-w-0 flex-wrap items-center gap-2 pl-4">
                {secondaryGroups.map(renderGroup)}
              </nav>
            )}
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {hydrated ? (theme === 'light' ? <Moon size={18} /> : <Sun size={18} />) : <span style={{ width: 18 }} />}
            </button>

            <button
              type="button"
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
              aria-label="Notifications"
            >
              <Bell size={18} />
              <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => toggleMenu('account')}
                className="inline-flex h-11 items-center gap-3 rounded-[18px] border border-slate-200 bg-white px-3 pr-4 shadow-sm transition hover:bg-slate-50"
                aria-expanded={openMenu === 'account'}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">{initials}</div>
                <div className="hidden text-left xl:block">
                  <div className="max-w-[220px] truncate text-[13px] font-semibold text-slate-900">{accountLabel}</div>
                  <div className="text-xs lowercase text-slate-500">{roleLabel}</div>
                </div>
                <ChevronDown size={16} className={cn('text-slate-500 transition-transform', openMenu === 'account' && 'rotate-180')} />
              </button>

              {openMenu === 'account' && (
                <div className="absolute right-0 top-[calc(100%+10px)] z-[130] w-[240px] rounded-[22px] border border-slate-200 bg-white p-2 shadow-[0_24px_50px_rgba(15,23,42,0.12)]">
                  <button type="button" onClick={handleResetPassword} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                    <KeyRound size={16} className="text-violet-600" />
                    Reset password
                  </button>
                  <button type="button" onClick={handleLogout} className="mt-1 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50">
                    <LogOut size={16} />
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="hidden lg:flex lg:items-center lg:justify-end">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('619-cmd-palette'))}
            className="group inline-flex h-12 w-full max-w-[520px] items-center justify-between rounded-[18px] border border-slate-200 bg-white px-4 text-sm text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-700"
          >
            <span className="flex items-center gap-3">
              <Search size={16} className="text-slate-400 transition group-hover:text-slate-600" />
              <span>Search for pages, members, payments...</span>
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold tracking-wide text-slate-500">⌘K</span>
          </button>
        </div>
      </div>
    </header>
  );
}
