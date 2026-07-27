'use client';

/**
 * PullIndicator — the premium, branded refresh indicator.
 *
 * A glass-morphism disc pinned to the top of the scroll area that follows the
 * pull. Stages, driven by phase + progress:
 *
 *   idle → arrow appears → arrow rotates + ring fills → (armed, gold) →
 *   brand mark spins while refreshing → success checkmark → bounce back
 *
 * Motion is GPU-friendly (transform/opacity only). Under reduced-motion the
 * disc simply fades without translate/rotate/spring.
 */

import Image from 'next/image';
import { m, AnimatePresence } from 'framer-motion';
import { ArrowDown, Check } from 'lucide-react';
import { BRAND, clamp } from './utils';
import { BOUNCE_EASE, POP_SPRING, arrowRotation, indicatorOpacity, indicatorScale } from './animations';
import type { PullIndicatorProps } from './types';

const SIZE = 46;
const STROKE = 3;
const R = (SIZE - STROKE) / 2 - 1;
const CIRC = 2 * Math.PI * R;

export default function PullIndicator({ phase, progress, pullDistance, reducedMotion }: PullIndicatorProps) {
  const p = clamp(progress, 0, 1);
  const active = phase !== 'idle';
  const armed = phase === 'ready';
  const refreshing = phase === 'refreshing';
  const success = phase === 'success';
  const dragging = phase === 'pulling' || phase === 'ready';

  const ringColor = success ? BRAND.success : refreshing ? BRAND.maroon : armed ? BRAND.gold : BRAND.mute;
  // While refreshing the ring becomes an indeterminate arc that spins.
  const ringOffset = refreshing ? CIRC * 0.72 : CIRC * (1 - (success ? 1 : p));

  const translateY = reducedMotion
    ? (active ? 14 : -(SIZE + 12))
    : Math.max(pullDistance - SIZE - 8, -(SIZE + 8));
  const opacity = reducedMotion ? (active ? 1 : 0) : indicatorOpacity(p);
  const scale = reducedMotion ? 1 : indicatorScale(p);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: 0,
        left: '50%',
        transform: `translate(-50%, ${translateY}px)`,
        opacity,
        transition: dragging ? 'none' : `transform 0.5s ${BOUNCE_EASE}, opacity 0.3s ease`,
        pointerEvents: 'none',
        zIndex: 40,
        willChange: dragging ? 'transform' : undefined,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: SIZE,
          height: SIZE,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          background: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.7)',
          boxShadow: '0 10px 30px rgba(74,10,30,0.18), 0 2px 8px rgba(74,10,30,0.08)',
          transform: `scale(${scale})`,
          transition: dragging ? 'none' : `transform 0.5s ${BOUNCE_EASE}`,
        }}
      >
        {/* Circular progress ring */}
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          style={{
            position: 'absolute',
            inset: 0,
            transform: 'rotate(-90deg)',
            transformOrigin: 'center',
            animation: refreshing && !reducedMotion ? 'spin 0.9s linear infinite' : undefined,
          }}
        >
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="rgba(15,23,42,0.08)" strokeWidth={STROKE} />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke={ringColor}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={ringOffset}
            style={{ transition: dragging ? 'none' : 'stroke-dashoffset 0.3s ease, stroke 0.25s ease' }}
          />
        </svg>

        {/* Centre content — swaps between stages */}
        <AnimatePresence mode="wait" initial={false}>
          {success ? (
            <m.span
              key="check"
              initial={reducedMotion ? false : { scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={reducedMotion ? { opacity: 0 } : { scale: 0, opacity: 0 }}
              transition={POP_SPRING}
              style={{ display: 'grid', placeItems: 'center' }}
            >
              <Check size={20} color={BRAND.success} strokeWidth={3} />
            </m.span>
          ) : refreshing ? (
            <m.span
              key="logo"
              initial={reducedMotion ? false : { scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={reducedMotion ? { opacity: 0 } : { scale: 0.6, opacity: 0 }}
              transition={POP_SPRING}
              style={{
                display: 'grid',
                placeItems: 'center',
                animation: reducedMotion ? undefined : 'spin 0.9s linear infinite',
              }}
            >
              <Image src="/refresh-logo.png" alt="" width={24} height={24} style={{ width: 24, height: 24, objectFit: 'contain' }} />
            </m.span>
          ) : (
            <m.span
              key="arrow"
              initial={false}
              animate={{ opacity: 1, scale: 1 }}
              exit={reducedMotion ? { opacity: 0 } : { scale: 0.6, opacity: 0 }}
              transition={POP_SPRING}
              style={{ display: 'grid', placeItems: 'center' }}
            >
              <ArrowDown
                size={18}
                color={armed ? BRAND.gold : BRAND.mute}
                strokeWidth={2.5}
                style={{
                  transform: `rotate(${arrowRotation(p)}deg)`,
                  transition: dragging ? 'none' : 'transform 0.3s ease, color 0.2s ease',
                }}
              />
            </m.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
