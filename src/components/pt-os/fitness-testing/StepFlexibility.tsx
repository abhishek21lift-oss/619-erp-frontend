'use client';

import { useMemo } from 'react';
import { Move, AlertTriangle } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import SearchableSelect from '@/components/pt-os/SearchableSelect';
import { checkAsymmetry, classifyFlexibilityScore, scoreCategory, scoreTestBattery } from '@/lib/fitness-calculations';
import type { AssessmentFormData, FlexibilityTestType } from './types';
import { n } from './types';

const FLEXIBILITY_TESTS: FlexibilityTestType[] = [
  'Sit and Reach', 'Hamstring', 'Hip Flexor', 'Custom',
];

interface StepFlexibilityProps {
  form: AssessmentFormData;
  set: <K extends keyof AssessmentFormData>(key: K, val: AssessmentFormData[K]) => void;
  error?: string;
}

interface TestResult {
  category: ReturnType<typeof classifyFlexibilityScore>;
  hasAsymmetry: boolean;
}

function useTestResult(score: string, left: string, right: string): TestResult {
  return {
    category: classifyFlexibilityScore(n(score)),
    hasAsymmetry: checkAsymmetry(n(left), n(right)),
  };
}

export function StepFlexibility({ form, set, error }: StepFlexibilityProps) {
  const t1 = useTestResult(form.flexibilityScore, form.flexibilityLeft, form.flexibilityRight);
  const t2 = useTestResult(form.flexibilityScore2, form.flexibilityLeft2, form.flexibilityRight2);
  const combinedScore = useMemo(
    () => scoreTestBattery(scoreCategory(t1.category), scoreCategory(t2.category)),
    [t1.category, t2.category],
  );
  const hasAsymmetry = t1.hasAsymmetry || t2.hasAsymmetry;

  // Each test picks from the full list minus whatever the other test
  // already has selected — same guard the Endurance/Strength batteries use.
  const options1 = FLEXIBILITY_TESTS.filter((t) => t !== form.flexibilityTestType2);
  const options2 = FLEXIBILITY_TESTS.filter((t) => t !== form.flexibilityTestType);

  return (
    <div>
      <div className="flex items-start gap-4 mb-7">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
          <Move size={20} color="#1CA3F9" />
        </div>
        <div>
          <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Flexibility &amp; Mobility</h2>
          <p className="text-[13px] text-slate-400 mt-1.5">Step 7 of 7 — two range-of-motion tests.</p>
        </div>
      </div>

      <div className="space-y-5">
        <FlexibilityTestBlock
          label="Test 1" options={options1}
          testType={form.flexibilityTestType} onTestType={(v) => set('flexibilityTestType', v as FlexibilityTestType)}
          customTest={form.flexibilityCustomTest} onCustomTest={(v) => set('flexibilityCustomTest', v)}
          left={form.flexibilityLeft} onLeft={(v) => set('flexibilityLeft', v)}
          right={form.flexibilityRight} onRight={(v) => set('flexibilityRight', v)}
          rom={form.flexibilityRom} onRom={(v) => set('flexibilityRom', v)}
          score={form.flexibilityScore} onScore={(v) => set('flexibilityScore', v)}
          limitationNotes={form.flexibilityLimitationNotes} onLimitationNotes={(v) => set('flexibilityLimitationNotes', v)}
          result={t1}
        />
        <FlexibilityTestBlock
          label="Test 2" options={options2}
          testType={form.flexibilityTestType2} onTestType={(v) => set('flexibilityTestType2', v as FlexibilityTestType)}
          customTest={form.flexibilityCustomTest2} onCustomTest={(v) => set('flexibilityCustomTest2', v)}
          left={form.flexibilityLeft2} onLeft={(v) => set('flexibilityLeft2', v)}
          right={form.flexibilityRight2} onRight={(v) => set('flexibilityRight2', v)}
          rom={form.flexibilityRom2} onRom={(v) => set('flexibilityRom2', v)}
          score={form.flexibilityScore2} onScore={(v) => set('flexibilityScore2', v)}
          limitationNotes={form.flexibilityLimitationNotes2} onLimitationNotes={(v) => set('flexibilityLimitationNotes2', v)}
          result={t2}
        />
      </div>

      {error && <p className="mt-3 text-[11px] font-medium" style={{ color: 'var(--danger-text)' }}>{error}</p>}

      {combinedScore != null && (
        <div className="mt-6 flex items-center gap-2">
          <span className="text-[11px] font-[700] uppercase tracking-wider text-slate-400">Combined Score</span>
          <span className="rounded-full px-3 py-1 text-[12px] font-[700]" style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706' }}>
            {combinedScore}
          </span>
        </div>
      )}

      {hasAsymmetry && (
        <div className="mt-4 flex items-start gap-3 rounded-[16px] p-4" style={{ background: 'rgba(0,103,224,0.08)', border: '1px solid rgba(0,103,224,0.25)' }}>
          <AlertTriangle size={18} style={{ color: '#d97706', flexShrink: 0, marginTop: 1 }} />
          <p className="text-[13px] font-[640]" style={{ color: '#92400e' }}>
            Left/right asymmetry &gt; 10% detected. Consider a corrective mobility focus.
          </p>
        </div>
      )}
    </div>
  );
}

interface FlexibilityTestBlockProps {
  label: string;
  options: FlexibilityTestType[];
  testType: FlexibilityTestType | '';
  onTestType: (v: string) => void;
  customTest: string; onCustomTest: (v: string) => void;
  left: string; onLeft: (v: string) => void;
  right: string; onRight: (v: string) => void;
  rom: string; onRom: (v: string) => void;
  score: string; onScore: (v: string) => void;
  limitationNotes: string; onLimitationNotes: (v: string) => void;
  result: TestResult;
}

function FlexibilityTestBlock({
  label, options, testType, onTestType, customTest, onCustomTest,
  left, onLeft, right, onRight, rom, onRom, score, onScore, limitationNotes, onLimitationNotes, result,
}: FlexibilityTestBlockProps) {
  return (
    <div className="rounded-[18px] p-5" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
      <p className="mb-3 text-[11.5px] font-[700] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>{label}</p>

      <div className="mb-4">
        <SearchableSelect label="Test" required allowCustom={false} value={testType} onChange={onTestType} options={options} />
        {testType === 'Custom' && (
          <div className="mt-3">
            <FloatInput label="Custom Test Name" value={customTest} onChange={onCustomTest} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FloatInput label="Left Side (cm)" type="number" value={left} onChange={onLeft} />
        <FloatInput label="Right Side (cm)" type="number" value={right} onChange={onRight} />
        <FloatInput label="Range of Motion (deg)" type="number" value={rom} onChange={onRom} />
        <div>
          <FloatInput label="Composite Score (0-10)" type="number" value={score} onChange={onScore} />
          <p className="mt-1.5 text-[11px] text-slate-400">Trainer-assessed, 0 = very limited, 10 = excellent.</p>
        </div>
      </div>

      <div className="mt-4">
        <FloatInput label="Limitation Notes" multiline autoGrow value={limitationNotes} onChange={onLimitationNotes} />
      </div>

      {result.category && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[11px] font-[700] uppercase tracking-wider text-slate-400">Classification</span>
          <span className="rounded-full px-2.5 py-0.5 text-[11px] font-[700]" style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706' }}>{result.category}</span>
        </div>
      )}
    </div>
  );
}

export default StepFlexibility;
