'use client';

import * as React from 'react';
import { m, useInView, type Variants } from 'framer-motion';

interface BlurFadeProps {
  children: React.ReactNode;
  className?: string;
  variant?: { hidden: { y: number }; visible: { y: number } };
  duration?: number;
  delay?: number;
  yOffset?: number;
  blur?: string;
  inView?: boolean;
  inViewMargin?: string;
}

const defaultVariants: Variants = {
  hidden: { opacity: 0, y: -6, filter: 'blur(6px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)' },
};

export function BlurFade({
  children,
  className,
  variant,
  duration = 0.4,
  delay = 0,
  yOffset = 6,
  blur = '6px',
  inView = false,
  inViewMargin = '-50px',
}: BlurFadeProps) {
  const ref = React.useRef(null);
  const inViewResult = useInView(ref, {
    once: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    margin: inViewMargin as any,
  });
  const isVisible = !inView || inViewResult;

  const combinedVariant: Variants = variant ?? {
    hidden: { opacity: 0, y: yOffset, filter: `blur(${blur})` },
    visible: { opacity: 1, y: -yOffset, filter: 'blur(0px)' },
  };

  return (
    <m.div
      ref={ref}
      initial="hidden"
      animate={isVisible ? 'visible' : 'hidden'}
      variants={combinedVariant}
      transition={{ duration, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
    >
      {children}
    </m.div>
  );
}
