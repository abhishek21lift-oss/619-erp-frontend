'use client';

/**
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
