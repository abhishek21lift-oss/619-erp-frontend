'use client';

import { useMemo } from 'react';
import { Repeat } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import SearchableSelect from '@/components/pt-os/SearchableSelect';
import { classifyEndurance, scoreCategory, scoreTestBattery } from '@/lib/fitness-calculations';
import type { Gender, FitnessCategory } from '@/lib/fitness-calculations';
import type { AssessmentFormData, EnduranceTestType } from './types';
import { n } from './types';

const ENDURANCE_TESTS: EnduranceTestType[] = ['Push Up Test', 'Curl Up Test', 'Wall Sit', 'Plank', 'Bodyweight Squat', 'Custom'];
const REP_BASED: EnduranceTestType[] = ['Push Up Test', 'Curl Up Test'];

interface StepEnduranceProps {
  form: AssessmentFormData;
  set: <K extends keyof AssessmentFormData>(key: K, val: AssessmentFormData[K]) => void;
  gender: Gender | null;
  error?: string;
}

interface TestResult {
  value: number | null;
  category: FitnessCategory | null;
}

function useTestResult(testType: EnduranceTestType | '', valueType: 'reps' | 'time', reps: string, durationSec: string, gender: Gender | null): TestResult {
  const value = valueType === 'reps' ? n(reps) : n(durationSec);
  const category = classifyEndurance(testType || null, value, gender);
  return { value, category };
}

export function StepEndurance({ form, set, gender, error }: StepEnduranceProps) {
  const t1 = useTestResult(form.enduranceTestType, form.enduranceValueType, form.enduranceReps, form.enduranceDurationSec, gender);
  const t2 = useTestResult(form.enduranceTestType2, form.enduranceValueType2, form.enduranceReps2, form.enduranceDurationSec2, gender);
  const combinedScore = useMemo(
    () => scoreTestBattery(scoreCategory(t1.category), scoreCategory(t2.category)),
    [t1.category, t2.category],
  );

  // Each test picks from the full list minus whatever the other test
  // already has selected — structurally prevents picking the same test twice.
  const options1 = ENDURANCE_TESTS.filter((t) => t !== form.enduranceTestType2);
  const options2 = ENDURANCE_TESTS.filter((t) => t !== form.enduranceTestType);

  return (
    <div>
      <div className="flex items-start gap-4 mb-7">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
          <Repeat size={20} color="#1CA3F9" />
        </div>
        <div>
          <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Muscular Endurance</h2>
          <p className="text-[13px] text-slate-400 mt-1.5">Step 6 of 7 — two sustained-effort tests, e.g. an upper-body test plus a core test.</p>
        </div>
      </div>

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
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-[16px] p-4" style={{ background: 'var(--bg-subtle)' }}>
          <div>
            <p className="text-[10.5px] font-[700] uppercase tracking-wider text-slate-400">Combined Endurance Score</p>
            <p className="text-[18px] font-[800] text-slate-900">{combinedScore}</p>
          </div>
          {t1.category && (
            <span className="rounded-full px-3 py-1 text-[12px] font-[700]" style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706' }}>
              {form.enduranceTestType}: {t1.category}
            </span>
          )}
          {t2.category && (
            <span className="rounded-full px-3 py-1 text-[12px] font-[700]" style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706' }}>
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
  return (
    <div className="rounded-[18px] p-5" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
      <p className="mb-3 text-[11.5px] font-[700] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>{label}</p>
      <div className="mb-4">
        <SearchableSelect label="Test" required allowCustom={false} value={testType} onChange={onTestType} options={options} />
      </div>
      {testType === 'Push Up Test' || testType === 'Curl Up Test' ? (
        <FloatInput label="Repetitions Completed" type="number" value={reps} onChange={onReps} />
      ) : testType ? (
        <FloatInput label="Duration Held (sec)" type="number" value={durationSec} onChange={onDurationSec} />
      ) : null}
      {result.category && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[12px] font-[700] text-slate-700">{result.value} {valueType === 'reps' ? 'reps' : 'sec'}</span>
          <span className="rounded-full px-2.5 py-0.5 text-[11px] font-[700]" style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706' }}>{result.category}</span>
        </div>
      )}
    </div>
  );
}

export default StepEndurance;
