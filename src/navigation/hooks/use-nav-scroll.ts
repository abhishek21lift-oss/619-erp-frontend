'use client';

// Re-export existing scroll context hook — keeps the navigation system self-contained
// while avoiding duplication of NavScrollContext logic.
export { useNavScroll } from '@/contexts/nav-scroll-context';
export type { BarState, NavScrollValue } from '@/contexts/nav-scroll-context';
