'use client';

// The rest timer between sets.
//
// ── Why it reads the clock instead of counting ticks ───────────────────────
//
// The obvious implementation decrements a counter on a one-second interval.
// It is also wrong on the device this runs on: a phone that locks, or a tab
// pushed to the background, has its timers throttled to once a minute or
// stopped altogether. A counting timer comes back showing 90 seconds left when
// three minutes have passed, and the trainer rests to a number that is fiction.
//
// So the deadline is a timestamp and every tick recomputes from the clock. The
// interval only decides how often the display refreshes; it never decides what
// the display says.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, Timer, X } from 'lucide-react';

/** Seconds left at `now`, floored at zero. Exported so the test can be exact. */
export function remainingSeconds(endsAt: number, now: number): number {
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export interface RestTimerProps {
  /** Prescribed rest. The timer starts as soon as this is mounted with a value. */
  seconds: number;
  /** Fired once when the countdown reaches zero. */
  onDone?: () => void;
  onDismiss?: () => void;
  /** Injectable clock — the component reads real time otherwise. */
  now?: () => number;
}

export default function RestTimer({ seconds, onDone, onDismiss, now = Date.now }: RestTimerProps) {
  const [endsAt, setEndsAt] = useState(() => now() + seconds * 1000);
  const [remaining, setRemaining] = useState(seconds);
  const [paused, setPaused] = useState(false);
  /** Seconds held while paused, so resuming does not lose them. */
  const heldRef = useRef(0);
  const firedRef = useRef(false);
  const doneRef = useRef(onDone);
  useEffect(() => { doneRef.current = onDone; });

  // A new prescription (the next exercise's rest) restarts the clock.
  useEffect(() => {
    setEndsAt(now() + seconds * 1000);
    setRemaining(seconds);
    setPaused(false);
    firedRef.current = false;
  }, [seconds, now]);

  useEffect(() => {
    if (paused) return;
    const tick = () => {
      const left = remainingSeconds(endsAt, now());
      setRemaining(left);
      if (left === 0 && !firedRef.current) {
        firedRef.current = true;
        doneRef.current?.();
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endsAt, paused, now]);

  const togglePause = useCallback(() => {
    setPaused((p) => {
      if (p) {
        setEndsAt(now() + heldRef.current * 1000);
        return false;
      }
      heldRef.current = remainingSeconds(endsAt, now());
      return true;
    });
  }, [endsAt, now]);

  const restart = useCallback(() => {
    firedRef.current = false;
    setPaused(false);
    setEndsAt(now() + seconds * 1000);
    setRemaining(seconds);
  }, [seconds, now]);

  const done = remaining === 0;
  const pct = seconds > 0 ? Math.min(100, ((seconds - remaining) / seconds) * 100) : 100;

  return (
    <div
      role="timer"
      aria-live="off"
      aria-label={`Rest timer, ${formatClock(remaining)} remaining`}
      className="flex items-center gap-3 rounded-[14px] border px-3.5 py-2.5"
      style={{
        borderColor: done ? 'var(--success-border)' : 'var(--border-2)',
        background: done ? 'var(--success-bg)' : 'var(--surface-2)',
      }}
    >
      <Timer size={16} style={{ color: done ? 'var(--success-text)' : 'var(--text-muted)' }} />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-[17px] font-[750] tabular-nums" style={{ color: 'var(--text-primary)' }}>
            {formatClock(remaining)}
          </span>
          <span className="text-[11px] font-[620]" style={{ color: 'var(--text-muted)' }}>
            {done ? 'Rest complete' : paused ? 'Paused' : 'Rest'}
          </span>
        </div>
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full" style={{ background: 'var(--border-2)' }}>
          <div
            className="h-full rounded-full transition-[width] duration-200"
            style={{ width: `${pct}%`, background: done ? 'var(--success-text)' : 'var(--brand)' }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={togglePause}
        aria-label={paused ? 'Resume rest timer' : 'Pause rest timer'}
        className="rounded-[9px] p-1.5 transition-colors hover:bg-[var(--surface-3)]"
        style={{ color: 'var(--text-muted)' }}
      >
        {paused ? <Play size={14} /> : <Pause size={14} />}
      </button>
      <button
        type="button"
        onClick={restart}
        aria-label="Restart rest timer"
        className="rounded-[9px] p-1.5 transition-colors hover:bg-[var(--surface-3)]"
        style={{ color: 'var(--text-muted)' }}
      >
        <RotateCcw size={14} />
      </button>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss rest timer"
          className="rounded-[9px] p-1.5 transition-colors hover:bg-[var(--surface-3)]"
          style={{ color: 'var(--text-muted)' }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
