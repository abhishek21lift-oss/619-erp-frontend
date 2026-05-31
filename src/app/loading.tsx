export default function RootLoading() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          border: '3px solid #e2e8f0', borderTopColor: '#7c3aed',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Loading...</p>
      </div>
    </div>
  );
}