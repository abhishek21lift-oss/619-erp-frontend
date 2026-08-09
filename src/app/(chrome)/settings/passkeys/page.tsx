'use client';
import { useEffect, useState, useRef } from 'react';
import {
  Fingerprint, Plus, Trash2, ShieldCheck, Smartphone, Monitor,
  AlertCircle, Loader2, Pencil, Check, X, ToggleLeft, ToggleRight,
  KeyRound, Laptop, TabletSmartphone,
} from 'lucide-react';
import { useWebAuthn, isWebAuthnSupported, isBiometricAvailable, webAuthnError } from '@/hooks/useWebAuthn';
import Guard from '@/components/Guard';
import { PageTitle } from '@/components/ui';
import { api } from '@/lib/api';

type Credential = {
  id: string;
  device_name: string;
  device_type: string;
  backed_up: boolean;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
};

function DeviceIcon({ type }: { type: string }) {
  const t = (type || '').toLowerCase();
  if (t === 'platform' || t.includes('phone') || t.includes('mobile'))
    return <Smartphone size={17} />;
  if (t.includes('laptop') || t.includes('mac') || t.includes('windows'))
    return <Laptop size={17} />;
  if (t.includes('tablet') || t.includes('ipad'))
    return <TabletSmartphone size={17} />;
  if (t === 'cross-platform')
    return <KeyRound size={17} />;
  return <Monitor size={17} />;
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'Never used';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function PasskeysPage() {
  return (
    <Guard>
      <PageTitle>Passkeys &amp; Biometric Login</PageTitle>
      <PasskeysContent />
    </Guard>
  );
}

function PasskeysContent() {
  const { register, error: hookError, loading: hookLoading, clearError } = useWebAuthn();

  const [supported,    setSupported]    = useState(false);
  const [available,    setAvailable]    = useState(false);
  const [credentials,  setCredentials]  = useState<Credential[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [success,      setSuccess]      = useState('');

  // Add passkey form
  const [showForm,     setShowForm]     = useState(false);
  const [deviceName,   setDeviceName]   = useState('');
  const [registering,  setRegistering]  = useState(false);

  // Rename
  const [renameId,     setRenameId]     = useState<string | null>(null);
  const [renameVal,    setRenameVal]    = useState('');
  const [renaming,     setRenaming]     = useState(false);
  const renameRef = useRef<HTMLInputElement>(null);

  // Actions in flight
  const [deletingId,   setDeletingId]   = useState<string | null>(null);
  const [togglingId,   setTogglingId]   = useState<string | null>(null);

  useEffect(() => {
    setSupported(isWebAuthnSupported());
    if (isWebAuthnSupported()) {
      isBiometricAvailable().then(setAvailable);
    }
  }, []);

  useEffect(() => {
    loadCreds();
  }, []);

  useEffect(() => {
    if (renameId) setTimeout(() => renameRef.current?.focus(), 60);
  }, [renameId]);

  async function loadCreds() {
    setLoading(true);
    try {
      const data = await api.webauthn.listCredentials();
      setCredentials(data.credentials);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load passkeys');
    } finally {
      setLoading(false);
    }
  }

  function showSuccess(msg: string) {
    setSuccess(msg);
    setError('');
    setTimeout(() => setSuccess(''), 4000);
  }

  async function handleRegister() {
    if (!available) return;
    setRegistering(true);
    clearError();
    setError('');
    try {
      let options: Record<string, unknown>;
      try {
        options = await api.webauthn.registerOptions();
      } catch (err: unknown) {
        setError('[Step 1 - server] ' + webAuthnError(err));
        return;
      }

      const { default: doRegister } = await import('@/lib/webauthn-passkey-register');

      let registration: Record<string, unknown>;
      try {
        registration = await doRegister(options);
      } catch (err: unknown) {
        setError('[Step 2 - device] ' + webAuthnError(err));
        return;
      }

      try {
        await api.webauthn.registerVerify({ registration, deviceName: deviceName.trim() || undefined });
      } catch (err: unknown) {
        setError('[Step 3 - verify] ' + webAuthnError(err));
        return;
      }

      showSuccess('Passkey registered successfully!');
      setDeviceName('');
      setShowForm(false);
      loadCreds();
    } finally {
      setRegistering(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setError('');
    try {
      await api.webauthn.deleteCredential(id);
      setCredentials(prev => prev.filter(c => c.id !== id));
      showSuccess('Passkey removed.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to remove passkey');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleToggle(cred: Credential) {
    setTogglingId(cred.id);
    setError('');
    try {
      const result = await api.webauthn.toggleCredential(cred.id);
      setCredentials(prev => prev.map(c => c.id === cred.id ? { ...c, is_active: result.is_active } : c));
      showSuccess(result.is_active ? 'Passkey enabled.' : 'Passkey disabled.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update passkey');
    } finally {
      setTogglingId(null);
    }
  }

  function startRename(cred: Credential) {
    setRenameId(cred.id);
    setRenameVal(cred.device_name);
  }

  async function commitRename() {
    if (!renameId || !renameVal.trim()) { setRenameId(null); return; }
    setRenaming(true);
    setError('');
    try {
      await api.webauthn.renameCredential(renameId, renameVal.trim());
      setCredentials(prev => prev.map(c => c.id === renameId ? { ...c, device_name: renameVal.trim() } : c));
      setRenameId(null);
      showSuccess('Passkey renamed.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to rename passkey');
    } finally {
      setRenaming(false);
    }
  }

  const activeCount   = credentials.filter(c => c.is_active).length;
  const disabledCount = credentials.filter(c => !c.is_active).length;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg,#0067E0,#0059CE)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 20px rgba(0,103,224,0.35)',
          }}>
            <Fingerprint size={24} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 760, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Biometric Login
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
              Sign in with fingerprint, Face ID, or Windows Hello — no password needed.
            </p>
          </div>
        </div>
        {supported && available && !showForm && (
          <button
            onClick={() => { setShowForm(true); setError(''); clearError(); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '9px 18px', borderRadius: 11, fontSize: 13, fontWeight: 660,
              background: 'linear-gradient(135deg,#0067E0,#0059CE)',
              color: '#fff', border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0,103,224,0.35)',
              transition: 'opacity 150ms',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <Plus size={15} /> Add New Passkey
          </button>
        )}
      </div>

      {/* Stats bar */}
      {credentials.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
          {[
            { label: 'Total', val: credentials.length, color: '#0067E0' },
            { label: 'Active', val: activeCount, color: '#10b981' },
            ...(disabledCount > 0 ? [{ label: 'Disabled', val: disabledCount, color: '#f59e0b' }] : []),
          ].map(s => (
            <div key={s.label} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 20,
              background: `${s.color}12`,
              border: `1px solid ${s.color}22`,
              fontSize: 12, fontWeight: 660, color: s.color,
            }}>
              <span style={{ fontWeight: 800, fontSize: 15 }}>{s.val}</span>
              {s.label}
            </div>
          ))}
        </div>
      )}

      {/* Success / Error banners */}
      {success && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '11px 16px', borderRadius: 12, marginBottom: 16,
          background: 'rgba(16,185,129,0.09)', border: '1px solid rgba(16,185,129,0.28)',
          color: '#10b981', fontSize: 13, fontWeight: 600,
        }}>
          <ShieldCheck size={16} /> {success}
        </div>
      )}
      {(error || hookError) && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '11px 16px', borderRadius: 12, marginBottom: 16,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.24)',
          color: '#f87171', fontSize: 13, fontWeight: 600,
        }}>
          <AlertCircle size={16} /> {error || hookError}
        </div>
      )}

      {/* Browser not supported */}
      {!supported && (
        <div style={{
          padding: '20px 24px', borderRadius: 16, marginBottom: 20,
          background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)',
        }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#fbbf24', marginBottom: 6 }}>
            Passkeys not supported
          </p>
          <p style={{ fontSize: 13, color: 'rgba(251,191,36,0.75)', lineHeight: 1.6 }}>
            Your browser or device does not support WebAuthn / Passkeys.
            Use Chrome 108+, Safari 16+, Firefox 119+, or Edge 108+ on a device with a biometric sensor.
          </p>
        </div>
      )}

      {/* No biometric sensor */}
      {supported && !available && (
        <div style={{
          padding: '20px 24px', borderRadius: 16, marginBottom: 20,
          background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)',
        }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#fbbf24', marginBottom: 6 }}>
            No biometric sensor detected
          </p>
          <p style={{ fontSize: 13, color: 'rgba(251,191,36,0.75)', lineHeight: 1.6 }}>
            A fingerprint sensor, Face ID, or Windows Hello is required to register a passkey.
            Security keys (USB / NFC) are also supported.
          </p>
        </div>
      )}

      {/* Add passkey form */}
      {showForm && supported && available && (
        <div style={{
          padding: '22px 24px', borderRadius: 18, marginBottom: 20,
          background: 'var(--bg-card)', border: '1px solid rgba(0,103,224,0.28)',
          boxShadow: '0 4px 24px rgba(0,103,224,0.10)',
        }}>
          <p style={{ fontSize: 15, fontWeight: 720, color: 'var(--text-primary)', marginBottom: 4 }}>
            Register a new passkey
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
            Give this device a name so you can identify it later.
            Your browser will prompt you to use your fingerprint, Face ID, or Windows Hello.
          </p>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <input
              value={deviceName}
              onChange={e => setDeviceName(e.target.value)}
              placeholder="e.g. iPhone 15, MacBook, Work PC…"
              disabled={registering}
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 10, fontSize: 14,
                background: 'var(--bg-subtle)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit',
              }}
              onKeyDown={e => e.key === 'Enter' && handleRegister()}
            />
            <button
              onClick={handleRegister}
              disabled={registering || hookLoading}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 660,
                background: 'linear-gradient(135deg,#0067E0,#0059CE)',
                color: '#fff', border: 'none',
                cursor: registering ? 'not-allowed' : 'pointer',
                opacity: registering ? 0.7 : 1,
              }}
            >
              {registering
                ? <><Loader2 size={14} className="animate-spin" /> Waiting…</>
                : <><Fingerprint size={14} /> Register</>}
            </button>
            <button
              onClick={() => { setShowForm(false); clearError(); setError(''); }}
              disabled={registering}
              style={{
                padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                background: 'transparent', border: '1px solid var(--border)',
                color: 'var(--text-muted)', cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
          <p style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Your biometric data stays on your device — we only store a cryptographic public key.
          </p>
        </div>
      )}

      {/* Credential list */}
      <div style={{
        borderRadius: 18, border: '1px solid var(--border)',
        background: 'var(--bg-card)', overflow: 'hidden',
        boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
        marginBottom: 24,
      }}>
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(0,0,0,0.015)',
        }}>
          <span style={{ fontSize: 13, fontWeight: 660, color: 'var(--text-secondary)' }}>
            Registered passkeys
          </span>
          <span style={{
            fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
            background: 'rgba(0,103,224,0.10)', color: '#0067E0',
          }}>
            {credentials.length}
          </span>
        </div>

        {loading ? (
          <div style={{ padding: 48, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, color: 'var(--text-muted)' }}>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 13 }}>Loading passkeys…</span>
          </div>
        ) : credentials.length === 0 ? (
          <div style={{ padding: '44px 24px', textAlign: 'center' }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, margin: '0 auto 16px',
              background: 'rgba(0,103,224,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Fingerprint size={24} style={{ color: '#0067E0', opacity: 0.5 }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 680, color: 'var(--text-secondary)', marginBottom: 6 }}>
              No passkeys registered
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
              Add a passkey to sign in instantly with your fingerprint, Face ID, or Windows Hello —
              no password needed.
            </p>
            {supported && available && (
              <button
                onClick={() => { setShowForm(true); setError(''); }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  padding: '10px 20px', borderRadius: 11, fontSize: 13, fontWeight: 660,
                  background: 'linear-gradient(135deg,#0067E0,#0059CE)',
                  color: '#fff', border: 'none', cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(0,103,224,0.3)',
                }}
              >
                <Plus size={15} /> Add Your First Passkey
              </button>
            )}
          </div>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {credentials.map((cred, i) => (
              <li
                key={cred.id}
                style={{
                  padding: '16px 20px',
                  borderBottom: i < credentials.length - 1 ? '1px solid var(--border)' : 'none',
                  opacity: cred.is_active ? 1 : 0.6,
                  transition: 'opacity 200ms',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  {/* Icon */}
                  <div style={{
                    width: 42, height: 42, borderRadius: 11, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: cred.is_active ? 'rgba(0,103,224,0.10)' : 'rgba(0,0,0,0.05)',
                    border: `1px solid ${cred.is_active ? 'rgba(0,103,224,0.2)' : 'rgba(0,0,0,0.08)'}`,
                    color: cred.is_active ? '#0067E0' : '#94a3b8',
                  }}>
                    <DeviceIcon type={cred.device_type} />
                  </div>

                  {/* Name & meta */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {renameId === cred.id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <input
                          ref={renameRef}
                          value={renameVal}
                          onChange={e => setRenameVal(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenameId(null); }}
                          style={{
                            padding: '5px 10px', borderRadius: 8, fontSize: 13,
                            background: 'var(--bg-subtle)', border: '1.5px solid rgba(0,103,224,0.4)',
                            color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit',
                            maxWidth: 200,
                          }}
                        />
                        <button
                          onClick={commitRename}
                          disabled={renaming}
                          style={{ width: 28, height: 28, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981', cursor: 'pointer' }}
                        >
                          {renaming ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                        </button>
                        <button
                          onClick={() => setRenameId(null)}
                          style={{ width: 28, height: 28, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer' }}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 14, fontWeight: 660, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {cred.device_name}
                        </span>
                        {!cred.is_active && (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)', flexShrink: 0 }}>
                            Disabled
                          </span>
                        )}
                        {cred.backed_up && (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: 'rgba(16,185,129,0.10)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)', flexShrink: 0 }}>
                            Synced
                          </span>
                        )}
                      </div>
                    )}
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span>Added {new Date(cred.created_at).toLocaleDateString()}</span>
                      <span>·</span>
                      <span>Last used {timeAgo(cred.last_used_at)}</span>
                      {cred.device_type && cred.device_type !== 'unknown' && (
                        <><span>·</span><span style={{ textTransform: 'capitalize' }}>{cred.device_type}</span></>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {/* Rename */}
                    {renameId !== cred.id && (
                      <button
                        onClick={() => startRename(cred)}
                        title="Rename"
                        style={{
                          width: 32, height: 32, borderRadius: 8,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'transparent', border: '1px solid transparent',
                          color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'rgba(0,103,224,0.08)';
                          e.currentTarget.style.borderColor = 'rgba(0,103,224,0.2)';
                          e.currentTarget.style.color = '#0067e0';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.borderColor = 'transparent';
                          e.currentTarget.style.color = 'var(--text-muted)';
                        }}
                      >
                        <Pencil size={13} />
                      </button>
                    )}

                    {/* Enable / Disable toggle */}
                    <button
                      onClick={() => handleToggle(cred)}
                      disabled={togglingId === cred.id}
                      title={cred.is_active ? 'Disable passkey' : 'Enable passkey'}
                      style={{
                        width: 32, height: 32, borderRadius: 8,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: cred.is_active ? 'rgba(16,185,129,0.10)' : 'rgba(245,158,11,0.10)',
                        border: `1px solid ${cred.is_active ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
                        color: cred.is_active ? '#10b981' : '#f59e0b',
                        cursor: togglingId === cred.id ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {togglingId === cred.id
                        ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                        : cred.is_active ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(cred.id)}
                      disabled={deletingId === cred.id}
                      title="Remove passkey"
                      style={{
                        width: 32, height: 32, borderRadius: 8,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'transparent', border: '1px solid transparent',
                        color: 'var(--text-muted)', cursor: deletingId === cred.id ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(239,68,68,0.08)';
                        e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)';
                        e.currentTarget.style.color = '#f87171';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.borderColor = 'transparent';
                        e.currentTarget.style.color = 'var(--text-muted)';
                      }}
                    >
                      {deletingId === cred.id
                        ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                        : <Trash2 size={13} />}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Security info */}
      <div style={{
        padding: '18px 22px', borderRadius: 16,
        background: 'rgba(0,103,224,0.04)',
        border: '1px solid rgba(0,103,224,0.14)',
      }}>
        <p style={{ fontSize: 13, fontWeight: 680, color: 'var(--text-secondary)', marginBottom: 8 }}>
          How passkeys work
        </p>
        <ul style={{ paddingLeft: 18, margin: 0, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.85 }}>
          <li>Your fingerprint or Face ID <strong>never leaves your device</strong> — it stays in your device&apos;s secure enclave.</li>
          <li>We store only a cryptographic public key — it is mathematically impossible to recover biometrics from it.</li>
          <li>Works with <strong>Touch ID / Face ID</strong> (iPhone/Mac), <strong>Windows Hello</strong> (PC), <strong>Android Biometrics</strong>, and FIDO2 security keys.</li>
          <li>Add multiple devices — each has its own key that can be renamed, disabled, or revoked independently.</li>
          <li>Disabled passkeys cannot be used to sign in but remain registered so you can re-enable them.</li>
        </ul>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
