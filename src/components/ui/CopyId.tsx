'use client';
import { useState, useRef, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';

interface Props {
  id: string;
  color?: string;
  className?: string;
}

export function CopyId({ id, color = '#0067e0', className = '' }: Props) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const copy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id).then(() => {
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? 'Client ID copied' : 'Copy client ID'}
        title={copied ? 'Copied!' : 'Copy ID'}
        // The visible chip stays small; a 28px pseudo-element halo gives it a
        // 44px+ hit area without a 44px box pushing the hero row apart.
        className={`group relative inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-colors after:absolute after:-inset-3.5 after:content-[''] ${className}`}
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.07em',
          textTransform: 'uppercase',
          // This sits on the always-dark hero, so the fill tone is the
          // readable one here rather than the light-surface text tone.
          color,
          background: copied ? 'var(--success-soft)' : `${color}14`,
          border: `1px solid ${copied ? 'var(--success-border)' : `${color}30`}`,
          cursor: 'pointer',
        }}
      >
        {id}
        <span className="opacity-40 transition-opacity group-hover:opacity-100 group-active:opacity-100">
          {copied
            ? <Check size={11} />
            : <Copy size={11} />
          }
        </span>
      </button>
      <span className="sr-only" role="status">{copied ? 'Client ID copied to clipboard' : ''}</span>
    </>
  );
}
