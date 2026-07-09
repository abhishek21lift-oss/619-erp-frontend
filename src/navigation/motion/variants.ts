'use client';

// Framer-motion Variants presets for navigation animations.
// All values derive from tokens.ts — never hard-code durations or easings here.
//
// Usage:
//   import { fadeVariants } from '@/navigation/motion/variants';
//   <m.div variants={fadeVariants} initial="hidden" animate="visible" exit="exit" />

import { DUR, EASE, SPRING, NAV_SIZE, STAGGER } from './tokens';

// ─── Fade ─────────────────────────────────────────────────────────────────────

/** Simple opacity fade — overlays, tooltips, badges. */
export const fadeVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DUR.base,    ease: EASE.out } },
  exit:    { opacity: 0, transition: { duration: DUR.fast,    ease: EASE.in  } },
} as const;

/** Slower fade for full-screen overlays (drawer backdrop, command-palette overlay). */
export const fadeSlowVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DUR.medium,  ease: EASE.out } },
  exit:    { opacity: 0, transition: { duration: DUR.base,    ease: EASE.in  } },
} as const;

// ─── Slide ────────────────────────────────────────────────────────────────────

/** Slide up + fade — command-palette rows, FAB items, tooltip. */
export const slideUpVariants = {
  hidden:  { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: DUR.default, ease: EASE.out } },
  exit:    { opacity: 0, y: 8, transition: { duration: DUR.fast,    ease: EASE.in  } },
} as const;

/** Slide down + fade — dropdown menus, notification panels. */
export const slideDownVariants = {
  hidden:  { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0,   transition: { duration: DUR.default, ease: EASE.out } },
  exit:    { opacity: 0, y: -6,  transition: { duration: DUR.fast,    ease: EASE.in  } },
} as const;

/** Slide in from the left — sidebar items, left-anchored panels. */
export const slideInLeftVariants = {
  hidden:  { opacity: 0, x: -14 },
  visible: { opacity: 1, x: 0,   transition: { duration: DUR.default, ease: EASE.out } },
  exit:    { opacity: 0, x: -8,  transition: { duration: DUR.fast,    ease: EASE.in  } },
} as const;

/** Slide in from the right — right-anchored panels, fly-out menus. */
export const slideInRightVariants = {
  hidden:  { opacity: 0, x: 14 },
  visible: { opacity: 1, x: 0,  transition: { duration: DUR.default, ease: EASE.out } },
  exit:    { opacity: 0, x: 8,  transition: { duration: DUR.fast,    ease: EASE.in  } },
} as const;

// ─── Scale ────────────────────────────────────────────────────────────────────

/** Scale + fade — popovers, context menus, command-palette container. */
export const scaleInVariants = {
  hidden:  { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1,    transition: SPRING.snappy },
  exit:    { opacity: 0, scale: 0.94, transition: { duration: DUR.fast, ease: EASE.in } },
} as const;

/** Scale from origin bottom-right — FAB expand/contract. */
export const scaleFabVariants = {
  hidden:  { opacity: 0, scale: 0.62, y: 22, x: 6 },
  visible: { opacity: 1, scale: 1,    y: 0,  x: 0, transition: SPRING.item },
  exit:    { opacity: 0, scale: 0.78, y: 10, x: 4, transition: { duration: DUR.fast, ease: EASE.in } },
} as const;

/** Icon rotation / swap inside a button. */
export const scaleIconVariants = {
  idle:    { scale: 1,    rotate: 0  },
  pressed: { scale: 0.76, rotate: 0, transition: SPRING.snappy },
  open:    { scale: 1,    rotate: 45, transition: SPRING.snappy },
} as const;

// ─── Stagger container ────────────────────────────────────────────────────────

/** Wrap a list with this; children use any slide/fade variant. */
export const staggerContainerVariants = {
  hidden:  {},
  visible: { transition: { staggerChildren: STAGGER.default, delayChildren: 0 } },
} as const;

/** Tighter stagger — command-palette results. */
export const staggerTightVariants = {
  hidden:  {},
  visible: { transition: { staggerChildren: STAGGER.tight, delayChildren: 0 } },
} as const;

/** Looser stagger for staggered FAB items (bottom-to-top read order). */
export const staggerLooseVariants = {
  hidden:  {},
  visible: { transition: { staggerChildren: STAGGER.loose, delayChildren: 0 } },
} as const;

// ─── Sidebar animation ────────────────────────────────────────────────────────

/**
 * Sidebar expand/collapse by width.
 * Use on the sidebar container; children use `sidebarLabelVariants`.
 */
export const sidebarVariants = {
  expanded: {
    width: NAV_SIZE.sidebarExpanded,
    transition: SPRING.sidebar,
  },
  collapsed: {
    width: NAV_SIZE.sidebarCollapsed,
    transition: SPRING.sidebar,
  },
} as const;

