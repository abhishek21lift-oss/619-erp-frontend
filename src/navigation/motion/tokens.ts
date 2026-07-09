'use client';

// Motion design tokens — single source of truth for all navigation animation
// physics, timing, and easing. Import these in variants.ts and components;
// never hard-code values inline.

// ─── Types ────────────────────────────────────────────────────────────────────

export type EaseCurve = [number, number, number, number];

export interface SpringConfig {
  type:      'spring';
  stiffness: number;
  damping:   number;
  mass:      number;
  velocity?: number;
}

export interface TweenConfig {
  type:     'tween';
  duration: number;
  ease:     EaseCurve | string;
}

// ─── Duration ─────────────────────────────────────────────────────────────────

/** All durations in seconds. */
export const DUR = {
  /** 0s — for reduced-motion or instant state flips. */
  instant:  0,
  /** 0.10s — micro-interactions (tap scale, icon swap). */
  micro:    0.10,
  /** 0.15s — fast UI transitions (badge appear, tooltip). */
  fast:     0.15,
  /** 0.22s — standard enter/exit (overlay fade, chip). */
  base:     0.22,
  /** 0.28s — default nav transitions (item hover, bottom bar). */
  default:  0.28,
  /** 0.38s — medium complexity (sidebar collapse, panel slide). */
  medium:   0.38,
  /** 0.52s — slow transitions (page-level, full drawer). */
  slow:     0.52,
} as const;

// ─── Easing ───────────────────────────────────────────────────────────────────

/** Cubic-bezier presets as [x1, y1, x2, y2] tuples. */
export const EASE = {
  /** Decelerates quickly — natural-feeling entry. */
  out:       [0.22, 1,    0.36, 1   ] as EaseCurve,
  /** Accelerates quickly — natural-feeling exit. */
  in:        [0.55, 0,    0.78, 0   ] as EaseCurve,
  /** Smooth enter and exit — for layout shifts. */
  inOut:     [0.65, 0,    0.35, 1   ] as EaseCurve,
  /** Slight overshoot — playful interactive elements. */
  bounce:    [0.34, 1.56, 0.64, 1   ] as EaseCurve,
  /** Nearly linear with soft tail — scroll-linked motion. */
  linear:    [0.25, 0.25, 0.75, 0.75] as EaseCurve,
  /** Sharp deceleration — snappy reveals. */
  sharp:     [0.12, 1,    0.48, 1   ] as EaseCurve,
} as const;

// ─── Spring presets ───────────────────────────────────────────────────────────

export const SPRING = {
  /** General-purpose nav transitions (sidebar, bottom bar, panels). */
  default: {
    type: 'spring' as const,
    stiffness: 520,
    damping:   38,
    mass:      0.7,
  },

  /** Snappy micro-interactions (icon tap, active pill, FAB toggle). */
  snappy: {
    type: 'spring' as const,
    stiffness: 700,
    damping:   22,
    mass:      0.5,
  },

  /** Gentle, weighted motion (drawer open, overlay enter). */
  gentle: {
    type: 'spring' as const,
    stiffness: 280,
    damping:   32,
    mass:      1.0,
  },

  /** Staggered list items (FAB menu, command-palette results). */
  item: {
    type: 'spring' as const,
    stiffness: 520,
    damping:   32,
    mass:      0.7,
  },

  /** Sidebar collapse/expand — wide horizontal spring. */
  sidebar: {
    type: 'spring' as const,
    stiffness: 400,
    damping:   40,
    mass:      0.8,
  },

  /** Floating navbar show/hide (scroll-triggered). */
  navbar: {
    type: 'spring' as const,
    stiffness: 480,
    damping:   44,
    mass:      0.6,
  },

  /** Bottom navigation bar appear/dismiss. */
  bottomBar: {
    type: 'spring' as const,
    stiffness: 520,
    damping:   38,
    mass:      0.7,
  },

  /** Shared layout ID transitions (active pill, underline indicator). */
  layout: {
    type: 'spring' as const,
    stiffness: 520,
    damping:   38,
    mass:      0.7,
  },
} as const;

// ─── Scroll-linked thresholds ─────────────────────────────────────────────────

/** Pixel thresholds used by scroll-hide logic in components. */
export const SCROLL = {
  /** Minimum px scrolled before hide/show triggers. */
  threshold:    8,
  /** Scroll distance required before navbar compact-mode kicks in. */
  compactAt:    40,
  /** Scroll distance before navbar hides entirely. */
  hideAt:       80,
} as const;

// ─── Dimension tokens ─────────────────────────────────────────────────────────

/** Layout dimensions consumed by animation calculations. */
export const NAV_SIZE = {
  /** Desktop sidebar expanded width in px. */
  sidebarExpanded:  260,
  /** Desktop/tablet sidebar collapsed (icon-only) width in px. */
  sidebarCollapsed: 64,
  /** Mobile / floating top bar height in px. */
  topBarHeight:     56,
  /** Mobile bottom navigation height in px (excludes safe-area). */
  bottomNavHeight:  60,
  /** FAB button diameter in px. */
  fabSize:          56,
} as const;

// ─── Stagger ─────────────────────────────────────────────────────────────────

/** Stagger delay between children in seconds. */
export const STAGGER = {
  /** Tight list — command-palette results, sidebar items. */
  tight:   0.030,
  /** Default — FAB items, section groups. */
  default: 0.044,
  /** Loose — page-level content reveals. */
  loose:   0.070,
} as const;

// ─── Reduced-motion override ──────────────────────────────────────────────────

/**
 * Returns `0` when reduced-motion is preferred, otherwise the given value.
 * Use this at the component level when you need a runtime value.
 */
export function motionSafe<T>(value: T, fallback: T = 0 as unknown as T): T {
  if (typeof window === 'undefined') return value;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? fallback : value;
}

// ─── Convenience re-export ────────────────────────────────────────────────────

/** Legacy alias — keeps existing imports working. */
export const MOTION_TOKENS = {
  dur:    DUR,
  ease:   EASE,
  spring: SPRING,
} as const;

export type MotionTokens = typeof MOTION_TOKENS;
