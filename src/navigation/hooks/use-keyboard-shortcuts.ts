'use client';

import { useEffect } from 'react';

export interface ShortcutConfig {
  /** Key code, e.g. 'k', 'Escape', 'ArrowUp'. */
  key:       string;
  /** If true, requires Ctrl (Windows/Linux) or Meta (Mac). Default false. */
  meta?:     boolean;
  /** Requires Shift. Default false. */
  shift?:    boolean;
  /** Requires Alt. Default false. */
  alt?:      boolean;
  handler:   (event: KeyboardEvent) => void;
  /** Whether to call event.preventDefault(). Default true. */
  prevent?:  boolean;
  /** Only fire when no input/textarea/select is focused. Default false. */
  noInput?:  boolean;
}

/**
 * Registers global keyboard shortcuts.
 * Shortcuts are automatically removed when the component unmounts.
 */
export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  useEffect(() => {
    if (!shortcuts.length) return;

    const handler = (e: KeyboardEvent) => {
      for (const sc of shortcuts) {
        const metaMatch  = sc.meta  ? (e.ctrlKey || e.metaKey) : (!e.ctrlKey && !e.metaKey);
        const shiftMatch = sc.shift ? e.shiftKey  : !e.shiftKey;
        const altMatch   = sc.alt   ? e.altKey    : !e.altKey;

        if (
          e.key.toLowerCase() === sc.key.toLowerCase() &&
          metaMatch && shiftMatch && altMatch
        ) {
          if (sc.noInput) {
            const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
            if (tag === 'input' || tag === 'textarea' || tag === 'select') continue;
          }
          if (sc.prevent !== false) e.preventDefault();
          sc.handler(e);
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts]);
}
