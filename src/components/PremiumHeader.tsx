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

// Each nav group gets its own premium color identity
const GROUP_COLORS: Record<string, {
  gradient: string;
  glow: string;
  hoverBg: string;
  hoverText: string;
  dropdownAccent: string;
  dropdownActiveBg: string;
  dropdownActiveText: string;
}> = {
  dashboard:  { gradient: 'linear-gradient(135deg,#6d28d9,#4f46e5)', glow: 'rgba(109,40,217,0.30)', hoverBg: 'rgba(109,40,217,0.07)', hoverText: '#5b21b6', dropdownAccent: '#5b21b6', dropdownActiveBg: '#ede9fe', dropdownActiveText: '#5b21b6' },
  sales:      { gradient: 'linear-gradient(135deg,#0369a1,#0891b2)', glow: 'rgba(8,145,178,0.28)', hoverBg: 'rgba(8,145,178,0.07)', hoverText: '#0369a1', dropdownAccent: '#0369a1', dropdownActiveBg: '#e0f2fe', dropdownActiveText: '#0369a1' },
  members:    { gradient: 'linear-gradient(135deg,#0f766e,#059669)', glow: 'rgba(5,150,105,0.26)', hoverBg: 'rgba(5,150,105,0.07)', hoverText: '#0f766e', dropdownAccent: '#0f766e', dropdownActiveBg: '#d1fae5', dropdownActiveText: '#065f46' },
  training:   { gradient: 'linear-gradient(135deg,#b45309,#d97706)', glow: 'rgba(217,119,6,0.26)', hoverBg: 'rgba(217,119,6,0.07)', hoverText: '#b45309', dropdownAccent: '#b45309', dropdownActiveBg: '#fef3c7', dropdownActiveText: '#92400e' },
  staff:      { gradient: 'linear-gradient(135deg,#3730a3,#4f46e5)', glow: 'rgba(79,70,229,0.28)', hoverBg: 'rgba(79,70,229,0.07)', hoverText: '#3730a3', dropdownAccent: '#3730a3', dropdownActiveBg: '#e0e7ff', dropdownActiveText: '#3730a3' },
  attendance: { gradient: 'linear-gradient(135deg,#be185d,#db2777)', glow: 'rgba(219,39,119,0.26)', hoverBg: 'rgba(219,39,119,0.07)', hoverText: '#be185d', dropdownAccent: '#be185d', dropdownActiveBg: '#fce7f3', dropdownActiveText: '#9d174d' },
  memberships:{ gradient: 'linear-gradient(135deg,#7c3aed,#a855f7)', glow: 'rgba(168,85,247,0.28)', hoverBg: 'rgba(168,85,247,0.07)', hoverText: '#7c3aed', dropdownAccent: '#7c3aed', dropdownActiveBg: '#f3e8ff', dropdownActiveText: '#6b21a8' },
  finance:    { gradient: 'linear-gradient(135deg,#1d4ed8,#2563eb)', glow: 'rgba(37,99,235,0.26)', hoverBg: 'rgba(37,99,235,0.07)', hoverText: '#1d4ed8', dropdownAccent: '#1d4ed8', dropdownActiveBg: '#dbeafe', dropdownActiveText: '#1e40af' },
  insights:   { gradient: 'linear-gradient(135deg,#0d9488,#06b6d4)', glow: 'rgba(6,182,212,0.26)', hoverBg: 'rgba(6,182,212,0.07)', hoverText: '#0d9488', dropdownAccent: '#0d9488', dropdownActiveBg: '#ccfbf1', dropdownActiveText: '#115e59' },
  engagement: { gradient: 'linear-gradient(135deg,#dc2626,#f97316)', glow: 'rgba(249,115,22,0.26)', hoverBg: 'rgba(249,115,22,0.07)', hoverText: '#dc2626', dropdownAccent: '#dc2626', dropdownActiveBg: '#fee2e2', dropdownActiveText: '#991b1b' },
  settings:   { gradient: 'linear-gradient(135deg,#475569,#64748b)', glow: 'rgba(100,116,139,0.22)', hoverBg: 'rgba(100,116,139,0.07)', hoverText: '#475569', dropdownAccent: '#475569', dropdownActiveBg: '#f1f5f9', dropdownActiveText: '#334155' },
};

