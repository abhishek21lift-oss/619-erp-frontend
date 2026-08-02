'use client';

// Everything you need to know about a client before writing them a programme.
//
// ── The problem ────────────────────────────────────────────────────────────
//
// Opening a client's Workout Plans used to show the STUDIO: total plans across
// every client, 200 library exercises, 11 clients, an average completion rate.
// None of it says anything about the person whose programme you came here to
// write, and everything that does — their clearance, their capacity, what
// their shoulder will not do, how much they sleep — is on six other screens
// nobody opens first.
//
// ── The order ──────────────────────────────────────────────────────────────
//
// Readiness, then limitations, then capacity, then recovery, then the goal.
// That is the order the answers change the programme: clearance decides
// whether to train them at all, limitations decide which movements exist,
// capacity decides loads, recovery decides volume, and the goal — which every
// trainer already knows — decides emphasis. It is deliberately not the order a
// marketing page would use, where the goal comes first.
//
// ── Gaps are content ───────────────────────────────────────────────────────
//
// A missing assessment gets a row of its own, saying so, with a link to go and
// do it. Leaving it out would make an unassessed client look like a clean one:
// "no injuries recorded" and "nobody has checked" render identically if you
// only draw what you have.

import { useEffect, useState } from 'react';
import { m } from 'framer-motion';
import {
  ShieldCheck, ShieldAlert, Activity, HeartPulse, Moon, Target, History,
  TriangleAlert, ChevronRight, Loader2, ClipboardList, Copy, Check,
} from 'lucide-react';
import { api } from '@/lib/api';
import type {
  TrainingBrief, BriefSectionBase, BriefLimitations, BriefReadiness,
  BriefLifestyle, BriefGoal, MobilityFinding,
} from '@/lib/api';
import { useToast } from '@/lib/toast';

const EASE = [0.16, 1, 0.3, 1] as const;

/* ── Reading the payload ─────────────────────────────────────────────────── */

const obj = (v: unknown): Record<string, unknown> | null =>
  (v && typeof v === 'object' && !Array.isArray(v)) ? v as Record<string, unknown> : null;
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? v as T[] : []);
const str = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);

/**
 * A brief that is safe to render.
 *
 * The render below walks about forty paths of the form
 * `sections.<name>.<field>`, and it used to walk them straight off the
 * response. One absent key — a section the server did not send, a `findings`
 * list from a build that predates it — threw a TypeError mid-render, and
 * because this panel is mounted under /pt-os that throw took the WHOLE
 * segment to its error boundary: "this part of the app failed to load". One
 * screen must never be able to do that to the rest of the module, so the
 * payload is made total once, here, and the render cannot throw afterwards.
 *
 * It fills SHAPE, never CONTENT. A section the server did not send comes back
 * `{ present: false }` — "nobody has checked" — and never an empty section
 * marked present. Inventing presence here would put the panel straight back
 * into the thing this whole file exists to prevent: making an unassessed
 * client look like a clean one.
 *
 * Returns null when the payload is not an object at all, which the caller
 * renders as an explicit failure rather than as a blank tab.
 */
export function normaliseBrief(raw: unknown): TrainingBrief | null {
  const b = obj(raw);
  if (!b) return null;
  const src = obj(b.sections) ?? {};

  const sec = <T extends BriefSectionBase>(key: string): T =>
    ((o) => (o && o.present === true ? o : { present: false }))(obj(src[key])) as unknown as T;

  const limitations = sec<BriefLimitations>('limitations');
  const posture = obj(limitations.posture);
  const mobility = obj(limitations.mobility);

  // The note columns are JSONB objects, not strings. The server flattens them
  // now, but it deploys separately — and this panel must not depend on which
  // side shipped first, because the failure mode is the whole segment.
  const readiness = sec<BriefReadiness>('readiness');
  const lifestyle = sec<BriefLifestyle>('lifestyle');
  const goalSec = sec<BriefGoal>('goal');

  const c = obj(b.client) ?? {};
  return {
    client: {
      id: str(c.id),
      name: str(c.name),
      gender: str(c.gender),
      age: typeof c.age === 'number' && Number.isFinite(c.age) ? c.age : null,
      goal: str(c.goal),
      notes: str(c.notes),
    },
    sections: {
      readiness: { ...readiness, notes: str(readiness.notes) },
      body: sec('body'),
      capacity: sec('capacity'),
      limitations: {
        ...limitations,
        injuries: str(limitations.injuries),
        // The only two nested lists the render walks. Everything else it
        // reads is a scalar, and a missing scalar already renders as "—".
        posture: posture ? { ...posture, issues: arr<string>(posture.issues), notes: str(posture.notes) } : null,
        mobility: mobility ? { ...mobility, findings: arr<MobilityFinding>(mobility.findings), notes: str(mobility.notes) } : null,
      } as BriefLimitations,
      lifestyle: { ...lifestyle, notes: str(lifestyle.notes) },
      goal: { ...goalSec, description: str(goalSec.description) },
      history: sec('history'),
    },
    missing: arr<unknown>(b.missing).filter((k): k is string => typeof k === 'string'),
    completeness_pct: typeof b.completeness_pct === 'number' && Number.isFinite(b.completeness_pct)
      ? b.completeness_pct : 0,
  };
}

