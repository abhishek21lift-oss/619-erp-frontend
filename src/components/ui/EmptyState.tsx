// frontend/src/components/ui/EmptyState.tsx
//
// Use whenever a list / table / chart has no data. Always pair with a
// suggested next action (CTA) so the screen doesn't feel like a dead end.

import * as React from 'react';
import { cn } from './cn';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        'flex flex-col items-center justify-center gap-2 py-10 text-center',
        className,
      )}
    >
      {icon && (
        <div className="mb-2 grid h-12 w-12 place-items-center rounded-full bg-[var(--bg-subtle)] text-[var(--text-muted)]">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
      {description && (
        <p className="max-w-sm text-xs text-[var(--text-muted)]">{description}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
