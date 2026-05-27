'use client';
/**
 * FaceEnrollmentClient — next/dynamic SSR-safe wrapper for FaceEnrollmentPanel.
 *
 * face-api.js imports Node's `fs` module via a dead code path in its
 * createFileSystem.js entry. By wrapping with ssr:false, the entire
 * face-api.js + TensorFlow subtree is excluded from the server bundle
 * and from RSC traversal — eliminating the "Can't resolve 'fs'" warning
 * and any risk of hydration mismatch.
 */
import dynamic from 'next/dynamic';

const FaceEnrollmentPanel = dynamic(
  () => import('./FaceEnrollmentPanel'),
  {
    ssr: false,
    loading: () => (
      <div style={{
        borderRadius: 20,
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.6)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        padding: '48px 22px',
        textAlign: 'center',
        color: '#94a3b8',
        fontSize: 13,
      }}>
        Loading face enrollment…
      </div>
    ),
  }
);

export { FaceEnrollmentPanel as default };
export type { default as FaceEnrollmentPanelProps } from './FaceEnrollmentPanel';
