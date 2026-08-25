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

export interface PlatformActionItem {
  id: string;
  source: 'guardian' | 'alert';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  evidence: unknown;
  recommended_commands: string[];
  recovery_available: boolean;
  confidence: number | null;
  status: 'open' | 'acknowledged';
}

export interface PlatformActionCenterReport {
  checked_at: string;
  counts: { critical: number; warning: number; info: number; total: number };
  items: PlatformActionItem[];
}

/**
 * Command Center risk/action APIs.
 *
 * Both are read-only deterministic views. The client never calculates or
 * rewrites risk or findings, keeping the backend as the source of truth.
 */
export const commandCenter = {
  risk: (fresh = false) =>
    http<{ data: PlatformRiskReport }>(
      `/api/platform/command-center/risk${fresh ? '?fresh=1' : ''}`,
    ),
  actionCenter: (fresh = false) =>
    http<{ data: PlatformActionCenterReport }>(
      `/api/platform/command-center/action-center${fresh ? '?fresh=1' : ''}`,
    ),
};
