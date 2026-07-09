'use client';

import { cn } from '@/components/ui/cn';

interface NavSeparatorProps {
  label?:    string;
  className?: string;
}

export function NavSeparator({ label, className }: NavSeparatorProps) {
  if (label) {
    return (
      <div className={cn('flex items-center gap-2 px-3 py-2', className)}>
        <span
          className="text-[10px] font-semibold uppercase tracking-widest select-none"
          style={{ color: 'rgba(255,255,255,0.28)', letterSpacing: '0.10em' }}
        >
          {label}
        </span>
        <div
          className="flex-1 h-px"
          style={{ background: 'rgba(255,255,255,0.06)' }}
          aria-hidden="true"
        />
      </div>
    );
  }

  return (
    <div
      className={cn('mx-3 my-1 h-px', className)}
      style={{ background: 'rgba(255,255,255,0.06)' }}
      role="separator"
      aria-hidden="true"
    />
  );
}
