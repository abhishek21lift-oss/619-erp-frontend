'use client';

// The interview's selection controls. Every counted answer is one of these;
// the only free-text boxes are optional context and the trainer's observation.
//
// Selected is burgundy on a soft tint with a filled check, following the
// Training Availability step. A second tap on a single-select control clears
// it — an answer is optional, so there must be a way back to "not asked".

import { useId, useState, type CSSProperties } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { SearchableSelect } from '@/components/pt-os/SearchableSelect';
import {
  occupationTypeFor,
  type Answers, type InterviewControl, type InterviewField, type InterviewOption,
} from './questions';

const ACCENT = '#A33757';
const ACCENT_DEEP = '#852E4E';

const inputStyle: CSSProperties = {
  background: 'var(--bg-subtle)',
  border: '1.5px solid var(--border-2)',
  color: 'var(--text-primary)',
  boxShadow: 'var(--shadow-xs)',
};

type ControlProps = {
  control: InterviewControl;
  value: string | string[];
  answers: Answers;
  onChange: (field: InterviewField, next: string | string[]) => void;
};

export function InterviewControlField({ control, value, answers, onChange }: ControlProps) {
  const labelId = useId();
  const hintId = useId();
  const optional = control.counted === false;

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <p id={labelId} className="text-[13.5px] font-[730] leading-snug" style={{ color: 'var(--text-primary)' }}>
          {control.label}
        </p>
        {optional && (
          <span className="mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-[760] uppercase tracking-[0.08em]"
            style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
            Optional
          </span>
        )}
      </div>
      {control.hint && (
        <p id={hintId} className="mt-1 text-[12px] leading-snug" style={{ color: 'var(--text-muted)' }}>
          {control.hint}
        </p>
      )}
      <div className="mt-2.5">
        {control.kind === 'text' && (
          <TextControl control={control} value={typeof value === 'string' ? value : ''}
            onChange={(next) => onChange(control.key, next)} labelledBy={labelId} describedBy={hintId} />
        )}
        {control.kind === 'select' && (
          <SelectControl control={control} value={typeof value === 'string' ? value : ''}
            onChange={(next) => onChange(control.key, next)} labelledBy={labelId} describedBy={hintId} />
        )}
        {control.kind === 'cards' && (
          <CardsControl control={control} value={typeof value === 'string' ? value : ''}
            onChange={(next) => onChange(control.key, next)} labelledBy={labelId} describedBy={hintId} />
        )}
        {control.kind === 'segmented' && (
          <SegmentedControl control={control} value={typeof value === 'string' ? value : ''}
            onChange={(next) => onChange(control.key, next)} labelledBy={labelId} describedBy={hintId} />
        )}
        {control.kind === 'scale' && (
          <ScaleControl value={typeof value === 'string' ? value : ''}
            onChange={(next) => onChange(control.key, next)} labelledBy={labelId} describedBy={hintId} />
        )}
        {control.kind === 'occupation' && (
          <OccupationControl control={control} value={typeof value === 'string' ? value : ''}
            onChange={onChange} answers={answers} />
        )}
        {control.kind === 'chips' && (
          <ChipsControl control={control} value={Array.isArray(value) ? value : []}
            onChange={(next) => onChange(control.key, next)} labelledBy={labelId} describedBy={hintId} />
        )}
        {control.kind === 'search-chips' && (
          <SearchChipsControl control={control} value={Array.isArray(value) ? value : []}
            onChange={(next) => onChange(control.key, next)} labelledBy={labelId} describedBy={hintId} />
        )}
      </div>
    </div>
  );
}

function TextControl({
  control, value, onChange, labelledBy, describedBy,
}: {
  control: Extract<InterviewControl, { kind: 'text' }>;
  value: string;
  onChange: (next: string) => void;
  labelledBy: string;
  describedBy: string;
}) {
  return (
    <textarea
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={control.placeholder}
      rows={control.rows ?? 3}
      maxLength={control.maxLength}
      className="w-full resize-y rounded-[14px] px-4 py-3 text-[13px] leading-relaxed outline-none transition focus:border-[#A33757]/55 focus:ring-[3px] focus:ring-[#A33757]/10"
      style={inputStyle}
    />
  );
}

