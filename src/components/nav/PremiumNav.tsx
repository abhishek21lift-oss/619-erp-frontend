'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  Dumbbell,
  UserCog,
  ClipboardCheck,
  CreditCard,
  BarChart3,
  Lightbulb,
  MessageSquare,
  Settings,
  Bell,
  Search,
  ChevronDown,
  LogOut,
  User,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import NotificationBell from '@/components/NotificationBell';

// ─── Nav items ────────────────────────────────────────────────────────────────

const PRIMARY_NAV = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Sales',     href: '/payments',  icon: TrendingUp },
  { label: 'Members',  href: '/clients',   icon: Users },
  { label: 'Trainers', href: '/trainers',  icon: Dumbbell },
  { label: 'Staff',    href: '/staff',     icon: UserCog },
];

const SECONDARY_NAV = [
  { label: 'Attendance',   href: '/attendance',  icon: ClipboardCheck },
  { label: 'Memberships',  href: '/memberships/subscriptions', icon: CreditCard },
  { label: 'Finance',      href: '/finance/collection', icon: BarChart3 },
  { label: 'Insights',     href: '/insights/traffic', icon: Lightbulb },
  { label: 'Engagement',   href: '/engagement/campaigns', icon: MessageSquare },
  { label: 'Settings',     href: '/settings',   icon: Settings },
];

const ALL_NAV = [...PRIMARY_NAV, ...SECONDARY_NAV];

// ─── helpers ─────────────────────────────────────────────────────────────────

