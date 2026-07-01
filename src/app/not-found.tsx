import Link from 'next/link';

export default function NotFound() {
  return (
    <>
      <a href="#main-content" className="skip-link" style={{ position: 'absolute', top: '-999px', left: 0, zIndex: 9999, padding: '8px 16px', background: '#fff', color: '#111', fontWeight: 600, borderRadius: '0 0 8px 0' }}>
        Skip to main content
      </a>
      <div id="main-content"
        style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Inter, sans-serif',
          background: '#f5f4f0',
          padding: '24px',
          textAlign: 'center',
        }}
      >
      <div
        style={{
          fontSize: 96,
          fontWeight: 900,
          letterSpacing: '-0.04em',
          color: '#F59E0B',
          lineHeight: 1,
          marginBottom: 16,
        }}
      >
        404
      </div>
      <h1
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: '#1a1a1a',
          marginBottom: 8,
        }}
      >
        Page not found
      </h1>
      <p
        style={{
          fontSize: 14,
          color: '#6b7280',
          maxWidth: 360,
          marginBottom: 32,
          lineHeight: 1.6,
        }}
      >
        The page you’re looking for doesn’t exist or has been moved.
        Check the URL or head back to the app.
      </p>
      <Link
        href="/pt-os"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 24px',
          background: 'linear-gradient(135deg,#F59E0B,#D97706)',
          color: '#fff',
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 700,
          textDecoration: 'none',
          boxShadow: '0 4px 14px rgba(245,158,11,0.35)',
        }}
      >
        ← Go to Dashboard
      </Link>
      </div>
    </>
  );
}
