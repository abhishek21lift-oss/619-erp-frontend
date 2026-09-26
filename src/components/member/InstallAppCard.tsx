'use client';

/**
 * "Get the app" — offers to install the web app on the home screen.
 *
 * What it shows depends on what the device can do (lib/pwa.ts installMode):
 *   • 'prompt' — an Install button that opens the browser's own dialog
 *     (Chrome / Edge / Samsung Internet on Android, Chrome / Edge on desktop).
 *   • 'ios'    — the two steps: Share → Add to Home Screen (every iPhone
 *     browser; Safari has no install API and Chrome on iOS uses Safari's).
 *   • 'menu'   — any other phone browser: the ⋮ menu's Install / Add to Home
 *     screen, which every one of them has.
 *   • nothing  — already installed, inside the Android APK, or a desktop
 *     browser that offered no prompt.
 *
 * The dashboard card can be snoozed ("Not now" → 30 days). The `persistent`
 * variant (More page, trainer settings) ignores the snooze, so a member who
 * dismissed it once can still find it.
 */

import { useEffect, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Download, EllipsisVertical, PlusSquare, Share, Smartphone, X } from 'lucide-react';
import { EASE } from './MemberUI';
import { installMode, onInstallAvailabilityChange, promptInstall, type InstallMode } from '@/lib/pwa';
import { palette, rgba } from '@/lib/palette';

const SNOOZE_KEY = 'member.installCard.snoozedUntil';
const SNOOZE_MS = 30 * 86_400_000;
const ACCENT = palette.blue[500];

function snoozed(): boolean {
  try { return Number(window.localStorage.getItem(SNOOZE_KEY) || 0) > Date.now(); } catch { return false; }
}

export default function InstallAppCard({
  title = 'Get the My PT app',
  persistent = false,
}: {
  title?: string;
  /** Ignore "Not now" and hide the close button — for the More page and settings. */
  persistent?: boolean;
}) {
  const [mode, setMode] = useState<InstallMode>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const decide = () => setMode(!persistent && snoozed() ? null : installMode());
    decide();
    // The prompt can arrive after mount (the worker registers on load).
    return onInstallAvailabilityChange(decide);
  }, [persistent]);

  const dismiss = () => {
    try { window.localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS)); } catch { /* shows again next visit */ }
    setMode(null);
  };

  const install = async () => {
    if (await promptInstall()) { setInstalled(true); setMode(null); }
  };

  const steps: [React.ReactNode, string][] = mode === 'ios'
    ? [[<Share key="s" size={14} aria-label="Share" />, 'Tap Share in the browser toolbar'],
       [<PlusSquare key="p" size={14} aria-hidden />, 'Choose Add to Home Screen']]
    : [[<EllipsisVertical key="m" size={14} aria-label="menu" />, 'Open the browser menu (⋮)'],
       [<PlusSquare key="p" size={14} aria-hidden />, 'Tap Install app or Add to Home screen']];

  return (
    <AnimatePresence>
      {installed && (
        <m.p key="done" role="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="mb-4 rounded-[14px] px-4 py-3 text-[13px] font-[700]"
          style={{ background: rgba(palette.emerald[500], 0.12), color: 'var(--text-primary)' }}>
          Installed — look for the app on your home screen.
        </m.p>
      )}
      {mode && (
        <m.section key="card" aria-label="Install the app"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
          className="relative mb-4 overflow-hidden rounded-[18px] p-4"
          style={{ background: rgba(ACCENT, 0.08), border: `1px solid ${rgba(ACCENT, 0.2)}` }}>
          {!persistent && (
            <button type="button" onClick={dismiss} aria-label="Not now"
              className="absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full"
              style={{ color: 'var(--text-muted)' }}>
              <X size={15} aria-hidden />
            </button>
          )}
          <div className="flex items-start gap-3 pr-6">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] text-white" style={{ background: ACCENT }}>
              <Smartphone size={20} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[14px] font-[800]" style={{ color: 'var(--text-primary)' }}>{title}</p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                One tap from your home screen, full screen, no browser bar.
              </p>
            </div>
          </div>

          {mode === 'prompt' ? (
            <button type="button" onClick={() => void install()}
              className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-[12px] text-[13.5px] font-[750] text-white"
              style={{ background: ACCENT }}>
              <Download size={15} aria-hidden /> Install app
            </button>
          ) : (
            <ol className="mt-3 space-y-1.5 text-[12.5px] font-[600]" style={{ color: 'var(--text-primary)' }}>
              {steps.map(([icon, text], i) => (
                <li key={text} className="flex items-center gap-2">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-[800] text-white" style={{ background: ACCENT }}>{i + 1}</span>
                  <span className="grid h-5 w-5 place-items-center" style={{ color: ACCENT }}>{icon}</span>
                  {text}
                </li>
              ))}
            </ol>
          )}
        </m.section>
      )}
    </AnimatePresence>
  );
}
