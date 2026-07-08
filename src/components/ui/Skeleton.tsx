import * as React from 'react';
import { cn } from './cn';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: number | string;
  height?: number | string;
  variant?: 'rect' | 'circle' | 'pill';
}

export function Skeleton({
  width,
  height = 16,
  variant = 'rect',
  className,
  style,
  ...rest
}: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn(
        'relative overflow-hidden bg-[var(--bg-subtle)]',
        variant === 'rect' && 'rounded-md',
        variant === 'circle' && 'rounded-full',
        variant === 'pill' && 'rounded-full',
        'after:absolute after:inset-0',
        'after:bg-gradient-to-r after:from-transparent after:via-[var(--bg-hover)] after:to-transparent',
        'after:animate-[shimmer-slide_1.6s_ease-in-out_infinite]',
        className,
      )}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        ...style,
      }}
      {...rest}
    />
  );
}

export function SkeletonText({
  lines = 3,
  lastLineWidth = '60%',
  className,
}: {
  lines?: number;
  lastLineWidth?: string | number;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={12}
          width={i === lines - 1 ? lastLineWidth : '100%'}
        />
      ))}
    </div>
  );
}

export function SkeletonKpi() {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-xs)]">
      <Skeleton width="50%" height={12} />
      <div className="mt-3 flex items-center justify-between">
        <Skeleton width="55%" height={28} />
        <Skeleton variant="circle" width={36} height={36} />
      </div>
      <Skeleton className="mt-4" width="40%" height={10} />
    </div>
  );
}
