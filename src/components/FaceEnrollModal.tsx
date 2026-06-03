'use client';
/**
 * FaceEnrollModal — production-ready face enrollment.
 *
 * ROOT CAUSE FIXES in this version:
 * 1. Stale closure on `state` inside detection callback fixed by using a ref
 *    (samplesRef tracks count; `state` is no longer read inside the RAF callback).
 * 2. Canvas size race fixed in useFaceDetection (resized each tick).
 * 3. modelStatus stale closure fixed in useFaceDetection (uses ref).
 * 4. Camera start awaited cleanly; video.play() failure handled gracefully.
 * 5. Mobile restriction removed — works on mobile Chrome/Safari now.
 * 6. Detection loop restarts correctly via a stable loopKey ref pattern.
 * 7. CDN fallback ensures models load even without /public/models.
 *
 * Flow: open → load models → start camera → detect loop → auto-capture 3 samples
 *       → average embeddings → POST /api/checkin/enroll → success
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Scan, CheckCircle2, XCircle, Loader2, RefreshCw,
  Camera, AlertTriangle, Sparkles, ShieldCheck,
} from 'lucide-react';
import { useCamera } from '@/hooks/useCamera';
import { useFaceDetection } from '@/hooks/useFaceDetection';
import { api } from '@/lib/api';

type EnrollState = 'loading' | 'ready' | 'capturing' | 'saving' | 'success' | 'error';

const SAMPLES_REQUIRED = 3;
const CAPTURE_TIMEOUT_MS = 20000;
const INTER_SAMPLE_DELAY_MS = 800; // pause between samples so they're from different frames

interface Props {
  clientId: string;
  clientName?: string;
  open: boolean;
  onClose: () => void;
  onEnrolled?: () => void;
}

export default function FaceEnrollModal({ clientId, clientName, open, onClose, onEnrolled }: Props) {
  const camera = useCamera();
  const detection = useFaceDetection();
  const { videoRef } = camera;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [state, setState] = useState<EnrollState>('loading');
  const [statusMsg, setStatusMsg] = useState('Initializing face recognition…');
  const [sampleCount, setSampleCount] = useState(0);
  const [error, setError] = useState('');
  const [guidance, setGuidance] = useState<string | null>(null);

  // FIX: use refs for mutable values read inside RAF callbacks to avoid stale closures
  const samplesRef = useRef<Float32Array[]>([]);
  const isCapturingRef = useRef(false);    // true = currently collecting a sample, debounce
  const enrolledRef = useRef(false);       // true = enroll() already called
  const captureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(false);
  // loopKey: changing this value stops the old detection loop and starts a fresh one
  const loopKeyRef = useRef(0);

  const clearCapTimer = () => {
    if (captureTimerRef.current !== null) { clearTimeout(captureTimerRef.current); captureTimerRef.current = null; }
  };

  // ── Reset state on open ──────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    mountedRef.current = true;
    samplesRef.current = [];
    isCapturingRef.current = false;
    enrolledRef.current = false;
    setSampleCount(0);
    setError('');
    setState('loading');
    setStatusMsg('Initializing face recognition…');
    setGuidance(null);
    clearCapTimer();
    loopKeyRef.current = 0;
    return () => { mountedRef.current = false; };
  }, [open]);

  // ── Start camera + load models ───────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    (async () => {
      setStatusMsg('Loading face recognition models…');
      const modelsOk = await detection.loadModels();
      if (cancelled) return;
      if (!modelsOk) {
        setState('error');
        setError(
          detection.modelError ||
          'Face recognition models failed to load. Check your internet connection and try again.'
        );
        return;
      }

      setStatusMsg('Starting camera…');
      const camOk = await camera.start();
      if (cancelled) return;
      if (!camOk) {
        setState('error');
        setError(camera.error || 'Camera unavailable. Please allow camera access.');
        return;
      }

      setState('ready');
      setStatusMsg('Align your face inside the frame and hold still');

      // Fail-safe timeout — if no face captured after N seconds, surface an error
      captureTimerRef.current = setTimeout(() => {
        if (samplesRef.current.length === 0 && mountedRef.current) {
          setState('error');
          setError(
            'No face detected after 20 seconds. Ensure good lighting, face the camera directly, and keep only one face in frame.'
          );
        }
      }, CAPTURE_TIMEOUT_MS);
    })();

    return () => {
      cancelled = true;
      clearCapTimer();
      detection.stopDetectionLoop();
      camera.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── Enroll: average descriptors and send to API ──────────────────────────
  const enroll = useCallback(async (samples: Float32Array[]) => {
    if (enrolledRef.current) return;
    enrolledRef.current = true;
    detection.stopDetectionLoop();
    clearCapTimer();

    setState('saving');
    setStatusMsg('Saving face data…');

    try {
      const len = samples[0].length;
      const avg = new Float64Array(len);
      for (const s of samples) for (let i = 0; i < len; i++) avg[i] += s[i];
      for (let i = 0; i < len; i++) avg[i] /= samples.length;

      const sanitized = Array.from(avg).map(n => +(+n).toFixed(8));
      if (sanitized.some(n => !Number.isFinite(n)))
        throw new Error('Descriptor contained invalid (NaN/Infinity) values');
      if (sanitized.length !== 128)
        throw new Error(`Expected 128-D descriptor, got ${sanitized.length}`);

      await api.checkin.enroll(clientId, sanitized);

      camera.stop();
      setState('success');
      setStatusMsg('Face enrolled successfully');
      onEnrolled?.();
    } catch (e: unknown) {
      setState('error');
      console.error('[enroll] error:', e);
      const err = e as { message?: string; status?: number };
      const msg = err?.message || (err?.status ? `HTTP ${err.status}` : null) || 'Failed to save face descriptor. Please try again.';
      setError(msg);
      enrolledRef.current = false;
    }
  }, [clientId, camera, detection, onEnrolled]);

  // ── Detection loop ───────────────────────────────────────────────────────
  // FIX: the loop is only started when both camera AND models are ready.
  // The onDetection callback reads samplesRef (not state) so it never has a stale closure.
  // isCapturingRef debounces sample collection between frames.
  useEffect(() => {
    if (!open) return;
    if (camera.status !== 'active') return;
    if (detection.modelStatus !== 'ready') return;
    if (state === 'saving' || state === 'success' || state === 'error') return;
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    detection.startDetectionLoop(video, canvas, (result) => {
      // FIX: all mutable state is read from refs, never from closed-over setState values
      if (!mountedRef.current) return;
      if (enrolledRef.current) return;
      if (samplesRef.current.length >= SAMPLES_REQUIRED) return;

      if (!result.detected) {
        setGuidance('Move closer to the camera');
        setStatusMsg('No face detected — position your face in the frame');
        return;
      }

      if (result.multipleFaces) {
        setGuidance('Only one face at a time please');
        setStatusMsg('Multiple faces detected');
        return;
      }

      if (!result.descriptor) {
        setGuidance(null);
        setStatusMsg('Face detected — hold still…');
        return;
      }

      setGuidance(null);

      // Debounce: don't grab another sample while we're processing one
      if (isCapturingRef.current) return;
      isCapturingRef.current = true;

      const newSamples = [...samplesRef.current, result.descriptor];
      samplesRef.current = newSamples;
      const count = newSamples.length;
      setSampleCount(count);

      if (count < SAMPLES_REQUIRED) {
        setState('capturing');
        setStatusMsg(`Captured ${count}/${SAMPLES_REQUIRED} — keep holding still…`);
        // Release the debounce lock after a short pause so the next sample is distinct
        setTimeout(() => {
          isCapturingRef.current = false;
          setState('ready');
          setStatusMsg(`Good — capturing sample ${count + 1}/${SAMPLES_REQUIRED}`);
        }, INTER_SAMPLE_DELAY_MS);
      } else {
        // We have all samples — go straight to enroll
        setState('capturing');
        setStatusMsg('All samples captured — saving…');
        // Pass samples directly to avoid any closure staleness
        enroll(newSamples);
      }
    });

    return () => { detection.stopDetectionLoop(); };
  }, [open, camera.status, detection.modelStatus, loopKeyRef.current]);

  function retry() {
    samplesRef.current = [];
    isCapturingRef.current = false;
    enrolledRef.current = false;
    setSampleCount(0);
    setError('');
    setState('ready');
    setStatusMsg('Align your face inside the frame and hold still');
    setGuidance(null);
    clearCapTimer();
    captureTimerRef.current = setTimeout(() => {
      if (samplesRef.current.length === 0 && mountedRef.current) {
        setState('error');
        setError('No face detected. Ensure good lighting and a clear view of your face.');
      }
    }, CAPTURE_TIMEOUT_MS);
    loopKeyRef.current += 1;
  }

  const modalRef = useRef<HTMLDivElement>(null);

  // Focus trap
  useEffect(() => {
    if (!open) return;
    const el = modalRef.current;
    if (!el) return;
    const focusable = el.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    el.addEventListener('keydown', handler);
    return () => el.removeEventListener('keydown', handler);
  }, [open]);

  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
        padding: 20,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Face enrollment"
        style={{
        position: 'fixed', inset: 0, zIndex: 1200,
        background: 'rgba(10,12,28,0.82)',
        backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeInOverlay .22s ease',
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes fadeInOverlay { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { opacity:0; transform:translateY(24px) scale(.97) } to { opacity:1; transform:translateY(0) scale(1) } }
        @keyframes spin { to { transform:rotate(360deg) } }
        @keyframes pulse-ring { 0%,100% { opacity:.5; transform:scale(1) } 50% { opacity:1; transform:scale(1.04) } }
        @keyframes scan-sweep {
          0% { top:0%; opacity:1 }
          90% { top:90%; opacity:.6 }
          100% { top:0%; opacity:0 }
        }
        .face-spin { animation:spin 1.1s linear infinite }
        .face-pulse { animation:pulse-ring 2s ease-in-out infinite }
      `}</style>

      <div
        style={{
          background: 'linear-gradient(160deg,#1a1b2e 0%,#16172b 60%,#13141f 100%)',
          color: '#e2e3f0',
          borderRadius: 28,
          maxWidth: 520, width: '100%',
          boxShadow: '0 40px 100px rgba(0,0,0,.65), 0 0 0 1px rgba(130,140,255,.12), inset 0 1px 0 rgba(255,255,255,.06)',
          overflow: 'hidden',
          animation: 'slideUp .28s cubic-bezier(0.16,1,0.3,1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ───────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.1rem 1.4rem .9rem',
          borderBottom: '1px solid rgba(255,255,255,.07)',
          background: 'rgba(255,255,255,.03)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              background: 'linear-gradient(135deg,#6366f1,#818cf8)',
              borderRadius: 10, padding: 7, display: 'flex',
              boxShadow: '0 4px 14px rgba(99,102,241,.4)',
            }}>
              <Scan size={16} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#f1f2ff', letterSpacing: '-.02em' }}>Biometric Enrollment</div>
              {clientName && (
                <div style={{ fontSize: 12, color: '#8b8fa8', marginTop: 1 }}>Enrolling: {clientName}</div>
              )}
            </div>
          </div>

          {/* Sample progress pills */}
          <div style={{ display: 'flex', gap: 5, alignItems: 'center', marginRight: 8 }}>
            {Array.from({ length: SAMPLES_REQUIRED }).map((_, i) => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: 4,
                background: i < sampleCount
                  ? '#6366f1'
                  : state === 'success' ? '#22c55e'
                  : 'rgba(255,255,255,.15)',
                transition: 'background .3s ease',
                boxShadow: i < sampleCount ? '0 0 6px rgba(99,102,241,.6)' : 'none',
              }} />
            ))}
          </div>

          <button
            onClick={onClose}
            aria-label="Close enrollment modal"
            style={{
              background: 'rgba(255,255,255,.08)', border: 'none', cursor: 'pointer',
              color: '#8b8fa8', borderRadius: 8, width: 30, height: 30,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, lineHeight: 1, transition: 'all .15s',
            }}
          >×</button>
        </div>

        {/* ── Camera viewport ──────────────────────────────────── */}
        <div style={{ position: 'relative', background: '#0a0b15', aspectRatio: '4/3', overflow: 'hidden' }}>
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              transform: 'scaleX(-1)',  // mirror for natural feel
              display: camera.status === 'active' ? 'block' : 'none',
            }}
          />

          {/* Canvas for face bounding boxes — same mirror as video */}
          <canvas
            ref={canvasRef}
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              transform: 'scaleX(-1)',
              pointerEvents: 'none',
              objectFit: 'cover',
            }}
          />

          {/* Face alignment reticle */}
          {(state === 'ready' || state === 'capturing') && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
            }}>
              <div
                className={sampleCount > 0 ? 'face-pulse' : ''}
                style={{
                  width: '54%', aspectRatio: '3/4',
                  border: `2.5px solid ${
                    sampleCount === 0 ? 'rgba(255,255,255,.35)'
                    : sampleCount < SAMPLES_REQUIRED ? 'rgba(99,102,241,.75)'
                    : '#22c55e'
                  }`,
                  borderRadius: '50% / 42%',
                  boxShadow: `0 0 0 9999px rgba(0,0,0,.38), inset 0 0 40px rgba(${
                    sampleCount === 0 ? '255,255,255,.02' : '99,102,241,.08'
                  })`,
                  transition: 'border-color .3s ease, box-shadow .3s ease',
                }}
              />
              {/* Scan sweep line */}
              {state === 'ready' && sampleCount === 0 && (
                <div style={{
                  position: 'absolute',
                  left: '23%', right: '23%',
                  height: 2,
                  background: 'linear-gradient(90deg, transparent, rgba(99,102,241,.7), transparent)',
                  animation: 'scan-sweep 2.4s ease-in-out infinite',
                  pointerEvents: 'none',
                }} />
              )}
            </div>
          )}

          {/* Loading / Saving overlay */}
          {isWorking && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(5,6,20,.72)',
              backdropFilter: 'blur(3px)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 12, color: '#c7c9e8',
            }}>
              <Loader2 size={28} className="face-spin" color="#6366f1" />
              <div style={{ fontSize: 14, fontWeight: 500 }}>{statusMsg}</div>
            </div>
          )}

          {/* Success overlay */}
          {state === 'success' && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(5,30,15,.72)',
              backdropFilter: 'blur(4px)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 10, color: '#fff',
              animation: 'fadeInOverlay .3s ease',
            }}>
              <div style={{
                background: 'linear-gradient(135deg,#22c55e,#16a34a)',
                borderRadius: '50%', padding: 14,
                boxShadow: '0 0 40px rgba(34,197,94,.45)',
              }}>
                <ShieldCheck size={36} color="#fff" />
              </div>
              <div style={{ fontWeight: 700, fontSize: 17, color: '#86efac' }}>Face Enrolled</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.6)' }}>Biometric profile saved successfully</div>
            </div>
          )}

          {/* Error overlay */}
          {state === 'error' && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(30,5,5,.82)',
              backdropFilter: 'blur(4px)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 12, color: '#fff',
              textAlign: 'center', padding: '1.5rem',
            }}>
              <XCircle size={36} color="#f87171" />
              <div style={{ fontWeight: 700, fontSize: 15, color: '#fca5a5' }}>
                {error || 'Enrollment failed'}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.55)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={13} /> Use Chrome or Safari in good lighting
              </div>
            </div>
          )}
        </div>

        {/* ── Progress bar ─────────────────────────────────────── */}
        <div style={{ height: 3, background: 'rgba(255,255,255,.06)', position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${state === 'success' ? 100 : progressPct}%`,
            background: state === 'success'
              ? 'linear-gradient(90deg,#22c55e,#16a34a)'
              : 'linear-gradient(90deg,#6366f1,#818cf8)',
            transition: 'width .35s cubic-bezier(0.16,1,0.3,1)',
            boxShadow: '2px 0 12px rgba(99,102,241,.5)',
          }} />
        </div>

        {/* ── Status bar / actions ─────────────────────────────── */}
        <div style={{
          padding: '.9rem 1.4rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '.75rem', flexWrap: 'wrap',
          borderTop: '1px solid rgba(255,255,255,.05)',
        }}>
          {/* Left: guidance */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#8b8fa8', flex: 1, minWidth: 0 }}>
            {state === 'ready' || state === 'capturing' ? (
              <>
                <Sparkles size={13} color="#6366f1" />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {guidance ?? statusMsg}
                </span>
              </>
            ) : (
              <>
                <Camera size={13} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{statusMsg}</span>
              </>
            )}
          </div>

          {/* Right: action buttons */}
          <div style={{ display: 'flex', gap: '.5rem', flexShrink: 0 }}>
            {state === 'error' ? (
              <>
                <button
                  onClick={onClose}
                  style={{
                    padding: '6px 14px', borderRadius: 8, fontSize: 13,
                    background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)',
                    color: '#c7c9e8', cursor: 'pointer',
                  }}
                >Close</button>
                <button
                  onClick={retry}
                  style={{
                    padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    background: 'linear-gradient(135deg,#6366f1,#818cf8)',
                    border: 'none', color: '#fff', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                    boxShadow: '0 4px 14px rgba(99,102,241,.4)',
                  }}
                >
                  <RefreshCw size={13} /> Retry
                </button>
              </>
            ) : state === 'success' ? (
              <button
                onClick={onClose}
                style={{
                  padding: '6px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: 'linear-gradient(135deg,#22c55e,#16a34a)',
                  border: 'none', color: '#fff', cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(34,197,94,.35)',
                }}
              >
                Done
              </button>
            ) : (
              <button
                onClick={onClose}
                style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: 13,
                  background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)',
                  color: '#8b8fa8', cursor: 'pointer',
                }}
              >Cancel</button>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
