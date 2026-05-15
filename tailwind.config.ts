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
    'ring-1', 'ring-white/40', 'ring-white/25',
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
          hi: 'rgb(var(--rgb-brand-hi) / <alpha-value>)',
        },
        ink: 'rgb(var(--rgb-text) / <alpha-value>)',
        ink2: 'rgb(var(--rgb-text-2) / <alpha-value>)',
        muted: 'rgb(var(--rgb-muted) / <alpha-value>)',
      },
      backdropBlur: {
        xs: '2px',
        glass: '18px',
      },
      borderRadius: {
        glass: '18px',
      },
    },
  },
  plugins: [],
};

export default config;