function SelectControl({
  control, value, onChange, labelledBy, describedBy,
}: {
  control: Extract<InterviewControl, { kind: 'select' }>;
  value: string;
  onChange: (next: string) => void;
  labelledBy: string;
  describedBy: string;
}) {
  return (
    <div className="relative">
      <select
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-[14px] px-4 py-3.5 pr-10 text-[13px] font-[560] outline-none transition focus:border-[#A33757]/55 focus:ring-[3px] focus:ring-[#A33757]/10"
        style={inputStyle}
      >
        <option value="">Not answered</option>
        {control.options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <ChevronDown size={15} aria-hidden
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2"
        style={{ color: 'var(--text-muted)' }} />
    </div>
  );
}

function CardsControl({
  control, value, onChange, labelledBy, describedBy,
}: {
  control: Extract<InterviewControl, { kind: 'cards' }>;
  value: string;
  onChange: (next: string) => void;
  labelledBy: string;
  describedBy: string;
}) {
  const columns = control.columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2';
  return (
    <div role="group" aria-labelledby={labelledBy} aria-describedby={describedBy}
      className={`grid grid-cols-1 gap-2.5 ${columns}`}>
      {control.options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value} type="button" aria-pressed={selected}
            onClick={() => onChange(selected ? '' : option.value)}
            className="group flex min-h-[58px] items-center gap-3 rounded-[15px] px-4 py-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A33757]/35"
            style={{
              background: selected ? 'rgba(163,55,87,0.075)' : 'var(--bg-card)',
              border: selected ? `1.5px solid rgba(163,55,87,0.50)` : '1.5px solid var(--border-2)',
              boxShadow: selected ? '0 10px 24px -20px rgba(163,55,87,0.65)' : '0 1px 2px rgba(15,23,42,0.03)',
            }}
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-[700] leading-tight" style={{ color: 'var(--text-primary)' }}>
                {option.label}
              </span>
              {option.description && (
                <span className="mt-0.5 block text-[11.5px] leading-snug" style={{ color: 'var(--text-muted)' }}>
                  {option.description}
                </span>
              )}
            </span>
            <span aria-hidden className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors"
              style={{
                background: selected ? ACCENT : 'transparent',
                border: selected ? `1px solid ${ACCENT}` : '1.5px solid var(--border-3)',
                color: '#fff',
              }}>
              {selected && <Check size={12} strokeWidth={3.2} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SegmentedControl({
  control, value, onChange, labelledBy, describedBy,
}: {
  control: Extract<InterviewControl, { kind: 'segmented' }>;
  value: string;
  onChange: (next: string) => void;
  labelledBy: string;
  describedBy: string;
}) {
  return (
    <div role="group" aria-labelledby={labelledBy} aria-describedby={describedBy}
      className="grid gap-1 rounded-[14px] p-1"
      style={{ gridTemplateColumns: `repeat(${control.options.length}, minmax(0, 1fr))`, background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
      {control.options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value} type="button" aria-pressed={selected}
            onClick={() => onChange(selected ? '' : option.value)}
            className="min-h-[40px] rounded-[11px] px-2 text-[12.5px] font-[700] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A33757]/35"
            style={{
              background: selected ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DEEP})` : 'transparent',
              color: selected ? '#fff' : 'var(--text-secondary)',
              boxShadow: selected ? '0 5px 14px -8px rgba(163,55,87,0.7)' : 'none',
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function ScaleControl({
  value, onChange, labelledBy, describedBy,
}: {
  value: string;
  onChange: (next: string) => void;
  labelledBy: string;
  describedBy: string;
}) {
  const numbers = Array.from({ length: 10 }, (_, i) => i + 1);
  return (
    <div role="group" aria-labelledby={labelledBy} aria-describedby={describedBy}>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
        {numbers.map((number) => {
          const selected = value === String(number);
          return (
            <button
              key={number} type="button" aria-pressed={selected}
              aria-label={`${number} out of 10`}
              onClick={() => onChange(selected ? '' : String(number))}
              className="flex min-h-[44px] items-center justify-center rounded-[12px] text-[13.5px] font-[750] tabular-nums transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A33757]/35"
              style={{
                background: selected ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DEEP})` : 'var(--bg-subtle)',
                color: selected ? '#fff' : 'var(--text-secondary)',
                border: selected ? `1px solid ${ACCENT}` : '1.5px solid var(--border-2)',
                boxShadow: selected ? '0 6px 16px -10px rgba(163,55,87,0.7)' : 'none',
              }}
            >
              {number}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] font-[600]" style={{ color: 'var(--text-muted)' }}>
        <span>Not ready</span>
        <span>{value ? `${value} of 10` : 'Choose a number'}</span>
        <span>Fully ready</span>
      </div>
    </div>
  );
}

function OccupationControl({
  control, value, onChange, answers,
}: {
  control: Extract<InterviewControl, { kind: 'occupation' }>;
  value: string;
  onChange: (field: InterviewField, next: string | string[]) => void;
  answers: Answers;
}) {
  return (
    <>
      <SearchableSelect
        label={control.label}
        hideLabel
        allowCustom={false}
        allowClear
        value={value}
        options={control.options}
        placeholder="Search occupations"
        onChange={(next) => {
          onChange('occupation_title', next);
          onChange('occupation_type', next ? occupationTypeFor(next) : '');
        }}
      />
      {!value && answers.occupation_type && (
        <p className="mt-1.5 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
          Currently recorded as a {answers.occupation_type.replace(/_/g, ' ')}. Pick a role to refine it.
        </p>
      )}
    </>
  );
}

function ChipsControl({
  control, value, onChange, labelledBy, describedBy,
}: {
  control: Extract<InterviewControl, { kind: 'chips' }>;
  value: string[];
  onChange: (next: string[]) => void;
  labelledBy: string;
  describedBy: string;
}) {
  return (
    <div role="group" aria-labelledby={labelledBy} aria-describedby={describedBy}>
      <ChipButtons options={control.options} selected={value} onToggle={(next) => onChange(next)} />
    </div>
  );
}

function SearchChipsControl({
  control, value, onChange, labelledBy, describedBy,
}: {
  control: Extract<InterviewControl, { kind: 'search-chips' }>;
  value: string[];
  onChange: (next: string[]) => void;
  labelledBy: string;
  describedBy: string;
}) {
  const [query, setQuery] = useState('');
  const visible = control.options.filter((option) =>
    !value.includes(option.value) && option.label.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const byValue = new Map(control.options.map((option) => [option.value, option.label]));

  return (
    <div role="group" aria-labelledby={labelledBy} aria-describedby={describedBy}
      className="rounded-[16px] p-3" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {value.map((key) => (
            <button key={key} type="button" onClick={() => onChange(value.filter((v) => v !== key))}
              aria-label={`Remove ${byValue.get(key) ?? key}`}
              className="inline-flex min-h-[34px] items-center gap-1.5 rounded-[10px] px-3 text-[12px] font-[700] text-white transition hover:brightness-105"
              style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DEEP})`, boxShadow: '0 4px 12px -8px rgba(163,55,87,0.7)' }}>
              {byValue.get(key) ?? key}
              <X size={12} aria-hidden />
            </button>
          ))}
        </div>
      )}
      <div className="relative">
        <Search size={14} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--text-muted)' }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search sports…"
          aria-label="Search sports"
          className="w-full rounded-[11px] py-2.5 pl-9 pr-3 text-[12.5px] outline-none transition focus:ring-[3px] focus:ring-[#A33757]/10"
          style={{ ...inputStyle, background: 'var(--bg-card)' }}
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {visible.map((option) => (
          <button key={option.value} type="button"
            onClick={() => { onChange([...value, option.value]); setQuery(''); }}
            className="min-h-[34px] rounded-[10px] px-3 text-[12px] font-[640] transition hover:border-[#A33757]/40"
            style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-2)' }}>
            {option.label}
          </button>
        ))}
        {visible.length === 0 && (
          <p className="px-1 py-1 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
            {query.trim() ? 'No matching sport. Choose Other if it is missing.' : 'All listed sports selected.'}
          </p>
        )}
      </div>
    </div>
  );
}

/** A wrapping set of toggle chips. Selected chips carry the burgundy state. */
function ChipButtons({
  options, selected, onToggle,
}: {
  options: readonly InterviewOption[];
  selected: string[];
  onToggle: (next: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = selected.includes(option.value);
        return (
          <button
            key={option.value} type="button" aria-pressed={isSelected}
            onClick={() => onToggle(isSelected ? selected.filter((v) => v !== option.value) : [...selected, option.value])}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-[11px] px-3.5 text-[12.5px] font-[660] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A33757]/35"
            style={{
              background: isSelected ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DEEP})` : 'var(--bg-subtle)',
              color: isSelected ? '#fff' : 'var(--text-secondary)',
              border: isSelected ? '1px solid transparent' : '1.5px solid var(--border-2)',
              boxShadow: isSelected ? '0 5px 14px -10px rgba(163,55,87,0.75)' : 'none',
            }}
          >
            {isSelected && <Check size={12} strokeWidth={3} aria-hidden />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
