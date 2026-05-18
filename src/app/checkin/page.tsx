/**
 * Face Check-In Page
 *
 * CheckInContent (and therefore useFaceDetection) is dynamically imported
 * with ssr: false. This means:
 *  - @tensorflow/tfjs and face-api.js are NEVER evaluated during SSR
 *  - They are NEVER included in the server-side bundle
 *  - They load as a separate lazy chunk ONLY when this page is visited
 *  - LCP on all other pages is completely unaffected
 *
 * The actual CheckInContent component lives below the dynamic() call.
 */
import dynamic from 'next/dynamic';
import Guard from '@/components/Guard';

// This single line is the key: ssr:false excludes the entire component
// tree (including useFaceDetection, tf, face-api) from the SSR bundle.
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

export default function CheckInPage() {
  return <Guard><CheckInContent /></Guard>;
}
