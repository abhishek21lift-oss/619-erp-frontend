'use client';

/**
 * Availability: the trainer's side of client self-booking.
 *
 * Three things live here because they all answer "when can a client take a
 * session": the weekly bookable windows, time off, and the slot settings that
 * turn windows into slots. Publishing a week replaces it wholesale, which is
 * why the whole week is edited in one place and saved with one button.
 *
 * Nothing here computes slots — the server does, on every read — so this page
 * never shows a stale slot list. It shows what it will publish and lets the
 * server refuse a bad week.
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  CalendarClock, Copy, ExternalLink, Loader2, Plus, Trash2, Bell, Check,
} from 'lucide-react';
import Guard from '@/components/Guard';
import {
  Button, EmptyState, FormField, PageContainer, PageHero, TextInput,
} from '@/components/ui';
import { api } from '@/lib/api';
import type { AvailabilityWindow, BookingSettings, TimeOff, TrainerAvailability } from '@/lib/api';
import { apiBase } from '@/lib/http';
import { useAsync } from '@/lib/use-async';
import { useToast } from '@/lib/toast';
import { errorMessage } from '@/lib/forms/errors';
import { WEEKDAYS, validateWindows } from '@/lib/booking/availability';

export default function AvailabilityPage() {
  return (
    <Guard role="trainer">
      <Inner />
    </Guard>
  );
}

function Inner() {
  const availability = useAsync(() => api.pt.availability().then((r) => r.data), []);

  return (
    <PageContainer>
      <PageHero
        icon={<CalendarClock size={20} color="#fff" />}
        title="Availability"
        subtitle="The hours clients can book themselves, and how close to a session they can change it."
      />

      {availability.loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : availability.error ? (
        <EmptyState
          icon={<CalendarClock size={22} />}
          title="Could not load availability"
          description={errorMessage(availability.error, 'Try again in a moment.')}
        />
      ) : availability.data ? (
        // Mounted only once the week is known, so the editor can seed its
        // state from props without an effect that would clobber typing.
        <Editor data={availability.data} onSaved={availability.refetch} />
      ) : null}
    </PageContainer>
  );
}

function Editor({ data, onSaved }: { data: TrainerAvailability; onSaved: () => Promise<void> }) {
  const { toast } = useToast();
  const [windows, setWindows] = useState<AvailabilityWindow[]>(data.windows);
  const [timeOff, setTimeOff] = useState<TimeOff[]>(data.timeOff);
  const [settings, setSettings] = useState<BookingSettings>(data.settings);
  const [token, setToken] = useState<string | null>(data.settings.ics_token);
  const [busy, setBusy] = useState<null | 'week' | 'timeoff' | 'settings'>(null);

  const [range, setRange] = useState({ starts_on: '', ends_on: '', reason: '' });

  const feedUrl = token
    ? `${apiBase().replace(/\/+$/, '')}/api/public/calendar/${token}.ics`
    : null;
  const googleUrl = feedUrl
    ? `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(feedUrl.replace(/^https?:/, 'webcal:'))}`
    : null;

  const addWindow = (weekday: number) => setWindows((prev) => [
    ...prev,
    { weekday, start_time: '07:00', end_time: '09:00' },
  ]);

  const patchWindow = (index: number, patch: Partial<AvailabilityWindow>) =>
    setWindows((prev) => prev.map((w, i) => (i === index ? { ...w, ...patch } : w)));

  const removeWindow = (index: number) =>
    setWindows((prev) => prev.filter((_, i) => i !== index));

  async function saveWeek() {
    const problem = validateWindows(windows);
    if (problem) {
      toast.error(problem);
      return;
    }
    setBusy('week');
    try {
      const res = await api.pt.saveAvailability(windows);
      const { warnings } = res.data;
      if (warnings.length > 0) {
        toast.warning(
          `${warnings.length} booked session${warnings.length > 1 ? 's are' : ' is'} outside these hours. `
          + 'They stay booked — move them from Sessions if needed.',
        );
      } else {
        toast.success('Availability saved');
      }
      await onSaved();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save this week.'));
    } finally {
      setBusy(null);
    }
  }

  async function addTimeOff() {
    if (!range.starts_on || !range.ends_on) {
      toast.error('Pick both dates.');
      return;
    }
    if (range.starts_on > range.ends_on) {
      toast.error('The end date must be on or after the start date.');
      return;
    }
    setBusy('timeoff');
    try {
      const res = await api.pt.addTimeOff({
        starts_on: range.starts_on,
        ends_on: range.ends_on,
        ...(range.reason.trim() ? { reason: range.reason.trim() } : {}),
      });
      setTimeOff((prev) => [...prev, res.data]);
      setRange({ starts_on: '', ends_on: '', reason: '' });
      toast.success('Time off added');
    } catch (err) {
      // 409 TIME_OFF_CONFLICT names the sessions in the way.
      toast.error(errorMessage(err, 'Could not add that time off.'));
    } finally {
      setBusy(null);
    }
  }

  async function removeTimeOff(id: string) {
    setBusy('timeoff');
    try {
      await api.pt.removeTimeOff(id);
      setTimeOff((prev) => prev.filter((t) => t.id !== id));
      toast.success('Time off removed');
    } catch (err) {
      toast.error(errorMessage(err, 'Could not remove that time off.'));
    } finally {
      setBusy(null);
    }
  }

  async function saveSettings() {
    setBusy('settings');
    try {
      const res = await api.pt.saveBookingSettings({
        slot_minutes: settings.slot_minutes,
        buffer_minutes: settings.buffer_minutes,
        min_notice_hours: settings.min_notice_hours,
        horizon_days: settings.horizon_days,
        cancel_cutoff_hours: settings.cancel_cutoff_hours,
      });
      setSettings(res.data);
      setToken(res.data.ics_token);
      toast.success('Booking settings saved');
      await onSaved();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save booking settings.'));
    } finally {
      setBusy(null);
    }
  }

  const number = (key: keyof BookingSettings) => ({
    inputMode: 'numeric' as const,
    value: String(settings[key] ?? ''),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setSettings((prev) => ({ ...prev, [key]: Number(e.target.value) })),
  });

  return (
    <div className="space-y-4">
      {/* ── Weekly windows ─────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-[15px] font-[700]">Weekly hours</h2>
        <p className="mb-4 text-[12px] text-slate-500">
          Clients can book inside these windows only. Adding a window does not
          create sessions — it opens the hour.
        </p>

        <div className="space-y-3">
          {WEEKDAYS.map((name, weekday) => {
            const day = windows
              .map((w, index) => ({ w, index }))
              .filter(({ w }) => w.weekday === weekday);

            return (
              <div key={name} className="grid gap-2 sm:grid-cols-[110px_1fr] sm:items-start">
                <p className="pt-2 text-[13px] font-semibold text-slate-700">{name}</p>
                <div className="space-y-2">
                  {day.length === 0 && (
                    <p className="pt-2 text-[12px] text-slate-400">Closed</p>
                  )}
                  {day.map(({ w, index }) => (
                    <div key={index} className="flex items-center gap-2">
                      <TextInput
                        type="time"
                        aria-label={`${name} start`}
                        value={w.start_time}
                        onChange={(e) => patchWindow(index, { start_time: e.target.value })}
                      />
                      <span className="text-slate-400">–</span>
                      <TextInput
                        type="time"
                        aria-label={`${name} end`}
                        value={w.end_time}
                        onChange={(e) => patchWindow(index, { end_time: e.target.value })}
                      />
                      <button
                        type="button"
                        aria-label={`Remove ${name} window`}
                        onClick={() => removeWindow(index)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addWindow(weekday)}
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-violet-700 hover:underline"
                  >
                    <Plus size={13} /> Add window
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={saveWeek} disabled={busy !== null}>
            {busy === 'week' ? 'Saving…' : 'Save weekly hours'}
          </Button>
        </div>
      </section>

      {/* ── Time off ───────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-[15px] font-[700]">Time off</h2>
        <p className="mb-4 text-[12px] text-slate-500">
          Whole days with no bookings. Days that already have a session are
          refused — move those sessions first.
        </p>

        <div className="grid gap-2 sm:grid-cols-4">
          <FormField label="From">
            <TextInput type="date" value={range.starts_on}
              onChange={(e) => setRange((r) => ({ ...r, starts_on: e.target.value }))} />
          </FormField>
          <FormField label="To">
            <TextInput type="date" value={range.ends_on}
              onChange={(e) => setRange((r) => ({ ...r, ends_on: e.target.value }))} />
          </FormField>
          <FormField label="Reason (optional)">
            <TextInput value={range.reason} placeholder="Travel"
              onChange={(e) => setRange((r) => ({ ...r, reason: e.target.value }))} />
          </FormField>
          <div className="self-end pb-0.5">
            <Button variant="secondary" onClick={addTimeOff} disabled={busy !== null}>
              {busy === 'timeoff' ? 'Adding…' : 'Add time off'}
            </Button>
          </div>
        </div>

        {timeOff.length > 0 && (
          <ul className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
            {timeOff.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                <p className="text-[13px] text-slate-700">
                  {t.starts_on === t.ends_on ? t.starts_on : `${t.starts_on} → ${t.ends_on}`}
                  {t.reason ? <span className="text-slate-400"> · {t.reason}</span> : null}
                </p>
                <button
                  type="button"
                  aria-label={`Remove time off ${t.starts_on}`}
                  onClick={() => removeTimeOff(t.id)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Slot settings ──────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-[15px] font-[700]">Booking settings</h2>
        <p className="mb-4 text-[12px] text-slate-500">
          These decide how a window becomes bookable slots.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <FormField label="Session length (min)" description="15–240">
            <TextInput {...number('slot_minutes')} min={15} max={240} />
          </FormField>
          <FormField label="Buffer after (min)" description="0–60">
            <TextInput {...number('buffer_minutes')} min={0} max={60} />
          </FormField>
          <FormField label="Minimum notice (h)" description="0–168">
            <TextInput {...number('min_notice_hours')} min={0} max={168} />
          </FormField>
          <FormField label="Book up to (days ahead)" description="1–90">
            <TextInput {...number('horizon_days')} min={1} max={90} />
          </FormField>
          <FormField label="Cancel/reschedule cutoff (h)" description="0–168">
            <TextInput {...number('cancel_cutoff_hours')} min={0} max={168} />
          </FormField>
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={saveSettings} disabled={busy !== null}>
            {busy === 'settings' ? 'Saving…' : 'Save settings'}
          </Button>
        </div>
      </section>

      {/* ── Calendar feed ──────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-[15px] font-[700]">Calendar feed</h2>
        <p className="mb-3 text-[12px] text-slate-500">
          A read-only subscription: booked sessions appear in your calendar, and
          nothing in the calendar can change them. Saving booking settings the
          first time creates the link; later saves keep it.
        </p>

        {feedUrl ? (
          <div className="space-y-2">
            <TextInput readOnly value={feedUrl} aria-label="Calendar feed URL"
              onFocus={(e) => e.currentTarget.select()} />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  navigator.clipboard.writeText(feedUrl)
                    .then(() => toast.success('Link copied'))
                    .catch(() => toast.error('Could not copy — select the link and copy it.'));
                }}
              >
                <Copy size={14} /> Copy link
              </Button>
              {googleUrl && (
                <a
                  href={googleUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[13px] font-semibold text-slate-700 hover:border-slate-300"
                >
                  <ExternalLink size={14} /> Add to Google Calendar
                </a>
              )}
            </div>
          </div>
        ) : (
          <p className="inline-flex items-center gap-1.5 text-[12px] text-slate-500">
            <Check size={13} /> Save booking settings once to create your link.
          </p>
        )}
      </section>

      {/* ── Reminders ──────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="flex flex-wrap items-center gap-2 text-[13px] text-slate-600">
          <Bell size={15} className="text-violet-600" />
          Clients get an in-app reminder 24 hours and 2 hours before every
          session. To also send it on WhatsApp, turn on the session reminder
          rule.
          <Link href="/engagement/automation" className="font-semibold text-violet-700 hover:underline">
            Open Automation
          </Link>
        </p>
      </section>
    </div>
  );
}
