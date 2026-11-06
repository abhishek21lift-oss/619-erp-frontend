'use client';

import { useState } from 'react';
import { AlertTriangle, Brain, Check, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui';
import { api } from '@/lib/api';
import type { AiPostureExercise, AiPostureInsights } from '@/lib/api';
import { errorMessage } from '@/lib/forms/errors';
import { emptyPlanExercise } from './types';
import type { PlanExercise, PlanSection, PostureFormData } from './types';

interface AiPosturalInsightsProps {
  clientId: string;
  form: PostureFormData;
  onApprove: (section: PlanSection, entries: PlanExercise[]) => void;
  onUseRecommendations: (field: 'modifications' | 'follow_up', text: string) => void;
}

function toPlanExercise(entry: AiPostureExercise): PlanExercise {
  return {
    ...emptyPlanExercise(),
    exercise: entry.exercise || '',
    targetMuscle: entry.target_muscle || '',
    region: entry.region || '',
    duration: entry.duration || '',
    sets: entry.sets || '',
    reps: entry.reps || '',
    hold: entry.hold || '',
    resistance: entry.resistance || '',
    tempo: entry.tempo || '',
    rest: entry.rest || '',
    frequency: entry.frequency || '',
    instructions: entry.instructions || '',
  };
}

const SECTIONS: { key: PlanSection; aiKey: 'mobility' | 'activation' | 'strengthening'; label: string }[] = [
  { key: 'mobility', aiKey: 'mobility', label: 'Mobility' },
  { key: 'activation', aiKey: 'activation', label: 'Activation' },
  { key: 'strengthening', aiKey: 'strengthening', label: 'Strengthening' },
];

export function AiPosturalInsightsPanel({ clientId, form, onApprove, onUseRecommendations }: AiPosturalInsightsProps) {
  const [insights, setInsights] = useState<AiPostureInsights | null>(null);
  const [meta, setMeta] = useState<{ model?: string; used_fallback?: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [added, setAdded] = useState<Set<string>>(new Set());

  const generate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.ai.analyzePosture({
        client_id: clientId,
        observations: {
          front: form.frontIssues,
          side: form.sideIssues,
          back: form.backIssues,
          frontNotes: form.viewNotes.front,
          sideNotes: form.viewNotes.side,
          backNotes: form.viewNotes.back,
          generalNotes: form.otherIssueNotes,
        },
        muscle_imbalances: form.muscleImbalances.map((m) => ({ muscle: m.muscle, status: m.status, side: m.side, notes: m.notes })),
        trainer_notes: `${form.summary.trainerAssessment}\n${form.summary.primaryConcern}\n${form.summary.secondaryConcern}`.trim(),
      });
      setInsights(res.data);
      setMeta({ model: res.model, used_fallback: res.used_fallback });
      setAdded(new Set());
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to generate postural insights.'));
    } finally {
      setLoading(false);
    }
  };

  const add = (section: PlanSection, entries: AiPostureExercise[], idPrefix: string) => {
    if (!entries.length) return;
    onApprove(section, entries.map(toPlanExercise));
    setAdded((prev) => new Set([...prev, idPrefix]));
  };

  return (
    <section className="overflow-hidden rounded-[18px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#A33757,#852E4E,#0f172a)' }} />
      <div className="p-4">
        <div className="mb-3 flex items-start gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]" style={{ background: 'linear-gradient(135deg,#A33757,#852E4E)', color: '#fff' }}>
            <Brain size={15} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[13px] font-[800]" style={{ color: 'var(--text-primary)' }}>AI Postural Insights</h3>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Suggestions only. Each exercise is added to the plan only when you approve it.
            </p>
          </div>
        </div>

        {!insights && !loading && (
          <Button type="button" size="sm" iconLeft={<Sparkles size={13} />} onClick={generate}>
            Generate AI Postural Insights
          </Button>
        )}

        {loading && (
          <div className="flex items-center gap-2.5 py-3">
            <Loader2 size={16} className="animate-spin" style={{ color: '#A33757' }} />
            <span className="text-[12px] font-[650]" style={{ color: 'var(--text-muted)' }}>Reviewing the recorded screen…</span>
          </div>
        )}

        {error && (
          <div className="mt-2 flex items-start gap-2 rounded-[12px] p-3" style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.22)' }}>
            <AlertTriangle size={15} style={{ color: '#dc2626', flexShrink: 0, marginTop: 1 }} />
            <div>
              <p className="text-[11.5px] font-[650]" style={{ color: '#b91c1c' }}>{error}</p>
              <button type="button" onClick={generate} className="mt-1 text-[11px] font-[750]" style={{ color: '#b91c1c' }}>Try again</button>
            </div>
          </div>
        )}

        {insights && (
          <div className="mt-3 space-y-3">
            {meta?.model && (
              <p className="text-[10px] font-[650]" style={{ color: 'var(--text-disabled)' }}>
                Suggested by {meta.model}{meta.used_fallback ? ' (fallback model)' : ''}
              </p>
            )}

            <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{insights.summary}</p>

            {insights.safety_note && (
              <div className="rounded-[12px] p-3" style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.24)' }}>
                <p className="text-[11px] font-[650] leading-relaxed" style={{ color: '#92400e' }}>{insights.safety_note}</p>
              </div>
            )}

            {insights.potential_patterns.length > 0 && (
              <div>
                <p className="mb-1.5 text-[10px] font-[760] uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>Possible patterns — confirm yourself</p>
                <div className="space-y-1.5">
                  {insights.potential_patterns.map((pattern, i) => (
                    <div key={i} className="rounded-[11px] px-3 py-2.5" style={{ background: 'var(--bg-subtle)' }}>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[11.5px] font-[750]" style={{ color: 'var(--text-primary)' }}>{pattern.pattern}</p>
                        <span className="rounded-full px-1.5 py-0.5 text-[9px] font-[800] uppercase" style={{
                          background: pattern.confidence === 'high' ? 'rgba(220,38,38,0.10)' : pattern.confidence === 'medium' ? 'rgba(245,158,11,0.12)' : 'rgba(148,163,184,0.16)',
                          color: pattern.confidence === 'high' ? '#b91c1c' : pattern.confidence === 'medium' ? '#92400e' : 'var(--text-muted)',
                        }}>
                          {pattern.confidence} confidence
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{pattern.rationale}</p>
                      {pattern.muscles_involved.length > 0 && (
                        <p className="mt-1 text-[10.5px] font-[650]" style={{ color: 'var(--text-secondary)' }}>
                          Muscles to assess: {pattern.muscles_involved.join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {SECTIONS.map(({ key, aiKey, label }) => {
              const entries = insights[aiKey];
              if (!entries?.length) return null;
              const isAdded = added.has(key);
              return (
                <div key={key}>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <p className="text-[10px] font-[760] uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>{label}</p>
                    <button
                      type="button"
                      onClick={() => add(key, entries, key)}
                      className="flex items-center gap-1 rounded-[8px] px-2 py-1 text-[10.5px] font-[750]"
                      style={{ background: isAdded ? 'rgba(16,185,129,0.12)' : 'rgba(163,55,87,0.10)', color: isAdded ? '#047857' : '#A33757' }}
                    >
                      {isAdded ? <Check size={10} /> : null}
                      {isAdded ? 'Added' : 'Add all'}
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {entries.map((entry, i) => (
                      <div key={`${key}-${i}`} className="flex items-start justify-between gap-2 rounded-[11px] px-3 py-2.5" style={{ background: 'var(--bg-subtle)' }}>
                        <div className="min-w-0">
                          <p className="text-[11.5px] font-[750]" style={{ color: 'var(--text-primary)' }}>{entry.exercise}</p>
                          <p className="mt-0.5 text-[10.5px]" style={{ color: 'var(--text-muted)' }}>
                            {[entry.target_muscle, entry.sets && `${entry.sets} sets`, entry.reps && `${entry.reps} reps`, entry.duration, entry.hold && `hold ${entry.hold}`, entry.frequency].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => add(key, [entry], `${key}-${i}`)}
                          className="shrink-0 rounded-[7px] px-2 py-1 text-[10px] font-[750]"
                          style={{
                            background: added.has(`${key}-${i}`) ? 'rgba(16,185,129,0.12)' : 'var(--bg-card)',
                            color: added.has(`${key}-${i}`) ? '#047857' : 'var(--text-secondary)',
                            border: '1px solid var(--border)',
                          }}
                        >
                          {added.has(`${key}-${i}`) ? 'Added' : 'Add'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {insights.training_modifications.length > 0 && (
              <div className="rounded-[11px] px-3 py-2.5" style={{ background: 'var(--bg-subtle)' }}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-[760] uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>Training modifications</p>
                  <button
                    type="button"
                    onClick={() => onUseRecommendations('modifications', insights.training_modifications.join('\n'))}
                    className="rounded-[7px] px-2 py-1 text-[10px] font-[750]"
                    style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                  >
                    Use in plan
                  </button>
                </div>
                <ul className="mt-1 space-y-0.5">
                  {insights.training_modifications.map((line, i) => (
                    <li key={i} className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>• {line}</li>
                  ))}
                </ul>
              </div>
            )}

            {insights.follow_up.length > 0 && (
              <div className="rounded-[11px] px-3 py-2.5" style={{ background: 'var(--bg-subtle)' }}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-[760] uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>Follow-up assessment</p>
                  <button
                    type="button"
                    onClick={() => onUseRecommendations('follow_up', insights.follow_up.join('\n'))}
                    className="rounded-[7px] px-2 py-1 text-[10px] font-[750]"
                    style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                  >
                    Use in plan
                  </button>
                </div>
                <ul className="mt-1 space-y-0.5">
                  {insights.follow_up.map((line, i) => (
                    <li key={i} className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>• {line}</li>
                  ))}
                </ul>
              </div>
            )}

            <Button type="button" variant="ghost" size="sm" iconLeft={<Sparkles size={12} />} onClick={generate}>
              Regenerate
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

export default AiPosturalInsightsPanel;
