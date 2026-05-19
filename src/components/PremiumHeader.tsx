'use client';
// ─────────────────────────────────────────────────────────────
// 619 FITNESS STUDIO — Premium Light Glassmorphic Navbar
// Design language: Apple × Linear × Vercel × Stripe
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
} from 'framer-motion';
import {
  Bell,
  BarChart3,
  ChevronDown,
  CreditCard,
  LayoutDashboard,
  LogOut,
  BellRing,
  Search,
  Settings,
  TrendingUp,
  User,
  Users,
  Wallet,
  Wrench,
  Menu,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/components/ui';

// ─── Nav items ────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'dashboard',  label: 'Dashboard',  href: '/dashboard',  icon: LayoutDashboard },
  { id: 'sales',      label: 'Sales',      href: '/sales',      icon: TrendingUp },
  { id: 'members',    label: 'Members',    href: '/clients',    icon: Users },
  { id: 'operations', label: 'Operations', href: '/operations', icon: Wrench },
  { id: 'finance',    label: 'Finance',    href: '/finance',    icon: Wallet },
  { id: 'analytics',  label: 'Analytics',  href: '/insights',   icon: BarChart3 },
] as const;

const DROPDOWN_ITEMS = [
  { id: 'profile',       label: 'Profile',          icon: User,       href: '/profile' },
  { id: 'settings',      label: 'Studio Settings',  icon: Settings,   href: '/settings', shortcut: '⌘,' },
  { id: 'notifications', label: 'Notifications',    icon: BellRing,   href: '/settings/notifications' },
  { id: 'billing',       label: 'Billing',          icon: CreditCard, href: '/billing' },
] as const;

// ─── Glass style tokens ───────────────────────────────────────
const G = {
  nav: {
    bg:     'rgba(250,250,249,0.72)',
    bgSc:   'rgba(250,250,249,0.90)',
    border: '1px solid rgba(255,255,255,0.50)',
    borSc:  '1px solid rgba(255,255,255,0.65)',
    blur:   'blur(20px) saturate(180%)',
    blurSc: 'blur(28px) saturate(200%)',
    shadow: '0 1px 0 rgba(255,255,255,0.65) inset, 0 4px 24px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)',
    shadowSc:'0 1px 0 rgba(255,255,255,0.70) inset, 0 8px 32px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.08)',
  },
  pill: {
    bg:     'rgba(255,255,255,0.95)',
    shadow: '0 1px 8px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05)',
  },
  drop: {
    bg:     'rgba(255,255,255,0.92)',
    blur:   'blur(24px) saturate(160%)',
    border: '1px solid rgba(255,255,255,0.70)',
    shadow: '0 8px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
  },
  search: {
    bg:    'rgba(0,0,0,0.04)',
    bdr:   '1px solid rgba(0,0,0,0.08)',
    bgF:   'rgba(255,255,255,0.90)',
    bdrF:  '1px solid rgba(196,30,58,0.28)',
    shdF:  '0 0 0 3px rgba(196,30,58,0.09)',
  },
} as const;

const SP = {
  pill:  { type: 'spring' as const, stiffness: 380, damping: 32, mass: 0.8 },
  drop:  { type: 'spring' as const, stiffness: 400, damping: 28 },
  badge: { type: 'spring' as const, stiffness: 500, damping: 22 },
  sz:    { type: 'spring' as const, stiffness: 260, damping: 26 },
} as const;

// ─── Props ────────────────────────────────────────────────────
interface Props { onMenuClick?: () => void; }

