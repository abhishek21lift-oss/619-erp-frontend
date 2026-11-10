import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Ruler } from 'lucide-react';
import { StepCard } from '@/components/pt-os/fitness-testing/StepCard';

it('renders the chapter icon, title, badge and children', () => {
  render(<StepCard icon={Ruler} accent="#d95f7a" title="Anthropometric data" description="Body measurements" badge="Step 2 of 7"><p>fields</p></StepCard>);
  expect(screen.getByRole('heading', { name: 'Anthropometric data' })).toBeTruthy();
  expect(screen.getByText('Body measurements')).toBeTruthy();
  expect(screen.getByText('Step 2 of 7')).toBeTruthy();
  expect(screen.getByText('fields')).toBeTruthy();
});
