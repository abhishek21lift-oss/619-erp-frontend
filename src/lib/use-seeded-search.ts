'use client';

import { useEffect, useState } from 'react';

/**
 * A page's search box, pre-filled from `?q=` when the global search handed off
 * to this page.
 *
 * Drop-in replacement for `useState('')` on any list page that has a search
 * field. Without it, "Search all records for …" and every result that links to
 * a list page would drop the query on the way and land the user on an
 * unfiltered list — which reads as the search having failed.
 *
 * Read from `window.location` rather than `useSearchParams()` on purpose:
 * useSearchParams forces the whole page under a Suspense boundary at build
 * time, which is a heavy structural change to buy one optional parameter. The
 * value is only needed after hydration anyway, so an effect is both sufficient
 * and cheaper.
 *
 * Seeds once. If the user then clears the box, it stays cleared — re-applying
 * the URL on every render would make the field impossible to empty.
 */
export function useSeededSearch(initial = ''): [string, React.Dispatch<React.SetStateAction<string>>] {
  const [search, setSearch] = useState(initial);

  useEffect(() => {
    let q: string | null = null;
    try {
      q = new URLSearchParams(window.location.search).get('q');
    } catch {
      /* malformed query string — not worth failing a page render over */
    }
    if (q) setSearch(q);
    // Mount only: this is a handoff, not a binding.
  }, []);

  return [search, setSearch];
}