/** Where a trainer goes to fill a gap. Keyed by the section the server names. */
const FILL: Record<string, { label: string; href: (id: string) => string }> = {
  readiness: { label: 'PAR-Q', href: (id) => `/pt-os/parq?client_id=${id}` },
  body: { label: 'Fitness test', href: (id) => `/pt-os/assessment?client_id=${id}` },
  capacity: { label: 'Fitness test', href: (id) => `/pt-os/assessment?client_id=${id}` },
  limitations: { label: 'Posture & mobility', href: (id) => `/pt-os/posture-assessment?client_id=${id}` },
  lifestyle: { label: 'Lifestyle', href: (id) => `/pt-os/lifestyle-assessment?client_id=${id}` },
  goal: { label: 'Goals', href: (id) => `/pt-os/goals?client_id=${id}` },
  history: { label: 'Assign a programme', href: (id) => `/pt-os/workout-plans?client_id=${id}` },
};

const SECTION_LABEL: Record<string, string> = {
  readiness: 'Medical clearance', body: 'Body composition', capacity: 'Fitness capacity',
  limitations: 'Posture & mobility', lifestyle: 'Lifestyle & recovery', goal: 'Goal', history: 'Current programme',
};

export interface TrainingBriefPanelProps {
  clientId: string;
  /** Rendered above the brief — the page owns the client's name. */
  onLoaded?: (brief: TrainingBrief) => void;
}

