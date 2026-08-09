'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, Home, LogOut, Wallet } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { palette } from '@/lib/palette';

/**
 * The member portal's bottom tab bar.
 *
 * ── What it contains ───────────────────────────────────────────────────────
 *
 * The three places a member can actually go, plus the way out.
 *
 * The page this replaced had a five-tab bar, but four of the tabs only set
 * React state that nothing read — tapping Classes, Bookings, Plan or Profile
 * did nothing at all. Rebuilding the page without a nav then removed even the
 * one that worked, and left no way to sign out, which is worse than a bar
 * with dead buttons.
 *
 * So: real links to the routes that exist, and nothing else. Three working
 * tabs beat five that mostly do not.
 *
 * ── Why it is shared ───────────────────────────────────────────────────────
 *
 * Lifted out of member/dashboard/page.tsx, where it was a local component, so
 * every page in the portal renders the same one. Only the dashboard had it:
 * /member/classes rendered no bar at all — a member there could reach nothing
 * but the browser's back button, while .member-main still reserved the space
 * for a bar that was never drawn — and /member/payments borrowed the STAFF
 * shell, so it showed members Clients / Sessions / Check-in, tabs that bounce
 * them straight back out because Guard refuses a member the staff portal.
 */
const TABS = [
  { href: '/member/dashboard', label: 'Home', icon: Home },
  { href: '/member/classes', label: 'Classes', icon: CalendarDays },
  { href: '/member/payments', label: 'Payments', icon: Wallet },
] as const;

/** Reserve this much above the bar so the last card clears it. */
export const MEMBER_NAV_CLEARANCE = 'calc(84px + env(safe-area-inset-bottom, 0px))';

export default function MemberNav() {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <nav
      // A fixed bar at the bottom of the viewport: a downward drag that starts
      // here is somebody reaching for a tab, not asking to refresh. Same
      // opt-out MobileBottomNav carries, and the guard test that caught this
      // missing is the reason it exists.
      data-no-pull-refresh
      // .mobile-bottom-nav rather than Tailwind's bottom-0, so this takes its
      // bottom from --vv-bottom-inset exactly as the staff nav does — see
      // useVisualViewportAnchor, mounted for this portal in member/layout.tsx.
      className="mobile-bottom-nav fixed inset-x-0 z-40"
      style={{
        background: 'var(--bg-card)',
        borderTop: '1px solid var(--border)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="mx-auto flex w-full max-w-[560px]">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className="flex flex-1 flex-col items-center gap-1 py-2.5"
              style={{ color: active ? palette.blue[500] : palette.gray[500] }}
            >
              <Icon size={18} strokeWidth={active ? 2.4 : 1.9} />
              <span className="text-[10px] font-[700]">{label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => logout()}
          className="flex flex-1 flex-col items-center gap-1 py-2.5"
          style={{ color: palette.gray[500] }}
        >
          <LogOut size={18} strokeWidth={1.9} />
          <span className="text-[10px] font-[700]">Sign out</span>
        </button>
      </div>
    </nav>
  );
}
