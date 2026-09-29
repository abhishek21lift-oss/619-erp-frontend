'use client';

import { HeartPulse } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import { Slider } from '@/components/ui';
import ToggleDetailCard from './ToggleDetailCard';
import type { ParqFormData, CurrentHealthForm } from './types';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];

interface StepCurrentHealthProps {
  form: ParqFormData;
  set: <K extends keyof ParqFormData>(key: K, val: ParqFormData[K]) => void;
  error?: string;
  stepLabel: string;
}

export function StepCurrentHealth({ form, set, error, stepLabel }: StepCurrentHealthProps) {
  const ch = form.currentHealth;
  const setCh = <K extends keyof CurrentHealthForm>(key: K, val: CurrentHealthForm[K]) => {
    set('currentHealth', { ...ch, [key]: val });
  };

  return (
    <div className="space-y-7">
      <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
            <HeartPulse size={20} color="#1CA3F9" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-[color:var(--text-primary)] leading-none">Current Health</h2>
            <p className="text-[13px] text-[color:var(--text-muted)] mt-1.5">{stepLabel} — toggle YES for anything that applies.</p>
          </div>
        </div>

        <div>
          <p className="mb-3 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Blood Group</p>
          <div className="flex flex-wrap gap-2">
            {BLOOD_GROUPS.map((bg) => {
              const selected = form.bloodGroup === bg;
              return (
                <button
                  key={bg} type="button" onClick={() => set('bloodGroup', bg)}
                  className="rounded-[11px] px-3.5 py-2 text-[12.5px] font-[700] transition-all"
                  style={{
                    background: selected ? 'var(--text-primary)' : 'var(--bg-subtle)',
                    color: selected ? 'var(--bg-card)' : 'var(--text-muted)',
                    border: selected ? '1.5px solid var(--text-primary)' : '1.5px solid var(--border)',
                  }}
                >
                  {bg}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2.5">
          <ToggleDetailCard label="Known Disease" checked={ch.known_disease} onToggle={(v) => setCh('known_disease', v)} details={ch.known_disease_details} onDetailsChange={(v) => setCh('known_disease_details', v)} detailsLabel="Which condition(s)?" />
          <ToggleDetailCard label="Medications" checked={ch.medications} onToggle={(v) => setCh('medications', v)} details={ch.medications_details} onDetailsChange={(v) => setCh('medications_details', v)} detailsLabel="List medications" />
          <ToggleDetailCard label="Steroids / PEDs" checked={ch.steroids_ped} onToggle={(v) => setCh('steroids_ped', v)} details={ch.steroids_ped_details} onDetailsChange={(v) => setCh('steroids_ped_details', v)} detailsLabel="Details" />
          <ToggleDetailCard label="Recreational Drugs" checked={ch.recreational_drugs} onToggle={(v) => setCh('recreational_drugs', v)} details={ch.recreational_drugs_details} onDetailsChange={(v) => setCh('recreational_drugs_details', v)} detailsLabel="Details" />
          <ToggleDetailCard label="Currently Under Treatment" checked={ch.current_treatment} onToggle={(v) => setCh('current_treatment', v)} details={ch.current_treatment_details} onDetailsChange={(v) => setCh('current_treatment_details', v)} detailsLabel="Treatment details" />
        </div>

        <div className="rounded-[16px] overflow-hidden" style={{ border: ch.has_pain ? '2px solid #0067E0' : '2px solid var(--border)', background: ch.has_pain ? 'rgba(0,103,224,0.04)' : 'var(--bg-subtle)' }}>
          <button type="button" onClick={() => set('currentHealth', { ...ch, has_pain: !ch.has_pain, pain_scale: !ch.has_pain && !ch.pain_scale ? '5' : ch.pain_scale })} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[6px]" style={{ background: ch.has_pain ? '#0067E0' : 'var(--bg-card)', border: ch.has_pain ? 'none' : '1.5px solid var(--border-2)' }} />
            <span className="text-[13.5px] font-[700]" style={{ color: ch.has_pain ? 'var(--text-primary)' : 'var(--text-secondary)' }}>Currently Experiencing Pain</span>
          </button>
          {ch.has_pain && (
            <div className="px-4 pb-4 space-y-4">
              <Slider label="Pain Scale" value={parseFloat(ch.pain_scale) || 5}
                /* Turning pain on sets the scale to the 5 it shows — it used to
                   show 5 and save nothing until the slider was moved. */ min={1} max={10} onChange={(v) => setCh('pain_scale', String(v))} scaleLabels={['1 · Mild', '10 · Severe']} />
              <FloatInput label="Pain Location" maxLength={255} value={ch.pain_location} onChange={(v) => setCh('pain_location', v)} />
              <FloatInput label="Pain Description" multiline autoGrow maxLength={1000} value={ch.pain_description} onChange={(v) => setCh('pain_description', v)} />
            </div>
          )}
        </div>

      {error && <p className="text-[11px] font-medium" style={{ color: 'var(--danger-text)' }}>{error}</p>}
    </div>
  );
}

export default StepCurrentHealth;
