'use client';

/**
 * NOT MOUNTED. Nothing renders this.
 *
 * The floating launcher was removed from AppShell: on a phone it sat on top
 * of the content of every screen, and AI already has a permanent home in the
 * bottom nav's AI Coach tab. This file and the two components below it are
 * kept intact rather than deleted, because the decision that removed them was
 * about where the button sits, not about the code being wrong — restoring it
 * is one line in AppShell.
 *
 * ── What it did ───────────────────────────────────────────────────────────
 *
 * Mounts the assistant on every screen.
 *
 * Lives in AppShell, which every authenticated page renders, so this is the
 * one place that decides where the assistant appears and the only place that
 * holds its open state. Route context (which page, which client) is read from
 * the pathname rather than threaded through props, because the alternative is
 * every page in the app knowing about the assistant.
 */

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useReducedMotion } from 'framer-motion';
import AiLauncher from './AiLauncher';
import AiCommandCenter from './AiCommandCenter';
import { clientIdFromPath } from '@/lib/ai-actions';

export default function AiAssistant() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const reducedMotion = useReducedMotion() ?? false;
  const clientId = clientIdFromPath(pathname);

  return (
    <>
      <AiLauncher onOpen={() => setOpen(true)} hidden={open} reducedMotion={reducedMotion} />
      <AiCommandCenter
        open={open}
        onClose={() => setOpen(false)}
        pathname={pathname}
        clientId={clientId}
        reducedMotion={reducedMotion}
      />
    </>
  );
}
