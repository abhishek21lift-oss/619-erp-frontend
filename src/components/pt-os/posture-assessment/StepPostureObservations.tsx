'use client';

import Image from 'next/image';
import { useState } from 'react';
import {
  Camera, CheckCircle2, Circle, ImagePlus, RefreshCw, Trash2,
} from 'lucide-react';
import { Button, FloatInput } from '@/components/ui';
import PhotoCropModal from '@/components/pt-os/PhotoCropModal';
import {
  POSTURE_VIEWS, VIEW_FIELD, postureFindingCount, togglePostureObservation, viewStatus,
} from './types';
import type { PostureFormData, PostureViewKey, PostureOption } from './types';

const VIEW_TABS: PostureViewKey[] = ['front', 'side', 'back'];

interface StepPostureObservationsProps {
  form: PostureFormData;
  set: <K extends keyof PostureFormData>(key: K, val: PostureFormData[K]) => void;
}

function ObservationChip({
  option, selected, onClick,
}: { option: PostureOption; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className="min-h-[40px] rounded-[11px] px-3.5 py-2 text-left text-[12.5px] font-[640] leading-tight transition-all duration-200"
      style={{
        background: selected ? 'linear-gradient(135deg, #A33757, #852E4E)' : 'var(--bg-subtle)',
        color: selected ? '#fff' : 'var(--text-secondary)',
        border: selected ? '1px solid transparent' : '1px solid var(--border)',
        boxShadow: selected ? '0 4px 14px rgba(163,55,87,0.28)' : 'none',
      }}
    >
      {option.value}
    </button>
  );
}

