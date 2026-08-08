'use client';

import { m, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { STEPS, type StepId } from './types';

interface ProgressTimelineProps {
  current: StepId;
  onStep: (s: StepId) => void;
}

export function ProgressTimeline({ current, onStep }: ProgressTimelineProps) {
  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex items-center min-w-max px-1">
        {STEPS.map((s, i) => {
          const done = current > s.id;
          const active = current === s.id;
          return (
            <div key={s.id} className="flex items-center">
              <button
                type="button"
                onClick={() => { if (s.id <= current + 1) onStep(s.id as StepId); }}
                className="flex flex-col items-center gap-2 min-w-0"
              >
                <div
                  className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-[800] transition-all duration-300"
                  style={{
                    background: done ? '#0067E0' : active ? '#fff' : 'rgba(255,255,255,0.14)',
                    color: done ? '#fff' : active ? '#0F172A' : 'rgba(255,255,255,0.7)',
                    boxShadow: active ? '0 0 0 4px rgba(255,255,255,0.18), 0 2px 8px rgba(0,0,0,0.2)' : 'none',
                    transform: active ? 'scale(1.08)' : 'scale(1)',
                  }}
                >
                  <AnimatePresence mode="wait">
                    {done ? (
                      <m.span key="ck" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ duration: 0.2 }}>
                        <Check size={15} strokeWidth={3} />
                      </m.span>
                    ) : (
                      <m.span key="nm" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ duration: 0.15 }}>
                        {s.id}
                      </m.span>
                    )}
                  </AnimatePresence>
                </div>
                <span
                  className="text-[10.5px] font-[680] tracking-tight whitespace-nowrap max-w-[90px] text-center leading-tight"
                  style={{ color: active ? '#fff' : done ? '#7FB4FF' : 'rgba(255,255,255,0.55)' }}
                >
                  {s.label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div className="relative h-[2px] w-8 sm:w-12 mx-1.5 mb-5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.18)' }}>
                  <m.div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ background: 'linear-gradient(90deg, #0067E0, #0059CE)' }}
                    animate={{ width: done ? '100%' : '0%' }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ProgressTimeline;
