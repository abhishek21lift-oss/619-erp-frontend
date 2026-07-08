'use client';

import * as React from 'react';
import { cn } from '@/components/ui/cn';

interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  shimmerColor?: string;
  shimmerSize?: string;
  borderRadius?: string;
  shimmerDuration?: string;
  background?: string;
  children: React.ReactNode;
}

export function ShimmerButton({
  shimmerColor = '#ffffff',
  shimmerSize = '0.05em',
  shimmerDuration = '3s',
  borderRadius = '100px',
  background = 'rgba(0, 0, 0, 1)',
  className,
  children,
  ...props
}: ShimmerButtonProps) {
  return (
    <button
      style={
        {
          '--spread': '90deg',
          '--shimmer-color': shimmerColor,
          '--radius': borderRadius,
          '--speed': shimmerDuration,
          '--cut': shimmerSize,
          '--bg': background,
        } as React.CSSProperties
      }
      className={cn(
        'group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap border border-white/10 px-6 py-3 text-white',
        '[background:var(--bg)] [border-radius:var(--radius)]',
        'transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]',
        className,
      )}
      {...props}
    >
      {/* shimmer layer */}
      <div
        className={cn(
          'absolute inset-0 overflow-visible [container-type:size]',
        )}
      >
        <div
          className="absolute inset-0 h-full w-full animate-shimmer-slide [aspect-ratio:1] [border-radius:0] [mask:none]"
          style={{
            background: `conic-gradient(from calc(270deg - (var(--spread) * 0.5)), transparent 0, var(--shimmer-color) var(--spread), transparent var(--spread))`,
            animationDuration: 'var(--speed)',
          }}
        />
      </div>

      {/* highlight */}
      <div
        className="absolute inset-[var(--cut)] z-10 rounded-[calc(var(--radius)-var(--cut))]"
        style={{ background: 'var(--bg)' }}
      />

      {/* content */}
      <span className="relative z-20 flex items-center gap-2 font-medium">
        {children}
      </span>

      <style>{`
        @keyframes shimmer-slide {
          to { transform: translate(calc(100cqw - 100%), 0); }
        }
        .animate-shimmer-slide {
          animation: shimmer-slide var(--speed) ease-in-out infinite alternate;
        }
      `}</style>
    </button>
  );
}
