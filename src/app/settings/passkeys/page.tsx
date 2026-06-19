'use client';
import { useEffect, useState } from 'react';
import { Fingerprint, Plus, Trash2, ShieldCheck, Smartphone, Monitor, AlertCircle, Loader2 } from 'lucide-react';
import { useWebAuthn } from '@/hooks/useWebAuthn';
import type { PasskeyCredential } from '@/hooks/useWebAuthn';

function DeviceIcon({ type }: { type: string }) {
  const isMobile = type === 'singleDevice' || type?.toLowerCase().includes('phone') || type?.toLowerCase().includes('mobile');
  return isMobile
    ? <Smartphone size={16} style={{ color: 'var(--brand)' }} />
    : <Monitor      size={16} style={{ color: 'var(--brand)' }} />;
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return 'Just now';
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30)  return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function PasskeysPage() {
  const {
    supported, available, loading, error, credentials,
    register, loadCredentials, removeCredential, clearError,
  } = useWebAuthn();

  const [registering,  setRegistering]  = useState(false);
  const [deviceName,   setDeviceName]   = useState('');
  const [showForm,     setShowForm]     = useState(false);
  const [deleteId,     setDeleteId]     = useState<string | null>(null);
  const [successMsg,   setSuccessMsg]   = useState('');

  useEffect(() => { loadCredentials(); }, [loadCredentials]);

  async function handleRegister() {
    setRegistering(true);
    const ok = await register(deviceName.trim() || undefined);
    setRegistering(false);
    if (ok) {
      setDeviceName('');
      setShowForm(false);
      setSuccessMsg('Passkey registered successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
      loadCredentials();
    }
  }

  async function handleDelete(cred: PasskeyCredential) {
    setDeleteId(cred.id);
    await removeCredential(cred.id);
    setDeleteId(null);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-6 px-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
          }}>
            <Fingerprint size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Passkeys</h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
              Sign in with your fingerprint or Face ID — no password needed.
            </p>
          </div>
        </div>
        {supported && available && (
          <button
            onClick={() => { setShowForm(true); clearError(); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
              color: '#fff', border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(124,58,237,0.3)',
            }}
          >
            <Plus size={15} /> Add Passkey
          </button>
        )}
      </div>

      {/* Success banner */}
      {successMsg && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
          borderRadius: 12, background: 'rgba(34,197,94,0.10)',
          border: '1px solid rgba(34,197,94,0.3)', color: '#4ADE80',
          fontSize: 13, fontWeight: 600,
        }}>
          <ShieldCheck size={16} /> {successMsg}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
          borderRadius: 12, background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.25)', color: '#F87171',
          fontSize: 13, fontWeight: 600,
        }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Not supported warning */}
      {!supported && (
        <div style={{
          padding: '20px 24px', borderRadius: 16,
          background: 'rgba(245,158,11,0.06)',
          border: '1px solid rgba(245,158,11,0.2)',
        }}>
          <p style={{ fontSize: 14, color: '#FCD34D', fontWeight: 600, marginBottom: 6 }}>
            Passkeys not supported
          </p>
          <p style={{ fontSize: 13, color: 'rgba(252,211,77,0.7)' }}>
            Your browser or device does not support WebAuthn / Passkeys.
            Please use Chrome 108+, Safari 16+, or Edge 108+ on a device with biometric authentication.
          </p>
        </div>
      )}

      {/* Platform not available */}
      {supported && !available && (
        <div style={{
          padding: '20px 24px', borderRadius: 16,
          background: 'rgba(245,158,11,0.06)',
          border: '1px solid rgba(245,158,11,0.2)',
        }}>
          <p style={{ fontSize: 14, color: '#FCD34D', fontWeight: 600, marginBottom: 6 }}>
            No biometric sensor detected
          </p>
          <p style={{ fontSize: 13, color: 'rgba(252,211,77,0.7)' }}>
            Your device needs a fingerprint sensor, Face ID, or Windows Hello to use passkeys.
          </p>
        </div>
      )}

      {/* Registration form */}
      {showForm && supported && available && (
        <div style={{
          padding: '20px 24px', borderRadius: 16,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-card)',
        }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
            Register a new passkey
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            Give this device a name so you can identify it later.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="e.g. iPhone 15, Work Mac…"
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 10, fontSize: 14,
                background: 'var(--bg-subtle)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', outline: 'none',
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
            />
            <button
              onClick={handleRegister}
              disabled={registering || loading}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
                color: '#fff', border: 'none',
                cursor: registering ? 'not-allowed' : 'pointer',
                opacity: registering ? 0.7 : 1,
              }}
            >
              {registering ? <Loader2 size={15} className="animate-spin" /> : <Fingerprint size={15} />}
              {registering ? 'Touch sensor…' : 'Register'}
            </button>
            <button
              onClick={() => { setShowForm(false); clearError(); }}
              style={{
                padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                background: 'transparent', border: '1px solid var(--border)',
                color: 'var(--text-muted)', cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>
            Your device will ask for fingerprint, Face ID, or PIN confirmation.
            The biometric data stays on your device — only a cryptographic key is saved here.
          </p>
        </div>
      )}

      {/* Credential list */}
      <div style={{
        borderRadius: 16, border: '1px solid var(--border)',
        background: 'var(--bg-card)',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
            Registered passkeys
          </span>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
            background: 'var(--bg-subtle)', color: 'var(--text-muted)',
          }}>
            {credentials.length}
          </span>
        </div>

        {loading && credentials.length === 0 ? (
          <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }} />
          </div>
        ) : credentials.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <Fingerprint size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
              No passkeys yet
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Add a passkey to sign in without a password.
            </p>
          </div>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {credentials.map((cred, i) => (
              <li
                key={cred.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 20px',
                  borderBottom: i < credentials.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(124,58,237,0.10)',
                  border: '1px solid rgba(124,58,237,0.2)',
                }}>
                  <DeviceIcon type={cred.device_type} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cred.device_name}
                    </span>
                    {cred.backed_up && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                        background: 'rgba(34,197,94,0.10)', color: '#4ADE80',
                        border: '1px solid rgba(34,197,94,0.25)',
                      }}>
                        Synced
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 10 }}>
                    <span>Added {new Date(cred.created_at).toLocaleDateString()}</span>
                    <span>·</span>
                    <span>Last used {timeAgo(cred.last_used_at)}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(cred)}
                  disabled={deleteId === cred.id}
                  style={{
                    width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'transparent', border: '1px solid transparent',
                    color: 'var(--text-muted)', cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.25)';
                    (e.currentTarget as HTMLButtonElement).style.color = '#F87171';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent';
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
                  }}
                  aria-label={`Remove ${cred.device_name}`}
                >
                  {deleteId === cred.id
                    ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                    : <Trash2 size={15} />
                  }
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Info box */}
      <div style={{
        padding: '16px 20px', borderRadius: 14,
        background: 'rgba(124,58,237,0.04)',
        border: '1px solid rgba(124,58,237,0.15)',
      }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
          How passkeys work
        </p>
        <ul style={{ paddingLeft: 18, margin: 0, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.8 }}>
          <li>Your fingerprint or Face ID stays on your device — it is never sent to our servers.</li>
          <li>We store only a cryptographic public key — mathematically impossible to recover biometrics from it.</li>
          <li>Works on Android (fingerprint), iPhone (Touch ID / Face ID), Windows Hello, and Mac Touch ID.</li>
          <li>Add multiple devices — each has its own key that can be revoked independently.</li>
        </ul>
      </div>
    </div>
  );
}
