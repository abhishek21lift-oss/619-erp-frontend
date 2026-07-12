'use client';
/**
 * Kiosk Mode — Full-screen self check-in terminal.
 *
 * Dual-mode: Face Recognition + QR Code scanning.
 * Designed for a tablet/touchscreen placed at gym entrance.
 *
 * Features:
 * - Full-screen, no nav chrome
 * - Auto-cycling between face and QR modes
 * - Large touch-friendly UI
 * - Voice announcements
 * - Auto-reset after 7s
 *
 * URL: /checkin/kiosk
 * Requires kiosk token OR authenticated session.
 */
import dynamic from 'next/dynamic';

// SSR must be disabled — face-api.js + jsQR both need browser APIs
const KioskContent = dynamic(() => import('./KioskContent'), {
  ssr: false,
  loading: () => (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'spin 1.2s linear infinite' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
      </div>
      <p style={{ color: '#6b7280', fontSize: 14, fontFamily: 'system-ui, sans-serif' }}>Loading kiosk…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  ),
});

export default function KioskPage() {
  return <KioskContent />;
}
