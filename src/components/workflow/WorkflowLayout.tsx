'use client';
import { ReactNode, FormEvent } from 'react';

export interface WorkflowLayoutProps {
  // New API (children-based, used by rebuilt pages)
  children?: ReactNode;
  hero?: ReactNode;
  rail?: ReactNode;
  actionBar?: ReactNode;
  onSubmit?: (e: FormEvent) => void;
  // Legacy API (main/aside/footer, kept for backwards compat)
  main?: ReactNode;
  aside?: ReactNode;
  footer?: ReactNode;
  alerts?: ReactNode;
}

export function WorkflowLayout({
  children, hero, rail, actionBar, onSubmit,
  main, aside, footer, alerts,
}: WorkflowLayoutProps) {
  // If using new children API
  if (children !== undefined || rail !== undefined || actionBar !== undefined) {
    const inner = (
      <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 50%, #fff 100%)' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '1.5rem 1rem 8rem' }}>
          {hero}
          {alerts && <div style={{ marginBottom: 16 }}>{alerts}</div>}
          <div style={{ display: 'flex', flexDirection: 'row', gap: 20, alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {children}
            </div>
            {rail && (
              <div style={{ width: 320, flexShrink: 0, position: 'sticky', top: 80 }}>
                {rail}
              </div>
            )}
          </div>
        </div>
        {actionBar}
      </div>
    );
    return onSubmit ? <form onSubmit={onSubmit}>{inner}</form> : inner;
  }

  // Legacy API
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
      {footer}
    </div>
  );
}
