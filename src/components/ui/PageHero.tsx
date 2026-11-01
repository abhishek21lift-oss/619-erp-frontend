'use client';

/**
 * The hero every page gets, and the container it lives in.
 *
 * ── Why this exists ────────────────────────────────────────────────────────
 *
 * The dashboard has a hero: an indigo Aurora panel with rounded corners,
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
  className?: string;
  /**
   * The short, light treatment: no gradient slab, no glow, no grid, no
   * vignette — a title, a line of context and the page's own actions on the
   * page's own background.
   *
   * Opt-in, and every existing caller keeps the full hero untouched. It
   * exists for content-dense screens where the header is furniture rather
   * than the arrival moment: a trainer opening Workout Plans is there to
   * read a list, and ~200px of decorated navy above it is 200px of scroll
   * before the first card on a phone. Same component, so the shared hero
   * stays the one place a page's title is built and the two treatments
   * cannot drift into two different headers.
   */
  compact?: boolean;
  /**
   * A page's own colour for the full hero, in place of the navy: its CSS
   * `background` and the glow under it. The shape, grid, spacing and layout
   * stay the shared hero's — only the paint changes, and the navy's gold and
   * blue glows step aside so they do not muddy it. The colours come from the
   * page's token file (e.g. components/attendance/attendanceTheme.ts).
   */
  surface?: { background: string; shadow: string };
  /**
   * The arrival treatment: an emerald aurora with concentric rings, a large
   * glass icon tile and the page's actions as pills under the title. Opt-in,
   * so every existing caller keeps the hero it has.
   */
  showcase?: boolean;
}

export function PageHero({ title, subtitle, icon, children, actions, className, compact, surface, showcase }: PageHeroProps) {
  const reduce = useReducedMotion();

  if (showcase) {
    return (
      <m.div
        initial={reduce ? false : { opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }}
        className={cn('relative overflow-hidden rounded-[28px] p-5 sm:rounded-[34px] sm:p-8', className)}
        style={{
          background:
            'radial-gradient(80% 95% at 18% 0%, rgba(255,255,255,0.16) 0%, transparent 60%),'
            + 'radial-gradient(60% 78% at 100% 104%, rgba(133,46,78,0.62) 0%, transparent 64%),'
            + 'radial-gradient(120% 140% at 84% 16%, #10B981 0%, transparent 58%),'
            + 'linear-gradient(118deg, #047857 0%, #059669 44%, #10B981 78%, #047857 100%)',
          boxShadow:
            '0 24px 52px -30px rgba(6,78,59,0.55), 0 8px 24px rgba(4,120,87,0.20),'
            + 'inset 0 1px 0 rgba(255,255,255,0.22)',
        }}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          {[440, 640, 850].map((size) => (
            <div
              key={size}
              className="absolute rounded-full"
              style={{
                width: size,
                height: size,
                right: -size * 0.34,
                top: '50%',
                transform: 'translateY(-50%)',
                border: '1px solid rgba(255,255,255,0.10)',
              }}
            />
          ))}
          <div
            className="absolute inset-0"
            style={{ background: 'radial-gradient(120% 130% at 42% 30%, transparent 46%, rgba(3,46,32,0.20) 100%)' }}
          />
        </div>

        <div className="relative z-10 flex flex-col gap-6 sm:gap-7">
          <div className="flex min-w-0 items-center gap-4">
            {icon && (
              <span
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] text-white sm:h-[72px] sm:w-[72px] sm:rounded-[22px]"
                style={{
                  background: 'rgba(255,255,255,0.13)',
                  border: '1px solid rgba(255,255,255,0.26)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
                }}
              >
                {icon}
              </span>
            )}
            <div className="min-w-0">
              <h1 className="text-[26px] font-[800] leading-tight tracking-[-0.025em] text-white sm:text-[34px]">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-1 text-[12.5px] leading-snug sm:text-[13.5px]" style={{ color: 'rgba(255,255,255,0.78)' }}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
          {children && <div>{children}</div>}
        </div>
      </m.div>
    );
  }

  if (compact) {
    return (
      <m.div
        initial={reduce ? false : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0 : 0.35, ease: [0.16, 1, 0.3, 1] }}
        className={cn('pt-1', className)}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {icon && (
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] text-white"
                style={{ background: 'var(--gradient-brand)' }}
              >
                {icon}
              </span>
            )}
            <div className="min-w-0">
              <h1
                className="truncate text-[20px] font-[800] leading-tight sm:text-[23px]"
                style={{ color: 'var(--text-primary)', letterSpacing: '-0.022em' }}
              >
                {title}
              </h1>
              {subtitle && (
                <p className="mt-0.5 truncate text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
        {children && <div className="mt-3">{children}</div>}
      </m.div>
    );
  }

  return (
    <m.div
      initial={reduce ? false : { opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn('relative overflow-hidden rounded-[24px] p-5 sm:rounded-[30px] sm:p-7', className)}
      style={surface ? {
        background: surface.background,
        boxShadow: `0 26px 56px -24px ${surface.shadow}, inset 0 1px 0 rgba(255,255,255,0.14)`,
      } : {
        background:
          'radial-gradient(130% 150% at 50% -25%, #FB9590 0%, transparent 58%),'
          + 'linear-gradient(128deg, #6B2440 0%, #A33757 46%, #852E4E 100%)',
        boxShadow:
          '0 24px 64px -14px rgba(107,36,64,0.55), 0 8px 26px rgba(163,55,87,0.24),'
          + 'inset 0 1px 0 rgba(255,255,255,0.12)',
      }}
    >
      {/* Decorative layers, matching the dashboard hero. All non-interactive
          and all behind the content — a hero you cannot read is not a hero. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {!surface && (
          <>
            <div
              className="absolute -right-14 -top-20 h-60 w-60 rounded-full opacity-35"
              style={{ background: 'radial-gradient(circle, #FF853D 0%, transparent 70%)', filter: 'blur(46px)' }}
            />
            <div
              className="absolute -bottom-20 -left-14 h-60 w-60 rounded-full opacity-25"
              style={{ background: 'radial-gradient(circle, #20BFA4 0%, transparent 70%)', filter: 'blur(54px)' }}
            />
          </>
        )}
        <svg className="absolute inset-0 h-full w-full opacity-[0.055]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="ph-grid" width="34" height="34" patternUnits="userSpaceOnUse">
              <path d="M 34 0 L 0 0 0 34" fill="none" stroke="white" strokeWidth="0.6" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#ph-grid)" />
        </svg>
        <div
          className="absolute inset-0"
          style={{ background: `radial-gradient(120% 120% at 50% 38%, transparent 52%, rgba(15,23,42,${surface ? 0.22 : 0.38}) 100%)` }}
        />
      </div>

      {/* One flex-wrap row rather than two copies of the actions. The actions
          used to render twice — beside the title for desktop, again under the
          children for phones — with one copy hidden by CSS: two of every
          button in the DOM, two tab stops for a keyboard, and two matches for
          anything that looks a button up by name. `order` moves the single
          copy instead: beside the title from `sm` up, last on a phone. */}
      <div className="relative z-10 flex flex-wrap items-start gap-x-3.5 gap-y-4">
        {icon && (
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] text-white sm:h-12 sm:w-12"
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
          <h1 className="text-[21px] font-[800] leading-tight tracking-[-0.02em] text-white sm:text-[26px]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-[12.5px] leading-snug sm:text-[13.5px]" style={{ color: 'rgba(255,255,255,0.72)' }}>
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="order-last w-full sm:order-none sm:w-auto sm:shrink-0">{actions}</div>}
        {children && <div className="w-full">{children}</div>}
      </div>
    </m.div>
  );
}

