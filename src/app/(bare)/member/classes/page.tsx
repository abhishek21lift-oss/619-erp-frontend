'use client';

// /member/classes — retired; redirects to the member dashboard.
//
// This was a class browser with a Book button, and it was a dead end on both
// sides: nothing in the product can create a class session (the backend only
// ever reads class_sessions), and booking was written against the retired
// members / member_memberships tables, so a member signed in as a PT client
// had no member_id and every booking was refused. Every member who opened it
// saw an empty week.
//
// The studios on this platform run 1-on-1 personal training, so the tab is
// gone from the member navigation. The route stays as a redirect so old links
// and bookmarks land somewhere useful instead of a 404.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import Guard from '@/components/Guard';

export default function MemberClassesRetiredRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/member/dashboard');
  }, [router]);
  return (
    <Guard role="member">
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin" size={20} style={{ color: 'var(--text-muted)' }} />
      </div>
    </Guard>
  );
}
