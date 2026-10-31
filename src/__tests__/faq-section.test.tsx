import { describe, expect, it, vi } from 'vitest';
import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => {
  const cache = new Map<string, unknown>();
  return {
    useReducedMotion: () => true,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    m: new Proxy({}, {
      get: (_target, tag: string) => {
        if (!cache.has(tag)) {
          cache.set(tag, ({ children, initial, animate, transition, whileInView, viewport, ...rest }: Record<string, unknown>) => {
            void initial; void animate; void transition; void whileInView; void viewport;
            return React.createElement(tag, rest, children as React.ReactNode);
          });
        }
        return cache.get(tag);
      },
    }),
  };
});

import FaqSection from '@/components/landing/FaqSection';
import { HOME_FAQ } from '@/components/landing/faq-content';

describe('FaqSection', () => {
  it('renders every answer into the DOM, not just the open one', () => {
    render(<FaqSection />);
    for (const item of HOME_FAQ) expect(screen.getByText(item.a)).toBeInTheDocument();
  });

  it('marks only the open answer as visible to assistive technology', () => {
    render(<FaqSection />);
    const panels = HOME_FAQ.map((item) => screen.getByText(item.a).closest('[role="region"]'));
    expect(panels[0]).toHaveAttribute('aria-hidden', 'false');
    for (const panel of panels.slice(1)) expect(panel).toHaveAttribute('aria-hidden', 'true');
  });

  it('still opens a closed answer on click', () => {
    render(<FaqSection />);
    const second = document.getElementById('faq-button-1')!;
    fireEvent.click(second);
    expect(second).toHaveAttribute('aria-expanded', 'true');
    const panel = screen.getByText(HOME_FAQ[1].a).closest('[role="region"]');
    expect(panel).toHaveAttribute('aria-hidden', 'false');
  });
});
