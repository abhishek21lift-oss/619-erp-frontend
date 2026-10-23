'use client';

import { useMemo } from 'react';
import { Repeat } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import SearchableSelect from '@/components/pt-os/SearchableSelect';
import { classifyEndurance, scoreCategory, scoreTestBattery } from '@/lib/fitness-calculations';
import type { Gender, FitnessCategory } from '@/lib/fitness-calculations';
import type { AssessmentFormData, EnduranceTestType } from './types';
import { n } from './types';
import { StepHeader } from './StepHeader';
import { categoryPill, gradient, stepTones } from './fitnessTheme';

const ENDURANCE_TESTS: EnduranceTestType[] = ['Push Up Test', 'Curl Up Test', 'Wall Sit', 'Plank', 'Bodyweight Squat', 'Custom'];
const REP_BASED: EnduranceTestType[] = ['Push Up Test', 'Curl Up Test'];

const TONE = stepTones[6];

interface StepEnduranceProps {
  form: AssessmentFormData;
  set: <K extends keyof AssessmentFormData>(key: K, val: AssessmentFormData[K]) => void;
  gender: Gender | null;
  age: number | null;
  error?: string;
}

interface TestResult {
  value: number | null;
  category: FitnessCategory | null;
}

function useTestResult(testType: EnduranceTestType | '', valueType: 'reps' | 'time', reps: string, durationSec: string, gender: Gender | null, age: number | null): TestResult {
  const value = valueType === 'reps' ? n(reps) : n(durationSec);
  const category = classifyEndurance(testType || null, value, gender, age);
  return { value, category };
}

export function StepEndurance({ form, set, gender, age, error }: StepEnduranceProps) {
  const t1 = useTestResult(form.enduranceTestType, form.enduranceValueType, form.enduranceReps, form.enduranceDurationSec, gender, age);
  const t2 = useTestResult(form.enduranceTestType2, form.enduranceValueType2, form.enduranceReps2, form.enduranceDurationSec2, gender, age);
  const combinedScore = useMemo(
    () => scoreTestBattery(scoreCategory(t1.category), scoreCategory(t2.category)),
    [t1.category, t2.category],
  );
  const p1 = t1.category ? categoryPill(t1.category) : null;
  const p2 = t2.category ? categoryPill(t2.category) : null;

  // Each test picks from the full list minus whatever the other test
  // already has selected — structurally prevents picking the same test twice.
  const options1 = ENDURANCE_TESTS.filter((t) => t !== form.enduranceTestType2);
  const options2 = ENDURANCE_TESTS.filter((t) => t !== form.enduranceTestType);

  return (
    <div>
      <StepHeader
        icon={Repeat}
        tone={TONE}
        title="Muscular Endurance"
        subtitle="Step 6 of 7 — two sustained-effort tests, e.g. an upper-body test plus a core test."
      />

      <div className="space-y-5">
        <EnduranceTestBlock
          label="Test 1" options={options1}
          testType={form.enduranceTestType}
          onTestType={(v) => {
            const test = v as EnduranceTestType;
            set('enduranceTestType', test);
            set('enduranceValueType', REP_BASED.includes(test) ? 'reps' : 'time');
          }}
          valueType={form.enduranceValueType}
          reps={form.enduranceReps} onReps={(v) => set('enduranceReps', v)}
          durationSec={form.enduranceDurationSec} onDurationSec={(v) => set('enduranceDurationSec', v)}
          result={t1}
        />
        <EnduranceTestBlock
          label="Test 2" options={options2}
          testType={form.enduranceTestType2}
          onTestType={(v) => {
            const test = v as EnduranceTestType;
            set('enduranceTestType2', test);
            set('enduranceValueType2', REP_BASED.includes(test) ? 'reps' : 'time');
          }}
          valueType={form.enduranceValueType2}
          reps={form.enduranceReps2} onReps={(v) => set('enduranceReps2', v)}
          durationSec={form.enduranceDurationSec2} onDurationSec={(v) => set('enduranceDurationSec2', v)}
          result={t2}
        />
      </div>

      {error && <p className="mt-3 text-[11px] font-medium" style={{ color: 'var(--danger-text)' }}>{error}</p>}

      {combinedScore != null && (
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-[18px] p-5" style={{ background: TONE.wash, border: '1px solid var(--border)' }}>
          <div>
            <p className="text-[10.5px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Combined Endurance Score</p>
            <p className="mt-1 text-[24px] font-[820] leading-none tabular-nums tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>{combinedScore}</p>
          </div>
          {t1.category && p1 && (
            <span className="rounded-full px-3 py-1 text-[12px] font-[700]" style={{ background: p1.bg, color: p1.color }}>
              {form.enduranceTestType}: {t1.category}
            </span>
          )}
          {t2.category && p2 && (
            <span className="rounded-full px-3 py-1 text-[12px] font-[700]" style={{ background: p2.bg, color: p2.color }}>
              {form.enduranceTestType2}: {t2.category}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

interface EnduranceTestBlockProps {
  label: string;
  options: EnduranceTestType[];
  testType: EnduranceTestType | '';
  onTestType: (v: string) => void;
  valueType: 'reps' | 'time';
  reps: string; onReps: (v: string) => void;
  durationSec: string; onDurationSec: (v: string) => void;
  result: TestResult;
}

function EnduranceTestBlock({ label, options, testType, onTestType, valueType, reps, onReps, durationSec, onDurationSec, result }: EnduranceTestBlockProps) {
  const pill = result.category ? categoryPill(result.category) : null;

  return (
    <div className="rounded-[18px] p-5" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
      <div className="mb-3 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-[4px]" style={{ background: gradient(TONE) }} aria-hidden />
        <p className="text-[11.5px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</p>
      </div>
      <div className="mb-4">
        <SearchableSelect label="Test" required allowCustom={false} value={testType} onChange={onTestType} options={options} />
      </div>
      {testType === 'Push Up Test' || testType === 'Curl Up Test' ? (
        <FloatInput label="Repetitions Completed" numeric="integer" value={reps} onChange={onReps} />
      ) : testType ? (
        <FloatInput label="Duration Held (sec)" numeric="integer" value={durationSec} onChange={onDurationSec} />
      ) : null}
      {result.category && pill && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[12px] font-[700]" style={{ color: 'var(--text-secondary)' }}>{result.value} {valueType === 'reps' ? 'reps' : 'sec'}</span>
          <span className="rounded-full px-2.5 py-0.5 text-[11px] font-[700]" style={{ background: pill.bg, color: pill.color }}>{result.category}</span>
        </div>
      )}
    </div>
  );
}

export default StepEndurance;
