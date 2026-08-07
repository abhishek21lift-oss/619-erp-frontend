import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { LazyMotion, domAnimation } from 'framer-motion';
import { AuthProvider } from '@/lib/auth-context';
import { ToastProvider } from '@/lib/toast';
import { PermissionsProvider } from '@/lib/permissions-context';
import { FeaturesProvider } from '@/lib/features-context';
import CommandPalette from '@/components/CommandPalette';
import ErrorBoundary from '@/components/ErrorBoundary';
import SentryInit from '@/components/SentryInit';
import { ThemeProvider } from '@/components/ThemeProvider';
import { GoogleAuthWrapper } from '@/components/GoogleAuthWrapper';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

// Required by the nonce-based CSP, and measured rather than assumed.
//
// A per-request nonce cannot reach a statically prerendered page: its HTML —
// including the inline hydration scripts Next.js emits — is written to disk at
// build time, long before any request exists. With /login prerendered, the
// Report-Only policy in proxy.ts reported 8 inline-script violations per page
// load; with this line, zero. That is the whole cost of removing
// 'unsafe-inline' from script-src, stated plainly:
//
//   every page is now server-rendered per request instead of served from a
//   prebuilt HTML file — more serverless invocations and a slower TTFB.
//
// It is cheap here because nearly every route is an auth-gated client
// component whose real content arrives from the API anyway; the prerendered
// HTML was an empty shell. Delete this line to get static rendering back, and
// expect the inline-script violations to return with it.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  metadataBase: new URL('https://619fitnessstudio.com'),
  title: {
    default: 'MY PT STUDIO — Operating System',
    template: '%s | MY PT STUDIO',
  },
  description:
    'MY PT STUDIO — the operating system for fitness professionals. Clients, workouts, nutrition, attendance, payments and analytics, beautifully unified.',
  alternates: { canonical: '/' },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    url: 'https://619fitnessstudio.com',
    siteName: 'MY PT STUDIO',
    type: 'website',
    title: 'MY PT STUDIO — Operating System',
    description: 'The operating system for fitness professionals — clients, workouts, nutrition, attendance, payments and analytics, beautifully unified.',
    images: [
      {
        url: '/icon-512.png',
        width: 512,
        height: 512,
        alt: 'MY PT STUDIO',
      },
    ],
  },
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent' },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Pinch-zoom is off, by product decision.
  //
  // These two lines were previously REMOVED on purpose, with the note "WCAG
  // 1.4.4: users must be able to resize text". That reasoning was sound and is
  // being overridden knowingly, not by accident, so the trade is written down
  // rather than quietly reversed: an operator running this on a studio iPad
  // kept zooming the layout by brushing the screen with two fingers, and a
  // half-zoomed till screen during a client's payment is its own kind of
  // unusable. Browser-level page zoom (desktop Ctrl +/-, and the OS-level
  // Zoom accessibility setting on iOS/Android) is unaffected by any of this
  // and remains the route for anyone who needs larger text.
  //
  // On their own these do nothing on an iPhone or iPad: Safari has ignored
  // user-scalable and maximum-scale since iOS 10, precisely because sites
  // abused them. They still matter for Android Chrome and desktop touch. The
  // iOS half is handled by /no-zoom.js, and double-tap by touch-action in
  // globals.css — all three are needed, none is sufficient alone.
  maximumScale: 1,
  userScalable: false,
  // iOS auto-zoom on inputs is prevented by ensuring font-size >= 16px on all inputs
  viewportFit: 'cover',
  // themeColor per scheme so the mobile browser chrome matches the app instead
  // of staying white behind a dark UI.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0F172A' },
  ],
  // The app genuinely supports both. Declaring 'light' told the browser to
  // render form controls, scrollbars and autofill in light styling even while
  // the UI was dark.
  colorScheme: 'light dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning is required, not cosmetic: the pre-paint theme
    // script below deliberately adds the `dark` class to <html> before React
    // hydrates, so the client element legitimately has an attribute the server
    // markup did not. This suppresses the warning for THIS element's attributes
    // only — it does not silence mismatches anywhere else in the tree.
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jetBrainsMono.variable}`}>
      <head>
        {/*
          Theme must be resolved BEFORE first paint. ThemeProvider applies the
          class in a useEffect, which runs after the browser has already painted
          — so a dark-mode user saw a full-page white flash on every load
          (measured: body painted #F8FAFC, then flipped to #0F172A).

          This blocking script is the standard fix: it runs synchronously in
          <head>, before any body content is painted, so the very first frame is
          already correct. It duplicates ThemeProvider's resolution order
          (stored preference wins over the system preference) and is wrapped in
          try/catch because localStorage throws in some privacy modes.

          It is an external file, NOT an inline script, and that is a security
          decision rather than a style one: author-written inline scripts are
          what force 'unsafe-inline' into script-src, and this was the only one
          left in the app. An external file needs only 'self'. The alternative
          — keeping it inline and stamping it with the request nonce — would
          mean calling headers() here, which is more machinery for eight lines
          of theme code.

          Render-blocking on purpose — no async/defer. It must complete before
          the first paint, and it is a handful of bytes served same-origin.
          eslint-disable next line: @next/next/no-sync-scripts exists to stop
          people accidentally blocking render. Here blocking IS the feature —
          a deferred theme script is just the flash of wrong theme all over
          again.
        */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/theme-init.js" />
        {/*
          Cancels the pinch gesture on iOS, where the viewport meta tag above is
          ignored — see /no-zoom.js. `defer` rather than blocking: unlike the
          theme script this has nothing to do with the first paint, and a
          gesture cannot happen before the page is interactive anyway.
        */}
        <script src="/no-zoom.js" defer />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="manifest" href="/manifest.json" />
        {/* Skip-to-content link (Accessibility — Issue #16) */}
        <style>{`.skip-link{position:absolute;top:-999px;left:0;z-index:9999;padding:8px 16px;background:#fff;color:#111;font-weight:600;border-radius:0 0 8px 0;}.skip-link:focus{top:0}`}</style>
      </head>
      <body>
        {/* Issue #17 — noscript fallback: JS is required for auth + face recognition */}
        <noscript>
          <div
            role="alert"
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--bg-white)', padding: '24px', textAlign: 'center',
            }}
          >
            <div>
              <strong style={{ fontSize: 20, display: 'block', marginBottom: 8 }}>
                JavaScript Required
              </strong>
              <p style={{ color: 'var(--text-muted)', maxWidth: 400 }}>
                MY PT STUDIO requires JavaScript for authentication and
                face-recognition check-in. Please enable JavaScript in your browser
                settings and reload the page.
              </p>
            </div>
          </div>
        </noscript>

        {/* Skip link for keyboard navigation (WCAG 2.4.1) */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        {/*
         * ErrorBoundary is outermost so a throw from AuthProvider's
         * effect still renders the fallback instead of a blank page.
         */}
        <GoogleAuthWrapper clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ''}>
          <ErrorBoundary>
            <ThemeProvider>
              <AuthProvider>
                <PermissionsProvider>
                  <FeaturesProvider>
                    <ToastProvider>
                      <LazyMotion features={domAnimation}>
                        <SentryInit />
                        {children}
                        <CommandPalette />
                      </LazyMotion>
                    </ToastProvider>
                  </FeaturesProvider>
                </PermissionsProvider>
              </AuthProvider>
            </ThemeProvider>
          </ErrorBoundary>
        </GoogleAuthWrapper>
      </body>
    </html>
  );
}
