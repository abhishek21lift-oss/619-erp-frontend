import { describe, expect, it } from 'vitest';
import { serverFilter } from '@/lib/client-filter';

describe('clients list server filter', () => {
  it('maps the expired pill to the derived term filter', () => {
    expect(serverFilter('expired')).toEqual({ term: 'ended' });
  });

  it('sends no filter for the all pill', () => {
    expect(serverFilter('all')).toEqual({});
  });

  it('maps the remaining pills straight to status', () => {
    expect(serverFilter('active')).toEqual({ status: 'active' });
    expect(serverFilter('pending')).toEqual({ status: 'pending' });
    expect(serverFilter('frozen')).toEqual({ status: 'frozen' });
  });
});
