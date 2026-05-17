'use client';
/**
 * TopBar — premium utility bar: hamburger, breadcrumb/title, search,
 * notifications, theme toggle, avatar.
 */
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Menu,
  Search,
  Bell,
  Sun,
  Moon,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import NotificationBell from './NotificationBell';

interface TopBarProps {
  title?: string;
  onMenuClick?: () => void;
}

const CRUMB_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  sales: 'Sales',
  members: 'Members',
  training: 'Training',
  staff: 'Staff',
  attendance: 'Attendance',
  memberships: 'Memberships',
  finance: 'Finance',
  insights: 'Insights',
  engagement: 'Engagement',
  settings: 'Settings',
};

export default function TopBar({ title, onMenuClick }: TopBarProps) {
  const { user } = useAuth();
  const path = usePathname();
  const [dark, setDark] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const stored = document.documentElement.getAttribute('data-theme');
    setDark(stored === 'dark');
  }, []);

  const toggleTheme = () => {
    const next = dark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    setDark(!dark);
  };

  /* Breadcrumb segments */
  const segments = path
    .split('/')
    .filter(Boolean)
    .map((seg) => ({
      label: CRUMB_LABELS[seg] ?? seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      href: '/' + seg,
    }));

  const initials = (user?.name || 'U')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="topbar-inner">
      {/* Left: hamburger + breadcrumb */}
      <div className="topbar-left">
        <button
          className="topbar-hamburger"
          onClick={onMenuClick}
          aria-label="Toggle navigation"
        >
          <Menu size={18} />
        </button>

        {/* Breadcrumb */}
        {segments.length > 0 && (
          <nav className="topbar-breadcrumb" aria-label="Breadcrumb">
            <Link href="/dashboard" className="topbar-crumb topbar-crumb-home">
              Home
            </Link>
            {segments.map((seg, i) => (
              <span key={i} className="topbar-crumb-group">
                <ChevronRight size={12} className="topbar-crumb-sep" />
                {i === segments.length - 1 ? (
                  <span className="topbar-crumb topbar-crumb-active">
                    {seg.label}
                  </span>
                ) : (
                  <Link href={seg.href} className="topbar-crumb">
                    {seg.label}
                  </Link>
                )}
              </span>
            ))}
          </nav>
        )}
      </div>

      {/* Right: search, bell, theme, avatar */}
      <div className="topbar-right">
        {/* Search */}
        <div className={`topbar-search${searchOpen ? ' open' : ''}`}>
          <Search size={14} className="topbar-search-icon" />
          <input
            className="topbar-search-input"
            placeholder="Search anything…"
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setSearchOpen(false)}
          />
        </div>

        {/* Notifications */}
        <NotificationBell />

        {/* Theme toggle */}
        <button
          className="topbar-icon-btn"
          onClick={toggleTheme}
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={dark ? 'Light mode' : 'Dark mode'}
        >
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Avatar */}
        <button
          className="topbar-avatar"
          aria-label="Profile"
          title={user?.name || 'Profile'}
          onClick={() => (window.location.href = '/settings')}
        >
          {initials}
        </button>
      </div>
    </div>
  );
}
