'use client';
/**
 * Check-In — the studio's front-desk surface, operated by the trainer.
 *
 * This is a kiosk screen. Somebody is standing in front of it holding a phone,
 * and the person operating it needs three things in this order: point the
 * camera, see who just came in, and know whether to stop them. Everything on
 * the page is one of those three.
 *
 * Flow: camera → QR decode → POST /api/qr/scan → result → auto-resume.
 * Figures and the feed come from /api/qr/dashboard, so they survive a reload.
 *
 * ── Why the camera used to be slow to appear ───────────────────────────────
 *
 *   · The QR library was downloaded FIRST and the camera asked for only after
 *     it arrived — two waits in a row. Both start together now, and the
 *     library download begins as soon as this route's code loads, while the
 *     session check is still in flight.
 *   · The screen said "Ready to scan" the moment the stream was granted, while
 *     the video was still black. It says "Starting camera" until the first
 *     frame is actually playing.
 *   · Every animation frame copied a full 1280×720 image and ran the decoder
 *     on it on the main thread — 60 times a second — which made the viewfinder
 *     itself stutter on a mid-range phone. The browser's own BarcodeDetector
 *     is used where it exists; otherwise a downscaled frame is decoded about
 *     ten times a second, and never while a result is on screen.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  CheckCircle2, XCircle, Loader2, RefreshCw, Camera, AlertTriangle,
  ScanLine, Users, ChevronDown, Info, VolumeX, Volume2, BarChart3, QrCode, DoorOpen, CalendarCheck,
} from 'lucide-react';
import Guard from '@/components/Guard';
import ClientAvatar from '@/components/pt-os/ClientAvatar';
import { palette, rgba } from '@/lib/palette';
import { triggerHaptic } from '@/components/common/PullToRefresh/utils';
import {
  outcomeOf, mergeFeed, feedFromServer, feedTime,
  type CheckinOutcome, type FeedEntry, type ScanResult,
} from '@/lib/checkin';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/forms/errors';
import { tones, gradient, checkinMesh, scanGlow, type ToneName } from '@/components/attendance/attendanceTheme';

// ─── The decoder ──────────────────────────────────────────────────────────────

type JsQR = (
  data: Uint8ClampedArray, width: number, height: number,
  options?: { inversionAttempts?: 'dontInvert' | 'onlyInvert' | 'attemptBoth' | 'invertFirst' },
) => { data: string } | null;

type NativeDetector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };
type NativeDetectorCtor = {
  new (opts: { formats: string[] }): NativeDetector;
  getSupportedFormats?: () => Promise<string[]>;
};

/** Reads one frame; resolves to the QR text, or null when there is none. */
type Decode = (video: HTMLVideoElement, canvas: HTMLCanvasElement) => Promise<string | null>;

/** The longer side of the frame the fallback decoder reads. A QR code held
 *  15–30 cm from the lens is far larger than this needs. */
const DECODE_EDGE = 640;
/** Pause between decodes. Fast enough to feel instant, slow enough to leave
 *  the main thread to the video. */
const DECODE_EVERY_MS = 90;

let jsQRPromise: Promise<JsQR> | null = null;
function loadJsQR(): Promise<JsQR> {
  jsQRPromise ??= import('jsqr').then((mod) => (mod.default || mod) as unknown as JsQR);
  // A failed download must not be cached, or "Try again" could never succeed.
  jsQRPromise.catch((err: unknown) => { jsQRPromise = null; console.warn('[checkin] QR library failed to load', err); });
  return jsQRPromise;
}

// Start the download the moment this route's code is evaluated in a browser —
// the page itself cannot mount until the session check returns, and there is
// no reason for the decoder to wait behind it.
if (typeof window !== 'undefined') void loadJsQR();

