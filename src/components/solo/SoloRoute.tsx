'use client';

import Guard from '@/components/Guard';
import SoloTrainerApp, { type SoloScreen } from './SoloTrainerApp';

export default function SoloRoute({ screen }: { screen: SoloScreen }) {
  return (
    <Guard>
      <SoloTrainerApp screen={screen} />
    </Guard>
  );
}
