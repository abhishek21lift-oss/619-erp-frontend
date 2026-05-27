'use client';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';

export default function RootError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <Guard>
      <AppShell>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
          <div style={{ fontSize: 48, color: '#f87171' }}>!</div>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: '#0f172a' }}>Something went wrong</h2>
          <p style={{ fontSize: 14, color: '#64748b', textAlign: 'center', maxWidth: 400 }}>
            {error.message || 'An unexpected error occurred. Please try again.'}
          </p>
          <button
            onClick={reset}
            style={{
              padding: '8px 20px', borderRadius: 8, border: 'none',
              background: '#7c3aed', color: '#fff', fontSize: 14, cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </AppShell>
    </Guard>
  );
}