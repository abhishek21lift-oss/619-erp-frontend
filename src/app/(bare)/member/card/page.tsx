'use client';
/**
 * Member — Membership card.
 *
 * The member's card to show at the desk: who they are, their studio, their
 * package and days left, and a check-in QR code.
 *
 * ── The QR ─────────────────────────────────────────────────────────────────
 *
 * It comes from GET /api/qr/generate?dynamic=true — the same signed payload
 * the studio's scanner (/checkin/qr-scanner) already verifies, resolved from
 * the session, so it can only ever be this member's own code. "Dynamic" means
 * it expires after five minutes: a screenshot sent to a friend stops working.
 * The card fetches a fresh one before the old one lapses, while it is open.
 *
 * If the studio does not have attendance switched on, the endpoint refuses,
 * and the card says so rather than showing a code nothing will accept.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { m } from 'framer-motion';
import { CalendarClock, IdCard, QrCode, RefreshCw } from 'lucide-react';
import Guard from '@/components/Guard';
import MemberShell from '@/components/member/MemberShell';
import {
  Card, EASE, LoadError, MC, PageSkeleton, PageTitle, Section, longDate,
} from '@/components/member/MemberUI';
import { daysLeft, elapsedPct } from '@/components/member/planDates';
import { api } from '@/lib/api';
import type { MeMembership, MeProfile } from '@/lib/api';
import { palette, rgba } from '@/lib/palette';

export default function MemberCardPage() {
  return (
    <Guard role="member">
      <MemberShell>
        <CardBody />
      </MemberShell>
    </Guard>
  );
}

function CardBody() {
  const [profile, setProfile] = useState<MeProfile | null>(null);
  const [plan, setPlan] = useState<MeMembership | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    Promise.allSettled([api.me.profile(), api.me.membership()]).then(([p, mem]) => {
      if (!live) return;
      if (p.status === 'fulfilled') setProfile(p.value.data); else setFailed(true);
      if (mem.status === 'fulfilled') setPlan(mem.value.data);
    });
    return () => { live = false; };
  }, []);

  const title = <PageTitle icon={<IdCard size={20} />} title="Membership card" sub="Show this at the desk" />;
  if (failed) return <>{title}<LoadError what="membership card" /></>;
  if (!profile) return <PageSkeleton />;

  const start = plan?.pt_start_date ?? profile.pt_start_date;
  const end = plan?.pt_end_date ?? profile.pt_end_date;
  const left = daysLeft(end);
  const pct = elapsedPct(start, end);
  const active = (profile.status ?? 'active') === 'active';

  return (
    <>
      {title}
      <MemberCardFace profile={profile} end={end} active={active} />
      <CheckInCode />

      <Section title="Your package">
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <DaysRing left={left} pct={pct} />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Fact k="Package" v={plan?.package_type ?? profile.package_type ?? 'Personal Training'} />
              <Fact k="Started" v={longDate(start) ?? 'Not set'} />
              <Fact k="Ends" v={longDate(end) ?? 'Not set'} />
              {profile.trainer_name && <Fact k="Trainer" v={profile.trainer_name} />}
            </div>
          </div>
          {left !== null && left <= 14 && (
            <p className="mt-3 flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-[12px] font-[650]"
              style={{ background: rgba(palette.amber[500], 0.12), color: 'var(--warning-text)' }}>
              <CalendarClock size={14} aria-hidden />
              {left === 0 ? 'Your package has ended — talk to your trainer to renew.' : `Ends in ${left} day${left === 1 ? '' : 's'} — talk to your trainer about renewing.`}
            </p>
          )}
        </Card>
      </Section>
    </>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[12px]" style={{ color: MC.muted }}>{k}</span>
      <span className="truncate text-right text-[12.5px] font-[720]" style={{ color: MC.ink }}>{v}</span>
    </div>
  );
}

/** The card itself: a credit-card proportioned face, deep blue with a soft sheen. */
function MemberCardFace({ profile, end, active }: { profile: MeProfile; end: string | null; active: boolean }) {
  const valid = end ? new Date(end) : null;
  const thru = valid && !Number.isNaN(valid.getTime())
    ? valid.toLocaleDateString('en-IN', { month: '2-digit', year: '2-digit' })
    : null;
  return (
    <m.div
      initial={{ opacity: 0, y: 14, rotateX: 8 }} animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.55, ease: EASE }}
      className="relative mb-4 aspect-[1.586] w-full overflow-hidden rounded-[22px] p-5 text-white"
      style={{
        background: `radial-gradient(120% 90% at 100% 0%, ${rgba(palette.blue[400], 0.55)} 0%, transparent 55%),
                     linear-gradient(155deg, ${palette.gray[900]} 0%, ${palette.blue[900]} 55%, ${palette.blue[700]} 100%)`,
        boxShadow: `0 22px 44px -20px ${rgba(palette.blue[900], 0.8)}`,
        perspective: 800,
      }}
      aria-label={`Membership card for ${profile.name}`}
      role="group"
    >
      {/* Sheen: one slow pass, then still. */}
      <m.span aria-hidden className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent)' }}
        initial={{ left: '-40%' }} animate={{ left: '130%' }} transition={{ duration: 1.6, delay: 0.4, ease: 'easeInOut' }} />

      <div className="flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {profile.studio_logo ? (
              // eslint-disable-next-line @next/next/no-img-element -- a studio-uploaded logo from /uploads, not a build asset
              <img src={profile.studio_logo} alt="" className="h-8 w-8 rounded-[9px] bg-white/10 object-cover" />
            ) : (
              <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-white/15 text-[13px] font-[850]">
                {(profile.studio_name ?? 'S').charAt(0)}
              </span>
            )}
            <span className="truncate text-[13px] font-[780] tracking-[-0.01em]">{profile.studio_name ?? 'Your studio'}</span>
          </div>
          <span className="shrink-0 rounded-full px-2.5 py-1 text-[9.5px] font-[780] uppercase tracking-[0.12em]"
            style={{ background: active ? 'rgba(255,255,255,0.16)' : rgba(palette.red[500], 0.9) }}>
            {active ? 'Member' : (profile.status ?? 'Inactive')}
          </span>
        </div>

        <div>
          <p className="truncate text-[22px] font-[820] leading-tight tracking-[-0.02em]">{profile.name}</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div>
              <p className="text-[9px] font-[750] uppercase tracking-[0.16em] text-white/55">Member ID</p>
              <p className="font-mono text-[15px] font-[700] tracking-[0.12em]">{profile.member_code ?? '—'}</p>
            </div>
            {thru && (
              <div className="text-right">
                <p className="text-[9px] font-[750] uppercase tracking-[0.16em] text-white/55">Valid thru</p>
                <p className="font-mono text-[15px] font-[700] tracking-[0.08em]">{thru}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </m.div>
  );
}

