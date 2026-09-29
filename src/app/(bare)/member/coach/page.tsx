'use client';
/**
 * Member — Your coach.
 *
 * The trainer's profile as they wrote it on My Profile: photo and banner, what
 * they do, how long they have done it, their story, specialisations,
 * certifications, achievements, education, when they coach and where they
 * have coached. Read-only — it is the coach's page, shown to their client.
 *
 * Every section is left out when the coach left it empty. A member reading
 * "No certifications" would take it as a fact about the coach, when all it
 * means is that nothing has been typed in yet.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { m } from 'framer-motion';
import {
  Award, BadgeCheck, BookOpen, Briefcase, CalendarClock, ChevronLeft, Clock, Dumbbell, GraduationCap,
  Languages, MapPin, Medal, MessageCircle, Mic, Newspaper, Quote, Sparkles, Star, Trophy, UserRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Guard from '@/components/Guard';
import MemberShell from '@/components/member/MemberShell';
import { Card, EASE, LoadError, MC, PageSkeleton, Section } from '@/components/member/MemberUI';
import { CoachRing, coachRole } from '@/components/member/CoachCard';
import StudioMark from '@/components/StudioMark';
import { api } from '@/lib/api';
import type { MeCoach } from '@/lib/api';
import { rgba } from '@/lib/palette';
import { accentGradient, heroMesh, spectrum } from '@/components/member/memberTheme';
import type { Accent } from '@/components/member/memberTheme';

export default function MemberCoachPage() {
  return (
    <Guard role="member">
      <MemberShell>
        <CoachBody />
      </MemberShell>
    </Guard>
  );
}

const MODE_LABELS: Record<string, string> = {
  online: 'Online', offline: 'In person', hybrid: 'Hybrid', home: 'Home visits', video: 'Video calls',
};

const DAYS: [string, string][] = [
  ['mon', 'Mon'], ['tue', 'Tue'], ['wed', 'Wed'], ['thu', 'Thu'], ['fri', 'Fri'], ['sat', 'Sat'], ['sun', 'Sun'],
];

const KIND: Record<string, { icon: LucideIcon; accent: Accent }> = {
  competition: { icon: Trophy, accent: 'checkin' },
  record: { icon: Medal, accent: 'records' },
  award: { icon: Award, accent: 'plan' },
  certification: { icon: BadgeCheck, accent: 'diet' },
  speaking: { icon: Mic, accent: 'progress' },
  media: { icon: Newspaper, accent: 'studio' },
  publication: { icon: BookOpen, accent: 'workout' },
  other: { icon: Star, accent: 'plan' },
};

/** "09:00" → "9 AM", "17:30" → "5:30 PM". */
function clock(t: string): string {
  const [h, mm] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return mm ? `${hr}:${String(mm).padStart(2, '0')} ${suffix}` : `${hr} ${suffix}`;
}

