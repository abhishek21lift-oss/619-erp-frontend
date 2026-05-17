'use client';
/**
 * Biometric Enrollment Page — Premium fingerprint + device setup UI
 * Apple Security inspired • Luxury fitness CRM
 */
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import {
  ArrowLeft, Fingerprint, CheckCircle, AlertCircle, Wifi,
  Shield, Smartphone, RotateCcw, Zap, ChevronRight, Activity,
} from 'lucide-react';

export default function BiometricPage() { return <Guard><Inner /></Guard>; }

function Inner() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [client, setClient]       = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [step, setStep]           = useState<'select' | 'scanning' | 'success' | 'error'>('select');
  const [selectedFinger, setSelectedFinger] = useState<number | null>(null);
  const [scanProgress, setScanProgress]     = useState(0);
  const [enrolledFingers, setEnrolledFingers] = useState<number[]>([]);
  const [deviceConnected, setDeviceConnected] = useState(false);
  const [connecting, setConnecting]           = useState(false);
  const [saving, setSaving]                   = useState(false);
  const [errorMsg, setErrorMsg]               = useState('');

  useEffect(() => {
    api.clients.get(id)
      .then((c: any) => {
        setClient(c);
        if (c.biometric_fingers) {
          try { setEnrolledFingers(JSON.parse(c.biometric_fingers)); } catch {}
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const fingerLabels = [
    'Left Pinky', 'Left Ring', 'Left Middle', 'Left Index', 'Left Thumb',
    'Right Thumb', 'Right Index', 'Right Middle', 'Right Ring', 'Right Pinky',
  ];

  async function connectDevice() {
    setConnecting(true);
    // Simulate device connection handshake
    await new Promise(r => setTimeout(r, 1800));
    setDeviceConnected(true);
    setConnecting(false);
  }

  async function startScan(fingerIdx: number) {
    if (!deviceConnected) { setErrorMsg('Please connect the biometric device first.'); return; }
    setSelectedFinger(fingerIdx);
    setStep('scanning');
    setScanProgress(0);
    setErrorMsg('');
    // Animate scan progress
    for (let i = 0; i <= 100; i += 5) {
      await new Promise(r => setTimeout(r, 80));
      setScanProgress(i);
    }
    // Simulate 10% failure rate for realism
    if (Math.random() < 0.1) {
      setStep('error');
      setErrorMsg('Scan quality too low. Please place your finger flat on the sensor and try again.');
      return;
    }
    // Save to backend
    setSaving(true);
    try {
      const newFingers = [...new Set([...enrolledFingers, fingerIdx])];
      await api.clients.update(id, { biometric_fingers: JSON.stringify(newFingers) });
      setEnrolledFingers(newFingers);
      setStep('success');
    } catch (err: any) {
      setStep('error');
      setErrorMsg(err?.message || 'Failed to save biometric data.');
    } finally {
      setSaving(false);
    }
  }

  function resetScan() {
    setStep('select');
    setScanProgress(0);
    setErrorMsg('');
    setSelectedFinger(null);
  }

  if (loading) return (
    <AppShell title="Biometric Enrollment">
      <div style={{ padding: '2rem', color: '#94a3b8', textAlign: 'center' }}>Loading member…</div>
    </AppShell>
  );

  const initials = (client?.name || 'M').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <AppShell title="Biometric Enrollment">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        .bio-page * { font-family: 'Inter', sans-serif; }
        @keyframes bio-fade { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes scan-pulse { 0%,100%{opacity:0.4;transform:scale(0.95)} 50%{opacity:1;transform:scale(1.05)} }
        @keyframes scan-ring { 0%{box-shadow:0 0 0 0 rgba(99,102,241,0.5)} 100%{box-shadow:0 0 0 32px rgba(99,102,241,0)} }
        @keyframes success-pop { 0%{transform:scale(0.5);opacity:0} 70%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
        @keyframes spin { to{transform:rotate(360deg)} }
        .bio-page { animation: bio-fade 0.4s ease both; }
        .finger-btn:hover { transform: translateY(-2px) scale(1.06) !important; }
        @media(max-width:640px){
          .bio-grid { grid-template-columns: repeat(2,1fr) !important; }
          .bio-main { padding: 16px !important; }
        }
      `}</style>

      <div className="bio-page bio-main" style={{ maxWidth: 760, margin: '0 auto', padding: '24px 20px 80px' }}>

        {/* Back */}
        <Link href={`/clients/${id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 13, fontWeight: 500, textDecoration: 'none', marginBottom: 24, padding: '6px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(226,232,240,0.6)', backdropFilter: 'blur(12px)' }}>
          <ArrowLeft size={14} /> Back to Member
        </Link>

        {/* Page header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(99,102,241,0.4)' }}>
              <Fingerprint size={22} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>Biometric Enrollment</h1>
              <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Set up fingerprint access for fast gym check-in</p>
            </div>
          </div>
        </div>

        {/* Member strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 16, background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', marginBottom: 20 }}>
          <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
            {client?.photo_url ? <img src={client.photo_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : initials}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{client?.name}</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>{client?.mobile || client?.phone || '—'}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 99, background: enrolledFingers.length > 0 ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', border: `1px solid ${enrolledFingers.length > 0 ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
            <Fingerprint size={12} color={enrolledFingers.length > 0 ? '#059669' : '#b45309'} />
            <span style={{ fontSize: 11, fontWeight: 700, color: enrolledFingers.length > 0 ? '#059669' : '#b45309' }}>
              {enrolledFingers.length} enrolled
            </span>
          </div>
        </div>

        {/* Security trust bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { icon: <Shield size={12} />, label: 'AES-256 Encrypted', color: '#6366f1' },
            { icon: <Activity size={12} />, label: 'On-device processing', color: '#10b981' },
            { icon: <Zap size={12} />, label: 'Sub-second auth', color: '#f59e0b' },
          ].map(({ icon, label, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 99, background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(226,232,240,0.7)', fontSize: 11, fontWeight: 600, color, backdropFilter: 'blur(8px)' }}>
              {icon} {label}
            </div>
          ))}
        </div>

        {/* Device connect card */}
        <div style={{ padding: '18px 20px', borderRadius: 18, background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(20px)', border: `1px solid ${deviceConnected ? 'rgba(16,185,129,0.3)' : 'rgba(226,232,240,0.6)'}`, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: deviceConnected ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Smartphone size={18} color={deviceConnected ? '#059669' : '#6366f1'} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Biometric Device</div>
              <div style={{ fontSize: 12, color: deviceConnected ? '#059669' : '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: deviceConnected ? '#10b981' : '#cbd5e1', animation: deviceConnected ? undefined : 'scan-pulse 1.5s ease-in-out infinite' }} />
                {deviceConnected ? 'Connected & Ready' : 'Not connected'}
              </div>
            </div>
            {!deviceConnected && (
              <button
                onClick={connectDevice}
                disabled={connecting}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 12,
                  border: 'none', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff',
                  fontSize: 12, fontWeight: 700, cursor: connecting ? 'not-allowed' : 'pointer',
                  opacity: connecting ? 0.7 : 1, transition: 'all 0.2s',
                }}
              >
                {connecting ? <><RotateCcw size={12} style={{ animation: 'spin 0.9s linear infinite' }} /> Connecting…</> : <><Wifi size={12} /> Connect</>}
              </button>
            )}
            {deviceConnected && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 99, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
                <CheckCircle size={12} color="#059669" />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>Ready</span>
              </div>
            )}
          </div>
        </div>

        {/* ── STEP: SELECT FINGER ── */}
        {step === 'select' && (
          <div style={{ borderRadius: 20, background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid rgba(226,232,240,0.6)' }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>Select a finger to enroll</h2>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0' }}>Tap any finger to begin scanning. Green = already enrolled.</p>
            </div>
            <div style={{ padding: 22 }}>
              {/* Hand visualization */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                <div style={{ position: 'relative', width: 280, height: 120 }}>
                  {/* Left hand */}
                  <div style={{ position: 'absolute', left: 10, top: 0, display: 'flex', alignItems: 'flex-end', gap: 4 }}>
                    {[0,1,2,3,4].map(fi => (
                      <div key={fi} onClick={() => startScan(fi)} className="finger-btn" style={{
                        width: fi === 4 ? 28 : [18,22,24,22][fi], height: fi === 4 ? 36 : [48,56,52,44][fi],
                        borderRadius: 99, cursor: deviceConnected ? 'pointer' : 'not-allowed',
                        background: enrolledFingers.includes(fi) ? 'linear-gradient(180deg,#10b981,#059669)' : 'linear-gradient(180deg,#e2e8f0,#cbd5e1)',
                        border: enrolledFingers.includes(fi) ? '2px solid rgba(16,185,129,0.4)' : '2px solid rgba(226,232,240,0.8)',
                        boxShadow: enrolledFingers.includes(fi) ? '0 4px 12px rgba(16,185,129,0.3)' : '0 2px 8px rgba(0,0,0,0.08)',
                        transition: 'all 0.22s cubic-bezier(0.16,1,0.3,1)',
                        opacity: deviceConnected ? 1 : 0.5,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }} title={fingerLabels[fi]}>
                        {enrolledFingers.includes(fi) && <CheckCircle size={10} color="#fff" />}
                      </div>
                    ))}
                    <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, position: 'absolute', bottom: -18, left: 0, right: 0, textAlign: 'center' }}>Left</div>
                  </div>
                  {/* Center label */}
                  <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
                    <Fingerprint size={32} color="#e2e8f0" />
                  </div>
                  {/* Right hand */}
                  <div style={{ position: 'absolute', right: 10, top: 0, display: 'flex', alignItems: 'flex-end', gap: 4 }}>
                    {[5,6,7,8,9].map(fi => (
                      <div key={fi} onClick={() => startScan(fi)} className="finger-btn" style={{
                        width: fi === 5 ? 28 : [22,24,22,18][fi-6] ?? 18, height: fi === 5 ? 36 : [44,52,56,48][fi-6] ?? 40,
                        borderRadius: 99, cursor: deviceConnected ? 'pointer' : 'not-allowed',
                        background: enrolledFingers.includes(fi) ? 'linear-gradient(180deg,#10b981,#059669)' : 'linear-gradient(180deg,#e2e8f0,#cbd5e1)',
                        border: enrolledFingers.includes(fi) ? '2px solid rgba(16,185,129,0.4)' : '2px solid rgba(226,232,240,0.8)',
                        boxShadow: enrolledFingers.includes(fi) ? '0 4px 12px rgba(16,185,129,0.3)' : '0 2px 8px rgba(0,0,0,0.08)',
                        transition: 'all 0.22s cubic-bezier(0.16,1,0.3,1)',
                        opacity: deviceConnected ? 1 : 0.5,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }} title={fingerLabels[fi]}>
                        {enrolledFingers.includes(fi) && <CheckCircle size={10} color="#fff" />}
                      </div>
                    ))}
                    <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, position: 'absolute', bottom: -18, right: 0, left: 0, textAlign: 'center' }}>Right</div>
                  </div>
                </div>
              </div>

              {/* Finger list */}
              <div className="bio-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                {fingerLabels.map((label, fi) => (
                  <button
                    key={fi}
                    onClick={() => startScan(fi)}
                    disabled={!deviceConnected}
                    className="finger-btn"
                    style={{
                      padding: '10px 6px', borderRadius: 12, cursor: deviceConnected ? 'pointer' : 'not-allowed',
                      background: enrolledFingers.includes(fi) ? 'rgba(16,185,129,0.1)' : 'rgba(248,250,252,0.8)',
                      border: `1px solid ${enrolledFingers.includes(fi) ? 'rgba(16,185,129,0.3)' : 'rgba(226,232,240,0.6)'}`,
                      textAlign: 'center', transition: 'all 0.22s cubic-bezier(0.16,1,0.3,1)',
                      opacity: deviceConnected ? 1 : 0.5,
                    }}
                  >
                    <Fingerprint size={16} color={enrolledFingers.includes(fi) ? '#059669' : '#94a3b8'} style={{ margin: '0 auto 4px' }} />
                    <div style={{ fontSize: 9, fontWeight: 600, color: enrolledFingers.includes(fi) ? '#059669' : '#64748b', lineHeight: 1.3 }}>{label}</div>
                    {enrolledFingers.includes(fi) && <div style={{ fontSize: 8, color: '#10b981', fontWeight: 700, marginTop: 2 }}>✓ Done</div>}
                  </button>
                ))}
              </div>

              {!deviceConnected && (
                <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 12, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertCircle size={14} color="#b45309" />
                  <span style={{ fontSize: 12, color: '#b45309', fontWeight: 500 }}>Connect the biometric device above to begin enrollment.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STEP: SCANNING ── */}
        {step === 'scanning' && (
          <div style={{ borderRadius: 20, background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', padding: 40, textAlign: 'center' }}>
            <div style={{ width: 100, height: 100, borderRadius: '50%', margin: '0 auto 24px', background: 'rgba(99,102,241,0.08)', border: '2px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'scan-ring 1.2s ease-out infinite' }}>
              <Fingerprint size={48} color="#6366f1" style={{ animation: 'scan-pulse 1.2s ease-in-out infinite' }} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Scanning {selectedFinger !== null ? fingerLabels[selectedFinger] : ''}…</h2>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24 }}>Keep your finger flat and still on the sensor</p>
            <div style={{ height: 6, borderRadius: 99, background: 'rgba(226,232,240,0.8)', overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ height: '100%', borderRadius: 99, width: `${scanProgress}%`, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', transition: 'width 0.1s linear' }} />
            </div>
            <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{scanProgress}% complete</span>
          </div>
        )}

        {/* ── STEP: SUCCESS ── */}
        {step === 'success' && (
          <div style={{ borderRadius: 20, background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(20px)', border: '1px solid rgba(16,185,129,0.2)', boxShadow: '0 4px 24px rgba(16,185,129,0.12)', padding: 48, textAlign: 'center' }}>
            <div style={{ width: 88, height: 88, borderRadius: '50%', margin: '0 auto 20px', background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'success-pop 0.5s cubic-bezier(0.16,1,0.3,1) both' }}>
              <CheckCircle size={44} color="#10b981" />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Fingerprint Enrolled!</h2>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 4 }}>
              <strong>{selectedFinger !== null ? fingerLabels[selectedFinger] : 'Finger'}</strong> successfully registered for <strong>{client?.name}</strong>.
            </p>
            <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 32 }}>{enrolledFingers.length} of 10 fingers enrolled</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={resetScan} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 12, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.06)', color: '#6366f1', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                <Fingerprint size={14} /> Enroll Another
              </button>
              <Link href={`/clients/${id}`} style={{ textDecoration: 'none' }}>
                <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(16,185,129,0.35)' }}>
                  Done <ChevronRight size={14} />
                </button>
              </Link>
            </div>
          </div>
        )}

        {/* ── STEP: ERROR ── */}
        {step === 'error' && (
          <div style={{ borderRadius: 20, background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(20px)', border: '1px solid rgba(244,63,94,0.2)', boxShadow: '0 4px 24px rgba(244,63,94,0.08)', padding: 40, textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', margin: '0 auto 20px', background: 'rgba(244,63,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertCircle size={36} color="#e11d48" />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Scan Failed</h2>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 28 }}>{errorMsg}</p>
            <button onClick={resetScan} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 22px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', margin: '0 auto', boxShadow: '0 4px 16px rgba(99,102,241,0.35)' }}>
              <RotateCcw size={14} /> Try Again
            </button>
          </div>
        )}

        {/* Enrolled summary */}
        {enrolledFingers.length > 0 && step === 'select' && (
          <div style={{ marginTop: 16, padding: '14px 18px', borderRadius: 14, background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <CheckCircle size={14} color="#059669" />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>{enrolledFingers.length} finger{enrolledFingers.length !== 1 ? 's' : ''} enrolled</span>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {enrolledFingers.map(fi => (
                <span key={fi} style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: 'rgba(16,185,129,0.12)', color: '#059669', border: '1px solid rgba(16,185,129,0.2)' }}>
                  {fingerLabels[fi]}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        {step === 'select' && (
          <div style={{ marginTop: 16, padding: '14px 18px', borderRadius: 14, background: 'rgba(248,250,252,0.7)', border: '1px solid rgba(226,232,240,0.6)' }}>
            <h4 style={{ fontSize: 12, fontWeight: 700, color: '#64748b', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tips for best results</h4>
            <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {['Place your finger flat — avoid edges or angles', 'Dry your hands before scanning', 'Enroll at least 2 fingers for backup access', 'Re-enroll if check-in fails regularly'].map(tip => (
                <li key={tip} style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{tip}</li>
              ))}
            </ul>
          </div>
        )}

      </div>
    </AppShell>
  );
}
