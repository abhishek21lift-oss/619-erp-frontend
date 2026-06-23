'use client';
/**
 * KioskContent — the actual kiosk UI loaded client-side only.
 *
 * Dual-mode check-in:
 *   FACE MODE  — uses face-api.js + blink anti-spoof, same hooks as CheckInContent
 *   QR MODE    — uses jsQR to decode camera frames
 *
 * State machine: idle → [face|qr]_scan → processing → result → (7s) → idle
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ScanFace, QrCode, CheckCircle2, XCircle, AlertTriangle,
  Loader2, RefreshCw, Clock,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useCamera } from '@/hooks/useCamera';
import { useFaceDetection } from '@/hooks/useFaceDetection';
import { useAntiSpoof } from '@/hooks/useAntiSpoof';
import type { DetectionResult } from '@/types/checkin';

type Mode   = 'face' | 'qr';
type KState = 'welcome' | 'loading' | 'scanning' | 'liveness' | 'processing' | 'success' | 'error' | 'expired' | 'duplicate';

type KResult = { name: string; message: string; photo?: string; memberCode?: string; success: boolean };

let jsQR: ((d: Uint8ClampedArray, w: number, h: number) => { data: string } | null) | null = null;

const COLORS: Record<KState, string> = {
  welcome:    '#6366f1',
  loading:    '#8b5cf6',
  scanning:   '#06b6d4',
  liveness:   '#f59e0b',
  processing: '#8b5cf6',
  success:    '#10b981',
  error:      '#ef4444',
  expired:    '#f59e0b',
  duplicate:  '#06b6d4',
};

function Clock2() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{time}</span>;
}

const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5-minute idle timeout for kiosk security

export default function KioskContent() {
  const [mode,   setMode]   = useState<Mode>('face');
  const [kstate, setKState] = useState<KState>('welcome');
  const [result, setResult] = useState<KResult | null>(null);
  const [msg,    setMsg]    = useState('Welcome! Please scan your face or QR code.');

  const { logout } = useAuth();
  const router = useRouter();
  const camera    = useCamera();
  const detection = useFaceDetection();
  const antiSpoof = useAntiSpoof();
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const qrCanvasRef  = useRef<HTMLCanvasElement>(null);
  const rafRef       = useRef<number>(0);
  const cooldownRef  = useRef<number>(0);
  const resetTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.05;
    window.speechSynthesis.speak(u);
  }, []);

  // ── Idle timeout — logs out and redirects after 5 minutes of inactivity ──
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      logout();
      router.replace('/login');
    }, IDLE_TIMEOUT_MS);
  }, [logout, router]);

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'touchstart', 'click'] as const;
    events.forEach((e) => document.addEventListener(e, resetIdleTimer));
    resetIdleTimer(); // start the timer on mount
    return () => {
      events.forEach((e) => document.removeEventListener(e, resetIdleTimer));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [resetIdleTimer]);

  const scheduleReset = useCallback(() => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => {
      setResult(null);
      setKState('scanning');
      setMsg(mode === 'face' ? 'Position your face in the guide' : 'Hold your QR code up to the camera');
      antiSpoof.reset();
      cooldownRef.current = 0;
    }, 7000);
  }, [mode, antiSpoof]);

  const handleResult = useCallback((res: KResult) => {
    setResult(res);
    setKState(res.success ? 'success' : 'error');
    setMsg(res.message);
    speak(res.message);
    scheduleReset();
  }, [speak, scheduleReset]);

  // ── Face recognition ──────────────────────────────────────────────────────
  const runFaceRecognition = useCallback(async (descriptor: Float32Array) => {
    if (Date.now() < cooldownRef.current) return;
    cooldownRef.current = Date.now() + 8000;
    setKState('processing');
    setMsg('Verifying identity…');
    try {
      const data = await api.checkin.face(Array.from(descriptor));
      if (!data.success) {
        handleResult({ success: false, name: 'Unknown', message: 'Face not recognized. Please try QR check-in.' });
      } else {
        const ok = (data.member?.status || 'active') === 'active';
        handleResult({
          success: ok,
          name: data.member?.name || '',
          message: ok ? `Welcome, ${data.member?.name}!` : `Membership ${data.member?.status}`,
          photo: data.member?.photo_url,
          memberCode: data.member?.member_code,
        });
      }
    } catch {
      handleResult({ success: false, name: '', message: 'Network error. Please try again.' });
    }
  }, [handleResult]);

  const handleFaceDetection = useCallback((d: DetectionResult) => {
    if (Date.now() < cooldownRef.current) return;
    if (!d.detected) { setMsg('Position your face in the guide'); return; }
    if (d.multipleFaces) { setMsg('One person at a time please'); return; }
    if (d.landmarks) antiSpoof.processFaceLandmarks(d.landmarks);
    if (!antiSpoof.blinkDetected) {
      setKState('liveness');
      setMsg('Please blink once to verify');
      return;
    }
    if (kstate !== 'processing' && d.descriptor) {
      setKState('processing');
      void runFaceRecognition(d.descriptor);
    }
  }, [kstate, antiSpoof, runFaceRecognition]);

  // ── QR scanning ───────────────────────────────────────────────────────────
  const startQrLoop = useCallback(() => {
    const video  = camera.videoRef.current;
    const canvas = qrCanvasRef.current;
    if (!video || !canvas || !jsQR) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    function tick() {
      if (!video || video.readyState < 2) { rafRef.current = requestAnimationFrame(tick); return; }
      canvas!.width  = video.videoWidth;
      canvas!.height = video.videoHeight;
      ctx!.drawImage(video, 0, 0);
      if (Date.now() < cooldownRef.current) { rafRef.current = requestAnimationFrame(tick); return; }
      const imgData = ctx!.getImageData(0, 0, canvas!.width, canvas!.height);
      const code = jsQR!(imgData.data, imgData.width, imgData.height);
      if (code?.data) {
        cooldownRef.current = Date.now() + 8000;
        setKState('processing');
        setMsg('Verifying QR code…');
        api.qr.scan({ payload: code.data }).then((data) => {
          if (data.success) {
            handleResult({ success: true, name: data.user?.name || '', message: `Welcome, ${data.user?.name}!`, photo: data.user?.photo_url, memberCode: data.user?.member_code || undefined });
          } else if (data.duplicate) {
            setKState('duplicate');
            setMsg(data.message);
            setResult({ success: true, name: data.user?.name || '', message: data.message });
            scheduleReset();
          } else {
            handleResult({ success: false, name: data.user?.name || '', message: data.message });
          }
        }).catch(() => handleResult({ success: false, name: '', message: 'Network error. Try again.' }));
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [camera.videoRef, handleResult, scheduleReset]);

  // ── Mode switch ───────────────────────────────────────────────────────────
  const switchMode = useCallback(async (newMode: Mode) => {
    cancelAnimationFrame(rafRef.current);
    detection.stopDetectionLoop();
    antiSpoof.reset();
    cooldownRef.current = 0;
    setResult(null);
    setKState('loading');
    setMode(newMode);
    setMsg('Starting camera…');

    if (newMode === 'face') {
      const modOk = await detection.loadModels();
      if (!modOk) { setMsg(detection.modelError || 'Could not load face models'); setKState('error'); return; }
      const camOk = await camera.start();
      if (!camOk) { setMsg('Camera unavailable.'); setKState('scanning'); return; }
      setKState('scanning');
      setMsg('Position your face in the guide');
    } else {
      // QR mode
      if (!jsQR) {
        const mod = await import('jsqr');
        jsQR = (mod.default || mod) as unknown as typeof jsQR;
      }
      const camOk = await camera.start();
      if (!camOk) { setMsg('Camera unavailable.'); setKState('scanning'); return; }
      setKState('scanning');
      setMsg('Hold your QR code up to the camera');
      startQrLoop();
    }
  }, [detection, antiSpoof, camera, startQrLoop]);

  // ── Init: start face mode by default ─────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setKState('loading');
      setMsg('Loading face recognition…');
      const modOk = await detection.loadModels();
      if (cancelled) return;
      if (!modOk) { setMsg(detection.modelError || 'Could not load models'); setKState('error'); return; }
      const camOk = await camera.start();
      if (cancelled) return;
      if (!camOk) { setMsg('Camera unavailable.'); return; }
      setKState('scanning');
      setMsg('Position your face in the guide');
    })();
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      detection.stopDetectionLoop();
      camera.stop();
      if (resetTimer.current) clearTimeout(resetTimer.current);
      window.speechSynthesis?.cancel();
    };
  }, []); // eslint-disable-line

  // ── Start detection loop when face mode is ready ──────────────────────────
  // Destructure stable references to avoid the whole `detection` object
  // (new plain object every render) triggering a loop restart on every render.
  const { modelStatus: detModelStatus, startDetectionLoop, stopDetectionLoop } = detection;
  useEffect(() => {
    if (mode !== 'face') return;
    if (camera.status !== 'active' || detModelStatus !== 'ready') return;
    if (!camera.videoRef.current || !canvasRef.current) return;
    startDetectionLoop(camera.videoRef.current, canvasRef.current, handleFaceDetection);
    return () => stopDetectionLoop();
  }, [mode, camera.status, camera.videoRef, detModelStatus, startDetectionLoop, stopDetectionLoop, handleFaceDetection]);

  const color = COLORS[kstate];
  const isSuccess = kstate === 'success';
  const isError   = kstate === 'error' || kstate === 'expired';
  const isDup     = kstate === 'duplicate';

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column', overflow: 'hidden', userSelect: 'none' }}>
      <style>{`
        @keyframes kk-scan { 0% { top: 8%; } 100% { top: 88%; } }
        @keyframes kk-pulse { 0%,100% { opacity: 0.7; } 50% { opacity: 1; } }
        @keyframes kk-spin { to { transform: rotate(360deg); } }
        @keyframes kk-bounce { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        button, [role=button] { touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
        @media (max-width: 480px) {
          .kk-msg { font-size: 16px !important; }
          .kk-viewport { max-width: 100% !important; }
          .kk-face-ring { width: 160px !important; height: 160px !important; }
          .kk-btn { min-height: 48px !important; font-size: 15px !important; padding: 12px 20px !important; }
        }
      `}</style>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ScanFace size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>619 FITNESS</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Self Check-In Kiosk</div>
          </div>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.7)', fontVariantNumeric: 'tabular-nums' }}>
          <Clock2 />
        </div>
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', gap: 20 }}>

        {/* Camera viewport */}
        <div className="kk-viewport" style={{ position: 'relative', width: '100%', maxWidth: 520, borderRadius: 24, overflow: 'hidden', border: `2px solid ${color}40`, boxShadow: `0 0 40px ${color}20` }}>
          <video ref={camera.videoRef} autoPlay playsInline muted style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', transform: mode === 'face' ? 'scaleX(-1)' : 'none', display: 'block' }} />
          <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', transform: mode === 'face' ? 'scaleX(-1)' : 'none', display: mode === 'face' ? 'block' : 'none' }} />
          <canvas ref={qrCanvasRef} style={{ display: 'none' }} />

          {/* Face guide ring */}
          {mode === 'face' && (kstate === 'scanning' || kstate === 'liveness') && (
            <div className="kk-face-ring" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 200, height: 200, borderRadius: '50%', border: `2px solid ${color}`, pointerEvents: 'none', animation: 'kk-pulse 2s ease-in-out infinite', boxShadow: `0 0 30px ${color}30` }} />
          )}

          {/* QR scan frame */}
          {mode === 'qr' && kstate === 'scanning' && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 200, height: 200 }}>
              {[0,1,2,3].map((i) => {
                const isRight = i === 1 || i === 3;
                const isBottom = i === 2 || i === 3;
                return <div key={i} style={{ position: 'absolute', width: 28, height: 28, right: isRight ? 0 : undefined, left: isRight ? undefined : 0, bottom: isBottom ? 0 : undefined, top: isBottom ? undefined : 0, borderRight: isRight ? `3px solid #06b6d4` : 'none', borderLeft: isRight ? 'none' : `3px solid #06b6d4`, borderBottom: isBottom ? `3px solid #06b6d4` : 'none', borderTop: isBottom ? 'none' : `3px solid #06b6d4`, animation: 'kk-pulse 1.5s ease-in-out infinite', animationDelay: `${i*0.12}s` }} />;
              })}
              <div style={{ position: 'absolute', left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,#06b6d4,transparent)', animation: 'kk-scan 2s ease-in-out infinite', boxShadow: '0 0 8px rgba(6,182,212,0.5)' }} />
            </div>
          )}

          {/* Result overlay */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: isSuccess ? 'rgba(16,185,129,0.88)' : isDup ? 'rgba(6,182,212,0.88)' : 'rgba(239,68,68,0.88)', backdropFilter: 'blur(6px)', padding: 24 }}
              >
                {isSuccess ? <CheckCircle2 size={72} color="#fff" style={{ animation: 'kk-bounce 0.6s ease' }} /> : isDup ? <Clock size={72} color="#fff" /> : <XCircle size={72} color="#fff" />}
                <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', textAlign: 'center', lineHeight: 1.2 }}>{result.name || (isSuccess ? 'Check-in OK' : 'Failed')}</div>
                <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.9)', textAlign: 'center' }}>{result.message}</div>
                {result.memberCode && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>#{result.memberCode}</div>}
                <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Returning in a moment…</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Status message */}
        <motion.div
          key={msg}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', maxWidth: 400 }}
        >
          <div className="kk-msg" style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{kstate === 'loading' && detection.loadingModel ? detection.loadingModel : msg}</div>
          {kstate === 'liveness' && (
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>This confirms you are a real person</div>
          )}
          {kstate === 'scanning' && mode === 'face' && (
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>Blink once when prompted</div>
          )}
        </motion.div>

        {/* Mode toggle tabs */}
        <div style={{ display: 'flex', gap: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 6, border: '1px solid rgba(255,255,255,0.1)' }}>
          {(['face', 'qr'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              disabled={kstate === 'processing' || mode === m}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 12, border: 'none', cursor: mode === m ? 'default' : 'pointer', fontSize: 14, fontWeight: 700, transition: 'all 0.2s', minHeight: 48, touchAction: 'manipulation',
                background: mode === m ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'transparent',
                color: mode === m ? '#fff' : 'rgba(255,255,255,0.4)',
                boxShadow: mode === m ? '0 4px 16px rgba(99,102,241,0.3)' : 'none',
              }}
            >
              {m === 'face' ? <ScanFace size={18} /> : <QrCode size={18} />}
              {m === 'face' ? 'Face Scan' : 'QR Code'}
            </button>
          ))}
        </div>

        {/* State indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 20, background: `${color}15`, border: `1px solid ${color}30`, color }}>
          {(kstate === 'loading' || kstate === 'processing') && (
            <Loader2 size={12} style={{ animation: 'kk-spin 0.9s linear infinite' }} />
          )}
          {kstate === 'success' && <CheckCircle2 size={12} />}
          {kstate === 'error' && <XCircle size={12} />}
          {!['loading','processing','success','error'].includes(kstate) && <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, animation: kstate === 'scanning' ? 'kk-pulse 1.5s ease-in-out infinite' : 'none' }} />}
          <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {kstate === 'welcome' ? 'Ready' : kstate === 'loading' ? 'Loading…' : kstate === 'scanning' ? 'Scanning' : kstate === 'liveness' ? 'Blink to verify' : kstate === 'processing' ? 'Verifying…' : kstate === 'success' ? 'Checked In' : kstate === 'duplicate' ? 'Already In' : 'Failed'}
          </span>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ padding: '12px 24px', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>619 Fitness Studio · Kiosk Mode</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>Face descriptors are never stored on this device</span>
      </div>
    </div>
  );
}