/** "2021-04" → "Apr 2021". */
function month(v: string | null): string | null {
  if (!v) return null;
  const d = new Date(`${v}-01T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

function CoachBody() {
  const [coach, setCoach] = useState<MeCoach | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api.me.coach().then((r) => setCoach(r.data)).catch(() => setFailed(true));
  }, []);

  if (failed) return <><Back /><LoadError what="your coach" /></>;
  if (!coach) return <PageSkeleton />;

  const hours = DAYS.filter(([k]) => (coach.working_hours[k] ?? []).length > 0);
  const weeklyHours = Math.round((coach.weekly_minutes / 60) * 10) / 10;
  const story = [
    { label: 'About', text: coach.bio, icon: UserRound, accent: 'workout' as Accent },
    { label: 'Philosophy', text: coach.philosophy, icon: Quote, accent: 'records' as Accent },
    { label: 'How I train', text: coach.training_style, icon: Dumbbell, accent: 'checkin' as Accent },
  ].filter((x) => x.text);

  return (
    <>
      <Back />
      <Hero coach={coach} />

      <m.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE, delay: 0.08 }}
        className="mb-5 grid grid-cols-3 gap-2.5">
        <StatTile icon={Clock} accent="checkin" label="Years coaching" value={coach.years_experience ? String(coach.years_experience) : '—'} />
        <StatTile icon={Award} accent="diet" label="Certifications" value={String(coach.certifications.length)} />
        <StatTile icon={CalendarClock} accent="progress" label="Hours a week" value={weeklyHours > 0 ? String(weeklyHours) : '—'} />
      </m.div>

      {story.map((s) => (
        <Section key={s.label} title={s.label}>
          <Card className="p-4">
            <div className="flex gap-3">
              <Tile icon={s.icon} accent={s.accent} />
              <p className="min-w-0 flex-1 whitespace-pre-line text-[14px] leading-relaxed" style={{ color: MC.ink }}>{s.text}</p>
            </div>
          </Card>
        </Section>
      ))}

      {coach.specialisations.length > 0 && (
        <Section title="Specialisations">
          <div className="flex flex-wrap gap-2">
            {coach.specialisations.map((sp, i) => {
              const a = (['plan', 'workout', 'checkin', 'diet', 'progress', 'records'] as Accent[])[i % 6];
              return (
                <span key={sp} className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-[750] text-white"
                  style={{ background: accentGradient(a) }}>
                  <Sparkles size={13} aria-hidden /> {sp}
                </span>
              );
            })}
          </div>
        </Section>
      )}

      {coach.certifications.length > 0 && (
        <Section title="Certifications">
          <Card>
            {coach.certifications.map((c, i, arr) => (
              <div key={c.id} className="flex min-h-[60px] items-center gap-3 px-4 py-3"
                style={i === arr.length - 1 ? undefined : { borderBottom: '1px solid var(--border)' }}>
                <Tile icon={BadgeCheck} accent="diet" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-[750]" style={{ color: MC.ink }}>{c.name}</span>
                  {c.issuer && <span className="block truncate text-[12px]" style={{ color: MC.muted }}>{c.issuer}</span>}
                </span>
              </div>
            ))}
          </Card>
        </Section>
      )}

      {coach.achievements.length > 0 && (
        <Section title="Achievements">
          <Card className="p-4">
            <ol className="relative space-y-4">
              {coach.achievements.map((a, i, arr) => {
                const k = KIND[a.kind] ?? KIND.other;
                return (
                  <li key={a.id} className="relative flex gap-3">
                    {i < arr.length - 1 && (
                      <span aria-hidden className="absolute left-[17px] top-10 h-[calc(100%-16px)] w-[2px] rounded-full"
                        style={{ background: rgba(spectrum.violet[500], 0.18) }} />
                    )}
                    <Tile icon={k.icon} accent={k.accent} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-[760]" style={{ color: MC.ink }}>{a.title}</span>
                      {(a.issuer || a.year) && (
                        <span className="block text-[12px] font-[600]" style={{ color: MC.muted }}>
                          {[a.issuer, a.year].filter(Boolean).join(' · ')}
                        </span>
                      )}
                      {a.detail && <span className="mt-1 block whitespace-pre-line text-[13px] leading-relaxed" style={{ color: MC.ink }}>{a.detail}</span>}
                    </span>
                  </li>
                );
              })}
            </ol>
          </Card>
        </Section>
      )}

      {(coach.coaching_modes.length > 0 || coach.languages.length > 0) && (
        <Section title="How we can train">
          <Card className="space-y-3 p-4">
            {coach.coaching_modes.length > 0 && (
              <Facts icon={Dumbbell} accent="workout" label="Sessions" items={coach.coaching_modes.map((m) => MODE_LABELS[m] ?? m)} />
            )}
            {coach.languages.length > 0 && (
              <Facts icon={Languages} accent="studio" label="Languages" items={coach.languages} />
            )}
          </Card>
        </Section>
      )}

      {hours.length > 0 && (
        <Section title="When I coach">
          <Card>
            {hours.map(([k, label], i, arr) => (
              <div key={k} className="flex min-h-[48px] items-center gap-3 px-4 py-2.5"
                style={i === arr.length - 1 ? undefined : { borderBottom: '1px solid var(--border)' }}>
                <span className="w-10 text-[13px] font-[800]" style={{ color: MC.ink }}>{label}</span>
                <span className="flex min-w-0 flex-1 flex-wrap justify-end gap-1.5">
                  {coach.working_hours[k].map((r) => (
                    <span key={`${r.from}-${r.to}`} className="rounded-full px-2.5 py-1 text-[12px] font-[700] tabular-nums"
                      style={{ background: rgba(spectrum.indigo[500], 0.14), color: MC.ink }}>
                      {clock(r.from)} – {clock(r.to)}
                    </span>
                  ))}
                </span>
              </div>
            ))}
          </Card>
        </Section>
      )}

      {coach.education.length > 0 && (
        <Section title="Education">
          <Card>
            {coach.education.map((e, i, arr) => (
              <div key={e.id} className="flex min-h-[60px] items-center gap-3 px-4 py-3"
                style={i === arr.length - 1 ? undefined : { borderBottom: '1px solid var(--border)' }}>
                <Tile icon={GraduationCap} accent="progress" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-[750]" style={{ color: MC.ink }}>
                    {[e.degree, e.field].filter(Boolean).join(', ') || e.institution}
                  </span>
                  <span className="block truncate text-[12px]" style={{ color: MC.muted }}>
                    {[e.degree || e.field ? e.institution : null, e.year].filter(Boolean).join(' · ')}
                  </span>
                </span>
              </div>
            ))}
          </Card>
        </Section>
      )}

      {coach.previous_gyms.length > 0 && (
        <Section title="Where I've coached">
          <Card>
            {coach.previous_gyms.map((g, i, arr) => (
              <div key={g.id} className="flex min-h-[60px] items-center gap-3 px-4 py-3"
                style={i === arr.length - 1 ? undefined : { borderBottom: '1px solid var(--border)' }}>
                <Tile icon={Briefcase} accent="plan" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-[750]" style={{ color: MC.ink }}>{g.name}</span>
                  <span className="block truncate text-[12px]" style={{ color: MC.muted }}>
                    {[g.role, [month(g.from), g.to ? month(g.to) : g.from ? 'now' : null].filter(Boolean).join(' – ')].filter(Boolean).join(' · ')}
                  </span>
                </span>
              </div>
            ))}
          </Card>
        </Section>
      )}

      <Link href="/member/messages"
        className="mb-2 flex h-12 w-full items-center justify-center gap-2 rounded-[16px] text-[14px] font-[800] text-white transition-transform active:scale-[0.99]"
        style={{ background: accentGradient('plan'), boxShadow: `0 12px 26px -14px ${rgba(spectrum.pink[500], 0.75)}` }}>
        <MessageCircle size={16} aria-hidden /> Message {coach.name.split(' ')[0] || 'your coach'}
      </Link>
    </>
  );
}

function Back() {
  return (
    <Link href="/member/more" className="-ml-1 mb-3 inline-flex min-h-[44px] items-center gap-0.5 pr-3 text-[14px] font-[700]"
      style={{ color: MC.primary }}>
      <ChevronLeft size={18} aria-hidden /> Profile
    </Link>
  );
}

function Hero({ coach }: { coach: MeCoach }) {
  return (
    <m.section
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE }}
      aria-label="Coach"
      className="relative mb-4 overflow-hidden rounded-[26px]"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: `0 24px 48px -28px ${rgba(heroMesh.shadow, 0.7)}` }}
    >
      <div className="relative h-32 w-full" style={{
        background: [
          `radial-gradient(circle 200px at 10% 120%, ${rgba(heroMesh.glowA, 0.55)}, transparent 70%)`,
          `radial-gradient(circle 200px at 100% -20%, ${rgba(heroMesh.glowB, 0.5)}, transparent 70%)`,
          heroMesh.base,
        ].join(', '),
      }}>
        {coach.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coach.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        {coach.studio_name && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-[11.5px] font-[750] text-white"
            style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.25)' }}>
            <StudioMark name={coach.studio_name} logoUrl={coach.studio_logo} size={22} radius={11} background="#FFFFFF" />
            {coach.studio_name}
          </span>
        )}
      </div>
      <div className="px-4 pb-5">
        <div className="relative z-[1] -mt-12 mb-2">
          <CoachRing coach={coach} size={96} />
        </div>
        <h1 className="text-[24px] font-[850] leading-tight tracking-[-0.025em]" style={{ color: MC.ink }}>{coach.name}</h1>
        <p className="mt-0.5 text-[14px] font-[650]" style={{ color: spectrum.violet[600] }}>{coachRole(coach)}</p>
        {coach.location && (
          <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px] font-[600]" style={{ color: MC.muted }}>
            <MapPin size={13} aria-hidden /> {coach.location}
          </p>
        )}
      </div>
    </m.section>
  );
}

function Tile({ icon: Icon, accent }: { icon: LucideIcon; accent: Accent }) {
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] text-white" style={{ background: accentGradient(accent) }}>
      <Icon size={17} aria-hidden />
    </span>
  );
}

function StatTile({ icon: Icon, accent, label, value }: { icon: LucideIcon; accent: Accent; label: string; value: string }) {
  return (
    <div className="rounded-[18px] p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <span className="mb-2 grid h-8 w-8 place-items-center rounded-[10px] text-white" style={{ background: accentGradient(accent) }}>
        <Icon size={15} aria-hidden />
      </span>
      <p className="text-[20px] font-[840] leading-none tabular-nums tracking-[-0.02em]" style={{ color: MC.ink }}>{value}</p>
      <p className="mt-1 text-[11px] font-[650]" style={{ color: MC.muted }}>{label}</p>
    </div>
  );
}

function Facts({ icon, accent, label, items }: { icon: LucideIcon; accent: Accent; label: string; items: string[] }) {
  return (
    <div className="flex items-start gap-3">
      <Tile icon={icon} accent={accent} />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-[700]" style={{ color: MC.muted }}>{label}</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {items.map((x) => (
            <span key={x} className="rounded-full px-2.5 py-1 text-[12.5px] font-[700]"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: MC.ink }}>{x}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
