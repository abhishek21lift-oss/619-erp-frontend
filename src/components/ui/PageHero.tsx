'use client';

/**
 * The hero every page gets, and the container it lives in.
 *
 * ── Why this exists ────────────────────────────────────────────────────────
 *
 * The dashboard has a hero: a deep navy gradient panel with rounded corners,
 * sitting `pt-1` under the top bar and inside the shell's own gutter. Every
 * report page had grown its own version of the idea instead — a pale
 * `--bg-subtle` slab with `borderRadius: '0 0 36px 36px'` and
 * `padding: '52px 32px 40px'`, followed by a content block with
 * `padding: '24px 32px'`.
 *
 * Three things went wrong with that, all of them visible on a phone:
 *
 *   1. The slab reads as a container box drawn around the title rather than
 *      as the page's own header, because it is a different surface from
 *      everything below it and it is squared off against the top bar.
 *   2. That 32px is applied INSIDE `.shell-main`, which already pays 16px on
 *      mobile and 24px from `sm` up. So these pages sat at 48px from the edge
 *      while the dashboard sat at 16px, and the difference is obvious the
 *      moment you flick between them.
 *   3. 32px of it is unusable width. On a 390px screen that is a sixth of the
 *      viewport spent on nothing, which is why the KPI tiles on /reports were
 *      clipping their own values to "₹.." and "J..".
 *
 * ── What this does not copy from the dashboard ─────────────────────────────
 *
 * The dashboard hero runs a sheen sweep on an infinite repeat. One perpetual
 * animation on the screen you land on is a flourish; the same animation on
 * every report page you open is motion for its own sake, and the guidance is
 * one or two animated elements per view. The gradient, the glow, the grid and
 * the shape are all here — the loop is not.
 */

import * as React from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { cn } from './cn';

export interface PageHeroProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  /** Controls that belong to the page as a whole — tabs, a date range. */
  children?: React.ReactNode;
  /** Right-aligned actions, beside the title on desktop. */
  actions?: React.ReactNode;
  /**
   * A shorter, quieter hero for pages whose content is the point.
   *
   * Opt-in, and nothing about the default changes: the full hero is still
   * what every other page renders. On a screen that is a working surface —
   * a list of programmes a trainer scans and acts on — the tall gradient
   * panel is the largest thing on a phone before any of the work is
   * visible. Compact trims the padding, drops the icon tile to a smaller
   * size, and removes the corner glows and the grid, which cost height in
   * perceived weight without carrying anything.
   */
  compact?: boolean;
  className?: string;
}

export function PageHero({ title, subtitle, icon, children, actions, compact = false, className }: PageHeroProps) {
  const reduce = useReducedMotion();

  return (
    <m.div
      initial={reduce ? false : { opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'relative overflow-hidden',
        compact
          ? 'rounded-[20px] px-4 py-3.5 sm:rounded-[24px] sm:px-5 sm:py-4'
          : 'rounded-[24px] p-5 sm:rounded-[30px] sm:p-7',
        className,
      )}
      style={{
        background:
          'radial-gradient(130% 150% at 50% -25%, #0050AD 0%, transparent 55%),'
          + 'linear-gradient(158deg, #0F172A 0%, #0050AD 42%, #0F172A 72%, #0050AD 100%)',
        boxShadow: compact
          ? '0 10px 30px -12px rgba(15,23,42,0.55), inset 0 1px 0 rgba(255,255,255,0.10)'
          : '0 24px 64px -14px rgba(15,23,42,0.78), 0 8px 26px rgba(0,103,224,0.22),'
            + 'inset 0 1px 0 rgba(255,255,255,0.10)',
      }}
    >
      {/* Decorative layers, matching the dashboard hero. All non-interactive
          and all behind the content — a hero you cannot read is not a hero. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {!compact && (
          <>
        <div
          className="absolute -right-14 -top-20 h-60 w-60 rounded-full opacity-35"
          style={{ background: 'radial-gradient(circle, #FCD34D 0%, transparent 70%)', filter: 'blur(46px)' }}
        />
        <div
          className="absolute -bottom-20 -left-14 h-60 w-60 rounded-full opacity-25"
          style={{ background: 'radial-gradient(circle, #7fb4ff 0%, transparent 70%)', filter: 'blur(54px)' }}
        />
        <svg className="absolute inset-0 h-full w-full opacity-[0.055]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="ph-grid" width="34" height="34" patternUnits="userSpaceOnUse">
              <path d="M 34 0 L 0 0 0 34" fill="none" stroke="white" strokeWidth="0.6" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#ph-grid)" />
        </svg>
          </>
        )}
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(120% 120% at 50% 38%, transparent 52%, rgba(15,23,42,0.55) 100%)' }}
        />
      </div>

      <div className="relative z-10">
        <div className={cn('flex items-start', compact ? 'gap-3' : 'gap-3.5')}>
          {icon && (
            <span
              className={cn(
                'flex shrink-0 items-center justify-center rounded-[14px] text-white',
                compact ? 'h-9 w-9 rounded-[11px]' : 'h-11 w-11 sm:h-12 sm:w-12',
              )}
              style={{
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.18)',
                backdropFilter: 'blur(6px)',
              }}
            >
              {icon}
            </span>
          )}
          <div className="min-w-0 flex-1">
            {/* Wraps. These titles are two and three words and the old markup
                let them run into the actions on a narrow screen. */}
            <h1 className={cn(
              'font-[800] leading-tight tracking-[-0.02em] text-white',
              compact ? 'text-[18px] sm:text-[21px]' : 'text-[21px] sm:text-[26px]',
            )}>
              {title}
            </h1>
            {subtitle && (
              <p className={cn(
                'leading-snug',
                compact ? 'mt-0.5 text-[11.5px] sm:text-[12.5px]' : 'mt-1 text-[12.5px] sm:text-[13.5px]',
              )} style={{ color: 'rgba(255,255,255,0.72)' }}>
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="hidden shrink-0 sm:block">{actions}</div>}
        </div>

        {children && <div className={compact ? 'mt-3' : 'mt-4'}>{children}</div>}
        {actions && <div className={cn('sm:hidden', compact ? 'mt-3' : 'mt-4')}>{actions}</div>}
      </div>
    </m.div>
  );
}

/**
 * The page's scroll container, with exactly the dashboard's measurements:
 * `pt-1` under the top bar, the shell's own gutter left and right (no extra
 * padding of its own), and the same vertical rhythm between sections.
 *
 * The bottom padding clears the mobile bottom nav plus the safe-area inset —
 * without it the last card on every one of these pages sat under the nav.
 */
export function PageContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'relative mx-auto w-full max-w-7xl pt-1',
        'pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:pb-28',
        'space-y-3.5 sm:space-y-4',
        className,
      )}
    >
      {children}
    </div>
  );
}
