// A new nutrition assessment must default to the studio's local date.
//
// The form used `new Date().toISOString()`, which is UTC: an evening in India
// saved yesterday's date, and an evening in New York saved tomorrow's — a
// future date the server rejects. Every other assessment already uses
// todayISO(), which reads the local calendar.

import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/forms/domain', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/forms/domain')>();
  return { ...actual, todayISO: () => '1999-12-31' };
});

import { initNutritionForm } from '@/components/pt-os/nutrition-assessment/types';

describe('a new nutrition assessment', () => {
  it('defaults to todayISO(), not the UTC date', () => {
    expect(initNutritionForm().assessmentDate).toBe('1999-12-31');
  });
});
