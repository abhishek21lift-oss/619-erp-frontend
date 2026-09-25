'use client';
/**
 * Member — Weekly check-in.
 *
 * The client tells their trainer how the week went: weight, mood, sleep,
 * water, energy, stress, soreness and a note. Every reading is optional; an
 * empty check-in is refused. The server always writes THIS week's row, so
 * sending again the same week updates it rather than creating a second one,
 * and the form opens prefilled with what was already sent.
 *
 * The trainer's own notes on a check-in are never shown here — the API does
 * not return them.
 */

import { useEffect, useState } from 'react';
import { CheckCircle2, ClipboardCheck, Loader2 } from 'lucide-react';
import Guard from '@/components/Guard';
import MemberShell from '@/components/member/MemberShell';
import {
  Card, LoadError, MC, PageSkeleton, PageTitle, Section, longDate,
} from '@/components/member/MemberUI';
import { NumberField, ChoiceChips, TextAreaField, FormErrorBanner } from '@/components/ui/form';
import { api } from '@/lib/api';
import type { MeCheckin } from '@/lib/api';
import { useAppForm } from '@/lib/forms/useAppForm';
import {
  MOODS, memberCheckinSchema, blankMemberCheckin, toMemberCheckinPayload,
} from '@/lib/forms/schemas/memberCheckin';
import { useToast } from '@/lib/toast';

const MOOD_LABEL: Record<string, string> = {
  great: 'Great', good: 'Good', okay: 'Okay', tired: 'Tired', stressed: 'Stressed',
};

export default function MemberCheckinPage() {
  return (
    <Guard role="member">
      <MemberShell>
        <CheckinBody />
      </MemberShell>
    </Guard>
  );
}

function CheckinBody() {
  const [data, setData] = useState<{ this_week: string; checkins: MeCheckin[] } | null>(null);
  const [failed, setFailed] = useState(false);

  const load = () => api.me.checkins()
    .then((r) => setData(r.data))
    .catch(() => setFailed(true));

  useEffect(() => { void load(); }, []);

  if (failed) return <><PageTitle icon={<ClipboardCheck size={20} />} title="Weekly check-in" /><LoadError what="check-ins" /></>;
  if (!data) return <PageSkeleton />;

  const current = data.checkins.find((c) => String(c.week_start_date).slice(0, 10) === data.this_week) ?? null;
  const past = data.checkins.filter((c) => c !== current);

  return (
    <>
      <PageTitle icon={<ClipboardCheck size={20} />} title="Weekly check-in"
        sub={`Week of ${longDate(data.this_week) ?? data.this_week}`} />
      <CheckinForm key={current?.updated_at ?? 'new'} existing={current} onSaved={load} />
      {past.length > 0 && (
        <Section title="Earlier check-ins">
          <Card>
            {past.slice(0, 8).map((c, i, arr) => <PastRow key={c.id} c={c} last={i === arr.length - 1} />)}
          </Card>
        </Section>
      )}
    </>
  );
}

