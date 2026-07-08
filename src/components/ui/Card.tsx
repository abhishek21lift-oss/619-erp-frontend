'use client';

import * as React from 'react';
import { useMotionTemplate, useMotionValue, m } from 'framer-motion';
import { cn } from './cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Enable mouse-tracking spotlight effect on hover */
  spotlight?: boolean;
  /** Size of the spotlight gradient in px */
  spotlightSize?: number;
  /** Show a border-beam glow on the card border */
  glow?: boolean;
}

export function Card({
  className,
  spotlight = false,
  spotlightSize = 300,
  glow = false,
  children,
  ...props
}: CardProps) {
  const mouseX = useMotionValue(-spotlightSize);
  const mouseY = useMotionValue(-spotlightSize);

  const handleMouseMove = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!spotlight) return;
      const { left, top } = e.currentTarget.getBoundingClientRect();
      mouseX.set(e.clientX - left);
      mouseY.set(e.clientY - top);
    },
    [mouseX, mouseY, spotlight],
  );

  const handleMouseLeave = React.useCallback(() => {
    if (!spotlight) return;
    mouseX.set(-spotlightSize);
    mouseY.set(-spotlightSize);
  }, [mouseX, mouseY, spotlight, spotlightSize]);

  const spotlightBg = useMotionTemplate`radial-gradient(${spotlightSize}px circle at ${mouseX}px ${mouseY}px, rgba(var(--brand-rgb, 59 130 246) / 0.07), transparent 70%)`;

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'group relative overflow-hidden rounded-[var(--radius-xl,24px)]',
        'bg-[var(--bg-card)] backdrop-blur-[20px] saturate-[160%]',
        'border border-[var(--border)]',
        'shadow-[var(--shadow-card)]',
        'transition-all duration-250',
        'hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5',
        glow && 'ring-1 ring-[var(--brand)]/20',
        className,
      )}
      {...props}
    >
      {spotlight && (
        <m.div
          className="pointer-events-none absolute inset-0 z-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: spotlightBg }}
          aria-hidden
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4',
        'border-b border-[var(--border)] px-6 py-4',
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        'text-[15px] font-semibold tracking-tight text-[var(--text-primary)]',
        className,
      )}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-[13px] text-[var(--text-muted)]', className)}
      {...props}
    />
  );
}

export function CardBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 py-5', className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-3',
        'border-t border-[var(--border)] px-6 py-3',
        className,
      )}
      {...props}
    />
  );
}
