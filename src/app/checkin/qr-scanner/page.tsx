'use client';
/**
 * Check-In — the reception surface.
 *
 * This is a kiosk screen. Somebody is standing in front of it holding a phone,
 * and the person operating it needs three things in this order: point the
 * camera, see who just came in, and know whether to stop them. Everything on
 * the page is one of those three.
 *
 * ── What changed from the previous version ──
 *
 * The counter said "N today" but counted scans in this browser tab, so it
 * read 0 after a refresh no matter how many people had come through. It is
 * now the server's figure, alongside how many are currently inside — which is
 * the number a desk is actually asked for.
 *
 * The recent list started empty on every load for the same reason. It is now
 * seeded from /api/qr/dashboard, so opening the page mid-afternoon shows the
 * afternoon.
 *
 * The result overlay showed an icon and a name. It shows the member's face
 * now — that is what lets somebody confirm the right person got in without
 * reading anything — and it does so on rejections too, which is when it
 * matters most.
 *
 * "How to use" was a permanent four-step card between the camera and the
 * feed. Reception reads it once. It is a disclosure now, closed by default.
 *
 * The hero was hardcoded #f8fafc with #0F172A text, so it stayed a white card
 * with near-black text in dark mode. Everything here is on theme tokens.
 *
 * Flow is unchanged: camera → jsQR frame scan → POST /api/qr/scan → result →
 * auto-resume.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  CheckCircle2, XCircle, Loader2, RefreshCw, Camera, AlertTriangle,
  ScanLine, Users, ChevronDown, Info, VolumeX, Volume2,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import ClientAvatar from '@/components/pt-os/ClientAvatar';
import { palette, rgba } from '@/lib/palette';
import { triggerHaptic } from '@/components/common/PullToRefresh/utils';
import {
  outcomeOf, mergeFeed, feedFromServer, feedTime,
  type CheckinOutcome, type FeedEntry, type ScanResult,
} from '@/lib/checkin';
import { api } from '@/lib/api';

// Lazy-load jsQR so it doesn't bloat the server bundle
let jsQR: ((data: Uint8ClampedArray, width: number, height: number) => { data: string } | null) | null = null;

type ScanState = 'idle' | 'loading' | 'scanning' | 'processing' | CheckinOutcome;

const EASE = [0.16, 1, 0.3, 1] as const;

const C = {
  primary: palette.blue[500],
  success: palette.emerald[500],
  warning: palette.amber[500],
  danger:  palette.red[500],
  muted:   palette.gray[400],
};

/** Per-state chrome. Colour is the whole language of this screen. */
const STATE_CFG: Record<ScanState, { color: string; label: string }> = {
  idle:       { color: C.muted,   label: 'Starting up' },
  loading:    { color: C.primary, label: 'Starting camera' },
  scanning:   { color: C.primary, label: 'Ready to scan' },
  processing: { color: C.primary, label: 'Verifying' },
  success:    { color: C.success, label: 'Checked in' },
  duplicate:  { color: C.warning, label: 'Already in' },
  rejected:   { color: C.danger,  label: 'Not allowed in' },
};

const OUTCOME_CFG: Record<CheckinOutcome, {
  color: string; title: (n: string) => string; Icon: typeof CheckCircle2; haptic: number | number[];
}> = {
  success:   { color: C.success, title: (n) => `Welcome, ${n}`, Icon: CheckCircle2,   haptic: 18 },
  // Two short taps: felt as "again", which is exactly what happened.
  duplicate: { color: C.warning, title: (n) => n,               Icon: AlertTriangle,  haptic: [14, 60, 14] },
  // One long buzz. Unmistakable in a noisy gym without looking.
  rejected:  { color: C.danger,  title: (n) => n,               Icon: XCircle,        haptic: 220 },
};

/** How long a result holds the screen before the camera resumes. */
const RESULT_MS = 5000;
/** Ignore repeat reads of the same code for this long. */
const COOLDOWN_MS = 6000;

// ─── Small pieces ─────────────────────────────────────────────────────────────

/** One of the two live figures in the header. */
function Stat({ value, label, color, loading }: {
  value: number; label: string; color: string; loading: boolean;
}) {
  return (
    <div className="text-right">
      <p className="text-[19px] font-[850] leading-none tabular-nums tracking-[-0.03em]" style={{ color }}>
        {loading ? '—' : value}
      </p>
      <p className="mt-1 text-[9px] font-[750] uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
    </div>
  );
}

