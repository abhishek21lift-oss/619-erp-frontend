'use client';

import { useRef } from 'react';
import { useModalA11y } from '@/lib/useModalA11y';
import { m, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

type PremiumModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  footer?: React.ReactNode;
  children?: React.ReactNode;
};

/**
 * The studio's modal — Create Invoice, Schedule Session.
 *
 * ── What was missing ────────────────────────────────────────────────────────
 *
 * It looked like a dialog and behaved like one for a mouse, and to anything
 * that is not a mouse it was a `<div>` that happened to be on top:
 *
 *   · no `role="dialog"` and no `aria-modal`, so a screen reader kept reading
 *     the page UNDERNEATH — the invoice list, the nav, the whole shell — with
 *     no indication that a form had opened over it
 *   · no accessible name; the heading was right there in the markup and
 *     nothing pointed at it
 *   · focus never moved in. Opening Create Invoice from the toolbar left the
 *     caret on the toolbar, so the first Tab went to the next thing in the
 *     PAGE, not the first field of the form
 *   · and nothing kept it in: Tab walked straight out of the dialog and into
 *     the list behind it, where every control is still clickable
 *   · on close, focus was wherever it had wandered to — commonly `<body>`,
 *     which drops a keyboard user back at the top of the document
 *
 * Escape already closed it, which was the one piece that was there.
 *
 * ── Why the whole interaction model, and not just the role ──────────────────
 *
 * Declaring `role="dialog"` without focus management is worse than declaring
 * nothing: assistive technology announces a dialog and then the user finds
 * themselves outside it with no way to tell. The role is added here together
 * with the behaviour it promises — focus in on open, trapped while open,
 * returned to the trigger on close.
 */
export function PremiumModal({ open, onClose, title, subtitle, icon, size = 'md', footer, children }: PremiumModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  // The dialog contract — role, name, focus in, focus trapped, focus returned,
  // Escape — lives in one hook so every modal in the app gets the same one.
  const { panelProps, titleId } = useModalA11y(open, onClose);
  const subtitleId = `${titleId}-subtitle`;

  const widths: Record<string, string> = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  };

  return (
    <AnimatePresence>
      {open && (
        <div data-no-pull-refresh className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <m.div
            ref={overlayRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
          />
          <m.div
            {...panelProps}
            aria-describedby={subtitle ? subtitleId : undefined}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={clsx(
              'relative w-full rounded-2xl bg-white shadow-2xl border border-slate-100 outline-none',
              widths[size],
            )}
          >
            <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3 min-w-0">
                {icon && (
                  <div aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    {icon}
                  </div>
                )}
                <div className="min-w-0">
                  <h2 id={titleId} className="text-[17px] font-[760] tracking-[-0.01em] text-slate-900 truncate">{title}</h2>
                  {subtitle && <p id={subtitleId} className="text-[12px] text-slate-500 mt-0.5">{subtitle}</p>}
                </div>
              </div>
              {/* An icon is not a name: this button announced itself as
                  "button" and nothing else. */}
              <button
                type="button"
                onClick={onClose}
                aria-label={`Close ${title}`}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X size={16} aria-hidden />
              </button>
            </div>
            <div className="px-6 py-4 max-h-[60vh] overflow-y-auto overscroll-contain">{children}</div>
            {footer && (
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
                {footer}
              </div>
            )}
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
}
