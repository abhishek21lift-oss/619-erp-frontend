'use client';

import MemberNav, { MEMBER_NAV_CLEARANCE } from './MemberNav';

/**
 * The member portal's page shell: status-bar inset, then the page, then the
 * tab bar — the same order the staff shell produces, which this portal does
 * not go through.
 *
 * The portal had drifted into three different shells for three pages: this
 * one (local to the dashboard), the .member-* CSS classes (/member/classes),
 * and the staff AppShell (/member/payments). Sharing one is what stops the
 * insets from having to be got right three separate times.
 */
export default function MemberShell({
  children,
  /** Set when the page draws its own sticky header, which pays the top inset
   *  itself (.member-header does). Without this the inset is counted twice
   *  and the first card sits a status bar too low. */
  headerPaysTopInset = false,
}: {
  children: React.ReactNode;
  headerPaysTopInset?: boolean;
}) {
  return (
    <div className="min-h-[100dvh]" style={{ background: 'var(--bg-canvas)' }}>
      <div
        className="mx-auto w-full max-w-[560px] px-4 pt-5"
        style={{
          // This portal has no top bar of its own to carry the inset the way
          // the staff header does, and the app renders with viewport-fit=cover
          // under a translucent status bar — so without this the first card
          // starts underneath the clock on a notched phone. pt-5 above is the
          // gap BELOW the inset, not a stand-in for it.
          marginTop: headerPaysTopInset ? undefined : 'env(safe-area-inset-top, 0px)',
          // Clears the fixed bar plus the home indicator, so the last card is
          // fully scrollable into view rather than sitting under it.
          paddingBottom: MEMBER_NAV_CLEARANCE,
        }}
      >
        {children}
      </div>
      <MemberNav />
    </div>
  );
}
