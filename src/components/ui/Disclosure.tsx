import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from './cn';

/**
 * A collapsible section — the house way to keep useful-but-secondary text on
 * the page without it owning the first screen.
 *
 * The app already collapsed three of these by hand (WorkoutLauncher's "Train a
 * different day", CompletionPanel's "Show everything counted",
 * GenerationContextPanel's "Details") with the same markup each time: native
 * `<details>`, a markerless summary, a Chevron that rotates on open. This is
 * that markup once, for the places that follow — instructions above a test,
 * reference notes under a chart.
 *
 * Native `<details>` on purpose: it opens and closes without JavaScript, it is
 * keyboard and screen-reader correct on its own, and it survives a render
 * failure. The chevron is decoration; the summary text is the accessible name.
 *
 * Do NOT use for a warning or anything a decision depends on. If the reader
 * must see it before they act, it stays on the page.
 */
export interface DisclosureProps {
  summary: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Disclosure({ summary, children, className }: DisclosureProps) {
  return (
    <details className={cn('group', className)}>
      <summary
        className="flex cursor-pointer list-none items-center gap-1.5 text-[12.5px] font-[650] [&::-webkit-details-marker]:hidden"
        style={{ color: 'var(--text-secondary)' }}
      >
        <ChevronDown size={14} aria-hidden className="shrink-0 transition-transform group-open:rotate-180" />
        {summary}
      </summary>
      <div className="mt-2 text-[12.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        {children}
      </div>
    </details>
  );
}
