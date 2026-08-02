'use client';
// How long the session has been running.
//
// Derived from the session's own created_at rather than a counter started when
// the screen mounted. A workout is logged over an hour on a phone that locks,
// gets backgrounded, and reloads — a local counter would restart at zero every
// time and report a two-minute session. The row is the clock; this only reads
// it.
//
// created_at is already what the finish sheet uses to prefill the duration, so
// "the session started when its row was created" is a convention this screen
// already relies on rather than one introduced here.
import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';

/** Whole seconds between two instants, never negative. */
export function elapsedSeconds(startedAt: string, now: number = Date.now()): number {
  const started = new Date(startedAt).getTime();
  if (!Number.isFinite(started)) return 0;
  return Math.max(0, Math.floor((now - started) / 1000));
}

/**
 * m:ss under an hour, h:mm:ss over it.
 *
 * Minutes are not zero-padded in the short form — "7:04" reads as a duration,
 * "07:04" reads as a time of day, and this sits next to a date.
 */
export function formatElapsed(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

interface SessionClockProps {
  /** The session row's created_at — when logging began. */
  startedAt: string;
  /** Stops the clock and shows the recorded duration instead. */
  completed?: boolean;
  /** duration_minutes as saved on finish, for the completed state. */
  durationMinutes?: number | null;
}

export default function SessionClock({ startedAt, completed, durationMinutes }: SessionClockProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (completed) return;
    // Ticks on a whole second rather than every 1000ms from mount, so the
    // display does not sit visibly behind the wall clock after a long session.
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [completed]);

  // A finished session shows what was recorded, not what the clock would say:
  // the trainer can correct the duration on the finish sheet, and a running
  // total that disagrees with the saved number would just look wrong.
  const label = completed
    ? (durationMinutes != null ? `${durationMinutes} min` : '—')
    : formatElapsed(elapsedSeconds(startedAt, now));

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-[750] tabular-nums"
      style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.78)' }}
      // Read out as a duration rather than as the digits, which a screen
      // reader would otherwise announce as a time.
      aria-label={completed
        ? `Session duration ${durationMinutes ?? 'not recorded'}${durationMinutes != null ? ' minutes' : ''}`
        : `Elapsed ${formatElapsed(elapsedSeconds(startedAt, now))}`}
    >
      <Timer size={15} aria-hidden />
      {label}
    </span>
  );
}
