// The K11 test screen's instructions.
//
// Safety is the only protocol copy that stays on the page; equipment,
// positioning and procedure sit behind one closed "Instructions" disclosure.
// Measurement rules and the test's purpose were field guidance repeated beside
// the inputs, so they no longer render at all.
//
// This file guards that split: the safety warnings stay visible, the long
// protocol stays present and reachable, and the removed copy cannot creep back
// in when someone edits the panel.

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

describe('K11 flexibility test screen — instructions', () => {
  it('keeps every safety warning in the open', () => {
    renderScreen();
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

  it('no longer renders the test purpose or the measurement rules', () => {
    renderScreen();
    expect(screen.queryByText(QUADRICEPS_PROTOCOL.purpose)).toBeNull();
    for (const rule of QUADRICEPS_PROTOCOL.measurement) {
      expect(screen.queryByText(rule)).toBeNull();
    }
  });

  it('no longer renders field-level guidance', () => {
    renderScreen();
    expect(screen.queryByText('Distance is only measured when contact is No.')).toBeNull();
    expect(screen.queryByText('Hip lifting or pelvis rotating during the movement.')).toBeNull();
    expect(screen.queryByText(/Your own observation/)).toBeNull();
    expect(screen.queryByText(/Normal needs both sides clear/)).toBeNull();
  });
});
