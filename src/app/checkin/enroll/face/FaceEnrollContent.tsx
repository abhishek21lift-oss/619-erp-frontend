'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  ScanFace, Search, RefreshCw, User, CheckCircle2, XCircle,
  AlertTriangle, Camera, Eye, ArrowLeft, Trash2,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { PremiumButton } from '@/components/premium/PremiumButton';
import { api } from '@/lib/api';
import { useCamera } from '@/hooks/useCamera';
import { useFaceDetection } from '@/hooks/useFaceDetection';
import { useAntiSpoof } from '@/hooks/useAntiSpoof';
import type { DetectionResult } from '@/types/checkin';

type Step = 'search' | 'camera' | 'success' | 'error';

interface Member {
  id: string;
  name: string;
  email: string;
  source: string;
}

export default function FaceEnrollPage() {
  return (
    <Guard role="admin">
      <AppShell>
        <FaceEnrollContent />
      </AppShell>
    </Guard>
  );
}

function FaceEnrollContent() {
  const [step, setStep] = useState<Step>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Member[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [member, setMember] = useState<Member | null>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [blinkReady, setBlinkReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [enrolledId, setEnrolledId] = useState('');

  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const capturedDescriptor = useRef<Float32Array | null>(null);

  const camera = useCamera();
  const faceDetect = useFaceDetection();
  const antiSpoof = useAntiSpoof();

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Stop camera when leaving camera step
  useEffect(() => {
    if (step !== 'camera') {
      faceDetect.stopDetectionLoop();
      camera.stop();
    }
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearchChange(val: string) {
    setSearchQuery(val);
    setMember(null);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (val.length < 2) { setSearchResults([]); setShowDropdown(false); return; }
    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await api.memberWebauthn.memberSearch(val) as any;
        setSearchResults(res?.members ?? []);
        setShowDropdown(true);
      } catch { setSearchResults([]); }
      finally { setSearchLoading(false); }
    }, 300);
  }

  function selectMember(m: Member) {
    setMember(m);
    setSearchQuery(m.name);
    setShowDropdown(false);
    setSearchResults([]);
  }

  const handleDetection = useCallback((result: DetectionResult) => {
    if (result.detected && !result.multipleFaces && result.descriptor) {
      capturedDescriptor.current = result.descriptor;
      if (result.landmarks && result.landmarks.length >= 68) {
        antiSpoof.processFaceLandmarks(result.landmarks);
      }
      if (antiSpoof.blinkDetected) {
        setBlinkReady(true);
        setStatusMsg('Blink detected — ready to capture');
      } else {
        setStatusMsg('Face detected — please blink once');
      }
    } else if (result.multipleFaces) {
      setStatusMsg('Multiple faces detected — ensure only one person is in frame');
    } else {
      setStatusMsg('Position your face in the frame');
    }
  }, [antiSpoof]);

  async function startCamera() {
    if (!member) return;
    setStep('camera');
    setBlinkReady(false);
    setCapturing(false);
    capturedDescriptor.current = null;
    antiSpoof.reset();
    setStatusMsg('Starting camera…');

    const camOk = await camera.start();
    if (!camOk) {
      setErrorMsg(camera.error || 'Camera failed to start');
      setStep('error');
      return;
    }

    setStatusMsg('Loading face models…');
    const modelsOk = await faceDetect.loadModels();
    if (!modelsOk) {
      setErrorMsg(faceDetect.modelError || 'Failed to load face recognition models. Check your internet connection and try again.');
      setStep('error');
      return;
    }

    if (camera.videoRef.current && canvasRef.current) {
      faceDetect.startDetectionLoop(camera.videoRef.current, canvasRef.current, handleDetection);
      setStatusMsg('Position your face in the frame');
    }
  }

  async function captureAndEnroll() {
    if (!member || !capturedDescriptor.current || !blinkReady) return;
    setCapturing(true);
    setStatusMsg('Enrolling face…');

    try {
      const descriptor = Array.from(capturedDescriptor.current);
      await api.checkin.enroll(member.id, descriptor);
      setEnrolledId(member.id);
      faceDetect.stopDetectionLoop();
      camera.stop();
      setStep('success');
    } catch (err: any) {
      const msg = err?.message || 'Enrollment failed — please try again';
      setErrorMsg(msg);
      setCapturing(false);
      setStatusMsg('Enrollment failed');
    }
  }

  function reset() {
    setStep('search');
    setMember(null);
    setSearchQuery('');
    setBlinkReady(false);
    setCapturing(false);
    setErrorMsg('');
    setStatusMsg('');
    capturedDescriptor.current = null;
    antiSpoof.reset();
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(145deg,#f8fafc 0%,#f1f5f9 50%,#fafafe 100%)' }}>
      <style>{`
        button, [role=button] { touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @media (max-width: 640px) {
          .fe-header-pad { padding: 20px 16px 18px !important; border-radius: 0 0 20px 20px !important; }
          .fe-container-pad { padding: 12px 12px !important; }
        }
      `}</style>
      {/* Header */}
      <div className="relative overflow-hidden" style={{ background: '#f8fafc', padding: '36px 32px 32px', borderRadius: '0 0 36px 36px', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
        <div className="fe-header-pad relative z-10 mx-auto" style={{ maxWidth: 860 }}>
          <div className="flex items-center gap-4">
            <m.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center w-[48px] h-[48px] rounded-[14px]"
              style={{ background: 'linear-gradient(135deg,#6366f1,#10b981)', boxShadow: '0 8px 28px rgba(99,102,241,0.3)' }}>
              <ScanFace size={22} color="#fff" />
            </m.div>
            <div>
              <h1 className="text-[24px] font-[860] tracking-[-0.03em]"
                style={{ color: '#111827' }}>
                Face Enrollment
              </h1>
              <p className="text-[12px]" style={{ color: '#6b7280' }}>
                Register a member's face for biometric check-in
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="fe-container-pad mx-auto px-5 py-6 sm:px-8" style={{ maxWidth: 860 }}>

        {/* ── Search Step ── */}
        <AnimatePresence mode="wait">
          {step === 'search' && (
            <m.div key="search" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="rounded-[22px] p-6 mb-5 relative overflow-hidden" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 2px 20px rgba(0,0,0,0.07)' }}>
                <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg,#6366f1,#10b981)' }} />
                <p className="text-[14px] font-[700] mb-4" style={{ color: 'rgb(15,23,42)' }}>Find Member</p>

                <div ref={searchRef} className="relative mb-4">
                  <div className="relative">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgb(148,163,184)' }} />
                    <input
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                      placeholder="Search by member name, email or ID…"
                      className="w-full rounded-[11px] pl-9 pr-3.5 py-2.5 text-[13px] outline-none"
                      style={{ background: '#f8fafc', border: `1.5px solid ${member ? '#10b981' : '#e2e8f0'}`, color: 'rgb(15,23,42)', fontFamily: 'inherit' }}
                    />
                    {searchLoading && (
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                        <RefreshCw size={13} className="animate-spin" style={{ color: 'rgb(148,163,184)' }} />
                      </div>
                    )}
                  </div>

                  <AnimatePresence>
                    {showDropdown && searchResults.length > 0 && (
                      <m.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                        className="absolute z-50 left-0 right-0 mt-1 rounded-[13px] overflow-hidden"
                        style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
                        {searchResults.map((m) => (
                          <button key={m.id} onMouseDown={() => selectMember(m)}
                            className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-slate-50">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full flex-shrink-0"
                              style={{ background: m.source === 'pt_client' ? 'rgba(249,115,22,0.10)' : 'rgba(99,102,241,0.10)' }}>
                              <User size={13} style={{ color: m.source === 'pt_client' ? '#f97316' : '#6366f1' }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-[600] truncate" style={{ color: 'rgb(15,23,42)' }}>{m.name}</p>
                              <p className="text-[11px] truncate" style={{ color: 'rgb(148,163,184)' }}>
                                {m.email} · <span style={{ color: m.source === 'pt_client' ? '#f97316' : '#6366f1' }}>{m.source === 'pt_client' ? 'PT Client' : 'Member'}</span>
                              </p>
                            </div>
                          </button>
                        ))}
                      </m.div>
                    )}
                  </AnimatePresence>
                </div>

                {member && (
                  <m.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2.5 rounded-[10px] px-3.5 py-2.5 mb-4"
                    style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.20)' }}>
                    <CheckCircle2 size={14} style={{ color: '#10b981', flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-[600]" style={{ color: '#065f46' }}>{member.name}</p>
                      <p className="text-[11px] font-mono" style={{ color: 'rgb(148,163,184)' }}>{member.id}</p>
                    </div>
                    <button onClick={() => { setMember(null); setSearchQuery(''); }}
                      className="text-[11px] px-2 py-0.5 rounded-[6px] hover:bg-red-50"
                      style={{ color: 'rgb(148,163,184)' }}>Change</button>
                  </m.div>
                )}

                <div className="rounded-[12px] p-3.5 mb-5 text-[12px] leading-relaxed" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', color: 'rgb(71,85,105)' }}>
                  <strong style={{ color: '#6366f1' }}>How it works:</strong> The camera will capture a 128-dimensional face descriptor. A blink confirmation is required to prevent photo spoofing. No images are stored — only the mathematical descriptor.
                </div>

                <PremiumButton tone="primary" glow icon={<Camera size={14} />} onClick={startCamera} disabled={!member}>
                  Start Face Enrollment
                </PremiumButton>
              </div>
            </m.div>
          )}

          {/* ── Camera Step ── */}
          {step === 'camera' && (
            <m.div key="camera" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="rounded-[22px] overflow-hidden mb-5" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 2px 20px rgba(0,0,0,0.07)' }}>
                {/* Member banner */}
                <div className="flex items-center gap-3 px-5 py-3.5" style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: 'rgba(99,102,241,0.10)' }}>
                    <User size={14} style={{ color: '#6366f1' }} />
                  </div>
                  <div>
                    <p className="text-[13px] font-[600]" style={{ color: 'rgb(15,23,42)' }}>{member?.name}</p>
                    <p className="text-[11px]" style={{ color: 'rgb(148,163,184)' }}>Enrolling face descriptor</p>
                  </div>
                  <button onClick={reset} className="ml-auto flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-[8px] hover:bg-slate-100 transition-colors" style={{ color: 'rgb(148,163,184)' }}>
                    <ArrowLeft size={12} />
                    Back
                  </button>
                </div>

                {/* Camera viewport */}
                <div style={{ position: 'relative', width: '100%', maxWidth: 520, margin: '0 auto', aspectRatio: '4/3', background: '#0f172a', minHeight: 260 }}>
                  <video
                    ref={camera.videoRef}
                    autoPlay playsInline muted
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: 'block' }}
                  />
                  <canvas
                    ref={canvasRef}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', transform: 'scaleX(-1)' }}
                  />

                  {/* Model loading overlay — visible while AI models download */}
                  <AnimatePresence>
                    {faceDetect.modelStatus === 'loading' && (
                      <m.div
                        key="model-loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        style={{
                          position: 'absolute', inset: 0,
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          gap: 16,
                          background: 'rgba(15,23,42,0.86)',
                          backdropFilter: 'blur(4px)',
                          padding: 28,
                        }}
                      >
                        {/* Spinner */}
                        <div style={{
                          width: 48, height: 48,
                          border: '3.5px solid rgba(99,102,241,0.25)',
                          borderTopColor: '#6366f1',
                          borderRadius: '50%',
                          animation: 'spin 0.85s linear infinite',
                          flexShrink: 0,
                        }} />
                        <div style={{ textAlign: 'center' }}>
                          <p style={{ color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 6, letterSpacing: '-0.01em' }}>
                            Loading Face AI Models
                          </p>
                          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, minHeight: 18 }}>
                            {faceDetect.loadingModel || 'Initializing…'}
                          </p>
                        </div>
                        {/* Model steps strip */}
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 300 }}>
                          {([
                            { label: 'Detector', key: 'Tiny face detector' },
                            { label: 'Landmarks', key: 'Face landmarks' },
                            { label: 'Recognition', key: 'Face recognition' },
                            { label: 'SSD', key: 'SSD detector' },
                          ] as { label: string; key: string }[]).map(({ label, key }) => {
                            const isCurrent = faceDetect.loadingModel?.startsWith(key);
                            return (
                              <span key={key} style={{
                                fontSize: 10,
                                fontWeight: 600,
                                padding: '3px 8px',
                                borderRadius: 20,
                                background: isCurrent ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.07)',
                                color: isCurrent ? '#c7d2fe' : 'rgba(255,255,255,0.30)',
                                border: `1px solid ${isCurrent ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)'}`,
                                transition: 'all 0.3s ease',
                              }}>{label}</span>
                            );
                          })}
                        </div>
                      </m.div>
                    )}
                  </AnimatePresence>

                  {/* Blink indicator overlay */}
                  <AnimatePresence>
                    {blinkReady && (
                      <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'absolute', top: 12, right: 12, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(16,185,129,0.90)', backdropFilter: 'blur(6px)', borderRadius: 20, padding: '5px 12px' }}>
                        <Eye size={13} color="#fff" />
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>Blink confirmed</span>
                      </m.div>
                    )}
                  </AnimatePresence>

                  {/* Camera error */}
                  {camera.status === 'denied' || camera.status === 'error' ? (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'rgba(15,23,42,0.9)', padding: 24 }}>
                      <XCircle size={32} color="#ef4444" />
                      <p style={{ color: '#fff', fontSize: 14, textAlign: 'center' }}>{camera.error}</p>
                    </div>
                  ) : null}
                </div>

                {/* Status bar */}
                <div className="px-5 py-4" style={{ borderTop: '1px solid #f1f5f9' }}>
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="flex h-2 w-2 rounded-full flex-shrink-0" style={{ background: blinkReady ? '#10b981' : '#6366f1', animation: blinkReady ? 'none' : 'pulse 1.5s infinite' }} />
                    <p className="text-[13px] font-[500]" style={{ color: 'rgb(71,85,105)' }}>
                      {faceDetect.loadingModel || statusMsg}
                    </p>
                  </div>

                  {/* Steps indicator */}
                  <div className="flex items-center gap-3 mb-4 text-[11px]" style={{ color: 'rgb(148,163,184)' }}>
                    <div className="flex items-center gap-1.5">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full" style={{ background: camera.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(148,163,184,0.1)' }}>
                        <Camera size={10} style={{ color: camera.status === 'active' ? '#10b981' : 'rgb(148,163,184)' }} />
                      </div>
                      Camera active
                    </div>
                    <div style={{ flex: 1, height: 1, background: '#f1f5f9' }} />
                    <div className="flex items-center gap-1.5">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full" style={{ background: faceDetect.modelStatus === 'ready' ? 'rgba(16,185,129,0.15)' : faceDetect.modelStatus === 'loading' ? 'rgba(99,102,241,0.15)' : 'rgba(148,163,184,0.1)' }}>
                        <ScanFace size={10} style={{ color: faceDetect.modelStatus === 'ready' ? '#10b981' : faceDetect.modelStatus === 'loading' ? '#6366f1' : 'rgb(148,163,184)' }} />
                      </div>
                      {faceDetect.modelStatus === 'loading' ? 'Loading models…' : faceDetect.modelStatus === 'ready' ? 'Models ready' : 'Face detected'}
                    </div>
                    <div style={{ flex: 1, height: 1, background: '#f1f5f9' }} />
                    <div className="flex items-center gap-1.5">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full" style={{ background: blinkReady ? 'rgba(16,185,129,0.15)' : 'rgba(148,163,184,0.1)' }}>
                        <Eye size={10} style={{ color: blinkReady ? '#10b981' : 'rgb(148,163,184)' }} />
                      </div>
                      Blink confirmed
                    </div>
                  </div>

                  <PremiumButton
                    tone="primary" glow
                    icon={capturing ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                    onClick={captureAndEnroll}
                    disabled={!blinkReady || capturing}
                    loading={capturing}
                  >
                    {capturing ? 'Enrolling…' : blinkReady ? 'Confirm & Enroll Face' : 'Waiting for blink…'}
                  </PremiumButton>
                </div>
              </div>
            </m.div>
          )}

          {/* ── Success Step ── */}
          {step === 'success' && (
            <m.div key="success" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <div className="rounded-[22px] p-8 text-center" style={{ background: 'white', border: '1px solid #bbf7d0', boxShadow: '0 2px 20px rgba(0,0,0,0.07)' }}>
                <m.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                  className="flex justify-center mb-5">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full" style={{ background: 'rgba(16,185,129,0.12)', border: '2px solid rgba(16,185,129,0.3)' }}>
                    <CheckCircle2 size={40} style={{ color: '#10b981' }} />
                  </div>
                </m.div>
                <h2 className="text-[20px] font-[800] mb-2" style={{ color: 'rgb(15,23,42)' }}>Face Enrolled Successfully</h2>
                <p className="text-[13px] mb-1" style={{ color: 'rgb(100,116,139)' }}>
                  <strong style={{ color: 'rgb(15,23,42)' }}>{member?.name}</strong> can now check in using face recognition.
                </p>
                <p className="text-[11px] font-mono mb-6" style={{ color: 'rgb(148,163,184)' }}>client: {enrolledId}</p>

                <div className="flex flex-wrap justify-center gap-3">
                  <PremiumButton tone="primary" glow icon={<ScanFace size={13} />} onClick={reset}>
                    Enroll Another Member
                  </PremiumButton>
                  <PremiumButton tone="secondary" icon={<Trash2 size={13} />}
                    onClick={async () => {
                      try { await api.checkin.revokeEnrollment(enrolledId); }
                      catch {}
                      reset();
                    }}>
                    Undo Enrollment
                  </PremiumButton>
                </div>
              </div>
            </m.div>
          )}

          {/* ── Error Step ── */}
          {step === 'error' && (
            <m.div key="error" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <div className="rounded-[22px] p-8 text-center" style={{ background: 'white', border: '1px solid #fecdd3', boxShadow: '0 2px 20px rgba(0,0,0,0.07)' }}>
                <div className="flex justify-center mb-5">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full" style={{ background: 'rgba(239,68,68,0.10)', border: '2px solid rgba(239,68,68,0.25)' }}>
                    <AlertTriangle size={38} style={{ color: '#ef4444' }} />
                  </div>
                </div>
                <h2 className="text-[18px] font-[800] mb-2" style={{ color: 'rgb(15,23,42)' }}>Enrollment Failed</h2>
                <p className="text-[13px] mb-6" style={{ color: 'rgb(100,116,139)' }}>{errorMsg}</p>
                <PremiumButton tone="primary" glow icon={<RefreshCw size={13} />} onClick={reset}>
                  Try Again
                </PremiumButton>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
