import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx,js,jsx}'],
  darkMode: 'class',
  safelist: [
    // KPI Card gradient backgrounds — stored in JS object, cannot be statically detected
    'bg-gradient-to-br',
    'from-rose-500', 'via-pink-500', 'to-red-500',
    'from-emerald-500', 'via-teal-500', 'to-green-600',
    'from-amber-500', 'via-orange-500', 'to-yellow-500',
    'from-sky-500', 'via-blue-500', 'to-indigo-500',
    'from-violet-500', 'via-purple-500', 'to-fuchsia-500',
    'from-orange-500', 'via-red-500', 'to-rose-600',
    'from-slate-700', 'via-slate-800', 'to-zinc-900',
    // glow shadows
    'shadow-[0_8px_32px_-8px_rgba(244,63,94,0.45)]',
    'shadow-[0_8px_32px_-8px_rgba(16,185,129,0.45)]',
    'shadow-[0_8px_32px_-8px_rgba(245,158,11,0.45)]',
    'shadow-[0_8px_32px_-8px_rgba(14,165,233,0.45)]',
    'shadow-[0_8px_32px_-8px_rgba(139,92,246,0.45)]',
    'shadow-[0_8px_32px_-8px_rgba(249,115,22,0.45)]',
    'shadow-[0_8px_32px_-8px_rgba(71,85,105,0.5)]',
    // decorative blobs
    'bg-rose-300/30', 'bg-emerald-300/30', 'bg-amber-300/30',
    'bg-sky-300/30', 'bg-violet-300/30', 'bg-orange-300/30',
    'bg-slate-400/20',
    // icon backgrounds
    'bg-white/25', 'bg-white/15',
    'backdrop-blur-md',
    'backdrop-blur-glassy',
    'backdrop-blur-glassier',
    'backdrop-blur-glassiest',
    'ring-1', 'ring-white/40', 'ring-white/25',
    'border-white/20', 'border-white/30', 'border-white/40', 'border-white/50',
    'border-white/60', 'border-white/70', 'border-white/80',
    'bg-white/30', 'bg-white/40', 'bg-white/50', 'bg-white/60', 'bg-white/70',
    'bg-white/75', 'bg-white/80', 'bg-white/85', 'bg-white/90',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        brand: {
          DEFAULT: 'rgb(var(--rgb-brand) / <alpha-value>)',
          hi: 'rgb(var(--rgb-brand-hi, 239 68 68) / <alpha-value>)',
        },
        ink: 'rgb(var(--rgb-text) / <alpha-value>)',
      },
      backdropBlur: {
        xs: '2px',
        glass: '18px',
        glassy: '20px',
        glassier: '28px',
        glassiest: '36px',
      },
      borderRadius: {
        glass: '18px',
        glassier: '22px',
        glassiest: '28px',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'glass-in': {
          '0%': { opacity: '0', backdropFilter: 'blur(0px)', transform: 'scale(0.98) translateY(-4px)' },
          '100%': { opacity: '1', backdropFilter: 'blur(28px)', transform: 'scale(1) translateY(0)' },
        },
        'glass-float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-2px)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms cubic-bezier(0.4,0,0.2,1) both',
        'slide-up': 'slide-up 300ms cubic-bezier(0.34,1.56,0.64,1) both',
        'slide-down': 'slide-down 200ms cubic-bezier(0.4,0,0.2,1) both',
        'scale-in': 'scale-in 200ms cubic-bezier(0.4,0,0.2,1) both',
        'spin-slow': 'spin 2s linear infinite',
        shimmer: 'shimmer 1.6s ease infinite',
        'glass-in': 'glass-in 300ms cubic-bezier(0.34,1.56,0.64,1) both',
        'glass-float': 'glass-float 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
