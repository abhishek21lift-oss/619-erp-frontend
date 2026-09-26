'use client';
/**
 * Member — My forms.
 *
 * The health screening (PAR-Q) and informed consent the member completed with
 * their trainer. Read-only: both are signed documents, and a change is a new
 * form filled in at the studio, not an edit here.
 *
 * What is shown is what the member themselves declared, plus the risk level
 * it came to. The trainer's private notes are never returned by the API.
 * The consent PDF is served by /api/me/forms/consent/:id/pdf, which only
 * answers for the signed-in member's own consent.
 */

import { useEffect, useState } from 'react';
import { CheckCircle2, Download, FileSignature, HeartPulse, ShieldCheck } from 'lucide-react';
import Guard from '@/components/Guard';
import MemberShell from '@/components/member/MemberShell';
import {
  Card, EmptyState, LoadError, MC, PageSkeleton, PageTitle, Section, longDate,
} from '@/components/member/MemberUI';
import { api } from '@/lib/api';
import type { MeConsent, MeForms, MeParq } from '@/lib/api';
import { PARQ_QUESTIONS } from '@/lib/parq-calculations';
import { rgba } from '@/lib/palette';

export default function MemberFormsPage() {
  return (
    <Guard role="member">
      <MemberShell>
        <FormsBody />
      </MemberShell>
    </Guard>
  );
}

function FormsBody() {
  const [data, setData] = useState<MeForms | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api.me.forms().then((r) => setData(r.data)).catch(() => setFailed(true));
  }, []);

  const title = <PageTitle icon={<FileSignature size={20} />} title="My forms" sub="Health screening and consent" />;
  if (failed) return <>{title}<LoadError what="forms" /></>;
  if (!data) return <PageSkeleton />;

  return (
    <>
      {title}
      <Section title="Informed consent">
        {data.consent ? <ConsentCard c={data.consent} /> : (
          <EmptyState icon={<FileSignature size={18} />} title="No consent form yet"
            body="Your trainer will take you through it at the studio before your first session." />
        )}
      </Section>
      <Section title="Health screening (PAR-Q)">
        {data.parq ? <ParqCard p={data.parq} /> : (
          <EmptyState icon={<HeartPulse size={18} />} title="No health screening yet"
            body="Your trainer fills this in with you so your programme suits your health." />
        )}
      </Section>
    </>
  );
}

/** Status is a label with an icon, never colour alone. */
function Pill({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  const tone = ok ? MC.success : MC.warning;
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-[720]"
      style={{ background: rgba(tone, 0.12), color: 'var(--text-secondary)' }}>
      {ok ? <CheckCircle2 size={11} aria-hidden style={{ color: tone }} /> : <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: tone }} />}
      {children}
    </span>
  );
}

function Row({ k, v }: { k: string; v: string | null }) {
  if (!v) return null;
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-[12.5px]" style={{ color: MC.muted }}>{k}</span>
      <span className="text-right text-[12.5px] font-[700]" style={{ color: MC.ink }}>{v}</span>
    </div>
  );
}

function ConsentCard({ c }: { c: MeConsent }) {
  const complete = c.status === 'completed' || Boolean(c.completed_at);
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[14px] font-[780]" style={{ color: MC.ink }}>
          Informed consent{c.version ? ` · v${c.version}` : ''}
        </p>
        <Pill ok={complete}>{complete ? 'Signed' : 'Awaiting signatures'}</Pill>
      </div>
      <Row k="You signed" v={longDate(c.client_signed_at)} />
      <Row k="Trainer signed" v={longDate(c.trainer_signed_at)} />
      <Row k="Completed" v={longDate(c.completed_at)} />
      {c.has_pdf && (
        <a href={api.me.consentPdfUrl(c.id)} target="_blank" rel="noopener noreferrer"
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-[12px] text-[13.5px] font-[750]"
          style={{ background: rgba(MC.primary, 0.1), color: MC.primaryDeep }}>
          <Download size={15} aria-hidden /> Download signed PDF
        </a>
      )}
    </Card>
  );
}

const RISK_LABEL: Record<string, string> = {
  low: 'Low risk', moderate: 'Moderate risk', medium: 'Moderate risk', high: 'High risk',
};

function ParqCard({ p }: { p: MeParq }) {
  const answers = p.parq_answers ?? [];
  const yes = answers.filter((a) => a.answer === 'yes');
  const risk = p.risk_level ? (RISK_LABEL[p.risk_level.toLowerCase()] ?? p.risk_level) : null;
  const low = p.risk_level?.toLowerCase() === 'low';
  const text = (id: number) => PARQ_QUESTIONS.find((q) => q.id === id)?.text ?? `Question ${id}`;

  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[14px] font-[780]" style={{ color: MC.ink }}>
          Screening{p.assessment_date ? ` · ${longDate(p.assessment_date)}` : ''}
        </p>
        {risk && <Pill ok={low}>{risk}</Pill>}
      </div>
      {p.risk_message && <p className="mb-2 text-[12.5px] leading-relaxed" style={{ color: MC.muted }}>{p.risk_message}</p>}
      <Row k="Status" v={p.status === 'reviewed' ? 'Reviewed by your trainer' : p.status === 'submitted' ? 'Submitted' : 'In progress'} />
      <Row k="Questions answered" v={answers.length ? `${answers.filter((a) => a.answer).length} of ${PARQ_QUESTIONS.length}` : null} />

      {yes.length > 0 ? (
        <div className="mt-3 rounded-[12px] p-3" style={{ background: 'var(--bg-subtle)' }}>
          <p className="mb-2 text-[10px] font-[780] uppercase tracking-[0.12em]" style={{ color: MC.muted }}>
            You answered yes to
          </p>
          <ul className="space-y-2">
            {yes.map((a) => (
              <li key={a.question_id} className="text-[12.5px] leading-relaxed" style={{ color: MC.ink }}>
                {text(a.question_id)}
                {a.explanation && <span className="mt-0.5 block text-[12px]" style={{ color: MC.muted }}>{a.explanation}</span>}
              </li>
            ))}
          </ul>
        </div>
      ) : answers.length > 0 ? (
        <p className="mt-3 flex items-center gap-1.5 text-[12.5px] font-[650]" style={{ color: MC.ink }}>
          <ShieldCheck size={14} aria-hidden style={{ color: MC.success }} /> You answered no to every question.
        </p>
      ) : null}

      <p className="mt-3 text-[11.5px]" style={{ color: MC.muted }}>
        Health changed since? Tell your trainer before your next session.
      </p>
    </Card>
  );
}
