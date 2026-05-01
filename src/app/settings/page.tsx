'use client';
import { useEffect, useState, FormEvent } from 'react';
import Guard from '@/components/Guard';
import Sidebar from '@/components/Sidebar';
import { api, User, Trainer } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

// Settings page is accessible to BOTH admins (full UI) and trainers (password tab only)
export default function SettingsPage() { return <Guard><SettingsContent /></Guard>; }

function SettingsContent() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [users,    setUsers]    = useState<User[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading,  setLoading]  = useState(isAdmin);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');
  const [tab,      setTab]      = useState<'accounts'|'password'>(isAdmin ? 'accounts' : 'password');
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<User | null>(null);

  // Create user form
  const EMPTY = { name: '', email: '', password: '', role: 'trainer' as 'admin'|'trainer', trainer_id: '' };
  const [form, setForm]   = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // Change password form
  const [pwForm, setPwForm]     = useState({ current: '', newPw: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const loadAll = () => {
    if (!isAdmin) return;
    setLoading(true);
    Promise.all([api.auth.listUsers(), api.trainers.list()])
      .then(([u, t]) => { setUsers(u); setTrainers(t); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(loadAll, [isAdmin]);

  function flash(msg: string, isError = false) {
    if (isError) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(''); setSuccess(''); }, 4000);
  }

  async function createUser(e: FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) return flash('All fields required', true);
    if (form.password.length < 6) return flash('Password must be at least 6 characters', true);
    setSaving(true);
    try {
      await api.auth.createUser(form);
      flash(`Login created for ${form.email}`);
      setForm(EMPTY);
      loadAll();
    } catch(e: any) { flash(e.message, true); }
    finally { setSaving(false); }
  }

  async function toggleUser(u: User) {
    try {
      await api.auth.toggleUser(u.id);
      flash(`${u.name} ${u.is_active ? 'disabled' : 'enabled'}`);
      loadAll();
    } catch(e: any) { flash(e.message, true); }
  }

  async function deleteUser(u: User) {
    setConfirmDeleteUser(null);
    try {
      await api.auth.deleteUser(u.id);
      flash(`${u.name} deleted`);
      loadAll();
    } catch(e: any) { flash(e.message, true); }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    if (!pwForm.current) return flash('Enter your current password', true);
    if (pwForm.newPw !== pwForm.confirm) return flash('New passwords do not match', true);
    if (pwForm.newPw.length < 6) return flash('Password must be at least 6 characters', true);
    if (pwForm.newPw === pwForm.current) return flash('New password must be different from current', true);
    setPwSaving(true);
    try {
      await api.auth.changePassword(pwForm.current, pwForm.newPw);
      flash('Password changed successfully');
      setPwForm({ current: '', newPw: '', confirm: '' });
    } catch(e: any) { flash(e.message, true); }
    finally { setPwSaving(false); }
  }

  const S = (k: string) => (e: React.ChangeEvent<any>) => setForm(f => ({ ...f, [k]: e.target.value }));
  const SP = (k: keyof typeof pwForm) => (e: React.ChangeEvent<any>) =>
    setPwForm(f => ({ ...f, [k]: e.target.value }));

  // Password strength meter
  const strength = (pw: string) => {
    let s = 0;
    if (pw.length >= 6) s++;
    if (pw.length >= 10) s++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
    if (/\d/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return Math.min(s, 4);
  };
  const pwStrength = strength(pwForm.newPw);
  const strengthLabel = ['Too weak', 'Weak', 'Okay', 'Good', 'Strong'][pwStrength];
  const strengthColor = ['var(--danger)', 'var(--danger)', 'var(--warning)', 'var(--success)', 'var(--success)'][pwStrength];

  const tabs: [string, string][] = isAdmin
    ? [['accounts', '👥 Login Accounts'], ['password', '🔐 Change Password']]
    : [['password', '🔐 Change Password']];

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="page-main">
        <div className="topbar">
          <div>
            <div className="topbar-title">Settings</div>
            <div className="topbar-sub">{isAdmin ? 'Manage accounts & security' : 'Account security'}</div>
          </div>
        </div>

        <div className="page-content fade-up">
          {error   && <div className="alert alert-error">⚠️ {error}</div>}
          {success && <div className="alert alert-success">✓ {success}</div>}

          {/* Tabs */}
          <div style={{
            display: 'flex',
            gap: '.5rem',
            marginBottom: '1.5rem',
            padding: '.4rem',
            background: 'var(--glass-1)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            backdropFilter: 'blur(10px)',
            width: 'fit-content',
          }}>
            {tabs.map(([k, lbl]) => (
              <button
                key={k}
                onClick={() => setTab(k as any)}
                style={{
                  padding: '.5rem 1.1rem',
                  borderRadius: 10,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  background: tab === k
                    ? 'linear-gradient(135deg, var(--brand), #d0234e)'
                    : 'transparent',
                  color: tab === k ? '#fff' : 'var(--text2)',
                  boxShadow: tab === k ? '0 6px 18px var(--brand-glow)' : 'none',
                  transition: 'all .15s',
                }}
              >
                {lbl}
              </button>
            ))}
          </div>

          {/* ── Login Accounts ── */}
          {tab === 'accounts' && isAdmin && (
            <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.2fr)' }}>

              {/* Create form */}
              <div className="card">
                <div className="card-title">Create Login Account</div>
                <form onSubmit={createUser} style={{ display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
                  <div>
                    <label>Full Name</label>
                    <input className="input" value={form.name} onChange={S('name')} required placeholder="e.g. Riya Sharma" />
                  </div>
                  <div>
                    <label>Email Address</label>
                    <input className="input" type="email" value={form.email} onChange={S('email')} required placeholder="riya@619fitness.com" />
                  </div>
                  <div>
                    <label>Password</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        className="input"
                        type={showPw ? 'text' : 'password'}
                        value={form.password}
                        onChange={S('password')}
                        required
                        minLength={6}
                        placeholder="Min 6 characters"
                        style={{ paddingRight: '2.75rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(!showPw)}
                        style={{
                          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                          background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 14,
                        }}
                      >
                        {showPw ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label>Role</label>
                    <select className="input select" value={form.role} onChange={S('role')}>
                      <option value="trainer">Trainer</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  {form.role === 'trainer' && (
                    <div>
                      <label>Link to Trainer Profile</label>
                      <select className="input select" value={form.trainer_id} onChange={S('trainer_id')}>
                        <option value="">— Not linked —</option>
                        {trainers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                      <div className="text-muted text-xs mt-1">
                        Linking restricts the trainer to see only their own clients
                      </div>
                    </div>
                  )}
                  <button type="submit" className="btn btn-primary btn-lg" disabled={saving} style={{ marginTop: 6, justifyContent: 'center' }}>
                    {saving ? 'Creating…' : '➕ Create Account'}
                  </button>
                </form>
              </div>

              {/* User list */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{
                  padding: '1rem 1.5rem',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div className="card-title" style={{ marginBottom: 0 }}>
                    All Accounts ({users.length})
                  </div>
                </div>
                {loading ? (
                  <div style={{ padding: '2rem', color: 'var(--muted)' }}>Loading…</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {users.map(u => (
                      <div
                        key={u.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '.85rem',
                          padding: '.95rem 1.5rem',
                          borderBottom: '1px solid var(--border)',
                          opacity: u.is_active ? 1 : 0.55,
                          transition: 'background .15s',
                        }}
                      >
                        <div style={{
                          width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                          background: u.role === 'admin'
                            ? 'linear-gradient(135deg, var(--brand), var(--purple))'
                            : 'linear-gradient(135deg, var(--blue), #1d4ed8)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 13, fontWeight: 700, color: '#fff',
                          boxShadow: u.role === 'admin'
                            ? '0 6px 16px var(--brand-glow)'
                            : '0 6px 16px rgba(96,165,250,.3)',
                        }}>
                          {(u.name || 'U').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13.5 }} className="truncate">{u.name}</div>
                          <div className="text-muted text-xs truncate">{u.email}</div>
                          <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                            <span className={`badge badge-${u.role}`} style={{ fontSize: 10 }}>{u.role}</span>
                            <span className={`badge ${u.is_active ? 'badge-active' : 'badge-expired'}`} style={{ fontSize: 10 }}>
                              {u.is_active ? 'active' : 'disabled'}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {u.id !== user?.id && (
                            <>
                              <button
                                onClick={() => toggleUser(u)}
                                className={`btn ${u.is_active ? 'btn-ghost' : 'btn-success'} btn-sm`}
                                style={{ fontSize: 11 }}
                              >
                                {u.is_active ? 'Disable' : 'Enable'}
                              </button>
                              <button
                                onClick={() => setConfirmDeleteUser(u)}
                                className="btn btn-danger btn-icon btn-sm"
                                aria-label="Delete user"
                              >🗑️</button>
                            </>
                          )}
                          {u.id === user?.id && (
                            <span className="text-muted text-xs" style={{ alignSelf: 'center' }}>(you)</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Change Password ── */}
          {tab === 'password' && (
            <div style={{ maxWidth: 520 }}>
              <div className="card">
                <div className="card-title">Change Your Password</div>
                <div className="alert alert-info mb-2">
                  🔐 Changing password for <strong>{user?.email}</strong>
                </div>
                <form onSubmit={changePassword} style={{ display: 'flex', flexDirection: 'column', gap: '.95rem' }}>
                  <div>
                    <label>Current Password</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        className="input"
                        type={showCurrent ? 'text' : 'password'}
                        value={pwForm.current}
                        onChange={SP('current')}
                        required
                        placeholder="Your current password"
                        autoComplete="current-password"
                        style={{ paddingRight: '2.75rem' }}
                      />
                      <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                          background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 14 }}
                        aria-label="Toggle password">
                        {showCurrent ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label>New Password</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        className="input"
                        type={showNew ? 'text' : 'password'}
                        value={pwForm.newPw}
                        onChange={SP('newPw')}
                        required
                        minLength={6}
                        placeholder="At least 6 characters"
                        autoComplete="new-password"
                        style={{ paddingRight: '2.75rem' }}
                      />
                      <button type="button" onClick={() => setShowNew(!showNew)}
                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                          background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 14 }}
                        aria-label="Toggle password">
                        {showNew ? '🙈' : '👁️'}
                      </button>
                    </div>
                    {pwForm.newPw && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                          {[0, 1, 2, 3].map(i => (
                            <div key={i} style={{
                              flex: 1, height: 4, borderRadius: 4,
                              background: i < pwStrength ? strengthColor : 'rgba(255,255,255,0.06)',
                              transition: 'background .2s',
                            }} />
                          ))}
                        </div>
                        <div className="text-xs" style={{ color: strengthColor, fontWeight: 600 }}>
                          {strengthLabel}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label>Confirm New Password</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        className="input"
                        type={showConfirm ? 'text' : 'password'}
                        value={pwForm.confirm}
                        onChange={SP('confirm')}
                        required
                        minLength={6}
                        placeholder="Re-enter new password"
                        autoComplete="new-password"
                        style={{ paddingRight: '2.75rem' }}
                      />
                      <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                          background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 14 }}
                        aria-label="Toggle password">
                        {showConfirm ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>

                  {pwForm.newPw && pwForm.confirm && pwForm.newPw !== pwForm.confirm && (
                    <div className="alert alert-error" style={{ margin: 0 }}>
                      Passwords do not match
                    </div>
                  )}

                  <button
                    type="submit"
                    className="btn btn-primary btn-lg"
                    disabled={
                      pwSaving ||
                      !pwForm.current ||
                      !pwForm.newPw ||
                      !pwForm.confirm ||
                      pwForm.newPw !== pwForm.confirm ||
                      pwForm.newPw.length < 6
                    }
                    style={{ justifyContent: 'center' }}
                  >
                    {pwSaving ? 'Updating…' : '🔐 Update Password'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Confirm delete user */}
        {confirmDeleteUser && (
          <div className="modal-overlay" onClick={() => setConfirmDeleteUser(null)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
              <div className="modal-header">
                <div className="modal-title">Delete login account?</div>
                <button onClick={() => setConfirmDeleteUser(null)} className="btn btn-ghost btn-icon btn-sm">✕</button>
              </div>
              <div className="alert alert-warning">
                Delete login for <strong>{confirmDeleteUser.name}</strong>? They will no longer be able to sign in.
              </div>
              <div style={{ display: 'flex', gap: '.5rem', marginTop: '.75rem' }}>
                <button onClick={() => deleteUser(confirmDeleteUser)} className="btn btn-danger btn-lg" style={{ flex: 1, justifyContent: 'center' }}>
                  🗑️ Yes, delete
                </button>
                <button onClick={() => setConfirmDeleteUser(null)} className="btn btn-ghost btn-lg">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
