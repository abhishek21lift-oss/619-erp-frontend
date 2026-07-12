'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const SUPPORT_PHONE_RAW  = process.env.NEXT_PUBLIC_SUPPORT_PHONE || '+918756562188';
const SUPPORT_PHONE_DIGITS = SUPPORT_PHONE_RAW.replace(/\D/g, '');
const SUPPORT_WA_URL     = `https://wa.me/${SUPPORT_PHONE_DIGITS}`;
const SUPPORT_TEL_URL    = `tel:${SUPPORT_PHONE_RAW}`;

export default function LandingPage() {
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [navSolid, setNavSolid] = useState(false);
  const revealRoot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setNavSolid(window.scrollY > 60);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const els = revealRoot.current?.querySelectorAll('.reveal');
    if (!els?.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -60px 0px' },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const faqs = [
    { q: 'Do I need prior experience to join?', a: 'Absolutely not. We welcome complete beginners. Our trainers will build a program appropriate for your current level and progress you safely from there.' },
    { q: 'What is the free trial?', a: 'You get 3 full days of access to the studio — attend any class, train with our coaches, use the floor. No credit card, no commitment, no catch.' },
    { q: 'Can women train here safely?', a: 'Yes, and we strongly encourage it. Coach Abhishek runs a respectful, inclusive environment, with dedicated programs for women\'s health and fitness.' },
    { q: 'Do you offer online coaching?', a: 'Yes. Our remote coaching program includes a custom training plan, nutrition plan, weekly video check-ins, and WhatsApp access to your coach. Perfect if you travel or prefer to train at home.' },
    { q: 'Can I change or pause my membership?', a: 'Yes. We offer flexible membership management. Speak to us directly — we\'ll always find a solution that works for your situation.' },
    { q: 'Is nutrition coaching included in my plan?', a: 'Basic nutritional guidance is included in Pro and Elite plans. Full custom diet planning with weekly revisions is available as an add-on or in Elite membership.' },
  ];

  const toggleFaq = (idx: number) => {
    setOpenFaq((prev) => (prev === idx ? null : idx));
  };

  return (
    <div ref={revealRoot} style={{ paddingTop: 52 }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --black:#000;
          --surface:#0a0a0a;
          --surface2:#141414;
          --surface3:#1c1c1e;
          --border:rgba(255,255,255,0.08);
          --border-hover:rgba(255,255,255,0.16);
          --white:#f5f5f7;
          --grey:#86868b;
          --grey2:#6e6e73;
          --red:#d91f3c;
          --red-soft:rgba(217,31,60,0.12);
          --font:-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',Helvetica,Arial,sans-serif;
          --px:clamp(24px,6vw,72px);
        }
        html{scroll-behavior:smooth;-webkit-font-smoothing:antialiased;scroll-padding-top:52px}
        body{background:var(--black);color:var(--white);font-family:var(--font);overflow-x:hidden;line-height:1.5}
        nav{position:fixed;top:0;left:0;right:0;z-index:1000;display:flex;align-items:center;justify-content:space-between;padding:0 var(--px);height:52px;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);transition:background 0.3s}
        .nav-logo-wrap{display:flex;align-items:center;gap:8px;text-decoration:none}
        .reveal{opacity:0;transform:translateY(40px);transition:opacity 0.8s cubic-bezier(.22,1,.36,1),transform 0.8s cubic-bezier(.22,1,.36,1)}
        .reveal.visible{opacity:1;transform:none}
        .reveal-delay-1{transition-delay:.1s}
        .reveal-delay-2{transition-delay:.2s}
        .reveal-delay-3{transition-delay:.3s}
        .reveal-delay-4{transition-delay:.4s}
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
        @keyframes bounce{0%,100%{transform:rotate(45deg) translateY(0)}50%{transform:rotate(45deg) translateY(5px)}}
        @media(max-width:640px){
          .nav-links{display:none!important}
          .hero-h1{font-size:2.4rem}
          .team-grid{grid-template-columns:1fr}
          .footer-inner{flex-direction:column;align-items:flex-start}
          .hero{padding-top:40px!important;padding-bottom:56px!important}
          .hero-logo{margin-bottom:24px!important}
          .hero-label{margin-bottom:10px!important}
          .hero-sub-title{margin-bottom:16px!important}
          .hero-desc{margin-bottom:28px!important}
        }
        @media(max-width:900px){.numbers-grid{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:900px){.number-item{border-right:none!important;border-bottom:1px solid var(--border)}}
        @media(max-width:900px){.plans-grid{grid-template-columns:1fr}.why-grid{grid-template-columns:1fr}.contact-inner{grid-template-columns:1fr}}
        @media(max-width:640px){.team-card{padding:32px 24px}}
        @media(prefers-reduced-motion:reduce){.hero-logo,.hero-scroll-arrow,.reveal{animation:none;transition:none;opacity:1;transform:none}}
        .numbers-grid > div:last-child{border-right:none!important}
      `}</style>

      {/* ─── NAV ─── */}
      <nav style={{ background: navSolid ? 'rgba(0,0,0,0.92)' : 'rgba(0,0,0,0.72)' }}>
        <a href="#" className="nav-logo-wrap" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
          <Image src="/619-logo.png" alt="Coach Abhishek" width={28} height={28} className="nav-logo" style={{ objectFit: 'contain' }} />
          <span className="nav-brand-text" style={{ fontSize: '0.88rem', fontWeight: 600, letterSpacing: '-.01em', color: 'var(--white)' }}>
            <span style={{ color: 'var(--red)' }}>COACH</span> ABHISHEK
          </span>
        </a>
        <ul className="nav-links" style={{ display: 'flex', gap: 0, listStyle: 'none' }}>
          <li><a href="#about" style={{ display: 'block', padding: '0 14px', fontSize: '0.78rem', fontWeight: 400, color: 'var(--grey)', textDecoration: 'none', lineHeight: '52px', transition: 'color 0.2s' }} onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--white)')} onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--grey)')}>About</a></li>
          <li><a href="#team" style={{ display: 'block', padding: '0 14px', fontSize: '0.78rem', fontWeight: 400, color: 'var(--grey)', textDecoration: 'none', lineHeight: '52px', transition: 'color 0.2s' }} onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--white)')} onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--grey)')}>Team</a></li>
          <li><a href="#programs" style={{ display: 'block', padding: '0 14px', fontSize: '0.78rem', fontWeight: 400, color: 'var(--grey)', textDecoration: 'none', lineHeight: '52px', transition: 'color 0.2s' }} onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--white)')} onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--grey)')}>Programs</a></li>
          <li><a href="#membership" style={{ display: 'block', padding: '0 14px', fontSize: '0.78rem', fontWeight: 400, color: 'var(--grey)', textDecoration: 'none', lineHeight: '52px', transition: 'color 0.2s' }} onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--white)')} onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--grey)')}>Pricing</a></li>
          <li><a href="#contact" style={{ display: 'block', padding: '0 14px', fontSize: '0.78rem', fontWeight: 400, color: 'var(--grey)', textDecoration: 'none', lineHeight: '52px', transition: 'color 0.2s' }} onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--white)')} onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--grey)')}>Contact</a></li>
        </ul>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => router.push('/login')} className="nav-cta" style={{
            background: 'rgba(255,255,255,0.1)', color: '#fff',
            padding: '7px 18px', borderRadius: 980, border: 'none',
            fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
            transition: 'opacity 0.2s, transform 0.2s', whiteSpace: 'nowrap',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'scale(0.97)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            Login
          </button>
          <a href="#trial" className="nav-cta" style={{
            background: 'var(--red)', color: '#fff',
            padding: '7px 18px', borderRadius: 980,
            fontSize: '0.78rem', fontWeight: 600, textDecoration: 'none',
            transition: 'opacity 0.2s, transform 0.2s', whiteSpace: 'nowrap',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'scale(0.97)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            Free Trial
          </a>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="hero" style={{
        minHeight: 'calc(100dvh - 52px)', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        padding: '68px var(--px) 80px', position: 'relative',
        background: 'radial-gradient(ellipse 80% 50% at 50% 100%, rgba(217,31,60,0.07) 0%, transparent 70%)',
      }}>
        <Image src="/619-logo.png" alt="Coach Abhishek" width={180} height={180} className="hero-logo"
          style={{ objectFit: 'contain', marginBottom: 48, opacity: 0, animation: 'fadeUp 1s cubic-bezier(.22,1,.36,1) 0.2s forwards' }}
        />
        <span className="hero-label" style={{ fontSize: '0.75rem', fontWeight: 500, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--red)', marginBottom: 20, opacity: 0, animation: 'fadeUp 1s cubic-bezier(.22,1,.36,1) 0.4s forwards' }}>
          Lucknow&apos;s Premier Personal Trainer
        </span>
        <h1 className="hero-h1" style={{ fontSize: 'clamp(2.8rem,7vw,6rem)', fontWeight: 700, letterSpacing: '-.04em', lineHeight: 1.04, color: 'var(--white)', marginBottom: 6, opacity: 0, animation: 'fadeUp 1s cubic-bezier(.22,1,.36,1) 0.5s forwards' }}>
          Train Like You<br /><em style={{ fontStyle: 'normal', color: 'var(--red)' }}>Mean It.</em>
        </h1>
        <p className="hero-sub-title" style={{ fontSize: 'clamp(1.6rem,4vw,3rem)', fontWeight: 300, letterSpacing: '-.02em', color: 'var(--grey)', marginBottom: 28, opacity: 0, animation: 'fadeUp 1s cubic-bezier(.22,1,.36,1) 0.6s forwards' }}>
          Coach Abhishek
        </p>
        <p className="hero-desc" style={{ fontSize: '1.05rem', fontWeight: 400, color: 'var(--grey)', lineHeight: 1.7, maxWidth: 520, margin: '0 auto 48px', opacity: 0, animation: 'fadeUp 1s cubic-bezier(.22,1,.36,1) 0.7s forwards' }}>
          Elite personal training, MMA, Yoga, Zumba and strength coaching — all under one roof in Lucknow. Backed by certified experts. Built for real results.
        </p>
        <div className="hero-buttons" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', opacity: 0, animation: 'fadeUp 1s cubic-bezier(.22,1,.36,1) 0.8s forwards' }}>
          <button onClick={() => router.push('/login')} className="btn-fill" style={{
            background: 'var(--red)', color: '#fff', padding: '14px 28px', borderRadius: 980,
            fontSize: '0.95rem', fontWeight: 600, border: 'none', cursor: 'pointer',
            transition: 'opacity 0.2s, transform 0.15s', display: 'inline-block',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'scale(0.97)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            Login
          </button>
          <a href="#trial" className="btn-ghost" style={{
            background: 'rgba(255,255,255,0.1)', color: 'var(--white)', padding: '14px 28px', borderRadius: 980,
            fontSize: '0.95rem', fontWeight: 500, textDecoration: 'none', border: 'none', cursor: 'pointer',
            transition: 'background 0.2s, transform 0.15s', display: 'inline-block', backdropFilter: 'blur(8px)',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.16)'; e.currentTarget.style.transform = 'scale(0.97)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            View Plans
          </a>
        </div>
        <div className="hero-scroll" style={{
          position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          opacity: 0, animation: 'fadeUp 1s ease 1.2s forwards',
          color: 'var(--grey2)', fontSize: '0.68rem', letterSpacing: '.15em', textTransform: 'uppercase',
        }}>
          <span>Scroll</span>
          <div className="hero-scroll-arrow" style={{
            width: 18, height: 18, borderRight: '1.5px solid currentColor', borderBottom: '1.5px solid currentColor',
            transform: 'rotate(45deg)', marginTop: -4, animation: 'bounce 2s ease-in-out infinite',
          }} />
        </div>
      </section>

      {/* ─── OWNERS ─── */}
      <div className="owners-band" style={{
        borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
        padding: '32px var(--px)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32, flexWrap: 'wrap',
        background: 'var(--surface)', textAlign: 'center',
      }}>
        <span className="owners-kicker" style={{ fontSize: '0.7rem', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--grey2)' }}>Founded &amp; Owned By</span>
        <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--red)', flexShrink: 0 }} />
        <span className="owners-names" style={{ fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-.02em', color: 'var(--white)' }}>Narayan Chandel &amp; Rishi Gaur</span>
        <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--red)', flexShrink: 0 }} />
        <span className="owners-kicker" style={{ fontSize: '0.7rem', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--grey2)' }}>Lucknow, India</span>
      </div>

      {/* ─── NUMBERS ─── */}
      <section className="numbers-strip" id="about" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '72px var(--px)' }}>
        <div className="numbers-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', maxWidth: 900, margin: '0 auto' }}>
          {[
            { val: '67+', label: 'Active Clients', delay: '' },
            { val: '7', label: 'Expert Coaches', delay: 'reveal-delay-1' },
            { val: '5+', label: 'Disciplines', delay: 'reveal-delay-2' },
            { val: '1yr', label: 'Of Excellence', delay: 'reveal-delay-3' },
          ].map((item, i) => (
            <div key={i} className={`reveal ${item.delay}`} style={{ textAlign: 'center', padding: '0 24px', borderRight: '1px solid var(--border)' }}>
              <div className="number-val" style={{ fontSize: 'clamp(2.4rem,5vw,4rem)', fontWeight: 700, letterSpacing: '-.04em', color: 'var(--white)', lineHeight: 1 }}>
                {item.val.includes('+') ? <>{item.val.replace('+', '')}<span style={{ color: 'var(--red)' }}>+</span></> : item.val}
              </div>
              <div className="number-label" style={{ fontSize: '0.8rem', color: 'var(--grey2)', marginTop: 10, letterSpacing: '.03em' }}>{item.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── ABOUT ─── */}
      <div className="chapter chapter-center" style={{ padding: '120px var(--px)', maxWidth: 1080, margin: '0 auto', textAlign: 'center' }}>
        <span className="kicker reveal" style={{ fontSize: '0.72rem', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--red)', marginBottom: 16, display: 'block' }}>Who We Are</span>
        <h2 className="chapter-h2 reveal reveal-delay-1" style={{ fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: 700, letterSpacing: '-.03em', lineHeight: 1.08, marginBottom: 20 }}>
          Fitness that <em style={{ fontStyle: 'normal', color: 'var(--red)' }}>actually</em><br />changes your life.
        </h2>
        <p className="chapter-p reveal reveal-delay-2" style={{ fontSize: '1.05rem', color: 'var(--grey)', lineHeight: 1.75, maxWidth: 600, margin: '0 auto' }}>
          Coach Abhishek was founded with one mission — bring world-class coaching to Lucknow. Every program is certified, personalised, and every client matters. No cookie-cutter plans. No guesswork. Just results.
        </p>
      </div>

      {/* ─── PROGRAMS ─── */}
      <section className="programs-section" id="programs" style={{ background: 'var(--surface)', padding: '120px var(--px)' }}>
        <div className="programs-inner" style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ textAlign: 'center' }}>
            <span className="kicker reveal" style={{ fontSize: '0.72rem', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--red)', marginBottom: 16, display: 'block' }}>What We Offer</span>
            <h2 className="chapter-h2 reveal reveal-delay-1" style={{ fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: 700, letterSpacing: '-.03em', lineHeight: 1.08, marginBottom: 20 }}>
              Every goal.<br /><em style={{ fontStyle: 'normal', color: 'var(--red)' }}>One studio.</em>
            </h2>
            <p className="chapter-p reveal reveal-delay-2" style={{ fontSize: '1.05rem', color: 'var(--grey)', lineHeight: 1.75, maxWidth: 600, margin: '0 auto 64px' }}>
              From building raw strength to finding inner balance — we have a specialist and a program waiting for you.
            </p>
          </div>
          <div className="programs-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
            {[
              { emoji: '🏋️', name: 'Personal Training', desc: '1-on-1 sessions tailored to your body, your goals, and your schedule. Strength, fat loss, muscle building — done right.', tag: 'Certified Trainers', delay: '' },
              { emoji: '🥊', name: 'MMA & Combat Fitness', desc: 'Striking, grappling, and conditioning led by our seasoned MMA expert. Build discipline, fitness, and real self-defence skills.', tag: 'All Levels Welcome', delay: 'reveal-delay-1' },
              { emoji: '🧘', name: 'Yoga', desc: 'Traditional yogic practice for flexibility, breath control, and mental clarity. Guided by our dedicated Yog Guru.', tag: 'Mind & Body', delay: 'reveal-delay-2' },
              { emoji: '🎵', name: 'Zumba', desc: 'High-energy dance fitness that burns serious calories while being genuinely fun. Led by our certified Zumba expert.', tag: 'Dance Fitness', delay: 'reveal-delay-3' },
              { emoji: '🥗', name: 'Nutrition Coaching', desc: 'Custom diet planning aligned with your training. No fad diets — practical, sustainable nutrition guidance you\'ll actually follow.', tag: 'Diet Plans', delay: '' },
              { emoji: '🏅', name: 'Powerlifting & Strength', desc: 'Train squat, bench, and deadlift under a national-level competitive powerlifter. Learn the technique that moves real weight.', tag: 'Advanced Strength', delay: 'reveal-delay-1' },
              { emoji: '📱', name: 'Online Coaching', desc: 'Can\'t make it to the studio? Get a fully customised training and nutrition plan with weekly check-ins delivered remotely.', tag: 'Remote Access', delay: 'reveal-delay-2' },
              { emoji: '👥', name: 'Group Fitness', desc: 'High-energy group sessions that combine cardio, functional training, and community motivation. Better together.', tag: 'Community', delay: 'reveal-delay-3' },
            ].map((prog, i) => (
              <div key={i} className={`program-card reveal ${prog.delay}`} style={{
                background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 20,
                padding: '40px 32px', cursor: 'default', transition: 'border-color 0.3s, transform 0.3s, background 0.3s',
              }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.background = 'var(--surface3)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.background = 'var(--surface2)'; }}
              >
                <span style={{ fontSize: '2.4rem', marginBottom: 24, display: 'block', lineHeight: 1 }}>{prog.emoji}</span>
                <div style={{ fontSize: '1.15rem', fontWeight: 600, letterSpacing: '-.02em', marginBottom: 10 }}>{prog.name}</div>
                <div style={{ fontSize: '0.88rem', color: 'var(--grey)', lineHeight: 1.65 }}>{prog.desc}</div>
                <span style={{ display: 'inline-block', marginTop: 20, fontSize: '0.68rem', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--red)', border: '1px solid var(--red-soft)', padding: '4px 12px', borderRadius: 980 }}>{prog.tag}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TEAM ─── */}
      <section className="team-section" id="team" style={{ background: 'var(--black)', padding: '120px var(--px)' }}>
        <div className="team-inner" style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ textAlign: 'center' }}>
            <span className="kicker reveal" style={{ fontSize: '0.72rem', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--red)', marginBottom: 16, display: 'block' }}>The People Behind Your Progress</span>
            <h2 className="chapter-h2 reveal reveal-delay-1" style={{ fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: 700, letterSpacing: '-.03em', lineHeight: 1.08, marginBottom: 20 }}>
              Meet the <em style={{ fontStyle: 'normal', color: 'var(--red)' }}>experts.</em>
            </h2>
            <p className="chapter-p reveal reveal-delay-2" style={{ fontSize: '1.05rem', color: 'var(--grey)', lineHeight: 1.75, maxWidth: 600, margin: '0 auto 64px' }}>
              Coach Abhishek is certified, passionate, and personally invested in your transformation. Not gym staff — a specialist.
            </p>
          </div>
          <div className="team-grid" style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 1,
            background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden',
          }}>
            {[
              { role: 'Personal Training & Powerlifting', name: 'Abhishek Katiyar', bio: 'K11 Certified Head Trainer and national-level competitive powerlifter in the 83kg Senior category. Current competition lifts: 230kg Squat · 150kg Bench · 260kg Deadlift. A coach whose personal performance backs every cue he gives.', badge: 'K11 Certified', featured: true, head: 'Head Trainer' },
              { role: 'Personal Training', name: 'Riya Singh', bio: 'Certified personal trainer specialising in body transformation, weight management, and functional fitness for women and beginners. Warm, precise, and genuinely results-driven.', badge: 'Certified Trainer', delay: 'reveal-delay-1' },
              { role: 'Personal Training', name: 'Rajat Katiyar', bio: 'Strength and hypertrophy specialist with sharp knowledge of movement mechanics and progressive overload programming for every fitness level.', badge: 'Strength & Conditioning', delay: 'reveal-delay-2' },
              { role: 'Personal Training', name: 'Shivani Verma', bio: 'Dedicated trainer empowering clients through science-based programs, consistent accountability, and the kind of motivation that actually sticks.', badge: 'Certified Trainer' },
              { role: 'MMA Expert', name: 'Vikrant Agnihotri', bio: 'Seasoned MMA practitioner bringing combat sports conditioning, striking fundamentals, and mental toughness to every class. Beginner to advanced, all welcome.', badge: 'Combat Sports', delay: 'reveal-delay-1' },
              { role: 'Yog Guru', name: 'Shagun Savita', bio: 'Guiding students through authentic yogic practice — asana, pranayama, and mindful awareness — for strength, flexibility, and inner stillness.', badge: 'Yoga & Wellness', delay: 'reveal-delay-2' },
              { role: 'Zumba Expert', name: 'Gaurav', bio: 'High-energy Zumba instructor whose sessions feel more like a celebration than a workout. Cardio you\'ll look forward to — every single time.', badge: 'Dance Fitness' },
            ].map((member, i) => (
              <div key={i} className={`team-card reveal ${member.delay || ''}`} style={{
                background: member.featured ? 'linear-gradient(135deg,rgba(217,31,60,0.08) 0%,var(--surface2) 100%)' : 'var(--surface2)',
                padding: '40px 36px', transition: 'background 0.3s', position: 'relative',
              }}
                onMouseEnter={(e) => { if (!member.featured) e.currentTarget.style.background = 'var(--surface3)'; }}
                onMouseLeave={(e) => { if (!member.featured) e.currentTarget.style.background = 'var(--surface2)'; }}
              >
                {member.head && <div style={{ position: 'absolute', top: 20, right: 20, background: 'var(--red)', color: '#fff', fontSize: '0.6rem', letterSpacing: '.14em', fontWeight: 600, textTransform: 'uppercase', padding: '4px 10px', borderRadius: 980 }}>{member.head}</div>}
                <div className="team-card-role" style={{ fontSize: '0.68rem', letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--red)', marginBottom: 14 }}>{member.role}</div>
                <div className="team-card-name" style={{ fontSize: '1.35rem', fontWeight: 600, letterSpacing: '-.02em', marginBottom: 12, lineHeight: 1.15, color: member.featured ? 'var(--white)' : undefined }}>{member.name}</div>
                <div className="team-card-bio" style={{ fontSize: '0.88rem', color: 'var(--grey)', lineHeight: 1.65 }}>{member.bio}</div>
                <span className="team-card-badge" style={{ display: 'inline-block', marginTop: 18, fontSize: '0.68rem', letterSpacing: '.1em', textTransform: 'uppercase', border: '1px solid var(--border-hover)', color: 'var(--grey2)', padding: '4px 12px', borderRadius: 980 }}>{member.badge}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── MEMBERSHIP ─── */}
      <section className="membership-section" id="membership" style={{ background: 'var(--black)', padding: '120px var(--px)' }}>
        <div className="membership-inner" style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ textAlign: 'center' }}>
            <span className="kicker reveal" style={{ fontSize: '0.72rem', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--red)', marginBottom: 16, display: 'block' }}>Membership Plans</span>
            <h2 className="chapter-h2 reveal reveal-delay-1" style={{ fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: 700, letterSpacing: '-.03em', lineHeight: 1.08, marginBottom: 20 }}>
              Simple, honest <em style={{ fontStyle: 'normal', color: 'var(--red)' }}>pricing.</em>
            </h2>
            <p className="chapter-p reveal reveal-delay-2" style={{ fontSize: '1.05rem', color: 'var(--grey)', lineHeight: 1.75, maxWidth: 600, margin: '0 auto 64px' }}>
              Choose the plan that fits your goals. No hidden charges, no lock-in. Just great coaching at a fair price.
            </p>
          </div>
          <div className="plans-grid reveal reveal-delay-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 24, overflow: 'hidden' }}>
            {[
              { name: 'Starter', price: '1,999', period: 'per month', popular: false, features: ['Gym floor access', '1 Group class/week', 'Basic fitness assessment', 'Locker facility', 'Trainer guidance on floor'], primary: false },
              { name: 'Pro', price: '3,999', period: 'per month', popular: true, features: ['Everything in Starter', '8 Personal training sessions', 'Custom nutrition plan', '3 Group classes/week', 'Monthly body composition check', 'WhatsApp coach support'], primary: true },
              { name: 'Elite', price: '6,499', period: 'per month', popular: false, features: ['Everything in Pro', 'Unlimited PT sessions', 'Unlimited group classes', 'Speciality class access (MMA/Yoga/Zumba)', 'Weekly diet revision', 'Priority scheduling', 'Quarterly progress report'], primary: false },
            ].map((plan, i) => (
              <div key={i} className="plan-card" style={{ background: plan.popular ? 'var(--surface3)' : 'var(--surface2)', padding: '48px 36px', textAlign: 'center', position: 'relative' }}>
                {plan.popular && <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', background: 'var(--red)', color: '#fff', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', padding: '6px 20px', borderRadius: '0 0 12px 12px' }}>Most Popular</div>}
                <div className="plan-name" style={{ fontSize: '0.75rem', letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--grey2)', marginBottom: 24 }}>{plan.name}</div>
                <div className="plan-price" style={{ fontSize: 'clamp(2.2rem,4vw,3.2rem)', fontWeight: 700, letterSpacing: '-.04em', marginBottom: 4 }}>
                  <sup style={{ fontSize: '1rem', fontWeight: 400, verticalAlign: 'super', marginRight: 2 }}>₹</sup>{plan.price}
                </div>
                <div className="plan-period" style={{ fontSize: '0.82rem', color: 'var(--grey2)', marginBottom: 36 }}>{plan.period}</div>
                <ul className="plan-features" style={{ listStyle: 'none', textAlign: 'left', marginBottom: 40 }}>
                  {plan.features.map((f, j) => (
                    <li key={j} style={{ fontSize: '0.88rem', color: 'var(--grey)', padding: '9px 0', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ color: 'var(--red)', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <a href="#contact" className={`plan-btn ${plan.primary ? 'plan-btn-primary' : 'plan-btn-secondary'}`} style={{
                  display: 'block', width: '100%', padding: '14px 0', borderRadius: 980,
                  fontSize: '0.9rem', fontWeight: 600, textDecoration: 'none', textAlign: 'center', cursor: 'pointer', border: 'none',
                  background: plan.primary ? 'var(--red)' : 'rgba(255,255,255,0.08)', color: plan.primary ? '#fff' : 'var(--white)',
                  transition: 'opacity 0.2s, transform 0.15s',
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'scale(0.97)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  {plan.primary ? 'Join Pro' : plan.name === 'Starter' ? 'Get Started' : 'Go Elite'}
                </a>
              </div>
            ))}
          </div>
          <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--grey2)', marginTop: 28, lineHeight: 1.6 }}>* Prices are indicative. Contact us for exact current pricing and custom packages. Corporate and group discounts available.</p>
        </div>
      </section>

      {/* ─── WHY US ─── */}
      <section className="why-section" style={{ background: 'var(--surface)', padding: '120px var(--px)' }}>
        <div className="why-inner" style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ textAlign: 'center' }}>
            <span className="kicker reveal" style={{ fontSize: '0.72rem', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--red)', marginBottom: 16, display: 'block' }}>Why Coach Abhishek?</span>
            <h2 className="chapter-h2 reveal reveal-delay-1" style={{ fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: 700, letterSpacing: '-.03em', lineHeight: 1.08, marginBottom: 20 }}>
              Not just a gym.<br /><em style={{ fontStyle: 'normal', color: 'var(--red)' }}>A system.</em>
            </h2>
          </div>
          <div className="why-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 24, overflow: 'hidden', marginTop: 64 }}>
            {[
              { icon: '🎯', title: 'Personalised to You', body: 'No two clients are the same. Every program at Coach Abhishek is built around your body, history, schedule, and goals — not a generic template.' },
              { icon: '🏆', title: 'Elite Coach Credentials', body: 'Our head trainer is an active national-level powerlifter. The coaches teaching you aren\'t just certified — they live what they teach.', delay: 'reveal-delay-1' },
              { icon: '📊', title: 'Progress You Can Measure', body: 'We track body composition, strength metrics, and wellness markers so you can see exactly how far you\'ve come — and where you\'re headed.', delay: 'reveal-delay-2' },
              { icon: '🤝', title: 'Real Accountability', body: 'Check-ins, WhatsApp support, and coaches who actually notice when you miss a session. We\'re invested in your outcome.' },
              { icon: '🌟', title: '5 Disciplines, One Roof', body: 'Personal training, MMA, Yoga, Zumba, and nutrition coaching — no need to juggle multiple gyms or online apps. It\'s all here.', delay: 'reveal-delay-1' },
              { icon: '💬', title: 'Community That Pushes You', body: '67+ members who motivate each other. Group challenges, transformation stories, and a culture where everyone is rooting for everyone.', delay: 'reveal-delay-2' },
            ].map((why, i) => (
              <div key={i} className={`why-card reveal ${why.delay || ''}`} style={{ background: 'var(--surface2)', padding: '44px 36px', transition: 'background 0.3s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface3)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface2)'; }}
              >
                <span style={{ fontSize: '2rem', marginBottom: 20, display: 'block' }}>{why.icon}</span>
                <div style={{ fontSize: '1.05rem', fontWeight: 600, letterSpacing: '-.02em', marginBottom: 10 }}>{why.title}</div>
                <div style={{ fontSize: '0.88rem', color: 'var(--grey)', lineHeight: 1.65 }}>{why.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FREE TRIAL ─── */}
      <section className="trial-section" id="trial" style={{
        padding: '100px var(--px)', textAlign: 'center',
        background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(217,31,60,0.12) 0%, transparent 70%)',
        borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
      }}>
        <span className="kicker reveal" style={{ fontSize: '0.72rem', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--red)', marginBottom: 16, display: 'block' }}>Zero Risk</span>
        <h2 className="trial-h2 reveal reveal-delay-1" style={{ fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: 700, letterSpacing: '-.03em', marginBottom: 16 }}>
          Try Coach Abhishek Free<br />for 3 Days.
        </h2>
        <p className="trial-p reveal reveal-delay-2" style={{ fontSize: '1rem', color: 'var(--grey)', marginBottom: 40, maxWidth: 440, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.7 }}>
          Walk in, train with our coaches, experience the studio — completely free, no strings attached. We&apos;re confident you&apos;ll stay.
        </p>
        <div className="reveal reveal-delay-3">
          <a href={SUPPORT_WA_URL} className="btn-fill" style={{
            background: 'var(--red)', color: '#fff', padding: '16px 36px', borderRadius: 980,
            fontSize: '1rem', fontWeight: 600, textDecoration: 'none', border: 'none', cursor: 'pointer', display: 'inline-block',
            transition: 'opacity 0.2s, transform 0.15s',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'scale(0.97)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            Claim Your Free Trial →
          </a>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="faq-section" style={{ background: 'var(--black)', padding: '120px var(--px)' }}>
        <div className="faq-inner" style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ textAlign: 'center' }}>
            <span className="kicker reveal" style={{ fontSize: '0.72rem', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--red)', marginBottom: 16, display: 'block' }}>Questions</span>
            <h2 className="chapter-h2 reveal reveal-delay-1" style={{ fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: 700, letterSpacing: '-.03em', lineHeight: 1.08, marginBottom: 20 }}>
              We&apos;ve got <em style={{ fontStyle: 'normal', color: 'var(--red)' }}>answers.</em>
            </h2>
          </div>
          <div className="faq-list reveal reveal-delay-2" style={{ marginTop: 64, borderTop: '1px solid var(--border)' }}>
            {faqs.map((faq, i) => (
              <div key={i} className={`faq-item ${openFaq === i ? 'open' : ''}`} style={{ borderBottom: '1px solid var(--border)' }}>
                <button className="faq-q" onClick={() => toggleFaq(i)} style={{
                  width: '100%', background: 'none', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '22px 0', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '1rem', fontWeight: 500,
                  color: openFaq === i ? 'var(--red)' : 'var(--white)', textAlign: 'left', gap: 16,
                }}>
                  <span>{faq.q}</span>
                  <div style={{
                    flexShrink: 0, width: 22, height: 22, border: '1px solid var(--border-hover)', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.2s, transform 0.3s', fontSize: '0.9rem',
                    color: openFaq === i ? '#fff' : 'var(--grey)',
                    background: openFaq === i ? 'var(--red)' : undefined,
                    borderColor: openFaq === i ? 'var(--red)' : undefined,
                    transform: openFaq === i ? 'rotate(45deg)' : undefined,
                  }}>+</div>
                </button>
                <div className="faq-a" style={{
                  maxHeight: openFaq === i ? 300 : 0, overflow: 'hidden',
                  transition: 'max-height 0.45s ease, padding 0.3s ease',
                }}>
                  <div className="faq-a-inner" style={{ fontSize: '0.93rem', color: 'var(--grey)', lineHeight: 1.75, paddingBottom: 22 }}>
                    {faq.a}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CONTACT ─── */}
      <section className="contact-section" id="contact" style={{ background: 'var(--surface)', padding: '120px var(--px)' }}>
        <div className="contact-inner" style={{ maxWidth: 1080, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'start' }}>
          <div>
            <span className="kicker reveal" style={{ fontSize: '0.72rem', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--red)', marginBottom: 16, display: 'block' }}>Find Us</span>
            <h2 className="chapter-h2 reveal reveal-delay-1" style={{ fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: 700, letterSpacing: '-.03em', lineHeight: 1.08, marginBottom: 20, maxWidth: 420 }}>
              Let&apos;s talk <em style={{ fontStyle: 'normal', color: 'var(--red)' }}>goals.</em>
            </h2>
            <p className="chapter-p reveal reveal-delay-2" style={{ fontSize: '1.05rem', color: 'var(--grey)', lineHeight: 1.75, maxWidth: 600, marginBottom: 48 }}>
              Whether you have questions about programs, pricing, or just want to see the studio — we&apos;re here. Come in or reach out directly.
            </p>
            {[
              { label: 'Phone / WhatsApp', value: <a href={SUPPORT_TEL_URL} style={{ color: 'var(--red)', textDecoration: 'none' }} onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'} onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}>{SUPPORT_PHONE_RAW}</a>, delay: '' },
              { label: 'Location', value: <>Coach Abhishek<br />Lucknow, Uttar Pradesh, India</>, delay: 'reveal-delay-1' },
              { label: 'Studio Hours', value: <>Mon – Sat &nbsp;·&nbsp; 6:00 AM – 9:00 PM<br />Sunday &nbsp;·&nbsp; 7:00 AM – 12:00 PM</>, delay: 'reveal-delay-2' },
              { label: 'Owned By', value: 'Abhishek Katiyar', delay: 'reveal-delay-3' },
            ].map((info, i) => (
              <div key={i} className={`contact-info-block reveal ${info.delay}`} style={{ marginBottom: 28 }}>
                <div className="contact-label" style={{ fontSize: '0.7rem', letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--grey2)', marginBottom: 8 }}>{info.label}</div>
                <div className="contact-value" style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--white)', lineHeight: 1.5 }}>{info.value}</div>
              </div>
            ))}
          </div>
          <div className="map-placeholder reveal reveal-delay-2" style={{
            width: '100%', aspectRatio: '4/3', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 20,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--grey2)', fontSize: '0.88rem', textAlign: 'center', padding: 24,
          }}>
            <div style={{ fontSize: '2.5rem', opacity: 0.5 }}>📍</div>
            <p><strong style={{ color: 'var(--white)' }}>Coach Abhishek</strong><br />Lucknow, Uttar Pradesh<br /><br /><a href="https://maps.google.com" target="_blank" style={{ color: 'var(--red)', fontSize: '0.82rem' }}>Open in Google Maps →</a></p>
          </div>
        </div>
      </section>

      {/* ─── SOCIAL ─── */}
      <section className="social-section" style={{ background: 'var(--black)', padding: '80px var(--px)', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
        <div style={{ fontSize: '0.72rem', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--grey2)', marginBottom: 32 }}>Follow Our Journey</div>
        <div className="social-links" style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            { label: 'Instagram', icon: <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, fill: 'currentColor' }}><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg> },
            { label: 'TikTok / YouTube', icon: <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, fill: 'currentColor' }}><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.19 8.19 0 004.79 1.53V6.77a4.85 4.85 0 01-1.02-.08z" /></svg> },
            { label: 'WhatsApp', icon: <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, fill: 'currentColor' }}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg> },
          ].map((social, i) => (
            <a key={i} href="#" className="social-link" style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '12px 24px', borderRadius: 980,
              border: '1px solid var(--border)', fontSize: '0.88rem', color: 'var(--grey)', textDecoration: 'none',
              transition: 'border-color 0.2s, color 0.2s, transform 0.2s',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.color = 'var(--white)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--grey)'; e.currentTarget.style.transform = 'none'; }}
            >
              {social.icon} {social.label}
            </a>
          ))}
        </div>
      </section>

      {/* ─── BIG CTA ─── */}
      <section className="bigcta-section" style={{
        background: 'radial-gradient(ellipse 60% 50% at 50% 100%, rgba(217,31,60,0.1) 0%, transparent 70%)',
        padding: '120px var(--px)', textAlign: 'center',
      }}>
        <h2 className="bigcta-h2 reveal" style={{ fontSize: 'clamp(2.5rem,6vw,5rem)', fontWeight: 700, letterSpacing: '-.04em', lineHeight: 1.04, marginBottom: 20 }}>
          Your strongest self<br />starts <em style={{ fontStyle: 'normal', color: 'var(--red)' }}>today.</em>
        </h2>
        <p className="bigcta-p reveal reveal-delay-1" style={{ fontSize: '1.05rem', color: 'var(--grey)', maxWidth: 480, margin: '0 auto 48px', lineHeight: 1.7 }}>
          3-day free trial. No card required. Just show up — we&apos;ll handle the rest.
        </p>
        <div className="reveal reveal-delay-2" style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href={SUPPORT_WA_URL} className="btn-fill" style={{
            background: 'var(--red)', color: '#fff', padding: '16px 36px', borderRadius: 980,
            fontSize: '1rem', fontWeight: 600, textDecoration: 'none', border: 'none', cursor: 'pointer', display: 'inline-block',
            transition: 'opacity 0.2s, transform 0.15s',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'scale(0.97)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            Book Free Trial on WhatsApp
          </a>
          <a href={SUPPORT_TEL_URL} className="btn-ghost" style={{
            background: 'rgba(255,255,255,0.1)', color: 'var(--white)', padding: '16px 36px', borderRadius: 980,
            fontSize: '1rem', fontWeight: 500, textDecoration: 'none', border: 'none', cursor: 'pointer', display: 'inline-block',
            backdropFilter: 'blur(8px)', transition: 'background 0.2s, transform 0.15s',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.16)'; e.currentTarget.style.transform = 'scale(0.97)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            Call Us Now
          </a>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '48px var(--px)' }}>
        <div className="footer-inner" style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
          <a href="#" className="footer-brand" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }} onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
            <Image src="/619-logo.png" alt="Coach Abhishek" width={32} height={32} className="footer-logo" style={{ objectFit: 'contain' }} />
            <span className="footer-name" style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--white)' }}><span style={{ color: 'var(--red)' }}>COACH</span> ABHISHEK</span>
          </a>
          <ul className="footer-nav" style={{ display: 'flex', gap: 24, listStyle: 'none', flexWrap: 'wrap' }}>
            {['About', 'Team', 'Programs', 'Pricing', 'Contact'].map((item) => (
              <li key={item}>
                <a href={`#${item.toLowerCase() === 'pricing' ? 'membership' : item.toLowerCase() === 'about' ? 'about' : item.toLowerCase()}`}
                  style={{ fontSize: '0.78rem', color: 'var(--grey2)', textDecoration: 'none', transition: 'color .2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--white)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--grey2)'}
                >{item}</a>
              </li>
            ))}
          </ul>
          <span className="footer-copy" style={{ fontSize: '0.75rem', color: 'var(--grey2)' }}>© 2026 Coach Abhishek · Lucknow</span>
        </div>
      </footer>
    </div>
  );
}
