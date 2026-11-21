'use client';

// The reason step before entering a studio.
//
// Impersonation used to be one click. That produced an audit row saying WHO
// and WHEN but never WHY, which is the question an incident review actually
// asks, and it made "full access" a single un-guarded button. The reason is
// now required by the API (400 REASON_REQUIRED) and this dialog is the only
// place the console can supply it.
//
// Full access gets its own confirmation copy: it is the mode in which the
// operator can change a studio's live data as its trainer, and the dialog is
// where that has to be legible before the click.

import { useEffect, useRef, useState } from 'react';
import { Eye, LogIn, Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui';
import { FormField, TextArea } from '@/components/ui/form';
import { Modal } from '@/app/(platform)/platform/_shared/ui';

const MIN = 3;
const MAX = 500;

export default function ImpersonationStartModal({
  orgName, mode, accountName, onClose, onConfirm,
}: {
  orgName: string;
  mode: 'read_only' | 'full';
  accountName?: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void> | void;
}) {
  const [reason, setReason] = useState('');
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const [busy, setBusy] = useState(false);
  const trimmed = reason.trim();
  const valid = trimmed.length >= MIN && trimmed.length <= MAX;
  const full = mode === 'full';

  // Focused on open, but through an effect rather than `autoFocus`: the lint
  // rule is right that the attribute steals focus on render, and this dialog
  // is the only thing on screen when it mounts anyway.
  useEffect(() => { reasonRef.current?.focus(); }, []);

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    try {
      await onConfirm(trimmed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={full ? 'Enter with full access' : 'View this studio'}
      onClose={onClose}
      dirty={reason.length > 0 && !busy}
      discardMessage="Discard the reason you entered?"
    >
      <div className="space-y-4">
        <div
          className="flex items-start gap-3 rounded-[14px] p-3"
          style={{
            background: full ? 'rgba(220,38,38,0.08)' : 'rgba(163,55,87,0.07)',
            border: `1px solid ${full ? 'rgba(220,38,38,0.22)' : 'rgba(163,55,87,0.18)'}`,
          }}
        >
          {full ? <ShieldAlert size={18} className="mt-0.5 shrink-0" style={{ color: '#dc2626' }} />
            : <Eye size={18} className="mt-0.5 shrink-0" style={{ color: '#A33757' }} />}
          <div className="min-w-0 text-[12.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <p className="font-[750]" style={{ color: 'var(--text-primary)' }}>
              {full ? `You can change ${orgName}'s live data.` : `Read-only view of ${orgName}.`}
            </p>
            <p className="mt-1">
              {full
                ? 'Every write is recorded against you — in the studio activity log and in this session’s action trail. Use it only when a support task needs it.'
                : 'The studio renders as its trainer. Every change is refused by the server until you switch to full access.'}
            </p>
            {accountName && <p className="mt-1">Acting as: <span className="font-[700]">{accountName}</span></p>}
          </div>
        </div>

        <FormField
          label="Reason for entering"
          description={`Stored with the session and shown to other operators. ${trimmed.length}/${MAX}`}
        >
          <TextArea
            ref={reasonRef}
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, MAX))}
            rows={3}
            placeholder={full ? 'e.g. Fixing a client’s broken subscription after ticket #482' : 'e.g. Reproducing the revenue report bug from ticket #482'}
          />
        </FormField>

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button
            type="button"
            variant={full ? 'danger' : 'primary'}
            onClick={submit}
            disabled={!valid || busy}
            iconLeft={busy ? <Loader2 size={14} className="animate-spin" /> : full ? <LogIn size={14} /> : <Eye size={14} />}
          >
            {full ? 'Enter with full access' : 'Enter studio'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
