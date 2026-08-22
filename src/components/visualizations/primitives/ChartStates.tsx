'use client';

import * as React from 'react';
import { AlertCircle, Inbox, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

/**
 * Loading / empty / error, once. Every chart page audited before this system
 * existed rebuilt its own version of these three — a plain pulsing div here,
 * a bespoke "No data" paragraph there. These three are what every Premium*
 * component renders instead, so the same three states look identical whether
 * you're looking at a bar chart or a donut.
 */

export function ChartLoading({ height }: { height: number }) {
  return (
    <div style={{ height }} className="flex items-end gap-2 px-1 pb-1" role="status" aria-label="Loading chart">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton
          key={i}
          className="flex-1"
          height={`${28 + ((i * 37) % 60)}%`}
          style={{ alignSelf: 'flex-end' }}
        />
      ))}
    </div>
  );
}

export function ChartEmpty({
  height,
  title = 'Nothing to show yet',
  description,
  icon,
}: {
  height: number;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div style={{ height }} className="flex items-center justify-center">
      <EmptyState icon={icon ?? <Inbox size={20} />} title={title} description={description} />
    </div>
  );
}

export function ChartError({
  height,
  message = 'Could not load this chart',
  onRetry,
}: {
  height: number;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div style={{ height }} className="flex items-center justify-center">
      <EmptyState
        icon={<AlertCircle size={20} />}
        title={message}
        action={
          onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry} iconLeft={<RefreshCw size={13} />}>
              Retry
            </Button>
          )
        }
      />
    </div>
  );
}
