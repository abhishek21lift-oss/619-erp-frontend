'use client';

import Link from 'next/link';
import { Dumbbell, Apple, TrendingUp, BarChart3, Sparkles, ArrowRight } from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';

const TOOLS = [
  {
    href: '/ai/workout-generator',
    icon: Dumbbell,
    label: 'Workout Generator',
    description: 'Generate a fully personalised training plan in seconds — sets, reps, rest and progression.',
    color: '#3B82F6',
    bg: 'rgba(59,130,246,0.08)',
    border: 'rgba(59,130,246,0.18)',
  },
  {
    href: '/ai/diet-generator',
    icon: Apple,
    label: 'Diet Generator',
    description: 'Build a tailored meal plan based on goals, dietary preferences, budget and activity level.',
    color: '#22C55E',
    bg: 'rgba(34,197,94,0.08)',
    border: 'rgba(34,197,94,0.18)',
  },
  {
    href: '/ai/progress-analysis',
    icon: TrendingUp,
    label: 'Progress Analyzer',
    description: 'Deep-dive analysis of any client\'s fitness journey with personalised coaching recommendations.',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.18)',
  },
  {
    href: '/ai/business-insights',
    icon: BarChart3,
    label: 'Business Insights',
    description: 'AI-powered studio performance report — revenue trends, retention risk, and growth opportunities.',
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.08)',
    border: 'rgba(139,92,246,0.18)',
    adminOnly: true,
  },
];

export default function AiCoachPage() {
  return (
    <Guard>
      <AppShell title="AI Coach">
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

          {/* Hero */}
          <div className="flex items-start gap-4">
            <div
              className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-2xl"
              style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.25)' }}
            >
              <Sparkles size={22} style={{ color: '#D4AF37' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">AI Coach Suite</h1>
              <p className="mt-1 text-sm text-white/55 max-w-xl leading-relaxed">
                Intelligent tools that supercharge your training and business. Generate plans, analyse clients,
                and surface insights — powered by AI trained for serious fitness studios.
              </p>
            </div>
          </div>

          {/* Tool cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            {TOOLS.map(({ href, icon: Icon, label, description, color, bg, border }) => (
              <Link
                key={href}
                href={href}
                className="group relative flex flex-col gap-4 rounded-2xl p-5 transition-all duration-200 hover:scale-[1.015]"
                style={{
                  background: 'rgba(15,20,40,0.70)',
                  border: `1px solid ${border}`,
                  boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
                }}
              >
                <div
                  className="flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0"
                  style={{ background: bg, border: `1px solid ${border}` }}
                >
                  <Icon size={18} style={{ color }} />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[15px] font-semibold text-white">{label}</span>
                  </div>
                  <p className="text-[13px] text-white/50 leading-relaxed">{description}</p>
                </div>

                <div
                  className="flex items-center gap-1.5 text-[12px] font-semibold transition-all duration-200 group-hover:gap-2.5"
                  style={{ color }}
                >
                  Open tool <ArrowRight size={13} />
                </div>

                {/* Gold glow on hover */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{ boxShadow: `inset 0 0 0 1px ${border}` }}
                />
              </Link>
            ))}
          </div>

          {/* Disclaimer */}
          <p className="text-center text-[11px] text-white/25 leading-relaxed">
            AI-generated plans are a starting point. Always apply professional judgement before
            sharing recommendations with clients.
          </p>
        </div>
      </AppShell>
    </Guard>
  );
}
