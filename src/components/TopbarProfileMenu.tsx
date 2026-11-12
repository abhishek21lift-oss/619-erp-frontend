'use client';

/**
 * The account menu in the top bar: the signed-in person's avatar, then the
 * three places that are about them rather than about the studio.
 *
 * My Profile used to sit inside the sidebar's Settings group, two levels down
 * from where people look for their own account. It is here now, and the shell
 * owns `open` so the bell and the avatar can never stand open together.
 */

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { AnimatePresence, m } from 'framer-motion';
import { LogOut, Settings, UserRound } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import UserPhoto from '@/components/UserPhoto';

export default function TopbarProfileMenu({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user, logout } = useAuth();
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const initials = user?.name
    ? user.name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : (user?.email?.[0] || '?').toUpperCase();

  // Outside click and focus leaving the avatar and its panel close it; Escape
  // closes it and puts focus back on the avatar, so a keyboard user does not
  // land on <body> when the menu vanishes.
  useEffect(() => {
    if (!open) return;
    const isInside = (target: Node) => Boolean(wrapRef.current?.contains(target));
    const onPointer = (e: MouseEvent) => {
      if (!isInside(e.target as Node)) onOpenChange(false);
    };
    const onFocusIn = (e: FocusEvent) => {
      if (!isInside(e.target as Node)) onOpenChange(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onOpenChange]);

  const close = () => onOpenChange(false);

  const handleLogout = async () => {
    // Confirmed, like the sidebar's logout: one tap should not end a session.
    if (!window.confirm('Log out of the studio? You will need to sign in again.')) return;
    close();
    try {
      await logout();
    } catch {
      window.alert('Could not sign you out. Check your connection and try again.');
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <m.button
        ref={triggerRef}
        type="button"
        aria-label="Account menu"
        aria-expanded={open}
        aria-controls="topbar-profile-menu"
        onClick={() => onOpenChange(!open)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="topbar-hit flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full"
        style={{
          color: 'var(--topbar-control-fg)',
          boxShadow: open ? '0 0 0 2px var(--brand)' : '0 0 0 1px var(--topbar-capsule-border)',
        }}
      >
        <UserPhoto
          url={user?.avatar_url}
          name={user?.name}
          size={30}
          fallback={
            <span
              className="flex h-[30px] w-[30px] items-center justify-center rounded-full text-[10px] font-bold text-white select-none"
              style={{ background: 'var(--brand)' }}
            >
              {initials}
            </span>
          }
        />
      </m.button>

      <AnimatePresence>
        {open && (
          <m.div
            id="topbar-profile-menu"
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="absolute right-0 top-full z-50 mt-2 w-60 max-w-[calc(100vw-1rem)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[0_24px_64px_rgba(163,55,87,0.18)] backdrop-blur-2xl"
          >
            <div className="border-b border-[var(--border)] px-4 py-3">
              <p className="truncate text-[13px] font-[750] text-[color:var(--text-primary)]">
                {user?.name || 'Your account'}
              </p>
              {user?.email && (
                <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">{user.email}</p>
              )}
            </div>

            <div className="py-1">
              <Link
                href="/settings/profile"
                onClick={close}
                className="flex min-h-[44px] items-center gap-2.5 px-4 text-[13px] font-[600] text-[color:var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)]"
              >
                <UserRound size={15} strokeWidth={1.8} className="text-[var(--text-muted)]" />
                My Profile
              </Link>
              <Link
                href="/settings/profile?tab=preferences"
                onClick={close}
                className="flex min-h-[44px] items-center gap-2.5 px-4 text-[13px] font-[600] text-[color:var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)]"
              >
                <Settings size={15} strokeWidth={1.8} className="text-[var(--text-muted)]" />
                Account Settings
              </Link>
            </div>

            <div className="border-t border-[var(--border)] py-1">
              <button
                type="button"
                onClick={handleLogout}
                className="flex min-h-[44px] w-full items-center gap-2.5 px-4 text-left text-[13px] font-[600] text-[color:var(--danger)] transition-colors hover:bg-[var(--bg-hover)]"
              >
                <LogOut size={15} strokeWidth={1.8} />
                Log out
              </button>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