export default function TrainingBriefPanel({ clientId, onLoaded }: TrainingBriefPanelProps) {
  const { toast } = useToast();
  const [brief, setBrief] = useState<TrainingBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    api.pt.trainingBrief(clientId)
      .then(({ data }) => {
        if (cancelled) return;
        const b = normaliseBrief(data);
        if (!b) { setFailed(true); return; }
        setBrief(b);
        onLoaded?.(b);
      })
      .catch(() => {
        if (cancelled) return;
        setFailed(true);
        toast.error('Could not load this client\'s brief');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // onLoaded is a render-scoped callback; re-running on its identity would
    // refetch the brief on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, toast, attempt]);

  if (loading) {
    return (
      <div className="flex justify-center py-14">
        <Loader2 size={22} className="animate-spin" style={{ color: 'var(--brand)' }} />
      </div>
    );
  }

  // Said out loud, for the same reason a missing section is. Rendering nothing
  // here would read as "this client has no brief" when what happened is that
  // we could not fetch one.
  if (failed || !brief) {
    return (
      <div className="flex flex-col items-center gap-2.5 rounded-[18px] px-5 py-10 text-center"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <TriangleAlert size={20} style={{ color: '#d97706' }} />
        <p className="text-[12.5px] font-[750]" style={{ color: 'var(--text-primary)' }}>
          Could not load this client&apos;s brief
        </p>
        <p className="max-w-[38ch] text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
          Their assessments are still on file — this page could not read them just now.
        </p>
        <button
          type="button"
          onClick={() => setAttempt((n) => n + 1)}
          className="mt-1 flex h-[44px] items-center rounded-[12px] px-4 text-[11.5px] font-[720]"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--brand)' }}
        >
          Try again
        </button>
      </div>
    );
  }

  const s = brief.sections;
  const blocked = s.readiness.present && s.readiness.gate_status === 'blocked';

  /** The brief as text, for pasting into a chat with an AI or a colleague. */
  const copyBrief = async () => {
    try {
      await navigator.clipboard.writeText(briefAsText(brief));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy — your browser blocked clipboard access');
    }
  };

  return (
    <div className="space-y-3">
      {/* ── Completeness ──
          The first thing said, because it qualifies everything after it. */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[16px] px-4 py-3"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex min-w-0 items-center gap-2.5">
          <ClipboardList size={15} style={{ color: 'var(--brand)' }} />
          <div className="min-w-0">
            <p className="text-[12.5px] font-[750]" style={{ color: 'var(--text-primary)' }}>
              Training brief · {brief.completeness_pct}% complete
            </p>
            <p className="text-[10.5px]" style={{ color: 'var(--text-muted)' }}>
              {brief.missing.length === 0
                ? 'Every assessment is on file.'
                : `${brief.missing.length} assessment${brief.missing.length === 1 ? '' : 's'} not done yet.`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={copyBrief}
          className="flex h-[44px] items-center gap-1.5 rounded-[12px] px-3 text-[11.5px] font-[720]"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--brand)' }}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copied' : 'Copy for AI'}
        </button>
      </div>

      {/* ── Blocked ──
          A hard stop, not a card among cards. If the studio's own PAR-Q review
          says do not train this person, that outranks everything below it. */}
      {blocked && (
        <div className="flex items-start gap-2.5 rounded-[16px] px-4 py-3.5"
          style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.28)' }}>
          <ShieldAlert size={17} className="mt-0.5 shrink-0" style={{ color: '#dc2626' }} />
          <div>
            <p className="text-[12.5px] font-[780]" style={{ color: '#b91c1c' }}>Not cleared to train</p>
            <p className="mt-0.5 text-[11.5px]" style={{ color: '#b91c1c' }}>
              {s.readiness.risk_message || 'The PAR-Q review blocked training for this client.'}
            </p>
          </div>
        </div>
      )}

      {/* ── 1. Readiness ── */}
      <Card
        icon={<ShieldCheck size={14} />}
        tone={s.readiness.risk_level === 'high' ? '#dc2626' : '#059669'}
        title="Medical clearance"
        asOf={s.readiness.as_of}
        section="readiness"
        clientId={clientId}
        present={s.readiness.present}
      >
        <Row label="Risk level" value={cap(s.readiness.risk_level)} />
        <Row label="Flagged answers" value={s.readiness.flagged_answers != null ? String(s.readiness.flagged_answers) : null} />
        <Chips label="Current health" items={s.readiness.current_health ?? []} tone="#dc2626" emptyNote="Nothing flagged" />
        <Chips label="History" items={s.readiness.past_history ?? []} tone="#d97706" emptyNote="Nothing flagged" />
        <Note>{s.readiness.notes}</Note>
      </Card>

      {/* ── 2. Limitations ──
          Above capacity on purpose: what a body will not do decides which
          exercises exist, and there is no point choosing a load for a movement
          that is off the table. */}
      <Card
        icon={<TriangleAlert size={14} />}
        tone="#d97706"
        title="Movement limitations"
        asOf={s.limitations.posture?.as_of ?? s.limitations.mobility?.as_of ?? null}
        section="limitations"
        clientId={clientId}
        present={s.limitations.present}
      >
        {text(s.limitations.injuries) && (
          <div className="mb-2 rounded-[10px] px-3 py-2" style={{ background: 'rgba(217,119,6,0.09)' }}>
            <p className="text-[10px] font-[750] uppercase tracking-wide" style={{ color: '#b45309' }}>Injuries on file</p>
            <p className="mt-0.5 whitespace-pre-line text-[12px]" style={{ color: 'var(--text-primary)' }}>{text(s.limitations.injuries)}</p>
          </div>
        )}
        {s.limitations.mobility && (
          <>
            <Row label="Mobility" value={cap(s.limitations.mobility.category)} />
            {/* Pain and restriction are shown apart because they call for
                different changes: regress the movement, or remove it. */}
            {(s.limitations.mobility.findings ?? []).length === 0 ? (
              <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                No painful or restricted regions found.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {(s.limitations.mobility.findings ?? []).map((f) => (
                  <span key={f.region}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10.5px] font-[700]"
                    style={{
                      background: f.pain ? 'rgba(220,38,38,0.1)' : 'rgba(217,119,6,0.1)',
                      color: f.pain ? '#b91c1c' : '#b45309',
                    }}>
                    {f.region}
                    <span className="font-[600] opacity-80">
                      {f.pain && f.restriction ? 'pain + restricted' : f.pain ? 'pain' : 'restricted'}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </>
        )}
        {s.limitations.posture && (
          <Chips label="Posture" items={s.limitations.posture.issues} tone="#0067e0" emptyNote="Nothing flagged" />
        )}
        {s.limitations.has_asymmetry && <Row label="Asymmetry" value="Present — check left/right loading" />}
      </Card>

      {/* ── 3. Capacity ── */}
      <Card
        icon={<Activity size={14} />}
        tone="#0067e0"
        title="Fitness capacity"
        asOf={s.capacity.as_of}
        section="capacity"
        clientId={clientId}
        present={s.capacity.present}
      >
        <div className="grid grid-cols-2 gap-2">
          <ScoreTile label="Strength" score={s.capacity.strength?.score} category={s.capacity.strength?.category} />
          <ScoreTile label="Cardio" score={s.capacity.cardio?.score} category={s.capacity.cardio?.category} />
          <ScoreTile label="Endurance" score={s.capacity.endurance?.score} category={s.capacity.endurance?.category} />
          <ScoreTile label="Flexibility" score={s.capacity.flexibility?.score} category={s.capacity.flexibility?.category} />
        </div>
      </Card>

      {/* ── 4. Body ── */}
      <Card
        icon={<HeartPulse size={14} />}
        tone="#dc2626"
        title="Body & vitals"
        asOf={s.body.as_of}
        section="body"
        clientId={clientId}
        present={s.body.present}
      >
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
          <Row label="Weight" value={s.body.weight_kg != null ? `${s.body.weight_kg} kg` : null} />
          <Row label="Height" value={s.body.height_cm != null ? `${s.body.height_cm} cm` : null} />
          <Row label="BMI" value={s.body.bmi != null ? String(s.body.bmi) : null} />
          <Row label="Body fat" value={s.body.body_fat_pct != null ? `${s.body.body_fat_pct}%` : null} />
          <Row label="Resting HR" value={s.body.resting_hr != null ? `${s.body.resting_hr} bpm` : null} />
          <Row label="Blood pressure" value={s.body.bp ? `${s.body.bp}${s.body.bp_category ? ` · ${s.body.bp_category}` : ''}` : null} />
        </div>
      </Card>

      {/* ── 5. Lifestyle ── */}
      <Card
        icon={<Moon size={14} />}
        tone="#0067e0"
        title="Recovery capacity"
        asOf={s.lifestyle.as_of}
        section="lifestyle"
        clientId={clientId}
        present={s.lifestyle.present}
      >
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
          <Row label="Experience" value={cap(s.lifestyle.experience_level)} />
          <Row label="Sleep" value={s.lifestyle.sleep_hours != null ? `${s.lifestyle.sleep_hours} h · ${cap(s.lifestyle.sleep_quality) ?? '—'}` : null} />
          <Row label="Stress" value={cap(s.lifestyle.stress_level)} />
          <Row label="Occupation" value={cap(s.lifestyle.occupation_type)} />
          <Row label="Activity" value={cap(s.lifestyle.activity_level)} />
          <Row label="Recovery" value={cap(s.lifestyle.recovery_quality)} />
        </div>
        <Note>{s.lifestyle.notes}</Note>
      </Card>

      {/* ── 6. Goal ── */}
      <Card
        icon={<Target size={14} />}
        tone="#059669"
        title="Goal"
        asOf={s.goal.as_of}
        section="goal"
        clientId={clientId}
        present={s.goal.present}
      >
        <Row label="Primary" value={cap(s.goal.priority ?? s.goal.goal_type)} />
        <Row label="Target weight" value={s.goal.target_weight != null ? `${s.goal.target_weight} kg` : null} />
        <Row label="By" value={s.goal.target_date} />
        <Row label="Commitment" value={cap(s.goal.commitment_level)} />
        <Chips label="Challenges" items={s.goal.challenges ?? []} tone="#64748b" emptyNote="None recorded" />
        <Note>{s.goal.description}</Note>
      </Card>

      {/* ── 7. Current programme ── */}
      <Card
        icon={<History size={14} />}
        tone="#0059ce"
        title="Current programme"
        asOf={null}
        section="history"
        clientId={clientId}
        present={s.history.present}
      >
        <Row label="Plan" value={s.history.plan_name} />
        <Row label="Since" value={s.history.started_on} />
        <Row label="Days / week" value={s.history.days_per_week != null ? String(s.history.days_per_week) : null} />
        <Row
          label="Last 4 weeks"
          value={s.history.sessions_last_4_weeks != null
            ? `${s.history.completed_last_4_weeks} of ${s.history.sessions_last_4_weeks} sessions finished`
            : null}
        />
      </Card>
    </div>
  );
}

/**
 * One section.
 *
 * A section with no data does not disappear — it renders as a prompt to go and
 * collect it. That is the whole point: an unassessed client and a clean one
 * must not look the same.
 */
function Card({
  icon, tone, title, asOf, present, section, clientId, children,
}: {
  icon: React.ReactNode; tone: string; title: string; asOf?: string | null;
  present: boolean; section: string; clientId: string; children: React.ReactNode;
}) {
  const fill = FILL[section];
  return (
    <m.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, ease: EASE }}
      className="rounded-[18px] p-4"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px]"
            style={{ background: `${tone}18`, color: tone }}>{icon}</span>
          <span className="truncate text-[12.5px] font-[750]" style={{ color: 'var(--text-primary)' }}>{title}</span>
        </div>
        {present && asOf && (
          <span className="shrink-0 text-[10px] font-[650]" style={{ color: 'var(--text-muted)' }}>{asOf}</span>
        )}
      </div>

      {present ? (
        <div className="space-y-1.5">{children}</div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
            Not assessed — nothing is known here yet.
          </p>
          {fill && (
            <a href={fill.href(clientId)}
              className="flex h-[44px] items-center gap-1 rounded-[10px] px-3 text-[11px] font-[720]"
              style={{ color: tone }}>
              {fill.label} <ChevronRight size={12} />
            </a>
          )}
        </div>
      )}
    </m.div>
  );
}

function Row({ label, value }: { label: string; value?: unknown }) {
  // Same reason as Note: a text slot must never be handed an object.
  const shown = typeof value === 'string' ? value.trim()
    : typeof value === 'number' && Number.isFinite(value) ? String(value)
      : '';
  if (!shown) return null;
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="shrink-0 text-[11px] font-[600]" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="min-w-0 truncate text-right text-[12px] font-[700]" style={{ color: 'var(--text-primary)' }}>{shown}</span>
    </div>
  );
}

