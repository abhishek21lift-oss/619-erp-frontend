'use client';

import * as React from 'react';
import { useMotionValue, useTransform, animate, useReducedMotion } from 'framer-motion';

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
}

export function AnimatedCounter({
  value,
  prefix = '',
  suffix = '',
  format,
  duration = 1.2,
  className,
}: AnimatedCounterProps) {
  const prefersReducedMotion = useReducedMotion();
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => {
    if (format) return format(latest);
    return Math.round(latest).toLocaleString('en-IN');
  });
  const [display, setDisplay] = React.useState<string>(() => {
    if (prefersReducedMotion) {
      return format ? format(value) : Math.round(value).toLocaleString('en-IN');
    }
    return format ? format(0) : '0';
  });

  React.useEffect(() => {
    if (prefersReducedMotion) {
      setDisplay(format ? format(value) : Math.round(value).toLocaleString('en-IN'));
      return;
    }
    const controls = animate(count, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
    });
    const unsubscribe = rounded.on('change', (v) => setDisplay(v));
    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [value, duration, count, rounded, format, prefersReducedMotion]);

  return (
    <span className={className} aria-label={format ? format(value) : String(value)}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
