// src/components/pt-os/informed-consent/statusConfig.ts
// Colored badge config for InformedConsentStatus — shared by the hub card,
// the client-profile Documents card, and the dashboard widget.
import type { InformedConsentStatus } from '@/lib/api';

export interface StatusStyle { label: string; bg: string; color: string; }

export const STATUS_STYLE: Record<InformedConsentStatus, StatusStyle> = {
  draft:                       { label: 'Draft',                bg: 'rgba(148,163,184,0.15)', color: '#64748b' },
  pending_client_signature:    { label: 'Pending Client Sign',   bg: 'rgba(245,158,11,0.15)',  color: '#d97706' },
  pending_trainer_signature:   { label: 'Pending Trainer Sign',  bg: 'rgba(245,158,11,0.15)',  color: '#d97706' },
  completed:                   { label: 'Completed',             bg: 'rgba(16,185,129,0.15)',  color: '#059669' },
  revoked:                     { label: 'Revoked',                bg: 'rgba(220,38,38,0.15)',   color: '#dc2626' },
  expired:                     { label: 'Expired',                bg: 'rgba(220,38,38,0.15)',   color: '#dc2626' },
  archived:                    { label: 'Archived',               bg: 'rgba(148,163,184,0.15)', color: '#94a3b8' },
};

export function statusStyle(status: InformedConsentStatus): StatusStyle {
  return STATUS_STYLE[status] ?? STATUS_STYLE.draft;
}
