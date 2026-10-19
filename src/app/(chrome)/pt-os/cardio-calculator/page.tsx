'use client';
/**
 * Cardio & FITT calculator — Karvonen target heart rate and the five-phase
 * session builder.
 *
 * All arithmetic lives in @/lib/cardio-calculations (the twin of the backend
 * module), so what a trainer previews here is the same formula the server
 * would compute. Measured max HR is preferred; the age estimate is labelled as
 * an estimate everywhere it appears, because it is one.
 */
import { useMemo, useState } from 'react';
import Guard from '@/components/Guard';
import { PageContainer, PageHero, FormField, TextInput, SelectInput } from '@/components/ui';
import { HeartPulse } from 'lucide-react';
import {
  calcTargetHeartRate,
  buildCardioSession,
  estimateMaxHeartRate,
  classifyCardioModality,
  INTENSITY_ZONE_FRACTIONS,
  type CardioIntensityZone,
} from '@/lib/cardio-calculations';

const PHASE_LABELS = [
  { key: 'generalWarmup', name: 'General warm-up', fraction: 0.4 },
  { key: 'rewarmup', name: 'Re-warm-up / specific prep', fraction: 0.5 },
  { key: 'work', name: 'Work phase', fraction: 0.7 },
  { key: 'cooldown', name: 'Cool-down', fraction: 0.4 },
  { key: 'stretching', name: 'Static stretching', fraction: 0.3 },
];

/** Text → a positive integer, or null. Blank is "not entered", never zero. */
function positiveInteger(text: string): number | null {
  const n = Number(text);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Phase minutes: blank or invalid is zero minutes, stated rather than coerced. */
function minutesOf(text: string): number {
  const n = Number(text);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export default function CardioCalculatorPage() {
  const [age, setAge] = useState('');
  const [mhr, setMhr] = useState('');
  const [rhr, setRhr] = useState('');
  const [zone, setZone] = useState<CardioIntensityZone>('moderate');
  const [modality, setModality] = useState('');
  const [phases, setPhases] = useState(
    PHASE_LABELS.map((p) => ({ ...p, minutes: p.key === 'work' ? '20' : '5' })),
  );

  const ageValue = positiveInteger(age);
  const measuredMhr = positiveInteger(mhr);
  const estimatedMhr = measuredMhr == null && ageValue != null ? estimateMaxHeartRate(ageValue) : null;
  const maxHr = measuredMhr ?? estimatedMhr;
  const restingHr = positiveInteger(rhr);

  const valid = maxHr != null && restingHr != null && restingHr < maxHr;

  const session = useMemo(() => {
    if (!valid) return null;
    return buildCardioSession({
      maxHeartRate: maxHr as number,
      restingHeartRate: restingHr as number,
      phases: phases.map((p) => ({
        name: p.name,
        durationMinutes: minutesOf(p.minutes),
        intensityFraction: p.fraction,
      })),
    });
  }, [valid, maxHr, restingHr, phases]);

  const zoneRange = useMemo(() => {
    if (!valid) return null;
    const [lo, hi] = INTENSITY_ZONE_FRACTIONS[zone];
    return {
      min: calcTargetHeartRate({ maxHeartRate: maxHr as number, restingHeartRate: restingHr as number, intensityFraction: lo }),
      max: calcTargetHeartRate({ maxHeartRate: maxHr as number, restingHeartRate: restingHr as number, intensityFraction: hi }),
    };
  }, [valid, maxHr, restingHr, zone]);

  const modalityClass = modality ? classifyCardioModality(modality) : null;

  return (
    <Guard roles={['trainer']}>
      <PageContainer>
        <PageHero
          icon={<HeartPulse size={20} color="#fff" />}
          title="Cardio & FITT"

        />
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-[14px] border p-4">
            <h2 className="mb-3 text-[15px] font-[700]">Client numbers</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Age (for estimate only)">
                <TextInput inputMode="numeric" min={1} max={120} value={age}
                  onChange={(e) => setAge(e.target.value)} />
              </FormField>
              <FormField label="Measured max HR (preferred)">
                <TextInput inputMode="numeric" value={mhr} onChange={(e) => setMhr(e.target.value)} />
              </FormField>
              <FormField label="Resting HR">
                <TextInput inputMode="numeric" value={rhr} onChange={(e) => setRhr(e.target.value)} />
              </FormField>
              <FormField label="Intensity zone">
                <SelectInput value={zone} onChange={(e) => setZone(e.target.value as CardioIntensityZone)}>
                  {(Object.keys(INTENSITY_ZONE_FRACTIONS) as CardioIntensityZone[]).map((z) => <option key={z} value={z}>{z}</option>)}
                </SelectInput>
              </FormField>
              <FormField label="Modality" className="sm:col-span-2">
                <TextInput value={modality} onChange={(e) => setModality(e.target.value)}
                  placeholder="Running, elliptical, cycling…" />
              </FormField>
            </div>

            <div className="mt-4 space-y-1 text-[13px]">
              <p>
                Max HR used: <strong>{maxHr ?? '—'}</strong>
                {estimatedMhr != null && <em> (age-based estimate, not a measurement — use a measured value where available)</em>}
              </p>
              <p>
                Target HR ({zone}): <strong>{zoneRange ? `${zoneRange.min}–${zoneRange.max}` : '—'} BPM</strong>
              </p>
              {modalityClass && <p>Modality category: <strong>{modalityClass.replace(/-/g, ' ')}</strong></p>}
              {!valid && <p className="opacity-70">Enter a resting HR below the max HR to calculate.</p>}
            </div>
          </section>

          <section className="rounded-[14px] border p-4">
            <h2 className="mb-3 text-[15px] font-[700]">Five-phase session</h2>
            <div className="space-y-2">
              {phases.map((p, i) => (
                <div key={p.key} className="grid grid-cols-[1fr_84px_84px] items-center gap-2 text-[12px]">
                  <span>{p.name}</span>
                  <div className="flex items-center gap-1">
                    <FormField label={`${p.name} minutes`} labelHidden>
                      <TextInput inputMode="numeric" min={0} max={180} value={p.minutes}
                        onChange={(e) => setPhases((prev) => prev.map((x, j) => (j === i ? { ...x, minutes: e.target.value } : x)))} />
                    </FormField>
                    <span>min</span>
                  </div>
                  <span className="text-right">
                    {session?.phases[i]?.targetHeartRate != null ? `${session.phases[i].targetHeartRate} BPM` : '—'}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[13px]">
              Total planned duration: <strong>{session ? `${session.totalMinutes} min` : '—'}</strong>
            </p>
            <ul className="mt-2 space-y-1 text-[12px] opacity-80">
              <li>Frequency: sessions per week are set on the plan, not here.</li>
              <li>Type: {modality || 'pick a modality above'}.</li>
              <li>Intensity: target HR above, or RPE / talk-test where HR is unreliable (medication, heat, beta-blockers).</li>
            </ul>
          </section>
        </div>
      </PageContainer>
    </Guard>
  );
}