/**
 * A list of flags, or an explicit note that the list is empty.
 *
 * "Nothing flagged" is a finding. Rendering nothing at all would read the same
 * as the section never being filled in.
 */
function Chips({ label, items, tone, emptyNote }: { label: string; items?: string[] | null; tone: string; emptyNote: string }) {
  // Read rather than trusted. These lists come from JSONB columns that hold
  // three different shapes depending on which assessment screen wrote them,
  // and a string arriving where a list was expected has a `.length` but no
  // `.map` — which throws in the middle of a render.
  const list = (Array.isArray(items) ? items : []).filter((i) => typeof i === 'string');
  return (
    <div>
      <p className="mb-1 text-[10px] font-[700] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</p>
      {list.length === 0 ? (
        <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{emptyNote}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {list.map((i) => (
            <span key={i} className="rounded-full px-2 py-0.5 text-[10.5px] font-[700] capitalize"
              style={{ background: `${tone}16`, color: tone }}>{i}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/** A score never appears without the word that goes with it. */
function ScoreTile({ label, score, category }: { label: string; score?: number | null; category?: string | null }) {
  return (
    <div className="rounded-[12px] px-3 py-2" style={{ background: 'var(--bg-subtle)' }}>
      <p className="text-[10px] font-[700] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="mt-0.5 text-[15px] font-[820] tabular-nums" style={{ color: 'var(--text-primary)' }}>
        {score != null ? score : '—'}
      </p>
      {category && <p className="text-[10px] font-[650] capitalize" style={{ color: 'var(--text-muted)' }}>{category}</p>}
    </div>
  );
}

/**
 * Free text, and ONLY free text.
 *
 * These note fields are JSONB columns that hold an object with one field per
 * prompt on the assessment screen, not the strings the brief typed them as.
 * React throws on an object child — "Objects are not valid as a React child" —
 * in the middle of the render, which unwinds to the pt-os error boundary and
 * takes the whole segment down over one paragraph. The server flattens these
 * now; this is the second line, so that the next column to change shape
 * renders nothing instead of breaking the module.
 */
function Note({ children }: { children?: unknown }) {
  const text = typeof children === 'string' ? children.trim() : '';
  if (!text) return null;
  return (
    <p className="mt-1.5 whitespace-pre-line rounded-[10px] px-3 py-2 text-[11.5px] italic"
      style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>{text}</p>
  );
}

/** A string, or nothing — never an object on its way to a text slot. */
const text = (v: unknown): string | null =>
  (typeof v === 'string' && v.trim() ? v.trim() : null);

const cap = (v?: string | null) => (v ? String(v).replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) : null);

/**
 * The brief as plain text.
 *
 * For pasting into a conversation with a model, which is the case this page
 * was asked for. It carries the gaps too — a model handed a brief with silent
 * omissions will design against them as though they were clear.
 */
export function briefAsText(b: TrainingBrief): string {
  const L: string[] = [];
  /** Same reason as Chips: these lists come from JSONB of three shapes. */
  const list = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
  const c = b.client;
  L.push(`CLIENT: ${c.name ?? 'Unknown'}${c.age != null ? `, ${c.age}` : ''}${c.gender ? `, ${c.gender}` : ''}`);
  L.push(`Brief completeness: ${b.completeness_pct}%`);
  if (b.missing.length) {
    L.push(`NOT ASSESSED (do not assume these are clear): ${b.missing.map((k) => SECTION_LABEL[k] ?? k).join(', ')}`);
  }

  const s = b.sections;
  if (s.readiness.present) {
    L.push('', 'MEDICAL CLEARANCE');
    L.push(`- Risk level: ${s.readiness.risk_level ?? 'unknown'}`);
    if (s.readiness.gate_status) L.push(`- Gate: ${s.readiness.gate_status}`);
    L.push(`- Current health flags: ${list(s.readiness.current_health).join(', ') || 'none'}`);
    L.push(`- History flags: ${list(s.readiness.past_history).join(', ') || 'none'}`);
  }
  if (s.limitations.present) {
    L.push('', 'MOVEMENT LIMITATIONS');
    if (s.limitations.injuries) L.push(`- Injuries: ${s.limitations.injuries}`);
    for (const f of arr<MobilityFinding>(s.limitations.mobility?.findings)) {
      L.push(`- ${f.region}: ${[f.pain && 'pain', f.restriction && 'restricted'].filter(Boolean).join(' + ')}`);
    }
    const posture = list(s.limitations.posture?.issues);
    if (posture.length) L.push(`- Posture: ${posture.join(', ')}`);
  }
  if (s.capacity.present) {
    L.push('', 'CAPACITY (studio scores)');
    for (const [k, v] of Object.entries({
      Strength: s.capacity.strength, Cardio: s.capacity.cardio,
      Endurance: s.capacity.endurance, Flexibility: s.capacity.flexibility,
    })) {
      if (v?.score != null || v?.category) L.push(`- ${k}: ${v.score ?? '—'}${v.category ? ` (${v.category})` : ''}`);
    }
  }
  if (s.body.present) {
    L.push('', 'BODY');
    L.push(`- ${[s.body.weight_kg && `${s.body.weight_kg} kg`, s.body.height_cm && `${s.body.height_cm} cm`,
      s.body.bmi && `BMI ${s.body.bmi}`, s.body.body_fat_pct && `${s.body.body_fat_pct}% fat`]
      .filter(Boolean).join(', ') || 'no measurements'}`);
  }
  if (s.lifestyle.present) {
    L.push('', 'RECOVERY CAPACITY');
    L.push(`- Experience: ${s.lifestyle.experience_level ?? 'unknown'}`);
    L.push(`- Sleep: ${s.lifestyle.sleep_hours ?? '?'} h, quality ${s.lifestyle.sleep_quality ?? '?'}`);
    L.push(`- Stress: ${s.lifestyle.stress_level ?? '?'} · Occupation: ${s.lifestyle.occupation_type ?? '?'}`);
  }
  if (s.goal.present) {
    L.push('', 'GOAL');
    L.push(`- ${s.goal.priority ?? s.goal.goal_type ?? 'unspecified'}`);
    if (s.goal.target_weight) L.push(`- Target: ${s.goal.target_weight} kg by ${s.goal.target_date ?? 'no date'}`);
    const challenges = list(s.goal.challenges);
    if (challenges.length) L.push(`- Challenges: ${challenges.join(', ')}`);
  }
  if (s.history.present) {
    L.push('', 'CURRENT PROGRAMME');
    L.push(`- ${s.history.plan_name} since ${s.history.started_on}, ${s.history.days_per_week ?? '?'} days/week`);
    L.push(`- Last 4 weeks: ${s.history.completed_last_4_weeks} of ${s.history.sessions_last_4_weeks} sessions finished`);
  }
  return L.join('\n');
}