async function nativeDetector(): Promise<NativeDetector | null> {
  const Ctor = (globalThis as { BarcodeDetector?: NativeDetectorCtor }).BarcodeDetector;
  if (!Ctor) return null;
  try {
    const formats = (await Ctor.getSupportedFormats?.()) ?? ['qr_code'];
    return formats.includes('qr_code') ? new Ctor({ formats: ['qr_code'] }) : null;
  } catch (err: unknown) {
    console.warn('[checkin] BarcodeDetector unavailable, using the fallback', err);
    return null;
  }
}

async function makeDecoder(): Promise<Decode> {
  const native = await nativeDetector();
  if (native) {
    return async (video) => {
      const codes = await native.detect(video);
      return codes[0]?.rawValue || null;
    };
  }
  const jsQR = await loadJsQR();
  return async (video, canvas) => {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return null;
    const scale = Math.min(1, DECODE_EDGE / Math.max(vw, vh));
    const w = Math.round(vw * scale);
    const h = Math.round(vh * scale);
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, w, h);
    const img = ctx.getImageData(0, 0, w, h);
    // A member's QR is dark-on-light; skipping the inverted pass halves the work.
    return jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' })?.data || null;
  };
}

// ─── States ───────────────────────────────────────────────────────────────────

type ScanState = 'loading' | 'scanning' | 'processing' | 'error' | CheckinOutcome;

const EASE = [0.16, 1, 0.3, 1] as const;

/** Outcome colours are meanings, and come from the palette. */
const C = {
  success: palette.emerald[500],
  warning: palette.amber[500],
  danger:  palette.red[500],
  muted:   palette.gray[400],
};

const LIVE = scanGlow[0];

const STATE_CFG: Record<ScanState, { color: string; label: string }> = {
  loading:    { color: C.muted,   label: 'Starting camera' },
  scanning:   { color: LIVE,      label: 'Ready to scan' },
  processing: { color: LIVE,      label: 'Verifying' },
  error:      { color: C.danger,  label: 'Camera off' },
  success:    { color: C.success, label: 'Checked in' },
  duplicate:  { color: C.warning, label: 'Already in' },
  rejected:   { color: C.danger,  label: 'Not allowed in' },
};

const OUTCOME_CFG: Record<CheckinOutcome, {
  color: string; title: (n: string) => string; Icon: typeof CheckCircle2; haptic: number | number[];
}> = {
  success:   { color: C.success, title: (n) => `Welcome, ${n}`, Icon: CheckCircle2,  haptic: 18 },
  // Two short taps: felt as "again", which is exactly what happened.
  duplicate: { color: C.warning, title: (n) => n,               Icon: AlertTriangle, haptic: [14, 60, 14] },
  // One long buzz. Unmistakable in a noisy gym without looking.
  rejected:  { color: C.danger,  title: (n) => n,               Icon: XCircle,       haptic: 220 },
};

/** How long a result holds the screen before the camera resumes. */
const RESULT_MS = 5000;
/** Ignore repeat reads of the same code for this long. */
const COOLDOWN_MS = 6000;

// ─── Small pieces ─────────────────────────────────────────────────────────────

/** A live figure in the header, on glass. */
function HeaderStat({ icon, value, label, loading }: {
  icon: React.ReactNode; value: number; label: string; loading: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-[18px] px-3.5 py-2.5"
      style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.22)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px]" style={{ background: 'rgba(255,255,255,0.2)' }}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[22px] font-[850] leading-none tabular-nums tracking-[-0.03em]">{loading ? '—' : value}</p>
        <p className="mt-1 text-[10px] font-[750] uppercase tracking-[0.1em] text-white/75">{label}</p>
      </div>
    </div>
  );
}

function RoundButton({ label, onClick, href, pressed, children }: {
  label: string; onClick?: () => void; href?: string; pressed?: boolean; children: React.ReactNode;
}) {
  const cls = 'grid h-10 w-10 shrink-0 place-items-center rounded-full text-white transition-transform active:scale-95';
  const style = { background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.24)' };
  return href
    ? <Link href={href} aria-label={label} className={cls} style={style}>{children}</Link>
    : <button type="button" onClick={onClick} aria-label={label} aria-pressed={pressed} className={cls} style={style}>{children}</button>;
}