function CheckinForm({ existing, onSaved }: { existing: MeCheckin | null; onSaved: () => void }) {
  const { toast } = useToast();
  const f = useAppForm({
    schema: memberCheckinSchema,
    defaultValues: blankMemberCheckin(existing),
    onSubmit: async (values) => {
      await api.me.submitCheckin(toMemberCheckinPayload(values));
    },
    onSuccess: () => {
      toast.success(existing ? 'Check-in updated' : 'Check-in sent to your trainer');
      onSaved();
    },
  });
  const { form, isSubmitting } = f;

  return (
    <Section title={existing ? 'This week — sent' : 'This week'}
      aside={existing ? (
        <span className="inline-flex items-center gap-1 text-[11px] font-[700]" style={{ color: MC.success }}>
          <CheckCircle2 size={12} /> Sent {longDate(existing.updated_at)}
        </span>
      ) : null}>
      <Card className="p-4">
        <form onSubmit={(e) => { e.preventDefault(); void f.submit(); }} noValidate className="space-y-4">
          <FormErrorBanner errors={f.errors} onRetry={() => void f.submit()} />

          <div className="grid grid-cols-2 gap-3">
            <form.Field name="weight">
              {(field) => (
                <NumberField field={field} label="Weight" mode="decimal" suffix="kg" placeholder="e.g. 72.5"
                  serverError={f.errors.fieldErrors.weight} />
              )}
            </form.Field>
            <form.Field name="sleepHours">
              {(field) => (
                <NumberField field={field} label="Sleep" mode="decimal" suffix="hrs/night" placeholder="e.g. 7"
                  serverError={f.errors.fieldErrors.sleepHours} />
              )}
            </form.Field>
          </div>

          <form.Field name="mood">
            {(field) => (
              <ChoiceChips field={field} legend="How was your week?" density="compact"
                options={MOODS.map((m) => ({ value: m, label: MOOD_LABEL[m] }))}
                serverError={f.errors.fieldErrors.mood} />
            )}
          </form.Field>

          <div className="grid grid-cols-3 gap-3">
            <form.Field name="energyLevel">
              {(field) => (
                <NumberField field={field} label="Energy" mode="integer" placeholder="1–10"
                  serverError={f.errors.fieldErrors.energyLevel} />
              )}
            </form.Field>
            <form.Field name="stressLevel">
              {(field) => (
                <NumberField field={field} label="Stress" mode="integer" placeholder="1–10"
                  serverError={f.errors.fieldErrors.stressLevel} />
              )}
            </form.Field>
            <form.Field name="sorenessLevel">
              {(field) => (
                <NumberField field={field} label="Soreness" mode="integer" placeholder="1–10"
                  serverError={f.errors.fieldErrors.sorenessLevel} />
              )}
            </form.Field>
          </div>

          <form.Field name="waterGlasses">
            {(field) => (
              <NumberField field={field} label="Water" mode="integer" suffix="glasses/day" placeholder="e.g. 8"
                serverError={f.errors.fieldErrors.waterGlasses} />
            )}
          </form.Field>

          <form.Field name="notes">
            {(field) => (
              <TextAreaField field={field} label="Notes for your trainer" maxLength={1000}
                placeholder="Anything they should know — a niggle, a missed session, a win."
                serverError={f.errors.fieldErrors.notes} />
            )}
          </form.Field>

          <button type="submit" disabled={isSubmitting}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-[13px] text-[14px] font-[750] text-white disabled:opacity-60"
            style={{ background: MC.primary }}>
            {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Sending…</>
              : existing ? 'Update this week' : 'Send check-in'}
          </button>
          <p className="text-center text-[11px]" style={{ color: MC.muted }}>
            Only you and your trainer can see this.
          </p>
        </form>
      </Card>
    </Section>
  );
}

function PastRow({ c, last }: { c: MeCheckin; last: boolean }) {
  const bits = [
    c.weight != null ? `${Number(c.weight)} kg` : null,
    c.mood ? MOOD_LABEL[c.mood] : null,
    c.sleep_hours != null ? `${Number(c.sleep_hours)} h sleep` : null,
    c.energy_level != null ? `Energy ${c.energy_level}/10` : null,
  ].filter(Boolean) as string[];
  return (
    <div className="px-4 py-3" style={last ? undefined : { borderBottom: '1px solid var(--border)' }}>
      <p className="text-[12.5px] font-[700]" style={{ color: MC.ink }}>Week of {longDate(c.week_start_date) ?? c.week_start_date}</p>
      {bits.length > 0 && <p className="mt-0.5 text-[12px]" style={{ color: MC.muted }}>{bits.join(' · ')}</p>}
      {c.client_notes && <p className="mt-1 text-[12px] leading-relaxed" style={{ color: MC.muted }}>{c.client_notes}</p>}
    </div>
  );
}
