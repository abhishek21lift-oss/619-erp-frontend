'use client';

import CommandCenter from './command-center';
import PlatformRiskCentre from './platform-risk';
import ActionCenter from './action-center';
import PlatformPulse from './platform-pulse';

/**
 * Composite operational console. The existing live infrastructure console is
 * preserved intact; deterministic risk, operator actions and the business
 * intelligence pulse are layered below it as independently failing panels.
 */
export default function CommandCenterWithRisk() {
  return (
    <div className="space-y-10">
      <CommandCenter />
      <PlatformRiskCentre />
      <ActionCenter />
      <PlatformPulse />
    </div>
  );
}
