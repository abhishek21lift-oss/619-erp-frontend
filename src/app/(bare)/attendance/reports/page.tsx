'use client';

// /attendance/reports — merged into /attendance, Insights & Trends tab.
//
// ── Why it is gone ─────────────────────────────────────────────────────────
//
// This was a second page called "Reports & Dashboard", reachable only from two
// buttons on /attendance. It read the same api.attendance.list that page reads
// and led with the same four numbers — Total, Present, Late, Absent — over a
// range instead of a day, in a different visual language. One table, two pages
// answering "how has attendance been", and no way to get from one to the other
// except back.
//
// Its three parts that carried information now live in the Insights & Trends
// tab: the 7/30/90-day range selector, the check-in method breakdown and the
// monthly summary. The tab already had the weekly attendance chart and today's
// breakdown, so the whole answer is in one place.
//
// What did not survive the move is its "Footfall Trend" card, which drew one
// bar per STATUS with no time axis at all. A chart labelled a trend that
// cannot show one is worse than no chart, and the weekly chart it sat next to
// is the thing it was imitating.
//
// This file stays as a redirect rather than being deleted: the path is in the
// sidebar's history, in browser bookmarks, and in whatever the studio has
// pinned. A 404 for a page that still exists under a different name is a
// support call.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AttendanceReportsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/attendance?tab=insights');
  }, [router]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
      <Loader2 size={22} className="animate-spin" style={{ color: 'var(--brand)' }} />
      <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
        Attendance reports have moved into Insights &amp; Trends…
      </p>
    </div>
  );
}
