'use client';
import { ReactNode } from 'react';

interface WorkflowLayoutProps {
  hero: ReactNode;
  main: ReactNode;
  aside: ReactNode;
  footer: ReactNode;
  alerts?: ReactNode;
}

export function WorkflowLayout({ hero, main, aside, footer, alerts }: WorkflowLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-white">
      <div className="max-w-[1180px] mx-auto px-4 py-6 pb-32">
        {hero}
        {alerts && <div className="mb-4 space-y-2">{alerts}</div>}
        <div className="flex flex-col xl:flex-row gap-5">
          <div className="flex-1 min-w-0 space-y-5">{main}</div>
          <div className="xl:w-[340px] shrink-0 space-y-4">{aside}</div>
        </div>
      </div>
      {/* Sticky footer is portalled here — rendered by StickyActionBar */}
      {footer}
    </div>
  );
}
