'use client';

import CommandCenter from './command-center';
import PlatformRiskCentre from './platform-risk';

/**
 * Composite operational console: preserve the existing live infrastructure
 * Command Center and add the deterministic Platform Risk layer underneath it.
 * The risk layer is intentionally separate so an analytics/risk failure can
 * never blank the live health console.
 */
export default function CommandCenterWithRisk() {
  return (
    <div className="space-y-8">
      <CommandCenter />
      <PlatformRiskCentre />
    </div>
  );
}
