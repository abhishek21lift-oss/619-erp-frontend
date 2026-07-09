'use client';

// NavItem primitive — a polymorphic navigation link.
// Renders as <a> via Next.js Link when href is provided and item is not disabled.
// Renders as <span> when disabled (comingSoon), preserving accessible label.

import Link from 'next/link';
import { type ReactNode, type MouseEventHandler } from 'react';
import { cn } from '@/components/ui/cn';

interface NavItemPrimitiveProps {
  href:         string;
  label:        string;
  isActive?:    boolean;
  isDisabled?:  boolean;
  /** Rendered inside the item — typically an icon + label. */
  children:     ReactNode;
  className?:   string;
  onClick?:     MouseEventHandler<HTMLAnchorElement | HTMLSpanElement>;
  /** Extra aria-label if the visible label isn't descriptive enough. */
  ariaLabel?:   string;
}

export function NavItemPrimitive({
  href,
  label,
  isActive,
  isDisabled,
  children,
  className,
  onClick,
  ariaLabel,
}: NavItemPrimitiveProps) {
  const shared = {
    className: cn(
      'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400',
      isActive  && 'text-purple-300',
      !isActive && !isDisabled && 'text-white/60 hover:text-white/90',
      isDisabled && 'cursor-not-allowed text-white/25',
      className,
    ),
    'aria-label':   ariaLabel ?? label,
    'aria-current': isActive ? ('page' as const) : undefined,
    'aria-disabled': isDisabled,
  };

  if (isDisabled) {
    return (
      <span
        {...shared}
        role="link"
        tabIndex={-1}
        onClick={onClick as MouseEventHandler<HTMLSpanElement>}
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      {...shared}
      onClick={onClick as MouseEventHandler<HTMLAnchorElement>}
    >
      {children}
    </Link>
  );
}
