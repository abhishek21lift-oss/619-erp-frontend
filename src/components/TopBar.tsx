'use client';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import Breadcrumbs from './Breadcrumbs';
import NotificationBell from './NotificationBell';
import { Search } from 'lucide-react';

type Props = {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  hideBreadcrumbs?: boolean;
};

function todayString() {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function greet(name?: string) {
  const h = new Date().getHours();
  const g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return `${g}, ${name?.split(' ')[0] || 'Coach'}`;
}

export default function TopBar({ title, subtitle, actions, hideBreadcrumbs }: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const isMac =
    typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac');

  function openPalette() {
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'k',
        code: 'KeyK',
        metaKey: isMac,
        ctrlKey: !isMac,
        bubbles: true,
      }),
    );
  }

  return (
    <div
      className="topbar v2"
      style={{
        background: 'var(--topbar-bg)',
        backdropFilter: 'blur(20px) saturate(140%)',
        WebkitBackdropFilter: 'blur(20px) saturate(140%)',
        borderBottom: '1px solid var(--topbar-border)',
      }}
    >
      <div className="topbar-left">
        {!hideBreadcrumbs && <Breadcrumbs />}
        <div className="topbar-titles">
          <div className="topbar-title" style={{ fontWeight: 700 }}>{title || greet(user?.name)}</div>
          <div className="topbar-sub" style={{ opacity: 0.65 }}>{subtitle || todayString()}</div>
        </div>
      </div>

      <div className="topbar-right">
        <button
          type="button"
          className="topbar-search-trigger glass-btn"
          onClick={openPalette}
          aria-label="Open search (Cmd+K)"
          style={{ height: 34, borderRadius: 9999, gap: 6, padding: '0 12px' }}
        >
          <Search size={12} style={{ opacity: 0.6 }} />
          <span className="topbar-search-text" style={{ fontSize: 12 }}>Search anything</span>
          <kbd className="topbar-kbd" style={{ fontSize: 10, padding: '1px 5px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 5 }}>{isMac ? '⌘' : 'Ctrl'}</kbd>
          <kbd className="topbar-kbd" style={{ fontSize: 10, padding: '1px 5px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 5 }}>K</kbd>
        </button>

        <NotificationBell />

        {actions && <div className="topbar-actions">{actions}</div>}

        <button
          type="button"
          className="topbar-avatar glass-btn"
          aria-label="Account"
          onClick={() => router.push('/settings')}
          title={user?.name || 'Account'}
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            padding: 2,
          }}
        >
          <Image
            src="/619-logo.png"
            alt="Profile"
            width={28}
            height={28}
            className="logo-img-avatar object-contain"
            style={{ display: 'block', borderRadius: '50%' }}
          />
        </button>
      </div>
    </div>
  );
}