/**
 * Sidebar label + secondary text — fade out when sidebar collapses to icon-only.
 * Attach to the text `<m.span>` inside each nav item.
 */
export const sidebarLabelVariants = {
  expanded:  { opacity: 1, width: 'auto', transition: { duration: DUR.base,  ease: EASE.out, delay: 0.06 } },
  collapsed: { opacity: 0, width: 0,      transition: { duration: DUR.fast,  ease: EASE.in              } },
} as const;

/**
 * Sidebar group collapse / expand (vertical height animation).
 * Attach to the collapsible item container.
 */
export const sidebarGroupVariants = {
  open:   { height: 'auto', opacity: 1, transition: { duration: DUR.base,   ease: EASE.out } },
  closed: { height: 0,      opacity: 0, transition: { duration: DUR.fast,   ease: EASE.in  } },
} as const;

/**
 * Active pill / indicator that moves between sidebar items using layoutId.
 * No variants needed — framer-motion layout animation handles it.
 * Export the spring config used for the shared layout transition.
 */
export const sidebarActivePillTransition = SPRING.layout;

// ─── Floating navbar (top bar) ────────────────────────────────────────────────

/**
 * Top-bar show/hide driven by scroll direction.
 * Use `animate` prop with `{ y: scrollingDown ? '-100%' : 0 }` on a fixed bar.
 * This transition config is the one to pass to the `transition` prop.
 */
export const navbarScrollTransition = {
  ...SPRING.navbar,
} as const;

/**
 * Top-bar compact ↔ expanded height.
 * Attach to the bar's height or padding property.
 */
export const navbarHeightVariants = {
  expanded: {
    height: NAV_SIZE.topBarHeight,
    transition: { duration: DUR.medium, ease: EASE.out },
  },
  compact: {
    height: NAV_SIZE.topBarHeight - 12,
    transition: { duration: DUR.medium, ease: EASE.out },
  },
  hidden: {
    height: 0,
    opacity: 0,
    transition: { duration: DUR.base, ease: EASE.in },
  },
} as const;

/**
 * Floating navbar blur / background opacity on scroll.
 * Animate `backdropFilter` intensity based on scroll position.
 * Values are the CSS string — used with framer-motion's style prop.
 */
export const navbarBlurVariants = {
  atTop:    { opacity: 0 },
  scrolled: { opacity: 1, transition: { duration: DUR.base, ease: EASE.out } },
} as const;

// ─── Bottom navigation ────────────────────────────────────────────────────────

/**
 * Mobile bottom bar slide up/down on scroll.
 * Use `animate={{ y: hidden ? '100%' : 0 }}` on the fixed bar.
 */
export const bottomBarScrollTransition = {
  ...SPRING.bottomBar,
} as const;

/**
 * Bottom bar safe-area-aware entrance on mount.
 */
export const bottomBarMountVariants = {
  hidden:  { y: '100%', opacity: 0 },
  visible: { y: 0,      opacity: 1, transition: { ...SPRING.bottomBar, delay: 0.12 } },
} as const;

/**
 * Active tab indicator pill that slides between bottom nav items.
 * Uses layoutId="bottom-nav-active" — no variants needed for the pill itself.
 * Export the transition config for the `transition` prop on `<m.span layoutId>`.
 */
export const bottomNavActivePillTransition = SPRING.layout;

/**
 * Bottom nav item label — fades/expands when active.
 */
export const bottomNavLabelVariants = {
  inactive: { opacity: 0.36, scale: 0.90, transition: { duration: DUR.fast, ease: EASE.in  } },
  active:   { opacity: 1,    scale: 1,    transition: { duration: DUR.base, ease: EASE.out } },
} as const;

/**
 * Bottom nav item icon tap scale.
 */
export const bottomNavIconTapVariants = {
  idle:    { scale: 1    },
  pressed: { scale: 0.76, transition: SPRING.snappy },
} as const;

// ─── Hide on scroll (generic) ─────────────────────────────────────────────────

/**
 * Utility transition for any element that hides/shows on scroll.
 * Pass `animate={{ y: hidden ? offset : 0 }}` where `offset` is
 * `'100%'` (bottom) or `'-100%'` (top).
 */
export const hideOnScrollTransition = {
  ...SPRING.navbar,
} as const;

// ─── Collapse (generic vertical) ─────────────────────────────────────────────

/** Generic height-based collapse — sidebar groups, accordion items. */
export const collapseVariants = {
  open:   { height: 'auto', opacity: 1, transition: { duration: DUR.base, ease: EASE.out } },
  closed: { height: 0,      opacity: 0, transition: { duration: DUR.fast, ease: EASE.in  } },
} as const;
