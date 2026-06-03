'use client';

import { useState, useId } from 'react';

interface FloatInputProps {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  suffix?: React.ReactNode;
  required?: boolean;
  multiline?: boolean;
}

export default function FloatInput({
  label, type = 'text', value, onChange, placeholder = ' ', suffix, multiline,
}: FloatInputProps) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;
  return (
    <div className="relative">
      <div
        className="relative overflow-hidden rounded-[13px] transition-all"
        style={{
          background: focused ? 'var(--bg-card)' : 'var(--bg-subtle)',
          border: focused ? '1.5px solid rgba(220,38,38,0.40)' : '1.5px solid rgba(15,23,42,0.09)',
          boxShadow: focused ? '0 0 0 3px rgba(220,38,38,0.08)' : '0 1px 2px rgba(15,23,42,0.04)',
          transition: 'all 180ms cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <label
          htmlFor={id}
          className="pointer-events-none absolute left-4 font-[500] transition-all"
          style={{
            top: lifted ? 8 : 18,
            fontSize: lifted ? 10 : 13,
            color: lifted ? (focused ? '#dc2626' : 'rgb(148,163,184)') : 'rgb(148,163,184)',
            transition: 'all 150ms cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          {label}
        </label>
        {multiline ? (
          <textarea
            id={id}
            value={value}
            placeholder={lifted ? placeholder : ''}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="w-full bg-transparent px-4 pb-3 pt-7 text-[13.5px] font-[500] outline-none resize-none"
            style={{ color: 'rgb(15,23,42)', caretColor: '#dc2626', minHeight: 80 }}
          />
        ) : (
          <input
            id={id}
            type={type}
            value={value}
            placeholder={lifted ? placeholder : ''}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="w-full bg-transparent px-4 pb-3 pt-7 text-[13.5px] font-[500] outline-none"
            style={{ color: 'rgb(15,23,42)', caretColor: '#dc2626' }}
          />
        )}
        {suffix && <div className="absolute right-4 top-1/2 -translate-y-1/2">{suffix}</div>}
      </div>
    </div>
  );
}
