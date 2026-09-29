'use client';

// This wizard's steps on the shared stepper. Six near-identical copies of
// the stepper used to live one per wizard, and drifted: some kept a light
// style that disappeared on the dark hero, some cut long labels off.
import StepperTimeline from '@/components/pt-os/shared/StepperTimeline';
import { STEPS, type StepId } from './types';

interface PostureProgressTimelineProps {
  current: StepId;
  onStep: (s: StepId) => void;
}

export function PostureProgressTimeline({ current, onStep }: PostureProgressTimelineProps) {
  return (
    <StepperTimeline
      steps={STEPS.map((s) => ({ id: s.id, label: s.label }))}
      current={current}
      onStep={(id) => onStep(id as StepId)}
    />
  );
}

export default PostureProgressTimeline;