function isActive(href: string, pathname: string) {
  if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/';
  return pathname.startsWith(href);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function PremiumNav() {
  const pathname  = usePathname();
  const router    = useRouter();
  const { user, logout } = useAuth();

  const [scrolled,      setScrolled]      = useState(false);
  const [profileOpen,   setProfileOpen]   = useState(false);
  const [moreOpen,      setMoreOpen]      = useState(false);
  const [searchOpen,    setSearchOpen]    = useState(false);
  const [searchQuery,   setSearchQuery]   = useState('');

  const profileRef  = useRef<HTMLDivElement>(null);
  const moreRef     = useRef<HTMLDivElement>(null);
  const searchRef   = useRef<HTMLInputElement>(null);

  // ── scroll detection ──────────────────────────────────────────────────────
  useEffect(() => {
    const el = document.getElementById('main-scroll');
    const target = el ?? window;
    const onScroll = () => {
      const y = el ? el.scrollTop : window.scrollY;
      setScrolled(y > 8);
    };
    target.addEventListener('scroll', onScroll, { passive: true });
    return () => target.removeEventListener('scroll', onScroll);
  }, []);

  // ── close dropdowns on outside click ─────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (moreRef.current    && !moreRef.current.contains(e.target as Node))    setMoreOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Cmd+K search shortcut ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(v => !v);
        if (!searchOpen) setTimeout(() => searchRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [searchOpen]);

  // ── search results ────────────────────────────────────────────────────────
  const searchResults = searchQuery.trim().length > 0
    ? ALL_NAV.filter(n => n.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  // ── active section label ──────────────────────────────────────────────────
  const activeItem = ALL_NAV.find(n => isActive(n.href, pathname));

  // ── avatar initials ───────────────────────────────────────────────────────
  const initials = user?.name
    ? user.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : 'OS';

  return (
    <>
      {/* ══ Navbar ══════════════════════════════════════════════════════════ */}
      <header
        className={[
          'fixed top-0 left-0 right-0 z-50',
          'transition-all duration-300 ease-out',
          scrolled
            ? 'bg-[#0a0a0b]/90 backdrop-blur-xl border-b border-white/[0.06] shadow-[0_1px_0_0_rgba(255,255,255,0.04)]'
            : 'bg-transparent',
        ].join(' ')}
        style={{ height: 56 }}
      >
        <div className="max-w-[1440px] mx-auto h-full px-4 md:px-6 flex items-center gap-3">

          {/* ── Logo / Brand ─────────────────────────────────────────────── */}
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 shrink-0 group mr-2"
            aria-label="619 Fitness Studio — Home"
          >
            {/* Monogram mark */}
            <span
              className="flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black tracking-tighter select-none"
              style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 60%, #c026d3 100%)',
                boxShadow: '0 0 12px rgba(139,92,246,0.4)',
                fontFamily: 'Inter, sans-serif',
                color: '#fff',
              }}
            >
              619
            </span>
            <span className="hidden sm:block text-[13px] font-semibold tracking-tight text-white/80 group-hover:text-white transition-colors duration-200">
              Fitness OS
            </span>
          </button>

          {/* ── Divider ──────────────────────────────────────────────────── */}
          <div className="hidden md:block w-px h-4 bg-white/10 mx-1" />

          {/* ── Primary Nav Items ─────────────────────────────────────────── */}
          <nav className="hidden md:flex items-center gap-0.5 flex-1 min-w-0" aria-label="Primary navigation">
            {PRIMARY_NAV.map(({ label, href, icon: Icon }) => {
              const active = isActive(href, pathname);
              return (
                <button
                  key={href}
                  onClick={() => router.push(href)}
                  className={[
                    'relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-all duration-200 group',
                    active
                      ? 'text-white'
                      : 'text-white/50 hover:text-white/80 hover:bg-white/[0.06]',
                  ].join(' ')}
                >
                  {active && (
                    <span
                      className="absolute inset-0 rounded-md"
                      style={{
                        background: 'linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(168,85,247,0.10) 100%)',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
                      }}
                    />
                  )}
                  <Icon size={13} className="relative z-10 shrink-0" strokeWidth={active ? 2.2 : 1.8} />
                  <span className="relative z-10">{label}</span>
                  {active && (
                    <span
                      className="absolute bottom-0 left-3 right-3 h-px rounded-full"
                      style={{ background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.7), transparent)' }}
                    />
                  )}
                </button>
              );
            })}

            {/* ── More dropdown ─────────────────────────────────────────── */}
            <div className="relative" ref={moreRef}>
              <button
                onClick={() => setMoreOpen(v => !v)}
                className={[
                  'flex items-center gap-1 px-3 py-1.5 rounded-md text-[13px] font-medium transition-all duration-200',
                  SECONDARY_NAV.some(n => isActive(n.href, pathname))
                    ? 'text-white'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/[0.06]',
                  moreOpen ? 'bg-white/[0.06] text-white/80' : '',
                ].join(' ')}
                aria-haspopup="true"
                aria-expanded={moreOpen}
              >
                More
                <ChevronDown
                  size={11}
                  className="transition-transform duration-200"
                  style={{ transform: moreOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
              </button>

              {moreOpen && (
                <div
                  className="absolute top-[calc(100%+6px)] left-0 w-52 rounded-xl overflow-hidden"
                  style={{
                    background: 'rgba(18,18,22,0.96)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4)',
                    animation: 'dropdownIn 0.15s ease-out',
                  }}
                >
                  <div className="p-1.5">
                    {SECONDARY_NAV.map(({ label, href, icon: Icon }) => {
                      const active = isActive(href, pathname);
                      return (
                        <button
                          key={href}
                          onClick={() => { router.push(href); setMoreOpen(false); }}
                          className={[
                            'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 text-left',
                            active
                              ? 'bg-purple-500/20 text-white'
                              : 'text-white/50 hover:bg-white/[0.06] hover:text-white/80',
                          ].join(' ')}
                        >
                          <Icon size={13} strokeWidth={active ? 2.2 : 1.8} className="shrink-0" />
                          {label}
                          {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-400" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* ── Right Side Actions ────────────────────────────────────────── */}
          <div className="flex items-center gap-1 ml-auto shrink-0">

            {/* Search */}
            <button
              onClick={() => { setSearchOpen(v => !v); setTimeout(() => searchRef.current?.focus(), 50); }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-all duration-200 text-[12px] font-medium"
              aria-label="Search (⌘K)"
            >
              <Search size={13} strokeWidth={1.8} />
              <span className="hidden lg:block">Search</span>
              <kbd className="hidden lg:flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] text-white/25 bg-white/[0.04] border border-white/[0.07] font-mono">
                ⌘K
              </kbd>
            </button>

            {/* Notifications */}
            <NotificationBell />

            {/* Profile */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(v => !v)}
                className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-lg hover:bg-white/[0.06] transition-all duration-200 group"
                aria-label="Profile menu"
                aria-haspopup="true"
                aria-expanded={profileOpen}
              >
                <span
                  className="flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold text-white shrink-0"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
                >
                  {initials}
                </span>
                <span className="hidden lg:block text-[12px] font-medium text-white/60 group-hover:text-white/80 transition-colors max-w-[100px] truncate">
                  {user?.name ?? 'Admin'}
                </span>
                <ChevronDown
                  size={11}
                  className="hidden lg:block text-white/30 transition-transform duration-200"
                  style={{ transform: profileOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
              </button>

              {profileOpen && (
                <div
                  className="absolute top-[calc(100%+8px)] right-0 w-56 rounded-xl overflow-hidden"
                  style={{
                    background: 'rgba(18,18,22,0.96)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
                    animation: 'dropdownIn 0.15s ease-out',
                  }}
                >
                  {/* Profile header */}
                  <div className="px-4 py-3 border-b border-white/[0.06]">
                    <p className="text-[13px] font-semibold text-white truncate">{user?.name ?? 'Admin'}</p>
                    <p className="text-[11px] text-white/40 mt-0.5 truncate">{user?.email ?? '619fitnessstudio.in'}</p>
                  </div>

                  <div className="p-1.5">
                    <button
                      onClick={() => { router.push('/settings'); setProfileOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-white/50 hover:bg-white/[0.06] hover:text-white/80 transition-all duration-150"
                    >
                      <User size={13} />
                      Profile & Settings
                    </button>
                    <button
                      onClick={() => { setProfileOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-white/50 hover:bg-white/[0.06] hover:text-white/80 transition-all duration-150"
                    >
                      <Zap size={13} />
                      Quick Actions
                      <kbd className="ml-auto text-[10px] text-white/20 font-mono">⌘K</kbd>
                    </button>
                  </div>

                  <div className="p-1.5 border-t border-white/[0.06]">
                    <button
                      onClick={() => { logout?.(); setProfileOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-all duration-150"
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
      </header>

      {/* ══ Search overlay ══════════════════════════════════════════════════ */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center pt-[20vh]"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', animation: 'fadeIn 0.12s ease-out' }}
          onClick={(e) => { if (e.target === e.currentTarget) { setSearchOpen(false); setSearchQuery(''); } }}
        >
          <div
            className="w-full max-w-xl mx-4 rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(18,18,22,0.98)',
              border: '1px solid rgba(255,255,255,0.10)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(139,92,246,0.15)',
              animation: 'searchIn 0.18s cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.06]">
              <Search size={15} className="text-white/30 shrink-0" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search pages, members, actions…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-[14px] text-white placeholder-white/25 outline-none"
                onKeyDown={e => {
                  if (e.key === 'Enter' && searchResults.length > 0) {
                    router.push(searchResults[0].href);
                    setSearchOpen(false);
                    setSearchQuery('');
                  }
                }}
              />
              <kbd className="text-[11px] text-white/20 font-mono">Esc</kbd>
            </div>

            {searchResults.length > 0 ? (
              <div className="p-1.5">
                {searchResults.map(({ label, href, icon: Icon }) => (
                  <button
                    key={href}
                    onClick={() => { router.push(href); setSearchOpen(false); setSearchQuery(''); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-white/60 hover:bg-white/[0.06] hover:text-white/90 transition-all duration-150 text-left"
                  >
                    <Icon size={14} className="text-purple-400/70 shrink-0" />
                    {label}
                  </button>
                ))}
              </div>
            ) : searchQuery.trim().length > 0 ? (
              <p className="px-4 py-4 text-[13px] text-white/25">No results for "{searchQuery}"</p>
            ) : (
              <div className="p-2">
                <p className="px-3 py-2 text-[11px] text-white/20 uppercase tracking-wider font-medium">Quick Nav</p>
                {PRIMARY_NAV.slice(0,5).map(({ label, href, icon: Icon }) => (
                  <button
                    key={href}
                    onClick={() => { router.push(href); setSearchOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-white/50 hover:bg-white/[0.06] hover:text-white/80 transition-all duration-150 text-left"
                  >
                    <Icon size={14} className="text-white/25 shrink-0" />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ Mobile Bottom Nav ═══════════════════════════════════════════════ */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 py-1"
        style={{
          background: 'rgba(10,10,11,0.96)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          paddingBottom: 'env(safe-area-inset-bottom, 8px)',
        }}
        aria-label="Mobile navigation"
      >
        {PRIMARY_NAV.map(({ label, href, icon: Icon }) => {
          const active = isActive(href, pathname);
          return (
            <button
              key={href}
              onClick={() => router.push(href)}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[48px]"
              style={active ? { color: '#a855f7' } : { color: 'rgba(255,255,255,0.35)' }}
              aria-label={label}
            >
              <Icon size={18} strokeWidth={active ? 2.2 : 1.6} />
              <span className="text-[9px] font-medium">{label}</span>
            </button>
          );
        })}
        {/* More on mobile */}
        <button
          onClick={() => setMoreOpen(v => !v)}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[48px]"
          style={SECONDARY_NAV.some(n => isActive(n.href, pathname)) ? { color: '#a855f7' } : { color: 'rgba(255,255,255,0.35)' }}
          aria-label="More navigation"
        >
          <ChevronDown size={18} strokeWidth={1.6} />
          <span className="text-[9px] font-medium">More</span>
        </button>
      </nav>

      {/* Mobile more sheet */}
      {moreOpen && (
        <div
          className="md:hidden fixed inset-0 z-[55]"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="absolute bottom-[60px] left-2 right-2 rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(14,14,18,0.98)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
              animation: 'slideUp 0.2s cubic-bezier(0.16,1,0.3,1)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="p-3 grid grid-cols-3 gap-1">
              {SECONDARY_NAV.map(({ label, href, icon: Icon }) => {
                const active = isActive(href, pathname);
                return (
                  <button
                    key={href}
                    onClick={() => { router.push(href); setMoreOpen(false); }}
                    className={[
                      'flex flex-col items-center gap-1.5 p-3 rounded-xl text-[11px] font-medium transition-all duration-150',
                      active ? 'bg-purple-500/20 text-purple-300' : 'text-white/40 hover:bg-white/[0.06] hover:text-white/70',
                    ].join(' ')}
                  >
                    <Icon size={16} strokeWidth={active ? 2.2 : 1.6} />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══ Keyframe styles ════════════════════════════════════════════════ */}
      <style>{`
        @keyframes dropdownIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes searchIn {
          from { opacity: 0; transform: translateY(-12px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)     scale(1);    }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}</style>
    </>
  );
}
