'use client';

import { m } from 'framer-motion';
import { CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';

export type RiskBannerLevel = 'low' | 'medium' | 'high';

interface RiskLevelBannerProps {
  level: RiskBannerLevel;
  /** Optional override for the headline (defaults to a sensible per-level title). */
  title?: string;
  /** Optional override for the supporting message. */
  message?: string;
  /** Small trailing stat, e.g. "3 of 10 flagged". */
  stat?: string;
  className?: string;
}

const LEVEL_META: Record<RiskBannerLevel, {
  icon: typeof CheckCircle2;
  label: string;
  defaultTitle: string;
  defaultMessage: string;
  bg: string;
  border: string;
  iconBg: string;
  color: string;
}> = {
  low: {
    icon: CheckCircle2,
    label: 'LOW',
    defaultTitle: 'LOW — Approved for Exercise',
    defaultMessage: 'No red-flag answers detected. Client is cleared to begin a standard training program.',
    bg: 'linear-gradient(135deg, rgba(16,185,129,0.10), rgba(16,185,129,0.03))',
    border: 'rgba(16,185,129,0.35)',
    iconBg: '#10b981',
    color: '#059669',
  },
  medium: {
    icon: AlertTriangle,
    label: 'MEDIUM',
    defaultTitle: 'MEDIUM — Trainer Review Required',
    defaultMessage: 'Some answers need a closer look before programming. Review flagged items with the client.',
    bg: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.03))',
    border: 'rgba(245,158,11,0.4)',
    iconBg: '#F59E0B',
    color: '#D97706',
  },
  high: {
    icon: ShieldAlert,
    label: 'HIGH',
    defaultTitle: 'HIGH — Medical Clearance Required, Workout Assignment Disabled',
    defaultMessage: 'This client must obtain written medical clearance before any workout plan can be assigned.',
    bg: 'linear-gradient(135deg, rgba(239,68,68,0.14), rgba(239,68,68,0.04))',
    border: 'rgba(239,68,68,0.45)',
    iconBg: '#dc2626',
    color: '#dc2626',
  },
};

/** Large, prominent 3-tier risk banner for PAR-Q-style gating decisions.
 *  No direct precedent in the codebase — built new, matching the same
 *  card + gradient-bar visual language as the other assessment panels,
 *  but sized up (per the "Large warning banner" spec) for the high tier. */
export function RiskLevelBanner({ level, title, message, stat, className }: RiskLevelBannerProps) {
  const meta = LEVEL_META[level];
  const Icon = meta.icon;
  const isHigh = level === 'high';

  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`rounded-[24px] overflow-hidden ${className ?? ''}`}
      style={{
        background: meta.bg,
        border: `${isHigh ? 2.5 : 1.5}px solid ${meta.border}`,
        boxShadow: isHigh ? '0 12px 40px rgba(220,38,38,0.16)' : '0 4px 24px rgba(15,23,42,0.06)',
      }}
    >
      <div className={isHigh ? 'p-7 sm:p-10' : 'p-5 sm:p-7'}>
        <div className="flex items-start gap-4">
          <div
            className="flex flex-shrink-0 items-center justify-center rounded-[16px]"
            style={{
              background: meta.iconBg,
              width: isHigh ? 56 : 44,
              height: isHigh ? 56 : 44,
              boxShadow: `0 6px 20px ${meta.iconBg}55`,
            }}
          >
            <Icon size={isHigh ? 28 : 20} color="#fff" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="rounded-full px-2.5 py-0.5 text-[10.5px] font-[800] tracking-wider"
                style={{ background: meta.iconBg, color: '#fff' }}
              >
                {meta.label} RISK
              </span>
              {stat && (
                <span className="text-[11.5px] font-[650]" style={{ color: meta.color }}>{stat}</span>
              )}
            </div>
            <h2
              className={isHigh ? 'mt-2 text-[22px] sm:text-[26px] font-[860] tracking-[-0.02em] leading-tight' : 'mt-1.5 text-[16px] font-[800] tracking-[-0.02em] leading-tight'}
              style={{ color: meta.color }}
            >
              {title ?? meta.defaultTitle}
            </h2>
            <p className="mt-1.5 text-[13px] font-[500]" style={{ color: '#475569' }}>
              {message ?? meta.defaultMessage}
            </p>
          </div>
        </div>
      </div>
    </m.div>
  );
}

export default RiskLevelBanner;
