'use client';

import { HeartPulse, Sparkles } from 'lucide-react';

const PROGRAM_FOCUS = [
  'Cardiovascular health', 'Respiratory fitness', 'Muscular strength', 'Muscular endurance',
  'Flexibility', 'Mobility', 'Body composition', 'Functional fitness',
];
const SESSION_TYPES = [
  'Cardio', 'Strength training', 'Resistance training', 'Functional training',
  'HIIT', 'Stretching', 'Mobility work', 'Recovery',
];
const BENEFITS = [
  'Improved heart health', 'Improved endurance', 'Fat loss', 'Muscle gain',
  'Better posture', 'Improved mobility', 'Improved flexibility',
  'Reduced disease risk', 'Improved mental health', 'Improved quality of life',
];

function Pills({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => (
        <span key={it} className="rounded-full px-3 py-1.5 text-[12px] font-[650]" style={{ background: 'var(--bg-subtle)', color: '#334155', border: '1px solid rgba(15,23,42,0.08)' }}>
          {it}
        </span>
      ))}
    </div>
  );
}

// Read-only informational step — Section 1 (Nature of Program) + Section 3
// (Benefits). No acknowledgement/checkbox here by design; risk-specific
// acknowledgement lives on the following step alongside responsibilities.
export function StepProgramOverview() {
  return (
    <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#0d9488,#0f766e)' }} />
      <div className="p-7 sm:p-10 space-y-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f766e' }}>
            <HeartPulse size={20} color="#fff" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Nature of the Personal Training Program</h2>
            <p className="text-[13px] text-slate-400 mt-1.5">Step 2 of 7 — please read before continuing.</p>
          </div>
        </div>

        <div>
          <p className="mb-3 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>
            This program is designed to improve
          </p>
          <Pills items={PROGRAM_FOCUS} />
        </div>

        <div>
          <p className="mb-3 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>
            Sessions may include
          </p>
          <Pills items={SESSION_TYPES} />
        </div>

        <div className="h-px w-full" style={{ background: 'rgba(15,23,42,0.08)' }} />

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={14} style={{ color: '#0d9488' }} />
            <p className="text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>
              Benefits of exercise
            </p>
          </div>
          <Pills items={BENEFITS} />
        </div>
      </div>
    </div>
  );
}

export default StepProgramOverview;
