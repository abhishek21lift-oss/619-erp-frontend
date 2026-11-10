// Every navigation destination must be a real page.
//
// The sidebar, search index and bottom bar all read nav-config, so one dead
// href would show up in three places and 404 in all of them. This walks the
// config rather than a hand-kept list, so adding an item without its page
// fails here first.

import { describe, expect, it } from 'vitest';
import { allNavItems } from '@/lib/nav-config';
import { routeExists } from '@/__tests__/helpers/app-routes';

describe('every nav destination is a real page', () => {
  it('resolves each configured href to a page.tsx', () => {
    const missing = allNavItems()
      .map((item) => item.href.split('?')[0])
      .filter((href) => !routeExists(...href.split('/').filter(Boolean)));

    expect([...new Set(missing)]).toEqual([]);
  });
});
