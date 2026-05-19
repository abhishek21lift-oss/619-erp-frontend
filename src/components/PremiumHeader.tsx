'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { DASHBOARD_ITEM, NAV_GROUPS, SETTINGS_GROUP, isVisibleForRole } from '@/lib/nav-config';
import {
  Menu, Moon, Sun, ChevronDown, KeyRound, LogOut, Search, Zap,
} from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import { cn } from '@/components/ui';

interface Props {
  onMenuClick?: () => void;
}

// ─── Active accent per group (dark mode palette) ──────────────────────────────
const GROUP_ACCENT: Record<string, {
  pill: string;          // active pill background
  glow: string;          // box-shadow glow colour
  underline: string;     // active underline gradient
  dropActiveBg: string;  // dropdown active row bg
  dropActiveText: string;
}> = {
  dashboard:   { pill: 'rgba(124,58,237,0.20)', glow: 'rgba(124,58,237,0.35)', underline: 'rgba(168,85,247,0.8)',  dropActiveBg: 'rgba(124,58,237,0.18)', dropActiveText: '#c4b5fd' },
  sales:       { pill: 'rgba(6,182,212,0.18)',  glow: 'rgba(6,182,212,0.30)',  underline: 'rgba(34,211,238,0.7)', dropActiveBg: 'rgba(6,182,212,0.15)',  dropActiveText: '#67e8f9' },
  members:     { pill: 'rgba(16,185,129,0.16)', glow: 'rgba(16,185,129,0.28)', underline: 'rgba(52,211,153,0.7)', dropActiveBg: 'rgba(16,185,129,0.13)', dropActiveText: '#6ee7b7' },
  training:    { pill: 'rgba(245,158,11,0.16)', glow: 'rgba(245,158,11,0.28)', underline: 'rgba(251,191,36,0.7)', dropActiveBg: 'rgba(245,158,11,0.13)', dropActiveText: '#fde68a' },
  staff:       { pill: 'rgba(99,102,241,0.18)', glow: 'rgba(99,102,241,0.30)', underline: 'rgba(129,140,248,0.7)',dropActiveBg: 'rgba(99,102,241,0.15)', dropActiveText: '#a5b4fc' },
  attendance:  { pill: 'rgba(236,72,153,0.16)', glow: 'rgba(236,72,153,0.28)', underline: 'rgba(244,114,182,0.7)',dropActiveBg: 'rgba(236,72,153,0.13)', dropActiveText: '#f9a8d4' },
  memberships: { pill: 'rgba(168,85,247,0.18)', glow: 'rgba(168,85,247,0.30)', underline: 'rgba(192,132,252,0.7)',dropActiveBg: 'rgba(168,85,247,0.15)', dropActiveText: '#d8b4fe' },
  finance:     { pill: 'rgba(59,130,246,0.18)', glow: 'rgba(59,130,246,0.28)', underline: 'rgba(96,165,250,0.7)', dropActiveBg: 'rgba(59,130,246,0.15)', dropActiveText: '#93c5fd' },
  insights:    { pill: 'rgba(20,184,166,0.16)', glow: 'rgba(20,184,166,0.26)', underline: 'rgba(45,212,191,0.7)', dropActiveBg: 'rgba(20,184,166,0.13)', dropActiveText: '#5eead4' },
  engagement:  { pill: 'rgba(239,68,68,0.16)',  glow: 'rgba(239,68,68,0.26)',  underline: 'rgba(252,165,165,0.7)',dropActiveBg: 'rgba(239,68,68,0.13)',  dropActiveText: '#fca5a5' },
  settings:    { pill: 'rgba(148,163,184,0.14)', glow: 'rgba(148,163,184,0.22)', underline: 'rgba(203,213,225,0.6)',dropActiveBg: 'rgba(148,163,184,0.12)', dropActiveText: '#cbd5e1' },
};
const DEFAULT_ACCENT = GROUP_ACCENT.dashboard;

const ROW1_COUNT = 6;

