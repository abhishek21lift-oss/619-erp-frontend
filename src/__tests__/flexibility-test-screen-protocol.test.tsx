// The K11 test screen's protocol panel.
//
// On a laptop the protocol is a side column beside the fields and nothing is
// hidden. On a phone it used to render first, whole (Purpose → Safety), and
// pushed the first measurement input most of a screen down. Now the phone
// keeps the two things a test cannot be run correctly without — the
// measurement rules and Safety — and puts equipment, positioning and
// procedure behind one "Instructions" disclosure.
//
// This file guards that split: safety and measurement stay in the open, the
// long protocol stays present and reachable, and neither copy can silently
// vanish when someone edits the panel.

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TestScreen from '@/components/pt-os/fitness-testing/flexibility/TestScreen';
import { deriveFlexibility, initFlexibilityForm } from '@/lib/flexibility-protocol';
import { QUADRICEPS_PROTOCOL } from '@/components/pt-os/fitness-testing/flexibility/protocol-content';

function renderScreen() {
  const form = initFlexibilityForm();
  return render(
    <TestScreen
      test="quadriceps"
      form={form}
      patchFlex={vi.fn()}
      derived={deriveFlexibility(null)}
      onBack={vi.fn()}
    />,
  );
}

describe('K11 flexibility test screen — protocol panel', () => {
  it('keeps measurement rules and safety in the open', () => {
    renderScreen();
    // One visible panel on a phone, one on a laptop — the label appears in each.
    expect(screen.getAllByText('Measurement').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Safety').length).toBeGreaterThanOrEqual(2);
    for (const rule of QUADRICEPS_PROTOCOL.measurement) {
      expect(screen.getAllByText(rule).length).toBeGreaterThan(0);
    }
    for (const warning of QUADRICEPS_PROTOCOL.safety) {
      expect(screen.getAllByText(warning).length).toBeGreaterThan(0);
    }
  });

  it('keeps the full protocol reachable behind one closed disclosure', () => {
    const { container } = renderScreen();
    const details = container.querySelectorAll('details');
    expect(details).toHaveLength(1);

    const summary = details[0].querySelector('summary');
    expect(summary).toHaveTextContent('Instructions');
    expect(details[0].hasAttribute('open')).toBe(false);

    for (const step of QUADRICEPS_PROTOCOL.procedure) {
      expect(details[0]).toHaveTextContent(step);
    }
    for (const cue of QUADRICEPS_PROTOCOL.positioning) {
      expect(details[0]).toHaveTextContent(cue);
    }
    expect(details[0]).toHaveTextContent(QUADRICEPS_PROTOCOL.equipment[0]);
  });
});
