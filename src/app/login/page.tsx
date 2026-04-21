'use client';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const { login, user } = useAuth();
  const router = useRouter();
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [show, setShow]       = useState(false);

  if (user) { router.replace('/dashboard'); return null; }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally { setLoading(false); }
  }

  function fill(e: string, p: string) { setEmail(e); setPassword(p); }

  return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'var(--dark)', padding:'1rem',
      backgroundImage:'radial-gradient(ellipse at 60% 20%, rgba(230,57,70,.07) 0%, transparent 60%), radial-gradient(ellipse at 10% 80%, rgba(59,130,246,.05) 0%, transparent 50%)',
    }}>
      <div style={{width:'100%',maxWidth:420}} className="fade-up">
        {/* Logo */}
        <div style={{textAlign:'center',marginBottom:'2.5rem'}}>
          <div style={{
            display:'inline-flex',alignItems:'center',justifyContent:'center',
            width:72,height:72,borderRadius:20,
            background:'linear-gradient(135deg,var(--brand),var(--brand2))',
            fontSize:34,marginBottom:'.75rem',boxShadow:'0 8px 32px var(--brand-glow)',
          }}>🏋️</div>
          <div style={{fontSize:32,fontWeight:900,letterSpacing:-1,
            background:'linear-gradient(135deg,#fff,#b0b4c8)',
            WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
            619 Fitness
          </div>
          <div style={{fontSize:13,color:'var(--muted)',marginTop:4,letterSpacing:.5}}>
            STUDIO ERP — SIGN IN
          </div>
        </div>

        {/* Card */}
        <div style={{
          background:'var(--card)',border:'1px solid var(--border)',
          borderRadius:20,padding:'2rem',boxShadow:'var(--shadow-lg)',
        }}>
          {error && (
            <div className="alert alert-error" style={{marginBottom:'1.25rem'}}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:'1.1rem'}}>
            <div>
              <label>Email address</label>
              <input className="input" type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@619fitness.com" required autoFocus />
            </div>
            <div>
              <label>Password</label>
              <div style={{position:'relative'}}>
                <input className="input" type={show?'text':'password'}
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required style={{paddingRight:'2.5rem'}}/>
                <button type="button" onClick={() => setShow(!show)}
                  style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',
                    background:'none',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:16}}>
                  {show ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-lg"
              disabled={loading} style={{width:'100%',justifyContent:'center',marginTop:4}}>
              {loading ? (
                <span style={{display:'flex',alignItems:'center',gap:8}}>
                  <span className="pulse">●</span> Signing in…
                </span>
              ) : '→ Sign In'}
            </button>
          </form>
        </div>

        {/* Demo creds */}
        <div style={{
          marginTop:'1.25rem',padding:'1rem',
          background:'rgba(255,255,255,.03)',border:'1px solid var(--border)',
          borderRadius:12,fontSize:12,color:'var(--muted)',
        }}>
          <div style={{fontWeight:700,color:'var(--text2)',marginBottom:8}}>🔑 Demo Credentials</div>
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {[
              ['👑 Admin',   'admin@619fitness.com',   'admin@619'],
              ['🏋️ Trainer', 'trainer@619fitness.com', 'trainer@619'],
            ].map(([label, e, p]) => (
              <button key={e} onClick={() => fill(e, p)}
                style={{
                  background:'var(--dark)',border:'1px solid var(--border)',
                  borderRadius:8,padding:'6px 10px',cursor:'pointer',
                  display:'flex',justifyContent:'space-between',alignItems:'center',
                  color:'var(--text2)',fontSize:12,textAlign:'left',
                }}>
                <span>{label}</span>
                <span style={{fontFamily:'monospace',fontSize:11,color:'var(--muted)'}}>{e}</span>
              </button>
            ))}
          </div>
          <div style={{marginTop:8,fontSize:11,color:'var(--muted)'}}>
            Click to auto-fill credentials
          </div>
        </div>
      </div>
    </div>
  );
}