export function StepPostureObservations({ form, set }: StepPostureObservationsProps) {
  const [activeView, setActiveView] = useState<PostureViewKey>('front');
  const [photoField, setPhotoField] = useState<'frontPhoto' | 'sidePhoto' | 'backPhoto' | null>(null);
  const hasFindings = postureFindingCount(form) > 0;
  const view = POSTURE_VIEWS[activeView];
  const issues = form[VIEW_FIELD[activeView]];

  const setView = (value: string[]) => {
    set(VIEW_FIELD[activeView], value);
    if (value.length) set('noIssuesNoted', false);
  };

  const photoCards: { key: PostureViewKey; field: 'frontPhoto' | 'sidePhoto' | 'backPhoto'; label: string }[] = [
    { key: 'front', field: 'frontPhoto', label: 'Front View' },
    { key: 'side', field: 'sidePhoto', label: 'Side View' },
    { key: 'back', field: 'backPhoto', label: 'Back View' },
  ];

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-[20px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
        <div className="flex flex-wrap gap-2 border-b p-3 sm:p-4" style={{ borderColor: 'var(--border)' }}>
          {VIEW_TABS.map((key) => {
            const selected = activeView === key;
            const status = viewStatus(form, key);
            const count = form[VIEW_FIELD[key]].length;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveView(key)}
                aria-current={selected ? 'true' : undefined}
                className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-[12px] px-3 py-2 text-[12.5px] font-[740] transition-all sm:flex-none sm:px-5"
                style={{
                  background: selected ? 'linear-gradient(135deg, #A33757, #852E4E)' : 'var(--bg-subtle)',
                  color: selected ? '#fff' : 'var(--text-secondary)',
                  border: selected ? '1px solid transparent' : '1px solid var(--border)',
                }}
              >
                {POSTURE_VIEWS[key].short}
                {count > 0 && (
                  <span
                    className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-[800]"
                    style={{
                      background: selected ? 'rgba(255,255,255,0.22)' : 'rgba(163,55,87,0.12)',
                      color: selected ? '#fff' : '#A33757',
                    }}
                  >
                    {count}
                  </span>
                )}
                {status === 'no_findings' && <CheckCircle2 size={13} aria-label="Assessed, no findings" />}
                {status === 'not_assessed' && <Circle size={11} aria-label="Not assessed" style={{ opacity: 0.55 }} />}
              </button>
            );
          })}
        </div>

        <div className="p-4 sm:p-5">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-[800] tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>{view.label}</h3>
              <p className="mt-0.5 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                Leave a category empty when it was not assessed. Empty never means normal.
              </p>
            </div>
            <span className="shrink-0 text-[11px] font-[700]" style={{ color: 'var(--text-muted)' }}>
              {issues.length} selected
            </span>
          </div>

          <div className="space-y-4">
            {view.categories.map((category) => {
              const inCategory = issues.filter((v) => category.options.some((o) => o.value === v));
              const legacy = issues.filter((v) => !category.options.some((o) => o.value === v));
              return (
                <div key={category.name}>
                  <div className="mb-2 flex items-center gap-2">
                    <p className="text-[11px] font-[760] uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
                      {category.name}
                    </p>
                    {inCategory.length > 0 && (
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#A33757' }} />
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {category.options.map((option) => (
                      <ObservationChip
                        key={option.value}
                        option={option}
                        selected={issues.includes(option.value)}
                        onClick={() => setView(togglePostureObservation(category, issues, option.value))}
                      />
                    ))}
                    {/* An older record can hold a label this category no longer
                        offers. It stays visible and removable. */}
                    {legacy.map((value) => (
                      <ObservationChip
                        key={`legacy-${value}`}
                        option={{ value }}
                        selected
                        onClick={() => setView(issues.filter((v) => v !== value))}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5">
            <FloatInput
              label={`${view.short} view notes`}
              multiline
              autoGrow
              maxLength={1000}
              value={form.viewNotes[activeView]}
              onChange={(v) => {
                set('viewNotes', { ...form.viewNotes, [activeView]: v });
                if (v.trim()) set('noIssuesNoted', false);
              }}
            />
          </div>
        </div>
      </section>

      <section className="rounded-[20px] p-4 sm:p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[14px] font-[800]" style={{ color: 'var(--text-primary)' }}>Posture Photographs</h3>
            <p className="mt-0.5 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
              Optional visual evidence. Photos are stored with this assessment and support the recorded findings.
            </p>
          </div>
          <ImagePlus size={18} style={{ color: '#A33757', flexShrink: 0 }} />
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {photoCards.map(({ field, label }) => {
            const photo = form[field];
            return (
              <div key={field} className="overflow-hidden rounded-[14px]" style={{ border: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
                {photo ? (
                  <>
                    <a href={photo} target="_blank" rel="noreferrer" className="relative block aspect-[3/4]" aria-label={`Open ${label.toLowerCase()} photograph`}>
                      <Image src={photo} alt={`${label} posture`} fill unoptimized sizes="(max-width: 640px) 30vw, 200px" className="object-cover" />
                    </a>
                    <div className="flex items-center justify-between gap-1 p-1.5">
                      <button
                        type="button"
                        onClick={() => setPhotoField(field)}
                        className="flex h-8 w-8 items-center justify-center rounded-[9px]"
                        style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)' }}
                        aria-label={`Replace ${label.toLowerCase()} photograph`}
                      >
                        <RefreshCw size={13} />
                      </button>
                      <span className="text-[9.5px] font-[750] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</span>
                      <button
                        type="button"
                        onClick={() => set(field, '')}
                        className="flex h-8 w-8 items-center justify-center rounded-[9px]"
                        style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626' }}
                        aria-label={`Remove ${label.toLowerCase()} photograph`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPhotoField(field)}
                    className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-1.5 px-2 text-center transition-colors hover:bg-[color:var(--bg-card)]"
                    aria-label={`Add ${label.toLowerCase()} photograph`}
                  >
                    <Camera size={18} style={{ color: '#A33757' }} />
                    <span className="text-[10.5px] font-[750]" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                    <span className="text-[9px] font-[600]" style={{ color: 'var(--text-disabled)' }}>Camera or gallery</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-[20px] p-4 sm:p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
        <FloatInput
          label="Additional observations"
          multiline
          autoGrow
          maxLength={1000}
          value={form.otherIssueNotes}
          onChange={(v) => { set('otherIssueNotes', v); if (v.trim()) set('noIssuesNoted', false); }}
        />
        <label className="mt-3 flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={form.noIssuesNoted}
            disabled={hasFindings}
            onChange={(e) => set('noIssuesNoted', e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[var(--brand)] disabled:cursor-not-allowed"
          />
          <span className="text-[12.5px] font-[550] leading-[1.35]"
            style={{ color: hasFindings ? 'var(--text-disabled)' : 'var(--text-primary)' }}>
            No posture issues noted in any view
          </span>
        </label>
      </section>

      {photoField && (
        <PhotoCropModal
          open
          onClose={() => setPhotoField(null)}
          onConfirm={(dataUrl) => set(photoField, dataUrl)}
          title={`${photoCards.find((p) => p.field === photoField)?.label ?? ''} Photograph`}
          cropShape="rect"
          aspect={3 / 4}
          maxDim={1000}
        />
      )}

      {/* A compact reminder for the sticky footer's Next button. */}
      {!hasFindings && (
        <div className="flex items-center gap-2 rounded-[12px] px-3 py-2" style={{ background: 'rgba(163,55,87,0.06)' }}>
          <Button type="button" variant="ghost" size="sm" onClick={() => set('noIssuesNoted', true)}>
            Confirm no findings
          </Button>
          <span className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>or record at least one observation.</span>
        </div>
      )}
    </div>
  );
}

export default StepPostureObservations;
