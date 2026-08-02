'use client';
/**
 * The consent record, once a client has one.
 *
 * This screen used to be a name, a "Completed" pill, "Version 1" and three
 * buttons, above two-thirds of an empty viewport. Everything that makes an
 * informed consent worth keeping — who signed it, when, what they agreed to,
 * the medical answers, the audit trail captured at signing — was already on
 * the record and none of it was shown. The one way to read any of it was to
 * download the PDF.
 *
 * So this is not a restyle. The layout changed because there is now something
 * to lay out.
 *
 * Order is deliberate: identity, then the signatures (the thing that makes the
 * document binding), then what was agreed, then medical flags, then the audit
 * trail, then history. Anything conditional renders nothing when absent rather
 * than an empty shell — a client with no medical flags should see no medical
 * section, not "None".
 */
import { useState } from 'react';
import Link from 'next/link';
import { m, useReducedMotion } from 'framer-motion';
import {
  AlertTriangle, ArrowLeft, Check, ChevronDown, Clock, Download, FileSignature,
  FileText, History, Plus, Printer, ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { fmtDate } from '@/lib/format';
import {
  BRAND_BLUE_LABEL, BRAND_GRADIENT, BRAND_HERO_GRADIENT, BRAND_HERO_SHADOW,
  ON_BRAND_BORDER, ON_BRAND_TEXT,
} from '@/lib/brand';
import type { InformedConsent } from '@/lib/api';
import { statusStyle } from './statusConfig';
import { FINAL_ACK_FIELDS } from './types';

/** Total acknowledgements the wizard collects, for the "N of M" summary. */
const TOTAL_ACKNOWLEDGEMENTS = 10;

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[20px] p-5 sm:p-6 ${className}`}
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ icon, children, hint }: { icon: React.ReactNode; children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <span style={{ color: 'var(--text-disabled)' }}>{icon}</span>
      <h2 className="text-[11px] font-[700] uppercase tracking-[0.09em]" style={{ color: 'var(--text-disabled)' }}>
        {children}
      </h2>
      {hint && (
        <span className="ml-auto text-[11.5px] font-[600] tabular-nums" style={{ color: 'var(--text-disabled)' }}>
          {hint}
        </span>
      )}
    </div>
  );
}

/**
 * One signatory. A consent is only binding once the right people have signed,
 * so an unsigned party is shown as explicitly outstanding rather than omitted
 * — a missing row reads as "not required", which is the wrong message.
 */
function Signatory({ role, name, signedAt, signature }: {
  role: string; name?: string | null; signedAt?: string | null; signature?: string | null;
}) {
  const signed = Boolean(signature && signedAt);
  return (
    <div
      className="flex items-center gap-3 rounded-[14px] px-3.5 py-3"
      style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
    >
      <div
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
        style={{
          background: signed ? 'rgba(16,185,129,0.14)' : 'rgba(148,163,184,0.16)',
          color: signed ? '#059669' : '#94a3b8',
        }}
      >
        {/* Icon as well as colour: status must not be carried by hue alone. */}
        {signed ? <Check size={16} strokeWidth={3} /> : <Clock size={15} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-[700] uppercase tracking-[0.07em]" style={{ color: 'var(--text-disabled)' }}>
          {role}
        </p>
        {/* The trainer signature carries no name on the record, so a signed
            party without one says what is actually known rather than 'Signed',
            which reads oddly beside the date immediately to its right. */}
        <p className="truncate text-[13.5px] font-[650]" style={{ color: 'var(--text-primary)' }}>
          {name?.trim() || (signed ? 'Signature on file' : 'Awaiting signature')}
        </p>
      </div>
      {signed && (
        <span className="flex-shrink-0 text-[12px] font-[600] tabular-nums" style={{ color: 'var(--text-muted)' }}>
          {fmtDate(signedAt)}
        </span>
      )}
    </div>
  );
}

/** A label/value line in the audit trail. Values are tabular — they are IPs, */
/*  dates and device strings, and ragged digits look like a bug.             */
function AuditRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="flex-shrink-0 text-[12px]" style={{ color: 'var(--text-disabled)' }}>{label}</span>
      <span className="truncate text-right text-[12.5px] font-[600] tabular-nums" style={{ color: 'var(--text-muted)' }}>
        {value}
      </span>
    </div>
  );
}

interface ConsentSummaryProps {
  clientName: string;
  record: InformedConsent;
  /** Every version on file, newest first. Used for the history section. */
  history: InformedConsent[];
  onAmend: () => void;
  onContinue: () => void;
  onDownload: () => void;
  onPrint: () => void;
}

export default function ConsentSummary({
  clientName, record, history, onAmend, onContinue, onDownload, onPrint,
}: ConsentSummaryProps) {
  const reduce = useReducedMotion();
  const [showAcks, setShowAcks] = useState(false);

  const style = statusStyle(record.status);
  const isCompleted = record.status === 'completed';
  const isRevoked = record.status === 'revoked';
  const inProgress = !isCompleted && !isRevoked && record.status !== 'archived' && record.status !== 'expired';

  const agreed = Object.values(record.acknowledgements ?? {}).filter(Boolean).length;
  const allAgreed = agreed >= TOTAL_ACKNOWLEDGEMENTS;

  const hasMedicalFlag = Boolean(
    record.physician_advised_against || record.medical_condition ||
    record.physician_name || record.medical_clearance_file_url,
  );
  const priorVersions = history.filter((h) => h.id !== record.id);

  // One transition, reused, so the sections read as one movement rather than
  // several. Disabled wholesale under prefers-reduced-motion.
  const enter = (i: number) => (reduce
    ? {}
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.28, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] as const },
      });

  return (
    <div className="mx-auto w-full max-w-3xl pt-3 pb-10 space-y-4">
      {/* Back out to the picker. The page had no way back at all — the only
          exits were the browser control and the global nav. */}
      <Link
        href="/pt-os/informed-consent"
        className="inline-flex items-center gap-1.5 rounded-[10px] py-2 pr-3 text-[13px] font-[600] transition-colors hover:opacity-80"
        style={{ color: 'var(--text-muted)' }}
      >
        <ArrowLeft size={15} /> All clients
      </Link>

      {/* Identity. Same brand-blue banner as the client picker this page is
          reached through, so arriving here reads as going deeper, not
          sideways. Both draw from lib/brand, so they cannot drift apart. */}
      <m.div
        {...enter(0)}
        className="rounded-[20px] px-5 py-5 sm:px-6"
        style={{ background: BRAND_HERO_GRADIENT, boxShadow: BRAND_HERO_SHADOW }}
      >
        <div className="flex items-start gap-3.5">
          <div
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[14px]"
            style={{ border: `1.5px solid ${ON_BRAND_BORDER}` }}
          >
            <FileSignature size={20} color="#fff" />
          </div>
          <div className="min-w-0 flex-1">
            {/* Pure white, like everything else on the banner. See lib/brand:
                no translucent white clears 4.5:1 at the gradient's bright end,
                so hierarchy here is size and weight only. */}
            <p className="text-[11px] font-[700] uppercase tracking-[0.09em]" style={{ color: ON_BRAND_TEXT }}>
              Informed Consent
            </p>
            <h1 className="mt-0.5 text-[24px] sm:text-[30px] font-[860] leading-[1.1] tracking-[-0.03em]" style={{ color: ON_BRAND_TEXT }}>
              {clientName}
            </h1>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-[700]"
                style={{ background: style.bg, color: style.color }}
              >
                {isCompleted ? <ShieldCheck size={12} /> : isRevoked ? <AlertTriangle size={12} /> : <Clock size={12} />}
                {style.label}
              </span>
              {/* Version and signing date are one span, not two: as separate
                  flex children the separator wraps onto its own line on a
                  narrow phone and reads as a stray bullet. */}
              <span className="text-[11.5px] font-[600] tabular-nums" style={{ color: ON_BRAND_TEXT }}>
                Version {record.version}
                {record.completed_at && ` · Signed ${fmtDate(record.completed_at)}`}
              </span>
            </div>
          </div>
        </div>
      </m.div>

      {/* Actions. One primary — reading the document — with the rest secondary.
          Previously Download and Amend competed at the same weight. */}
      <m.div {...enter(1)} className="flex flex-wrap gap-2.5">
        {inProgress ? (
          <Button onClick={onContinue} style={{ background: BRAND_GRADIENT, color: '#fff' }}>
            Continue signing
          </Button>
        ) : isRevoked ? (
          // A revoked consent needs replacing, and the banner below says so.
          // Saying it without offering the action is how a dead end is built.
          <Button iconLeft={<Plus size={14} />} onClick={onAmend} style={{ background: BRAND_GRADIENT, color: '#fff' }}>
            Start new consent
          </Button>
        ) : (
          <Button iconLeft={<Download size={14} />} disabled={!record.pdf_url} onClick={onDownload}>
            Download PDF
          </Button>
        )}
        {isRevoked && (
          <Button variant="outline" iconLeft={<Download size={14} />} disabled={!record.pdf_url} onClick={onDownload}>
            Download PDF
          </Button>
        )}
        {isCompleted && (
          <Button variant="outline" iconLeft={<Printer size={14} />} disabled={!record.pdf_url} onClick={onPrint}>
            Print
          </Button>
        )}
        {isCompleted && (
          <Button variant="outline" onClick={onAmend}>Amend / New Version</Button>
        )}
      </m.div>

      {isRevoked && (
        <m.div {...enter(2)}>
          <Card className="!border-red-200">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} style={{ color: '#dc2626', flexShrink: 0, marginTop: 1 }} />
              <div>
                <p className="text-[13.5px] font-[700]" style={{ color: '#dc2626' }}>This consent was revoked</p>
                <p className="mt-1 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
                  It is no longer valid for training. Start a new consent before the client&apos;s next session.
                </p>
              </div>
            </div>
          </Card>
        </m.div>
      )}

      {/* Signatures — the substance of the document, and the first thing anyone
          checking a consent actually needs to see. */}
      <m.div {...enter(2)}>
        <Card>
          <SectionTitle icon={<FileSignature size={13} />}>Signatures</SectionTitle>
          <div className="grid gap-2.5">
            <Signatory
              role="Client" name={record.full_name}
              signedAt={record.client_signed_at} signature={record.client_signature}
            />
            <Signatory
              role="Trainer" signedAt={record.trainer_signed_at} signature={record.trainer_signature}
            />
            {(record.witness_signature || record.witness_name) && (
              <Signatory
                role="Witness" name={record.witness_name}
                signedAt={record.witness_signed_at} signature={record.witness_signature}
              />
            )}
          </div>
          {record.exercise_consent_signed_at && (
            <p className="mt-3 text-[12px]" style={{ color: 'var(--text-disabled)' }}>
              Exercise programme consent signed {fmtDate(record.exercise_consent_signed_at)}
            </p>
          )}
        </Card>
      </m.div>

      {/* What was agreed. Collapsed by default — the full legal wording is long,
          and the count answers the question most of the time. */}
      <m.div {...enter(3)}>
        <Card>
          <SectionTitle icon={<Check size={13} />} hint={`${agreed} of ${TOTAL_ACKNOWLEDGEMENTS}`}>
            Acknowledgements
          </SectionTitle>
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
              style={{
                background: allAgreed ? 'rgba(16,185,129,0.14)' : 'rgba(245,158,11,0.14)',
                color: allAgreed ? '#059669' : '#d97706',
              }}
            >
              {allAgreed ? <Check size={15} strokeWidth={3} /> : <AlertTriangle size={14} />}
            </div>
            <p className="text-[13.5px] font-[650]" style={{ color: 'var(--text-primary)' }}>
              {allAgreed
                ? 'All declarations accepted'
                : `${TOTAL_ACKNOWLEDGEMENTS - agreed} declaration${TOTAL_ACKNOWLEDGEMENTS - agreed === 1 ? '' : 's'} outstanding`}
            </p>
          </div>

          <button
            onClick={() => setShowAcks((v) => !v)}
            aria-expanded={showAcks}
            className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 text-[12.5px] font-[650] transition-colors hover:opacity-80"
            style={{ color: 'var(--text-muted)' }}
          >
            <ChevronDown
              size={14}
              style={{ transform: showAcks ? 'rotate(180deg)' : 'none', transition: reduce ? 'none' : 'transform 200ms' }}
            />
            {showAcks ? 'Hide final declarations' : 'Read final declarations'}
          </button>

          {showAcks && (
            <ul className="mt-2 space-y-2.5">
              {FINAL_ACK_FIELDS.map((f) => {
                const ok = Boolean(record.acknowledgements?.[f.key]);
                return (
                  <li key={f.key} className="flex gap-2.5">
                    <span className="mt-0.5 flex-shrink-0" style={{ color: ok ? '#059669' : '#94a3b8' }}>
                      {ok ? <Check size={14} strokeWidth={3} /> : <Clock size={13} />}
                    </span>
                    <span className="text-[12.5px] leading-[1.55]" style={{ color: 'var(--text-muted)' }}>
                      {f.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </m.div>

      {/* Medical. Rendered only when there is something to say — a client with
          no flags should see no section, not a card reading "None". */}
      {hasMedicalFlag && (
        <m.div {...enter(4)}>
          <Card>
            <SectionTitle icon={<AlertTriangle size={13} />}>Medical</SectionTitle>
            {record.physician_advised_against && (
              <div
                className="mb-3 flex items-start gap-2.5 rounded-[12px] px-3 py-2.5"
                style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)' }}
              >
                <AlertTriangle size={15} style={{ color: '#dc2626', flexShrink: 0, marginTop: 1 }} />
                <p className="text-[12.5px] font-[650]" style={{ color: '#dc2626' }}>
                  A physician has advised against physical activity for this client.
                </p>
              </div>
            )}
            <div className="space-y-1">
              <AuditRow label="Condition" value={record.medical_condition} />
              <AuditRow label="Physician" value={record.physician_name} />
              <AuditRow label="Hospital" value={record.hospital} />
            </div>
            {record.medical_clearance_file_url && (
              <a
                href={record.medical_clearance_file_url}
                target="_blank" rel="noopener noreferrer"
                className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 text-[12.5px] font-[650]"
                style={{ color: BRAND_BLUE_LABEL }}
              >
                <FileText size={14} /> Medical clearance document
              </a>
            )}
          </Card>
        </m.div>
      )}

      {/* Provenance. On a signed legal record this is the point — it is what
          distinguishes a consent from a form someone typed into. */}
      {(record.ip_address || record.device || record.browser || record.completed_at) && (
        <m.div {...enter(5)}>
          <Card>
            <SectionTitle icon={<ShieldCheck size={13} />}>Audit trail</SectionTitle>
            <div className="space-y-0.5">
              <AuditRow label="Completed" value={record.completed_at ? fmtDate(record.completed_at) : null} />
              <AuditRow label="Created" value={fmtDate(record.created_at)} />
              <AuditRow label="IP address" value={record.ip_address} />
              <AuditRow label="Device" value={record.device} />
              <AuditRow label="Browser" value={record.browser} />
            </div>
          </Card>
        </m.div>
      )}

      {/* Earlier versions. The list call already returned these and the page
          discarded everything but the newest — so an amended consent looked
          like it had never been amended. */}
      {priorVersions.length > 0 && (
        <m.div {...enter(6)}>
          <Card>
            <SectionTitle icon={<History size={13} />} hint={`${priorVersions.length} earlier`}>
              Version history
            </SectionTitle>
            <div className="space-y-2">
              {priorVersions.map((v) => {
                const vs = statusStyle(v.status);
                return (
                  <div
                    key={v.id}
                    className="flex items-center gap-3 rounded-[12px] px-3.5 py-2.5"
                    style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
                  >
                    <span className="text-[12.5px] font-[700] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                      v{v.version}
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10.5px] font-[700]"
                      style={{ background: vs.bg, color: vs.color }}
                    >
                      {vs.label}
                    </span>
                    <span className="ml-auto text-[12px] font-[600] tabular-nums" style={{ color: 'var(--text-disabled)' }}>
                      {fmtDate(v.completed_at || v.created_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </m.div>
      )}
    </div>
  );
}