export default function PremiumHeader({ onMenuClick }: Props) {
  const { user, logout } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();
  const headerRef = useRef<HTMLDivElement | null>(null);

  const [scrolled,  setScrolled]  = useState(false);
  const [theme,     setTheme]     = useState<'light' | 'dark'>('light');
  const [hydrated,  setHydrated]  = useState(false);
  const [openMenu,  setOpenMenu]  = useState<string | null>(null);

  // ── scroll detection ──────────────────────────────────────────────────────
  useEffect(() => {
    const el = document.getElementById('main-content');
    const target = el ?? window;
    const onScroll = () => {
      const y = el ? el.scrollTop : window.scrollY;
      setScrolled(y > 8);
    };
    target.addEventListener('scroll', onScroll, { passive: true });
    return () => target.removeEventListener('scroll', onScroll);
  }, []);

  // ── theme init ────────────────────────────────────────────────────────────
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

  // ── keyboard + click-away ─────────────────────────────────────────────────
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

  // ── nav groups (respects role) ────────────────────────────────────────────
  const topGroups = useMemo(() => {
    const visibleGroups = NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => isVisibleForRole(item, user?.role) && !item.hidden),
    })).filter((group) => {
      const g = NAV_GROUPS.find((ng) => ng.id === group.id);
      if (g?.roles?.length) return !!user?.role && g.roles.includes(user.role as string);
      return group.items.length > 0;
    });
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

  const row1 = topGroups.slice(0, ROW1_COUNT);
  const row2 = topGroups.slice(ROW1_COUNT);

  const toggleMenu    = (id: string) => setOpenMenu((c) => (c === id ? null : id));
  const handleLogout  = () => { setOpenMenu(null); logout(); router.push('/login'); };
  const handleReset   = () => { setOpenMenu(null); router.push('/reset-password'); };

  const accountLabel = user?.name  || '619 FITNESS STUDIO';
  const roleLabel    = user?.role  || 'admin';
  const initials     = (user?.name || 'A').split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase();

  // ── render a single nav group button + dropdown ───────────────────────────
  const renderGroup = (group: { id: string; label: string; items: typeof DASHBOARD_ITEM[] }) => {
    const active  = group.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
    const opened  = openMenu === group.id;
    const accent  = GROUP_ACCENT[group.id] ?? DEFAULT_ACCENT;

    return (
      <div key={group.id} className="relative shrink-0">
        <button
          type="button"
          onClick={() => group.items.length === 1 ? router.push(group.items[0].href) : toggleMenu(group.id)}
          aria-expanded={group.items.length > 1 ? opened : undefined}
          className={cn(
            'group relative inline-flex h-[32px] items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-[12.5px] font-medium tracking-[0.01em] transition-all duration-200 ease-out',
            active
              ? 'text-white'
              : 'text-white/45 hover:text-white/80 hover:bg-white/[0.06]',
          )}
          style={active ? {
            background: accent.pill,
            boxShadow: `0 0 0 1px ${accent.glow.replace('0.3', '0.15')}, 0 2px 12px ${accent.glow}`,
          } : undefined}
        >
          <span>{group.label}</span>
          {group.items.length > 1 && (
            <ChevronDown
              size={10}
              className={cn('shrink-0 opacity-60 transition-transform duration-200', opened && 'rotate-180')}
            />
          )}
          {/* Active underline glow */}
          {active && (
            <span
              aria-hidden
              className="absolute bottom-0 left-3 right-3 h-px rounded-full"
              style={{ background: `linear-gradient(90deg, transparent, ${accent.underline}, transparent)` }}
            />
          )}
        </button>

        {group.items.length > 1 && opened && (
          <div
            className="absolute left-0 top-[calc(100%+8px)] z-[120] min-w-[220px] overflow-hidden rounded-2xl p-1.5"
            style={{
              background: 'rgba(14,14,18,0.97)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: `1px solid rgba(255,255,255,0.08)`,
              boxShadow: `0 20px 60px rgba(0,0,0,0.6), 0 4px 20px ${accent.glow}, 0 0 0 1px ${accent.glow.replace('0.3','0.08')}`,
              animation: 'dropIn 0.15s cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            {/* Colour top stripe */}
            <div
              className="mb-1 h-[2px] w-full rounded-full mx-auto"
              style={{ width: 'calc(100% - 12px)', background: `linear-gradient(90deg, ${accent.underline}, transparent)` }}
            />
            {group.items.map((item) => {
              const itemActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <button
                  type="button"
                  key={item.href}
                  onClick={() => { router.push(item.href); setOpenMenu(null); }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[13px] font-medium transition-all duration-150',
                    itemActive
                      ? 'text-white'
                      : 'text-white/50 hover:bg-white/[0.06] hover:text-white/80',
                  )}
                  style={itemActive ? { background: accent.dropActiveBg, color: accent.dropActiveText } : undefined}
                >
                  <span>{item.label}</span>
                  <span className="flex items-center gap-1.5">
                    {item.isNew && (
                      <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400">New</span>
                    )}
                    {itemActive && <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent.dropActiveText }} />}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
        @keyframes logoGlow {
          0%, 100% { box-shadow: 0 0 12px rgba(124,58,237,0.3), 0 0 0 1px rgba(124,58,237,0.15); }
          50%       { box-shadow: 0 0 20px rgba(168,85,247,0.45), 0 0 0 1px rgba(168,85,247,0.25); }
        }
        .logo-glow { animation: logoGlow 3.5s ease-in-out infinite; }
      `}</style>

      <header
        className={cn(
          'fixed inset-x-0 top-0 z-[100] transition-all duration-300 ease-out',
          scrolled
            ? 'border-b border-white/[0.06] shadow-[0_1px_0_rgba(255,255,255,0.03)]'
            : 'border-b border-transparent',
        )}
        style={{
          background: scrolled
            ? 'rgba(10,10,14,0.92)'
            : 'linear-gradient(180deg, rgba(10,10,14,0.80) 0%, rgba(10,10,14,0.60) 100%)',
          backdropFilter: scrolled ? 'blur(24px) saturate(180%)' : 'blur(8px)',
          WebkitBackdropFilter: scrolled ? 'blur(24px) saturate(180%)' : 'blur(8px)',
        }}
      >
        <div ref={headerRef} className="mx-auto flex w-full max-w-[1680px] flex-col px-4 pb-2 pt-3 sm:px-6 lg:px-8">
          <div className="flex items-start gap-3">

            {/* ── Mobile hamburger ─────────────────────────────────────── */}
            <button
              type="button"
              className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-white/60 transition-all duration-150 hover:bg-white/[0.10] hover:text-white lg:hidden"
              onClick={onMenuClick}
              aria-label="Open navigation menu"
            >
              <Menu size={16} />
            </button>

            {/* ── Brand mark ───────────────────────────────────────────── */}
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="flex shrink-0 items-center gap-2.5 group"
              aria-label="619 Fitness Studio — Home"
            >
              <span
                className="logo-glow flex h-[38px] w-[38px] shrink-0 items-center justify-center overflow-hidden rounded-[11px] text-[11px] font-black tracking-tight text-white"
                style={{ background: 'linear-gradient(135deg, #5b21b6 0%, #7c3aed 50%, #a855f7 100%)' }}
              >
                <img
                  src="/619-logo.png"
                  alt="619 Fitness Studio"
                  width={30}
                  height={30}
                  className="h-[30px] w-[30px] object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                    const fb = e.currentTarget.nextElementSibling as HTMLElement | null;
                    if (fb) fb.style.display = 'flex';
                  }}
                />
                <span className="hidden h-full w-full items-center justify-center">619</span>
              </span>
              <div className="hidden select-none flex-col sm:flex">
                <span
                  className="text-[13px] font-black leading-none tracking-[0.08em] text-white/90 group-hover:text-white transition-colors duration-150"
                >
                  619 FITNESS
                </span>
                <span className="mt-[3px] text-[9px] font-semibold uppercase tracking-[0.28em] text-white/30">Management OS</span>
              </div>
            </button>

            {/* ── Divider ──────────────────────────────────────────────── */}
            <div className="mx-1 hidden h-9 w-px self-center bg-gradient-to-b from-transparent via-white/10 to-transparent lg:block" />

            {/* ── Desktop nav rows ─────────────────────────────────────── */}
            <div className="hidden min-w-0 flex-1 flex-col gap-[3px] pt-[3px] lg:flex">
              <nav aria-label="Primary navigation" className="flex min-w-0 flex-nowrap items-center gap-0.5">
                {row1.map(renderGroup)}
              </nav>
              {row2.length > 0 && (
                <nav aria-label="Secondary navigation" className="flex min-w-0 flex-nowrap items-center gap-0.5 pl-0.5">
                  {row2.map(renderGroup)}
                </nav>
              )}
            </div>

            {/* ── Right utilities ──────────────────────────────────────── */}
            <div className="ml-auto flex shrink-0 items-start gap-1.5 pt-[3px]">

              {/* Search pill */}
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('619-cmd-palette'))}
                className="hidden h-[32px] w-[180px] items-center justify-between rounded-lg border border-white/[0.08] bg-white/[0.05] px-3 text-[12px] text-white/30 transition-all duration-150 hover:border-white/[0.14] hover:bg-white/[0.08] hover:text-white/50 xl:inline-flex"
              >
                <span className="flex items-center gap-2">
                  <Search size={12} className="shrink-0" />
                  <span>Search…</span>
                </span>
                <kbd className="rounded border border-white/[0.08] bg-white/[0.05] px-1.5 py-0.5 text-[9px] font-medium text-white/20 font-mono">⌘K</kbd>
              </button>

              {/* Theme toggle */}
              <button
                type="button"
                className="inline-flex h-[32px] w-[32px] items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.05] text-white/40 transition-all duration-150 hover:bg-white/[0.09] hover:text-white/70"
                onClick={toggleTheme}
                aria-label="Toggle theme"
              >
                {hydrated ? (theme === 'light' ? <Moon size={13} /> : <Sun size={13} />) : <span style={{ width: 13 }} />}
              </button>

              {/* Notifications */}
              <NotificationBell />

              {/* Profile dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => toggleMenu('account')}
                  aria-expanded={openMenu === 'account'}
                  className={cn(
                    'inline-flex h-[32px] items-center gap-2 rounded-lg border border-white/[0.08] pl-1.5 pr-2.5 transition-all duration-150',
                    openMenu === 'account'
                      ? 'bg-white/[0.10] border-white/[0.14]'
                      : 'bg-white/[0.05] hover:bg-white/[0.09] hover:border-white/[0.13]',
                  )}
                >
                  {/* Avatar */}
                  <span
                    className="flex h-[22px] w-[22px] shrink-0 items-center justify-center overflow-hidden rounded-full text-[9px] font-black text-white"
                    style={{ background: 'linear-gradient(135deg, #5b21b6, #a855f7)' }}
                  >
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
                    <span className="hidden h-full w-full items-center justify-center">{initials}</span>
                  </span>

                  <div className="hidden text-left xl:block">
                    <div className="max-w-[120px] truncate text-[11px] font-semibold leading-none text-white/80">{accountLabel}</div>
                    <div className="mt-0.5 text-[9px] lowercase tracking-wide text-white/30">{roleLabel}</div>
                  </div>
                  <ChevronDown
                    size={10}
                    className={cn('text-white/30 transition-transform duration-200', openMenu === 'account' && 'rotate-180')}
                  />
                </button>

                {openMenu === 'account' && (
                  <div
                    className="absolute right-0 top-[calc(100%+8px)] z-[130] w-[220px] overflow-hidden rounded-2xl p-1.5"
                    style={{
                      background: 'rgba(14,14,18,0.97)',
                      backdropFilter: 'blur(24px)',
                      WebkitBackdropFilter: 'blur(24px)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      boxShadow: '0 20px 60px rgba(0,0,0,0.65), 0 4px 20px rgba(124,58,237,0.2)',
                      animation: 'dropIn 0.15s cubic-bezier(0.16,1,0.3,1)',
                    }}
                  >
                    {/* Account header */}
                    <div className="px-3 py-2.5 border-b border-white/[0.06]">
                      <p className="text-[12.5px] font-semibold text-white/90 truncate">{accountLabel}</p>
                      <p className="text-[10px] text-white/30 mt-0.5 lowercase tracking-wide">{roleLabel}</p>
                    </div>

                    <div className="mt-1 space-y-0.5">
                      <button
                        type="button"
                        onClick={() => { window.dispatchEvent(new CustomEvent('619-cmd-palette')); setOpenMenu(null); }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[12.5px] font-medium text-white/50 transition-all hover:bg-white/[0.06] hover:text-white/80"
                      >
                        <Zap size={13} className="text-purple-400/70" />
                        Quick Actions
                        <kbd className="ml-auto text-[9px] text-white/20 font-mono">⌘K</kbd>
                      </button>
                      <button
                        type="button"
                        onClick={handleReset}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[12.5px] font-medium text-white/50 transition-all hover:bg-white/[0.06] hover:text-white/80"
                      >
                        <KeyRound size={13} className="text-purple-400/70" />
                        Reset password
                      </button>
                    </div>

                    <div className="mt-1.5 border-t border-white/[0.06] pt-1">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[12.5px] font-medium text-red-400/60 transition-all hover:bg-red-500/10 hover:text-red-400"
                      >
                        <LogOut size={13} />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
