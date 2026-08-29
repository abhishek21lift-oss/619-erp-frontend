// Aggregation helpers for Command Center UI
// These convert the raw CommandCenterSnapshot into values needed by the premium UI.

import type { CommandCenterSnapshot } from '@/lib/api';

/** Compute overall platform health: number of non‑healthy cards and status label */
export function computePlatformHealth(snap: CommandCenterSnapshot) {
  const total = Object.keys(snap.cards).length;
  const unhealthy = Object.values(snap.cards).filter((c) => c.status !== 'healthy').length;
  const status = snap.status; // overall snapshot status (healthy, warning, etc.)
  return { total, unhealthy, status };
}

/** Extract a few high‑level KPIs from the snapshot if present.
 *  The snapshot does not contain revenue figures; they are fetched via the
 *  separate `/api/platform/overview/kpis` endpoint, but for robustness we return
 *  undefined if missing.
 */
export function extractKpis(snap: CommandCenterSnapshot) {
  // The snapshot includes the same cards as before (runtime, database, …).
  // For the KPI row we will later fetch the dedicated KPI endpoint, so this
  // helper is currently a placeholder for future expansion.
  return {};
}
