'use client';

import { useState } from 'react';
import { Studio360Panel } from './Studio360Panel';

export function Studio360Entry({ orgId, label }: { orgId: string; label: string }) {
  const [open, setOpen] = useState(false);
  if (open) return <Studio360Panel orgId={orgId} onBack={() => setOpen(false)} />;
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="rounded-[9px] px-2.5 py-1.5 text-[11px] font-[700]"
      style={{ background: 'var(--brand-soft)', color: 'var(--brand)', border: '1px solid var(--border)' }}
      aria-label={`Open Studio 360 for ${label}`}
    >
      Studio 360
    </button>
  );
}
