'use client';
import { useEffect, useState, useCallback } from 'react';
import { Fingerprint, ShieldCheck, ShieldAlert, Users, Activity, Trash2, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { roleLabel } from '@/lib/roles';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';

// ── Types ──────────────────────────────────────────────────────────────────────

type Stats = {
  totalCredentials: number;
  enrolledUsers: number;
  loginsLast24h: number;
  failedAttemptsLast24h: number;
};

type AdminCred = {
  id: string;
  device_name: string;
  device_type: string;
  backed_up: boolean;
  created_at: string;
  last_used_at: string | null;
  user_id: string;
  user_name: string;
  user_email: string;
  role: string;
};

type AuditLog = {
  id: string;
  event: string;
  detail: Record<string, unknown>;
  ip: string | null;
  created_at: string;
  user_name: string | null;
  user_email: string | null;
  role: string | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

const EVENT_COLORS: Record<string, string> = {
  webauthn_login_success: '#34D399',
  webauthn_registered:    '#0067E0',
  action_verified:        '#7FB4FF',
  webauthn_login_failed:  '#F87171',
  action_verify_failed:   '#F87171',
  webauthn_register_failed: '#FBBF24',
  admin_passkey_revoked:  '#F87171',
  passkey_removed:        '#FBBF24',
};

function eventColor(event: string): string {
  return EVENT_COLORS[event] ?? '#94A3B8';
}

function eventLabel(event: string): string {
  return event.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: React.ElementType; color: string }) {
  return (
    <div style={{
      padding: '20px 24px', borderRadius: 16,
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      boxShadow: 'var(--shadow-card)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {label}
        </span>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: `${color}18`, border: `1px solid ${color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={16} style={{ color }} />
        </div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
        {value}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function BiometricAdminPage() {
  return (
    <Guard roles={['admin', 'manager']}>
      <AppShell>
        <BiometricInner />
      </AppShell>
    </Guard>
  );
}

function BiometricInner() {
  const [stats,     setStats]     = useState<Stats | null>(null);
  const [creds,     setCreds]     = useState<AdminCred[]>([]);
  const [logs,      setLogs]      = useState<AuditLog[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [revoking,  setRevoking]  = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'credentials' | 'logs'>('credentials');

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [s, c, l] = await Promise.all([
        api.webauthn.adminStats(),
        api.webauthn.adminCredentials(),
        api.webauthn.adminAuditLogs(200),
      ]);
      setStats(s);
      setCreds(c.credentials);
      setLogs(l.logs);
    } catch (e: unknown) {
      setError((e as Error).message || 'Failed to load biometric data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function handleRevoke(credId: string) {
    setRevoking(credId);
    try {
      await api.webauthn.adminRevokeCredential(credId);
      setCreds((prev) => prev.filter((c) => c.id !== credId));
      setStats((prev) => prev ? { ...prev, totalCredentials: prev.totalCredentials - 1 } : prev);
    } catch (e: unknown) {
      setError((e as Error).message || 'Revoke failed');
    } finally {
      setRevoking(null);
    }
  }

  return (
    <div className="space-y-6 py-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, #EF4444, #DC2626)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(220,38,38,0.3)',
          }}>
            <Fingerprint size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
              Biometric Security
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
              Manage passkeys, view authentication activity and audit logs
            </p>
          </div>
        </div>
        <button
          onClick={loadAll}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            background: 'var(--bg-subtle)', border: '1px solid var(--border)',
            color: 'var(--text-secondary)', cursor: 'pointer',
          }}
        >
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
          borderRadius: 12, background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.25)', color: '#F87171', fontSize: 13,
        }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Stats */}
      {loading && !stats ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ height: 100, borderRadius: 16, background: 'var(--bg-subtle)', animation: 'pulse 1.5s ease infinite' }} />
          ))}
        </div>
      ) : stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          <StatCard label="Total Passkeys"     value={stats.totalCredentials}    icon={Fingerprint}  color="#7FB4FF" />
          <StatCard label="Enrolled Users"     value={stats.enrolledUsers}       icon={Users}        color="#0067E0" />
          <StatCard label="Logins (24h)"       value={stats.loginsLast24h}       icon={ShieldCheck}  color="#34D399" />
          <StatCard label="Failed (24h)"       value={stats.failedAttemptsLast24h} icon={ShieldAlert} color="#F87171" />
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {(['credentials', 'logs'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 16px', fontSize: 13, fontWeight: 600,
              background: 'transparent', border: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--brand)' : '2px solid transparent',
              color: activeTab === tab ? 'var(--brand)' : 'var(--text-muted)',
              cursor: 'pointer', marginBottom: -1, transition: 'color 0.15s',
              textTransform: 'capitalize',
            }}
          >
            {tab === 'credentials' ? `Passkeys (${creds.length})` : `Audit Log (${logs.length})`}
          </button>
        ))}
      </div>

      {/* Credentials tab */}
      {activeTab === 'credentials' && (
        <div style={{ borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden', background: 'var(--bg-card)' }}>
          {loading ? (
            <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
              <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }} />
            </div>
          ) : creds.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <Fingerprint size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No passkeys registered yet.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)' }}>
                  {['User', 'Device', 'Type', 'Last Used', 'Added', 'Action'].map((h) => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {creds.map((c, i) => (
                  <tr key={c.id} style={{ borderBottom: i < creds.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.user_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.user_email}</div>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 500 }}>
                      {c.device_name}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
                        background: 'var(--bg-subtle)', color: 'var(--text-muted)',
                        border: '1px solid var(--border)',
                      }}>
                        {c.device_type}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                      {timeAgo(c.last_used_at)}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        onClick={() => handleRevoke(c.id)}
                        disabled={revoking === c.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                          color: '#F87171', cursor: 'pointer',
                        }}
                      >
                        {revoking === c.id
                          ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                          : <Trash2 size={12} />
                        }
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Audit log tab */}
      {activeTab === 'logs' && (
        <div style={{ borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden', background: 'var(--bg-card)' }}>
          {loading ? (
            <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
              <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }} />
            </div>
          ) : logs.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
              No audit events yet.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)' }}>
                  {['When', 'User', 'Event', 'IP', 'Detail'].map((h) => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={log.id} style={{ borderBottom: i < logs.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <td style={{ padding: '10px 16px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {timeAgo(log.created_at)}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      {log.user_name
                        ? <><div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.user_name}</div>
                           <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{roleLabel(log.role)}</div></>
                        : <span style={{ color: 'var(--text-muted)' }}>Unknown</span>
                      }
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
                        background: `${eventColor(log.event)}15`,
                        color: eventColor(log.event),
                        border: `1px solid ${eventColor(log.event)}30`,
                      }}>
                        {eventLabel(log.event)}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: 12 }}>
                      {log.ip ?? '—'}
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-muted)', fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.detail && Object.keys(log.detail).length > 0
                        ? Object.entries(log.detail).map(([k, v]) => `${k}: ${v}`).join(', ')
                        : '—'
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Security note */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 18px',
        borderRadius: 12, background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.15)',
      }}>
        <Activity size={16} style={{ color: '#34D399', marginTop: 2, flexShrink: 0 }} />
        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7, margin: 0 }}>
          <strong style={{ color: 'var(--text-secondary)' }}>Security note: </strong>
          No fingerprint data or biometric templates are stored anywhere in this system.
          Only public cryptographic keys (FIDO2 / WebAuthn) are stored — they cannot be used to reconstruct biometrics.
          Revoking a passkey immediately prevents further use from that device.
        </p>
      </div>
    </div>
  );
}
