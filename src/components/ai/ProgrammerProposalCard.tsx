'use client';

/**
 * ProgrammerProposalCard — displays a programmer agent proposal for
 * trainer review. Shows current state, deterministic recommendation,
 * AI recommendation (when they differ), evidence, safety flags, and
 * confidence.
 *
 * Actions: Approve, Reject. Warns on stale/expired/safety-flagged proposals.
 */

import { useState } from 'react';
import {
  Dumbbell, Check, X, AlertTriangle, Clock, Shield, ChevronDown, ChevronUp,
  Loader2, Scale, Sparkles, RefreshCw,
} from 'lucide-react';
import type { AiProgrammerProposal } from '@/lib/api';

const ACCENT = '#0067E0';
const ACCENT_DIM = 'rgba(0,103,224,0.10)';

const PROPOSAL_LABELS: Record<string, string> = {
  progress_load: 'Progress Load',
  regress_load: 'Regress Load',
  change_rep_range: 'Change Rep Range',
  adjust_sets: 'Adjust Sets',
  exercise_substitution: 'Exercise Substitution',
  volume_adjustment: 'Volume Adjustment',
  intensity_adjustment: 'Intensity Adjustment',
  deload: 'Deload',
  recovery_based_modification: 'Recovery-Based Modification',
  explain_progression: 'Explain Progression',
};

interface Props {
  proposal: AiProgrammerProposal;
  onApprove: (id: string, execute?: boolean) => Promise<void>;
  onReject: (id: string, reason?: string) => Promise<void>;
  onReverse?: (id: string, reason?: string) => Promise<void>;
  /** Whether execution is available (proposal has a target exercise). */
  executable?: boolean;
}

function EvidenceBadge({ evidence }: { evidence: AiProgrammerProposal['evidence'] }) {
  if (!evidence || evidence.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {evidence.slice(0, 5).map((e, i) => (
        <span key={i} className="rounded-full px-2.5 py-1 text-[10px] font-[650]"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
          title={`${e.source}: ${e.value}`}>
          {e.type}: {e.description.slice(0, 40)}{e.description.length > 40 ? '…' : ''}
        </span>
      ))}
      {evidence.length > 5 && (
        <span className="text-[10px] font-[600]" style={{ color: 'var(--text-disabled)' }}>
          +{evidence.length - 5} more
        </span>
      )}
    </div>
  );
}

