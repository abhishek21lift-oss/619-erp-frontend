'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  m,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
  useInView,
  useReducedMotion,
  AnimatePresence,
} from 'framer-motion';
import {
  Dumbbell, Salad, Trophy, Smartphone, Users,
  Target, BarChart3, HeartHandshake, Sparkles, ShieldCheck,
  Phone, MapPin, Clock, Instagram, Youtube, MessageCircle,
  ArrowRight, Check, Plus, Menu, X,
} from 'lucide-react';

/* ────────────────────────────────────────────────────────────────
   Contact (real business details, driven by env with sane defaults)
──────────────────────────────────────────────────────────────── */
const SUPPORT_PHONE_RAW    = process.env.NEXT_PUBLIC_SUPPORT_PHONE || '+918756562188';
const SUPPORT_PHONE_DIGITS = SUPPORT_PHONE_RAW.replace(/\D/g, '');
const SUPPORT_WA_URL       = `https://wa.me/${SUPPORT_PHONE_DIGITS}`;
const SUPPORT_TEL_URL      = `tel:${SUPPORT_PHONE_RAW}`;

const EASE = [0.22, 1, 0.36, 1] as const;

/* ================================================================
   Reusable motion primitives
================================================================ */

function Reveal({
  children, delay = 0, y = 26, className, style, as = 'div',
}: {
  children: ReactNode; delay?: number; y?: number;
  className?: string; style?: CSSProperties; as?: 'div' | 'section' | 'span';
}) {
  const reduce = useReducedMotion();
  const MAP = { div: m.div, section: m.section, span: m.span } as const;
  const Comp = MAP[as];
  return (
    <Comp
      className={className}
      style={style}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-70px' }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </Comp>
  );
}

/** Count-up number that animates the first time it scrolls into view. */
function Counter({ to, suffix = '', duration = 1600 }: { to: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const reduce = useReducedMotion();
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) { setN(to); return; }
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, reduce, duration]);

  return <span ref={ref}>{n.toLocaleString('en-IN')}{suffix}</span>;
}

/** Button/link that gently follows the cursor (magnetic hover). */
function Magnetic({
  children, onClick, href, className, style, strength = 0.35,
}: {
  children: ReactNode; onClick?: () => void; href?: string;
  className?: string; style?: CSSProperties; strength?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 220, damping: 16, mass: 0.4 });
  const y = useSpring(my, { stiffness: 220, damping: 16, mass: 0.4 });

  const move = (e: React.MouseEvent) => {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    mx.set((e.clientX - (r.left + r.width / 2)) * strength);
    my.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const reset = () => { mx.set(0); my.set(0); };

  const inner = (
    <m.div
      ref={ref}
      onMouseMove={move}
      onMouseLeave={reset}
      onClick={onClick}
      onKeyDown={href ? undefined : (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } }}
      style={{ x, y, ...style }}
      className={className}
      whileTap={{ scale: 0.96 }}
      role={href ? undefined : 'button'}
      tabIndex={href ? undefined : 0}
    >
      {children}
    </m.div>
  );
  return href ? <a href={href} style={{ textDecoration: 'none', display: 'inline-block' }}>{inner}</a> : inner;
}

/* ================================================================
   Section content (real Coach Abhishek studio data)
================================================================ */

const NAV_LINKS = [
  { label: 'Programs', href: '#programs' },
  { label: 'Why Us',   href: '#why' },
  { label: 'Coach',    href: '#team' },
  { label: 'Pricing',  href: '#pricing' },
  { label: 'Contact',  href: '#contact' },
];

const STATS = [
  { to: 67,  suffix: '+',  label: 'Clients Coached' },
  { to: 230, suffix: 'kg', label: 'Competition Squat' },
  { to: 150, suffix: 'kg', label: 'Competition Bench' },
  { to: 260, suffix: 'kg', label: 'Competition Deadlift' },
];

const PROGRAMS = [
  { icon: Dumbbell,   name: 'Personal Training',       tag: 'K11 Certified', desc: '1-on-1 sessions built around your body, goals and schedule. Strength, fat-loss and muscle — done right.', span: 2, accent: '#F59E0B' },
  { icon: Trophy,     name: 'Powerlifting & Strength', tag: 'National-Level', desc: 'Squat, bench and deadlift coached by an active national-level competitive powerlifter.', span: 1, accent: '#8B1E2B' },
  { icon: Salad,      name: 'Nutrition Coaching',      tag: 'Diet Plans', desc: 'Practical, sustainable nutrition that fits your training — no fad diets, just what works.', span: 1, accent: '#F59E0B' },
  { icon: Smartphone, name: 'Online Coaching',         tag: 'Remote', desc: 'A fully custom training and nutrition plan with weekly check-ins, delivered anywhere you are.', span: 2, accent: '#8B1E2B' },
];

