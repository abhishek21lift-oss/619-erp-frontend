'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Apple, ClipboardCheck, Dumbbell, Home, MoreHorizontal, Wallet } from 'lucide-react';
import { loadMemberNotifications } from './memberNotifications';
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
 * So: real links to the routes that exist, and nothing else. Two working
 * tabs beat five that mostly do not.
 *
 * Classes was the third, and it was a dead end: nothing in the product can
 * create a class session, and booking was written against the retired
 * members / member_memberships tables, so every member saw an empty list
 * and every booking attempt failed. The studios this serves run 1-on-1 PT,
 * so the tab is gone and /member/classes redirects home.
 *
 * Workout, Diet and Check-in came next, once /api/me could answer them:
 * the plan the trainer wrote, the diet they were given, and a way to tell the
 * trainer how the week went. Each is a real page with a real empty state.
 *
 * ── Why it is shared ───────────────────────────────────────────────────────
 *
 * Lifted out of member/dashboard/page.tsx, where it was a local component, so
 * every page in the portal renders the same one. Only the dashboard had it:
 * /member/classes rendered no bar at all — a member there could reach nothing
 * but the browser's back button, while .member-main still reserved the space
 * for a bar that was never drawn — and /member/payments borrowed the STUDIO
 * shell, so it showed members Clients / Sessions / Check-in, tabs that bounce
 * them straight back out because Guard refuses a member the trainer's portal.
 *
 * ── More ───────────────────────────────────────────────────────────────────
 *
 * The sixth slot was Sign out. It is now More: Progress, Notifications,
 * My forms and Account live there, and so does Sign out. The tab carries a
 * dot when there are unread notifications, so they are not hidden behind it.
 */
const TABS = [
  { href: '/member/dashboard', label: 'Home', icon: Home },
  { href: '/member/workout', label: 'Workout', icon: Dumbbell },
  { href: '/member/diet', label: 'Diet', icon: Apple },
  { href: '/member/checkin', label: 'Check-in', icon: ClipboardCheck },
  { href: '/member/payments', label: 'Payments', icon: Wallet },
] as const;

/** Pages reached from More: the More tab lights up on each of them. */
const MORE_ROUTES = ['/member/more', '/member/progress', '/member/notifications', '/member/forms', '/member/account'];

/** Reserve this much above the bar so the last card clears it. */
export const MEMBER_NAV_CLEARANCE = 'calc(84px + env(safe-area-inset-bottom, 0px))';

export default function MemberNav() {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  // Re-checked on each navigation, so reading them on /member/notifications
  // clears the dot by the next page.
  useEffect(() => {
    let live = true;
    loadMemberNotifications(true)
      .then((n) => { if (live) setUnread(n.length); })
      .catch(() => { /* a badge is not worth an error: leave it as it was */ });
    return () => { live = false; };
  }, [pathname]);

  const moreActive = MORE_ROUTES.some((r) => pathname === r || pathname?.startsWith(`${r}/`));

  return (
    <nav
      // A fixed bar at the bottom of the viewport: a downward drag that starts
      // here is somebody reaching for a tab, not asking to refresh. Same
      // opt-out MobileBottomNav carries, and the guard test that caught this
      // missing is the reason it exists.
      data-no-pull-refresh
      // .mobile-bottom-nav rather than Tailwind's bottom-0, so this bar and
      // the staff one are positioned by the same single rule.
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
        <Link
          href="/member/more"
          aria-current={moreActive ? 'page' : undefined}
          aria-label={unread > 0 ? `More, ${unread} unread notification${unread === 1 ? '' : 's'}` : undefined}
          className="flex flex-1 flex-col items-center gap-1 py-2.5"
          style={{ color: moreActive ? palette.blue[500] : palette.gray[500] }}
        >
          <span className="relative">
            <MoreHorizontal size={18} strokeWidth={moreActive ? 2.4 : 1.9} />
            {unread > 0 && (
              <span aria-hidden className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full"
                style={{ background: palette.red[500], boxShadow: '0 0 0 2px var(--bg-card)' }} />
            )}
          </span>
          <span className="text-[10px] font-[700]">More</span>
        </Link>
      </div>
    </nav>
  );
}
