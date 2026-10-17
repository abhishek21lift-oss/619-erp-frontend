'use client';

import { useState } from 'react';
import Guard from '@/components/Guard';
import { PageContainer, PageHero } from '@/components/ui';
import { calcTargetHeartRate, buildFivePhaseCardio, estimateMaxHeartRate } from '@/lib/cardio-calculations';

export default function CardioCalculatorPage() {
  const [age, setAge] = useState('');
  const [mhr, setMhr] = useState('');
  const [rhr, setRhr] = useState('');
  const [intensity, setIntensity] = useState('0.7');

  const maxHr = mhr ? Number(mhr) : (age ? estimateMaxHeartRate(Number(age)) : null);
  const thr = maxHr && rhr ? calcTargetHeartRate({ maxHeartRate: maxHr, restingHeartRate: Number(rhr), intensityFraction: Number(intensity) }) : null;
  const session = maxHr && rhr ? buildFivePhaseCardio(maxHr, Number(rhr)) : null;

  const cls = 'border rounded px-3 py-2 w-full';

  return (
    <Guard roles={['trainer']}>
      <PageContainer>
        <PageHero title="Cardio & FITT Calculator" subtitle="Karvonen target heart rate and five-phase cardio session." />
        <div className="grid gap-4 max-w-xl">
          <label>Age (optional)<input className={cls} type="number" value={age} onChange={(e) => setAge(e.target.value)} /></label>
          <label>Max HR (measured)<input className={cls} type="number" value={mhr} onChange={(e) => setMhr(e.target.value)} /></label>
          <label>Resting HR<input className={cls} type="number" value={rhr} onChange={(e) => setRhr(e.target.value)} /></label>
          <label>Intensity fraction (0-1)<input className={cls} type="number" value={intensity} onChange={(e) => setIntensity(e.target.value)} /></label>
          <div>Estimated/used MHR: {maxHr ?? '—'}</div>
          <div>Target HR: {thr ?? '—'} BPM</div>
          {session && (
            <div>
              <h3 className="font-semibold">Five-phase session (total {session.totalMinutes} min)</h3>
              <ul>
                {session.phases.map((p) => (
                  <li key={p.name}>{p.name}: {p.durationMinutes} min — THR {p.targetHeartRate ?? '—'} BPM</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </PageContainer>
    </Guard>
  );
}
