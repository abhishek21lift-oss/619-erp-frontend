'use client';

import Image from 'next/image';
import { CheckCircle2, ClipboardList, ImageIcon, ShieldCheck } from 'lucide-react';
import { POSTURE_VIEWS, VIEW_FIELD, allFindings, viewStatus } from './types';
import type { PostureFormData, PostureViewKey } from './types';

interface StepReviewProps {
  form: PostureFormData;
  set: <K extends keyof PostureFormData>(key: K, val: PostureFormData[K]) => void;
  previous: Record<string, unknown> | null;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function previousFindings(previous: Record<string, unknown> | null): { view: PostureViewKey; value: string }[] {
  if (!previous) return [];
  return (['front', 'side', 'back'] as PostureViewKey[]).flatMap((view) =>
    stringList(previous[VIEW_FIELD[view]]).map((value) => ({ view, value })));
}

function SectionCard({ title, children, icon }: { title: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <section className="rounded-[18px] p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
      <div className="mb-2.5 flex items-center gap-2">
        {icon && <span style={{ color: '#A33757' }}>{icon}</span>}
        <h3 className="text-[12.5px] font-[800]" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{children}</p>;
}

export function StepReview({ form, set, previous }: StepReviewProps) {
  const findings = allFindings(form);
  const previousList = previousFindings(previous);
  const planCount = form.correctivePlan.mobility.length + form.correctivePlan.activation.length + form.correctivePlan.strengthening.length;

  const toggleResolved = (value: string) => {
    set('resolvedFindings', form.resolvedFindings.includes(value)
      ? form.resolvedFindings.filter((v) => v !== value)
      : [...form.resolvedFindings, value]);
  };

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-[20px]" style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b)', boxShadow: '0 12px 34px rgba(15,23,42,0.22)' }}>
        <div className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[13px]" style={{ background: 'rgba(255,255,255,0.10)', color: '#FFBB94' }}>
              <ClipboardList size={19} />
            </div>
            <div>
              <p className="text-[10px] font-[750] uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.5)' }}>Ready to complete</p>
              <p className="text-[15px] font-[820] text-white">{form.assessmentType.replace('_', ' ')} · {form.assessmentDate}</p>
            </div>
          </div>
          <div className="ml-auto flex gap-5 text-right">
            <div>
              <p className="text-[22px] font-[850] leading-none text-white">{findings.length}</p>
              <p className="text-[9.5px] font-[650] uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.48)' }}>Findings</p>
            </div>
            <div>
              <p className="text-[22px] font-[850] leading-none text-white">{form.muscleImbalances.length}</p>
              <p className="text-[9.5px] font-[650] uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.48)' }}>Muscles</p>
            </div>
            <div>
              <p className="text-[22px] font-[850] leading-none text-white">{planCount}</p>
              <p className="text-[9.5px] font-[650] uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.48)' }}>Exercises</p>
            </div>
          </div>
        </div>
      </section>

      <SectionCard title="Posture Findings" icon={<CheckCircle2 size={14} />}>
        <div className="space-y-2.5">
          {(['front', 'side', 'back'] as PostureViewKey[]).map((view) => {
            const issues = form[VIEW_FIELD[view]];
            const status = viewStatus(form, view);
            return (
              <div key={view} className="rounded-[11px] px-3 py-2.5" style={{ background: 'var(--bg-subtle)' }}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-[780]" style={{ color: 'var(--text-primary)' }}>{POSTURE_VIEWS[view].label}</p>
                  <span className="text-[9.5px] font-[750] uppercase tracking-wide" style={{
                    color: status === 'findings' ? '#A33757' : status === 'no_findings' ? '#047857' : 'var(--text-muted)',
                  }}>
                    {status === 'findings' ? `${issues.length} finding${issues.length === 1 ? '' : 's'}` : status === 'no_findings' ? 'No findings' : 'Not assessed'}
                  </span>
                </div>
                {issues.length > 0 && (
                  <p className="mt-1 text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{issues.join(' · ')}</p>
                )}
                {form.viewNotes[view].trim() && (
                  <p className="mt-1 text-[10.5px] italic leading-relaxed" style={{ color: 'var(--text-muted)' }}>{form.viewNotes[view]}</p>
                )}
              </div>
            );
          })}
          {form.otherIssueNotes.trim() && (
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              <span className="font-[750]">Additional: </span>{form.otherIssueNotes}
            </p>
          )}
          {form.noIssuesNoted && findings.length === 0 && (
            <p className="flex items-center gap-1.5 text-[11.5px] font-[700]" style={{ color: '#047857' }}>
              <ShieldCheck size={13} /> Trainer confirmed no posture issues noted.
            </p>
          )}
        </div>
      </SectionCard>

      {(form.frontPhoto || form.sidePhoto || form.backPhoto) && (
        <SectionCard title="Posture Photographs" icon={<ImageIcon size={14} />}>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Front', photo: form.frontPhoto },
              { label: 'Side', photo: form.sidePhoto },
              { label: 'Back', photo: form.backPhoto },
            ].map(({ label, photo }) => (
              <div key={label} className="relative aspect-[3/4] overflow-hidden rounded-[10px]" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                {photo ? (
                  <Image src={photo} alt={`${label} posture evidence`} fill unoptimized sizes="(max-width: 640px) 30vw, 180px" className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-[10px]" style={{ color: 'var(--text-disabled)' }}>No {label.toLowerCase()} photo</div>
                )}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard title="Muscle Imbalance Findings">
        {form.muscleImbalances.length === 0 ? (
          <Empty>Not assessed. Empty is not a diagnosis of normal.</Empty>
        ) : (
          <div className="space-y-1.5">
            {form.muscleImbalances.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center gap-2 rounded-[10px] px-2.5 py-2" style={{ background: 'var(--bg-subtle)' }}>
                <span className="text-[11.5px] font-[750]" style={{ color: 'var(--text-primary)' }}>{m.muscle}</span>
                <span className="rounded-full px-1.5 py-0.5 text-[9px] font-[800] uppercase" style={{
                  background: m.status === 'tight' ? 'rgba(163,55,87,0.12)' : m.status === 'weak' ? 'rgba(15,23,42,0.10)' : 'rgba(16,185,129,0.12)',
                  color: m.status === 'tight' ? '#A33757' : m.status === 'weak' ? '#0f172a' : '#047857',
                }}>{m.status}</span>
                <span className="text-[10px] font-[650]" style={{ color: 'var(--text-muted)' }}>{m.side}</span>
                {m.notes && <span className="w-full text-[10.5px] italic" style={{ color: 'var(--text-muted)' }}>{m.notes}</span>}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Corrective Plan">
        {(['mobility', 'activation', 'strengthening'] as const).map((section) => (
          <div key={section} className="mb-2 last:mb-0">
            <p className="text-[10px] font-[760] uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
              {section} · {form.correctivePlan[section].length}
            </p>
            {form.correctivePlan[section].length > 0 && (
              <p className="mt-0.5 text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {form.correctivePlan[section].map((e) => e.exercise || 'Untitled').join(' · ')}
              </p>
            )}
          </div>
        ))}
        {form.summary.primaryConcern && (
          <p className="mt-2 text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <span className="font-[750]">Primary concern: </span>{form.summary.primaryConcern}
          </p>
        )}
      </SectionCard>

      {previousList.length > 0 && (
        <SectionCard title="Previous Findings — Explicit Resolution">
          <p className="mb-2 text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Findings from the previous assessment that you did not select today stay “not recorded”. Tick one only when you have actually assessed it as resolved.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {previousList.map(({ view, value }) => {
              const resolved = form.resolvedFindings.includes(value);
              return (
                <button
                  key={`${view}-${value}`}
                  type="button"
                  aria-pressed={resolved}
                  onClick={() => toggleResolved(value)}
                  className="min-h-[34px] rounded-[9px] px-2.5 text-[10.5px] font-[650]"
                  style={{
                    background: resolved ? 'rgba(16,185,129,0.12)' : 'var(--bg-subtle)',
                    color: resolved ? '#047857' : 'var(--text-muted)',
                    border: resolved ? '1px solid rgba(16,185,129,0.35)' : '1px solid var(--border)',
                    textDecoration: resolved ? 'line-through' : 'none',
                  }}
                >
                  {POSTURE_VIEWS[view].short} · {value}
                </button>
              );
            })}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

export default StepReview;
