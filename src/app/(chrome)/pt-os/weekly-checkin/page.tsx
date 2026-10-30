'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@tanstack/react-form';
import { m } from 'framer-motion';
import { ClipboardCheck, Plus, Loader2, Check } from 'lucide-react';
import Guard from '@/components/Guard';
import { useAsync } from '@/lib/use-async';
import { api, Client } from '@/lib/api';
import { Button, PageHero } from '@/components/ui';
import {
  ChoiceChips, DateFieldControl, FormErrorBanner, NumberField, SelectField, TextAreaField,
} from '@/components/ui/form';
import { PremiumAreaChart } from '@/components/visualizations';
import WeeklyCheckinInsightCard from '@/components/pt-os/WeeklyCheckinInsightCard';
import { mondayYmd } from '@/lib/attendance-view';
import { useAppForm } from '@/lib/forms/useAppForm';
import {
  WEEKLY_CHECKIN_MOOD_OPTIONS, blankWeeklyCheckin, toWeeklyCheckinPayload,
  weeklyCheckinSchema,
} from '@/lib/forms/schemas/weeklyCheckin';

interface CheckinRow {
  id: string;
  week_start_date?: unknown;
  weight?: number;
  workout_count?: number;
  mood?: string;
  adherence_pct?: number;
}

export default function WeeklyCheckinPage() {
  // Monday, in the trainer's own calendar. It was the Sunday before, computed
  // in UTC — a different week from the member app's, and in India before
  // 05:30 a different day as well. The server snaps any date to its Monday.
  // Captured once so a page left open overnight does not move the week.
  const [initialValues] = useState(() => blankWeeklyCheckin(mondayYmd()));
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const f = useAppForm({
    schema: weeklyCheckinSchema,
    defaultValues: initialValues,
    // A successful check-in leaves every value on screen: the trainer logs the
    // next week from the same client, and the old form never cleared itself.
    keepValuesOnSuccess: true,
    onSubmit: async (values) => {
      await api.progress.weeklyCheckins.create(toWeeklyCheckinPayload(values));
      setSaved(true);
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(false), 2000);
      // The list is the only confirmation that the upsert landed, so refresh
      // it even though the form stays populated.
      checkins.refetch();
    },
  });
  const { form, errors, isSubmitting } = f;
  const values = useStore(form.store, (s) => s.values);
  const clientId = values.client_id;

  useEffect(() => () => {
    if (savedTimer.current) clearTimeout(savedTimer.current);
  }, []);

  const clients = useAsync<Client[]>(() => api.pt.clients().then(r => r.data as Client[]), []);
  const checkins = useAsync(() => api.progress.weeklyCheckins.list(clientId ? { client_id: clientId } : {}).then(r => r.data), [clientId]);
  // One typed view of the check-in rows, reused everywhere below instead of
  // an `any[]` cast at each call site.
  const checkinRows = (checkins.data ?? []) as CheckinRow[];

  // Oldest-first, real weight readings only — a check-in logged without a
  // weight (mood/sleep only) contributes nothing to this trend rather than a
  // gap plotted as zero.
  const weightTrend = useMemo(() => {
    return checkinRows
      .filter((c): c is CheckinRow & { weight: number } => typeof c.weight === 'number' && Number.isFinite(c.weight))
      .sort((a, b) => String(a.week_start_date).localeCompare(String(b.week_start_date)))
      .map((c) => ({ week: String(c.week_start_date), weight: c.weight }));
  }, [checkinRows]);

  const pageError = clients.error || checkins.error;

  // Clear a previous "Saved!" before validation runs, so a refused retry can
  // never sit under a success label while the error banner says otherwise.
  function submit() {
    if (savedTimer.current) {
      clearTimeout(savedTimer.current);
      savedTimer.current = null;
    }
    setSaved(false);
    void f.submit();
  }

  if (pageError && !clients.loading && !checkins.loading) {
    return (
      <Guard>
        <div className="mx-auto w-full max-w-7xl pb-6 pt-1 sm:pb-8">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 320, padding: 40 }}>
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 20,
              padding: '40px 32px',
              textAlign: 'center',
              maxWidth: 400,
              boxShadow: '0 4px 24px rgba(15,23,42,0.06)',
            }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
                Unable to Load Data
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 20px' }}>
                Please try again.
              </p>
              <button
                onClick={() => { clients.refetch(); checkins.refetch(); }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '10px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #3F46D6, #5B63F6)',
                  color: '#fff', fontSize: 13, fontWeight: 700,
                  boxShadow: '0 4px 12px rgba(63,70,214,0.25)',
                }}
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </Guard>
    );
  }

  return (
    <Guard>
      <div className="mx-auto w-full max-w-7xl py-6 sm:py-8">
        <PageHero
          className="mb-5"
          icon={<ClipboardCheck size={20} />}
          title="Weekly Check-In"

        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <m.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-[18px] font-[760] mb-5" style={{ color: 'var(--text-primary)' }}>Log Check-In</h2>
            <form
              noValidate
              onSubmit={(e) => { e.preventDefault(); submit(); }}
              className="space-y-4"
            >
              <FormErrorBanner errors={errors} onRetry={submit} />

              <form.Field name="client_id">
                {(field) => (
                  <SelectField
                    field={field}
                    label="Client"
                    required
                    placeholderOption="Select client..."
                    options={(clients.data ?? []).map(c => ({ value: c.id, label: c.name }))}
                    serverError={errors.fieldErrors.client_id}
                  />
                )}
              </form.Field>

              <form.Field name="week_start_date">
                {(field) => (
                  <DateFieldControl
                    field={field}
                    label="Week starting"
                    required
                    serverError={errors.fieldErrors.week_start_date}
                  />
                )}
              </form.Field>

              <div className="grid grid-cols-2 gap-3">
                <form.Field name="weight">
                  {(field) => (
                    <NumberField
                      field={field}
                      label="Weight"
                      description="kg (20–400)"
                      mode="decimal"
                      placeholder="e.g. 72.5"
                      min={20}
                      max={400}
                      serverError={errors.fieldErrors.weight}
                    />
                  )}
                </form.Field>
                <form.Field name="sleep_hours">
                  {(field) => (
                    <NumberField
                      field={field}
                      label="Sleep"
                      description="hours per night (0–24)"
                      mode="decimal"
                      placeholder="e.g. 7.5"
                      min={0}
                      max={24}
                      serverError={errors.fieldErrors.sleep_hours}
                    />
                  )}
                </form.Field>
                <form.Field name="water_glasses">
                  {(field) => (
                    <NumberField
                      field={field}
                      label="Water"
                      description="glasses per day (0–40)"
                      mode="integer"
                      min={0}
                      max={40}
                      serverError={errors.fieldErrors.water_glasses}
                    />
                  )}
                </form.Field>
                <form.Field name="workout_count">
                  {(field) => (
                    <NumberField
                      field={field}
                      label="Workouts"
                      description="this week (0–21)"
                      mode="integer"
                      min={0}
                      max={21}
                      serverError={errors.fieldErrors.workout_count}
                    />
                  )}
                </form.Field>
              </div>

              <form.Field name="adherence_pct">
                {(field) => (
                  <NumberField
                    field={field}
                    label="Adherence"
                    description="Percentage, 0 to 100."
                    mode="decimal"
                    min={0}
                    max={100}
                    suffix="%"
                    serverError={errors.fieldErrors.adherence_pct}
                  />
                )}
              </form.Field>

              {/* ── Readiness inputs ──
                  Sleep is already above. These three are the rest of what a
                  recovery score needs: without them it is a sleep score
                  wearing a different name. Each is optional, and the score
                  is computed only from the ones answered. */}
              <div>
                <p className="mb-2 text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                  Readiness — 1 to 10, optional
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <form.Field name="stress_level">
                    {(field) => (
                      <NumberField
                        field={field}
                        label="Stress"
                        description="10 = worst"
                        mode="integer"
                        min={1}
                        max={10}
                        serverError={errors.fieldErrors.stress_level}
                      />
                    )}
                  </form.Field>
                  <form.Field name="energy_level">
                    {(field) => (
                      <NumberField
                        field={field}
                        label="Energy"
                        description="10 = best"
                        mode="integer"
                        min={1}
                        max={10}
                        serverError={errors.fieldErrors.energy_level}
                      />
                    )}
                  </form.Field>
                  <form.Field name="soreness_level">
                    {(field) => (
                      <NumberField
                        field={field}
                        label="Soreness"
                        description="10 = worst"
                        mode="integer"
                        min={1}
                        max={10}
                        serverError={errors.fieldErrors.soreness_level}
                      />
                    )}
                  </form.Field>
                </div>
              </div>

              <form.Field name="mood">
                {(field) => (
                  <ChoiceChips
                    field={field}
                    legend="Mood"
                    required
                    options={WEEKLY_CHECKIN_MOOD_OPTIONS}
                    serverError={errors.fieldErrors.mood}
                  />
                )}
              </form.Field>

              <form.Field name="trainer_notes">
                {(field) => (
                  <TextAreaField
                    field={field}
                    label="Trainer notes"
                    rows={2}
                    maxLength={2000}
                    showCount
                    placeholder="How the week went, anything to watch"
                    serverError={errors.fieldErrors.trainer_notes}
                  />
                )}
              </form.Field>

              <Button type="submit" disabled={!clientId || isSubmitting}
                className="!w-full !rounded-[14px] !py-3 !font-[700]"
                style={{ background: !clientId || isSubmitting ? 'rgba(0,0,0,0.1)' : 'linear-gradient(135deg, #3F46D6, #5B63F6)', color: '#fff' }}>
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : <Plus size={16} />}
                {isSubmitting ? 'Saving...' : saved ? 'Saved!' : 'Log Check-In'}
              </Button>
            </form>
          </m.div>

          <m.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            className="rounded-[20px] p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h2 className="text-[18px] font-[760] mb-5" style={{ color: 'var(--text-primary)' }}>Recent Check-Ins</h2>
            {clientId && checkinRows.length > 0 ? (
              <div className="mb-5">
                <WeeklyCheckinInsightCard clientId={clientId} checkinsCount={checkinRows.length} />
              </div>
            ) : null}
            {/* Only drawn once a client is picked — the list otherwise mixes
                every client's check-ins, and a weight trend across different
                people is not a trend. Needs two real readings for a line to
                describe a direction. */}
            {clientId && weightTrend.length >= 2 && (
              <PremiumAreaChart
                data={weightTrend}
                xKey="week"
                areas={[{ key: 'weight', label: 'Weight (kg)' }]}
                height={160}
                className="mb-5"
              />
            )}
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {checkinRows.map((c) => (
                <div key={c.id} className="rounded-[14px] p-4" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                  <div className="flex justify-between mb-2">
                    <span className="text-[12px] font-semibold" style={{ color: 'var(--text-muted)' }}>Week of {String(c.week_start_date)}</span>
                    {!!c.adherence_pct && (
                      <span className="text-[11px] font-bold" style={{ color: c.adherence_pct >= 80 ? '#10b981' : c.adherence_pct >= 60 ? '#f59e0b' : '#ef4444' }}>
                        {c.adherence_pct}%
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    {!!c.weight && <div><span style={{ color: 'var(--text-muted)' }}>Wt: </span><span className="font-semibold">{c.weight}kg</span></div>}
                    {!!c.workout_count && c.workout_count > 0 && <div><span style={{ color: 'var(--text-muted)' }}>WOs: </span><span className="font-semibold">{c.workout_count}</span></div>}
                    {!!c.mood && <div><span style={{ color: 'var(--text-muted)' }}>Mood: </span><span className="font-semibold capitalize">{c.mood}</span></div>}
                  </div>
                </div>
              ))}
              {checkinRows.length === 0 && (
                <p className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>No check-ins yet.</p>
              )}
            </div>
          </m.div>
        </div>
      </div>
    </Guard>
  );
}
