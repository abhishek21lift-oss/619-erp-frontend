'use client';

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
        <h2 className="text-[15px] font-[760] text-[color:var(--text-primary)]">Medical screening</h2>
        <p className="mt-1 text-[12.5px] text-[color:var(--text-muted)]">
          Snapshot from when this page loaded. The server re-checks eligibility every time you save.
        </p>
        <dl className="mt-4 space-y-2.5">
          <div style={rowStyle}>
            <dt className="text-[12.5px] font-[600] text-[color:var(--text-muted)]">PAR-Q</dt>
            <dd className="text-[13px] font-[700] text-[color:var(--text-secondary)]">
              {statusWord(parq?.status)}
              {parq?.risk_level ? ` · Risk level: ${riskWord(parq.risk_level)}` : ''}
              {parq?.stale ? ' · older than 12 months' : ''}
            </dd>
          </div>
          <div style={rowStyle}>
            <dt className="text-[12.5px] font-[600] text-[color:var(--text-muted)]">Medical clearance</dt>
            <dd className="text-[13px] font-[700] text-[color:var(--text-secondary)]">
              {parq?.has_valid_clearance ? 'Valid' : 'None recorded'}
            </dd>
          </div>
          <div style={rowStyle}>
            <dt className="text-[12.5px] font-[600] text-[color:var(--text-muted)]">Informed consent</dt>
            <dd className="text-[13px] font-[700] text-[color:var(--text-secondary)]">
              {statusWord(consent?.status)}
            </dd>
          </div>
          {block && (
            <div style={rowStyle}>
              <dt className="text-[12.5px] font-[600] text-[color:var(--text-muted)]">Training block</dt>
              <dd className="text-[13px] font-[700]" style={{ color: 'var(--danger-text)' }}>
                {block.message}
              </dd>
            </div>
          )}
          {warnings.map((w) => (
            <div key={w} style={rowStyle}>
              <dt className="text-[12.5px] font-[600] text-[color:var(--text-muted)]">Note</dt>
              <dd className="text-[13px] font-[600] text-[color:var(--text-secondary)]">{w}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href={`/pt-os/parq?client_id=${encodeURIComponent(clientId)}`}
            className="text-[13px] font-[700]"
            style={{ color: 'var(--brand, #0067E0)' }}
          >
            Review PAR-Q
          </a>
          <a
            href={`/pt-os/informed-consent?client_id=${encodeURIComponent(clientId)}`}
            className="text-[13px] font-[700]"
            style={{ color: 'var(--brand, #0067E0)' }}
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
      <p className="text-[14px] font-[760] text-[color:var(--text-primary)]">Screening notes</p>
      <ul className="mt-2 space-y-1.5">
        {list.map((w) => (
          <li key={w} className="text-[12.5px] text-[color:var(--text-muted)]">{w}</li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-3">
        <a
          href={`/pt-os/parq?client_id=${encodeURIComponent(clientId)}`}
          className="text-[13px] font-[700]"
          style={{ color: 'var(--brand, #0067E0)' }}
        >
          Review PAR-Q
        </a>
        <a
          href={`/pt-os/informed-consent?client_id=${encodeURIComponent(clientId)}`}
          className="text-[13px] font-[700]"
          style={{ color: 'var(--brand, #0067E0)' }}
        >
          Open consent
        </a>
      </div>
    </div>
  );
}
