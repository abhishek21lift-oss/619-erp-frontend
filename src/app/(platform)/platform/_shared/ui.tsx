'use client';

// Small shared presentational primitives for the platform console.
//
// Extracted verbatim from the 3,197-line platform/page.tsx (audit H-03).
// Component bodies, props and rendered markup are unchanged.
import { Loader2, ShieldAlert, X, Copy, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui';
import { useToast } from '@/lib/toast';

export function PanelSkeleton({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-2.5 py-16">
      <Loader2 size={22} className="animate-spin" style={{ color: 'var(--brand)' }} />
      <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  );
}
export function MiniStat({ icon, value, label, color }: { icon: React.ReactNode; value: React.ReactNode; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2 rounded-[12px] px-2.5 py-2" style={{ background: `${color}12` }}>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px]" style={{ background: `${color}22`, color }}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[12.5px] font-[800] tabular-nums" style={{ color: 'var(--text-primary)' }}>{value}</p>
        <p className="truncate text-[9px] font-[750] uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.06em' }}>{label}</p>
      </div>
    </div>
  );
}

// ── Organization card (expandable to manage its users) ──────────────────────────
export function IconBtn({ children, title, onClick, tone, busy }: {
  children: React.ReactNode; title: string; onClick: () => void; tone?: 'danger' | 'success'; busy?: boolean;
}) {
  const color = tone === 'danger' ? '#dc2626' : tone === 'success' ? '#059669' : 'var(--text-secondary)';
  const border = tone === 'danger' ? 'rgba(239,68,68,0.20)' : tone === 'success' ? 'rgba(16,185,129,0.25)' : 'var(--border)';
  return (
    <button onClick={onClick} title={title} disabled={busy}
      className="flex h-8 items-center gap-1.5 rounded-[9px] px-2.5 text-[11.5px] font-[650] transition hover:opacity-80 disabled:opacity-50"
      style={{ border: `1px solid ${border}`, color }}>
      {busy ? <Loader2 size={12} className="animate-spin" /> : children}
    </button>
  );
}

/* ─────────────────────────────────────────────────────── ACTIVITY */
export function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-center py-20">{children}</div>;
}
export function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <ShieldAlert size={28} style={{ color: '#ef4444' }} />
      <p className="max-w-[420px] text-[14px] font-[600] text-slate-600">{error}</p>
      {/two-factor|2fa/i.test(error)
        ? <Button onClick={() => { window.location.href = '/settings/profile'; }}>Set up two-factor authentication</Button>
        : <Button variant="outline" iconLeft={<RefreshCw size={14} />} onClick={onRetry}>Retry</Button>}
    </div>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div data-no-pull-refresh className="fixed inset-0 z-[9000] flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(3px)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-[20px] p-6" onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 24px 60px rgba(15,23,42,0.30)' }}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[16px] font-[800]" style={{ color: 'var(--text-primary)' }}>{title}</h2>
          <button onClick={onClose} className="text-slate-400 transition hover:text-slate-600"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    // A <label> wrapping the control, not a <p> beside it. As a paragraph this
    // caption associated with nothing: every select and input under it — the
    // whole platform payment and org-admin surface — was announced by a screen
    // reader with no name at all. Wrapping needs no id plumbing, and makes the
    // caption clickable into the field as a bonus.
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</span>
      {children}
    </label>
  );
}

export const inputCls = 'w-full rounded-[11px] px-3 py-2.5 text-[13.5px] outline-none';
export const inputStyle: React.CSSProperties = { background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' };

export function PasswordField({ value, onChange, onGenerate }: { value: string; onChange: (v: string) => void; onGenerate: () => void }) {
  const { toast } = useToast();
  return (
    <div className="flex gap-2">
      <input className={inputCls} style={inputStyle} value={value} placeholder="Min 8 characters" onChange={(e) => onChange(e.target.value)} />
      <button onClick={onGenerate} title="Generate"
        className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-[11px] transition hover:bg-black/5"
        style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}><RefreshCw size={15} /></button>
      <button onClick={() => { if (value) { navigator.clipboard?.writeText(value); toast.success('Copied'); } }} title="Copy"
        className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-[11px] transition hover:bg-black/5"
        style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}><Copy size={15} /></button>
    </div>
  );
}

// ── Create Organization modal ───────────────────────────────────────────────────
//
// Creating a studio now INVITES the owner by default rather than setting a
// password for them. The operator no longer chooses, sees, or has to transmit
// a customer's credential.
//
// The manual-password path is kept, behind a disclosure, because it is the
// only way to stand a studio up when SMTP is down — and the API refuses the
// invite path in that case rather than creating an account nobody can claim.
