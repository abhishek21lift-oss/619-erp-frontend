import React from 'react';
import type { CommandCenterCard, CommandCenterSnapshot } from '@/lib/api';
import { Card } from './Card';

/** Grid container for Command Center cards. */
export const CardGrid: React.FC<{ cards: CommandCenterCard[]; history: CommandCenterSnapshot[] }> = ({ cards, history }) => (
  <div className="grid gap-3 sm:grid-cols-2">
    {cards.map((c, i) => (
      <Card key={c.name} card={c} index={i} history={history} />
    ))}
  </div>
);
