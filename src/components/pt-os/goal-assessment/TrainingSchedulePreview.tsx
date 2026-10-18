'use client';
import { useMemo } from 'react';
import { recommendTrainingSplit } from '@/lib/goal-scheduling';

export default function TrainingSchedulePreview({ trainingDays, goal, experience }: { trainingDays: string; goal: string; experience: string }) {
  const schedule = useMemo(() => recommendTrainingSplit(trainingDays, { goal, experience }), [trainingDays, goal, experience]);
  return (
    <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#0f172a,#334155)' }} />
      <div className="p-6">
        <p className="text-[13px] font-[760] text-[color:var(--text-primary)]">{schedule.label}</p>
        <p className="text-[12px] text-[color:var(--text-muted)] mt-1">{schedule.notes}</p>
        <div className="grid grid-cols-7 gap-2 mt-4">
          {schedule.calendar.map((d) => (
            <div key={d.dayIndex} className="rounded-[10px] p-2 text-center" style={{ background: d.type === 'training' ? 'rgba(0,103,224,0.10)' : 'var(--bg-subtle)', border: d.type === 'training' ? '1px solid rgba(0,103,224,0.3)' : '1px solid var(--border)' }}>
              <p className="text-[10px] font-[700] uppercase" style={{ color: 'var(--text-muted)' }}>{d.dayName.slice(0,3)}</p>
              <p className="text-[10px] font-[600] mt-1" style={{ color: d.type === 'training' ? '#0059CE' : 'var(--text-muted)' }}>{d.type === 'training' ? (d.session || 'Train') : 'Rest'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
