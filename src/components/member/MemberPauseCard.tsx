'use client';
/**
 * Member — pause card on the renew screen.
 *
 * A pause is a request, not an action: the member picks dates, the trainer
 * confirms them in the back office, and nothing about the plan changes until
 * they do. Keeping the copy in that shape matters — the failure this avoids is
 * a member assuming their plan is already on hold.
 */

import { useState } from 'react';
import { CheckCircle2, Loader2, PauseCircle } from 'lucide-react';
import { Card, MC, Section, longDate } from '@/components/member/MemberUI';
import { DateFieldControl, TextAreaField, useStandaloneField } from '@/components/ui/form';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/forms/errors';
import { rgba } from '@/lib/palette';
import { useToast } from '@/lib/toast';

export default function MemberPauseCard({ requestedAt, onSent }: {
  requestedAt: string | null;
  onSent: () => void;
}) {
  const { toast } = useToast();
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const startField = useStandaloneField('pause-start', start, setStart);
  const endField = useStandaloneField('pause-end', end, setEnd);
  const reasonField = useStandaloneField('pause-reason', reason, setReason);

  const send = async () => {
    if (!start) {
      toast.error('Choose the first day of your pause.');
      return;
    }
    setBusy(true);
    try {
      await api.me.requestPause({
        start_date: start,
        end_date: end || null,
        reason: reason.trim() || null,
      });
      toast.success('Sent — your trainer will confirm');
      onSent();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not send your request. Try again, or message your trainer.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section title="Pause your plan">
      <Card className="p-5">
        {requestedAt ? (
          <div className="flex items-start gap-3" role="status">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full"
              style={{ background: rgba(MC.success, 0.12), color: MC.success }}>
              <CheckCircle2 size={18} aria-hidden />
            </span>
            <div>
              <p className="text-[15px] font-[780]" style={{ color: MC.ink }}>Pause requested</p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed" style={{ color: MC.muted }}>
                Your trainer will confirm the dates. Nothing changes until they do.
              </p>
              <p className="mt-1 text-[11.5px]" style={{ color: MC.muted }}>
                Requested on {longDate(requestedAt)}
              </p>
            </div>
          </div>
        ) : (
          <>
            <p className="text-[12.5px] leading-relaxed" style={{ color: MC.muted }}>
              Travelling or injured? Ask your studio to pause your plan.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <DateFieldControl field={startField} label="From" required />
              <DateFieldControl field={endField} label="Until (optional)" />
            </div>
            <div className="mt-3">
              <TextAreaField field={reasonField} label="Reason (optional)" rows={2} maxLength={300} />
            </div>
            <button type="button" onClick={() => void send()} disabled={busy}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[13px] text-[14px] font-[780] text-white disabled:opacity-60"
              style={{ background: MC.primary }}>
              {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <PauseCircle size={16} aria-hidden />}
              Request pause
            </button>
          </>
        )}
      </Card>
    </Section>
  );
}
