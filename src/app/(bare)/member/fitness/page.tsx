'use client';
/**
 * Member — Fitness Testing.
 *
 * The member's own assessment results, read-only. Everything here was stored
 * by the trainer's scoring engine: the page divides each step by the
 * framework's denominator and asks `tierForScore` for a label, but it never
 * re-scores a test and has no control that writes anything.
 *
 * The six domains are the ones a member asked to see — body composition,
 * cardio, strength, endurance, flexibility, and the separate mobility
 * screening when one exists. History is the same list the trainer recorded;
 * two of those rows can be compared line by line from this page.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Activity, ClipboardCheck, Dumbbell, HeartPulse, Move, Repeat, TrendingUp,
} from 'lucide-react';
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import Guard from '@/components/Guard';
import MemberShell from '@/components/member/MemberShell';
import {
  Card, EmptyState, LoadError, MC, PageSkeleton, PageTitle, Section, longDate,
} from '@/components/member/MemberUI';
import BodyScoreMap from '@/components/member/fitness/BodyScoreMap';
import { assessmentLabel, domainsFrom, type DomainKey, type DomainScore } from '@/components/member/fitness/domains';
import { ProgressComparison } from '@/components/pt-os/fitness-testing/ProgressComparison';
import { api } from '@/lib/api';
import type { MeFitnessAssessment, MeFitnessHistory, MeMobilityAssessment } from '@/lib/api';
import { classifyBodyFat, scoreNum, type FitnessTier, type Gender } from '@/lib/fitness-calculations';

const DOMAIN_ICONS: Record<DomainKey, LucideIcon> = {
  body: Activity,
  cardio: HeartPulse,
  strength: Dumbbell,
  endurance: Repeat,
  flexibility: Move,
  mobility: TrendingUp,
};

const TIER_STYLE: Record<FitnessTier, { background: string; color: string }> = {
  Optimal: { background: 'var(--success-bg)', color: 'var(--success-text)' },
  Fit: { background: 'var(--brand-soft)', color: 'var(--brand)' },
  Moderate: { background: 'var(--warning-bg)', color: 'var(--warning-text)' },
  'Needs Attention': { background: 'var(--danger-bg)', color: 'var(--danger-text)' },
};

function TierPill({ tier, fallback }: { tier: FitnessTier | null; fallback?: string }) {
  if (!tier) {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-[740]"
        style={{ background: 'var(--bg-subtle)', color: MC.muted }}>
        {fallback ?? 'Not measured'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-[740]" style={TIER_STYLE[tier]}>
      {tier}
    </span>
  );
}

/** "12 Mar 2026" for an axis tick; the raw date stays in the tooltip. */
function shortDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function TrendChart({ points, unit }: { points: { date: string; label: string; value: number }[]; unit: string }) {
  const summary = points.map((p) => `${p.label}: ${p.value}${unit}`).join(', ');
  return (
    <div className="h-[190px] w-full" role="img" aria-label={`Trend. ${summary}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: -14 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: MC.muted }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: MC.muted }} axisLine={false} tickLine={false} width={38} />
          <Tooltip
            contentStyle={{
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: 10, fontSize: 12, color: 'var(--text-primary)',
            }}
            formatter={(value) => [`${value}${unit}`, '']}
          />
          <Line
            type="monotone" dataKey="value" stroke={MC.primary} strokeWidth={2}
            dot={{ r: 3, fill: MC.primary }} isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Two or three measured values from the stored row; nothing is inferred. */
function detailLines(key: DomainKey, a: MeFitnessAssessment, gender: string | null, mobility: MeMobilityAssessment | null): string[] {
  const n = scoreNum;
  switch (key) {
    case 'body': {
      const fat = n(a.body_fat_pct);
      const fatBand = classifyBodyFat(fat, gender as Gender | null);
      return [
        fat == null ? null : `${fat}% body fat${fatBand ? ` · ${fatBand}` : ''}`,
        n(a.muscle_mass_pct) == null ? null : `${n(a.muscle_mass_pct)}% muscle mass`,
        n(a.visceral_fat) == null ? null : `Visceral fat ${n(a.visceral_fat)}`,
      ].filter((v): v is string => Boolean(v));
    }
    case 'cardio':
      return [
        n(a.vo2_max) == null ? null : `VO₂ max ${n(a.vo2_max)} mL/kg/min`,
        a.cardio_category,
        a.cardio_test_type,
      ].filter((v): v is string => Boolean(v));
    case 'strength': {
      const lifts = [a.strength_exercise, a.strength_exercise_2].filter(Boolean).join(' · ');
      return [lifts || null, a.strength_category, a.strength_category_2]
        .filter((v): v is string => Boolean(v));
    }
    case 'endurance': {
      const tests = [a.endurance_test_type, a.endurance_test_type_2].filter(Boolean).join(' · ');
      return [tests || null, a.endurance_category, a.endurance_category_2]
        .filter((v): v is string => Boolean(v));
    }
    case 'flexibility':
      return [
        a.flexibility_category,
        a.flexibility_category_2,
        a.has_asymmetry ? 'Asymmetry noted' : null,
      ].filter((v): v is string => Boolean(v));
    case 'mobility':
      return mobility
        ? [mobility.mobility_category, longDate(mobility.assessment_date)]
            .filter((v): v is string => Boolean(v))
        : [];
    default:
      return [];
  }
}

function DomainCard({ domain, lines }: { domain: DomainScore; lines: string[] }) {
  const Icon = DOMAIN_ICONS[domain.key];
  return (
    <Card className="p-3.5">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[9px]"
          style={{ background: 'var(--brand-soft)', color: MC.primary }}>
          <Icon size={14} strokeWidth={2} />
        </span>
        <p className="min-w-0 truncate text-[12px] font-[740]" style={{ color: MC.ink }}>{domain.label}</p>
      </div>

      <p className="mt-3 text-[19px] font-[830] leading-none tabular-nums tracking-[-0.02em]"
        style={{ color: domain.points == null ? MC.muted : MC.ink }}>
        {domain.points == null ? '—' : `${domain.points} / ${domain.max}`}
      </p>
      <div className="mt-2 flex items-center gap-2">
        <TierPill tier={domain.tier} />
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full" aria-hidden
        style={{ background: 'var(--border)' }}>
        {domain.pct != null && (
          <div className="h-full rounded-full"
            style={{ width: `${Math.min(100, Math.max(0, domain.pct))}%`, background: MC.primary }} />
        )}
      </div>

      {lines.length > 0 && (
        <ul className="mt-3 space-y-0.5">
          {lines.map((line) => (
            <li key={line} className="truncate text-[11px] leading-snug" style={{ color: MC.muted }}>{line}</li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function FitnessBody() {
  const [data, setData] = useState<MeFitnessHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compareA, setCompareA] = useState<string | null>(null);
  const [compareB, setCompareB] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await api.me.fitnessTests();
      const next = res.data;
      setData(next);
      setSelectedId(next.assessments[0]?.id ?? null);
      setCompareA(next.assessments[next.assessments.length - 1]?.id ?? null);
      setCompareB(next.assessments[0]?.id ?? null);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const assessments = useMemo(() => data?.assessments ?? [], [data]);
  const selected = assessments.find((a) => a.id === selectedId) ?? assessments[0];
  const mobility = data?.latest_mobility ?? null;
  const domains = useMemo(
    () => (selected ? domainsFrom(selected, mobility) : []),
    [selected, mobility],
  );

  const overall = selected ? scoreNum(selected.overall_fitness_score) : null;
  const overallMax = selected ? scoreNum(selected.overall_max) : null;

  // Chronological, one reading per test. A partial battery still plots: the
  // stored overall score is a percentage, and the history row says "Partial".
  const scoreTrend = useMemo(
    () => assessments
      .filter((a) => scoreNum(a.overall_fitness_score) != null && a.assessment_date)
      .map((a) => ({
        date: a.assessment_date as string,
        label: shortDate(a.assessment_date as string),
        value: scoreNum(a.overall_fitness_score) as number,
      }))
      .reverse(),
    [assessments],
  );

  const bodyFatTrend = useMemo(
    () => assessments
      .filter((a) => scoreNum(a.body_fat_pct) != null && a.assessment_date)
      .map((a) => ({
        date: a.assessment_date as string,
        label: shortDate(a.assessment_date as string),
        value: scoreNum(a.body_fat_pct) as number,
      }))
      .reverse(),
    [assessments],
  );

  const first = assessments.find((a) => a.id === compareA);
  const second = assessments.find((a) => a.id === compareB);
  const canCompare = Boolean(first && second && first.id !== second.id);

  return (
    <>
      <PageTitle
        accent="progress"
        icon={<ClipboardCheck size={20} />}
        title="Fitness testing"
        sub={selected?.assessment_date ? `Latest test ${longDate(selected.assessment_date)}` : 'Your results, explained'}
      />

      {loading ? (
        <PageSkeleton />
      ) : failed ? (
        <LoadError what="fitness results" onRetry={() => void load()} />
      ) : assessments.length === 0 || !selected ? (
        <EmptyState
          icon={<ClipboardCheck size={20} />}
          title="No fitness test yet"
          body="Your first seven-step assessment is your baseline. Your trainer records it at the studio, and the results appear here."
        />
      ) : (
        <>
          <Section title="Latest result" aside={<TierPill tier={selected.tier} fallback={overallMax === 100 ? undefined : 'Partial test'} />}>
            <Card>
              <div className="grid gap-5 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="text-[10px] font-[760] uppercase tracking-[0.09em]" style={{ color: MC.muted }}>
                    Overall fitness score
                  </p>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-[44px] font-[860] leading-none tabular-nums tracking-[-0.04em]" style={{ color: MC.ink }}>
                      {overall ?? '—'}
                    </span>
                    <span className="text-[15px] font-[700]" style={{ color: MC.muted }}>/ 100</span>
                  </div>
                  <p className="mt-2 text-[12px]" style={{ color: MC.muted }}>
                    {assessmentLabel(selected.assessment_type)}
                    {selected.assessment_date ? ` · ${longDate(selected.assessment_date)}` : ''}
                    {overallMax != null && overallMax !== 100 ? ` · measured on ${overallMax}/100` : ''}
                  </p>
                  <p className="mt-3 max-w-[300px] text-[11.5px] leading-relaxed" style={{ color: MC.muted }}>
                    {selected.tier
                      ? 'Optimal 85+ · Fit 70–84 · Moderate 50–69 · Needs attention below 50.'
                      : 'This test was incomplete, so it has no overall category. The domains below show what was measured.'}
                  </p>
                </div>
                <BodyScoreMap domains={domains} />
              </div>
            </Card>
          </Section>

          <Section title="Your six domains">
            <div className="grid grid-cols-1 gap-2.5 min-[400px]:grid-cols-2 sm:grid-cols-3">
              {domains.map((d) => (
                <DomainCard key={d.key} domain={d} lines={detailLines(d.key, selected, data?.client?.gender ?? null, mobility)} />
              ))}
            </div>
          </Section>

          {scoreTrend.length >= 2 && (
            <Section title="Overall score over time">
              <Card className="px-2 pb-2 pt-3">
                <TrendChart points={scoreTrend} unit="/100" />
              </Card>
            </Section>
          )}

          {bodyFatTrend.length >= 2 && (
            <Section title="Body fat over time">
              <Card className="px-2 pb-2 pt-3">
                <TrendChart points={bodyFatTrend} unit="%" />
              </Card>
            </Section>
          )}

          {assessments.length >= 2 && (
            <Section title="Compare two tests">
              <Card className="p-4">
                <div className="grid grid-cols-2 gap-2">
                  <label className="min-w-0">
                    <span className="mb-1 block text-[10px] font-[740] uppercase tracking-[0.08em]" style={{ color: MC.muted }}>
                      First test
                    </span>
                    <select
                      value={compareA ?? ''}
                      onChange={(e) => setCompareA(e.target.value)}
                      className="min-h-[44px] w-full rounded-[12px] px-2 text-[12px] font-[650]"
                      style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: MC.ink }}
                    >
                      {assessments.map((a) => (
                        <option key={a.id} value={a.id}>
                          {longDate(a.assessment_date) ?? '—'} · {assessmentLabel(a.assessment_type)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="min-w-0">
                    <span className="mb-1 block text-[10px] font-[740] uppercase tracking-[0.08em]" style={{ color: MC.muted }}>
                      Second test
                    </span>
                    <select
                      value={compareB ?? ''}
                      onChange={(e) => setCompareB(e.target.value)}
                      className="min-h-[44px] w-full rounded-[12px] px-2 text-[12px] font-[650]"
                      style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: MC.ink }}
                    >
                      {assessments.map((a) => (
                        <option key={a.id} value={a.id}>
                          {longDate(a.assessment_date) ?? '—'} · {assessmentLabel(a.assessment_type)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {!canCompare && (
                  <p className="mt-2 text-[11.5px]" style={{ color: MC.muted }}>
                    Choose two different tests to compare them.
                  </p>
                )}
              </Card>
              {canCompare && first && second && (
                <div className="mt-2.5">
                  <ProgressComparison initial={first as unknown as Record<string, unknown>} latest={second as unknown as Record<string, unknown>} />
                </div>
              )}
            </Section>
          )}

          <Section title="Assessment history">
            <Card>
              {assessments.map((a, i, arr) => {
                const score = scoreNum(a.overall_fitness_score);
                const active = a.id === selected.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setSelectedId(a.id)}
                    aria-pressed={active}
                    className="flex min-h-[52px] w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[var(--bg-hover)]"
                    style={{
                      borderBottom: i === arr.length - 1 ? undefined : '1px solid var(--border)',
                      background: active ? 'var(--brand-soft)' : undefined,
                    }}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[12.5px] font-[700]" style={{ color: MC.ink }}>
                        {longDate(a.assessment_date) ?? 'Date not recorded'}
                      </span>
                      <span className="block truncate text-[11px]" style={{ color: MC.muted }}>
                        {assessmentLabel(a.assessment_type)} · {a.tier ?? (score == null ? 'No score' : 'Partial test')}
                      </span>
                    </span>
                    <span className="shrink-0 text-[14px] font-[800] tabular-nums" style={{ color: MC.ink }}>
                      {score == null ? '—' : `${score}/100`}
                    </span>
                  </button>
                );
              })}
            </Card>
          </Section>

          <p className="mb-2 px-1 text-[11px] leading-relaxed" style={{ color: MC.muted }}>
            Your trainer records these tests at the studio. This page is a read-only view of what they measured.
          </p>
        </>
      )}
    </>
  );
}

export default function MemberFitnessPage() {
  return (
    <Guard role="member">
      <MemberShell>
        <FitnessBody />
      </MemberShell>
    </Guard>
  );
}
