'use client';
import { GoogleOAuthProvider } from '@react-oauth/google';

// Thin client-side wrapper so layout.tsx (a Server Component) can pass
// the NEXT_PUBLIC_GOOGLE_CLIENT_ID down without making the whole layout a
// Client Component. Renders children as-is when no client ID is configured.
export function GoogleAuthWrapper({
  children,
  clientId,
}: {
  children: React.ReactNode;
  clientId: string;
}) {
  if (!clientId) return <>{children}</>;
  return <GoogleOAuthProvider clientId={clientId}>{children}</GoogleOAuthProvider>;
}
