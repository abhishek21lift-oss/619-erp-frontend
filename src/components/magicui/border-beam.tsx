'use client';

import * as React from 'react';
import { cn } from '@/components/ui/cn';

interface BorderBeamProps {
  className?: string;
  size?: number;
  duration?: number;
  delay?: number;
  colorFrom?: string;
  colorTo?: string;
  borderWidth?: number;
}

export function BorderBeam({
  className,
  size = 200,
  duration = 15,
  delay = 0,
  colorFrom = '#ffaa40',
  colorTo = '#9c40ff',
  borderWidth = 1.5,
}: BorderBeamProps) {
  return (
    <div
      style={
        {
          '--size': size,
          '--duration': duration,
          '--delay': delay,
          '--color-from': colorFrom,
          '--color-to': colorTo,
          '--border-width': borderWidth,
        } as React.CSSProperties
      }
      className={cn(
        'pointer-events-none absolute inset-0 rounded-[inherit]',
        // The animated beam
        'after:absolute after:inset-[-1px] after:rounded-[inherit]',
        className,
      )}
    >
      <div
        className="absolute inset-0 rounded-[inherit] [border:calc(var(--border-width)*1px)_solid_transparent]"
        style={{
          background: `linear-gradient(#0000, #0000) padding-box, conic-gradient(from calc(var(--delay) * 1s), transparent 0, var(--color-from) 5%, var(--color-to) 10%, transparent 15%) border-box`,
          animation: `border-beam calc(var(--duration) * 1s) infinite linear`,
          animationDelay: `calc(var(--delay) * -1s)`,
        }}
      />
      <style>{`
        @keyframes border-beam {
          100% { offset-distance: 100%; }
        }
      `}</style>
    </div>
  );
}