const WHY = [
  { icon: Target,        title: 'Personalised to You', body: 'Every program is built around your body, history and goals — never a generic template.' },
  { icon: ShieldCheck,   title: 'Elite Credentials',   body: 'Coached directly by a K11-certified trainer and active national-level powerlifter who lives what he teaches.' },
  { icon: BarChart3,     title: 'Measured Progress',   body: 'Body composition, strength and wellness markers tracked so you see exactly how far you\'ve come.' },
  { icon: HeartHandshake, title: 'Real Accountability', body: 'Check-ins, WhatsApp support and a coach who actually notices when you miss a session.' },
  { icon: Sparkles,      title: 'One Coach, Start to Finish', body: 'Training, strength and nutrition under a single coach — no juggling multiple gyms or apps.' },
  { icon: Users,         title: 'A Community That Pushes', body: 'Train alongside a group of members who motivate each other, with challenges and shared wins.' },
];

const COACH = {
  role: 'Your Coach · K11 Certified',
  name: 'Abhishek Katiyar',
  bio: 'K11-certified personal trainer and active national-level competitive powerlifter in the 83kg category. A coach whose own performance backs every cue he gives — with competition lifts of 230kg squat, 150kg bench and 260kg deadlift.',
  badges: ['K11 Certified', 'National-Level Powerlifter', 'Personal Training', 'Powerlifting & Strength', 'Nutrition'],
};

const PLANS = [
  { name: 'Starter', monthly: 1999, popular: false, features: ['Gym floor access', '1 group class / week', 'Basic fitness assessment', 'Locker facility', 'Trainer guidance on floor'] },
  { name: 'Pro', monthly: 3999, popular: true, features: ['Everything in Starter', '8 personal training sessions', 'Custom nutrition plan', '3 group classes / week', 'Monthly body-composition check', 'WhatsApp coach support'] },
  { name: 'Elite', monthly: 6499, popular: false, features: ['Everything in Pro', 'Unlimited PT sessions', 'Advanced strength & powerlifting coaching', 'Weekly diet revision', 'Priority scheduling', 'Quarterly progress report'] },
];

const FAQS = [
  { q: 'Do I need prior experience to join?', a: 'Not at all. We welcome complete beginners — your coach builds a program for your current level and progresses you safely from there.' },
  { q: 'What is the free trial?', a: '3 full days of studio access — attend any class, train with our coaches, use the floor. No credit card, no commitment.' },
  { q: 'Can women train here safely?', a: 'Yes, and we encourage it. Coach Abhishek runs a respectful, inclusive environment with dedicated women\'s health and fitness programs.' },
  { q: 'Do you offer online coaching?', a: 'Yes — a fully custom training and nutrition plan with weekly video check-ins and WhatsApp access to your coach, wherever you are.' },
  { q: 'Can I change or pause my membership?', a: 'Yes. Memberships are flexible — talk to us directly and we\'ll find a solution that fits your situation.' },
  { q: 'Is nutrition coaching included?', a: 'Basic guidance is included in Pro and Elite. Full custom diet planning with weekly revisions is part of Elite or available as an add-on.' },
];

/* ================================================================
   Landing Page
================================================================ */

