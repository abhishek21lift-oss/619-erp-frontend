'use client';

/**
 * The floating button that opens the assistant.
 *
 * Three things it has to get right and one it has to leave alone:
 *
 *   It must clear the mobile bottom nav. The offset is derived from
 *   --bottom-nav-h, the same token every other "clear the nav" offset in the
 *   app comes from, so raising the nav does not strand this button behind it.
 *
 *   The pulse must stop for prefers-reduced-motion. A ring that breathes
 *   forever in the corner of every screen is exactly the kind of motion that
 *   setting exists to switch off.
 *
 *   The badge is for first-time users only, and "first time" has to survive a
 *   reload, so it is a localStorage flag cleared on first open — not state,
 *   which would show the badge again on every navigation.
 *
 * And the thing it leaves alone: it does not render while the panel is open.
 * The panel covers this corner on mobile, and a button glowing underneath a
 * sheet is just a thing poking through.
 */

import { useEffect, useState } from 'react';
import { m } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const SEEN_KEY = 'ai-assistant-seen';

export function markAssistantSeen() {
  try { window.localStorage.setItem(SEEN_KEY, '1'); } catch { /* private mode */ }
}

export default function AiLauncher({
  onOpen, hidden, reducedMotion,
}: { onOpen: () => void; hidden: boolean; reducedMotion: boolean }) {
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    try { setIsNew(window.localStorage.getItem(SEEN_KEY) !== '1'); } catch { setIsNew(false); }
  }, []);

  if (hidden) return null;

  return (
    <m.button
      type="button"
      onClick={() => { markAssistantSeen(); setIsNew(false); onOpen(); }}
      aria-label="Open AI assistant"
      data-no-pull-refresh
      initial={reducedMotion ? false : { scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 26 }}
      whileTap={{ scale: 0.92 }}
      className="group fixed right-4 z-[120] flex h-14 w-14 items-center justify-center rounded-full sm:right-6"
      style={{
        // Above the bottom nav on mobile, off the safe area on desktop where
        // there is no nav to clear.
        bottom: 'calc(var(--bottom-nav-h, 0px) + env(safe-area-inset-bottom, 0px) + 16px)',
        background: 'linear-gradient(135deg, rgba(0,103,224,0.92), rgba(0,63,135,0.92))',
        border: '1px solid rgba(255,255,255,0.22)',
        backdropFilter: 'blur(18px) saturate(180%)',
        WebkitBackdropFilter: 'blur(18px) saturate(180%)',
        boxShadow: '0 10px 30px rgba(0,80,173,0.45), inset 0 1px 0 rgba(255,255,255,0.24)',
      }}
    >
      {/* The glow. A sibling rather than a box-shadow animation, because
          animating box-shadow repaints the button every frame and animating
          transform/opacity on a separate layer does not.

          Gated on `isNew` as well as reduced motion. It used to pulse forever
          for everybody: a button breathing in the corner of every screen in
          the product, on every screen, for the life of the account. That is
          an onboarding affordance doing a permanent job — once you know the
          assistant is there, the pulse is just movement in your peripheral
          vision while you are trying to read a client's numbers. It now stops
          being animated the moment the panel has been opened once, which is
          exactly when it has finished saying what it had to say. */}
      {!reducedMotion && isNew && (
        <m.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(127,180,255,0.55), transparent 68%)' }}
          animate={{ scale: [1, 1.45, 1], opacity: [0.55, 0, 0.55] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeOut' }}
        />
      )}

      <Sparkles size={22} className="relative text-white" strokeWidth={2.2} />

      {/* Names the thing on hover. The aria-label says "Open AI assistant"
          for screen readers; sighted pointer users had only a sparkle to go
          on. Hidden from the a11y tree so it is not announced twice, and
          pointer-events-none so it can never eat the button's own click. */}
      <span
        aria-hidden
        className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] font-[700] text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 sm:block"
        style={{
          background: 'rgba(15,23,42,0.92)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          boxShadow: '0 4px 14px rgba(15,23,42,0.28)',
        }}
      >
        Studio AI
      </span>

      {isNew && (
        <span
          className="absolute -right-0.5 -top-0.5 rounded-full px-1.5 py-[2px] text-[9px] font-[850] uppercase tracking-[0.08em] text-white"
          style={{
            background: 'linear-gradient(135deg,#10b981,#059669)',
            boxShadow: '0 2px 8px rgba(16,185,129,0.55)',
          }}
        >
          New
        </span>
      )}
    </m.button>
  );
}
