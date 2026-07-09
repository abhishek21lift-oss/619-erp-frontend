'use client';

// Custom tooltip primitive — does NOT use @radix-ui/react-tooltip (not installed).
// Uses CSS-only positioning with a data attribute and framer-motion for the enter animation.

import { useState, useRef, type ReactNode } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { cn } from '@/components/ui/cn';

interface NavTooltipProps {
  content:    string;
  children:   ReactNode;
  side?:      'right' | 'top' | 'bottom';
  disabled?:  boolean;
  className?: string;
}

const sideStyles: Record<'right' | 'top' | 'bottom', string> = {
  right:  'left-full top-1/2 -translate-y-1/2 ml-2',
  top:    'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full  left-1/2 -translate-x-1/2 mt-2',
};

export function NavTooltip({ content, children, side = 'right', disabled = false, className }: NavTooltipProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    if (disabled) return;
    timeoutRef.current = setTimeout(() => setVisible(true), 120);
  };

  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  return (
    <div
      className={cn('relative inline-flex', className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}

      <AnimatePresence>
        {visible && (
          <m.div
            role="tooltip"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{   opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'pointer-events-none absolute z-[100] whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[12px] font-medium',
              sideStyles[side],
            )}
            style={{
              background:         'rgba(18,16,28,0.96)',
              border:             '1px solid rgba(167,139,250,0.20)',
              backdropFilter:     'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              boxShadow:          '0 4px 20px rgba(0,0,0,0.40)',
              color:              'rgba(255,255,255,0.88)',
            }}
          >
            {content}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
