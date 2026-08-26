'use client';

/**
 * ClientIntelligencePanel — compact intelligence summary embeddable
 * in the PT client profile page. Shows: What Changed, What AI Knows,
 * What AI Suggests, Needs Attention, Missing Data, Next Best Action.
 *
 * Compact by design — the full view lives at /ai/intelligence?client_id=...
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Brain, RefreshCw, AlertTriangle, XCircle, Sparkles, ChevronRight,
  Loader2, Dumbbell,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { ClientIntelligenceSummary } from '@/lib/api';
import { blue } from '@/lib/palette';

const ACCENT = blue[500];
const ACCENT_DIM = 'rgba(0,103,224,0.10)';
const KNOWS_ACCENT = blue[600];

function IntelRow({ label, items, color }: { label: string; items: string[]; color: string }) {
  if (items.length === 0) return null;
  return (
    <div className="py-2">
      <p className="mb-1 text-[10px] font-[800] uppercase tracking-[0.08em]" style={{ color }}>
        {label}
        <span className="ml-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-[800]"
          style={{ background: `${color}15`, color }}>
          {items.length}
        </span>
      </p>
      <ul className="space-y-1">
        {items.slice(0, 3).map((item, i) => (
          <li key={i} className="text-[11.5px] font-[560] leading-snug" style={{ color: 'var(--text-secondary)' }}>
            {item}
          </li>
        ))}
        {items.length > 3 && (
          <li className="text-[10.5px] font-[600]" style={{ color: 'var(--text-disabled)' }}>
            +{items.length - 3} more
          </li>
        )}
      </ul>
    </div>
  );
}

interface Props {
  clientId: string;
}

export default function ClientIntelligencePanel({ clientId }: Props) {
  const router = useRouter();
  const [intel, setIntel] = useState<ClientIntelligenceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.ai.trainer.intelligence(clientId);
        if (alive) setIntel(res.data);
      } catch (err) {
        if (alive) {
          if (err instanceof Error && err.message.includes('404')) {
            setIntel(null);
          } else {
            setError(err instanceof Error ? err.message : 'Failed to load intelligence');
          }
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [clientId]);

  if (loading) {
    return (
      <div className="rounded-[16px] px-4 py-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-[8px]"
            style={{ background: ACCENT_DIM }}>
            <Brain size={14} color={ACCENT} />
          </span>
          <span className="text-[13px] font-[750]" style={{ color: 'var(--text-primary)' }}>
            AI Intelligence
          </span>
        </div>
        <div className="flex items-center gap-2 py-3">
          <Loader2 size={13} className="animate-spin" style={{ color: ACCENT }} />
          <span className="text-[11px] font-[600]" style={{ color: 'var(--text-muted)' }}>Loading…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[16px] px-4 py-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <p className="text-[12px] font-[600]" style={{ color: '#dc2626' }}>{error}</p>
      </div>
    );
  }

  if (!intel) return null;

  const hasAnyContent =
    intel.what_changed.length > 0 ||
    intel.what_ai_knows.length > 0 ||
    intel.what_ai_suggests.length > 0 ||
    intel.what_needs_attention.length > 0 ||
    intel.what_is_missing.length > 0;

  if (!hasAnyContent) return null;

  return (
    <div className="rounded-[16px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-[8px]"
            style={{ background: ACCENT_DIM }}>
            <Brain size={14} color={ACCENT} />
          </span>
          <span className="text-[13px] font-[750]" style={{ color: 'var(--text-primary)' }}>
            AI Intelligence
          </span>
          {intel.next_best_action && (
            <span className="rounded-full px-2 py-0.5 text-[9.5px] font-[700]"
              style={{ background: 'rgba(245,158,11,0.1)', color: '#B45309' }}>
              1 action
            </span>
          )}
        </div>
        <button type="button"
          onClick={() => router.push(`/ai/intelligence?client_id=${clientId}`)}
          className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[10.5px] font-[700] transition-colors"
          style={{ background: ACCENT_DIM, color: ACCENT }}>
          Full View <ChevronRight size={11} />
        </button>
      </div>

      {/* Content */}
      <div className="px-4 py-2 divide-y divide-[color:var(--border)]">
        <IntelRow
          label="What Changed"
          items={intel.what_changed.map((c) => c.text)}
          color="#059669"
        />
        <IntelRow
          label="What AI Knows"
          items={intel.what_ai_knows.map((m) => `${m.category}: ${m.fact}`)}
          color={KNOWS_ACCENT}
        />
        <IntelRow
          label="What AI Suggests"
          items={intel.what_ai_suggests.map((s) => `${s.type.replace(/_/g, ' ')}: ${s.summary}`)}
          color={ACCENT}
        />
        <IntelRow
          label="Needs Attention"
          items={intel.what_needs_attention.map((a) => a.text)}
          color="#B45309"
        />
        {intel.what_is_missing.length > 0 && (
          <IntelRow
            label="Missing Data"
            items={intel.what_is_missing}
            color="#64748b"
          />
        )}
      </div>

      {/* Next best action */}
      {intel.next_best_action && (
        <div className="mx-4 my-3 rounded-[10px] px-3 py-2.5"
          style={{ background: 'linear-gradient(135deg, rgba(0,103,224,0.05), rgba(0,103,224,0.02))', border: '1px solid rgba(0,103,224,0.12)' }}>
          <p className="text-[9.5px] font-[800] uppercase tracking-[0.08em]" style={{ color: ACCENT }}>
            Next Best Action
          </p>
          <p className="mt-0.5 text-[11.5px] font-[600]" style={{ color: 'var(--text-primary)' }}>
            {intel.next_best_action.text}
          </p>
        </div>
      )}
    </div>
  );
}
