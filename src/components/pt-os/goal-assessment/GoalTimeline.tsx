'use client';

import { Flag, MapPin } from 'lucide-react';

interface GoalTimelineProps {
  targetDate: string;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export function GoalTimeline({ targetDate }: GoalTimelineProps) {
  const start = new Date();
  const target = new Date(targetDate);
  if (isNaN(target.getTime())) return null;

  const milestones: { label: string; date: Date }[] = [{ label: 'Start', date: start }];
  for (const weeks of [4, 8, 12]) {
    const d = new Date(start);
    d.setDate(d.getDate() + weeks * 7);
    if (d < target) milestones.push({ label: `Week ${weeks}`, date: d });
  }
  milestones.push({ label: 'Goal Achieved', date: target });

  return (
    <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#0f172a,#334155)' }} />
      <div className="p-7 sm:p-10">
        <div className="flex items-start gap-4 mb-7">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
            <Flag size={20} color="#1CA3F9" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Goal Timeline</h2>
            <p className="text-[13px] text-slate-400 mt-1.5">The roadmap from today to goal day.</p>
          </div>
        </div>

        <div className="overflow-x-auto pb-1">
          <div className="flex items-center min-w-max px-1">
            {milestones.map((m, i) => (
              <div key={m.label} className="flex items-center">
                <div className="flex flex-col items-center gap-2 min-w-[86px]">
                  <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
                    style={{
                      background: i === milestones.length - 1 ? '#0067E0' : i === 0 ? '#0f172a' : '#f1f5f9',
                      color: i === milestones.length - 1 || i === 0 ? '#fff' : '#94a3b8',
                    }}
                  >
                    {i === milestones.length - 1 ? <Flag size={15} /> : <MapPin size={14} />}
                  </div>
                  <span className="text-[10.5px] font-[680] tracking-tight whitespace-nowrap text-center" style={{ color: '#475569' }}>{m.label}</span>
                  <span className="text-[10px] font-[600]" style={{ color: '#94a3b8' }}>{fmtDate(m.date)}</span>
                </div>
                {i < milestones.length - 1 && (
                  <div className="h-[2px] w-10 sm:w-16 mx-1.5 mb-6 rounded-full" style={{ background: 'linear-gradient(90deg, #0067E0, #0059CE)' }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default GoalTimeline;
