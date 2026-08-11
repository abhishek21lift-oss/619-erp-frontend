'use client';

/**
 * MY PT STUDIO — SaaS marketing landing page.
 *
 * Repositioned from a personal-trainer page into a premium software-company
 * site: the product is the hero, the founder is invisible. Self-contained
 * palette (deep maroon + luxury gold on white) so it doesn't inherit the app's
 * in-product blue brand tokens. Framer Motion for subtle scroll reveals
 * (disabled under prefers-reduced-motion).
 */

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import BrandLogoWide from '@/components/BrandLogoWide';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight, Check, Menu, X, Sparkles, Star, ChevronDown,
  Users, Dumbbell, Salad, CalendarCheck, LineChart, Ruler,
  Wallet, FileText, CreditCard, Inbox, Zap, BookOpen, ClipboardList,
  Smartphone, Cloud, Bell, BarChart3, UsersRound, ShieldCheck, Building2, Bot,
  Quote, PhoneCall,
} from 'lucide-react';

// ── Palette ─────────────────────────────────────────────────────────────────
// Blue + black, taken from the MY PT STUDIO cube mark. BLUE is sampled from the
// artwork itself (#0067E0) rather than picked by eye, so the page and the logo
// are the same blue.
//
// The names are kept as MAROON/GOLD so this stays a pure colour change: the
// file uses these constants in ~100 places and in fixed structural roles
// (MAROON = primary, MAROON_DEEP = darkest surface + text on accent,
// GOLD = the bright accent that has to pop against the dark panels). Renaming
// them as well would bury a simple recolour inside a 100-line rename diff and
// make it far harder to review or revert.
const MAROON = '#0067E0';       // primary — logo blue
const MAROON_DEEP = '#0F172A';  // near-black — the logo's cube
const MAROON_HI = '#0067E0';    // lifted primary
const GOLD = '#0067E0';         // bright accent; sits on the dark panels
const GOLD_HI = '#7FB4FF';      // lightest accent
const INK = '#0F172A';          // blue-black body text
const MUTE = '#64748B';         // neutral slate

const gradText: React.CSSProperties = {
  background: `linear-gradient(120deg, ${MAROON_DEEP} 0%, ${MAROON} 44%, ${GOLD} 118%)`,
  WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
};

// ── Hero night palette ──────────────────────────────────────────────────────
//
// The hero is the one dark surface on this page; everything from "Trusted by"
// down stays white. These are scoped to it rather than added to the palette
// above, because the page's constants are used in ~100 places in fixed
// structural roles and a dark variant of each would double that table for one
// section's benefit.
//
// Every value is from src/lib/palette.ts — palette.test.ts scans this file and
// fails on any hex outside the five families. That constraint decided two of
// them for me:
//
//   NIGHT is gray-900, the same near-black this file already calls "the logo's
//   cube". Deep charcoal, deliberately not #000: pure black kills the
//   gradients and makes the white type ring.
//
//   NIGHT_ACCENT is blue-950 (#1CA3F9) rather than the brand blue-500. The
//   palette documents exactly why: on a gray-900 tile the deep 500 reaches
//   only 3.4:1, so it is the one blue in the system that must not carry
//   meaning on a dark surface. 950 exists for this case and measures 7.4:1.
const NIGHT        = '#0F172A'; // gray-900  — the stage floor
const NIGHT_LIFT   = '#1E293B'; // gray-800  — the lifted edge
const NIGHT_BLUE   = '#002D61'; // blue-900  — depth in the corners
const NIGHT_BLUE_2 = '#003F87'; // blue-800  — the warmer pool of light
const NIGHT_ACCENT = '#1CA3F9'; // blue-950  — the only blue readable as text here
const ON_NIGHT     = '#FFFFFF'; // gray-0    — headline, 17.9:1
const ON_NIGHT_2   = '#CBD5E1'; // gray-300  — body copy, 11.6:1
const ON_NIGHT_3   = '#94A3B8'; // gray-400  — supporting line, 7.0:1
const ON_NIGHT_LABEL = '#E2E8F0'; // gray-200 — the eyebrow label, 7.1:1 on its pill

/** The headline's accent phrase, lit rather than inked. */
const gradTextNight: React.CSSProperties = {
  background: `linear-gradient(104deg, ${GOLD_HI} 0%, ${NIGHT_ACCENT} 46%, ${ON_NIGHT} 104%)`,
  WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
};

/**
 * A single grain tile, as a data URI.
 *
 * ~230 bytes of SVG rather than a texture file: it costs no request, cannot
 * block paint, and tiles at 140px so the repeat is invisible. Held at 3.5%
 * opacity, where it does not read as texture so much as stop the large
 * gradients banding on 8-bit displays, which is the actual job.
 */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

// ── Scroll reveal ───────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, y = 22, className = '' }: { children: ReactNode; delay?: number; y?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ── Wordmark ────────────────────────────────────────────────────────────────
function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Image
        src="/mypt-logo.png"
        alt="MY PT STUDIO"
        width={38}
        height={38}
        priority
        className="h-9 w-9 shrink-0 object-contain"
        // The light variant used to carry a BLACK drop shadow, which on the
        // dark surfaces it exists for did precisely nothing — the cube is
        // black artwork and it was being given a black edge. Same rim light
        // the wide lockup uses, at this size a single hairline is enough.
        style={light
          ? { filter: 'drop-shadow(0 0 1px rgba(255,255,255,0.85)) drop-shadow(0 0 6px rgba(0,103,224,0.75))' }
          : { filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.35))' }}
      />
      {/* Mirrors the artwork: "MY PT" blue, "STUDIO" black. On a dark surface
          that inverts — black on near-black is invisible — so STUDIO takes an
          accent there instead.

          That accent is blue-950, not the brand blue-500 GOLD resolves to.
          Both dark surfaces this appears on (the footer, and now the nav while
          it is over the hero) are near gray-900, where blue-500 measures
          3.4:1 — under AA for text, and this is the company's own name.
          blue-950 exists in the palette for precisely this and reaches 7.4:1.
          See the note on `blue` in src/lib/palette.ts. */}
      <span className="text-[15px] font-[750] tracking-[-0.01em]">
        <span style={{ color: light ? '#fff' : MAROON }}>MY&nbsp;PT&nbsp;</span>
        <span style={{ color: light ? NIGHT_ACCENT : INK }}>STUDIO</span>
      </span>
    </span>
  );
}

const NAV = ['Solutions', 'Features', 'Pricing', 'Resources', 'About'];