type Qr = { dataUrl: string; expiresAt: number | null };
const REFRESH_EARLY_MS = 30_000;

function CheckInCode() {
  const [qr, setQr] = useState<Qr | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'unavailable' | 'error'>('loading');
  const [now, setNow] = useState(() => Date.now());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    setState((s) => (s === 'ready' ? s : 'loading'));
    try {
      const r = await api.qr.generate({ dynamic: true });
      const expiresAt = r.expiresIn ? Date.now() + r.expiresIn * 1000 : null;
      setQr({ dataUrl: r.dataUrl, expiresAt });
      setState('ready');
      if (expiresAt) timer.current = setTimeout(() => void load(), Math.max(5_000, expiresAt - Date.now() - REFRESH_EARLY_MS));
    } catch (err) {
      const status = (err as { status?: number })?.status;
      // 403/404: the studio has attendance switched off, so no scanner will accept a code.
      setState(status === 403 || status === 404 ? 'unavailable' : 'error');
    }
  }, []);

  useEffect(() => {
    void load();
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(tick); if (timer.current) clearTimeout(timer.current); };
  }, [load]);

  const secs = qr?.expiresAt ? Math.max(0, Math.round((qr.expiresAt - now) / 1000)) : null;

  return (
    <Section title="Check-in code">
      <Card className="p-4">
        {state === 'unavailable' ? (
          <p className="flex items-center gap-2 text-[12.5px]" style={{ color: MC.muted }}>
            <QrCode size={16} aria-hidden /> Your studio checks you in at the desk — just show your member ID.
          </p>
        ) : state === 'error' ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-[12.5px]" style={{ color: MC.muted }}>We could not load your code.</p>
            <button type="button" onClick={() => void load()}
              className="inline-flex items-center gap-1 text-[12px] font-[720]" style={{ color: MC.primary }}>
              <RefreshCw size={13} aria-hidden /> Try again
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="grid h-[132px] w-[132px] shrink-0 place-items-center rounded-[14px] bg-white p-2"
              style={{ border: '1px solid var(--border)' }}>
              {qr ? (
                // eslint-disable-next-line @next/next/no-img-element -- a generated data: URL
                <img src={qr.dataUrl} alt="Your check-in QR code" className="h-full w-full" style={{ imageRendering: 'pixelated' }} />
              ) : (
                <div className="h-full w-full animate-pulse rounded-[8px]" style={{ background: palette.gray[100] }} />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-[780]" style={{ color: MC.ink }}>Scan at the desk</p>
              <p className="mt-1 text-[12px] leading-relaxed" style={{ color: MC.muted }}>
                Your trainer scans this to mark you present. It refreshes on its own, so a screenshot will not work.
              </p>
              {secs !== null && (
                <p className="mt-2 text-[11px] font-[650] tabular-nums" style={{ color: MC.muted }} aria-live="off">
                  Refreshes in {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}
                </p>
              )}
            </div>
          </div>
        )}
      </Card>
    </Section>
  );
}

/** Days left, as a ring that empties as the package runs. */
function DaysRing({ left, pct }: { left: number | null; pct: number | null }) {
  const R = 34, C = 2 * Math.PI * R;
  const remaining = pct === null ? 1 : 1 - pct / 100;
  const tone = left !== null && left <= 14 ? palette.amber[500] : MC.primary;
  return (
    <div className="relative h-[84px] w-[84px] shrink-0" role="img"
      aria-label={left === null ? 'No end date set' : `${left} day${left === 1 ? '' : 's'} left`}>
      <svg width={84} height={84} viewBox="0 0 84 84" className="-rotate-90">
        <circle cx={42} cy={42} r={R} fill="none" stroke="var(--bg-subtle)" strokeWidth={7} />
        {left !== null && (
          <m.circle cx={42} cy={42} r={R} fill="none" stroke={tone} strokeWidth={7} strokeLinecap="round"
            strokeDasharray={C} initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: C * (1 - remaining) }}
            transition={{ duration: 0.9, ease: EASE }} />
        )}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-[20px] font-[860] leading-none tabular-nums" style={{ color: MC.ink }}>{left ?? '—'}</p>
          <p className="mt-0.5 text-[9px] font-[720] uppercase tracking-[0.04em]" style={{ color: MC.muted }}>days left</p>
        </div>
      </div>
    </div>
  );
}
