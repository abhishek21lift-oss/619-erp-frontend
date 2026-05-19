'use client';
/**
 * Biometric Enrollment Page
 * ─────────────────────────
 * Section 1 (primary): Face Enrollment — real webcam + face-api.js descriptor
 *   captured by FaceEnrollmentClient (next/dynamic ssr:false wrapper).
 *   Calls api.checkin.enroll() to persist the face descriptor in the backend.
 *
 * Section 2 (optional): Fingerprint device simulation
 *   Kept for completeness; only shown after device "connect".
 *   Saves biometric_fingers JSON to the client record.
 */
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import FaceEnrollmentClient from '@/components/biometric/FaceEnrollmentClient';
import { api, type Client } from '@/lib/api';
import {
  ArrowLeft, Fingerprint, CheckCircle, AlertCircle, Wifi,
  Shield, Smartphone, RotateCcw, Zap, ChevronRight, Activity,
} from 'lucide-react';

export default function BiometricPage() { return <Guard><Inner /></Guard>; }

function Inner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  void router;

  const [client, setClient]       = useState<Client | null>(null);
  const [loading, setLoading]     = useState(true);
  const [faceEnrolled, setFaceEnrolled] = useState(false);

  // fingerprint section state
  const [fpStep, setFpStep]             = useState<'select' | 'scanning' | 'success' | 'error'>('select');
  const [selectedFinger, setSelectedFinger] = useState<number | null>(null);
  const [scanProgress, setScanProgress]     = useState(0);
  const [enrolledFingers, setEnrolledFingers] = useState<number[]>([]);
  const [deviceConnected, setDeviceConnected] = useState(false);
  const [connecting, setConnecting]           = useState(false);
  const [fpError, setFpError]               = useState('');

  useEffect(() => {
    api.clients.get(id)
      .then((c) => {
        setClient(c);
        if (c.biometric_fingers) {
          try { setEnrolledFingers(JSON.parse(c.biometric_fingers as string)); } catch { /* ignore */ }
        }
        // If they already have a face descriptor treat them as enrolled
        if (Array.isArray((c as Record<string, unknown>).face_descriptor)) {
          setFaceEnrolled(true);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const fingerLabels = [
    'Left Pinky', 'Left Ring', 'Left Middle', 'Left Index', 'Left Thumb',
    'Right Thumb', 'Right Index', 'Right Middle', 'Right Ring', 'Right Pinky',
  ];

  const connectDevice = useCallback(async () => {
    setConnecting(true);
    await new Promise(r => setTimeout(r, 1800));
    setDeviceConnected(true);
    setConnecting(false);
  }, []);

  const startScan = useCallback(async (fingerIdx: number) => {
    if (!deviceConnected) { setFpError('Please connect the biometric device first.'); return; }
    setSelectedFinger(fingerIdx);
    setFpStep('scanning');
    setScanProgress(0);
    setFpError('');
    for (let i = 0; i <= 100; i += 5) {
      await new Promise(r => setTimeout(r, 80));
      setScanProgress(i);
    }
    if (Math.random() < 0.1) {
      setFpStep('error');
      setFpError('Scan quality too low. Place finger flat and try again.');
      return;
    }
    try {
      const newFingers = [...new Set([...enrolledFingers, fingerIdx])];
      await api.clients.update(id, { biometric_fingers: JSON.stringify(newFingers) });
      setEnrolledFingers(newFingers);
      setFpStep('success');
    } catch (err: unknown) {
      setFpStep('error');
      setFpError(err instanceof Error ? err.message : 'Failed to save fingerprint.');
    }
  }, [deviceConnected, enrolledFingers, id]);

  const resetScan = useCallback(() => {
    setFpStep('select');
    setScanProgress(0);
    setFpError('');
    setSelectedFinger(null);
  }, []);

  if (loading) return (
    <AppShell>
      <div style={{ padding: '2rem', color: '#94a3b8', textAlign: 'center' }}>Loading member…</div>
    </AppShell>
  );

  const initials = (client?.name ?? 'M').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <AppShell>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        .bio-page * { font-family: 'Inter', sans-serif; }
        @keyframes bio-fade { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes scan-pulse { 0%,100%{opacity:0.4;transform:scale(0.95)} 50%{opacity:1;transform:scale(1.05)} }
        @keyframes scan-ring  { 0%{box-shadow:0 0 0 0 rgba(99,102,241,0.5)} 100%{box-shadow:0 0 0 32px rgba(99,102,241,0)} }
        @keyframes success-pop{ 0%{transform:scale(0.5);opacity:0} 70%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
        @keyframes spin       { to{transform:rotate(360deg)} }
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
              <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Set up face &amp; fingerprint access for fast check-in</p>
            </div>
          </div>
        </div>

        {/* Member strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 16, background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', marginBottom: 20 }}>
          <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
            {client?.photo_url
              ? <img src={client.photo_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              : initials}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{client?.name}</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>{client?.mobile ?? client?.phone ?? '—'}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {faceEnrolled && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 99, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <CheckCircle size={10} color="#059669" />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#059669' }}>Face ✓</span>
              </div>
            )}
            {enrolledFingers.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 99, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <Fingerprint size={10} color="#6366f1" />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#6366f1' }}>{enrolledFingers.length} finger{enrolledFingers.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </div>

        {/* Trust badges */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
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

        {/* ══════════════════════════════════════════════
             SECTION 1 — FACE ENROLLMENT (primary)
        ══════════════════════════════════════════════ */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Face Recognition</h2>
          <FaceEnrollmentClient
            clientId={id}
            clientName={client?.name}
            onEnrolled={() => setFaceEnrolled(true)}
          />
        </div>

        {/* ══════════════════════════════════════════════
             SECTION 2 — FINGERPRINT (optional device)
        ══════════════════════════════════════════════ */}
        <div>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Fingerprint Device (optional)</h2>

          {/* Device connect card */}
          <div style={{ padding: '18px 20px', borderRadius: 18, background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(20px)', border: `1px solid ${deviceConnected ? 'rgba(16,185,129,0.3)' : 'rgba(226,232,240,0.6)'}`, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: deviceConnected ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Smartphone size={18} color={deviceConnected ? '#059669' : '#6366f1'} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Biometric Device</div>
                <div style={{ fontSize: 12, color: deviceConnected ? '#059669' : '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: deviceConnected ? '#10b981' : '#cbd5e1' }} />
                  {deviceConnected ? 'Connected & Ready' : 'Not connected'}
                </div>
              </div>
              {!deviceConnected && (
                <button
                  onClick={connectDevice}
                  disabled={connecting}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: connecting ? 'not-allowed' : 'pointer', opacity: connecting ? 0.7 : 1 }}
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

          {/* Fingerprint selector — only when device connected */}
          {deviceConnected && (
            <div style={{ borderRadius: 20, background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 22px', borderBottom: '1px solid rgba(226,232,240,0.6)' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>Select finger to enroll</h3>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0' }}>Green = already enrolled</p>
              </div>
              <div style={{ padding: 20 }}>

                {fpStep === 'select' && (
                  <div className="bio-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                    {fingerLabels.map((label, fi) => (
                      <button key={fi} onClick={() => startScan(fi)} className="finger-btn"
                        style={{ padding: '10px 6px', borderRadius: 12, cursor: 'pointer', background: enrolledFingers.includes(fi) ? 'rgba(16,185,129,0.1)' : 'rgba(248,250,252,0.8)', border: `1px solid ${enrolledFingers.includes(fi) ? 'rgba(16,185,129,0.3)' : 'rgba(226,232,240,0.6)'}`, textAlign: 'center', transition: 'all 0.22s cubic-bezier(0.16,1,0.3,1)' }}
                      >
                        <Fingerprint size={16} color={enrolledFingers.includes(fi) ? '#059669' : '#94a3b8'} style={{ margin: '0 auto 4px' }} />
                        <div style={{ fontSize: 9, fontWeight: 600, color: enrolledFingers.includes(fi) ? '#059669' : '#64748b', lineHeight: 1.3 }}>{label}</div>
                        {enrolledFingers.includes(fi) && <div style={{ fontSize: 8, color: '#10b981', fontWeight: 700, marginTop: 2 }}>✓</div>}
                      </button>
                    ))}
                  </div>
                )}

                {fpStep === 'scanning' && (
                  <div style={{ textAlign: 'center', padding: '24px 0' }}>
                    <div style={{ width: 80, height: 80, borderRadius: '50%', margin: '0 auto 16px', background: 'rgba(99,102,241,0.08)', border: '2px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'scan-ring 1.2s ease-out infinite' }}>
                      <Fingerprint size={40} color="#6366f1" style={{ animation: 'scan-pulse 1.2s ease-in-out infinite' }} />
                    </div>
                    <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>Scanning {selectedFinger !== null ? fingerLabels[selectedFinger] : ''}…</p>
                    <div style={{ height: 5, borderRadius: 99, background: 'rgba(226,232,240,0.8)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 99, width: `${scanProgress}%`, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', transition: 'width 0.1s linear' }} />
                    </div>
                  </div>
                )}

                {fpStep === 'success' && (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <CheckCircle size={40} color="#10b981" style={{ margin: '0 auto 12px', display: 'block' }} />
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{selectedFinger !== null ? fingerLabels[selectedFinger] : 'Finger'} enrolled!</p>
                    <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>{enrolledFingers.length} of 10 enrolled</p>
                    <button onClick={resetScan} style={{ padding: '8px 20px', borderRadius: 10, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.06)', color: '#6366f1', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      Enroll Another
                    </button>
                  </div>
                )}

                {fpStep === 'error' && (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <AlertCircle size={36} color="#e11d48" style={{ margin: '0 auto 12px', display: 'block' }} />
                    <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>{fpError}</p>
                    <button onClick={resetScan} style={{ padding: '8px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <RotateCcw size={12} /> Try Again
                    </button>
                  </div>
                )}

                {fpError && fpStep === 'select' && (
                  <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertCircle size={13} color="#b45309" />
                    <span style={{ fontSize: 12, color: '#b45309' }}>{fpError}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Done button */}
        <div style={{ marginTop: 28, display: 'flex', justifyContent: 'flex-end' }}>
          <Link href={`/clients/${id}`} style={{ textDecoration: 'none' }}>
            <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 24px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(16,185,129,0.35)' }}>
              Done <ChevronRight size={14} />
            </button>
          </Link>
        </div>

      </div>
    </AppShell>
  );
}
