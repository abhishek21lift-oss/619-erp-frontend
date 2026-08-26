import { http } from '../../http';

export interface PlatformRiskDomain {
  name: string;
  weight: number;
  score: number;
  contribution: number;
  available: boolean;
  reason: string | null;
  evidence: Array<{ source: string; status: string }>;
}

export interface PlatformRiskFinding {
  id: string;
  title: string;
  severity: 'critical' | 'warning' | 'info';
  confidence: number;
}

export interface PlatformRiskReport {
  score: number;
  level: 'healthy' | 'watch' | 'elevated' | 'high' | 'critical';
  label: string;
  checked_at: string;
  confidence: number;
  domains: PlatformRiskDomain[];
  unknown_domains: string[];
  findings: PlatformRiskFinding[];
  methodology: string;
}

/**
 * Command Center risk API.
 *
 * The score is deterministic and comes from the backend's platform telemetry
 * plus existing Guardian findings. This client never calculates or rewrites
 * the risk score, which keeps the backend as the source of truth.
 */
export const commandCenter = {
  risk: (fresh = false) =>
    http<{ data: PlatformRiskReport }>(
      `/api/platform/command-center/risk${fresh ? '?fresh=1' : ''}`,
    ),
};
