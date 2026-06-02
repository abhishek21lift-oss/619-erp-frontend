'use client';

import * as React from 'react';
import { cn } from '@/components/ui/cn';

export interface DashboardSkeletonProps {
  className?: string;
}

export const DashboardSkeleton = React.forwardRef<HTMLDivElement, DashboardSkeletonProps>(
  function DashboardSkeleton({ className }, ref) {
    return (
      <div
        ref={ref}
        className={cn('space-y-6', className)}
        role="status"
        aria-label="Loading dashboard"
      >
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-10 w-28 rounded-2xl bg-[var(--bg-subtle)] animate-pulse"
            />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-[140px] rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-[0_10px_40px_rgba(0,0,0,0.06)]"
            >
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-[var(--bg-subtle)] animate-pulse" />
                <div className="h-3 w-24 rounded-full bg-[var(--bg-subtle)] animate-pulse" />
              </div>
              <div className="mt-6 h-7 w-32 rounded-full bg-[var(--bg-subtle)] animate-pulse" />
              <div className="mt-3 h-2 w-20 rounded-full bg-[var(--bg-subtle)] animate-pulse" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 h-[260px] rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-[0_10px_40px_rgba(0,0,0,0.06)]">
            <div className="h-4 w-40 rounded-full bg-[var(--bg-subtle)] animate-pulse" />
            <div className="mt-2 h-3 w-56 rounded-full bg-[var(--bg-subtle)] animate-pulse" />
            <div className="mt-6 h-[170px] rounded-2xl bg-[var(--bg-subtle)] animate-pulse" />
          </div>
          <div className="h-[260px] rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-[0_10px_40px_rgba(0,0,0,0.06)]">
            <div className="h-4 w-32 rounded-full bg-[var(--bg-subtle)] animate-pulse" />
            <div className="mt-2 h-3 w-40 rounded-full bg-[var(--bg-subtle)] animate-pulse" />
            <div className="mt-6 flex justify-center">
              <div className="h-[160px] w-[160px] rounded-full bg-[var(--bg-subtle)] animate-pulse" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-[110px] rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-[0_10px_40px_rgba(0,0,0,0.06)]"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[var(--bg-subtle)] animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-20 rounded-full bg-[var(--bg-subtle)] animate-pulse" />
                  <div className="h-5 w-16 rounded-full bg-[var(--bg-subtle)] animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  },
);