/**
 * The viewfinder cutout.
 *
 * A huge box-shadow spread on a transparent square dims everything outside it
 * in one element — no four-panel mask to keep aligned, and the corner
 * brackets can then sit on the square's own corners instead of being placed
 * by hand. The old version positioned each bracket with a different transform
 * and was impossible to read.
 */
function Reticle({ color, reduce }: { color: string; reduce: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center">
      <div
        className="relative aspect-square w-[62%] max-w-[280px] rounded-[28px]"
        style={{ boxShadow: '0 0 0 9999px rgba(2,6,23,0.55)' }}
      >
        {(['-top-px -left-px rounded-tl-[28px] border-l-[3px] border-t-[3px]',
           '-top-px -right-px rounded-tr-[28px] border-r-[3px] border-t-[3px]',
           '-bottom-px -left-px rounded-bl-[28px] border-b-[3px] border-l-[3px]',
           '-bottom-px -right-px rounded-br-[28px] border-b-[3px] border-r-[3px]'] as const
        ).map((cls, i) => (
          <span key={i} className={`absolute h-9 w-9 ${cls}`}
            style={{ borderColor: color, opacity: 0.95, transition: 'border-color 240ms ease' }} />
        ))}

        {!reduce && (
          <m.div
            className="absolute inset-x-5 h-[2px] rounded-full"
            style={{
              background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
              boxShadow: `0 0 14px ${rgba(color, 0.75)}`,
            }}
            initial={{ top: '14%' }}
            animate={{ top: ['14%', '86%', '14%'] }}
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
 * Face first, at a size you can read across a desk. The ring around it
 * carries the outcome colour, so the answer arrives before any word is read —
 * which is the point, because the operator is looking at the person, not the
 * screen. The bar along the bottom drains over the auto-resume window so
 * nobody wonders whether the screen has frozen.
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
        background: `linear-gradient(165deg, ${rgba(cfg.color, 0.97)} 0%, ${rgba(cfg.color, 0.88)} 100%)`,
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
          className="grid h-[104px] w-[104px] place-items-center rounded-full text-[30px] font-[850]"
          style={{
            background: 'rgba(255,255,255,0.22)',
            color: '#fff',
            border: '3px solid rgba(255,255,255,0.92)',
            boxShadow: '0 12px 40px rgba(2,6,23,0.32)',
          }}
        />
        <span
          className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full"
          style={{ background: '#fff', color: cfg.color, boxShadow: '0 4px 14px rgba(2,6,23,0.28)' }}
        >
          <cfg.Icon size={19} strokeWidth={2.6} />
        </span>
      </m.div>

      <div>
        <p className="text-[23px] font-[850] leading-tight tracking-[-0.025em] text-white">
          {cfg.title(name)}
        </p>
        <p className="mt-1 text-[13px] font-[600] text-white/90">{result.message}</p>
        {result.user?.member_code && (
          <p className="mt-1.5 text-[11px] font-[700] uppercase tracking-[0.1em] text-white/70">
            #{result.user.member_code}
          </p>
        )}
      </div>

      {/* Drains over the auto-resume window. */}
      <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/25">
        <m.div
          className="h-full bg-white/85"
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: reduce ? 0 : RESULT_MS / 1000, ease: 'linear' }}
        />
      </div>
    </m.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function QrScannerPage() {
  const videoRef     = useRef<HTMLVideoElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const streamRef    = useRef<MediaStream | null>(null);
  const rafRef       = useRef<number>(0);
  const cooldownRef  = useRef<number>(0);
  const retryTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Read inside the scan handler, which is memoised — a ref keeps the toggle
  // live without rebuilding the camera loop every time it flips.
  const soundRef     = useRef(true);

  const reduce = useReducedMotion() ?? false;

  const [scanState, setScanState] = useState<ScanState>('idle');
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

  const speak = useCallback((text: string) => {
    if (!soundRef.current) return;
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.1;
    window.speechSynthesis.speak(u);
  }, []);

  /** Today's totals and the studio-wide feed. Cheap, and the only source of
   *  truth for figures that must survive a page reload. */
  const loadStats = useCallback(async () => {
    try {
      const d = await api.qr.dashboard();
      setToday(d.today?.total ?? 0);
      setInside(d.currently_inside?.total ?? 0);
      setServerFeed(feedFromServer(d.recent_checkins ?? []));
    } catch {
      // A stats hiccup must never take the scanner down — the camera is the
      // job, these are the trimmings.
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
        // Optimistic, so the header moves with the scan instead of waiting for
        // the refetch below. The refetch then reconciles it.
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
      const msg = err instanceof Error ? err.message : 'Network error';
      setResult({ success: false, message: msg });
      setScanState('rejected');
      triggerHaptic(OUTCOME_CFG.rejected.haptic);
      speak('Check-in failed');
    }
    scheduleResume();
  }, [speak, scheduleResume, loadStats]);

  const startScanLoop = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !jsQR) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    function tick() {
      if (!video || video.readyState < 2) { rafRef.current = requestAnimationFrame(tick); return; }
      canvas!.width  = video.videoWidth;
      canvas!.height = video.videoHeight;
      ctx!.drawImage(video, 0, 0);
      const imgData = ctx!.getImageData(0, 0, canvas!.width, canvas!.height);
      const code = jsQR!(imgData.data, imgData.width, imgData.height);
      if (code?.data && Date.now() >= cooldownRef.current) {
        void processPayload(code.data);
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [processPayload]);

  const startCamera = useCallback(async () => {
    setScanState('loading');
    setCameraErr(null);

    if (!jsQR) {
      try {
        const mod = await import('jsqr');
        jsQR = (mod.default || mod) as unknown as typeof jsQR;
      } catch {
        setCameraErr('Could not load the QR library. Please refresh.');
        setScanState('idle');
        return;
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setScanState('scanning');
      startScanLoop();
    } catch (err: unknown) {
      const msg = err instanceof Error && err.name === 'NotAllowedError'
        ? 'Camera permission denied. Allow camera access and try again.'
        : 'No camera available on this device.';
      setCameraErr(msg);
      setScanState('idle');
    }
  }, [startScanLoop]);

  useEffect(() => {
    import('jsqr').then(mod => { jsQR = (mod.default || mod) as unknown as typeof jsQR; }).catch(() => {});
  }, []);

  useEffect(() => { soundRef.current = sound; }, [sound]);

  useEffect(() => {
    startCamera();
    void loadStats();
    return () => {
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (retryTimeout.current) clearTimeout(retryTimeout.current);
      window.speechSynthesis?.cancel();
    };
  }, []); // eslint-disable-line

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
    <Guard role="member">
      <AppShell>
        {/* pt-2 to match the dashboard, so the first card sits the same
            distance below the top bar as it does everywhere else. */}
        <div className="pt-2">

          {/* ── Header: what the desk gets asked ── */}
          <div
            className="mb-3 flex items-center gap-3 rounded-[18px] px-4 py-3"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)',
            }}
          >
            <div className="min-w-0 flex-1">
              <h1 className="text-[17px] font-[820] leading-none tracking-[-0.025em]"
                style={{ color: 'var(--text-primary)' }}>
                Check-In
              </h1>
              <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-[600]"
                style={{ color: 'var(--text-muted)' }}>
                <span className="relative flex h-1.5 w-1.5">
                  {live && !reduce && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70"
                      style={{ background: sc.color }} />
                  )}
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: sc.color }} />
                </span>
                {sc.label}
              </p>
            </div>

            <Stat value={inside} label="Inside" color={C.success} loading={!statsLoaded} />
            <div className="h-8 w-px" style={{ background: 'var(--border)' }} />
            <Stat value={today} label="Today" color="var(--text-primary)" loading={!statsLoaded} />

            <button
              type="button"
              onClick={() => setSound((s) => !s)}
              aria-pressed={sound}
              aria-label={sound ? 'Mute voice confirmation' : 'Unmute voice confirmation'}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors"
              style={{ background: 'var(--bg-hover)', color: sound ? C.primary : 'var(--text-muted)' }}
            >
              {sound ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>
          </div>

          <div className="rg-sidebar">

            {/* ── Viewfinder ── */}
            <div
              className="relative overflow-hidden rounded-[22px]"
              style={{ border: '1px solid var(--border)', background: palette.gray[900] }}
            >
              <div className="relative aspect-square w-full overflow-hidden sm:aspect-[4/3]">
                <video ref={videoRef} autoPlay playsInline muted
                  className="absolute inset-0 h-full w-full object-cover" />
                <canvas ref={canvasRef} className="hidden" />

                {live && <Reticle color={sc.color} reduce={reduce} />}

                <AnimatePresence>
                  {result && outcome && (
                    <ResultCard result={result} outcome={outcome} reduce={reduce} />
                  )}
                </AnimatePresence>

                {scanState === 'processing' && (
                  <div className="absolute inset-0 grid place-items-center"
                    style={{ background: 'rgba(2,6,23,0.55)', backdropFilter: 'blur(3px)' }}>
                    <div className="flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-[700] text-white"
                      style={{ background: 'rgba(2,6,23,0.7)' }}>
                      <Loader2 size={14} className="animate-spin" />
                      Verifying…
                    </div>
                  </div>
                )}

                {cameraErr && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center"
                    style={{ background: 'rgba(2,6,23,0.95)' }}>
                    <Camera size={34} color={palette.gray[400]} />
                    <p className="text-[13px] font-[600]" style={{ color: palette.red[400] }}>{cameraErr}</p>
                    <button onClick={startCamera}
                      className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-[750] text-white"
                      style={{ background: C.primary }}>
                      <RefreshCw size={12} /> Try again
                    </button>
                  </div>
                )}

                {/* Status pill. Hidden behind a result — the result says it louder. */}
                {!result && !cameraErr && (
                  <div className="absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[11px] font-[750]"
                    style={{
                      background: 'rgba(2,6,23,0.72)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      backdropFilter: 'blur(8px)',
                      color: sc.color,
                    }}>
                    <ScanLine size={11} />
                    {sc.label}
                  </div>
                )}
              </div>
            </div>

            {/* ── Side rail ── */}
            <div className="mt-3 flex flex-col gap-3 lg:mt-0">

              {/* Feed. Above the disclosure, because this is the thing you watch. */}
              <div className="overflow-hidden rounded-[18px]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: '1px solid var(--border)' }}>
                  <span className="flex items-center gap-1.5 text-[12px] font-[780]"
                    style={{ color: 'var(--text-secondary)' }}>
                    <Users size={12} color={C.primary} /> Just arrived
                  </span>
                  <span className="text-[10px] font-[700] uppercase tracking-[0.08em]"
                    style={{ color: 'var(--text-muted)' }}>
                    {feed.length ? `Last ${feed.length}` : 'Today'}
                  </span>
                </div>

                <div className="max-h-[340px] overflow-y-auto">
                  {feed.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <p className="text-[12px] font-[600]" style={{ color: 'var(--text-muted)' }}>
                        {statsLoaded ? 'Nobody has checked in yet today.' : 'Loading…'}
                      </p>
                    </div>
                  ) : feed.map((e) => {
                    const cfg = OUTCOME_CFG[e.outcome];
                    return (
                      <div key={e.key} className="flex items-center gap-2.5 px-3.5 py-2.5"
                        style={{ borderBottom: '1px solid var(--border)' }}>
                        <ClientAvatar
                          name={e.name}
                          photoUrl={e.photoUrl}
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-[800]"
                          style={{ background: rgba(cfg.color, 0.14), color: cfg.color }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12.5px] font-[650]" style={{ color: 'var(--text-primary)' }}>
                            {e.name}
                          </p>
                          <p className="text-[10px] font-[550]" style={{ color: 'var(--text-muted)' }}>
                            {feedTime(e.at)}{e.memberCode ? ` · #${e.memberCode}` : ''}
                          </p>
                        </div>
                        <cfg.Icon size={14} color={cfg.color} />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* How to use — read once, then out of the way for good. */}
              <div className="overflow-hidden rounded-[18px]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <button
                  type="button"
                  onClick={() => setHowOpen((o) => !o)}
                  aria-expanded={howOpen}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left"
                >
                  <Info size={12} color={C.primary} />
                  <span className="flex-1 text-[12px] font-[780]" style={{ color: 'var(--text-secondary)' }}>
                    How to use
                  </span>
                  <ChevronDown size={14} style={{
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
                      <div className="px-4 pb-3.5" style={{ borderTop: '1px solid var(--border)' }}>
                        {[
                          'Hold the member’s QR code in front of the camera',
                          'Keep it 15–30 cm away',
                          'Check-in is automatic — no button to press',
                          'The result is announced out loud',
                        ].map((tip, i) => (
                          <div key={i} className="flex gap-2.5 pt-3 text-[11.5px] leading-[1.45]"
                            style={{ color: 'var(--text-muted)' }}>
                            <span className="grid h-[17px] w-[17px] shrink-0 place-items-center rounded-full text-[9px] font-[800]"
                              style={{ background: rgba(C.primary, 0.12), color: C.primary }}>
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
      </AppShell>
    </Guard>
  );
}
