import { describe, it, expect } from 'vitest';
import { cn } from '@/components/ui/cn';

describe('cn utility', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible');
  });

  it('returns empty string for no args', () => {
    expect(cn()).toBe('');
  });
});
