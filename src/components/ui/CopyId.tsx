'use client';
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface Props {
  id: string;
  color?: string;
  className?: string;
}

export function CopyId({ id, color = '#6366f1', className = '' }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <button
      onClick={copy}
      title={copied ? 'Copied!' : 'Copy ID'}
      className={`group inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-all ${className}`}
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
        color: copied ? '#10b981' : color,
        background: copied ? 'rgba(16,185,129,0.08)' : `${color}14`,
        border: `1px solid ${copied ? 'rgba(16,185,129,0.25)' : `${color}30`}`,
        cursor: 'pointer',
      }}
    >
      {id}
      <span className="opacity-0 group-hover:opacity-100 transition-opacity">
        {copied
          ? <Check size={9} />
          : <Copy size={9} />
        }
      </span>
    </button>
  );
}