/**
 * A button for the hero's `actions` slot.
 *
 * The hero is saturated indigo in both themes, so the app's own Button
 * variants — built for the page surface — read as grey slabs on it. Pages had started styling
 * their hero buttons by hand, each slightly differently. This is that styling
 * in one place: `solid` (white, the page's primary action) and `glass`
 * (a translucent secondary, e.g. Refresh).
 */
export interface HeroButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'solid' | 'glass';
  /** The taller pill used by the showcase hero. */
  size?: 'default' | 'lg';
  icon?: React.ReactNode;
}

export const HeroButton = React.forwardRef<HTMLButtonElement, HeroButtonProps>(function HeroButton(
  { variant = 'solid', size = 'default', icon, className, children, type = 'button', style, ...rest }, ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex cursor-pointer items-center justify-center gap-1.5 font-[700]',
        'transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
        size === 'lg'
          ? 'min-h-[52px] rounded-full px-6 text-[15px]'
          : 'min-h-[40px] rounded-[12px] px-4 text-[13px]',
        variant === 'glass' && 'text-white hover:bg-white/20',
        variant === 'solid' && 'hover:bg-white/90',
        className,
      )}
      style={{
        ...(variant === 'solid'
          ? { background: '#fff', color: '#0F172A' }
          : { background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }),
        ...style,
      }}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
});

/** A small glass pill for facts in the hero's children — a goal, a cadence. */
export function HeroChip({ children, icon, className }: { children: React.ReactNode; icon?: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-[650] text-white', className)}
      style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.16)' }}
    >
      {icon}
      {children}
    </span>
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
