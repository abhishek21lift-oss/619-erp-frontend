'use client';

import { useEffect, useRef } from 'react';
import { useInView, useMotionValue, useSpring } from 'framer-motion';
import { cn } from '@/components/ui/cn';

interface NumberTickerProps {
  value: number;
  direction?: 'up' | 'down';
  delay?: number;
  decimalPlaces?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export function NumberTicker({
  value,
  direction = 'up',
  delay = 0,
  decimalPlaces = 0,
  className,
  prefix = '',
  suffix = '',
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(direction === 'down' ? value : 0);
  const spring = useSpring(motionValue, { damping: 60, stiffness: 100 });
  const isInView = useInView(ref, { once: true, margin: '0px' });

  useEffect(() => {
    if (isInView) {
      setTimeout(() => {
        motionValue.set(direction === 'down' ? 0 : value);
      }, delay * 1000);
    }
  }, [motionValue, isInView, delay, value, direction]);

  useEffect(() => {
    return spring.on('change', (latest) => {
      if (ref.current) {
        ref.current.textContent =
          prefix +
          Intl.NumberFormat('en-US', {
            minimumFractionDigits: decimalPlaces,
            maximumFractionDigits: decimalPlaces,
          }).format(Number(latest.toFixed(decimalPlaces))) +
          suffix;
      }
    });
  }, [spring, decimalPlaces, prefix, suffix]);

  return (
    <span
      ref={ref}
      className={cn('tabular-nums tracking-tight', className)}
    >
      {prefix}0{suffix}
    </span>
  );
}
