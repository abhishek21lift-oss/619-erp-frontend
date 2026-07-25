'use client';
/**
 * KioskContent — the actual kiosk UI loaded client-side only.
 *
 * QR-only check-in: uses jsQR to decode camera frames of a member's QR code.
 * (This used to also support a face-recognition mode; that system has been
 * removed from the app, so the kiosk is QR-only now.)
 *
 * State machine: idle → scanning → processing → result → (7s) → idle
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  QrCode, CheckCircle2, XCircle,
  Loader2, Clock, SwitchCamera,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useCamera } from '@/hooks/useCamera';

type KState = 'welcome' | 'loading' | 'scanning' | 'processing' | 'success' | 'error' | 'expired' | 'duplicate';

type KResult = { name: string; message: string; photo?: string; memberCode?: string; success: boolean };

let jsQR: ((d: Uint8ClampedArray, w: number, h: number) => { data: string } | null) | null = null;

const COLORS: Record<KState, string> = {
  welcome:    '#6366f1',
  loading:    '#8b5cf6',
  scanning:   '#06b6d4',
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
  const [kstate, setKState] = useState<KState>('welcome');
  const [result, setResult] = useState<KResult | null>(null);
  const [msg,    setMsg]    = useState('Welcome! Please hold your QR code up to the camera.');

  const { logout } = useAuth();
  const router = useRouter();
  const camera = useCamera();
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
    import('jsqr').then(mod => { jsQR = (mod.default || mod) as unknown as typeof jsQR; }).catch(() => {});
  }, []);

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
      setMsg('Hold your QR code up to the camera');
      cooldownRef.current = 0;
    }, 7000);
  }, []);

  const handleResult = useCallback((res: KResult) => {
    setResult(res);
    setKState(res.success ? 'success' : 'error');
    setMsg(res.message);
    speak(res.message);
    scheduleReset();
  }, [speak, scheduleReset]);

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

  // ── Flip camera — manual override for kiosk hardware with only one usable
  //    camera facing the wrong way ──────────────────────────────────────────
  const flipCamera = useCallback(async () => {
    if (kstate === 'processing') return;
    const next = camera.facingMode === 'user' ? 'environment' : 'user';
    await camera.start(next);
  }, [camera, kstate]);

  // ── Init: rear camera, start scanning ─────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setKState('loading');
      setMsg('Starting camera…');
      if (!jsQR) {
        const mod = await import('jsqr');
        jsQR = (mod.default || mod) as unknown as typeof jsQR;
      }
      const camOk = await camera.start('environment');
      if (cancelled) return;
      if (!camOk) { setMsg('Camera unavailable.'); setKState('error'); return; }
      setKState('scanning');
      setMsg('Hold your QR code up to the camera');
    })();
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      camera.stop();
      if (resetTimer.current) clearTimeout(resetTimer.current);
      window.speechSynthesis?.cancel();
    };
  }, []); // eslint-disable-line

  // ── Start the QR scan loop once the camera is live ────────────────────────
  useEffect(() => {
    if (camera.status !== 'active') return;
    startQrLoop();
    return () => cancelAnimationFrame(rafRef.current);
  }, [camera.status, startQrLoop]);

  const color = COLORS[kstate];
  const isSuccess = kstate === 'success';
  const isError   = kstate === 'error' || kstate === 'expired';
  const isDup     = kstate === 'duplicate';

  return (
    <div
      className="kk-root"
      style={{
        minHeight: '100dvh',
        background: 'var(--bg-subtle)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        overscrollBehaviorY: 'contain',
        WebkitOverflowScrolling: 'touch',
        userSelect: 'none',
      }}
    >
      <style>{`
        @keyframes kk-scan { 0% { top: 8%; } 100% { top: 88%; } }
        @keyframes kk-pulse { 0%,100% { opacity: 0.7; } 50% { opacity: 1; } }
        @keyframes kk-spin { to { transform: rotate(360deg); } }
        @keyframes kk-bounce { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        button, [role=button] { touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
        .kk-video, .kk-canvas { aspect-ratio: 4/3; }
        .kk-topbar { padding: 16px 24px; padding-top: max(16px, env(safe-area-inset-top)); }
        .kk-bottombar { padding: 12px 24px; padding-bottom: max(12px, env(safe-area-inset-bottom)); }
        .kk-main { padding: 24px 16px; gap: 20px; }
        .kk-flip-btn { position: absolute; top: 12px; right: 12px; width: 40px; height: 40px; }
        .kk-subtitle { display: block; }
        @media (max-width: 480px) {
          .kk-msg { font-size: 16px !important; }
          .kk-viewport { max-width: 100% !important; }
          .kk-video, .kk-canvas { aspect-ratio: 3/4 !important; }
          .kk-btn { min-height: 48px !important; font-size: 15px !important; padding: 12px 20px !important; }
          .kk-topbar { padding-left: 14px !important; padding-right: 14px !important; }
          .kk-topbar-title { font-size: 14px !important; }
          .kk-subtitle { display: none; }
          .kk-clock { font-size: 16px !important; }
          .kk-main { padding: 14px 12px !important; gap: 14px !important; }
          .kk-bottombar { flex-direction: column !important; gap: 4px !important; text-align: center; }
        }
      `}</style>

      {/* Top bar */}
      <div className="kk-topbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <QrCode size={18} color="#fff" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="kk-topbar-title" style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>MY PT STUDIO</div>
            <div className="kk-subtitle" style={{ fontSize: 11, color: 'var(--text-disabled)' }}>Self Check-In Kiosk</div>
          </div>
        </div>
        <div className="kk-clock" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
          <Clock2 />
        </div>
      </div>

      {/* Main area */}
      <div className="kk-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>

        {/* Camera viewport */}
        <div className="kk-viewport" style={{ position: 'relative', width: '100%', maxWidth: 520, borderRadius: 24, overflow: 'hidden', border: `2px solid ${color}40`, boxShadow: `0 0 40px ${color}20` }}>
          <video ref={camera.videoRef} autoPlay playsInline muted className="kk-video" style={{ width: '100%', objectFit: 'cover', display: 'block' }} />
          <canvas ref={qrCanvasRef} style={{ display: 'none' }} />

          {/* Camera flip — kiosk hardware sometimes has only one usable camera */}
          {camera.status === 'active' && (
            <button
              className="kk-flip-btn"
              onClick={flipCamera}
              disabled={kstate === 'processing'}
              aria-label="Switch camera"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 12, border: 'none', background: 'rgba(0,0,0,0.45)',
                backdropFilter: 'blur(4px)', color: '#fff', cursor: 'pointer', zIndex: 2,
              }}
            >
              <SwitchCamera size={18} />
            </button>
          )}

          {/* QR scan frame */}
          {kstate === 'scanning' && (
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
              <m.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: isSuccess ? 'rgba(16,185,129,0.88)' : isDup ? 'rgba(6,182,212,0.88)' : 'rgba(239,68,68,0.88)', backdropFilter: 'blur(6px)', padding: 24 }}
              >
                {isSuccess ? <CheckCircle2 size={72} color="#fff" style={{ animation: 'kk-bounce 0.6s ease' }} /> : isDup ? <Clock size={72} color="#fff" /> : <XCircle size={72} color="#fff" />}
                <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', textAlign: 'center', lineHeight: 1.2 }}>{result.name || (isSuccess ? 'Check-in OK' : 'Failed')}</div>
                <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.9)', textAlign: 'center' }}>{result.message}</div>
                {result.memberCode && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>#{result.memberCode}</div>}
                <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Returning in a moment…</div>
              </m.div>
            )}
          </AnimatePresence>
        </div>

        {/* Status message */}
        <m.div
          key={msg}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', maxWidth: 400 }}
        >
          <div className="kk-msg" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{msg}</div>
        </m.div>

        {/* State indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 20, background: `${color}15`, border: `1px solid ${color}30`, color }}>
          {(kstate === 'loading' || kstate === 'processing') && (
            <Loader2 size={12} style={{ animation: 'kk-spin 0.9s linear infinite' }} />
          )}
          {kstate === 'success' && <CheckCircle2 size={12} />}
          {kstate === 'error' && <XCircle size={12} />}
          {!['loading','processing','success','error'].includes(kstate) && <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, animation: kstate === 'scanning' ? 'kk-pulse 1.5s ease-in-out infinite' : 'none' }} />}
          <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {kstate === 'welcome' ? 'Ready' : kstate === 'loading' ? 'Loading…' : kstate === 'scanning' ? 'Scanning' : kstate === 'processing' ? 'Verifying…' : kstate === 'success' ? 'Checked In' : kstate === 'duplicate' ? 'Already In' : 'Failed'}
          </span>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="kk-bottombar" style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: 'var(--text-disabled)' }}>MY PT STUDIO · Kiosk Mode</span>
        <span style={{ fontSize: 11, color: 'var(--text-disabled)' }}>QR check-in</span>
      </div>
    </div>
  );
}