/**
 * The viewfinder cutout.
 *
 * A huge box-shadow spread on a transparent square dims everything outside it
 * in one element, and the corner brackets sit on the square's own corners.
 * The brackets carry the aqua→violet sheen of a live camera.
 */
function Reticle({ live, reduce }: { live: boolean; reduce: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center">
      <div className="relative aspect-square w-[64%] max-w-[300px] rounded-[30px]"
        style={{ boxShadow: '0 0 0 9999px rgba(2,6,23,0.5)' }}>
        <svg className="absolute -inset-[2px] h-[calc(100%+4px)] w-[calc(100%+4px)]" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          <defs>
            <linearGradient id="scan-glow" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={scanGlow[0]} />
              <stop offset="100%" stopColor={scanGlow[1]} />
            </linearGradient>
          </defs>
          {['M2 20 V12 Q2 2 12 2 H20', 'M80 2 H88 Q98 2 98 12 V20', 'M98 80 V88 Q98 98 88 98 H80', 'M20 98 H12 Q2 98 2 88 V80'].map((d) => (
            <path key={d} d={d} fill="none" stroke="url(#scan-glow)" strokeWidth={4} strokeLinecap="round"
              vectorEffect="non-scaling-stroke" />
          ))}
        </svg>

        {live && !reduce && (
          <m.div
            className="absolute inset-x-6 h-[3px] rounded-full"
            style={{
              background: `linear-gradient(90deg, transparent, ${scanGlow[0]}, ${scanGlow[1]}, transparent)`,
              boxShadow: `0 0 18px ${rgba(scanGlow[0], 0.8)}`,
            }}
            initial={{ top: '12%' }}
            animate={{ top: ['12%', '88%', '12%'] }}
            transition={{ duration: 2.6, ease: 'easeInOut', repeat: Infinity }}
          />
        )}
      </div>
    </div>
  );
}

/**
 * The result takeover.
 *
 * Face first, at a size you can read across a desk. The colour carries the
 * answer before any word is read — the operator is looking at the person,
 * not the screen. The bar along the bottom drains over the auto-resume window
 * so nobody wonders whether the screen has frozen.
 */
function ResultCard({ result, outcome, reduce }: {
  result: ScanResult; outcome: CheckinOutcome; reduce: boolean;
}) {
  const cfg = OUTCOME_CFG[outcome];
  const name = result.user?.name || 'Unknown member';

  return (
    <m.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.18 } }}
      transition={{ duration: 0.34, ease: EASE }}
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-6 text-center"
      style={{
        background: [
          `radial-gradient(circle 260px at 50% 30%, rgba(255,255,255,0.18), transparent 70%)`,
          `linear-gradient(165deg, ${rgba(cfg.color, 0.97)} 0%, ${rgba(cfg.color, 0.86)} 100%)`,
        ].join(', '),
        backdropFilter: 'blur(6px)',
      }}
      role="status"
      aria-live="assertive"
    >
      <m.div
        initial={reduce ? false : { scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.06, duration: 0.4, ease: EASE }}
        className="relative"
      >
        <ClientAvatar
          name={name}
          photoUrl={result.user?.photo_url}
          className="grid h-[112px] w-[112px] place-items-center rounded-full text-[32px] font-[850]"
          style={{
            background: 'rgba(255,255,255,0.22)',
            color: '#fff',
            border: '3px solid rgba(255,255,255,0.92)',
            boxShadow: '0 14px 44px rgba(2,6,23,0.32)',
          }}
        />
        <span className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full"
          style={{ background: '#fff', color: cfg.color, boxShadow: '0 4px 14px rgba(2,6,23,0.28)' }}>
          <cfg.Icon size={20} strokeWidth={2.6} />
        </span>
      </m.div>

      <div>
        <p className="text-[25px] font-[850] leading-tight tracking-[-0.025em] text-white">{cfg.title(name)}</p>
        <p className="mt-1 text-[13.5px] font-[600] text-white/90">{result.message}</p>
        {result.user?.member_code && (
          <p className="mt-2 inline-block rounded-full px-3 py-1 text-[11px] font-[750] uppercase tracking-[0.1em] text-white"
            style={{ background: 'rgba(255,255,255,0.2)' }}>
            #{result.user.member_code}
          </p>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 h-[4px] bg-white/25">
        <m.div className="h-full bg-white/90"
          initial={{ width: '100%' }} animate={{ width: '0%' }}
          transition={{ duration: reduce ? 0 : RESULT_MS / 1000, ease: 'linear' }} />
      </div>
    </m.div>
  );
}

