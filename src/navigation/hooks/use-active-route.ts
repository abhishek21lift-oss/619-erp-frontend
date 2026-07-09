'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

/**
 * Returns helpers to determine whether a nav href is active.
 * Matches root "/" exactly; all other hrefs match as a prefix.
 */
export function useActiveRoute() {
  const pathname = usePathname();

  const isActive = useMemo(() => (href: string, matchPrefix?: string): boolean => {
    const path = pathname.split('?')[0];

    if (matchPrefix) return path.startsWith(matchPrefix);
    if (href === '/') return path === '/';
    return path === href || path.startsWith(href + '/');
  }, [pathname]);

  const isParentActive = useMemo(() => (childHrefs: string[]): boolean => {
    return childHrefs.some((href) => isActive(href));
  }, [isActive]);

  return { pathname, isActive, isParentActive };
}
