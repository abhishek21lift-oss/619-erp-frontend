'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

// ─── Lucide-style inline SVG icons (zero dependency) ───────────────────────
const Icon = ({ d, size = 20 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const icons: Record<string, string> = {
  dashboard:   'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
  sales:       'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  members:     'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  training:    'M6.5 6.5a6 6 0 0 1 8.485.015M17.5 17.5a6 6 0 0 1-8.485-.015 M2 12h2 M20 12h2 M12 2v2 M12 20v2',
  staff:       'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  attendance:  'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  memberships: 'M20 12V22H4V12 M22 7H2v5h20V7z M12 22V7 M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z',
  finance:     'M3 3h18v18H3z M3 9h18 M9 21V9',
  insights:    'M22 12h-4l-3 9L9 3l-3 9H2',
  engagement:  'M18 20.94c-3.61-.9-6-4.23-6-8.94s2.39-8.04 6-8.94 M8 8H4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h1l4 6V2L5 8z',
  settings:    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  chevronLeft: 'M15 18l-6-6 6-6',
  chevronRight:'M9 18l6-6-6-6',
  logout:      'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
  ptportal:    'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
};

// ─── Nav structure ──────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { label: 'Dashboard',   href: '/',             icon: 'dashboard'    },
  { label: 'Sales',       href: '/sales',        icon: 'sales'        },
  { label: 'Members',     href: '/members',      icon: 'members'      },
  { label: 'Training',    href: '/training',     icon: 'training'     },
  { label: 'Staff',       href: '/settings/staff', icon: 'staff'      },
  { label: 'Attendance',  href: '/attendance',   icon: 'attendance'   },
  { label: 'Memberships', href: '/memberships',  icon: 'memberships'  },
  { label: 'Finance',     href: '/finance',      icon: 'finance'      },
  { label: 'Insights',    href: '/insights',     icon: 'insights'     },
  { label: 'Engagement',  href: '/engagement',   icon: 'engagement'   },
  { label: 'Settings',    href: '/settings',     icon: 'settings'     },
];

// ─── Types ──────────────────────────────────────────────────────────────────
interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Close on outside click (mobile)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (mobileOpen && sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        onMobileClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [mobileOpen, onMobileClose]);

  // Lock body scroll when mobile drawer open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const initials = user?.name?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || 'GY';
  const role = (user as any)?.role || 'Admin';

  return (
    <>
      {/* ── Mobile backdrop ── */}
      <div
        className={`lsb-backdrop ${mobileOpen ? 'lsb-backdrop--visible' : ''}`}
        onClick={onMobileClose}
        aria-hidden="true"
      />

      {/* ── Sidebar panel ── */}
      <aside
        ref={sidebarRef}
        className={`lsb ${
          collapsed ? 'lsb--collapsed' : 'lsb--expanded'
        } ${mobileOpen ? 'lsb--mobile-open' : ''}`}
        aria-label="Main navigation"
      >
        {/* ─ Gradient orbs (decorative) ─ */}
        <div className="lsb-orb lsb-orb--1" aria-hidden="true" />
        <div className="lsb-orb lsb-orb--2" aria-hidden="true" />

        {/* ─ Brand header ─ */}
        <div className="lsb-brand">
          <div className="lsb-logo-wrap">
            {/* 619 Shield SVG mark */}
            <svg viewBox="0 0 40 40" fill="none" className="lsb-logo-svg" aria-hidden="true">
              <defs>
                <linearGradient id="lgBrand" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#a78bfa" />
                  <stop offset="1" stopColor="#6366f1" />
                </linearGradient>
              </defs>
              {/* Shield shape */}
              <path d="M20 3 L34 9 L34 22 Q34 32 20 37 Q6 32 6 22 L6 9 Z"
                    fill="url(#lgBrand)" opacity="0.15" />
              <path d="M20 3 L34 9 L34 22 Q34 32 20 37 Q6 32 6 22 L6 9 Z"
                    stroke="url(#lgBrand)" strokeWidth="1.5" fill="none" />
              <text x="20" y="24" textAnchor="middle"
                    fontFamily="Inter,system-ui,sans-serif"
                    fontSize="11" fontWeight="800" fill="#a78bfa"
                    letterSpacing="-0.5">619</text>
            </svg>
          </div>

          <div className="lsb-brand-text">
            <span className="lsb-brand-name">619 FITNESS</span>
            <span className="lsb-brand-sub">Management OS</span>
          </div>

          {/* Collapse toggle (desktop) */}
          <button
            className="lsb-toggle"
            onClick={onToggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <Icon d={collapsed ? icons.chevronRight : icons.chevronLeft} size={14} />
          </button>
        </div>

        {/* ─ Divider ─ */}
        <div className="lsb-divider" />

        {/* ─ Nav list ─ */}
        <nav className="lsb-nav" aria-label="Primary navigation">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileClose}
                className={`lsb-item ${active ? 'lsb-item--active' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                {/* Active glow bar */}
                {active && <span className="lsb-item-glow-bar" aria-hidden="true" />}

                <span className="lsb-item-icon">
                  <Icon d={icons[item.icon]} size={18} />
                </span>

                <span className="lsb-item-label">{item.label}</span>

                {/* Tooltip for collapsed state */}
                <span className="lsb-tooltip" role="tooltip">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="lsb-spacer" />
        <div className="lsb-divider" />

        {/* ─ User footer ─ */}
        <div className="lsb-footer">
          <div className="lsb-user">
            <div className="lsb-avatar">{initials}</div>
            <div className="lsb-user-info">
              <span className="lsb-user-name">{user?.name || 'Gym Admin'}</span>
              <span className="lsb-user-role">{role}</span>
            </div>
            <button
              className="lsb-logout"
              onClick={logout}
              aria-label="Logout"
              title="Logout"
            >
              <Icon d={icons.logout} size={15} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
