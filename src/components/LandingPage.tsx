'use client';

import { useEffect, useState } from 'react';

import { C } from './landing/tokens';
import type { PublicPlan, PublicStats } from './landing/types';

import LandingNav from './landing/LandingNav';
import PublicPullToRefresh from './PublicPullToRefresh';
import Hero from './landing/Hero';
import TrustBar from './landing/TrustBar';
import ProductShowcase from './landing/ProductShowcase';
import ValueProposition from './landing/ValueProposition';
import AiSection from './landing/AiSection';
import PtOsSection from './landing/PtOsSection';
import GymSection from './landing/GymSection';
import FeatureGrid from './landing/FeatureGrid';
import WorkflowSection from './landing/WorkflowSection';
import AnalyticsSection from './landing/AnalyticsSection';
import SecurityStrip from './landing/SecurityStrip';
import PricingSection from './landing/PricingSection';
import FaqSection from './landing/FaqSection';
import FinalCta from './landing/FinalCta';
import Footer from './landing/Footer';

/**
 * The public marketing page.
 *
 * Story order: hero → capability trust → product tour → the gap → AI training
 * layer → for trainers → for PT businesses → feature catalogue → workflow → analytics →
 * security → pricing → FAQ → closing CTA → footer.
 *
 * Live data comes from the public, unauthenticated endpoints. Failures are
 * swallowed on purpose: the page must still render if the API is cold or
 * unreachable — it renders without live figures, never with invented ones.
 */
export default function LandingPage() {
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [founderSlots, setFounderSlots] = useState<number | null>(null);
  const [trialDays, setTrialDays] = useState(7);
  const [stats, setStats] = useState<PublicStats | null>(null);

  useEffect(() => {
    const base = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/+$/, '');
    const url = (p: string) =>
      (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
        ? p
        : `${base}${p}`;

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
      .then((j) => {
        if (j?.data) setStats(j.data);
      })
      .catch(() => {});
  }, []);

  return (
    <div
      className="relative min-h-screen"
      style={{ background: C.canvas, color: C.body }}
    >
      {/* ambient background — clipped so decorative glows never create
          horizontal document overflow. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute -left-48 -top-48 h-[560px] w-[560px] rounded-full"
          style={{ background: `radial-gradient(circle, ${C.blueGlow}2e, transparent 68%)` }}
        />
        <div
          className="absolute -right-48 top-40 h-[600px] w-[600px] rounded-full"
          style={{ background: `radial-gradient(circle, ${C.goldGlow}24, transparent 68%)` }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(120% 90% at 50% -8%, rgba(0,103,224,0.08), transparent 60%)' }}
        />
      </div>

      <LandingNav />
      <PublicPullToRefresh />

      <main id="main-content">
        <Hero />
        <TrustBar stats={stats} />
        <ProductShowcase />
        <ValueProposition />
        <AiSection />
        <PtOsSection />
        <GymSection />
        <FeatureGrid />
        <WorkflowSection />
        <AnalyticsSection />
        <SecurityStrip />
        <PricingSection plans={plans} founderSlots={founderSlots} trialDays={trialDays} />
        <FaqSection />
        <FinalCta trialDays={trialDays} />
      </main>

      <Footer />
    </div>
  );
}