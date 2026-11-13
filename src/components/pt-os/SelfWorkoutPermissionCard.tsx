'use client';

// The trainer's permission for a client to train without them.
//
// It is its own route on the server (PATCH /clients/:id/self-workout) so the
// change has its own audit entry. Revoking never touches a session the client
// already started: they can always finish and submit it.

import { useState } from 'react';
import { Dumbbell } from 'lucide-react';
import { api as defaultApi } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { errorMessage } from '@/lib/forms/errors';

type PermissionApi = {
  setSelfWorkout: (id: string, allow: boolean) => Promise<unknown>;
};

export default function SelfWorkoutPermissionCard({ clientId, initial, api = defaultApi.pt }: {
  clientId: string;
  initial: boolean;
  /** Injected in tests; the real client talks to `api.pt`. */
  api?: PermissionApi;
}) {
  const { toast } = useToast();
  const [allow, setAllow] = useState(initial);
  const [saving, setSaving] = useState(false);

  const toggle = async () => {
    if (saving) return;
    const next = !allow;
    setAllow(next);
    setSaving(true);
    try {
      await api.setSelfWorkout(clientId, next);
      toast.success(next ? 'Self workouts enabled.' : 'Self workouts disabled.');
    } catch (err) {
      setAllow(!next);
      toast.error(errorMessage(err, 'Could not change the permission.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-[18px] p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-[14px] font-[800]" style={{ color: 'var(--text-primary)' }}>
            <Dumbbell size={16} aria-hidden /> Self workouts
          </h3>
          <p className="mt-1 text-[12px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {allow
              ? 'This client can start and log a workout without you.'
              : 'This client cannot start a workout without you.'}
            {' '}Turning it off does not cancel a workout they already started.
          </p>
        </div>
        <button type="button" role="switch" aria-checked={allow} aria-label="Allow self workout"
          disabled={saving} onClick={() => void toggle()}
          className="grid min-h-[44px] min-w-[52px] shrink-0 place-items-center disabled:opacity-60">
          <span aria-hidden className="relative h-[28px] w-[48px] rounded-full transition-colors"
            style={{ background: allow ? 'var(--success-text)' : 'var(--border)' }}>
            <span className="absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow transition-all"
              style={{ left: allow ? 23 : 3 }} />
          </span>
        </button>
      </div>
    </section>
  );
}
