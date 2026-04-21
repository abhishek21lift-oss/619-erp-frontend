'use client';
import { useEffect, useState, FormEvent } from 'react';
import Guard from '@/components/Guard';
import Sidebar from '@/components/Sidebar';
import { api, User, Trainer } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function SettingsPage() { return <Guard role="admin"><SettingsContent /></Guard>; }

function SettingsContent() {
  const { user } = useAuth();
  const [users,    setUsers]    = useState<User[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');
  const [tab,      setTab]      = useState<'accounts'|'password'>('accounts');

  // Create user form
  const EMPTY = { name:'', email:'', password:'', role:'trainer' as 'admin'|'trainer', trainer_id:'' };
  const [form, setForm]   = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // Change password form
  const [pwForm, setPwForm]     = useState({ current:'', newPw:'', confirm:'' });
  const [pwSaving, setPwSaving] = useState(false);
  const [showPwForm, setShowPwForm] = useState(false);

  const loadAll = () => {
    setLoading(true);
    Promise.all([api.auth.listUsers(), api.trainers.list()])
      .then(([u, t]) => { setUsers(u); setTrainers(t); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(loadAll, []);

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
    } catch(e:any) { flash(e.message, true); }
    finally { setSaving(false); }
  }

  async function toggleUser(u: User) {
    try {
      await api.auth.toggleUser(u.id);
      flash(`${u.name} ${u.is_active ? 'disabled' : 'enabled'}`);
      loadAll();
    } catch(e:any) { flash(e.message, true); }
  }

  async function deleteUser(u: User) {
    if (!confirm(`Delete login for "${u.name}"? They will no longer be able to sign in.`)) return;
    try {
      await api.auth.deleteUser(u.id);
      flash(`${u.name} deleted`);
      loadAll();
    } catch(e:any) { flash(e.message, true); }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    if (pwForm.newPw !== pwForm.confirm) return flash('Passwords do not match', true);
    if (pwForm.newPw.length < 6) return flash('Password must be at least 6 chars', true);
    setPwSaving(true);
    try {
      await api.auth.changePassword(pwForm.current, pwForm.newPw);
      flash('Password changed successfully!');
      setPwForm({ current:'', newPw:'', confirm:'' });
      setShowPwForm(false);
    } catch(e:any) { flash(e.message, true); }
    finally { setPwSaving(false); }
  }

  const S = (k: string) => (e: React.ChangeEvent<any>) => setForm(f => ({...f, [k]: e.target.value}));
  const SP = (k: string) => (e: React.ChangeEvent<any>) => setPwForm(f => ({...f, [k]: e.target.value}));

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="page-main">
        <div className="topbar">
          <div>
            <div className="topbar-title">Settings</div>
            <div className="topbar-sub">Manage accounts & security</div>
          </div>
        </div>

        <div className="page-content fade-up">
          {error   && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {/* Tabs */}
          <div style={{ display:'flex', gap:'.5rem', marginBottom:'1.5rem', borderBottom:'1px solid var(--border)', paddingBottom:'.75rem' }}>
            {([['accounts','👥 Login Accounts'],['password','🔐 Change Password']] as [string,string][]).map(([k,lbl]) => (
              <button key={k} onClick={() => setTab(k as any)}
                className={`btn ${tab===k?'btn-primary':'btn-ghost'} btn-sm`}>{lbl}</button>
            ))}
          </div>

          {/* ── Login Accounts ── */}
          {tab === 'accounts' && (
            <div style={{ display:'grid', gap:'1.5rem', gridTemplateColumns:'1fr 1fr' }}>

              {/* Create form */}
              <div className="card">
                <div className="card-title">Create Login Account</div>
                <form onSubmit={createUser} style={{ display:'flex', flexDirection:'column', gap:'.85rem' }}>
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
                    <div style={{ position:'relative' }}>
                      <input className="input" type={showPw?'text':'password'} value={form.password}
                        onChange={S('password')} required minLength={6} placeholder="Min 6 characters"
                        style={{ paddingRight:'2.5rem' }}/>
                      <button type="button" onClick={() => setShowPw(!showPw)}
                        style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
                          background:'none', border:'none', color:'var(--muted)', cursor:'pointer', fontSize:14 }}>
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
                  <button type="submit" className="btn btn-primary" disabled={saving} style={{ marginTop:4 }}>
                    {saving ? 'Creating…' : '➕ Create Account'}
                  </button>
                </form>
              </div>

              {/* User list */}
              <div className="card" style={{ padding: 0 }}>
                <div style={{ padding:'1rem 1.5rem', borderBottom:'1px solid var(--border)' }}>
                  <div className="card-title" style={{ marginBottom:0 }}>All Accounts ({users.length})</div>
                </div>
                {loading ? (
                  <div style={{ padding:'2rem', color:'var(--muted)' }}>Loading…</div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column' }}>
                    {users.map(u => (
                      <div key={u.id} style={{
                        display:'flex', alignItems:'center', gap:'.75rem',
                        padding:'.85rem 1.5rem', borderBottom:'1px solid var(--border)',
                        opacity: u.is_active ? 1 : 0.5,
                        transition: 'all .15s',
                      }}>
                        <div style={{
                          width:36, height:36, borderRadius:10, flexShrink:0,
                          background: u.role==='admin'
                            ? 'linear-gradient(135deg,var(--brand),var(--purple))'
                            : 'linear-gradient(135deg,var(--blue),#1d4ed8)',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:13, fontWeight:700, color:'#fff',
                        }}>
                          {u.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:600, fontSize:13 }} className="truncate">{u.name}</div>
                          <div className="text-muted text-xs truncate">{u.email}</div>
                          <div style={{ display:'flex', gap:4, marginTop:3 }}>
                            <span className={`badge badge-${u.role}`} style={{ fontSize:10 }}>{u.role}</span>
                            <span className={`badge ${u.is_active?'badge-active':'badge-expired'}`} style={{ fontSize:10 }}>
                              {u.is_active ? 'active' : 'disabled'}
                            </span>
                          </div>
                        </div>
                        <div style={{ display:'flex', gap:4 }}>
                          {u.id !== user?.id && (
                            <>
                              <button onClick={() => toggleUser(u)}
                                className={`btn ${u.is_active?'btn-ghost':'btn-success'} btn-sm`}
                                style={{ fontSize:11 }}>
                                {u.is_active ? 'Disable' : 'Enable'}
                              </button>
                              <button onClick={() => deleteUser(u)}
                                className="btn btn-danger btn-icon btn-sm">🗑️</button>
                            </>
                          )}
                          {u.id === user?.id && (
                            <span className="text-muted text-xs">(you)</span>
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
            <div style={{ maxWidth: 480 }}>
              <div className="card">
                <div className="card-title">Change Your Password</div>
                <div className="alert alert-info mb-2">
                  🔐 You are changing the password for: <strong>{user?.email}</strong>
                </div>
                <form onSubmit={changePassword} style={{ display:'flex', flexDirection:'column', gap:'.85rem' }}>
                  {[
                    ['current','Current Password'],
                    ['newPw','New Password'],
                    ['confirm','Confirm New Password'],
                  ].map(([k, lbl]) => (
                    <div key={k}>
                      <label>{lbl}</label>
                      <input className="input" type="password"
                        value={(pwForm as any)[k]}
                        onChange={SP(k === 'newPw' ? 'newPw' : k)}
                        required minLength={k !== 'current' ? 6 : 1}
                        placeholder={k === 'current' ? 'Your current password' : 'At least 6 characters'} />
                    </div>
                  ))}
                  {pwForm.newPw && pwForm.confirm && pwForm.newPw !== pwForm.confirm && (
                    <div className="alert alert-error" style={{ margin:0 }}>Passwords do not match</div>
                  )}
                  <button type="submit" className="btn btn-primary btn-lg"
                    disabled={pwSaving || (!!pwForm.confirm && pwForm.newPw !== pwForm.confirm)}>
                    {pwSaving ? 'Saving…' : '🔐 Update Password'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
