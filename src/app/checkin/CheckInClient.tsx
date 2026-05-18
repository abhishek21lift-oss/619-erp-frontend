'use client';
/**
 * CheckInClient
 *
 * This is a Client Component — the ONLY place allowed to use
 * next/dynamic with ssr: false (Turbopack enforces this).
 *
 * CheckInContent (and therefore useFaceDetection, tf, face-api.js)
 * are lazy-loaded here, completely excluded from the SSR bundle.
 */
import dynamic from 'next/dynamic';

const CheckInContent = dynamic(
  () => import('./CheckInContent'),
  {
    ssr: false,
    loading: () => (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '60vh', flexDirection: 'column', gap: 12,
        color: 'var(--text-muted, #6b7280)', fontSize: 14,
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          style={{ animation: 'spin 0.9s linear infinite' }}>
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        <span>Loading face recognition…</span>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    ),
  }
);

export default function CheckInClient() {
  return <CheckInContent />;
}