function CardTitle({ icon, tone, title, aside }: { icon: React.ReactNode; tone: ToneName; title: string; aside?: React.ReactNode }) {
  const t = tones[tone];
  return (
    <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] text-white"
        style={{ background: gradient(t), boxShadow: `0 6px 14px -6px ${t.glow}` }}>{icon}</span>
      <span className="flex-1 text-[14px] font-[800] tracking-[-0.01em]" style={{ color: 'var(--text-primary)' }}>{title}</span>
      {aside}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function QrScannerPage() {
  return (
    // The scanner is operated by the trainer, never by the member being
    // scanned — it matches the backend route it calls, `POST /api/qr/scan`,
    // which is requireTrainer. The camera logic lives INSIDE the guard, so
    // it only runs once the <video> it feeds exists, and never for an account
    // this page is about to send away.
    <Guard role="trainer">
      <CheckinScanner />
    </Guard>
  );
}

function CheckinScanner() {
  const videoRef     = useRef<HTMLVideoElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const streamRef    = useRef<MediaStream | null>(null);
  const decoderRef   = useRef<Decode | null>(null);
  const cooldownRef  = useRef<number>(0);
  const liveRef      = useRef(false);
  const aliveRef     = useRef(true);
  const runRef       = useRef(0);
  const retryTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Read inside the scan handler, which is memoised — a ref keeps the toggle
  // live without rebuilding the camera loop every time it flips.
  const soundRef     = useRef(true);

  const reduce = useReducedMotion() ?? false;

  const [scanState, setScanState] = useState<ScanState>('loading');
  const [result,    setResult]    = useState<ScanResult | null>(null);
  const [cameraErr, setCameraErr] = useState<string | null>(null);
  const [sound,     setSound]     = useState(true);
  const [howOpen,   setHowOpen]   = useState(false);

  const [localFeed,  setLocalFeed]  = useState<FeedEntry[]>([]);
  const [serverFeed, setServerFeed] = useState<FeedEntry[]>([]);
  const [today,      setToday]      = useState(0);
  const [inside,     setInside]     = useState(0);
  const [statsLoaded, setStatsLoaded] = useState(false);

  const feed = mergeFeed(localFeed, serverFeed);

  // The decode loop reads this, so it only ever works while the camera is
  // actually live — never under a result card or a "Verifying" veil.
  useEffect(() => { liveRef.current = scanState === 'scanning'; }, [scanState]);
  useEffect(() => { soundRef.current = sound; }, [sound]);

  const speak = useCallback((text: string) => {
    if (!soundRef.current) return;
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.1;
    window.speechSynthesis.speak(u);
  }, []);

  /** Today's totals and the studio-wide feed — the only source of truth for
   *  figures that must survive a page reload. */
  const loadStats = useCallback(async () => {
    try {
      const d = await api.qr.dashboard();
      setToday(d.today?.total ?? 0);
      setInside(d.currently_inside?.total ?? 0);
      setServerFeed(feedFromServer(d.recent_checkins ?? []));
    } catch (err: unknown) {
      // A stats hiccup must never take the scanner down — the camera is the
      // job, these are the trimmings.
      console.warn('[checkin] dashboard refresh failed', err);
    } finally {
      setStatsLoaded(true);
    }
  }, []);

  const scheduleResume = useCallback(() => {
    if (retryTimeout.current) clearTimeout(retryTimeout.current);
    retryTimeout.current = setTimeout(() => {
      setResult(null);
      setScanState('scanning');
      cooldownRef.current = 0;
    }, RESULT_MS);
  }, []);

  const processPayload = useCallback(async (payload: string) => {
    if (Date.now() < cooldownRef.current) return;
    cooldownRef.current = Date.now() + COOLDOWN_MS;
    liveRef.current = false;
    setScanState('processing');

    try {
      const data = await api.qr.scan({ payload });
      const outcome = outcomeOf(data);
      setResult(data);
      setScanState(outcome);
      triggerHaptic(OUTCOME_CFG[outcome].haptic);

      setLocalFeed((prev) => [{
        // A rejection never gets an attendance row, so it keys off the scan
        // itself and stays distinct from every server row.
        key: data.attendance_id || `local-${Date.now()}`,
        name: data.user?.name || 'Unknown',
        photoUrl: data.user?.photo_url ?? null,
        memberCode: data.user?.member_code ?? null,
        at: data.check_in_time || new Date().toISOString(),
        outcome,
      }, ...prev].slice(0, 20));

      if (outcome === 'success') {
        // Optimistic, so the header moves with the scan; the refetch reconciles.
        setToday((n) => n + 1);
        setInside((n) => n + 1);
        speak(`Welcome, ${data.user?.name}`);
      } else if (outcome === 'duplicate') {
        speak('Already checked in');
      } else {
        speak(data.message);
      }
      void loadStats();
    } catch (err: unknown) {
      setResult({ success: false, message: errorMessage(err, 'Network error') });
      setScanState('rejected');
      triggerHaptic(OUTCOME_CFG.rejected.haptic);
      speak('Check-in failed');
    }
    scheduleResume();
  }, [speak, scheduleResume, loadStats]);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    // Each start is numbered; a start overtaken by a newer one (Try again, or
    // a remount) drops its stream instead of attaching it over the newer one.
    const run = ++runRef.current;
    stopStream();
    setCameraErr(null);
    setResult(null);
    setScanState('loading');

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraErr('This browser cannot open the camera here. Use Chrome or Safari on a secure (https) address.');
      setScanState('error');
      return;
    }

    // The decoder and the camera are two independent waits — run them together.
    const decoder = decoderRef.current ? Promise.resolve(decoderRef.current) : makeDecoder();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (!aliveRef.current || run !== runRef.current) { stream.getTracks().forEach((t) => t.stop()); return; }
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        // `autoPlay` + `muted` normally starts it; the explicit call covers
        // browsers that wait for one. 'Ready' is set by onPlaying, not here.
        video.play().catch((err: unknown) => console.warn('[checkin] video.play() refused', err));
      }
    } catch (err: unknown) {
      const name = err instanceof Error ? err.name : '';
      setCameraErr(
        name === 'NotAllowedError' ? 'Camera permission denied. Allow camera access and try again.'
          : name === 'NotReadableError' ? 'The camera is in use by another app. Close it and try again.'
            : 'No camera available on this device.',
      );
      setScanState('error');
      return;
    }

    try {
      decoderRef.current = await decoder;
    } catch (err: unknown) {
      console.warn('[checkin] decoder failed to load', err);
      setCameraErr('Could not load the QR reader. Check the connection and try again.');
      setScanState('error');
      stopStream();
    }
  }, [stopStream]);

  /** The first real frame. Until then the screen is honest about starting. */
  const onPlaying = useCallback(() => {
    setScanState((s) => (s === 'loading' ? 'scanning' : s));
  }, []);

  // Once the decoder is ready and the first frame is up, "loading" can end
  // either way round — whichever arrives second flips it.
  useEffect(() => {
    if (scanState !== 'loading') return;
    const id = setInterval(() => {
      const v = videoRef.current;
      if (v && decoderRef.current && v.readyState >= 2 && !v.paused) setScanState('scanning');
    }, 150);
    return () => clearInterval(id);
  }, [scanState]);

  // Mount: camera, figures, and the decode loop. One loop for the life of the
  // page; it idles unless the camera is live.
  useEffect(() => {
    aliveRef.current = true;
    void startCamera();
    void loadStats();

    let timer: ReturnType<typeof setTimeout>;
    let decodeWarned = false;
    const loop = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const decode = decoderRef.current;
      if (liveRef.current && video && canvas && decode && video.readyState >= 2) {
        try {
          const text = await decode(video, canvas);
          if (text && liveRef.current && Date.now() >= cooldownRef.current) void processPayload(text);
        } catch (err: unknown) {
          // One unreadable frame is not a failure — the next one is 90 ms away.
          // Said once, so a decoder that fails every frame is still visible.
          if (!decodeWarned) { decodeWarned = true; console.warn('[checkin] frame decode failed', err); }
        }
      }
      if (aliveRef.current) timer = setTimeout(loop, DECODE_EVERY_MS);
    };
    timer = setTimeout(loop, DECODE_EVERY_MS);

    return () => {
      aliveRef.current = false;
      // A counter, not a DOM ref: bumping it is how an in-flight start learns
      // it has been superseded.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      runRef.current++;
      clearTimeout(timer);
      stopStream();
      if (retryTimeout.current) clearTimeout(retryTimeout.current);
      window.speechSynthesis?.cancel();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Someone else's scan should show up here too, but only while this tab is
   *  actually in front of somebody. */
  useEffect(() => {
    const tick = () => { if (!document.hidden) void loadStats(); };
    const id = setInterval(tick, 30_000);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick); };
  }, [loadStats]);

  const sc = STATE_CFG[scanState];
  const outcome: CheckinOutcome | null =
    scanState === 'success' || scanState === 'duplicate' || scanState === 'rejected' ? scanState : null;
  const live = scanState === 'scanning';

  return (
    <div className="pt-1">
      {/* ── Header: what the desk gets asked ── */}
      <m.section
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE }}
        className="relative mb-4 overflow-hidden rounded-[28px] p-5 text-white"
        style={{
          background: [
            `radial-gradient(circle 220px at 0% 120%, ${checkinMesh.glowA}, transparent 70%)`,
            `radial-gradient(circle 220px at 100% -20%, ${checkinMesh.glowB}, transparent 70%)`,
            checkinMesh.base,
          ].join(', '),
          boxShadow: `0 26px 50px -26px ${checkinMesh.shadow}`,
        }}
        aria-label="Check-In"
      >
        <span aria-hidden className="pointer-events-none absolute inset-0"
          style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.10), transparent 40%)' }} />

        <div className="relative flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px]"
            style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.28)' }}>
            <QrCode size={20} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-[24px] font-[850] leading-none tracking-[-0.03em] sm:text-[28px]">Check-In</h1>
            <p className="mt-2 inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[12px] font-[750]"
              style={{ background: 'rgba(2,6,23,0.22)' }}>
              <span className="relative flex h-2 w-2">
                {(live || scanState === 'loading') && !reduce && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70" style={{ background: sc.color }} />
                )}
                <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: sc.color }} />
              </span>
              {sc.label}
            </p>
          </div>
          {/* The hourly chart and method breakdown live on the check-in
              dashboard, which nothing else links to. */}
          <RoundButton label="Today's check-in stats" href="/checkin/dashboard">
            <BarChart3 size={16} aria-hidden />
          </RoundButton>
          <RoundButton label={sound ? 'Mute voice confirmation' : 'Unmute voice confirmation'}
            onClick={() => setSound((s) => !s)} pressed={sound}>
            {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </RoundButton>
        </div>

        <div className="relative mt-4 grid grid-cols-2 gap-2.5">
          <HeaderStat icon={<DoorOpen size={17} aria-hidden />} value={inside} label="Inside now" loading={!statsLoaded} />
          <HeaderStat icon={<CalendarCheck size={17} aria-hidden />} value={today} label="Today" loading={!statsLoaded} />
        </div>
      </m.section>

      <div className="rg-sidebar">
        {/* ── Viewfinder ── */}
        <div className="relative rounded-[30px] p-[2px]"
          style={{
            background: outcome ? OUTCOME_CFG[outcome].color
              : `linear-gradient(135deg, ${scanGlow[0]}, ${scanGlow[1]})`,
            boxShadow: `0 24px 48px -24px ${outcome ? rgba(OUTCOME_CFG[outcome].color, 0.6) : rgba(scanGlow[1], 0.6)}`,
            transition: 'background 240ms ease',
          }}>
          <div className="relative overflow-hidden rounded-[28px]" style={{ background: palette.gray[900] }}>
            <div className="relative aspect-square w-full overflow-hidden sm:aspect-[4/3]">
              <video ref={videoRef} autoPlay playsInline muted onPlaying={onPlaying}
                className="absolute inset-0 h-full w-full object-cover" />
              <canvas ref={canvasRef} className="hidden" />

              {(live || scanState === 'processing') && (
                <Reticle live={live} reduce={reduce} />
              )}

              {/* Starting: a real state, not a black box. */}
              <AnimatePresence>
                {scanState === 'loading' && !cameraErr && (
                  <m.div key="starting" initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.25 } }}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-3"
                    style={{ background: `radial-gradient(circle 240px at 50% 45%, ${rgba(scanGlow[1], 0.28)}, transparent 70%), ${palette.gray[900]}` }}>
                    <span className="relative grid h-16 w-16 place-items-center rounded-[20px] text-white"
                      style={{ background: `linear-gradient(135deg, ${scanGlow[0]}, ${scanGlow[1]})` }}>
                      {!reduce && (
                        <span className="absolute inset-0 animate-ping rounded-[20px] opacity-40"
                          style={{ background: `linear-gradient(135deg, ${scanGlow[0]}, ${scanGlow[1]})` }} />
                      )}
                      <Camera size={26} aria-hidden className="relative" />
                    </span>
                    <p className="text-[13px] font-[700] text-white/85">Starting camera…</p>
                  </m.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {result && outcome && <ResultCard result={result} outcome={outcome} reduce={reduce} />}
              </AnimatePresence>

              {scanState === 'processing' && (
                <div className="absolute inset-0 grid place-items-center"
                  style={{ background: 'rgba(2,6,23,0.5)', backdropFilter: 'blur(3px)' }}>
                  <div className="flex items-center gap-2 rounded-full px-4 py-2 text-[12.5px] font-[750] text-white"
                    style={{ background: 'rgba(2,6,23,0.72)' }}>
                    <Loader2 size={14} className="animate-spin" />
                    Verifying…
                  </div>
                </div>
              )}

              {cameraErr && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center"
                  style={{ background: 'rgba(2,6,23,0.95)' }}>
                  <span className="grid h-14 w-14 place-items-center rounded-[18px]" style={{ background: rgba(C.danger, 0.16) }}>
                    <Camera size={26} color={palette.red[400]} />
                  </span>
                  <p className="max-w-[280px] text-[13px] font-[650]" style={{ color: palette.red[400] }}>{cameraErr}</p>
                  <button type="button" onClick={() => void startCamera()}
                    className="inline-flex h-10 items-center gap-1.5 rounded-full px-5 text-[13px] font-[780] text-white"
                    style={{ background: `linear-gradient(135deg, ${scanGlow[0]}, ${scanGlow[1]})` }}>
                    <RefreshCw size={13} /> Try again
                  </button>
                </div>
              )}

              {/* Status pill. Hidden behind a result — the result says it louder. */}
              {live && (
                <div className="absolute bottom-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-[12px] font-[750] text-white"
                  style={{ background: 'rgba(2,6,23,0.6)', border: '1px solid rgba(255,255,255,0.14)', backdropFilter: 'blur(10px)' }}>
                  <ScanLine size={13} color={scanGlow[0]} />
                  Hold the member’s QR in the frame
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Side rail ── */}
        <div className="mt-4 flex flex-col gap-4 lg:mt-0">
          {/* Feed. Above the disclosure, because this is the thing you watch. */}
          <div className="overflow-hidden rounded-[24px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <CardTitle icon={<Users size={15} aria-hidden />} tone="aqua" title="Just arrived"
              aside={
                <span className="rounded-full px-2.5 py-1 text-[10.5px] font-[750] uppercase tracking-[0.08em]"
                  style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                  {feed.length ? `Last ${feed.length}` : 'Today'}
                </span>
              } />

            <div className="max-h-[380px] overflow-y-auto p-2">
              {feed.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-[12.5px] font-[600]" style={{ color: 'var(--text-muted)' }}>
                    {statsLoaded ? 'Nobody has checked in yet today.' : 'Loading…'}
                  </p>
                </div>
              ) : (
                <ul className="space-y-1">
                  {feed.map((e) => {
                    const cfg = OUTCOME_CFG[e.outcome];
                    return (
                      <li key={e.key} className="flex items-center gap-3 rounded-[16px] px-2.5 py-2"
                        style={{ background: e.outcome === 'success' ? 'transparent' : rgba(cfg.color, 0.07) }}>
                        <span className="shrink-0 rounded-full p-[2px]" style={{ background: cfg.color }}>
                          <ClientAvatar
                            name={e.name}
                            photoUrl={e.photoUrl}
                            className="grid h-9 w-9 place-items-center rounded-full text-[11px] font-[800] text-white"
                            style={{ background: gradient(tones.aqua), border: '2px solid var(--bg-card)' }}
                          />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13.5px] font-[720]" style={{ color: 'var(--text-primary)' }}>{e.name}</p>
                          <p className="text-[11.5px] font-[550]" style={{ color: 'var(--text-muted)' }}>
                            {feedTime(e.at)}{e.memberCode ? ` · #${e.memberCode}` : ''}
                          </p>
                        </div>
                        <cfg.Icon size={16} color={cfg.color} aria-label={STATE_CFG[e.outcome].label} />
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* How to use — read once, then out of the way for good. */}
          <div className="overflow-hidden rounded-[24px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <button type="button" onClick={() => setHowOpen((o) => !o)} aria-expanded={howOpen}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] text-white" style={{ background: gradient(tones.indigo) }}>
                <Info size={15} aria-hidden />
              </span>
              <span className="flex-1 text-[14px] font-[800]" style={{ color: 'var(--text-primary)' }}>How to use</span>
              <ChevronDown size={16} style={{
                color: 'var(--text-muted)',
                transform: howOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 200ms ease',
              }} />
            </button>
            <AnimatePresence initial={false}>
              {howOpen && (
                <m.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: reduce ? 0 : 0.26, ease: EASE }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4" style={{ borderTop: '1px solid var(--border)' }}>
                    {[
                      'Hold the member’s QR code in front of the camera',
                      'Keep it 15–30 cm away',
                      'Check-in is automatic — no button to press',
                      'The result is announced out loud',
                    ].map((tip, i) => (
                      <div key={i} className="flex gap-3 pt-3 text-[12.5px] leading-[1.45]" style={{ color: 'var(--text-secondary)' }}>
                        <span className="grid h-[20px] w-[20px] shrink-0 place-items-center rounded-full text-[10.5px] font-[850] text-white"
                          style={{ background: gradient(tones.indigo) }}>
                          {i + 1}
                        </span>
                        {tip}
                      </div>
                    ))}
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
