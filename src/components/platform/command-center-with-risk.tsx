'use client';

import CommandCenter from './command-center';
import PlatformRiskCentre from './platform-risk';
import ActionCenter from './action-center';

/**
 * Composite operational console. The existing live infrastructure console is
 * preserved intact; deterministic risk and operator actions are layered below
 * it as independently failing panels.
 */
export default function CommandCenterWithRisk() {
  return (
    <div className="space-y-10">
      <CommandCenter />
      <PlatformRiskCentre />
      <ActionCenter />
    </div>
  );
}
