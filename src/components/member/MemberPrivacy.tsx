'use client';
/**
 * Member — privacy and data, on the account screen.
 *
 * Two things a member owns: a copy of everything the studio holds, and the
 * right to ask for it to be erased. Both are deliberately quiet — the export is
 * a plain link the browser downloads, and deletion is a request to the studio,
 * not a button that destroys the account the moment it is tapped.
 *
 * The deletion read is kept separate from the export row: if it fails, the
 * member can still download their data, and the action is hidden rather than
 * shown in a state that might already be wrong.
 */

import { useEffect, useState } from 'react';
import { AlertTriangle, Download, Loader2, ShieldCheck } from 'lucide-react';
import { Card, MC, Section, longDate } from '@/components/member/MemberUI';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/forms/errors';
import { rgba } from '@/lib/palette';
import { useToast } from '@/lib/toast';

export default function MemberPrivacy() {
  const { toast } = useToast();
  const [requestedAt, setRequestedAt] = useState<string | null>(null);
  const [readFailed, setReadFailed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    api.me.deletion()
      .then((r) => { if (live) setRequestedAt(r.data.requested_at); })
      .catch(() => { if (live) setReadFailed(true); });
    return () => { live = false; };
  }, []);

  const ask = async () => {
    setBusy(true);
    try {
      await api.me.requestDeletion();
      setRequestedAt(new Date().toISOString());
      setConfirming(false);
      toast.success('Sent — your studio will be in touch');
    } catch (err) {
      toast.error(errorMessage(err, 'Could not send your request. Try again, or message your trainer.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section title="Privacy and data">
      <Card>
        <a href={api.me.exportUrl()} download aria-label="Download my data"
          className="flex min-h-[56px] items-center gap-3 px-4 py-3"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px]"
            style={{ background: rgba(MC.primary, 0.1), color: MC.primary }}>
            <Download size={16} aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-[14px] font-[750]" style={{ color: MC.ink }}>Download my data</span>
            <span className="block text-[12px]" style={{ color: MC.muted }}>
              A JSON copy of your profile, plan and records
            </span>
          </span>
        </a>

        {requestedAt ? (
          <div className="flex min-h-[56px] items-start gap-3 px-4 py-3" role="status">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px]"
              style={{ background: rgba(MC.success, 0.12), color: MC.success }}>
              <ShieldCheck size={16} aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-[14px] font-[750]" style={{ color: MC.ink }}>Deletion requested</span>
              <span className="block text-[12px]" style={{ color: MC.muted }}>
                Requested on {longDate(requestedAt)} · your studio will process it.
              </span>
            </span>
          </div>
        ) : readFailed ? null : confirming ? (
          <div className="px-4 py-3">
            <p className="text-[12.5px] leading-relaxed" style={{ color: MC.muted }}>
              This asks your studio to delete your account and training history. It does not happen immediately.
            </p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => void ask()} disabled={busy}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[12px] text-[13px] font-[780] text-white disabled:opacity-60"
                style={{ background: MC.danger }}>
                {busy && <Loader2 size={14} className="animate-spin" aria-hidden />}
                Yes, request deletion
              </button>
              <button type="button" onClick={() => setConfirming(false)} disabled={busy}
                className="h-11 flex-1 rounded-[12px] text-[13px] font-[750] disabled:opacity-60"
                style={{ background: 'var(--bg-subtle)', color: MC.ink }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} aria-label="Request account deletion"
            className="flex min-h-[56px] w-full items-center gap-3 px-4 py-3 text-left">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px]"
              style={{ background: rgba(MC.danger, 0.1), color: MC.danger }}>
              <AlertTriangle size={16} aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-[14px] font-[750]" style={{ color: MC.ink }}>Request account deletion</span>
              <span className="block text-[12px]" style={{ color: MC.muted }}>
                Your studio deletes the account and its records
              </span>
            </span>
          </button>
        )}
      </Card>
    </Section>
  );
}
