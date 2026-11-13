import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Skeleton } from '@/components/ui/Skeleton';

describe('Skeleton', () => {
  it('shimmers with a highlight that differs from the base surface', () => {
    const { container } = render(<Skeleton />);
    // --bg-hover equals --bg-subtle in both themes, so the old highlight was
    // invisible; the white wash is the visible one.
    expect(container.firstElementChild?.className).toContain('after:via-white/60');
  });
});
