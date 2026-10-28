'use client';

import { Check, ChevronRight, Crown, LoaderCircle } from 'lucide-react';
import Link from 'next/link';
import { Container, Reveal, Section, SectionHeader } from './primitives';
import { C, SHADOW } from './tokens';
import type { PublicPlan } from './types';

const HIGHLIGHT_PLAN = 'professional';

const PLAN_FEATURES: Record<string, string[]> = {
  starter: ['Client CRM & profiles', 'Workout & nutrition builder', 'Payments & invoices', 'Mobile app access'],
  growth: ['Everything in Starter', 'Progress & body composition', 'Automation & reminders', 'Reports & analytics'],
  professional: ['Everything in Growth', 'Attendance & check-in', 'Revenue & dues reporting', 'Priority support'],
  elite: ['Everything in Professional', 'WhatsApp automation', 'AI assistant', 'Dedicated onboarding'],
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
            <p className="mx-auto mt-6 flex w-fit items-center gap-2 rounded-full px-4 py-2 text-[12.5px] font-[500]" style={{ background: C.goldSoft, color: C.goldHi }}>
              <Crown size={14} aria-hidden />
              Founder&apos;s Club — {founderSlots} lifetime-locked {founderSlots === 1 ? 'place' : 'places'} left
            </p>
          </Reveal>
        )}

        <div className="mt-12">
          {plans.length === 0 ? (
            <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-[20px] px-6 py-10 text-center" style={{ background: C.panel, boxShadow: SHADOW.card }}>
              <LoaderCircle size={20} className="animate-spin" style={{ color: C.blueHi }} aria-hidden />
              <p className="text-[13.5px] font-medium" style={{ color: C.muted }}>
                Plan pricing is loading — or{' '}
                <Link href="/login" className="font-[500] underline underline-offset-4" style={{ color: C.blueHi }}>
                  log in
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
                      className="relative flex h-full flex-col rounded-[20px] p-6"
                      style={
                        highlight
                          ? { background: C.panel, border: `1px solid ${C.blue}`, boxShadow: SHADOW.panel }
                          : { background: C.panel, border: `1px solid ${C.lineSoft}` }
                      }
                    >
                      {highlight && (
                        <span
                          className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3.5 py-1 text-[11px] font-[500] text-white"
                          style={{ background: C.blue }}
                        >
                          Most popular
                        </span>
                      )}
                      {p.is_launch && !highlight && (
                        <span
                          className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3.5 py-1 text-[11px] font-[500]"
                          style={{ background: C.goldSoft, color: C.goldHi }}
                        >
                          Launch offer
                        </span>
                      )}

                      <div className="text-[17px] font-[600]" style={{ color: C.ink }}>{p.name}</div>
                      <div className="mt-1 text-[12px] leading-[1.4]" style={{ color: C.muted }}>{p.best_for}</div>

                      <div className="mt-5 flex items-end gap-1.5">
                        <span className="text-[36px] font-[600] tracking-[-0.03em] tabular-nums" style={{ color: C.ink }}>
                          ₹{p.effective_price_inr.toLocaleString('en-IN')}
                        </span>
                        <span className="pb-1.5 text-[13px]" style={{ color: C.muted }}>
                          {planTerm(p.duration_months)}
                        </span>
                      </div>

                      {/* Struck-through list price only when a launch discount is
                          genuinely active — never as a permanent fake anchor. */}
                      {p.is_launch && p.effective_price_inr < p.price_inr && (
                        <div className="mt-1 text-[12.5px]">
                          <span className="line-through" style={{ color: C.faint }}>
                            ₹{p.price_inr.toLocaleString('en-IN')}
                          </span>
                          <span className="ml-1.5 font-[500]" style={{ color: C.emerald }}>
                            save ₹{(p.price_inr - p.effective_price_inr).toLocaleString('en-IN')}
                          </span>
                        </div>
                      )}

                      <Link
                        href="/login"
                        className="mt-6 inline-flex items-center justify-center gap-1 rounded-full px-4 py-2.5 text-[14px] font-[500] transition-colors"
                        style={
                          highlight
                            ? { background: C.blue, color: C.canvas }
                            : { background: C.canvasAlt, color: C.ink }
                        }
                      >
                        Start {trialDays}-day trial <ChevronRight size={15} aria-hidden />
                      </Link>

                      <ul className="mt-6 space-y-2.5">
                        {feats.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-[13px]" style={{ color: C.body }}>
                            <Check size={15} className="mt-0.5 shrink-0" style={{ color: C.blueHi }} aria-hidden />
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
          <p className="mt-10 text-center text-[12.5px]" style={{ color: C.faint }}>
            Founder&apos;s Club places are allocated by the team at onboarding — availability shown above is live.
          </p>
        </Reveal>
      </Container>
    </Section>
  );
}
