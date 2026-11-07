'use client';
// The official Google Identity Services button, sized to the card.
//
// GIS renders an iframe with a fixed pixel width, so the wrapper measures
// itself and passes a clamped width through. The provider wrapper in
// layout.tsx renders children without a provider when no client id is set,
// so this component must not mount GoogleLogin in that case.

import { useEffect, useRef, useState } from 'react';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';

export function googleSignInConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
}

type Props = {
  onCredential: (credential: string) => void;
  onError: () => void;
  disabled?: boolean;
};

export default function GoogleSignInButton({ onCredential, onError, disabled }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(300);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const w = Math.floor(el.clientWidth);
      if (w > 0) setWidth(Math.max(200, Math.min(w, 400)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!googleSignInConfigured()) return null;

  function handleSuccess(res: CredentialResponse) {
    if (res.credential) onCredential(res.credential);
    else onError();
  }

  return (
    <div
      ref={wrapRef}
      inert={disabled || undefined}
      aria-disabled={disabled || undefined}
      className={`w-full overflow-hidden rounded-[12px] border border-[#E5E7EB] bg-white [color-scheme:light] ${
        disabled ? 'pointer-events-none opacity-60' : ''
      }`}
    >
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={onError}
        theme="outline"
        size="large"
        shape="rectangular"
        text="continue_with"
        logo_alignment="left"
        width={String(width)}
      />
    </div>
  );
}
