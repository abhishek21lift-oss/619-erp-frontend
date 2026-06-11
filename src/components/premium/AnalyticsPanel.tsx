'use client';

type AnalyticsPanelProps = {
  title?: string;
  children?: React.ReactNode;
};

export function AnalyticsPanel({ title, children }: AnalyticsPanelProps) {
  return (
    <div className="rounded-[22px] border border-slate-100 bg-white p-6" style={{ boxShadow: '0 2px 16px rgba(15,23,42,0.04)' }}>
      {title && (
        <h3 className="text-[15px] font-[760] tracking-[-0.01em] text-slate-900 mb-4">{title}</h3>
      )}
      {children}
    </div>
  );
}