// ─── Component ───────────────────────────────────────────────
export default function PremiumHeader({ onMenuClick }: Props) {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, logout } = useAuth();

  const [scrolled,      setScrolled]      = useState(false);
  const [adminOpen,     setAdminOpen]     = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [unreadCount]                     = useState(3);

  const adminRef  = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, 'change', (v) => setScrolled(v > 20));

  // ⌘K → focus search
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    const out = (e: MouseEvent) => {
      if (adminRef.current && !adminRef.current.contains(e.target as Node))
        setAdminOpen(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAdminOpen(false); };
    document.addEventListener('mousedown', out);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', out);
      document.removeEventListener('keydown', esc);
    };
  }, []);

  // Close on route change
  useEffect(() => setAdminOpen(false), [pathname]);

  const activeId = NAV_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(item.href + '/')
  )?.id;

  const handleLogout = async () => {
    setAdminOpen(false);
    await logout();
    router.push('/login');
  };

  const sc = scrolled;

  return (
    <motion.header
      layout
      animate={{ height: sc ? 56 : 64 }}
      transition={SP.sz}
      className="sticky top-0 z-50 w-full overflow-visible"
      style={{
        background:          sc ? G.nav.bgSc   : G.nav.bg,
        backdropFilter:      sc ? G.nav.blurSc : G.nav.blur,
        WebkitBackdropFilter:sc ? G.nav.blurSc : G.nav.blur,
        borderBottom:        sc ? G.nav.borSc  : G.nav.border,
        boxShadow:           sc ? G.nav.shadowSc : G.nav.shadow,
      }}
    >
      <div className="mx-auto flex h-full max-w-[1600px] items-center gap-3 px-5 sm:px-6">

        {/* ── Mobile hamburger ─────────────────────────────── */}
        <button
          type="button"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#6B6A67] lg:hidden"
          style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.07)' }}
          onClick={onMenuClick}
          aria-label="Open navigation"
        >
          <Menu size={15} />
        </button>

        {/* ── Brand ────────────────────────────────────────── */}
        <Link
          href="/dashboard"
          className="group flex shrink-0 select-none items-center gap-2.5"
          aria-label="619 Fitness Studio — Home"
        >
          {/* Logo ring */}
          <div
            className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl"
            style={{
              width: 34, height: 34,
              background: 'rgba(196,30,58,0.08)',
              boxShadow: '0 0 0 1px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.08)',
            }}
          >
            <svg viewBox="0 0 34 38" fill="none" className="h-[26px] w-[26px]" aria-hidden="true">
              <path d="M17 2L30 8L30 22C30 30 24 36 17 38C10 36 4 30 4 22L4 8Z" fill="#B91C1C" stroke="#DC2626" strokeWidth="0.8"/>
              <path d="M13.5 21C11.8 15.5 9 11.5 11 8C12.8 5 16 4 17 3" stroke="rgba(255,255,255,0.65)" strokeWidth="1.1" strokeLinecap="round"/>
              <path d="M20.5 21C22.2 15.5 25 11.5 23 8C21.2 5 18 4 17 3" stroke="rgba(255,255,255,0.65)" strokeWidth="1.1" strokeLinecap="round"/>
              <path d="M17 35C15.2 29.5 14.5 23.5 15.8 19C16.8 15 19 12 17 8.5C20 12 20.8 17.5 19.3 21.5C21.5 17 21.5 11.5 20 7C23.5 12.5 22.5 20 20.5 26C22.8 22.5 24 19.5 23 16C25 21 23.5 28.5 20 31.5C19 33.5 18 34.5 17 35.5C16 34.5 15 33.5 14 31.5C10.5 28.5 9 21 11 16C10 19.5 11.2 22.5 13.5 26C11.5 20 10.5 12.5 14 7C12.5 11.5 12.5 17 14.7 21.5C13.2 17.5 14 12 17 8.5Z" fill="rgba(255,80,50,0.40)" stroke="rgba(255,140,80,0.35)" strokeWidth="0.5"/>
              <text x="17" y="28" textAnchor="middle" fill="#fff" fontSize="7.5" fontWeight="800" fontFamily="system-ui,sans-serif">619</text>
            </svg>
          </div>

          {/* Name + subtitle */}
          <div className="hidden flex-col leading-none sm:flex">
            <span
              className="font-semibold text-[#1A1916] transition-opacity group-hover:opacity-80"
              style={{ fontSize: 13, letterSpacing: '-0.02em', fontFeatureSettings: '"cv01" 1, "cv11" 1' }}
            >
              619 FITNESS STUDIO
            </span>
            <span
              className="mt-0.5 font-medium text-[#9E9D9A]"
              style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase' }}
            >
              Management OS
            </span>
          </div>
        </Link>

        {/* ── Spacer ───────────────────────────────────────── */}
        <div className="flex-1" />

        {/* ── Center Nav ───────────────────────────────────── */}
        <nav
          className="relative hidden items-center gap-0.5 lg:flex"
          aria-label="Primary navigation"
        >
          {NAV_ITEMS.map((item) => {
            const active = activeId === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                title={item.label}
                className={cn(
                  'relative flex cursor-pointer select-none items-center rounded-lg px-3 py-1.5 text-[13px] transition-colors duration-100',
                  active
                    ? 'z-10 font-semibold text-[#1A1916]'
                    : 'font-medium text-[#6B6A67] hover:text-[#1A1916]',
                )}
                style={{ letterSpacing: '-0.01em', fontFeatureSettings: '"cv01" 1' }}
              >
                {/* Floating active pill */}
                {active && (
                  <motion.span
                    layoutId="nav-pill-619"
                    className="absolute inset-0 rounded-lg"
                    style={{ background: G.pill.bg, boxShadow: G.pill.shadow }}
                    transition={SP.pill}
                    aria-hidden="true"
                  />
                )}

                {/* Hover bg */}
                <motion.span
                  className="absolute inset-0 rounded-lg"
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: active ? 0 : 1 }}
                  style={{ background: 'rgba(0,0,0,0.04)' }}
                  transition={{ duration: 0.12 }}
                  aria-hidden="true"
                />

                <span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* ── Spacer ───────────────────────────────────────── */}
        <div className="flex-1" />

        {/* ── Right actions ────────────────────────────────── */}
        <div className="flex shrink-0 items-center gap-1.5">

          {/* Search bar */}
          <motion.div
            className="hidden items-center gap-2 md:flex"
            animate={{ width: searchFocused ? 256 : 192 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{
              background:   searchFocused ? G.search.bgF  : G.search.bg,
              border:       searchFocused ? G.search.bdrF : G.search.bdr,
              boxShadow:    searchFocused ? G.search.shdF : 'none',
              height: 34,
              borderRadius: 10,
              overflow: 'hidden',
              paddingLeft: 10,
              paddingRight: 10,
              transition: 'background 0.15s, border 0.15s, box-shadow 0.15s',
            }}
          >
            <Search
              size={13}
              style={{
                color: searchFocused ? '#C41E3A' : '#9E9D9A',
                flexShrink: 0,
                transition: 'color 0.15s',
              }}
            />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search..."
              className="min-w-0 flex-1 bg-transparent text-[13px] text-[#1A1916] outline-none placeholder:text-[#9E9D9A]"
              style={{ fontFeatureSettings: '"cv01" 1' }}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            <AnimatePresence>
              {!searchFocused && (
                <motion.kbd
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.12 }}
                  className="flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-medium text-[#9E9D9A]"
                  style={{ background: 'rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.10)' }}
                >
                  ⌘K
                </motion.kbd>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Notification bell */}
          <motion.button
            type="button"
            className="relative flex items-center justify-center rounded-lg text-[#3A3936]"
            style={{
              width: 34, height: 34,
              background: 'rgba(0,0,0,0.04)',
              border: '1px solid rgba(0,0,0,0.06)',
            }}
            whileHover={{ background: 'rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
            whileTap={{ scale: 0.93 }}
            transition={{ duration: 0.12 }}
            title={`${unreadCount} unread notifications`}
            aria-label={`Notifications — ${unreadCount} unread`}
          >
            <Bell size={15} />
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={SP.badge}
                className="absolute"
                style={{ top: 0, right: 0 }}
                aria-hidden="true"
              >
                <motion.span
                  className="absolute block rounded-full"
                  style={{ width: 7, height: 7, background: '#C41E3A', top: -1, right: -1 }}
                  animate={{ scale: [1, 1.9, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ repeat: Infinity, duration: 2.2, ease: 'easeOut' }}
                />
                <span
                  className="relative block rounded-full"
                  style={{ width: 7, height: 7, background: '#C41E3A', border: '1.5px solid white', top: -1, right: -1 }}
                />
              </motion.span>
            )}
          </motion.button>

          {/* Divider */}
          <span
            className="mx-0.5 hidden h-5 w-px sm:block"
            style={{ background: 'rgba(0,0,0,0.10)' }}
            aria-hidden="true"
          />

          {/* Admin dropdown */}
          <div className="relative" ref={adminRef}>
            <motion.button
              type="button"
              className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-[#1A1916]"
              whileHover={{ background: 'rgba(0,0,0,0.05)' }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.12 }}
              onClick={() => setAdminOpen((o) => !o)}
              aria-haspopup="true"
              aria-expanded={adminOpen}
            >
              {/* Avatar */}
              <div
                className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full"
                style={{
                  width: 28, height: 28,
                  background: 'rgba(196,30,58,0.10)',
                  border: '1.5px solid rgba(196,30,58,0.22)',
                }}
              >
                <svg viewBox="0 0 28 28" fill="none" className="h-full w-full" aria-hidden="true">
                  <text x="14" y="19" textAnchor="middle" fill="#B91C1C" fontSize="7" fontWeight="800" fontFamily="system-ui,sans-serif">619</text>
                </svg>
              </div>

              {/* Name */}
              <span
                className="hidden text-[12.5px] font-medium text-[#3A3936] sm:block"
                style={{ letterSpacing: '-0.01em', fontFeatureSettings: '"cv01" 1' }}
              >
                {user?.name || 'Admin'}
              </span>

              {/* Role badge */}
              <span
                className="hidden rounded-full px-1.5 py-0.5 text-[10px] font-medium text-[#C41E3A] sm:block"
                style={{ background: 'rgba(196,30,58,0.09)', letterSpacing: '0.01em' }}
              >
                Admin
              </span>

              {/* Chevron */}
              <motion.span
                animate={{ rotate: adminOpen ? 180 : 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                className="text-[#9E9D9A]"
              >
                <ChevronDown size={13} />
              </motion.span>
            </motion.button>

            {/* Dropdown panel */}
            <AnimatePresence>
              {adminOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.94, y: -8, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, scale: 1,    y: 0,  filter: 'blur(0px)' }}
                  exit={{    opacity: 0, scale: 0.97, y: -4, filter: 'blur(2px)' }}
                  transition={SP.drop}
                  className="absolute right-0 top-full mt-2 min-w-[224px] overflow-hidden rounded-2xl"
                  style={{
                    background: G.drop.bg,
                    backdropFilter: G.drop.blur,
                    WebkitBackdropFilter: G.drop.blur,
                    border: G.drop.border,
                    boxShadow: G.drop.shadow,
                    transformOrigin: 'top right',
                  }}
                  role="menu"
                >
                  {/* Profile header */}
                  <div
                    className="flex items-center gap-3 px-4 py-3"
                    style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', background: 'rgba(0,0,0,0.02)' }}
                  >
                    <div
                      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full"
                      style={{ width: 36, height: 36, background: 'rgba(196,30,58,0.10)', border: '1.5px solid rgba(196,30,58,0.20)' }}
                    >
                      <svg viewBox="0 0 36 36" fill="none" className="h-full w-full" aria-hidden="true">
                        <text x="18" y="23" textAnchor="middle" fill="#B91C1C" fontSize="9" fontWeight="800" fontFamily="system-ui,sans-serif">619</text>
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-[#1A1916]" style={{ letterSpacing: '-0.01em' }}>
                        {user?.name || 'Admin User'}
                      </p>
                      <p className="truncate text-[11px] text-[#9E9D9A]">
                        {user?.email || 'admin@619fitness.com'}
                      </p>
                    </div>
                  </div>

                  {/* Menu items */}
                  <div className="p-1.5">
                    {DROPDOWN_ITEMS.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.id}
                          href={item.href}
                          role="menuitem"
                          className="flex items-center justify-between rounded-lg px-2.5 py-[7px] text-[#3A3936] outline-none transition-colors hover:bg-black/[0.05]"
                          style={{ fontSize: 13, fontFeatureSettings: '"cv01" 1' }}
                          onClick={() => setAdminOpen(false)}
                        >
                          <span className="flex items-center gap-2.5">
                            <Icon size={14} className="text-[#6B6A67]" />
                            {item.label}
                          </span>
                          {'shortcut' in item && item.shortcut && (
                            <kbd
                              className="rounded px-1 py-0.5 text-[10px] text-[#9E9D9A]"
                              style={{ background: 'rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.09)' }}
                            >
                              {item.shortcut}
                            </kbd>
                          )}
                        </Link>
                      );
                    })}

                    {/* Divider */}
                    <div className="my-1.5 h-px" style={{ background: 'rgba(0,0,0,0.06)' }} />

                    {/* Logout */}
                    <motion.button
                      type="button"
                      role="menuitem"
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[#C41E3A] outline-none"
                      style={{ fontSize: 13, fontFeatureSettings: '"cv01" 1' }}
                      whileHover={{ background: 'rgba(196,30,58,0.08)' }}
                      transition={{ duration: 0.1 }}
                      onClick={handleLogout}
                    >
                      <LogOut size={14} />
                      Logout
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
