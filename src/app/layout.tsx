import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { LazyMotion, domAnimation } from 'framer-motion';
import { AuthProvider } from '@/lib/auth-context';
import { ToastProvider } from '@/lib/toast';
import { PermissionsProvider } from '@/lib/permissions-context';
import CommandPalette from '@/components/CommandPalette';
import AIAssistant from '@/components/AIAssistant';
import ErrorBoundary from '@/components/ErrorBoundary';
import CapacitorInit from '@/components/CapacitorInit';
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
  metadataBase: new URL('https://coachabhishek.in'),
  title: {
    default: 'Coach Abhishek — Personal Training Suite',
    template: '%s | Coach Abhishek',
  },
  description:
    'Coach Abhishek — Your personal training management suite. Track clients, sessions, progress, and payments in one place.',
  alternates: { canonical: '/' },
  icons: {
    icon: [
      { url: '/logo.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/logo.png',
  },
  openGraph: {
    url: 'https://coachabhishek.in',
    siteName: 'Coach Abhishek',
    type: 'website',
    title: 'Coach Abhishek — Personal Training Suite',
    description: 'Your personal training management suite. Track clients, sessions, progress, and payments.',
    images: [
      {
        url: '/619-logo.png',
        width: 1200,
        height: 630,
        alt: 'Coach Abhishek Training Suite',
      },
    ],
  },
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent' },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
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
        <style>{`.skip-link{position:absolute;top:-999px;left:0;z-index:9999;padding:8px 16px;background:#fff;color:#111;font-weight:600;border-radius:0 0 8px 0;}.skip-link:focus{top:0}`}</style>
      </head>
      <body>
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
                Coach Abhishek Training Suite requires JavaScript for authentication and
                face-recognition check-in. Please enable JavaScript in your browser
                settings and reload the page.
              </p>
            </div>
          </div>
        </noscript>

        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        <GoogleAuthWrapper clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ''}>
          <ErrorBoundary>
            <ThemeProvider>
              <AuthProvider>
                <PermissionsProvider>
                  <ToastProvider>
                    <LazyMotion features={domAnimation}>
                      <CapacitorInit />
                      {children}
                      <CommandPalette />
                      <AIAssistant />
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
