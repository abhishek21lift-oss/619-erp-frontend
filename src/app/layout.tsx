import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { LazyMotion, domAnimation } from 'framer-motion';
import { AuthProvider } from '@/lib/auth-context';
import { ToastProvider } from '@/lib/toast';
import { PermissionsProvider } from '@/lib/permissions-context';
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

export const metadata: Metadata = {
  metadataBase: new URL('https://619fitness.in'),
  title: {
    default: 'MY PT STUDIO — Operating System',
    template: '%s | MY PT STUDIO',
  },
  description:
    'MY PT STUDIO — the operating system for fitness professionals. Clients, workouts, nutrition, attendance, payments and analytics, beautifully unified.',
  alternates: { canonical: '/' },
  icons: {
    icon: [
      { url: '/logo.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/logo.png',
  },
  openGraph: {
    url: 'https://619fitness.in',
    siteName: 'MY PT STUDIO',
    type: 'website',
    title: 'MY PT STUDIO — Operating System',
    description: 'The operating system for fitness professionals — clients, workouts, nutrition, attendance, payments and analytics, beautifully unified.',
    images: [
      {
        url: '/619-logo.png',
        width: 1200,
        height: 630,
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
  // maximumScale removed — WCAG 1.4.4: users must be able to resize text
  // iOS auto-zoom on inputs is prevented by ensuring font-size >= 16px on all inputs
  viewportFit: 'cover',
  themeColor: '#ffffff',
  colorScheme: 'light',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetBrainsMono.variable}`}>
      <head>
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
                  <ToastProvider>
                    <LazyMotion features={domAnimation}>
                      <SentryInit />
                      {children}
                      <CommandPalette />
                    </LazyMotion>
                  </ToastProvider>
                </PermissionsProvider>
              </AuthProvider>
            </ThemeProvider>
          </ErrorBoundary>
        </GoogleAuthWrapper>
      </body>
    </html>
  );
}
