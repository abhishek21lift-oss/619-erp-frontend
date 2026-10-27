// The Past History step must collect the five regional pain flags the
// programming rules read. They were dropped as "redundant", but the backend's
// PARQ_REGION map still turns each one into a regional caution — so a client
// with a knee-pain history silently got no knee constraint.

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import StepPastHistory from '@/components/pt-os/parq/StepPastHistory';
import { initParqForm } from '@/components/pt-os/parq/types';

const REGIONS = ['Back Pain', 'Neck Pain', 'Knee Pain', 'Shoulder Pain', 'Hip Pain'];

function setup(pastHistory = initParqForm().pastHistory) {
  const set = vi.fn();
  render(
    <StepPastHistory
      form={{ ...initParqForm(), pastHistory }}
      set={set}
      stepLabel="Step 3 of 7"
    />,
  );
  return set;
}

describe('PAR-Q past history', () => {
  it('offers every regional pain flag the programming rules read', () => {
    setup();
    for (const label of REGIONS) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy();
    }
  });

  it('toggles a region on and writes it into pastHistory', () => {
    const set = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Knee Pain' }));
    expect(set).toHaveBeenCalledWith('pastHistory', expect.objectContaining({ knee_pain: true }));
  });

  it('toggles a recorded region back off', () => {
    const set = setup({ ...initParqForm().pastHistory, back_pain: true });
    fireEvent.click(screen.getByRole('button', { name: 'Back Pain' }));
    expect(set).toHaveBeenCalledWith('pastHistory', expect.objectContaining({ back_pain: false }));
  });
});
