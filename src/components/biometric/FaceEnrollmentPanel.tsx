'use client';
/**
 * FaceEnrollmentPanel — real camera face enrollment
 *
 * SSR-safe:  this file is only ever loaded via FaceEnrollmentClient.tsx
 *            which wraps it with next/dynamic({ ssr: false }).
 * face-api.js is imported lazily inside useFaceDetection (already guarded
 * by typeof window and the dynamic import pattern).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle, AlertCircle, Camera, RotateCcw, Loader2, User } from 'lucide-react';
import { useFaceDetection } from '@/hooks/useFaceDetection';
import { api } from '@/lib/api';

type EnrollStep = 'idle' | 'starting' | 'detecting' | 'capturing' | 'saving' | 'success' | 'error';

interface Props {
  clientId: string;
  clientName?: string;
  onEnrolled?: () => void;
}

export default function FaceEnrollmentPanel({ clientId, clientName, onEnrolled }: Props) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [step,    setStep]    = useState<EnrollStep>('idle');
  const [message, setMessage] = useState('');
  const [hasFace, setHasFace] = useState(false);
  const [faceBox, setFaceBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const capturedDescriptorRef = useRef<Float32Array | null>(null);

  const { modelStatus, modelError, loadModels, startDetectionLoop, stopDetectionLoop } =
    useFaceDetection();

  // ── open camera + load models ──────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setStep('starting');
    setMessage('');
    setHasFace(false);
    setFaceBox(null);
    capturedDescriptorRef.current = null;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const ok = await loadModels();
      if (!ok) throw new Error(modelError || 'Models failed to load');

      setStep('detecting');

      if (videoRef.current && canvasRef.current) {
        startDetectionLoop(videoRef.current, canvasRef.current, (result) => {
          if (result.detected && !result.multipleFaces && result.descriptor) {
            setHasFace(true);
            setFaceBox(result.box ?? null);
            capturedDescriptorRef.current = result.descriptor;
          } else {
            setHasFace(false);
            setFaceBox(null);
            if (!result.detected) capturedDescriptorRef.current = null;
          }
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not open camera';
      setMessage(msg.includes('Permission') || msg.includes('NotAllowed')
        ? 'Camera permission denied. Allow camera access and try again.'
        : msg);
      setStep('error');
    }
  }, [loadModels, modelError, startDetectionLoop]);

  // ── stop camera cleanly ────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    stopDetectionLoop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, [stopDetectionLoop]);

  useEffect(() => () => { stopCamera(); }, [stopCamera]);

  // ── enroll captured descriptor ─────────────────────────────────────────────
  const enrollFace = useCallback(async () => {
    const descriptor = capturedDescriptorRef.current;
    if (!descriptor) { setMessage('No face detected. Position your face in the frame.'); return; }

    setStep('capturing');
    await new Promise((r) => setTimeout(r, 300)); // brief freeze feedback
    setStep('saving');

    try {
      await api.checkin.enroll(clientId, Array.from(descriptor));
      stopCamera();
      setStep('success');
      onEnrolled?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Enrollment failed';
      setMessage(msg);
      setStep('error');
    }
  }, [clientId, stopCamera, onEnrolled]);

  const reset = useCallback(() => {
    stopCamera();
    setStep('idle');
    setMessage('');
    setHasFace(false);
    setFaceBox(null);
    capturedDescriptorRef.current = null;
  }, [stopCamera]);

  // ─────────────────────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────────────────────

  const isLive = step === 'detecting' || step === 'capturing';

  return (
    <div style={{ borderRadius: 20, background: 'var(--bg-card)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
      {/* header */}
      <div style={{ padding: '18px 22px', borderBottom: '1px solid rgba(226,232,240,0.6)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Camera size={16} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Face Enrollment</div>
          <div style={{ fontSize: 12, color: 'var(--text-disabled)' }}>Register your face for camera check-in</div>
        </div>
        {step === 'success' && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 99, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
            <CheckCircle size={12} color="#059669" />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#059669' }}>Enrolled</span>
          </div>
        )}
      </div>

      <div style={{ padding: 22 }}>

        {/* ── IDLE ─────────────────────────────────────────────── */}
        {step === 'idle' && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', margin: '0 auto 16px', background: 'rgba(99,102,241,0.08)', border: '2px dashed rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={32} color="#a5b4fc" />
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              Position your face in the camera frame and click <strong>Enroll Face</strong>.
            </p>
            <button
              onClick={startCamera}
              style={{ padding: '10px 28px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}
            >
              Open Camera
            </button>
          </div>
        )}

        {/* ── STARTING / model loading ──────────────────────────── */}
        {step === 'starting' && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <Loader2 size={36} color="#6366f1" style={{ margin: '0 auto 12px', display: 'block', animation: 'spin 1s linear infinite' }} />
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Starting camera &amp; loading AI models…</p>
          </div>
        )}

        {/* ── LIVE FEED ─────────────────────────────────────────── */}
        {(isLive || step === 'saving') && (
          <div>
            <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', background: 'var(--text-primary)', aspectRatio: '4/3' }}>
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transform: 'scaleX(-1)' }}
              />
              <canvas
                ref={canvasRef}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', transform: 'scaleX(-1)' }}
              />
              {/* face status overlay */}
              <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', padding: '5px 14px', borderRadius: 99, background: hasFace ? 'rgba(16,185,129,0.85)' : 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: hasFace ? '#fff' : '#f59e0b', flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>
                  {step === 'saving' ? 'Saving…' : hasFace ? 'Face detected — ready to enroll' : 'Looking for face…'}
                </span>
              </div>
              {/* bounding box debug info */}
              {hasFace && faceBox && (
                <div style={{ position: 'absolute', bottom: 10, right: 10, padding: '3px 8px', borderRadius: 6, background: 'rgba(99,102,241,0.7)', fontSize: 10, color: '#fff', fontWeight: 600 }}>
                  {Math.round(faceBox.width)}×{Math.round(faceBox.height)}px
                </div>
              )}
            </div>

            {/* action row */}
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button
                onClick={reset}
                disabled={step === 'saving'}
                style={{ flex: '0 0 auto', padding: '9px 14px', borderRadius: 10, border: '1px solid rgba(226,232,240,0.7)', background: 'var(--bg-subtle)', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={enrollFace}
                disabled={!hasFace || step === 'saving'}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 10, border: 'none',
                  background: hasFace && step !== 'saving' ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(203,213,225,0.6)',
                  color: hasFace && step !== 'saving' ? '#fff' : 'var(--text-disabled)',
                  fontSize: 13, fontWeight: 700,
                  cursor: hasFace && step !== 'saving' ? 'pointer' : 'not-allowed',
                  boxShadow: hasFace && step !== 'saving' ? '0 4px 14px rgba(99,102,241,0.35)' : 'none',
                  transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                }}
              >
                {step === 'saving' ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : 'Enroll Face'}
              </button>
            </div>

            {!hasFace && step === 'detecting' && (
              <p style={{ fontSize: 11, color: 'var(--text-disabled)', textAlign: 'center', marginTop: 10 }}>
                Make sure your face is well-lit and centred in the frame.
              </p>
            )}
          </div>
        )}

        {/* ── SUCCESS ──────────────────────────────────────────── */}
        {step === 'success' && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', margin: '0 auto 16px', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={36} color="#10b981" />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
              Face enrolled for {clientName ?? 'member'}!
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>They can now check in using the face recognition camera.</p>
            <button
              onClick={reset}
              style={{ padding: '9px 22px', borderRadius: 10, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.06)', color: '#6366f1', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <RotateCcw size={12} /> Re-enroll
            </button>
          </div>
        )}

        {/* ── ERROR ────────────────────────────────────────────── */}
        {step === 'error' && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', margin: '0 auto 14px', background: 'rgba(244,63,94,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertCircle size={28} color="#e11d48" />
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 18 }}>{message}</p>
            <button
              onClick={reset}
              style={{ padding: '9px 22px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }}
            >
              <RotateCcw size={12} /> Try Again
            </button>
          </div>
        )}

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
