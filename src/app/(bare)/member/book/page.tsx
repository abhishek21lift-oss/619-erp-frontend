'use client';

/**
 * Book a PT session.
 *
 * One screen for the whole loop: pick a day, pick a free slot, confirm; then
 * move or cancel an existing booking. The server owns every rule — which slots
 * exist, how close to the session cancellation stops, whether someone else took
 * the slot a moment ago — so this page never re-derives them. It shows what the
 * API returned and turns a refusal into the server's own message.
 */

import { useMemo, useState } from 'react';
import { CalendarPlus, CalendarClock, Loader2 } from 'lucide-react';
import Guard from '@/components/Guard';
import MemberShell from '@/components/member/MemberShell';
import { PageTitle } from '@/components/member/MemberUI';
import { api } from '@/lib/api';
import type { MeBooking } from '@/lib/api';
import { useAsync } from '@/lib/use-async';
import { useToast } from '@/lib/toast';
import { errorMessage } from '@/lib/forms/errors';
import { Button, EmptyState } from '@/components/ui';
import { cn } from '@/components/ui/cn';

const dayLabel = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC',
  });

const longDay = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
  });

export default function MemberBookingPage() {
  return <Guard><Inner /></Guard>;
}

function Inner() {
  const { toast } = useToast();
  const [day, setDay] = useState<string | null>(null);
  const [picked, setPicked] = useState<{ date: string; start: string } | null>(null);
  // When set, the picker is moving an existing booking instead of creating one.
  const [movingId, setMovingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const availability = useAsync(() => api.me.bookingAvailability().then((r) => r.data), []);
  const bookings = useAsync(() => api.me.bookings().then((r) => r.data), []);

  const days = useMemo(
    () => (availability.data?.days ?? []).filter((d) => d.slots.length > 0),
    [availability.data],
  );
  const activeDay = day ?? days[0]?.date ?? null;
  const slots = days.find((d) => d.date === activeDay)?.slots ?? [];
  const sessions: MeBooking[] = bookings.data ?? [];

  async function confirm() {
    if (!picked) return;
    setBusy(true);
    try {
      if (movingId) {
        await api.me.rescheduleBooking(movingId, picked.date, picked.start);
        toast.success('Session moved');
      } else {
        await api.me.book(picked.date, picked.start);
        toast.success('Session booked');
      }
      setPicked(null);
      setMovingId(null);
      await Promise.all([availability.refetch(), bookings.refetch()]);
    } catch (err) {
      toast.error(errorMessage(err, 'That slot could not be booked. Try another time.'));
      await availability.refetch();
    } finally {
      setBusy(false);
    }
  }

  async function cancel(id: string) {
    if (!window.confirm('Cancel this session?')) return;
    setBusy(true);
    try {
      await api.me.cancelBooking(id);
      toast.success('Session cancelled');
      await Promise.all([availability.refetch(), bookings.refetch()]);
    } catch (err) {
      toast.error(errorMessage(err, 'That session could not be cancelled.'));
    } finally {
      setBusy(false);
    }
  }

  function startMoving(id: string) {
    setMovingId(id);
    setPicked(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <MemberShell>
      <PageTitle
        icon={<CalendarPlus size={18} />}
        title="Book a session"
        sub={movingId ? 'Pick a new time for your session' : 'Pick a time that works for you'}
        accent="plan"
      />

      {availability.loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : availability.error ? (
        <EmptyState
          icon={<CalendarClock size={22} />}
          title="Could not load booking times"
          description={errorMessage(availability.error, 'Try again in a moment.')}
        />
      ) : days.length === 0 ? (
        <EmptyState
          icon={<CalendarClock size={22} />}
          title="Your trainer hasn't opened booking yet."
          description="Once they publish their hours, free slots appear here."
        />
      ) : (
        <>
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {days.map((d) => (
              <button
                key={d.date}
                type="button"
                aria-pressed={d.date === activeDay}
                onClick={() => { setDay(d.date); setPicked(null); }}
                className={cn(
                  'shrink-0 rounded-xl border px-3 py-2 text-xs font-semibold transition',
                  d.date === activeDay
                    ? 'border-transparent bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                )}
              >
                {dayLabel(d.date)}
              </button>
            ))}
          </div>

          <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="mb-1 text-sm font-semibold text-slate-900">{longDay(activeDay ?? '')}</h2>
            <p className="mb-3 text-xs text-slate-500">
              {availability.data?.settings.slot_minutes ?? 60} minute session
            </p>
            <div className="flex flex-wrap gap-2">
              {slots.map((slot) => {
                const chosen = picked?.date === activeDay && picked?.start === slot.start;
                return (
                  <button
                    key={slot.start}
                    type="button"
                    aria-pressed={chosen}
                    onClick={() => setPicked({ date: activeDay as string, start: slot.start })}
                    className={cn(
                      'rounded-xl border px-3 py-2 text-sm font-medium transition',
                      chosen
                        ? 'border-transparent bg-violet-600 text-white'
                        : 'border-slate-200 text-slate-700 hover:border-violet-300',
                    )}
                  >
                    {slot.start}
                  </button>
                );
              })}
            </div>

            {picked && (
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                <p className="text-sm text-slate-600">
                  {dayLabel(picked.date)} at {picked.start}
                </p>
                <Button onClick={confirm} disabled={busy}>
                  {busy ? 'Booking…' : 'Confirm booking'}
                </Button>
              </div>
            )}
          </section>
        </>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <CalendarClock size={16} /> My sessions
        </h2>

        {bookings.loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin" /></div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-slate-500">No sessions booked yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {sessions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {longDay(s.session_date)}, {s.start_time}–{s.end_time}
                  </p>
                  <p className="text-xs text-slate-500">
                    {s.can_cancel ? 'You can still change this session.' : 'Contact your trainer to change this session.'}
                  </p>
                </div>
                {s.can_cancel && (
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => startMoving(s.id)} disabled={busy}>
                      Reschedule
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => cancel(s.id)} disabled={busy}>
                      Cancel
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </MemberShell>
  );
}
