'use client';
// The cockpit's "progress radar" card.
//
// The dashboard has no client in context, so this reads the studio's most
// recent fitness test that actually carries scores — the assessments endpoint
// is tenant-scoped and returns newest first — and names its client from the
// roster. Three measured categories is the floor for a spoke chart; below that
// the card points at the wizard instead of plotting a shape out of missing
// data, and a failed fetch costs this card, never the screen.
import { useMemo } from 'react';
import Link from 'next/link';
import { Activity, ChevronRight } from 'lucide-react';
import http from '@/lib/http';
import { useAsync } from '@/lib/use-async';
import { fmtDate } from '@/lib/format';
import { palette, rgba } from '@/lib/palette';
import ClientAvatar from '@/components/pt-os/ClientAvatar';
import FitnessRadarChart from '@/components/pt-os/FitnessRadarChart';
import { radarDataFromScores } from '@/components/pt-os/fitness-testing/FitnessDashboard';
import { scoresFromAssessmentRow, scoreNum } from '@/lib/fitness-calculations';

type Row = Record<string, unknown>;

/** A radar needs spokes: three measured categories is the floor. */
function scoredRow(rows: Row[]): Row | null {
  for (const row of rows) {
    const s = scoresFromAssessmentRow(row);
    const measured = [
      s.cardioScore, s.strengthScore, s.enduranceScore,
      s.mobilityScore, s.bodyCompositionScore, s.healthRiskScore,
    ].filter((v) => v !== null).length;
    if (measured >= 3) return row;
  }
  return null;
}

export default function ProgressRadarCard() {
  const assessments = useAsync<Row[]>(
    (signal) => http<{ data: Row[] }>('/api/progress/assessments?limit=6', { signal }).then((r) => r.data),
    [],
  );
  const clients = useAsync<Row[]>(
    (signal) => http<{ data: Row[] }>('/api/pt-os/clients?limit=200', { signal }).then((r) => r.data),
    [],
  );

  const rows = Array.isArray(assessments.data) ? assessments.data : null;
  const scored = useMemo(() => (rows ? scoredRow(rows) : null), [rows]);
  const owner = useMemo(() => {
    const list = Array.isArray(clients.data) ? clients.data : [];
    return list.find((c) => c.id === scored?.client_id) ?? null;
  }, [clients.data, scored]);

  if (assessments.hasResolved && !rows) return null;

  return (
    <section className="glass-panel p-4 sm:p-5" aria-label="Progress radar">
      <div className="flex items-center gap-2.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px]"
          style={{ background: rgba(palette.blue[500], 0.10), color: palette.blue[600] }}>
          <Activity size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-[800] tracking-[-0.015em] sm:text-[16px]" style={{ color: 'var(--text-primary)' }}>
            Progress Radar
          </h3>
          <p className="text-[11px] font-[600]" style={{ color: 'var(--text-muted)' }}>
            The latest measured test across the roster
          </p>
        </div>
      </div>

      {!assessments.hasResolved ? (
        <div className="mt-3 h-[240px] animate-pulse rounded-[14px]"
          style={{ background: rgba(palette.blue[500], 0.06) }} />
      ) : scored ? (
        <Radar scored={scored} name={owner ? String(owner.name ?? '') : ''}
          photo={owner?.photo_url ? String(owner.photo_url) : null} />
      ) : (
        <div className="mt-3">
          <p className="text-[13.5px] font-[750]" style={{ color: 'var(--text-primary)' }}>No fitness tests yet</p>
          <p className="mt-0.5 text-[11.5px] leading-snug" style={{ color: 'var(--text-muted)' }}>
            The first assessment puts a baseline on this radar — six categories, measured, not guessed.
          </p>
          <Link href="/pt-os/assessment"
            className="mt-3 flex h-11 items-center justify-center gap-1.5 rounded-[12px] text-[12.5px] font-[750] transition active:scale-[0.98]"
            style={{ background: rgba(palette.blue[500], 0.10), color: palette.blue[600] }}>
            Run an assessment <ChevronRight size={14} />
          </Link>
        </div>
      )}
    </section>
  );
}

function Radar({ scored, name, photo }: { scored: Row; name: string; photo: string | null }) {
  const scores = scoresFromAssessmentRow(scored);
  const number = scoreNum(scored.assessment_number);
  const rawDate = typeof scored.assessment_date === 'string' ? scored.assessment_date : '';
  const meta = [number != null ? `Assessment #${number}` : null, rawDate ? fmtDate(rawDate) : null]
    .filter(Boolean).join(' · ');
  const clientId = typeof scored.client_id === 'string' ? scored.client_id : '';
  const href = clientId ? `/pt-os/assessment?client_id=${encodeURIComponent(clientId)}` : '/pt-os/assessment';

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2.5">
        <ClientAvatar name={name || 'Client'} photoUrl={photo}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[12px] font-[700] text-white"
          style={{ background: `linear-gradient(135deg, ${palette.blue[450]}, ${palette.blue[600]})` }} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-[760]" style={{ color: 'var(--text-primary)' }}>
            {name || 'Latest assessment'}
          </p>
          {meta && <p className="text-[11px] font-[600]" style={{ color: 'var(--text-muted)' }}>{meta}</p>}
        </div>
        {scores.overallScore != null && (
          <span className="shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-[800]"
            style={{ background: rgba(palette.blue[500], 0.10), color: palette.blue[600] }}>
            Overall {scores.overallScore}
          </span>
        )}
      </div>

      <FitnessRadarChart data={radarDataFromScores(scores)} height={250} variant="onCard" accent={palette.blue[450]} />

      <Link href={href}
        className="mt-1 flex h-11 items-center justify-center gap-1.5 rounded-[12px] text-[12.5px] font-[750] transition active:scale-[0.98]"
        style={{ background: rgba(palette.blue[500], 0.10), color: palette.blue[600] }}>
        Open assessment <ChevronRight size={14} />
      </Link>
    </div>
  );
}
