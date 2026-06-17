'use client';
import dynamic from 'next/dynamic';

const FaceEnrollContent = dynamic(() => import('./FaceEnrollContent'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: 12, color: '#6b7280', fontSize: 14 }}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 0.9s linear infinite' }}>
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
      <span>Loading face enrollment…</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  ),
});

export default function FaceEnrollPage() {
  return <FaceEnrollContent />;
}
