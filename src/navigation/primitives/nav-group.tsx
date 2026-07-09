'use client';

// NavGroup primitive — collapsible section wrapper with framer-motion height animation.
// Uses `m` (lazy motion) not `motion` (full bundle).

import { type ReactNode } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { cn } from '@/components/ui/cn';

interface NavGroupPrimitiveProps {
  /** Unique group id — passed to toggle/open/close from NavigationContext. */
  groupId:       string;
  label:         string;
  isOpen:        boolean;
  onToggle:      () => void;
  /** Header content — trigger for expand/collapse. */
  header:        ReactNode;
  /** Collapsible body content. */
  children:      ReactNode;
  className?:    string;
  /** If true, the group header is not interactive (always open). */
  alwaysOpen?:   boolean;
}

export function NavGroupPrimitive({
  groupId,
  label,
  isOpen,
  onToggle,
  header,
  children,
  className,
  alwaysOpen,
}: NavGroupPrimitiveProps) {
  return (
    <div className={cn('flex flex-col', className)} data-group-id={groupId}>
      {/* Group header / trigger */}
      {alwaysOpen ? (
        <div aria-label={label}>{header}</div>
      ) : (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={`nav-group-${groupId}`}
          className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 rounded-lg"
        >
          {header}
        </button>
      )}

      {/* Collapsible body */}
      <AnimatePresence initial={false}>
        {(isOpen || alwaysOpen) && (
          <m.div
            id={`nav-group-${groupId}`}
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{   height: 0,      opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
            role="region"
            aria-label={label}
          >
            {children}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
