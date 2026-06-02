export const colors = {
  brand: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
    950: '#172554',
  },
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  danger: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  info: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
} as const;

export type ColorKey = keyof typeof colors;
export type BrandShade = keyof typeof colors.brand;
export type SemanticColor = 'success' | 'warning' | 'danger' | 'info';

export const glass = {
  light: {
    card: 'rgba(255,255,255,0.82)',
    cardBorder: 'rgba(255,255,255,0.95)',
    cardHover: 'rgba(255,255,255,0.92)',
    cardShadow: '0 2px 20px rgba(15,23,42,0.07)',
    cardShadowHover: '0 8px 30px rgba(15,23,42,0.10)',
    header: 'rgba(255,255,255,0.78)',
    headerBorder: 'rgba(15,23,42,0.07)',
    input: 'rgba(248,250,252,0.9)',
    chip: 'rgba(15,23,42,0.04)',
    chipActive: 'rgba(124,58,237,0.10)',
    divider: 'rgba(15,23,42,0.06)',
    skeleton: 'rgba(15,23,42,0.06)',
  },
  dark: {
    card: 'rgba(30,41,59,0.82)',
    cardBorder: 'rgba(51,65,85,0.60)',
    cardHover: 'rgba(30,41,59,0.92)',
    cardShadow: '0 2px 20px rgba(0,0,0,0.25)',
    cardShadowHover: '0 8px 30px rgba(0,0,0,0.35)',
    header: 'rgba(15,23,42,0.82)',
    headerBorder: 'rgba(51,65,85,0.30)',
    input: 'rgba(30,41,59,0.6)',
    chip: 'rgba(255,255,255,0.06)',
    chipActive: 'rgba(59,130,246,0.20)',
    divider: 'rgba(255,255,255,0.06)',
    skeleton: 'rgba(255,255,255,0.06)',
  },
} as const;

export type GlassVariant = keyof typeof glass;
export type GlassToken = keyof typeof glass.light;

export const shadows = {
  sm: '0 1px 2px rgba(15,23,42,0.04)',
  md: '0 2px 8px rgba(15,23,42,0.06)',
  lg: '0 4px 16px rgba(15,23,42,0.08)',
  xl: '0 8px 32px rgba(15,23,42,0.10)',
  '2xl': '0 16px 48px rgba(15,23,42,0.12)',
  glow: {
    brand: '0 8px 32px -8px rgba(59,130,246,0.45)',
    success: '0 8px 32px -8px rgba(34,197,94,0.45)',
    warning: '0 8px 32px -8px rgba(245,158,11,0.45)',
    danger: '0 8px 32px -8px rgba(239,68,68,0.45)',
    info: '0 8px 32px -8px rgba(59,130,246,0.45)',
  },
  inset: {
    sm: 'inset 0 1px 2px rgba(15,23,42,0.04)',
    md: 'inset 0 2px 4px rgba(15,23,42,0.06)',
  },
} as const;

export type ShadowKey = keyof typeof shadows;
export type GlowColor = keyof typeof shadows.glow;

export const radius = {
  none: '0px',
  xs: '6px',
  sm: '8px',
  md: '10px',
  lg: '12px',
  xl: '14px',
  '2xl': '18px',
  '3xl': '22px',
  '4xl': '28px',
  full: '9999px',
} as const;

export type RadiusKey = keyof typeof radius;

export const typography = {
  fontFamily: {
    sans: 'Inter, system-ui, sans-serif',
    mono: 'JetBrains Mono, SFMono-Regular, monospace',
  },
  fontSize: {
    '2xs': ['10px', { lineHeight: '14px', letterSpacing: '0.04em' }],
    xs: ['11px', { lineHeight: '16px', letterSpacing: '0.02em' }],
    sm: ['12px', { lineHeight: '18px', letterSpacing: '0.01em' }],
    base: ['13px', { lineHeight: '20px' }],
    md: ['14px', { lineHeight: '20px' }],
    lg: ['15px', { lineHeight: '22px' }],
    xl: ['17px', { lineHeight: '24px', letterSpacing: '-0.01em' }],
    '2xl': ['20px', { lineHeight: '28px', letterSpacing: '-0.02em' }],
    '3xl': ['24px', { lineHeight: '32px', letterSpacing: '-0.03em' }],
    '4xl': ['30px', { lineHeight: '38px', letterSpacing: '-0.03em' }],
  },
  fontWeight: {
    normal: 500,
    medium: 600,
    semibold: 700,
    bold: 800,
    extrabold: 860,
  },
} as const;

export const animation = {
  duration: {
    fast: 150,
    normal: 200,
    slow: 300,
    page: 400,
    delayed: 500,
  },
  easing: {
    default: [0.4, 0, 0.2, 1] as const,
    spring: [0.34, 1.56, 0.64, 1] as const,
    smooth: [0.16, 1, 0.3, 1] as const,
    bounce: [0.68, -0.55, 0.27, 1.55] as const,
  },
  variants: {
    'fade-in': {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
    },
    'slide-up': {
      initial: { opacity: 0, y: 12 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.3, ease: [0.34, 1.56, 0.64, 1] },
    },
    'slide-down': {
      initial: { opacity: 0, y: -8 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
    },
    'scale-in': {
      initial: { opacity: 0, scale: 0.96 },
      animate: { opacity: 1, scale: 1 },
      transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
    },
    'glass-in': {
      initial: { opacity: 0, backdropFilter: 'blur(0px)', scale: 0.98, y: -4 },
      animate: { opacity: 1, backdropFilter: 'blur(28px)', scale: 1, y: 0 },
      transition: { duration: 0.3, ease: [0.34, 1.56, 0.64, 1] },
    },
  },
} as const;

export const spacing = {
  page: { x: '20px', y: '24px' },
  section: { x: '32px', y: '40px' },
  card: { x: '20px', y: '20px' },
  grid: { gap: '12px' },
} as const;