// ── Nav ─────────────────────────────────────────────────────────────────────
function Nav() {
  const [open, setOpen] = useState(false);

  // ── The bar reads the surface it is sitting on ────────────────────────────
  //
  // The hero is a dark stage and this bar is fixed over it, so a permanently
  // white bar would sit on the night like a strip of paper — and its ink-black
  // links would be the only dark text on the darkest part of the page. It
  // starts transparent-on-dark and becomes the original white bar once the
  // hero has scrolled past.
  //
  // A scroll listener rather than IntersectionObserver on the hero: this only
  // needs one boolean about the window, the handler is passive and does a
  // single comparison, and the state is set only when the value actually
  // flips, so React re-renders twice per page visit rather than per frame.
  const [onNight, setOnNight] = useState(true);
  useEffect(() => {
    // Roughly the hero's own height. Deliberately not measured off the DOM:
    // the fade to white is 180px tall, so anywhere in that band is the right
    // moment to swap and a precise boundary buys nothing.
    const SWAP_AT = 520;
    const read = () => setOnNight((was) => {
      const now = window.scrollY < SWAP_AT;
      return now === was ? was : now;
    });
    read();
    window.addEventListener('scroll', read, { passive: true });
    return () => window.removeEventListener('scroll', read);
  }, []);

  const linkColor = onNight ? 'rgba(255,255,255,0.72)' : MUTE;

  return (
    <header
      className="fixed inset-x-0 top-0 z-50"
      style={{
        // Solid, full-bleed bar that fills the notch / notification area so
        // page content scrolling underneath can never bleed into the status
        // bar. Floor the notch reserve at 2.75rem so the nav still clears the
        // status bar even when env(safe-area-inset-top) resolves to 0.
        paddingTop: 'max(env(safe-area-inset-top), 2.75rem)',
        background: onNight ? 'rgba(15,23,42,0.55)' : 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${onNight ? 'rgba(255,255,255,0.09)' : 'rgba(0,103,224,0.07)'}`,
        transition: 'background 260ms ease, border-color 260ms ease',
      }}
    >
      <div className="mx-auto max-w-6xl px-4">
        <nav className="flex items-center justify-between py-3">
          <Link href="/"><Wordmark light={onNight} /></Link>
          <div className="hidden items-center gap-7 md:flex">
            {NAV.map((n) => (
              <a key={n} href={`#${n.toLowerCase()}`} className="text-[13.5px] font-[560] transition-colors hover:opacity-70" style={{ color: linkColor }}>{n}</a>
            ))}
          </div>
          <div className="hidden items-center gap-2.5 md:flex">
            {/* Two doors, not one. Both used to point at /login and both said
                something vague; now each names who it is for. The split is
                enforced on the server — a member is refused at Admin Login
                and a studio account at Member Login — so these labels are a
                description of the rule, not a substitute for it. */}
            <Link href="/login" className={`rounded-xl px-3.5 py-2 text-[13.5px] font-[650] transition-colors ${onNight ? 'hover:bg-white/10' : 'hover:bg-black/[0.04]'}`}
              style={{ color: onNight ? ON_NIGHT : INK }}>Admin Login</Link>
            <Link href="/member-login" className="group inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[13.5px] font-[680] text-white transition-transform hover:-translate-y-0.5"
              style={{ background: `linear-gradient(135deg, ${MAROON} 0%, ${MAROON_DEEP} 100%)`, boxShadow: `0 8px 20px ${MAROON}40` }}>
              Member Login <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <button className="md:hidden" onClick={() => setOpen((s) => !s)} aria-label="Menu" style={{ color: onNight ? ON_NIGHT : INK }}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </nav>
        {/* The panel follows the bar. A white sheet dropping out of a dark
            translucent bar onto a dark hero was the one place the two
            treatments met and disagreed. */}
        {open && (
          <div className="mt-2 rounded-2xl p-3 md:hidden" style={{
            background: onNight ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            border: `1px solid ${onNight ? 'rgba(255,255,255,0.12)' : 'rgba(0,103,224,0.08)'}`,
          }}>
            {NAV.map((n) => (
              <a key={n} href={`#${n.toLowerCase()}`} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-[14px] font-[560]" style={{ color: onNight ? ON_NIGHT_2 : INK }}>{n}</a>
            ))}
            <div className="mt-2 flex gap-2 border-t pt-3" style={{ borderColor: onNight ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)' }}>
              <Link href="/login" onClick={() => setOpen(false)} className="flex-1 rounded-xl py-2.5 text-center text-[14px] font-[650]" style={{ color: onNight ? ON_NIGHT : INK, border: `1px solid ${onNight ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.1)'}` }}>Admin Login</Link>
              <Link href="/member-login" onClick={() => setOpen(false)} className="flex-1 rounded-xl py-2.5 text-center text-[14px] font-[680] text-white" style={{ background: MAROON }}>Member Login</Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

// ── Product mockup (the hero dashboard) ─────────────────────────────────────
function DashboardMock() {
  const bars = [42, 58, 51, 73, 66, 88, 79];
  return (
    <div
      className="relative overflow-hidden rounded-[22px] p-3 sm:p-4"
      // Border and shadow are for a DARK surround now. The 10%-blue hairline
      // was tuned against white and vanishes on the night stage, leaving a
      // bright panel with no edge; and a slate drop shadow has nothing to fall
      // on. A light rim plus a deeper, tighter shadow gives the panel back its
      // edge — the separation from the background is the glow behind it.
      style={{ background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.18)', boxShadow: '0 40px 90px -30px rgba(0,45,97,0.75), 0 12px 30px -12px rgba(15,23,42,0.55)' }}
    >
      {/* window chrome */}
      <div className="mb-3 flex items-center gap-1.5 px-1">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#FECACA' }} />
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#FEF3C7' }} />
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#CBD5E1' }} />
        <span className="ml-2 rounded-md px-2 py-0.5 text-[9px] font-[600]" style={{ background: 'rgba(0,103,224,0.06)', color: MAROON }}>app.myptstudio.com</span>
      </div>
      {/* KPI row */}
      <div className="grid grid-cols-3 gap-2.5">
        {[
          { l: 'Active Clients', v: '248', d: '+12%', i: <Users size={13} /> },
          { l: 'Revenue (MTD)', v: '₹6.4L', d: '+23%', i: <Wallet size={13} /> },
          { l: 'Sessions', v: '1,092', d: '+8%', i: <CalendarCheck size={13} /> },
        ].map((k) => (
          <div key={k.l} className="rounded-xl p-2.5" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.05)' }}>
            <div className="mb-1 flex items-center gap-1" style={{ color: MAROON }}>
              <span className="grid h-5 w-5 place-items-center rounded-md" style={{ background: 'rgba(0,103,224,0.08)' }}>{k.i}</span>
            </div>
            <div className="text-[15px] font-[800]" style={{ color: INK }}>{k.v}</div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-[600] uppercase tracking-wide" style={{ color: MUTE }}>{k.l}</span>
              <span className="text-[9px] font-[700]" style={{ color: '#059669' }}>{k.d}</span>
            </div>
          </div>
        ))}
      </div>
      {/* chart + list */}
      <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-5">
        <div className="rounded-xl p-3 sm:col-span-3" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.05)' }}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10.5px] font-[750]" style={{ color: INK }}>Revenue trend</span>
            <span className="text-[9px] font-[600]" style={{ color: MUTE }}>Last 7 months</span>
          </div>
          <div className="flex h-24 items-end gap-1.5">
            {bars.map((h, i) => (
              <div key={i} className="flex-1 rounded-t-md" style={{ height: `${h}%`, background: i === bars.length - 1 ? `linear-gradient(180deg, ${GOLD_HI}, ${GOLD})` : `linear-gradient(180deg, ${MAROON_HI}, ${MAROON})`, opacity: i === bars.length - 1 ? 1 : 0.85 }} />
            ))}
          </div>
        </div>
        <div className="rounded-xl p-3 sm:col-span-2" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.05)' }}>
          <span className="text-[10.5px] font-[750]" style={{ color: INK }}>Today's clients</span>
          <div className="mt-2 space-y-2">
            {['AR', 'KP', 'SM', 'DT'].map((n, i) => (
              <div key={n} className="flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-full text-[9px] font-[800] text-white" style={{ background: [MAROON, GOLD, MAROON_HI, '#059669'][i] }}>{n}</span>
                <div className="h-1.5 flex-1 rounded-full" style={{ background: 'rgba(0,0,0,0.06)' }}>
                  <div className="h-full rounded-full" style={{ width: `${[80, 55, 92, 40][i]}%`, background: GOLD }} />
                </div>
                <span className="text-[9px] font-[700]" style={{ color: MUTE }}>{['Done', 'PT', 'Done', 'New'][i]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Section shell ───────────────────────────────────────────────────────────
function Section({ id, children, className = '' }: { id?: string; children: ReactNode; className?: string }) {
  return <section id={id} className={`mx-auto max-w-6xl px-5 ${className}`}>{children}</section>;
}
/**
 * `night` is a variant rather than a replacement: this is used by eight
 * sections and only the hero is dark. On white the pill is a blue wash with
 * blue-500 text; on the night stage that pairing is 3.4:1 and effectively
 * unreadable, so the dark variant switches to the bright blue-950 accent on a
 * translucent white fill and measures 7.4:1.
 */
function Eyebrow({ children, night = false }: { children: ReactNode; night?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-[720] uppercase tracking-[0.14em]"
      // Near-white label, not the blue accent. Measured: blue-950 on this pill
      // — a 7% white fill over the stage, blurred, so it lifts to about
      // rgb(58,76,102) — is 3.2:1, and this is 11px uppercase, which needs
      // 4.5. gray-200 gives 7.1:1 on the same fill. The brand accent moves to
      // the sparkle at the call site, where it is decoration rather than the
      // words, and colour is still doing its job without carrying the reading.
      style={night
        ? {
          background: 'rgba(255,255,255,0.05)',
          color: ON_NIGHT_LABEL,
          border: '1px solid rgba(255,255,255,0.12)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10)',
        }
        : { background: 'rgba(0,103,224,0.06)', color: MAROON, border: '1px solid rgba(0,103,224,0.10)' }}>
      {children}
    </span>
  );
}

/**
 * The hero's dark stage.
 *
 * Wraps ONLY the hero. Everything below it — "Trusted by", features, pricing,
 * FAQ — stays on white, so the bottom edge has to hand off to that white
 * rather than stop at it: the last 180px fades NIGHT to #fff, which is why
 * there is no visible seam where the section ends.
 *
 * Structure, back to front:
 *   1. the charcoal base and its two corner pools of blue
 *   2. two slow, wide lights (CSS keyframes — see globals.css)
 *   3. a grain tile, mostly to stop the gradients banding
 *   4. a top vignette so the fixed nav always has something to sit on
 *   5. the fade to white
 *
 * All five are `pointer-events-none` and sit behind `relative z-10` content,
 * so none of them can intercept a click on the CTA.
 */
function HeroStage({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate overflow-hidden" style={{ background: NIGHT }}>
      {/* 1 — base: charcoal, lifted a little at the top, with blue pooling
             only in the corners.
             Held back deliberately. The first pass ran these at full strength
             and the result was a blue gradient rather than a charcoal room —
             the brief asks for a dark stage with brand light in it, which
             means the blue has to stay in the corners and out of the middle
             where the copy sits. */}
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{
        background:
          `radial-gradient(115% 70% at 50% -12%, ${NIGHT_LIFT} 0%, transparent 55%),` +
          `radial-gradient(70% 55% at 6% 4%, ${NIGHT_BLUE} 0%, transparent 60%),` +
          `radial-gradient(65% 50% at 94% 96%, ${NIGHT_BLUE} 0%, transparent 58%)`,
        opacity: 0.7,
      }} />

      {/* 2 — the two lights. Large, soft, low-opacity: the stage being lit,
             not two coloured circles. */}
      <div aria-hidden className="hero-glow-a pointer-events-none absolute" style={{
        top: '-22%', left: '50%', width: 'min(1000px, 140%)', height: '560px',
        marginLeft: 'min(-500px, -70%)',
        background: `radial-gradient(circle, ${NIGHT_BLUE_2} 0%, transparent 68%)`,
        filter: 'blur(70px)', opacity: 0.42,
      }} />
      <div aria-hidden className="hero-glow-b pointer-events-none absolute" style={{
        top: '26%', right: '-14%', width: 'min(700px, 100%)', height: '480px',
        background: `radial-gradient(circle, ${MAROON} 0%, transparent 66%)`,
        filter: 'blur(90px)', opacity: 0.16,
      }} />

      {/* 3 — grain */}
      <div aria-hidden className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: GRAIN, backgroundRepeat: 'repeat', opacity: 0.035, mixBlendMode: 'overlay' }} />

      {/* 4 — top vignette. The nav is fixed and translucent; without this the
             lights can drift up behind it and change how the bar reads. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40"
        style={{ background: `linear-gradient(180deg, rgba(15,23,42,0.72) 0%, transparent 100%)` }} />

      {/* 5 — the handoff to the white page below */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[170px]"
        style={{ background: `linear-gradient(180deg, rgba(15,23,42,0) 0%, ${NIGHT} 38%, #fff 100%)` }} />

      {/* The reserve below the content is what keeps the product mock OFF the
          fade. Without it the stage ended about 56px under the mock while the
          fade is 170px tall, so the white ran up through the mock's lower
          third — and the mock is a 90%-white panel with a 10%-blue border, so
          where the two met it dissolved: chart bars ending in nothing, and the
          "+18% this month" card gone entirely, white on white. */}
      <div className="relative z-10 pb-[120px] sm:pb-[150px]">{children}</div>
    </div>
  );
}

// ── Data ────────────────────────────────────────────────────────────────────
const FEATURES = [
  { i: Users, t: 'Client CRM', d: 'Every client, plan and payment in one profile — no more scattered sheets.' },
  { i: Dumbbell, t: 'Workout Builder', d: 'Drag-and-drop programmes from a rich exercise library, assigned in seconds.' },
  { i: Salad, t: 'Nutrition Planner', d: 'Macro-aware meal plans and daily tracking your clients actually follow.' },
  { i: CalendarCheck, t: 'Attendance', d: 'QR, face and biometric check-in with live occupancy and peak-hour insight.' },
  { i: LineChart, t: 'Progress Tracking', d: 'Strength PRs, volume trends and photos that prove the results you deliver.' },
  { i: Ruler, t: 'Body Composition', d: 'Measurements, body-fat and assessments scored automatically over time.' },
  { i: Wallet, t: 'Revenue Dashboard', d: 'Live revenue, dues and renewals — know exactly where the money is.' },
  { i: FileText, t: 'Invoices', d: 'Branded invoices and receipts generated the moment a payment lands.' },
  { i: CreditCard, t: 'Payments', d: 'Record, reconcile and chase dues without a single spreadsheet.' },
  { i: Inbox, t: 'Lead Management', d: 'Capture enquiries, follow up on time and convert more trials.' },
  { i: Zap, t: 'Automation', d: 'Renewal nudges, check-in reminders and follow-ups that run themselves.' },
  { i: BookOpen, t: 'Exercise Library', d: 'Hundreds of exercises with cues, media and muscle mapping built in.' },
  { i: ClipboardList, t: 'Assessment Forms', d: 'Digital PAR-Q, consent and screening with server-side risk scoring.' },
  { i: Bot, t: 'AI Assistant', d: 'Draft plans, summarise progress and answer client questions in a click.' },
  { i: UsersRound, t: 'Multi-Trainer', d: 'Add your team with per-role permissions and commission tracking.' },
  { i: Building2, t: 'Multi-Tenant', d: 'Run multiple studios from one platform, each fully isolated and secure.' },
];

const SECONDARY = [
  { i: Smartphone, t: 'Mobile friendly' }, { i: Cloud, t: 'Cloud storage' }, { i: Bell, t: 'Notifications' },
  { i: BarChart3, t: 'Reports & analytics' }, { i: ShieldCheck, t: 'Role permissions' }, { i: FileText, t: 'Data export' },
];

const COMPARE = [
  { f: 'One source of truth', me: true as const, wa: false as const, gs: 'partial' as const },
  { f: 'Automated billing & dues', me: true as const, wa: false as const, gs: 'partial' as const },
  { f: 'Workout & nutrition builder', me: true as const, wa: false as const, gs: false as const },
  { f: 'Progress & body composition', me: true as const, wa: false as const, gs: false as const },
  { f: 'Attendance & check-in', me: true as const, wa: false as const, gs: 'partial' as const },
  { f: 'Multi-trainer & permissions', me: true as const, wa: false as const, gs: 'partial' as const },
  { f: 'Built for fitness businesses', me: true as const, wa: false as const, gs: false as const },
];

const TESTIMONIALS = [
  { q: 'We replaced four tools and a pile of spreadsheets with one platform. Our renewals are up 30% because nothing slips through the cracks.', n: 'Studio Owner', r: 'Boutique Fitness Studio' },
  { q: 'Onboarding a client used to take an hour. Now it takes five minutes — plan, nutrition, consent, payment, done.', n: 'Head Coach', r: 'Online Coaching Business' },
  { q: 'For the first time I can see my whole business at a glance. Revenue, attendance, dues — it is all just there.', n: 'Founder', r: 'Strength & Conditioning Gym' },
];

/**
 * Feature bullets per plan. These are marketing copy and stay hardcoded, but
 * the NAME, PRICE, TERM and CLIENT LIMIT all come from the live plan catalogue —
 * they are commercial promises and must match what checkout actually charges.
 *
 * This page previously hardcoded its own price list, which had drifted badly:
 * it advertised ₹999/mo for 30 clients while the system charges ₹1,499/mo with
 * a 5-client cap, and listed two plans ("Studio", "Enterprise") that do not
 * exist. Anyone signing up was being quoted a price the product could not
 * honour, so pricing is now read from the same source of truth as billing.
 */
const PLAN_FEATURES: Record<string, string[]> = {
  starter: ['Client CRM & profiles', 'Workout & nutrition builder', 'Payments & invoices', 'Mobile app access'],
  growth: ['Everything in Starter', 'Progress & body composition', 'Automation & reminders', 'Reports & analytics'],
  professional: ['Everything in Growth', 'Attendance & check-in', 'Commission tracking', 'Priority support'],
  elite: ['Everything in Professional', 'Multi-trainer & permissions', 'AI assistant', 'Dedicated onboarding'],
};

const HIGHLIGHT_PLAN = 'professional';

function planTerm(months: number): string {
  if (months === 1) return '/mo';
  if (months === 12) return '/yr';
  return `/${months} mo`;
}

const FAQ = [
  { q: 'What is MY PT STUDIO?', a: 'A complete operating system for fitness professionals — CRM, workout and nutrition builders, attendance, progress tracking, payments and analytics in one platform, so you can run your entire business from a single place.' },
  { q: 'Who is it for?', a: 'Personal trainers, online coaches, gym owners, fitness studios, strength coaches, sports academies and wellness businesses of any size — from solo coaches to multi-studio chains.' },
  { q: 'Do my clients need to install anything?', a: 'No. The platform is fully web-based and mobile-friendly. You manage everything from any device, and clients can be onboarded in minutes.' },
  { q: 'Can I run more than one studio?', a: 'Yes. Our multi-tenant architecture lets you run multiple studios from one account, each with fully isolated data, its own team, branding and permissions.' },
  { q: 'Is my data secure?', a: 'Every studio is isolated at the database level with row-level security, encrypted connections and role-based access control. Your data is yours, and it is never shared across studios.' },
  { q: 'How do I get started?', a: 'Start free — create your studio in a couple of minutes. Our team reviews it, then helps you import your clients so you are live in a day, not a month.' },
];

// ── Page ────────────────────────────────────────────────────────────────────
type PublicPlan = {
  code: string; name: string; price_inr: number; effective_price_inr: number;
  is_launch: boolean; duration_months: number; client_limit: number | null; best_for: string | null;
};
type PublicStats = { studios: number; trainers: number; active_clients: number; sessions_completed: number };

export default function LandingPage() {
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [founderSlots, setFounderSlots] = useState<number | null>(null);
  const [trialDays, setTrialDays] = useState(7);
  const [stats, setStats] = useState<PublicStats | null>(null);

  // Public, unauthenticated endpoints. Failures are swallowed on purpose: the
  // marketing page must still render if the API is cold or unreachable, it just
  // renders without live figures rather than with invented ones.
  useEffect(() => {
    const base = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/+$/, '');
    const url = (p: string) =>
      (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
        ? p : `${base}${p}`;

    fetch(url('/api/public/plans'))
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!j?.data) return;
        setPlans(j.data.plans ?? []);
        setFounderSlots(j.data.founder_slots_remaining ?? null);
        if (j.data.trial_days) setTrialDays(j.data.trial_days);
      })
      .catch(() => {});

    fetch(url('/api/public/stats'))
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j?.data) setStats(j.data); })
      .catch(() => {});
  }, []);

  // Only state a number once it actually says something. The previous band
  // claimed 12k+ coaches / 1.4M clients / 9M sessions / 40+ countries against a
  // real platform of 3 studios — publishing "0 sessions tracked" instead would
  // be honest but no better, so the band simply hides until the figures earn
  // their place.
  const statBand = stats
    ? ([
      ['Studios', stats.studios],
      ['Coaches', stats.trainers],
      ['Clients managed', stats.active_clients],
      ['Sessions delivered', stats.sessions_completed],
    ] as const).filter(([, v]) => v > 0)
    : [];
  const showStats = stats != null && stats.studios >= 25;

  return (
    <div className="relative min-h-screen" style={{ background: '#fff', color: INK }}>
      {/* ambient background — clipped so the decorative orbs never create
          horizontal document overflow. (We deliberately avoid overflow-x on the
          page wrapper itself: it forces overflow-y to `auto`, turning the
          wrapper into a nested scroll container that breaks document scrolling
          on Android/desktop while iOS's momentum layer papers over it.) */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full" style={{ background: `radial-gradient(circle, ${MAROON}18, transparent 68%)` }} />
        <div className="absolute -right-40 top-24 h-[560px] w-[560px] rounded-full" style={{ background: `radial-gradient(circle, ${GOLD}22, transparent 68%)` }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 50% -8%, rgba(0,103,224,0.06), transparent 60%)' }} />
      </div>

      <Nav />

      {/* ── HERO (Apple-style: centered logo, big type, pill CTAs) ──
          Top padding adds exactly the notch height on top of the base
          clearance so the logo always sits below the fixed topbar +
          notification area, never cramped under it on notched phones. */}
      <HeroStage>
      <Section id="solutions" className="pb-16 text-center pt-[calc(max(env(safe-area-inset-top),2.75rem)+6.5rem)] sm:pt-[calc(max(env(safe-area-inset-top),2.75rem)+7.5rem)]">
        <Reveal>
          {/* Wide lockup, sized responsively. The halo runs at full strength on
              the night stage — it was dialled back to 0.85 because on white it
              bled into the eyebrow pill directly beneath, which is the opposite
              problem to the one a dark background has. */}
          <div className="mb-7 flex justify-center">
            <span className="sm:hidden"><BrandLogoWide width={252} priority intensity={1} night /></span>
            <span className="hidden sm:inline"><BrandLogoWide width={340} priority intensity={1} night /></span>
          </div>
        </Reveal>
        <Reveal delay={0.04}>
          <Eyebrow night><span style={{ color: NIGHT_ACCENT, display: 'inline-flex' }}><Sparkles size={13} /></span> The operating system for fitness professionals</Eyebrow>
        </Reveal>
        <Reveal delay={0.08}>
          {/* leading 1.03 -> 1.05: at 68px the tighter setting had the
              descenders of "your" almost touching the "f" of "fitness". */}
          <h1 className="mx-auto mt-6 max-w-4xl text-[40px] font-[860] leading-[1.05] tracking-[-0.035em] sm:text-[68px]"
            style={{ color: ON_NIGHT, textShadow: '0 1px 40px rgba(15,23,42,0.55)' }}>
            Run your entire<br className="hidden sm:block" /> fitness business
            <br className="hidden sm:block" /> <span style={gradTextNight}>from one platform.</span>
          </h1>
        </Reveal>
        <Reveal delay={0.12}>
          {/* max-w-2xl -> 40ch: a measure in characters holds ~65 per line at
              every size, where the rem cap gave 92 on a desktop — long enough
              that the eye loses the line return under a 68px headline. */}
          <p className="mx-auto mt-6 text-[16px] leading-relaxed sm:text-[19px]"
            style={{ color: ON_NIGHT_2, maxWidth: '62ch' }}>
            MY PT STUDIO is the software that runs modern personal trainers, coaches and studios —
            clients, workouts, nutrition, attendance, payments and analytics, beautifully unified.
          </p>
        </Reveal>
        <Reveal delay={0.16}>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {/* The gradient ran brand-blue to near-black, which on white reads
                as depth and on the night stage would have faded the button's
                lower half into the floor. It runs blue-450 to blue-600 now —
                lit rather than shadowed — with a white inner highlight and a
                ring so the edge stays defined against the dark.
                3.9:1 against the stage as a UI surface, white label 4.7:1. */}
            <Link href="/start-free" className="group inline-flex w-full items-center justify-center gap-2 rounded-full px-7 py-3.5 text-[15px] font-[720] text-white transition-transform duration-200 hover:-translate-y-0.5 sm:w-auto"
              style={{
                background: `linear-gradient(135deg, ${MAROON_HI} 0%, ${MAROON} 55%, #0059CE 100%)`,
                border: '1px solid rgba(255,255,255,0.16)',
                boxShadow: `0 14px 40px rgba(0,103,224,0.42), 0 2px 6px rgba(15,23,42,0.4), inset 0 1px 0 rgba(255,255,255,0.24)`,
              }}>
              Start free <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <p className="mt-3.5 text-[12.5px]" style={{ color: ON_NIGHT_3 }}>No credit card required · Set up in a day · Cancel anytime</p>
        </Reveal>

        <Reveal delay={0.2} y={34}>
          <div className="relative mx-auto mt-14 max-w-4xl">
            {/* The product, lit from behind. On white the mock's own drop
                shadow was what separated it from the page; on the night stage
                a shadow has nothing to fall on, so the separation comes from
                light instead. Sits behind everything in this block and takes
                no pointer events. */}
            <div aria-hidden className="pointer-events-none absolute -inset-x-10 -top-10 bottom-0 -z-10"
              style={{
                background: `radial-gradient(60% 50% at 50% 40%, rgba(0,103,224,0.34) 0%, transparent 70%)`,
                filter: 'blur(50px)',
              }} />
            {/* floating accent cards */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.5, duration: 0.6 }}
              className="absolute -left-4 top-10 z-10 hidden rounded-2xl p-3 sm:-left-10 sm:block"
              style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 20px 40px -18px rgba(15,23,42,0.3)' }}>
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg text-white" style={{ background: '#059669' }}><Check size={16} /></span>
                <div className="text-left">
                  <div className="text-[12px] font-[800]" style={{ color: INK }}>Payment received</div>
                  <div className="text-[10px]" style={{ color: MUTE }}>₹8,000 · Renewal</div>
                </div>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.65, duration: 0.6 }}
              className="absolute -right-4 bottom-8 z-10 hidden rounded-2xl p-3 sm:-right-10 sm:block"
              style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 20px 40px -18px rgba(15,23,42,0.3)' }}>
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg text-white" style={{ background: GOLD }}><LineChart size={16} /></span>
                <div className="text-left">
                  <div className="text-[12px] font-[800]" style={{ color: INK }}>+18% this month</div>
                  <div className="text-[10px]" style={{ color: MUTE }}>Active clients</div>
                </div>
              </div>
            </motion.div>
            <DashboardMock />
          </div>
        </Reveal>
      </Section>
      </HeroStage>

      {/* ── TRUSTED BY ── */}
      <Section className="py-14">
        <Reveal>
          <p className="text-center text-[12px] font-[700] uppercase tracking-[0.18em]" style={{ color: MUTE }}>
            Trusted by fitness businesses worldwide
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {['IRONWORKS', 'PULSE STUDIO', 'APEX COACHING', 'CORE ACADEMY', 'VITAL GYM', 'FORGE PT'].map((b) => (
              <span key={b} className="text-[15px] font-[820] tracking-tight" style={{ color: INK, opacity: 0.42 }}>{b}</span>
            ))}
          </div>
          {/* Live platform figures, shown only once they are worth stating.
              This band previously read "12k+ active coaches · 1.4M+ clients
              managed · 9M+ sessions tracked · 40+ countries" against a platform
              of three studios — none of it measured, and "countries" is not
              even a field the schema records. */}
          {showStats && statBand.length > 0 && (
            <div className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
              {statBand.map(([l, v]) => (
                <div key={l} className="text-center">
                  <div className="text-[28px] font-[850] tracking-tight tabular-nums" style={gradText}>
                    {v.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[12px] font-[600]" style={{ color: MUTE }}>{l}</div>
                </div>
              ))}
            </div>
          )}
        </Reveal>
      </Section>

      {/* ── PROBLEM → SOLUTION ── */}
      <Section className="py-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>The old way is broken</Eyebrow>
          <h2 className="mt-5 text-[30px] font-[820] leading-tight tracking-[-0.02em] sm:text-[42px]">
            Your business shouldn't live in <span style={{ color: MAROON }}>ten browser tabs.</span>
          </h2>
          <p className="mt-4 text-[16px]" style={{ color: MUTE }}>
            Spreadsheets, chat threads and paper forms don't scale. MY PT STUDIO replaces the chaos with one calm, connected system.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-3xl p-7" style={{ background: 'rgba(15,23,42,0.03)', border: '1px solid rgba(15,23,42,0.10)' }}>
              <span className="text-[12px] font-[720] uppercase tracking-[0.14em]" style={{ color: MAROON }}>Before</span>
              <ul className="mt-5 space-y-3.5">
                {['Client data scattered across Excel & Sheets', 'Plans and updates lost in WhatsApp', 'Manual billing, missed renewals & dues', 'Attendance on paper, no real insight', 'No single view of the business'].map((p) => (
                  <li key={p} className="flex items-start gap-3 text-[14px]" style={{ color: INK }}>
                    <X size={18} className="mt-0.5 shrink-0" style={{ color: '#DC2626' }} /> <span style={{ opacity: 0.82 }}>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="relative h-full overflow-hidden rounded-3xl p-7 text-white" style={{ background: `linear-gradient(150deg, ${MAROON} 0%, ${MAROON_DEEP} 88%)`, boxShadow: `0 30px 60px -24px ${MAROON}88` }}>
              <div aria-hidden className="absolute -right-16 -top-16 h-52 w-52 rounded-full" style={{ background: `radial-gradient(circle, ${GOLD}55, transparent 70%)` }} />
              <span className="relative text-[12px] font-[720] uppercase tracking-[0.14em]" style={{ color: GOLD_HI }}>With MY PT STUDIO</span>
              <ul className="relative mt-5 space-y-3.5">
                {['One profile per client — plans, payments, progress', 'Everything in sync, on every device', 'Automated invoices, dues & renewal nudges', 'QR / face check-in with live analytics', 'Your whole business at a glance'].map((p) => (
                  <li key={p} className="flex items-start gap-3 text-[14px]">
                    <span className="mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full" style={{ background: GOLD }}><Check size={12} style={{ color: MAROON_DEEP }} /></span>
                    <span style={{ opacity: 0.94 }}>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* ── FEATURES ── */}
      <Section id="features" className="py-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>Everything in one platform</Eyebrow>
          <h2 className="mt-5 text-[30px] font-[820] leading-tight tracking-[-0.02em] sm:text-[42px]">One platform. <span style={gradText}>Every tool you need.</span></h2>
          <p className="mt-4 text-[16px]" style={{ color: MUTE }}>From the first enquiry to the tenth renewal — every part of your business, thoughtfully connected.</p>
        </Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, idx) => (
            <Reveal key={f.t} delay={(idx % 4) * 0.05}>
              <div className="group h-full rounded-2xl p-5 transition-all hover:-translate-y-1"
                style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <span className="grid h-11 w-11 place-items-center rounded-xl transition-transform group-hover:scale-105"
                  style={{ background: `linear-gradient(135deg, ${MAROON}14, ${GOLD}18)`, color: MAROON }}>
                  <f.i size={19} />
                </span>
                <h3 className="mt-4 text-[15px] font-[750]" style={{ color: INK }}>{f.t}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: MUTE }}>{f.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.1}>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            {SECONDARY.map((s) => (
              <span key={s.t} className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-[600]"
                style={{ background: 'rgba(0,103,224,0.05)', color: INK, border: '1px solid rgba(0,103,224,0.08)' }}>
                <s.i size={14} style={{ color: MAROON }} /> {s.t}
              </span>
            ))}
          </div>
        </Reveal>
      </Section>

      {/* ── PLATFORM SHOWCASE ── */}
      <Section className="py-20">
        <Reveal>
          <div className="overflow-hidden rounded-[32px] p-8 sm:p-12" style={{ background: 'linear-gradient(160deg, #F8FAFC 0%, #F1F5F9 100%)', border: '1px solid rgba(0,103,224,0.08)' }}>
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div>
                <Eyebrow>Beautiful on every screen</Eyebrow>
                <h2 className="mt-5 text-[28px] font-[820] leading-tight tracking-[-0.02em] sm:text-[38px]">Desktop, tablet, phone — <span style={{ color: MAROON }}>your studio travels with you.</span></h2>
                <p className="mt-4 text-[15px]" style={{ color: MUTE }}>Coach from the gym floor, review revenue from the sofa, onboard a client from your phone. Same data, everywhere, instantly.</p>
                <ul className="mt-6 space-y-3">
                  {['Native-feeling web app — nothing to install', 'Real-time sync across your whole team', 'Works beautifully on any device'].map((p) => (
                    <li key={p} className="flex items-center gap-2.5 text-[14px] font-[560]" style={{ color: INK }}>
                      <span className="grid h-5 w-5 place-items-center rounded-full text-white" style={{ background: MAROON }}><Check size={12} /></span> {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative">
                <div className="rounded-2xl p-2" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 30px 60px -30px rgba(15,23,42,0.35)' }}>
                  <DashboardMock />
                </div>
                {/* phone frame */}
                <div className="absolute -bottom-6 -right-2 w-28 rounded-[20px] p-1.5 sm:w-32" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 24px 44px -18px rgba(15,23,42,0.4)' }}>
                  <div className="rounded-[15px] p-2" style={{ background: `linear-gradient(160deg, ${MAROON}, ${MAROON_DEEP})` }}>
                    <div className="text-[8px] font-[700] text-white opacity-80">Today</div>
                    <div className="mt-0.5 text-[15px] font-[850] text-white">₹6.4L</div>
                    <div className="mt-2 space-y-1.5">
                      {[70, 45, 88].map((w, i) => (
                        <div key={i} className="h-1.5 rounded-full bg-white/25"><div className="h-full rounded-full" style={{ width: `${w}%`, background: GOLD_HI }} /></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </Section>

      {/* ── WHY / COMPARE ── */}
      <Section className="py-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>Why MY PT STUDIO</Eyebrow>
          <h2 className="mt-5 text-[30px] font-[820] leading-tight tracking-[-0.02em] sm:text-[42px]">Built for fitness businesses — <span style={gradText}>not adapted for them.</span></h2>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="mt-12 overflow-hidden rounded-3xl" style={{ border: '1px solid rgba(0,0,0,0.07)' }}>
            <div className="grid grid-cols-5 items-center px-5 py-4 text-[12px] font-[700]" style={{ background: '#F8FAFC', color: MUTE }}>
              <div className="col-span-2 text-left" style={{ color: INK }}>Capability</div>
              <div className="text-center" style={{ color: MAROON }}>MY PT STUDIO</div>
              <div className="text-center">Excel / Sheets</div>
              <div className="text-center">WhatsApp</div>
            </div>
            {COMPARE.map((row, i) => (
              <div key={row.f} className="grid grid-cols-5 items-center px-5 py-3.5 text-[13.5px]" style={{ background: i % 2 ? 'rgba(0,0,0,0.015)' : '#fff', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                <div className="col-span-2 font-[600]" style={{ color: INK }}>{row.f}</div>
                <div className="flex justify-center"><Cell v={row.me} strong /></div>
                <div className="flex justify-center"><Cell v={row.gs} /></div>
                <div className="flex justify-center"><Cell v={row.wa} /></div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-[12px]" style={{ color: MUTE }}>Generic gym software gets you part of the way. MY PT STUDIO is the whole journey.</p>
        </Reveal>
      </Section>

      {/* ── TESTIMONIALS ── */}
      <Section id="resources" className="py-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>Loved by fitness businesses</Eyebrow>
          <h2 className="mt-5 text-[30px] font-[820] leading-tight tracking-[-0.02em] sm:text-[42px]">The platform coaches switch to and <span style={{ color: MAROON }}>never leave.</span></h2>
        </Reveal>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.n} delay={i * 0.07}>
              <div className="flex h-full flex-col rounded-3xl p-6" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <Quote size={26} style={{ color: GOLD }} />
                <div className="mt-2 flex gap-0.5">{Array.from({ length: 5 }).map((_, s) => <Star key={s} size={14} style={{ color: GOLD, fill: GOLD }} />)}</div>
                <p className="mt-3 flex-1 text-[14px] leading-relaxed" style={{ color: INK, opacity: 0.86 }}>“{t.q}”</p>
                <div className="mt-5 border-t pt-4" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                  <div className="text-[13.5px] font-[750]" style={{ color: INK }}>{t.n}</div>
                  <div className="text-[12px]" style={{ color: MUTE }}>{t.r}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ── PRICING ── */}
      <Section id="pricing" className="py-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>Simple, scalable pricing</Eyebrow>
          <h2 className="mt-5 text-[30px] font-[820] leading-tight tracking-[-0.02em] sm:text-[42px]">Pricing that grows <span style={gradText}>with your studio.</span></h2>
          <p className="mt-4 text-[16px]" style={{ color: MUTE }}>
            Every plan starts with a {trialDays}-day free trial. No card required, no lock-in.
          </p>
          {founderSlots != null && founderSlots > 0 && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-[700]"
              style={{ background: `${GOLD}22`, color: MAROON_DEEP }}>
              <Star size={13} /> Founder&apos;s Club — {founderSlots} lifetime-locked {founderSlots === 1 ? 'place' : 'places'} left
            </p>
          )}
        </Reveal>

        {/* Rendered from the live catalogue. If it cannot be reached the section
            shows nothing rather than falling back to stale hardcoded prices. */}
        {plans.length === 0 ? (
          <p className="mt-12 text-center text-[14px]" style={{ color: MUTE }}>
            Plan pricing is loading — or <Link href="/login" className="underline" style={{ color: MAROON }}>sign in</Link> to see your options.
          </p>
        ) : (
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((p, i) => {
              const highlight = p.code === HIGHLIGHT_PLAN;
              const limit = p.client_limit == null ? 'Unlimited active clients' : `Up to ${p.client_limit} active clients`;
              const feats = [limit, ...(PLAN_FEATURES[p.code] ?? [])];
              return (
                <Reveal key={p.code} delay={i * 0.05}>
                  <div className="relative flex h-full flex-col rounded-3xl p-6"
                    style={highlight
                      ? { background: `linear-gradient(160deg, ${MAROON} 0%, ${MAROON_DEEP} 92%)`, color: '#fff', boxShadow: `0 30px 60px -26px ${MAROON}99`, border: '1px solid transparent' }
                      : { background: '#fff', border: '1px solid rgba(0,0,0,0.08)' }}>
                    {highlight && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[10.5px] font-[800] uppercase tracking-wide" style={{ background: GOLD, color: MAROON_DEEP }}>Most popular</span>
                    )}
                    {p.is_launch && !highlight && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[10.5px] font-[800] uppercase tracking-wide" style={{ background: GOLD, color: MAROON_DEEP }}>Launch offer</span>
                    )}
                    <div className="text-[15px] font-[780]" style={{ color: highlight ? '#fff' : INK }}>{p.name}</div>
                    <div className="mt-1 text-[12px]" style={{ color: highlight ? 'rgba(255,255,255,0.7)' : MUTE }}>{p.best_for}</div>
                    <div className="mt-4 flex items-end gap-1.5">
                      <span className="text-[32px] font-[860] tracking-tight" style={{ color: highlight ? '#fff' : INK }}>
                        ₹{p.effective_price_inr.toLocaleString('en-IN')}
                      </span>
                      <span className="pb-1.5 text-[13px]" style={{ color: highlight ? 'rgba(255,255,255,0.7)' : MUTE }}>
                        {planTerm(p.duration_months)}
                      </span>
                    </div>
                    {/* Struck-through list price only when a launch discount is
                        genuinely active — never as a permanent fake anchor. */}
                    {p.is_launch && p.effective_price_inr < p.price_inr && (
                      <div className="mt-0.5 text-[12.5px]">
                        <span className="line-through" style={{ color: highlight ? 'rgba(255,255,255,0.6)' : MUTE }}>
                          ₹{p.price_inr.toLocaleString('en-IN')}
                        </span>
                        <span className="ml-1.5 font-[700]" style={{ color: highlight ? GOLD_HI : '#059669' }}>
                          save ₹{(p.price_inr - p.effective_price_inr).toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}
                    <Link href="/login" className="mt-5 inline-flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13.5px] font-[720] transition-transform hover:-translate-y-0.5"
                      style={highlight ? { background: GOLD, color: MAROON_DEEP } : { background: MAROON, color: '#fff' }}>
                      Start {trialDays}-day trial <ArrowRight size={15} />
                    </Link>
                    <ul className="mt-6 space-y-2.5">
                      {feats.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-[13px]" style={{ color: highlight ? 'rgba(255,255,255,0.92)' : INK }}>
                          <Check size={15} className="mt-0.5 shrink-0" style={{ color: highlight ? GOLD_HI : '#059669' }} />
                          <span style={{ opacity: highlight ? 1 : 0.82 }}>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              );
            })}
          </div>
        )}
      </Section>

      {/* ── FAQ ── */}
      <Section id="about" className="py-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>Questions, answered</Eyebrow>
          <h2 className="mt-5 text-[30px] font-[820] leading-tight tracking-[-0.02em] sm:text-[42px]">Everything you need to know.</h2>
        </Reveal>
        <div className="mx-auto mt-10 max-w-3xl space-y-3">
          {FAQ.map((item, i) => {
            const open = faqOpen === i;
            return (
              <Reveal key={item.q} delay={i * 0.03}>
                <div className="overflow-hidden rounded-2xl" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)' }}>
                  <button onClick={() => setFaqOpen(open ? null : i)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left">
                    <span className="text-[15px] font-[680]" style={{ color: INK }}>{item.q}</span>
                    <ChevronDown size={18} className="shrink-0 transition-transform" style={{ color: MAROON, transform: open ? 'rotate(180deg)' : 'none' }} />
                  </button>
                  {open && <div className="px-5 pb-5 text-[14px] leading-relaxed" style={{ color: MUTE }}>{item.a}</div>}
                </div>
              </Reveal>
            );
          })}
        </div>
      </Section>

      {/* ── FINAL CTA ── */}
      <Section className="pb-24 pt-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-[36px] px-8 py-16 text-center text-white sm:px-16" style={{ background: `linear-gradient(150deg, ${MAROON} 0%, ${MAROON_DEEP} 90%)` }}>
            <div aria-hidden className="absolute -left-20 -top-20 h-72 w-72 rounded-full" style={{ background: `radial-gradient(circle, ${GOLD}44, transparent 70%)` }} />
            <div aria-hidden className="absolute -bottom-24 -right-16 h-80 w-80 rounded-full" style={{ background: `radial-gradient(circle, ${GOLD}33, transparent 70%)` }} />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl text-[30px] font-[850] leading-tight tracking-[-0.02em] sm:text-[46px]">Ready to build your fitness business?</h2>
              <p className="mx-auto mt-4 max-w-xl text-[16px]" style={{ color: 'rgba(255,255,255,0.82)' }}>Join the coaches and studios running everything on one platform. Start free today.</p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/start-free" className="inline-flex w-full items-center justify-center gap-2 rounded-2xl px-7 py-3.5 text-[15px] font-[760] transition-transform hover:-translate-y-0.5 sm:w-auto" style={{ background: GOLD, color: MAROON_DEEP }}>
                  Start free <ArrowRight size={17} />
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </Section>

      {/* ── FOOTER ── */}
      <footer className="border-t" style={{ borderColor: 'rgba(0,0,0,0.07)' }}>
        <Section className="py-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <Wordmark />
              <p className="mt-4 max-w-xs text-[13.5px] leading-relaxed" style={{ color: MUTE }}>
                The operating system for modern personal trainers, coaches and studios. Grow faster, coach better, scale smarter.
              </p>
            </div>
            {[
              ['Product', ['Features', 'Pricing', 'Platform', 'Mobile']],
              ['Company', ['About', 'Resources', 'Careers', 'Contact']],
              ['Legal', ['Privacy', 'Terms', 'Security', 'DPA']],
            ].map(([h, items]) => (
              <div key={h as string}>
                <div className="text-[12px] font-[750] uppercase tracking-[0.12em]" style={{ color: INK }}>{h as string}</div>
                <ul className="mt-4 space-y-2.5">
                  {(items as string[]).map((it) => (
                    <li key={it}><a href="#features" className="text-[13.5px] transition-colors hover:opacity-60" style={{ color: MUTE }}>{it}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t pt-6 sm:flex-row" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
            <p className="text-[12.5px]" style={{ color: MUTE }}>© {new Date().getFullYear()} MY PT STUDIO. All rights reserved.</p>
            <div className="flex items-center gap-1.5 text-[12px] font-[600]" style={{ color: MUTE }}>
              <ShieldCheck size={14} style={{ color: MAROON }} /> Enterprise-grade security · Multi-tenant isolation
            </div>
          </div>
        </Section>
      </footer>
    </div>
  );
}

// comparison cell
function Cell({ v, strong = false }: { v: boolean | 'partial'; strong?: boolean }) {
  if (v === true) return <span className="grid h-6 w-6 place-items-center rounded-full text-white" style={{ background: strong ? MAROON : '#059669' }}><Check size={13} /></span>;
  if (v === 'partial') return <span className="h-1 w-4 rounded-full" style={{ background: '#FBBF24' }} />;
  return <X size={16} style={{ color: '#CBD5E1' }} />;
}