const DEFAULT_COLOR = GROUP_COLORS.dashboard;

// Row 1 always gets the first ROW1_COUNT groups; everything else lands on row 2.
// Tweak this number if you add/remove groups later.
const ROW1_COUNT = 6;

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
    try { localStorage.setItem('619_theme', next); } catch {};
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
    })).filter((group) => {
      const g = NAV_GROUPS.find((ng) => ng.id === group.id);
      if (g?.roles?.length) {
        return !!user?.role && g.roles.includes(user.role as any);
      }
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

  // Always exactly 2 rows — first ROW1_COUNT groups on row 1, the rest on row 2
  const row1 = topGroups.slice(0, ROW1_COUNT);
  const row2 = topGroups.slice(ROW1_COUNT);

  const toggleMenu = (id: string) => setOpenMenu((c) => (c === id ? null : id));
  const handleResetPassword = () => { setOpenMenu(null); router.push('/reset-password'); };
  const handleLogout = () => { setOpenMenu(null); logout(); router.push('/login'); };

  const accountLabel = user?.name || '619 FITNESS STUDIO';
  const roleLabel = user?.role || 'admin';
  const initials = (user?.name || 'A').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();

  const renderGroup = (group: { id: string; label: string; items: typeof DASHBOARD_ITEM[] }) => {
    const active = group.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
    const opened = openMenu === group.id;
    const colors = GROUP_COLORS[group.id] ?? DEFAULT_COLOR;

    return (
      <div key={group.id} className="relative shrink-0">
        <button
          type="button"
          onClick={() => (group.items.length === 1 ? router.push(group.items[0].href) : toggleMenu(group.id))}
          aria-expanded={opened}
          style={active
            ? {
                background: colors.gradient,
                boxShadow: `0 4px 18px ${colors.glow}, 0 1px 3px ${colors.glow}`,
                transform: 'translateY(-1px)',
              }
            : undefined
          }
          className={cn(
            'group inline-flex h-[36px] items-center gap-1.5 whitespace-nowrap rounded-full px-[16px] text-[12.5px] font-semibold tracking-[0.01em] transition-all duration-200 ease-out',
            active ? 'text-white' : 'text-slate-500',
          )}
          onMouseEnter={(e) => {
            if (!active) {
              (e.currentTarget as HTMLButtonElement).style.background = colors.hoverBg;
              (e.currentTarget as HTMLButtonElement).style.color = colors.hoverText;
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 2px 10px ${colors.glow}`;
            }
          }}
          onMouseLeave={(e) => {
            if (!active) {
              (e.currentTarget as HTMLButtonElement).style.background = '';
              (e.currentTarget as HTMLButtonElement).style.color = '';
              (e.currentTarget as HTMLButtonElement).style.transform = '';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '';
            }
          }}
        >
          <span>{group.label}</span>
          {group.items.length > 1 && (
            <ChevronDown size={11} className={cn('shrink-0 opacity-70 transition-transform duration-200', opened && 'rotate-180')} />
          )}
        </button>

        {group.items.length > 1 && opened && (
          <div
            className="absolute left-0 top-[calc(100%+8px)] z-[120] min-w-[230px] overflow-hidden rounded-[20px] p-1.5 backdrop-blur-2xl"
            style={{
              background: 'rgba(255,255,255,0.92)',
              border: `1px solid ${colors.glow.replace('0.', '0.15')}`,
              boxShadow: `0 20px 50px rgba(15,23,42,0.10), 0 4px 16px ${colors.glow}, inset 0 1px 0 rgba(255,255,255,0.9)`,
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            {/* Colored top accent strip */}
            <div
              className="mb-1.5 h-[3px] w-full rounded-full"
              style={{ background: colors.gradient }}
            />
            {group.items.map((item) => {
              const itemActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <button
                  type="button"
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  style={itemActive ? { background: colors.dropdownActiveBg, color: colors.dropdownActiveText } : undefined}
                  className={cn(
                    'flex w-full items-center justify-between rounded-[13px] px-3.5 py-2.5 text-left text-[13px] font-semibold transition-all duration-150',
                    !itemActive && 'text-slate-600 hover:bg-slate-50/80 hover:text-slate-900',
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
    <>
      <style>{`
        @keyframes brand-glow {
          0%, 100% { box-shadow: 0 4px 16px rgba(109,40,217,0.13), inset 0 1px 0 rgba(255,255,255,0.9); }
          50%       { box-shadow: 0 4px 22px rgba(109,40,217,0.22), inset 0 1px 0 rgba(255,255,255,0.9); }
        }
        .logo-glow { animation: brand-glow 3.5s ease-in-out infinite; }
      `}</style>

      <header
        className="fixed inset-x-0 top-0 z-[100] border-b border-slate-200/80 bg-white/[0.97] backdrop-blur-2xl"
        style={{
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 1px 0 rgba(15,23,42,0.05), 0 4px 24px rgba(15,23,42,0.04)',
        }}
      >
        <div ref={headerRef} className="mx-auto flex w-full max-w-[1680px] flex-col px-4 pb-2 pt-3 sm:px-6 lg:px-8">
          <div className="flex items-start gap-4">

            {/* Mobile menu */}
            <button
              className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-all duration-150 hover:bg-slate-50 hover:shadow-md lg:hidden"
              onClick={onMenuClick}
              aria-label="Open navigation"
            >
              <Menu size={17} />
            </button>

            {/* Brand */}
            <div className="flex shrink-0 items-center gap-3">
              <div
                className="logo-glow relative flex h-[48px] w-[48px] shrink-0 items-center justify-center overflow-hidden rounded-[15px] border border-violet-200/60"
                style={{ background: 'linear-gradient(150deg, rgba(255,255,255,0.98) 0%, rgba(237,233,254,0.55) 100%)' }}
              >
                <img
                  src="/619-logo.png"
                  alt="619 Fitness Studio logo"
                  width={36}
                  height={36}
                  className="h-[36px] w-[36px] object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                    const fb = e.currentTarget.nextElementSibling as HTMLElement | null;
                    if (fb) fb.style.display = 'flex';
                  }}
                />
                <span
                  className="absolute hidden h-full w-full items-center justify-center rounded-[15px] text-[13px] font-black tracking-tight text-white"
                  style={{ background: 'linear-gradient(135deg,#5b21b6,#4f46e5)' }}
                >
                  619
                </span>
              </div>
              <div className="hidden select-none flex-col gap-[3px] sm:flex">
                <span
                  className="text-[15px] font-black leading-none tracking-[0.09em]"
                  style={{
                    background: 'linear-gradient(120deg,#1e1b4b 0%,#3730a3 40%,#6d28d9 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  619 FITNESS STUDIO
                </span>
                <span className="text-[9px] font-bold uppercase tracking-[0.30em] text-slate-400">Management OS</span>
              </div>
            </div>

            <div className="mx-1 hidden h-10 w-px self-center bg-gradient-to-b from-transparent via-slate-200 to-transparent lg:block" />

            {/* Nav — always exactly 2 rows */}
            <div className="hidden min-w-0 flex-1 flex-col gap-[2px] pt-[2px] lg:flex">
              {/* Row 1 */}
              <nav aria-label="Primary navigation" className="flex min-w-0 flex-nowrap items-center gap-1">
                {row1.map(renderGroup)}
              </nav>
              {/* Row 2 */}
              {row2.length > 0 && (
                <nav aria-label="Secondary navigation" className="flex min-w-0 flex-nowrap items-center gap-1 pl-1">
                  {row2.map(renderGroup)}
                </nav>
              )}
            </div>

            {/* Right utilities */}
            <div className="ml-auto flex shrink-0 items-start gap-2 pt-[2px]">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('619-cmd-palette'))}
                className="hidden h-[36px] w-[200px] items-center justify-between rounded-full border border-slate-200/90 bg-slate-50/80 px-3.5 text-[12px] text-slate-400 backdrop-blur-sm transition-all duration-150 hover:border-violet-200 hover:bg-white hover:text-slate-600 hover:shadow-[0_2px_12px_rgba(109,40,217,0.08)] xl:inline-flex"
              >
                <span className="flex items-center gap-2">
                  <Search size={12} className="shrink-0" />
                  <span>Search...</span>
                </span>
                <kbd className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 shadow-[0_1px_0_rgba(15,23,42,0.08)]">⌘K</kbd>
              </button>

              <button
                type="button"
                className="inline-flex h-[36px] w-[36px] items-center justify-center rounded-full border border-slate-200/90 bg-white/90 text-slate-500 backdrop-blur-sm transition-all duration-150 hover:border-violet-200/80 hover:text-violet-600 hover:shadow-[0_2px_10px_rgba(109,40,217,0.10)]"
                onClick={toggleTheme}
                aria-label="Toggle theme"
              >
                {hydrated ? (theme === 'light' ? <Moon size={14} /> : <Sun size={14} />) : <span style={{ width: 14 }} />}
              </button>

              <button
                type="button"
                className="relative inline-flex h-[36px] w-[36px] items-center justify-center rounded-full border border-slate-200/90 bg-white/90 text-slate-500 backdrop-blur-sm transition-all duration-150 hover:border-violet-200/80 hover:text-violet-600 hover:shadow-[0_2px_10px_rgba(109,40,217,0.10)]"
                aria-label="Notifications"
              >
                <Bell size={14} />
                <span className="absolute right-[9px] top-[9px] h-[6px] w-[6px] rounded-full bg-rose-500 ring-[1.5px] ring-white" />
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => toggleMenu('account')}
                  aria-expanded={openMenu === 'account'}
                  className="inline-flex h-[36px] items-center gap-2 rounded-full border border-slate-200/90 bg-white/90 pl-1.5 pr-3 backdrop-blur-sm transition-all duration-150 hover:border-violet-200/80 hover:shadow-[0_2px_10px_rgba(109,40,217,0.10)]"
                >
                  <div
                    className="flex h-[24px] w-[24px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-violet-100"
                    style={{ background: 'linear-gradient(135deg,#ede9fe,#e0e7ff)' }}
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
                    <span className="hidden h-full w-full items-center justify-center text-[10px] font-black text-violet-700">{initials}</span>
                  </div>
                  <div className="hidden text-left xl:block">
                    <div className="max-w-[140px] truncate text-[11.5px] font-bold leading-none text-slate-900">{accountLabel}</div>
                    <div className="mt-0.5 text-[10px] lowercase tracking-wide text-slate-400">{roleLabel}</div>
                  </div>
                  <ChevronDown size={11} className={cn('text-slate-400 transition-transform duration-200', openMenu === 'account' && 'rotate-180')} />
                </button>

                {openMenu === 'account' && (
                  <div
                    className="absolute right-0 top-[calc(100%+8px)] z-[130] w-[220px] overflow-hidden rounded-[18px] border border-slate-200/70 bg-white/95 p-1.5 backdrop-blur-2xl"
                    style={{ boxShadow: '0 20px 60px rgba(15,23,42,0.10), 0 4px 16px rgba(15,23,42,0.06)', WebkitBackdropFilter: 'blur(20px)' }}
                  >
                    <button
                      type="button"
                      onClick={handleResetPassword}
                      className="flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-[13px] font-semibold text-slate-700 transition-all hover:bg-slate-50"
                    >
                      <KeyRound size={14} className="text-violet-600" />
                      Reset password
                    </button>
                    <div className="mx-2 my-1 h-px bg-slate-100" />
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-[13px] font-semibold text-rose-600 transition-all hover:bg-rose-50"
                    >
                      <LogOut size={14} />
                      Log out
                    </button>
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
