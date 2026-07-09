// NAV_SECTIONS — organises adapted groups into labelled sidebar regions.
// Import ADAPTED_NAV_GROUPS from items.ts; do NOT import from nav-config directly.

import { ADAPTED_NAV_GROUPS, ADAPTED_SETTINGS_GROUP } from './items';
import type { NavSection } from './types';

function findGroup(id: string) {
  const g = ADAPTED_NAV_GROUPS.find((g) => g.id === id);
  if (!g) throw new Error(`Nav group "${id}" not found. Check items.ts.`);
  return g;
}

export const NAV_SECTIONS: NavSection[] = [
  {
    id:     'workspace',
    label:  'Workspace',
    groups: [
      findGroup('attendance'),
    ],
  },
  {
    id:     'personal-training',
    label:  'Personal Training',
    groups: [
      findGroup('personal-training'),
      findGroup('trainer-management'),
      findGroup('session-management'),
      findGroup('progress-tracking'),
    ],
  },
  {
    id:     'business',
    label:  'Business',
    groups: [
      findGroup('finance'),
      findGroup('communication'),
      findGroup('subscription'),
    ],
  },
  {
    id:     'intelligence',
    label:  'Intelligence',
    groups: [
      findGroup('ai-coach'),
      findGroup('insights'),
    ],
  },
];

export const SETTINGS_SECTION: NavSection = {
  id:     'settings',
  label:  'Settings',
  groups: [ADAPTED_SETTINGS_GROUP],
};
