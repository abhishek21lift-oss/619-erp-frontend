'use client';

import { ShieldCheck } from 'lucide-react';
import { amber, emerald, gray, red } from '@/lib/palette';
import { gradient, tones } from './fitnessTheme';

// Read-only visibility for the medical-screening state the server already
// computed. Every value below comes from `screeningSummary()` (embedded in
// GET /api/pt-os/clients/:id) or from `screening_warnings` on a save
// response. Nothing here is calculated, classified, or decided: risk levels,
// block messages, and warnings render verbatim, and the card says plainly
// that the server re-checks eligibility on every save.

interface ScreeningSummary {
  consent?: { status?: string | null } | null;
  parq?: {
    status?: string | null;
    risk_level?: string | null;
    has_valid_clearance?: boolean | null;
    complete?: boolean | null;
    stale?: boolean | null;
  } | null;
  block?: { code?: string | null; message?: string | null } | null;
  warnings?: unknown;
  complete?: boolean | null;
}

// Display words for server status tokens. Renames nothing medically: the
// token stays the same idea, only readable ('in_progress' → 'In progress').
function statusWord(status: string | null | undefined): string {
  switch (status) {
    case 'completed': return 'Completed';
    case 'submitted': return 'Submitted';
    case 'reviewed': return 'Reviewed';
    case 'revoked': return 'Revoked';
    case 'expired': return 'Expired';
    case 'in_progress': return 'In progress';
    case 'none': return 'Not started';
    default: return 'Not recorded';
  }
}

function riskWord(risk: string | null | undefined): string {
  if (!risk) return 'Not recorded';
  return risk.charAt(0).toUpperCase() + risk.slice(1);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

export function asScreeningSummary(v: unknown): ScreeningSummary | null {
  return isRecord(v) ? (v as ScreeningSummary) : null;
}

function asWarnings(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((w): w is string => typeof w === 'string' && w.trim().length > 0);
}

// One dot per row, from the palette's own state families: done is emerald,
// waiting or stale is amber, blocked is red, absent is gray.
function statusDot(status: string | null | undefined, stale?: boolean | null): string {
  if (stale) return amber[500];
  switch (status) {
    case 'completed': case 'submitted': case 'reviewed': return emerald[500];
    case 'in_progress': return amber[500];
    case 'revoked': case 'expired': return red[500];
    default: return gray[400];
  }
}

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  boxShadow: '0 4px 24px rgba(15,23,42,0.06)',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: 12,
};

function RowDot({ color }: { color: string }) {
  return <span aria-hidden className="mr-2 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full align-middle" style={{ background: color }} />;
}

export function ScreeningStatusCard({ screening, clientId }: { screening: unknown; clientId: string }) {
  const s = asScreeningSummary(screening);
  if (!s) return null;
  const parq = isRecord(s.parq) ? s.parq : null;
  const consent = isRecord(s.consent) ? s.consent : null;
  const block = isRecord(s.block) && typeof s.block.message === 'string' && s.block.message ? s.block : null;
  const warnings = asWarnings(s.warnings);

  return (
    <section aria-label="Medical screening status" className="rounded-[24px] overflow-hidden" style={cardStyle}>
      <div className="p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[12px] text-white" style={{ background: gradient(tones.sky), boxShadow: `0 10px 24px -12px ${tones.sky.glow}` }}>
            <ShieldCheck size={17} />
          </span>
          <h2 className="text-[15px] font-[760]" style={{ color: 'var(--text-primary)' }}>Medical screening</h2>
        </div>
        <p className="mt-2 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
          Snapshot from when this page loaded. The server re-checks eligibility every time you save.
        </p>
        <dl className="mt-4 space-y-2.5">
          <div style={rowStyle}>
            <dt className="whitespace-nowrap text-[12.5px] font-[600]" style={{ color: 'var(--text-muted)' }}>
              <RowDot color={statusDot(parq?.status, parq?.stale)} />PAR-Q
            </dt>
            <dd className="text-[13px] font-[700]" style={{ color: 'var(--text-secondary)' }}>
              {statusWord(parq?.status)}
              {parq?.risk_level ? ` · Risk level: ${riskWord(parq.risk_level)}` : ''}
              {parq?.stale ? ' · older than 12 months' : ''}
            </dd>
          </div>
          <div style={rowStyle}>
            <dt className="whitespace-nowrap text-[12.5px] font-[600]" style={{ color: 'var(--text-muted)' }}>
              <RowDot color={parq?.has_valid_clearance ? emerald[500] : gray[400]} />Medical clearance
            </dt>
            <dd className="text-[13px] font-[700]" style={{ color: 'var(--text-secondary)' }}>
              {parq?.has_valid_clearance ? 'Valid' : 'None recorded'}
            </dd>
          </div>
          <div style={rowStyle}>
            <dt className="whitespace-nowrap text-[12.5px] font-[600]" style={{ color: 'var(--text-muted)' }}>
              <RowDot color={statusDot(consent?.status)} />Informed consent
            </dt>
            <dd className="text-[13px] font-[700]" style={{ color: 'var(--text-secondary)' }}>
              {statusWord(consent?.status)}
            </dd>
          </div>
          {block && (
            <div style={rowStyle}>
              <dt className="whitespace-nowrap text-[12.5px] font-[600]" style={{ color: 'var(--text-muted)' }}>
                <RowDot color={red[500]} />Training block
              </dt>
              <dd className="text-[13px] font-[700]" style={{ color: 'var(--danger-text)' }}>
                {block.message}
              </dd>
            </div>
          )}
          {warnings.map((w) => (
            <div key={w} style={rowStyle}>
              <dt className="whitespace-nowrap text-[12.5px] font-[600]" style={{ color: 'var(--text-muted)' }}>
                <RowDot color={amber[500]} />Note
              </dt>
              <dd className="text-[13px] font-[600]" style={{ color: 'var(--text-secondary)' }}>{w}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href={`/pt-os/parq?client_id=${encodeURIComponent(clientId)}`}
            className="text-[13px] font-[700]"
            style={{ color: 'var(--action-text, #3F46D6)' }}
          >
            Review PAR-Q
          </a>
          <a
            href={`/pt-os/informed-consent?client_id=${encodeURIComponent(clientId)}`}
            className="text-[13px] font-[700]"
            style={{ color: 'var(--action-text, #3F46D6)' }}
          >
            Open consent
          </a>
        </div>
      </div>
    </section>
  );
}

// The save response already returns `screening_warnings`; the page used to
// show them only as a toast. Same strings, now also inline after save.
export function ScreeningWarningsNotice({ warnings, clientId }: { warnings: string[]; clientId: string }) {
  const list = asWarnings(warnings);
  if (!list.length) return null;
  return (
    <div
      role="status"
      className="rounded-[20px] p-5"
      style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}
    >
      <p className="text-[14px] font-[760]" style={{ color: 'var(--text-primary)' }}>Screening notes</p>
      <ul className="mt-2 space-y-1.5">
        {list.map((w) => (
          <li key={w} className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>{w}</li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-3">
        <a
          href={`/pt-os/parq?client_id=${encodeURIComponent(clientId)}`}
          className="text-[13px] font-[700]"
          style={{ color: 'var(--action-text, #3F46D6)' }}
        >
          Review PAR-Q
        </a>
        <a
          href={`/pt-os/informed-consent?client_id=${encodeURIComponent(clientId)}`}
          className="text-[13px] font-[700]"
          style={{ color: 'var(--action-text, #3F46D6)' }}
        >
          Open consent
        </a>
      </div>
    </div>
  );
}
