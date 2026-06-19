import * as React from 'react';
import { cn } from './cn';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  accent?: 'brand' | 'gold' | 'success' | 'danger' | 'accent' | 'none';
}

const ACCENT_COLORS: Record<string, string> = {
  brand:   'linear-gradient(135deg, #3B82F6, #2563EB)',
  gold:    'linear-gradient(135deg, #F59E0B, #D97706)',
  success: 'linear-gradient(135deg, #22C55E, #16A34A)',
  danger:  'linear-gradient(135deg, #EF4444, #DC2626)',
  accent:  'linear-gradient(135deg, #8B5CF6, #7C3AED)',
  none:    'none',
};

export function PageHeader({ title, subtitle, actions, className, icon, accent = 'brand' }: PageHeaderProps) {
  const accentGrad = ACCENT_COLORS[accent] ?? ACCENT_COLORS.brand;

  return (
    <div className={cn('page-header', className)}>
      <div className="flex items-start gap-3.5">
        {icon && (
          <div
            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-md"
            style={{ background: accentGrad }}
          >
            {icon}
          </div>
        )}
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle && (
            <p className="page-subtitle mt-1">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}