export default function LandingPage() {
  const router = useRouter();
  const reduce = useReducedMotion();

  const [navHidden, setNavHidden] = useState(false);
  const [navSolid, setNavSolid]   = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);
  const [billing, setBilling]     = useState<'monthly' | 'quarterly'>('monthly');
  const [openFaq, setOpenFaq]     = useState<number | null>(0);
  const lastScroll = useRef(0);

  // Match the page (warm white) on overscroll / rubber-band edges
  useEffect(() => {
    const prev = document.body.style.background;
    document.body.style.background = '#FBFAF7';
    return () => { document.body.style.background = prev; };
  }, []);

  // Nav: solidify + hide-on-scroll-down / show-on-scroll-up
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setNavSolid(y > 40);
      if (y > lastScroll.current && y > 320) setNavHidden(true);
      else setNavHidden(false);
      lastScroll.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Hero parallax on scroll + mouse
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroFade  = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const heroLift  = useTransform(scrollYProgress, [0, 1], [0, 90]);

  const pmx = useMotionValue(0);
  const pmy = useMotionValue(0);
  const px = useSpring(pmx, { stiffness: 60, damping: 18 });
  const py = useSpring(pmy, { stiffness: 60, damping: 18 });
  const onHeroMouse = useCallback((e: React.MouseEvent) => {
    if (reduce) return;
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    pmx.set((e.clientX - cx) / cx);
    pmy.set((e.clientY - cy) / cy);
  }, [reduce, pmx, pmy]);
  const orb1x = useTransform(px, (v) => v * 40);
  const orb1y = useTransform(py, (v) => v * 40);
  const orb2x = useTransform(px, (v) => v * -55);
  const orb2y = useTransform(py, (v) => v * -35);

  const go = (href: string) => {
    setMenuOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const quarterly = (mo: number) => Math.round(mo * 0.9); // 10% off, shown per-month

  return (
    <div style={{ paddingTop: 0, background: 'var(--l-bg)', color: 'var(--l-ink)', overflowX: 'hidden' }}>
      <style>{`
        :root{
          --l-bg:#FBFAF7; --l-surface:#FFFFFF; --l-ink:#1A1410; --l-ink-soft:#6B655E;
          --l-saffron:#F59E0B; --l-saffron-2:#FBBF24; --l-saffron-3:#D97706;
          --l-maroon:#8B1E2B; --l-maroon-2:#A8253A;
          --l-line:rgba(26,20,16,0.09); --l-line-2:rgba(26,20,16,0.16);
          --l-grad:linear-gradient(135deg,#FBBF24 0%,#F59E0B 45%,#D97706 100%);
          --l-px:clamp(20px,5vw,72px);
        }
        html{scroll-behavior:smooth;scroll-padding-top:80px}
        .l-body-bg{background:var(--l-bg)}
        .l-h1{font-size:clamp(2.6rem,7.2vw,5.6rem);font-weight:800;letter-spacing:-0.045em;line-height:0.98}
        .l-h2{font-size:clamp(2rem,4.8vw,3.4rem);font-weight:800;letter-spacing:-0.035em;line-height:1.05}
        .l-kicker{font-size:0.72rem;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:var(--l-saffron-3)}
        .l-grad-text{background:var(--l-grad);-webkit-background-clip:text;background-clip:text;color:transparent}
        .l-glass{background:rgba(255,255,255,0.7);backdrop-filter:blur(18px) saturate(150%);-webkit-backdrop-filter:blur(18px) saturate(150%)}
        .l-card{background:var(--l-surface);border:1px solid var(--l-line);border-radius:26px;transition:transform .35s cubic-bezier(.22,1,.36,1),box-shadow .35s,border-color .35s}
        .l-card:hover{transform:translateY(-6px);border-color:var(--l-line-2);box-shadow:0 24px 60px -24px rgba(26,20,16,0.22)}
        .l-fadefloat{animation:lfloat 8s ease-in-out infinite}
        @keyframes lfloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-16px)}}
        @keyframes lbounce{0%,100%{transform:rotate(45deg) translateY(0)}50%{transform:rotate(45deg) translateY(6px)}}
        .l-link{position:relative;color:var(--l-ink-soft);text-decoration:none;font-size:0.86rem;font-weight:500;transition:color .2s}
        .l-link:hover{color:var(--l-ink)}
        .l-underline::after{content:'';position:absolute;left:0;bottom:-4px;height:2px;width:0;background:var(--l-grad);transition:width .28s ease}
        .l-underline:hover::after{width:100%}
        .l-mobile-menu{display:none}
        @media(max-width:860px){
          .l-desk-nav{display:none!important}
          .l-mobile-btn{display:flex!important}
          .l-bento{grid-template-columns:1fr!important}
          .l-bento-span2{grid-column:span 1!important}
          .l-pricing-grid{grid-template-columns:1fr!important}
          .l-contact-grid{grid-template-columns:1fr!important}
          .l-why-grid{grid-template-columns:1fr!important}
          .l-team-grid{grid-template-columns:1fr!important}
        }
        @media(min-width:861px){.l-mobile-btn{display:none!important}}
        @media(prefers-reduced-motion:reduce){.l-fadefloat,.l-scroll-arrow{animation:none}}
      `}</style>

      {/* ─────────────────────────── NAV ─────────────────────────── */}
      <m.nav
        animate={{ y: navHidden ? -90 : 0 }}
        transition={{ duration: 0.4, ease: EASE }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px var(--l-px)',
          background: navSolid ? 'rgba(251,250,247,0.82)' : 'rgba(251,250,247,0.4)',
          backdropFilter: 'blur(18px) saturate(150%)', WebkitBackdropFilter: 'blur(18px) saturate(150%)',
          borderBottom: navSolid ? '1px solid var(--l-line)' : '1px solid transparent',
          transition: 'background .3s, border-color .3s',
        }}
      >
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <span style={{ display: 'flex', height: 34, width: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 11, background: '#fff', boxShadow: '0 2px 10px rgba(26,20,16,0.12)', border: '1px solid var(--l-line)' }}>
            <Image src="/logo.png" alt="Coach Abhishek" width={24} height={24} style={{ objectFit: 'contain' }} />
          </span>
          <span style={{ fontSize: '0.92rem', fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--l-ink)' }}>
            <span style={{ color: 'var(--l-maroon)' }}>COACH</span> ABHISHEK
          </span>
        </button>

        <div className="l-desk-nav" style={{ display: 'flex', alignItems: 'center', gap: 30 }}>
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={(e) => { e.preventDefault(); go(l.href); }} className="l-link l-underline">{l.label}</a>
          ))}
        </div>

        <div className="l-desk-nav" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => router.push('/login')}
            style={{ background: 'transparent', color: 'var(--l-ink)', padding: '9px 18px', borderRadius: 999, border: '1px solid var(--l-line-2)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', transition: 'background .2s' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(26,20,16,0.05)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
            Login
          </button>
          <Magnetic href={SUPPORT_WA_URL} strength={0.4}
            style={{ background: 'var(--l-grad)', color: '#fff', padding: '9px 20px', borderRadius: 999, fontSize: '0.82rem', fontWeight: 700, boxShadow: '0 8px 22px -8px rgba(245,158,11,0.7)', cursor: 'pointer' }}>
            Start Free
          </Magnetic>
        </div>

        <button className="l-mobile-btn" onClick={() => setMenuOpen((o) => !o)}
          style={{ display: 'none', alignItems: 'center', justifyContent: 'center', height: 40, width: 40, borderRadius: 12, background: '#fff', border: '1px solid var(--l-line)', cursor: 'pointer' }}>
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </m.nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <m.div
            initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            style={{ position: 'fixed', top: 66, left: 12, right: 12, zIndex: 999, borderRadius: 22, padding: 16, background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(20px)', border: '1px solid var(--l-line)', boxShadow: '0 24px 60px -20px rgba(26,20,16,0.25)' }}
          >
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={(e) => { e.preventDefault(); go(l.href); }}
                style={{ display: 'block', padding: '13px 8px', fontSize: '1rem', fontWeight: 600, color: 'var(--l-ink)', textDecoration: 'none', borderBottom: '1px solid var(--l-line)' }}>
                {l.label}
              </a>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button onClick={() => { setMenuOpen(false); router.push('/login'); }}
                style={{ flex: 1, padding: '12px', borderRadius: 14, background: 'rgba(26,20,16,0.05)', border: '1px solid var(--l-line-2)', fontWeight: 700, cursor: 'pointer' }}>Login</button>
              <a href={SUPPORT_WA_URL} style={{ flex: 1, padding: '12px', borderRadius: 14, background: 'var(--l-grad)', color: '#fff', fontWeight: 700, textAlign: 'center', textDecoration: 'none' }}>Start Free</a>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────── HERO ─────────────────────────── */}
      <section ref={heroRef} onMouseMove={onHeroMouse}
        style={{ position: 'relative', minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '120px var(--l-px) 90px', overflow: 'hidden' }}>
        {/* animated glow orbs */}
        <m.div aria-hidden style={{ position: 'absolute', top: '8%', left: '12%', width: 460, height: 460, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.28) 0%, transparent 70%)', filter: 'blur(20px)', x: orb1x, y: orb1y, pointerEvents: 'none' }} className="l-fadefloat" />
        <m.div aria-hidden style={{ position: 'absolute', bottom: '4%', right: '10%', width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,30,43,0.20) 0%, transparent 70%)', filter: 'blur(20px)', x: orb2x, y: orb2y, pointerEvents: 'none' }} className="l-fadefloat" />
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 50% at 50% 42%, rgba(255,255,255,0) 0%, var(--l-bg) 78%)', pointerEvents: 'none' }} />

        <m.div style={{ position: 'relative', opacity: heroFade, y: heroLift, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <m.div
            initial={reduce ? false : { opacity: 0, scale: 0.8, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.05 }}
            style={{ position: 'relative', marginBottom: 34 }}>
            <div style={{ position: 'absolute', inset: -30, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.35) 0%, transparent 70%)', filter: 'blur(18px)' }} />
            <Image src="/logo.png" alt="Coach Abhishek" width={124} height={124} style={{ objectFit: 'contain', position: 'relative' }} priority />
          </m.div>

          <m.div initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2, ease: EASE }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 16px', borderRadius: 999, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', marginBottom: 26 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--l-saffron)' }} className="l-fadefloat" />
            <span className="l-kicker">Lucknow&apos;s Premier Personal Training</span>
          </m.div>

          <m.h1 className="l-h1" initial={reduce ? false : { opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3, ease: EASE }} style={{ marginBottom: 22, maxWidth: 900 }}>
            Train Like You <span className="l-grad-text">Mean It.</span>
          </m.h1>

          <m.p initial={reduce ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.42, ease: EASE }}
            style={{ fontSize: 'clamp(1rem,1.6vw,1.2rem)', color: 'var(--l-ink-soft)', lineHeight: 1.7, maxWidth: 560, margin: '0 auto 36px' }}>
            Elite personal training, powerlifting and nutrition coaching — one certified coach, real accountability, and progress you can measure.
          </m.p>

          <m.div initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.54, ease: EASE }}
            style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 34 }}>
            <Magnetic href={SUPPORT_WA_URL}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: 'var(--l-grad)', color: '#fff', padding: '15px 30px', borderRadius: 999, fontSize: '1rem', fontWeight: 700, boxShadow: '0 16px 40px -14px rgba(245,158,11,0.75)', cursor: 'pointer' }}>
              Start 3-Day Free Trial <ArrowRight size={17} />
            </Magnetic>
            <Magnetic onClick={() => go('#pricing')} strength={0.25}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: '#fff', color: 'var(--l-ink)', padding: '15px 28px', borderRadius: 999, fontSize: '1rem', fontWeight: 600, border: '1px solid var(--l-line-2)', cursor: 'pointer' }}>
              View Plans
            </Magnetic>
          </m.div>

          <m.div initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.7 }}
            style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
            {['K11 Certified', 'National-Level Powerlifter', 'Measured Progress', 'Free Trial'].map((b) => (
              <span key={b} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: '0.82rem', fontWeight: 500, color: 'var(--l-ink-soft)' }}>
                <Check size={15} style={{ color: 'var(--l-saffron-3)' }} /> {b}
              </span>
            ))}
          </m.div>
        </m.div>

        <div className="l-scroll-arrow" style={{ position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)', width: 16, height: 16, borderRight: '1.5px solid var(--l-ink-soft)', borderBottom: '1.5px solid var(--l-ink-soft)', animation: 'lbounce 2s ease-in-out infinite' }} />
      </section>

      {/* ─────────────────────────── STATS ─────────────────────────── */}
      <section style={{ padding: '10px var(--l-px) 20px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }} className="l-team-grid">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08}
              style={{ background: 'var(--l-surface)', border: '1px solid var(--l-line)', borderRadius: 22, padding: '30px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1 }} className="l-grad-text">
                <Counter to={s.to} suffix={s.suffix} />
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--l-ink-soft)', marginTop: 10, fontWeight: 500, letterSpacing: '0.02em' }}>{s.label}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─────────────────────────── PROGRAMS (BENTO) ─────────────────────────── */}
      <section id="programs" style={{ padding: '100px var(--l-px)', maxWidth: 1180, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <Reveal><span className="l-kicker">What We Offer</span></Reveal>
          <Reveal delay={0.08}><h2 className="l-h2" style={{ marginTop: 16 }}>Every goal. <span className="l-grad-text">One coach.</span></h2></Reveal>
          <Reveal delay={0.16}><p style={{ fontSize: '1.05rem', color: 'var(--l-ink-soft)', maxWidth: 560, margin: '18px auto 0', lineHeight: 1.7 }}>From your first session to your strongest lifts — a program built around you.</p></Reveal>
        </div>

        <div className="l-bento" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          {PROGRAMS.map((p, i) => {
            const Icon = p.icon;
            return (
              <Reveal key={p.name} delay={(i % 3) * 0.08}
                className={p.span === 2 ? 'l-card l-bento-span2' : 'l-card'}
                style={{ gridColumn: p.span === 2 ? 'span 2' : 'span 1', padding: '34px 30px', position: 'relative', overflow: 'hidden' }}>
                <span style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: p.accent === '#8B1E2B' ? 'linear-gradient(90deg,#8B1E2B,#A8253A)' : 'var(--l-grad)', opacity: 0.9 }} />
                <span style={{ display: 'inline-flex', height: 50, width: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 15, background: p.accent === '#8B1E2B' ? 'rgba(139,30,43,0.1)' : 'rgba(245,158,11,0.12)', marginBottom: 22 }}>
                  <Icon size={23} style={{ color: p.accent }} strokeWidth={1.9} />
                </span>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 10 }}>{p.name}</div>
                <div style={{ fontSize: '0.92rem', color: 'var(--l-ink-soft)', lineHeight: 1.65, maxWidth: p.span === 2 ? 520 : undefined }}>{p.desc}</div>
                <span style={{ display: 'inline-block', marginTop: 20, fontSize: '0.66rem', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, color: p.accent, background: p.accent === '#8B1E2B' ? 'rgba(139,30,43,0.08)' : 'rgba(245,158,11,0.1)', padding: '5px 12px', borderRadius: 999 }}>{p.tag}</span>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ─────────────────────────── WHY (system) ─────────────────────────── */}
      <section id="why" style={{ background: 'linear-gradient(180deg,#fff 0%,#FBF7EE 100%)', borderTop: '1px solid var(--l-line)', borderBottom: '1px solid var(--l-line)', padding: '100px var(--l-px)' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <Reveal><span className="l-kicker">Why Coach Abhishek</span></Reveal>
            <Reveal delay={0.08}><h2 className="l-h2" style={{ marginTop: 16 }}>Not just a gym. <span className="l-grad-text">A system.</span></h2></Reveal>
          </div>
          <div className="l-why-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
            {WHY.map((w, i) => {
              const Icon = w.icon;
              return (
                <Reveal key={w.title} delay={(i % 3) * 0.08} className="l-card" style={{ padding: '32px 30px' }}>
                  <span style={{ display: 'inline-flex', height: 46, width: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 14, background: 'var(--l-grad)', marginBottom: 20, boxShadow: '0 8px 20px -8px rgba(245,158,11,0.7)' }}>
                    <Icon size={21} color="#fff" strokeWidth={2} />
                  </span>
                  <div style={{ fontSize: '1.06rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 9 }}>{w.title}</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--l-ink-soft)', lineHeight: 1.65 }}>{w.body}</div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─────────────────────────── COACH ─────────────────────────── */}
      <section id="team" style={{ padding: '100px var(--l-px)', maxWidth: 1180, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <Reveal><span className="l-kicker">Your Coach</span></Reveal>
          <Reveal delay={0.08}><h2 className="l-h2" style={{ marginTop: 16 }}>Coached by <span className="l-grad-text">Abhishek.</span></h2></Reveal>
          <Reveal delay={0.16}><p style={{ fontSize: '1.05rem', color: 'var(--l-ink-soft)', maxWidth: 560, margin: '18px auto 0', lineHeight: 1.7 }}>Certified, and personally invested in your transformation — every session, start to finish.</p></Reveal>
        </div>

        <Reveal delay={0.1}
          style={{ position: 'relative', overflow: 'hidden', borderRadius: 30, border: '1px solid rgba(245,158,11,0.3)', background: 'linear-gradient(150deg,rgba(245,158,11,0.1) 0%,#fff 55%)', padding: 'clamp(36px,5vw,56px)', maxWidth: 860, margin: '0 auto' }}>
          <span aria-hidden style={{ position: 'absolute', top: -80, right: -60, width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.22) 0%, transparent 70%)', filter: 'blur(10px)' }} />
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 26, flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', height: 72, width: 72, alignItems: 'center', justifyContent: 'center', borderRadius: 20, background: '#fff', border: '1px solid var(--l-line)', boxShadow: '0 10px 30px -12px rgba(26,20,16,0.3)', flexShrink: 0 }}>
                <Image src="/logo.png" alt="Abhishek Katiyar" width={46} height={46} style={{ objectFit: 'contain' }} />
              </span>
              <div>
                <div style={{ fontSize: '0.68rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--l-saffron-3)', fontWeight: 700, marginBottom: 8 }}>{COACH.role}</div>
                <div style={{ fontSize: 'clamp(1.7rem,3vw,2.3rem)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05 }}>{COACH.name}</div>
              </div>
            </div>
            <p style={{ fontSize: '1rem', color: 'var(--l-ink-soft)', lineHeight: 1.75, maxWidth: 620, marginBottom: 26 }}>{COACH.bio}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
              {COACH.badges.map((b) => (
                <span key={b} style={{ fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--l-ink)', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', padding: '6px 14px', borderRadius: 999 }}>{b}</span>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ─────────────────────────── PRICING ─────────────────────────── */}
      <section id="pricing" style={{ background: 'linear-gradient(180deg,#FBF7EE 0%,#fff 100%)', borderTop: '1px solid var(--l-line)', padding: '100px var(--l-px)' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <Reveal><span className="l-kicker">Membership</span></Reveal>
            <Reveal delay={0.08}><h2 className="l-h2" style={{ marginTop: 16 }}>Simple, honest <span className="l-grad-text">pricing.</span></h2></Reveal>
            <Reveal delay={0.16}>
              <div style={{ display: 'inline-flex', marginTop: 30, padding: 5, borderRadius: 999, background: '#fff', border: '1px solid var(--l-line)' }}>
                {(['monthly', 'quarterly'] as const).map((b) => (
                  <button key={b} onClick={() => setBilling(b)}
                    style={{ position: 'relative', padding: '9px 22px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, textTransform: 'capitalize', color: billing === b ? '#fff' : 'var(--l-ink-soft)', background: billing === b ? 'var(--l-grad)' : 'transparent', transition: 'color .2s' }}>
                    {b}{b === 'quarterly' && <span style={{ marginLeft: 6, fontSize: '0.64rem', opacity: 0.9 }}>-10%</span>}
                  </button>
                ))}
              </div>
            </Reveal>
          </div>

          <div className="l-pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, alignItems: 'stretch' }}>
            {PLANS.map((plan, i) => {
              const price = billing === 'monthly' ? plan.monthly : quarterly(plan.monthly);
              return (
                <Reveal key={plan.name} delay={i * 0.08}
                  style={{ position: 'relative', background: plan.popular ? 'linear-gradient(160deg,#1A1410 0%,#2A211A 100%)' : 'var(--l-surface)', color: plan.popular ? '#fff' : 'var(--l-ink)', border: plan.popular ? '1px solid rgba(245,158,11,0.4)' : '1px solid var(--l-line)', borderRadius: 26, padding: '40px 32px', boxShadow: plan.popular ? '0 30px 70px -30px rgba(245,158,11,0.5)' : 'none', transform: plan.popular ? 'scale(1.03)' : undefined }}>
                  {plan.popular && <span style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: 'var(--l-grad)', color: '#fff', fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '6px 16px', borderRadius: 999, boxShadow: '0 8px 20px -8px rgba(245,158,11,0.8)' }}>Most Popular</span>}
                  <div style={{ fontSize: '0.72rem', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, color: plan.popular ? 'var(--l-saffron-2)' : 'var(--l-ink-soft)', marginBottom: 20 }}>{plan.name}</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 4 }}>
                    <sup style={{ fontSize: '1.1rem', fontWeight: 500, marginTop: 8 }}>₹</sup>
                    <span style={{ fontSize: 'clamp(2.4rem,4vw,3.2rem)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1 }}>{price.toLocaleString('en-IN')}</span>
                    <span style={{ fontSize: '0.85rem', color: plan.popular ? 'rgba(255,255,255,0.6)' : 'var(--l-ink-soft)', marginBottom: 6 }}>/ month</span>
                  </div>
                  <div style={{ fontSize: '0.76rem', color: plan.popular ? 'rgba(255,255,255,0.5)' : 'var(--l-ink-soft)', marginBottom: 30 }}>
                    {billing === 'quarterly' ? 'billed quarterly · indicative' : 'billed monthly · indicative'}
                  </div>
                  <ul style={{ listStyle: 'none', margin: '0 0 32px', padding: 0 }}>
                    {plan.features.map((f) => (
                      <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', fontSize: '0.88rem', color: plan.popular ? 'rgba(255,255,255,0.85)' : 'var(--l-ink-soft)' }}>
                        <Check size={16} style={{ color: 'var(--l-saffron)', flexShrink: 0, marginTop: 2 }} /> {f}
                      </li>
                    ))}
                  </ul>
                  <a href={SUPPORT_WA_URL}
                    style={{ display: 'block', textAlign: 'center', padding: '14px', borderRadius: 999, fontSize: '0.9rem', fontWeight: 700, textDecoration: 'none', cursor: 'pointer', background: plan.popular ? 'var(--l-grad)' : 'rgba(26,20,16,0.05)', color: plan.popular ? '#fff' : 'var(--l-ink)', border: plan.popular ? 'none' : '1px solid var(--l-line-2)', transition: 'transform .15s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}>
                    {plan.popular ? 'Join Pro' : `Choose ${plan.name}`}
                  </a>
                </Reveal>
              );
            })}
          </div>
          <Reveal delay={0.1}><p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--l-ink-soft)', marginTop: 28, lineHeight: 1.6 }}>Prices are indicative — contact us for exact current pricing, custom packages, and corporate or group discounts.</p></Reveal>
        </div>
      </section>

      {/* ─────────────────────────── FAQ ─────────────────────────── */}
      <section style={{ padding: '100px var(--l-px)' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <Reveal><span className="l-kicker">Questions</span></Reveal>
            <Reveal delay={0.08}><h2 className="l-h2" style={{ marginTop: 16 }}>We&apos;ve got <span className="l-grad-text">answers.</span></h2></Reveal>
          </div>
          <div>
            {FAQS.map((f, i) => {
              const open = openFaq === i;
              return (
                <Reveal key={f.q} delay={i * 0.04}
                  style={{ borderRadius: 18, border: '1px solid var(--l-line)', background: '#fff', marginBottom: 12, overflow: 'hidden' }}>
                  <button onClick={() => setOpenFaq(open ? null : i)}
                    aria-expanded={open}
                    style={{ width: '100%', background: 'none', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', cursor: 'pointer', fontSize: '1rem', fontWeight: 600, color: open ? 'var(--l-saffron-3)' : 'var(--l-ink)', textAlign: 'left', gap: 16 }}>
                    <span>{f.q}</span>
                    <m.span animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.25 }}
                      style={{ flexShrink: 0, display: 'flex', height: 26, width: 26, alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: open ? 'var(--l-grad)' : 'rgba(26,20,16,0.05)', color: open ? '#fff' : 'var(--l-ink-soft)' }}>
                      <Plus size={15} />
                    </m.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <m.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: EASE }} style={{ overflow: 'hidden' }}>
                        <div style={{ padding: '0 24px 22px', fontSize: '0.92rem', color: 'var(--l-ink-soft)', lineHeight: 1.7 }}>{f.a}</div>
                      </m.div>
                    )}
                  </AnimatePresence>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─────────────────────────── FINAL CTA ─────────────────────────── */}
      <section style={{ padding: '20px var(--l-px) 110px' }}>
        <Reveal style={{ position: 'relative', maxWidth: 1120, margin: '0 auto', borderRadius: 34, overflow: 'hidden', background: 'linear-gradient(150deg,#1A1410 0%,#2A211A 55%,#3A1418 100%)', padding: 'clamp(48px,7vw,88px) var(--l-px)', textAlign: 'center' }}>
          <div aria-hidden style={{ position: 'absolute', top: '-30%', left: '20%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.35) 0%, transparent 70%)', filter: 'blur(30px)' }} />
          <div aria-hidden style={{ position: 'absolute', bottom: '-40%', right: '15%', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,30,43,0.4) 0%, transparent 70%)', filter: 'blur(30px)' }} />
          <div style={{ position: 'relative' }}>
            <h2 style={{ fontSize: 'clamp(2.2rem,5.4vw,4rem)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.04, color: '#fff', marginBottom: 20 }}>
              Your strongest self<br />starts <span className="l-grad-text">today.</span>
            </h2>
            <p style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.68)', maxWidth: 460, margin: '0 auto 40px', lineHeight: 1.7 }}>
              3-day free trial. No card required. Just show up — we&apos;ll handle the rest.
            </p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Magnetic href={SUPPORT_WA_URL} style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: 'var(--l-grad)', color: '#fff', padding: '16px 32px', borderRadius: 999, fontSize: '1rem', fontWeight: 700, boxShadow: '0 16px 40px -14px rgba(245,158,11,0.7)', cursor: 'pointer' }}>
                <MessageCircle size={18} /> Book on WhatsApp
              </Magnetic>
              <Magnetic href={SUPPORT_TEL_URL} strength={0.25} style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '16px 30px', borderRadius: 999, fontSize: '1rem', fontWeight: 600, border: '1px solid rgba(255,255,255,0.18)', cursor: 'pointer' }}>
                <Phone size={17} /> Call Us Now
              </Magnetic>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ─────────────────────────── FOOTER ─────────────────────────── */}
      <footer id="contact" style={{ background: '#fff', borderTop: '1px solid var(--l-line)', padding: '72px var(--l-px) 40px' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div className="l-contact-grid" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 48, marginBottom: 56 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <span style={{ display: 'flex', height: 38, width: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, background: '#fff', border: '1px solid var(--l-line)', boxShadow: '0 2px 10px rgba(26,20,16,0.1)' }}>
                  <Image src="/logo.png" alt="Coach Abhishek" width={26} height={26} style={{ objectFit: 'contain' }} />
                </span>
                <span style={{ fontSize: '1rem', fontWeight: 700 }}><span style={{ color: 'var(--l-maroon)' }}>COACH</span> ABHISHEK</span>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--l-ink-soft)', lineHeight: 1.7, maxWidth: 320, marginBottom: 22 }}>
                Elite personal training and strength coaching in Lucknow. Certified, real accountability, and results you can measure.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                {[{ Icon: Instagram, href: '#' }, { Icon: Youtube, href: '#' }, { Icon: MessageCircle, href: SUPPORT_WA_URL }].map(({ Icon, href }, i) => (
                  <a key={i} href={href} aria-label="social"
                    style={{ display: 'flex', height: 38, width: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 11, border: '1px solid var(--l-line)', color: 'var(--l-ink-soft)', transition: 'all .2s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--l-saffron)'; e.currentTarget.style.color = 'var(--l-saffron-3)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--l-line)'; e.currentTarget.style.color = 'var(--l-ink-soft)'; }}>
                    <Icon size={17} />
                  </a>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--l-ink)', marginBottom: 18 }}>Explore</div>
              {NAV_LINKS.map((l) => (
                <a key={l.href} href={l.href} onClick={(e) => { e.preventDefault(); go(l.href); }}
                  style={{ display: 'block', fontSize: '0.9rem', color: 'var(--l-ink-soft)', textDecoration: 'none', padding: '7px 0', transition: 'color .2s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--l-ink)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--l-ink-soft)')}>{l.label}</a>
              ))}
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--l-ink)', marginBottom: 18 }}>Visit &amp; Contact</div>
              {[
                { Icon: Phone, node: <a href={SUPPORT_TEL_URL} style={{ color: 'var(--l-ink-soft)', textDecoration: 'none' }}>{SUPPORT_PHONE_RAW}</a> },
                { Icon: MapPin, node: <>Lucknow, Uttar Pradesh, India</> },
                { Icon: Clock, node: <>Mon–Sat · 6 AM – 9 PM<br />Sun · 7 AM – 12 PM</> },
              ].map(({ Icon, node }, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '7px 0', fontSize: '0.9rem', color: 'var(--l-ink-soft)', lineHeight: 1.55 }}>
                  <Icon size={16} style={{ color: 'var(--l-saffron-3)', flexShrink: 0, marginTop: 3 }} />
                  <span>{node}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--l-line)', paddingTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--l-ink-soft)' }}>© 2026 Coach Abhishek · Lucknow, India</span>
            <button onClick={() => router.push('/login')}
              style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--l-ink-soft)', background: 'none', border: 'none', cursor: 'pointer' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--l-ink)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--l-ink-soft)')}>
              Staff / Trainer Login →
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
