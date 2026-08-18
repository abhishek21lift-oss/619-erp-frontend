'use client';

import { Check, ArrowRight, Crown, LoaderCircle } from 'lucide-react';
import Link from 'next/link';
import { Container, Reveal, Section, SectionHeader } from './primitives';
import { C, SHADOW } from './tokens';
import type { PublicPlan } from './types';

const HIGHLIGHT_PLAN = 'professional';

const PLAN_FEATURES: Record<string, string[]> = {
  starter: ['Client CRM & profiles', 'Workout & nutrition builder', 'Payments & invoices', 'Mobile app access'],
  growth: ['Everything in Starter', 'Progress & body composition', 'Automation & reminders', 'Reports & analytics'],
  professional: ['Everything in Growth', 'Attendance & check-in', 'Commission tracking', 'Priority support'],
  elite: ['Everything in Professional', 'Multi-trainer & permissions', 'AI assistant', 'Dedicated onboarding'],
};

function planTerm(months: number): string {
  if (months === 1) return '/mo';
  if (months === 12) return '/yr';
  return `/${months} mo`;
}

/**
 * Pricing — rendered entirely from the live catalogue endpoint. If it cannot
 * be reached, the section shows a loading/fallback state rather than stale
 * hardcoded prices.
 */
export default function PricingSection({
  plans,
  founderSlots,
  trialDays,
}: {
  plans: PublicPlan[];
  founderSlots: number | null;
  trialDays: number;
}) {
  return (
    <Section id="pricing" alt aria-labelledby="pricing-title">
      <Container>
        <SectionHeader
          id="pricing-title"
          eyebrow="Pricing"
          title="Pricing that grows with your studio"
          sub={`Every plan starts with a ${trialDays}-day free trial. No card required, no lock-in.`}
        />

        {founderSlots != null && founderSlots > 0 && (
          <Reveal delay={0.12}>
            <p className="mx-auto mt-6 flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-[12.5px] font-bold" style={{ background: C.goldSoft, borderColor: C.goldGlow, color: C.goldHi }}>
              <Crown size={14} aria-hidden />
              Founder&apos;s Club — {founderSlots} lifetime-locked {founderSlots === 1 ? 'place' : 'places'} left
            </p>
          </Reveal>
        )}

        <div className="mt-12">
          {plans.length === 0 ? (
            <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border px-6 py-10 text-center" style={{ background: C.panel, borderColor: C.line }}>
              <LoaderCircle size={20} className="animate-spin" style={{ color: C.blueHi }} aria-hidden />
              <p className="text-[13.5px] font-medium" style={{ color: C.muted }}>
                Plan pricing is loading — or{' '}
                <Link href="/login" className="font-bold underline underline-offset-4" style={{ color: C.blueHi }}>
                  sign in
                </Link>{' '}
                to see your options.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {plans.map((p, i) => {
                const highlight = p.code === HIGHLIGHT_PLAN;
                const limit = p.client_limit == null ? 'Unlimited active clients' : `Up to ${p.client_limit} active clients`;
                const feats = [limit, ...(PLAN_FEATURES[p.code] ?? [])];
                return (
                  <Reveal key={p.code} delay={i * 0.05} className="h-full">
                    <div
                      className="relative flex h-full flex-col rounded-3xl p-6"
                      style={
                        highlight
                          ? {
                              background: `linear-gradient(165deg, ${C.highlightFrom} 0%, ${C.highlightMid} 55%, ${C.canvas} 100%)`,
                              border: `1px solid ${C.lineBlue}`,
                              boxShadow: SHADOW.blueGlow,
                            }
                          : { background: C.panel, border: `1px solid ${C.lineSoft}` }
                      }
                    >
                      {highlight && (
                        <span
                          className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3.5 py-1 text-[10.5px] font-[800] uppercase tracking-wide"
                          style={{ background: `linear-gradient(135deg, ${C.goldHi}, ${C.gold})`, color: C.onGold }}
                        >
                          Most popular
                        </span>
                      )}
                      {p.is_launch && !highlight && (
                        <span
                          className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3.5 py-1 text-[10.5px] font-[800] uppercase tracking-wide"
                          style={{ background: `linear-gradient(135deg, ${C.goldHi}, ${C.gold})`, color: C.onGold }}
                        >
                          Launch offer
                        </span>
                      )}

                      <div className="text-[15px] font-bold" style={{ color: C.ink }}>{p.name}</div>
                      <div className="mt-1 text-[12px] font-medium" style={{ color: highlight ? C.muted : C.faint }}>{p.best_for}</div>

                      <div className="mt-4 flex items-end gap-1.5">
                        <span className="text-[32px] font-[850] tracking-[-0.02em] tabular-nums" style={{ color: highlight ? C.goldHi : C.ink }}>
                          ₹{p.effective_price_inr.toLocaleString('en-IN')}
                        </span>
                        <span className="pb-1.5 text-[13px] font-medium" style={{ color: highlight ? C.muted : C.faint }}>
                          {planTerm(p.duration_months)}
                        </span>
                      </div>

                      {/* Struck-through list price only when a launch discount is
                          genuinely active — never as a permanent fake anchor. */}
                      {p.is_launch && p.effective_price_inr < p.price_inr && (
                        <div className="mt-0.5 text-[12.5px] font-medium">
                          <span className="line-through" style={{ color: C.faint }}>
                            ₹{p.price_inr.toLocaleString('en-IN')}
                          </span>
                          <span className="ml-1.5 font-bold" style={{ color: highlight ? C.emerald : C.emerald }}>
                            save ₹{(p.price_inr - p.effective_price_inr).toLocaleString('en-IN')}
                          </span>
                        </div>
                      )}

                      <Link
                        href="/login"
                        className="mt-5 inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-[13.5px] font-bold transition-all duration-200 hover:-translate-y-0.5"
                        style={
                          highlight
                            ? { background: `linear-gradient(135deg, ${C.goldHi}, ${C.gold})`, color: C.onGold, boxShadow: '0 12px 28px -10px rgba(245,158,11,0.55)' }
                            : { background: `linear-gradient(135deg, ${C.blue450} 0%, ${C.blueLo} 100%)`, color: '#fff', boxShadow: '0 10px 26px -10px rgba(0,103,224,0.55)' }
                        }
                      >
                        Start {trialDays}-day trial <ArrowRight size={15} aria-hidden />
                      </Link>

                      <ul className="mt-6 space-y-2.5">
                        {feats.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-[13px]" style={{ color: C.body }}>
                            <Check size={15} className="mt-0.5 shrink-0" style={{ color: highlight ? C.goldHi : C.blueHi }} aria-hidden />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          )}
        </div>

        <Reveal delay={0.1}>
          <p className="mt-10 text-center text-[12.5px] font-medium" style={{ color: C.faint }}>
            Founder&apos;s Club places are allocated by the team at onboarding — availability shown above is live.
          </p>
        </Reveal>
      </Container>
    </Section>
  );
}