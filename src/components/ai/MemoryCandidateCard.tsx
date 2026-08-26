'use client';

/**
 * MemoryCandidateCard — displays an AI-extracted candidate memory for
 * trainer review. Shows the proposed fact, category, confidence, source,
 * and any conflicts with existing active memories.
 *
 * Actions: Confirm → active, Reject → deleted.
 */

import { useState } from 'react';
import { Brain, Check, X, AlertTriangle, Clock, Shield, Loader2 } from 'lucide-react';
import type { AiMemoryCandidate } from '@/lib/api';

const ACCENT = '#0067E0';
const ACCENT_DIM = 'rgba(0,103,224,0.10)';

const CATEGORY_COLORS: Record<string, string> = {
  preference: '#6366f1',
  constraint: '#dc2626',
  observation: '#059669',
  goal: '#d97706',
  medical: '#dc2626',
  schedule: '#7c3aed',
  equipment: '#0891b2',
};

const SOURCE_LABELS: Record<string, string> = {
  ai_detected: 'AI Detected',
  trainer_confirmed: 'Trainer Confirmed',
  client_reported: 'Client Reported',
  db_derived: 'Database',
  assessment: 'Assessment',
  system_observed: 'System',
  conversation: 'Conversation',
};

interface Props {
  memory: AiMemoryCandidate;
  onConfirm: (id: string) => Promise<void>;
  onReject: (id: string, reason?: string) => Promise<void>;
  compact?: boolean;
}

export default function MemoryCandidateCard({ memory, onConfirm, onReject, compact }: Props) {
  const [acting, setActing] = useState<'confirm' | 'reject' | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const catColor = CATEGORY_COLORS[memory.category] ?? '#64748b';

  const handleConfirm = async () => {
    if (acting) return;
    setActing('confirm');
    setError(null);
    try {
      await onConfirm(memory.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm');
    } finally {
      setActing(null);
    }
  };

  const handleReject = async () => {
    if (acting) return;
    setActing('reject');
    setError(null);
    try {
      await onReject(memory.id, rejectReason || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject');
    } finally {
      setActing(null);
    }
  };

  const confidencePct = Math.round((memory.confidence ?? 0) * 100);
  const hasConflicts = memory._conflicts && memory._conflicts.length > 0;

  if (compact) {
    return (
      <div className="flex items-start gap-3 rounded-[14px] px-3.5 py-3"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[8px]"
          style={{ background: ACCENT_DIM }}>
          <Brain size={14} color={ACCENT} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-[650] leading-snug" style={{ color: 'var(--text-primary)' }}>
            {memory.fact}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span className="rounded-full px-2 py-0.5 text-[10px] font-[700]"
              style={{ background: `${catColor}18`, color: catColor }}>
              {memory.category}
            </span>
            <span className="text-[10.5px] font-[600]" style={{ color: 'var(--text-disabled)' }}>
              {confidencePct}%
            </span>
          </div>
        </div>
        <button type="button" onClick={handleConfirm} disabled={!!acting}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full transition-colors"
          style={{ background: 'rgba(16,185,129,0.12)', color: '#059669' }}
          aria-label="Confirm memory">
          {acting === 'confirm' ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[18px]"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px]"
          style={{ background: ACCENT_DIM }}>
          <Brain size={15} color={ACCENT} />
        </span>
        <div className="min-w-0 flex-1">
          <span className="rounded-full px-2.5 py-0.5 text-[10.5px] font-[700] uppercase tracking-wide"
            style={{ background: `${catColor}18`, color: catColor }}>
            {memory.category}
          </span>
          {memory.subcategory && (
            <span className="ml-1.5 rounded-full px-2 py-0.5 text-[10px] font-[600]"
              style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
              {memory.subcategory}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-[700] tabular-nums"
            style={{ color: confidencePct >= 80 ? '#059669' : confidencePct >= 60 ? '#d97706' : '#dc2626' }}>
            {confidencePct}%
          </span>
          <span className="text-[10px] font-[600]" style={{ color: 'var(--text-disabled)' }}>conf</span>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        <p className="text-[14px] font-[650] leading-relaxed" style={{ color: 'var(--text-primary)' }}>
          {memory.fact}
        </p>

        {/* Source */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-md px-2 py-0.5 text-[10.5px] font-[700]"
            style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
            {SOURCE_LABELS[memory.source_type] ?? memory.source_type}
          </span>
          {memory.as_of && (
            <span className="flex items-center gap-1 text-[10.5px] font-[600]" style={{ color: 'var(--text-disabled)' }}>
              <Clock size={10} />
              {memory.as_of}
            </span>
          )}
        </div>

        {memory.source_text && (
          <p className="mt-2 rounded-[10px] px-3 py-2 text-[11.5px] italic leading-relaxed"
            style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
            &ldquo;{memory.source_text}&rdquo;
          </p>
        )}

        {/* Conflicts */}
        {hasConflicts && (
          <div className="mt-3 rounded-[12px] px-3.5 py-2.5"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <p className="flex items-center gap-1.5 text-[11.5px] font-[700]" style={{ color: '#B45309' }}>
              <AlertTriangle size={12} /> Conflict with existing memory
            </p>
            {memory._conflicts!.map((c) => (
              <p key={c.id} className="mt-1 text-[11px] font-[600]" style={{ color: '#92400e' }}>
                Existing: &ldquo;{c.fact}&rdquo; ({c.category})
              </p>
            ))}
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
      <div className="flex gap-2 px-5 pb-4">
        {showReject ? (
          <>
            <button type="button" onClick={() => { setShowReject(false); setRejectReason(''); }}
              disabled={!!acting}
              className="h-[36px] flex-1 rounded-[10px] text-[12px] font-[700] transition-colors"
              style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
              Cancel
            </button>
            <button type="button" onClick={handleReject} disabled={!!acting}
              className="flex h-[36px] flex-1 items-center justify-center gap-1.5 rounded-[10px] text-[12px] font-[700] text-white transition-colors"
              style={{ background: '#dc2626' }}>
              {acting === 'reject' ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
              Reject
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => setShowReject(true)}
              disabled={!!acting}
              className="flex h-[36px] flex-1 items-center justify-center gap-1.5 rounded-[10px] text-[12px] font-[700] transition-colors"
              style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
              <X size={12} /> Reject
            </button>
            <button type="button" onClick={handleConfirm} disabled={!!acting}
              className="flex h-[36px] flex-[1.5] items-center justify-center gap-1.5 rounded-[10px] text-[12px] font-[750] text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #059669, #047857)', boxShadow: '0 4px 14px rgba(5,150,105,0.3)' }}>
              {acting === 'confirm' ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              Confirm as Active
            </button>
          </>
        )}
      </div>
    </div>
  );
}
