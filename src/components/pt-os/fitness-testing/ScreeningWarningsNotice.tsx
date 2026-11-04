'use client';

// The save response already returns `screening_warnings`; the page used to
// show them only as a toast. Same strings, now also inline after save.
function asWarnings(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((w): w is string => typeof w === 'string' && w.trim().length > 0);
}

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
          style={{ color: 'var(--action-text, #852E4E)' }}
        >
          Review PAR-Q
        </a>
        <a
          href={`/pt-os/informed-consent?client_id=${encodeURIComponent(clientId)}`}
          className="text-[13px] font-[700]"
          style={{ color: 'var(--action-text, #852E4E)' }}
        >
          Open consent
        </a>
      </div>
    </div>
  );
}
