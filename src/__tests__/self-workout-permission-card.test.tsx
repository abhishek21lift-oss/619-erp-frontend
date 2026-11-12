// The trainer's permission is the only way a member can start a workout
// alone. This pins the switch: it calls the API with the new value and shows
// the state the server now has.

import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ToastProvider } from '@/lib/toast';
import SelfWorkoutPermissionCard from '@/components/pt-os/SelfWorkoutPermissionCard';

describe('SelfWorkoutPermissionCard', () => {
  it('turns the permission on and reflects the new state', async () => {
    const api = { setSelfWorkout: vi.fn().mockResolvedValue({ allow_self_workout: true }) };
    render(
      <ToastProvider>
        <SelfWorkoutPermissionCard clientId="c1" initial={false} api={api} />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('switch', { name: /allow self workout/i }));

    expect(api.setSelfWorkout).toHaveBeenCalledWith('c1', true);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });
});