export default function ProgrammerProposalCard({ proposal, onApprove, onReject, onReverse, executable = true }: Props) {
  const [acting, setActing] = useState<'approve' | 'reject' | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const confidencePct = Math.round((proposal.confidence ?? 0) * 100);
  const isExpired = proposal.expires_at && new Date(proposal.expires_at).getTime() <= Date.now();
  const hasSafetyFlags = proposal.safety_flags && proposal.safety_flags.length > 0;

  // Check if AI and deterministic recommendations differ
  const hasDisagreement =
    proposal.ai_recommendation &&
    proposal.deterministic_recommendation &&
    Object.keys(proposal.deterministic_recommendation).length > 0 &&
    JSON.stringify(proposal.ai_recommendation) !== JSON.stringify(proposal.deterministic_recommendation);

  const [executing, setExecuting] = useState(false);

  const handleApprove = async (applyChange = false) => {
    if (acting) return;
    setActing('approve');
    setError(null);
    try {
      await onApprove(proposal.id, applyChange);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to approve';
      if (msg.includes('stale') || msg.includes('changed since')) {
        setError('Client data changed since this proposal was created. Please regenerate.');
      } else {
        setError(msg);
      }
    } finally {
      setActing(null);
    }
  };

  const handleReject = async () => {
    if (acting) return;
    setActing('reject');
    setError(null);
    try {
      await onReject(proposal.id, rejectReason || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject');
    } finally {
      setActing(null);
    }
  };

  // Undo state
  const [showUndoConfirm, setShowUndoConfirm] = useState(false);
  const [undoReason, setUndoReason] = useState('');

  const handleReverse = async () => {
    if (acting || !onReverse) return;
    setActing('reverse');
    setError(null);
    try {
      await onReverse(proposal.id, undoReason || undefined);
      setShowUndoConfirm(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to reverse';
      if (msg.includes('EXECUTION_STATE_CHANGED') || msg.includes('changed since')) {
        setError('Training data has changed since this action was applied. It was not reversed.');
      } else if (msg.includes('ALREADY_REVERSED') || msg.includes('already reversed')) {
        setError('Already reversed');
      } else {
        setError(msg);
      }
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="overflow-hidden rounded-[18px]"
      style={{
        background: 'var(--bg-card)',
        border: hasSafetyFlags
          ? '1px solid rgba(245,158,11,0.4)'
          : '1px solid var(--border)',
      }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px]"
          style={{ background: hasDisagreement ? 'rgba(245,158,11,0.12)' : ACCENT_DIM }}>
          {hasDisagreement
            ? <Scale size={15} color="#B45309" />
            : <Dumbbell size={15} color={ACCENT} />}
        </span>
        <div className="min-w-0 flex-1">
          <span className="text-[13px] font-[750]" style={{ color: 'var(--text-primary)' }}>
            {PROPOSAL_LABELS[proposal.proposal_type] ?? proposal.proposal_type}
          </span>
          {proposal.status !== 'draft' && (
            <span className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-[700]"
              style={{
                background: proposal.status === 'approved' ? 'rgba(16,185,129,0.12)' : 'rgba(220,38,38,0.1)',
                color: proposal.status === 'approved' ? '#059669' : '#dc2626',
              }}>
              {proposal.status}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasSafetyFlags && (
            <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-[700]"
              style={{ background: 'rgba(245,158,11,0.12)', color: '#B45309' }}>
              <Shield size={10} /> {proposal.safety_flags.length}
            </span>
          )}
          <span className="text-[11px] font-[700] tabular-nums"
            style={{ color: confidencePct >= 80 ? '#059669' : confidencePct >= 60 ? '#d97706' : '#dc2626' }}>
            {confidencePct}%
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        <p className="text-[14px] font-[650] leading-relaxed" style={{ color: 'var(--text-primary)' }}>
          {proposal.summary}
        </p>

        <p className="mt-2 text-[12.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {proposal.reason}
        </p>

        {/* Disagreement banner */}
        {hasDisagreement && (
          <div className="mt-3 rounded-[12px] px-4 py-3"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <p className="flex items-center gap-1.5 text-[12px] font-[700]" style={{ color: '#B45309' }}>
              <Scale size={13} /> AI and deterministic recommendations differ — requires your review
            </p>
            <div className="mt-2.5 grid grid-cols-2 gap-3">
              <div className="rounded-[10px] px-3 py-2.5" style={{ background: 'rgba(5,150,105,0.06)', border: '1px solid rgba(5,150,105,0.2)' }}>
                <p className="text-[10px] font-[700] uppercase tracking-wide" style={{ color: '#059669' }}>
                  Deterministic
                </p>
                <pre className="mt-1 text-[11.5px] font-[600] whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
                  {JSON.stringify(proposal.deterministic_recommendation, null, 2)}
                </pre>
              </div>
              <div className="rounded-[10px] px-3 py-2.5" style={{ background: 'rgba(0,103,224,0.06)', border: '1px solid rgba(0,103,224,0.2)' }}>
                <p className="text-[10px] font-[700] uppercase tracking-wide" style={{ color: ACCENT }}>
                  AI Recommendation
                </p>
                <pre className="mt-1 text-[11.5px] font-[600] whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
                  {JSON.stringify(proposal.ai_recommendation, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Expandable evidence + state */}
        <button type="button" onClick={() => setExpanded(!expanded)}
          className="mt-3 flex items-center gap-1.5 text-[11px] font-[700]"
          style={{ color: ACCENT }}>
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? 'Hide details' : 'View evidence & state'}
        </button>

        {expanded && (
          <div className="mt-2.5 space-y-3">
            {/* Evidence */}
            {proposal.evidence && proposal.evidence.length > 0 && (
              <div>
                <p className="text-[10px] font-[700] uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-disabled)' }}>
                  Evidence
                </p>
                <EvidenceBadge evidence={proposal.evidence} />
              </div>
            )}

            {/* Safety flags */}
            {hasSafetyFlags && (
              <div className="rounded-[12px] px-3.5 py-2.5"
                style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
                <p className="flex items-center gap-1.5 text-[11px] font-[700]" style={{ color: '#B45309' }}>
                  <AlertTriangle size={12} /> Safety Flags
                </p>
                <ul className="mt-1 space-y-0.5">
                  {proposal.safety_flags.map((flag, i) => (
                    <li key={i} className="text-[11px] font-[600]" style={{ color: '#92400e' }}>
                      • {flag}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Current state */}
            {proposal.current_state && Object.keys(proposal.current_state).length > 0 && (
              <div>
                <p className="text-[10px] font-[700] uppercase tracking-wide mb-1" style={{ color: 'var(--text-disabled)' }}>
                  Current State
                </p>
                <pre className="rounded-[10px] px-3 py-2 text-[11px] font-[600] whitespace-pre-wrap overflow-x-auto"
                  style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                  {JSON.stringify(proposal.current_state, null, 2)}
                </pre>
              </div>
            )}

            {/* Deterministic recommendation (when no disagreement display) */}
            {!hasDisagreement && proposal.deterministic_recommendation && Object.keys(proposal.deterministic_recommendation).length > 0 && (
              <div>
                <p className="text-[10px] font-[700] uppercase tracking-wide mb-1" style={{ color: 'var(--text-disabled)' }}>
                  Recommendation
                </p>
                <pre className="rounded-[10px] px-3 py-2 text-[11px] font-[600] whitespace-pre-wrap overflow-x-auto"
                  style={{ background: 'rgba(5,150,105,0.04)', border: '1px solid rgba(5,150,105,0.15)', color: 'var(--text-primary)' }}>
                  {JSON.stringify(proposal.deterministic_recommendation, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Expiry warning */}
        {isExpired && (
          <div className="mt-3 flex items-center gap-2 rounded-[10px] px-3 py-2"
            style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)' }}>
            <Clock size={12} color="#dc2626" />
            <span className="text-[11px] font-[700]" style={{ color: '#dc2626' }}>
              Proposal expired — needs regeneration
            </span>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="mt-3 rounded-[12px] px-3 py-2 text-[12px] font-[600]"
            style={{ background: 'rgba(239,68,68,0.08)', color: '#dc2626' }}>
            {error}
          </p>
        )}

        {/* Reject form */}
        {showReject && (
          <div className="mt-3">
            <textarea
              rows={2}
              placeholder="Reason for rejection (optional)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full rounded-[10px] px-3 py-2 text-[12px] font-[560] outline-none resize-none"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
        )}
      </div>

      {/* Actions */}
      {proposal.status === 'draft' && (
        <div className="flex gap-2 px-5 pb-4">
          {showReject ? (
            <>
              <button type="button" onClick={() => { setShowReject(false); setRejectReason(''); }}
                disabled={!!acting || isExpired}
                className="h-[36px] flex-1 rounded-[10px] text-[12px] font-[700]"
                style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                Cancel
              </button>
              <button type="button" onClick={handleReject} disabled={!!acting || isExpired}
                className="flex h-[36px] flex-1 items-center justify-center gap-1.5 rounded-[10px] text-[12px] font-[700] text-white"
                style={{ background: '#dc2626' }}>
                {acting === 'reject' ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                Reject Proposal
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setShowReject(true)}
                disabled={!!acting || isExpired}
                className="flex h-[36px] flex-1 items-center justify-center gap-1.5 rounded-[10px] text-[12px] font-[700]"
                style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                <X size={12} /> Reject
              </button>
              <button type="button" onClick={() => handleApprove(false)} disabled={!!acting || isExpired}
                className="flex h-[36px] flex-1 items-center justify-center gap-1.5 rounded-[10px] text-[12px] font-[700]"
                style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                {acting === 'approve' ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                Approve
              </button>
              <button type="button" onClick={() => handleApprove(true)} disabled={!!acting || isExpired}
                className="flex h-[36px] flex-[1.2] items-center justify-center gap-1.5 rounded-[10px] text-[12px] font-[750] text-white transition-all"
                style={{
                  background: isExpired ? '#94a3b8' : 'linear-gradient(135deg, #059669, #047857)',
                  boxShadow: isExpired ? 'none' : '0 4px 14px rgba(5,150,105,0.3)',
                  cursor: isExpired ? 'not-allowed' : 'pointer',
                }}>
                {acting === 'approve' ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                {isExpired ? 'Expired' : 'Approve & Apply'}
              </button>
            </>
          )}
        </div>
      )}

      {/* Already processed */}
      {proposal.status !== 'draft' && (
        <div className="px-5 pb-4">
          <div className="flex items-center gap-2 rounded-[10px] px-3 py-2"
            style={{
              background: proposal.status === 'executed' ? 'rgba(16,185,129,0.06)'
                : proposal.status === 'reversed' ? 'rgba(245,158,11,0.06)'
                : proposal.status === 'approved' ? 'rgba(16,185,129,0.06)'
                : 'rgba(220,38,38,0.04)',
              border: `1px solid ${proposal.status === 'executed' ? 'rgba(16,185,129,0.2)'
                : proposal.status === 'reversed' ? 'rgba(245,158,11,0.2)'
                : proposal.status === 'approved' ? 'rgba(16,185,129,0.2)'
                : 'rgba(220,38,38,0.15)'}`,
            }}>
            {proposal.status === 'executed' ? (
              <Sparkles size={13} color="#059669" />
            ) : proposal.status === 'reversed' ? (
              <RefreshCw size={13} color="#B45309" />
            ) : proposal.status === 'approved' ? (
              <Check size={13} color="#059669" />
            ) : (
              <X size={13} color="#dc2626" />
            )}
            <span className="text-[12px] font-[650] flex-1"
              style={{ color: proposal.status === 'executed' ? '#059669'
                : proposal.status === 'reversed' ? '#B45309'
                : proposal.status === 'approved' ? '#059669' : '#dc2626' }}>
              {proposal.status === 'executed'
                ? 'Applied successfully'
                : proposal.status === 'reversed'
                  ? 'Reversed'
                  : proposal.status === 'approved'
                    ? 'Approved — pending training-system execution'
                    : `Rejected${proposal.rejection_reason ? `: ${proposal.rejection_reason}` : ''}`}
            </span>
            {/* Undo button for executed proposals */}
            {proposal.status === 'executed' && onReverse && !showUndoConfirm && (
              <button type="button" onClick={() => setShowUndoConfirm(true)}
                className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-[700] transition-colors"
                style={{ background: 'rgba(245,158,11,0.1)', color: '#B45309' }}>
                <RefreshCw size={10} /> Undo
              </button>
            )}
          </div>

          {/* Undo confirmation dialog */}
          {showUndoConfirm && (
            <div className="mt-3 rounded-[12px] px-4 py-3.5"
              style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)' }}>
              <p className="text-[12px] font-[700]" style={{ color: '#B45309' }}>
                Reverse this training change?
              </p>
              <p className="mt-1 text-[11.5px] font-[560]" style={{ color: '#92400e' }}>
                This will restore the exact previous state. This action cannot be undone.
              </p>
              <textarea
                rows={2}
                placeholder="Reason for reversal (optional)"
                value={undoReason}
                onChange={(e) => setUndoReason(e.target.value)}
                className="mt-2 w-full rounded-[10px] px-3 py-2 text-[11.5px] font-[560] outline-none resize-none"
                style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(245,158,11,0.3)', color: 'var(--text-primary)' }}
              />
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => { setShowUndoConfirm(false); setUndoReason(''); }}
                  disabled={!!acting}
                  className="h-[32px] flex-1 rounded-[8px] text-[11px] font-[700]"
                  style={{ background: 'rgba(255,255,255,0.6)', color: 'var(--text-muted)' }}>
                  Cancel
                </button>
                <button type="button" onClick={handleReverse} disabled={!!acting}
                  className="flex h-[32px] flex-[1.2] items-center justify-center gap-1.5 rounded-[8px] text-[11px] font-[700] text-white"
                  style={{ background: '#B45309' }}>
                  {acting === 'reverse' ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                  {acting === 'reverse' ? 'Reversing…' : 'Confirm Undo'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
