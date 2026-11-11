'use client';

import { useCallback, useEffect, useState } from 'react';
import { Fingerprint } from 'lucide-react';
import { api } from '@/lib/api';

// The member's own Android biometric sign-ins, with a revoke action. This is
// deliberately available in a plain browser too: the common case is a lost or
// replaced phone, where the member is on a new device and the old credential
// must be turned off. Rendering null when there are no native rows leaves the
// page unchanged for everyone else.

type CredentialRow = {
  id: string;
  credential_id: string;
  device_name: string;
  device_type: string;
  created_at: string;
  last_used_at: string | null;
};

function when(iso: string | null): string {
  if (!iso) return 'Never used';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function MemberNativeDevices() {
  const [rows, setRows] = useState<CredentialRow[] | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { credentials } = await api.webauthn.listCredentials();
    setRows(credentials.filter((c) => c.device_type === 'android_native'));
  }, []);

  useEffect(() => {
    load().catch(() => setRows([]));
  }, [load]);

  async function revoke(id: string) {
    setBusyId(id);
    setError('');
    try {
      await api.webauthn.deleteCredential(id);
      setRows((current) => (current ? current.filter((r) => r.id !== id) : current));
      setConfirmId(null);
    } catch {
      setError('Could not revoke this device. Try again.');
    } finally {
      setBusyId(null);
    }
  }

  if (!rows || rows.length === 0) return null;

  return (
    <div
      className="rounded-[16px] px-4"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      {error && (
        <p role="alert" className="pt-3 text-[12.5px] font-[600]" style={{ color: 'var(--danger-text)' }}>
          {error}
        </p>
      )}
      {rows.map((row, i) => (
        <div
          key={row.id}
          className="flex min-h-[60px] items-center gap-3 py-3"
          style={i === rows.length - 1 ? undefined : { borderBottom: '1px solid var(--border)' }}
        >
          <Fingerprint size={17} aria-hidden className="shrink-0" style={{ color: 'var(--brand)' }} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-[700]" style={{ color: 'var(--text-primary)' }}>
              {row.device_name}
            </p>
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              Added {when(row.created_at)} · Last used {when(row.last_used_at)}
            </p>
          </div>
          {confirmId === row.id ? (
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                disabled={busyId === row.id}
                onClick={() => void revoke(row.id)}
                className="min-h-[40px] rounded-[12px] px-3 text-[13px] font-[750] text-white disabled:opacity-50"
                style={{ background: 'var(--danger-text)' }}
              >
                Confirm
              </button>
              <button
                type="button"
                disabled={busyId === row.id}
                onClick={() => setConfirmId(null)}
                className="min-h-[40px] rounded-[12px] px-3 text-[13px] font-[700] disabled:opacity-50"
                style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={busyId === row.id}
              onClick={() => setConfirmId(row.id)}
              className="min-h-[40px] shrink-0 rounded-[12px] px-3 text-[13px] font-[750] disabled:opacity-50"
              style={{ background: 'var(--bg-subtle)', color: 'var(--danger-text)' }}
            >
              Revoke
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
