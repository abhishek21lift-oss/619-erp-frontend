'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import NotificationBell from './NotificationBell';

const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);
const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
  </svg>
);
const MenuIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);
const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <path d="m21 21-4.35-4.35"/>
  </svg>
);

interface TopBarProps {
  onMenuOpen: () => void;
  sidebarCollapsed: boolean;
}

export default function TopBar({ onMenuOpen }: TopBarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [dark, setDark] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Sync theme
  useEffect(() => {
    const stored = document.documentElement.getAttribute('data-theme');
    setDark(stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches));
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
  };

  // Close profile dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const initials = user?.name?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || 'GY';
  const role = (user as any)?.role || 'Admin';

  return (
    <header className="topbar">
      {/* Hamburger (mobile only) */}
      <button
        className="topbar__menu-btn"
        onClick={onMenuOpen}
        aria-label="Open navigation"
      >
        <MenuIcon />
      </button>

      {/* Search */}
      <div className="topbar__search">
        <SearchIcon />
        <input
          type="search"
          placeholder="Search members, plans, reports…"
          aria-label="Search"
          onKeyDown={(e) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              document.dispatchEvent(new CustomEvent('openCommandPalette'));
            }
          }}
        />
        <kbd className="topbar__kbd">⌘K</kbd>
      </div>

      <div className="topbar__actions">
        {/* Theme toggle */}
        <button
          className="topbar__icon-btn"
          onClick={toggleTheme}
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={dark ? 'Light mode' : 'Dark mode'}
        >
          {dark ? <SunIcon /> : <MoonIcon />}
        </button>

        {/* Notifications */}
        <NotificationBell />

        {/* Profile */}
        <div className="topbar__profile" ref={profileRef}>
          <button
            className="topbar__avatar"
            onClick={() => setProfileOpen(o => !o)}
            aria-label="Profile menu"
            aria-expanded={profileOpen}
          >
            {initials}
          </button>

          {profileOpen && (
            <div className="topbar__dropdown" role="menu">
              <div className="topbar__dropdown-header">
                <div className="topbar__dropdown-avatar">{initials}</div>
                <div>
                  <div className="topbar__dropdown-name">{user?.name || 'Gym Admin'}</div>
                  <div className="topbar__dropdown-role">{role}</div>
                </div>
              </div>
              <div className="topbar__dropdown-divider" />
              <button
                className="topbar__dropdown-item"
                onClick={() => { setProfileOpen(false); router.push('/settings'); }}
              >
                Settings
              </button>
              <button
                className="topbar__dropdown-item topbar__dropdown-item--danger"
                onClick={() => { setProfileOpen(false); logout(); }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
