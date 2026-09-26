'use client';

/**
 * "Get the app" — offers to install the member app on the home screen.
 *
 * Shown only when installing is actually possible and not already done:
 *   • Android / Chrome / Edge: an Install button that opens the browser's own
 *     install dialog (the deferred `beforeinstallprompt` — see lib/pwa.ts).
 *   • iPhone / iPad Safari: the two steps, because Safari has no install API.
 *   • Anywhere else, or already installed, or inside the Android APK: nothing.
 *
 * "Not now" hides it for 30 days in this browser. If storage is unavailable
 * it simply shows again next time, which is the harmless failure.
 */

import { useEffect, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Download, PlusSquare, Share, Smartphone, X } from 'lucide-react';
import { EASE, MC } from './MemberUI';
import {
  canPromptInstall, isInstalledApp, isIosSafari, onInstallAvailabilityChange, promptInstall,
} from '@/lib/pwa';
import { rgba } from '@/lib/palette';

const SNOOZE_KEY = 'member.installCard.snoozedUntil';
const SNOOZE_MS = 30 * 86_400_000;

function snoozed(): boolean {
  try { return Number(window.localStorage.getItem(SNOOZE_KEY) || 0) > Date.now(); } catch { return false; }
}

type Mode = 'prompt' | 'ios' | null;

export default function InstallAppCard() {
  const [mode, setMode] = useState<Mode>(null);

  useEffect(() => {
    const decide = () => {
      if (isInstalledApp() || snoozed()) return setMode(null);
      if (canPromptInstall()) return setMode('prompt');
      setMode(isIosSafari() ? 'ios' : null);
    };
    decide();
    return onInstallAvailabilityChange(decide);
  }, []);

  const dismiss = () => {
    try { window.localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS)); } catch { /* shows again next visit */ }
    setMode(null);
  };

  const install = async () => {
    if (await promptInstall()) setMode(null);
  };

  return (
    <AnimatePresence>
      {mode && (
        <m.section aria-label="Install the app"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
          className="relative mb-4 overflow-hidden rounded-[18px] p-4"
          style={{ background: rgba(MC.primary, 0.08), border: `1px solid ${rgba(MC.primary, 0.2)}` }}>
          <button type="button" onClick={dismiss} aria-label="Not now"
            className="absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full"
            style={{ color: MC.muted }}>
            <X size={15} aria-hidden />
          </button>
          <div className="flex items-start gap-3 pr-6">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] text-white"
              style={{ background: MC.primary }}>
              <Smartphone size={20} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[14px] font-[800]" style={{ color: MC.ink }}>Get the My PT app</p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed" style={{ color: MC.muted }}>
                One tap from your home screen, full screen, no browser bar.
              </p>
            </div>
          </div>

          {mode === 'prompt' ? (
            <button type="button" onClick={() => void install()}
              className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-[12px] text-[13.5px] font-[750] text-white"
              style={{ background: MC.primary }}>
              <Download size={15} aria-hidden /> Install app
            </button>
          ) : (
            <ol className="mt-3 space-y-1.5 text-[12.5px] font-[600]" style={{ color: MC.ink }}>
              <li className="flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-full text-[11px] font-[800] text-white" style={{ background: MC.primary }}>1</span>
                Tap <Share size={14} aria-label="Share" style={{ color: MC.primary }} /> Share in Safari&apos;s toolbar
              </li>
              <li className="flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-full text-[11px] font-[800] text-white" style={{ background: MC.primary }}>2</span>
                Choose <PlusSquare size={14} aria-hidden style={{ color: MC.primary }} /> Add to Home Screen
              </li>
            </ol>
          )}
        </m.section>
      )}
    </AnimatePresence>
  );
}
