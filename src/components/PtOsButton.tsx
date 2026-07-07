'use client';
import { m } from 'framer-motion';
import { useRouter } from 'next/navigation';

const BTN_STYLE: React.CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: 12,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 0,
  background: 'linear-gradient(135deg, #7c3aed, #4f46e5, #06b6d4)',
  backdropFilter: 'blur(16px) saturate(180%)',
  WebkitBackdropFilter: 'blur(16px) saturate(180%)',
  border: '1.5px solid rgba(255,255,255,0.40)',
  cursor: 'pointer',
  overflow: 'hidden',
  transition: 'box-shadow 0.35s cubic-bezier(0.16,1,0.3,1)',
  boxShadow: [
    '0 0 18px rgba(124,58,237,0.35)',
    '0 0 36px rgba(6,182,212,0.15)',
    '0 4px 12px rgba(15,23,42,0.18)',
    'inset 0 1px 0 rgba(255,255,255,0.45)',
    'inset 0 -1px 0 rgba(0,0,0,0.10)',
  ].join(', '),
};

const REFLECTION_STYLE: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.08) 40%, transparent 100%)',
  borderRadius: 12,
};

const SHIMMER_STYLE: React.CSSProperties = {
  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
  transform: 'translateX(-100%)',
  animation: 'pt-os-shimmer 3s ease-in-out infinite',
  borderRadius: 12,
};

const GLOW_STYLE: React.CSSProperties = {
  background: 'linear-gradient(135deg, #a78bfa, #818cf8, #22d3ee)',
  zIndex: -1,
  filter: 'blur(6px)',
  animation: 'pt-os-glow-pulse 2s ease-in-out infinite',
};

const PT_TEXT_STYLE: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 900,
  color: '#ffffff',
  letterSpacing: '-0.01em',
  textShadow: '0 1px 3px rgba(0,0,0,0.25)',
  marginTop: -1,
};

const OS_TEXT_STYLE: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 900,
  color: 'var(--text-primary)',
  letterSpacing: '-0.01em',
  textShadow: '0 1px 3px rgba(0,0,0,0.20)',
  marginTop: 1,
};

export default function PtOsButton() {
  const router = useRouter();

  return (
    <m.button
      type="button"
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      aria-label="PERSONAL TRAINING — Personal Training Operating System"
      title="PERSONAL TRAINING"
      className="group relative shrink-0"
      style={BTN_STYLE}
      onClick={() => router.push('/pt-os')}
    >
      {/* Glass reflection overlay — top highlight */}
      <span className="pointer-events-none absolute inset-0" style={REFLECTION_STYLE} />

      {/* Animated shimmer sweep */}
      <span
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={SHIMMER_STYLE}
      />

      {/* Animated glow ring on hover */}
      <span
        className="pointer-events-none absolute -inset-[3px] rounded-[15px] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={GLOW_STYLE}
      />

      {/* PT text */}
      <span className="leading-none" style={PT_TEXT_STYLE}>PT</span>

      {/* OS text */}
      <span className="leading-none" style={OS_TEXT_STYLE}>OS</span>
    </m.button>
  );
}
