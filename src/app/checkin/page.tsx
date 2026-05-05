'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Camera, Scan, User, Search, CheckCircle2, XCircle, Loader2, RefreshCw, AlertTriangle, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import { fmtDate } from '@/lib/format';

export default function CheckInPage() {
  return <Guard><CheckInContent /></Guard>;
}

type CheckInRecord = { id: string; name: string; time: string; status: 'success' | 'manual'; memberId?: string; };
type ScanState = 'idle' | 'loading_models' | 'scanning' | 'detected' | 'checking_in' | 'success' | 'error' | 'no_camera';

function CheckInContent() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const faceApiRef = useRef<any>(null);

  const [scanState, setScanState] = useState<ScanState>('idle');
  const [scanMsg, setScanMsg] = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [manualChecking, setManualChecking] = useState(false);

  // Load clients and saved check-ins
  useEffect(() => {
    api.clients.list({ status: 'active', limit: 500 })
      .then((r: any) => setClients(Array.isArray(r) ? r : (r?.clients ?? [])))
      .catch(() => {});
    const saved = localStorage.getItem('619_checkins_today');
    if (saved) {
      try { setCheckIns(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, []);

  // Search clients
  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }
    const s = search.toLowerCase();
    setSearchResults(
      clients.filter(c =>
        c.name?.toLowerCase().includes(s) ||
        (c.mobile || '').includes(s) ||
        (c.member_code || '').toLowerCase().includes(s)
      ).slice(0, 6)
    );
  }, [search, clients]);

  function saveCheckIns(list: CheckInRecord[]) {
    setCheckIns(list);
    localStorage.setItem('619_checkins_today', JSON.stringify(list));
  }

  function recordCheckIn(client: any, status: 'success' | 'manual' = 'manual') {
    const rec: CheckInRecord = {
      id: Math.random().toString(36).slice(2),
      name: client.name,
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      status,
      memberId: client.id,
    };
    saveCheckIns([rec, ...checkIns.slice(0, 19)]);
  }

  async function manualCheckIn(client: any) {
    setManualChecking(true);
    setSearch('');
    setSearchResults([]);
    await new Promise(r => setTimeout(r, 500)); // brief animation
    recordCheckIn(client, 'manual');
    setManualChecking(false);
  }

  async function startCamera() {
    setCameraActive(true);
    setScanState('loading_models');
    setScanMsg('Starting camera…');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanState('scanning');
      setScanMsg('Position your face in the frame');
    } catch {
      setScanState('no_camera');
      setScanMsg('Camera access denied or not available');
      setCameraActive(false);
    }
  }

  function stopCamera() {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraActive(false);
    setScanState('idle');
    setScanMsg('');
  }

  const statusConfig: Record<ScanState, { color: string; icon: any; label: string }> = {
    idle:           { color: '#94a3b8', icon: Scan,         label: 'Ready to scan' },
    loading_models: { color: '#3b82f6', icon: Loader2,      label: 'Loading…' },
    scanning:       { color: '#6366f1', icon: Scan,         label: 'Scanning' },
    detected:       { color: '#f59e0b', icon: User,         label: 'Face detected' },
    checking_in:    { color: '#3b82f6', icon: Loader2,      label: 'Checking in…' },
    success:        { color: '#22c55e', icon: CheckCircle2, label: 'Checked in!' },
    error:          { color: '#ef4444', icon: XCircle,      label: 'Not recognized' },
    no_camera:      { color: '#ef4444', icon: AlertTriangle,label: 'No camera' },
  };

  const sc = statusConfig[scanState];

  return (
    <AppShell>
      <div className="page-main page-enter">
        <div className="page-content">

          {/* Page header */}
          <div className="checkin-page-header">
            <div>
              <h1 className="checkin-title">Member Check-In</h1>
              <p className="checkin-subtitle">Face recognition or manual search</p>
            </div>
            <div className="checkin-today-badge">
              <Clock size={14} />
              <span>{checkIns.length} check-ins today</span>
            </div>
          </div>

          <div className="checkin-layout">

            {/* Left: Camera panel */}
            <div className="checkin-camera-panel card">
              <div className="checkin-camera-header">
                <Camera size={16} />
                <span>Face Recognition</span>
              </div>

              <div className="checkin-viewport">
                {cameraActive ? (
                  <>
                    <video ref={videoRef} className="checkin-video" muted playsInline />
                    <canvas ref={canvasRef} className="checkin-canvas" />
                    {/* SVG corner frame */}
                    <svg className="checkin-frame" viewBox="0 0 300 300">
                      {/* Top-left */}
                      <path d="M20,50 L20,20 L50,20" fill="none" stroke={sc.color} strokeWidth="3" strokeLinecap="round"/>
                      {/* Top-right */}
                      <path d="M250,20 L280,20 L280,50" fill="none" stroke={sc.color} strokeWidth="3" strokeLinecap="round"/>
                      {/* Bottom-left */}
                      <path d="M20,250 L20,280 L50,280" fill="none" stroke={sc.color} strokeWidth="3" strokeLinecap="round"/>
                      {/* Bottom-right */}
                      <path d="M280,250 L280,280 L250,280" fill="none" stroke={sc.color} strokeWidth="3" strokeLinecap="round"/>
                    </svg>
                  </>
                ) : (
                  <div className="checkin-placeholder">
                    <div className="checkin-placeholder-icon">
                      <Camera size={48} color="#94a3b8" />
                    </div>
                    <p className="checkin-placeholder-text">Camera inactive</p>
                    <p className="checkin-placeholder-sub">Enable camera for face recognition check-in</p>
                  </div>
                )}
              </div>

              {/* Status bar */}
              <div className="checkin-status-bar" style={{ borderColor: sc.color + '40', background: sc.color + '10' }}>
                <div className="checkin-status-dot" style={{ background: sc.color }} />
                <span style={{ color: sc.color, fontWeight: 600, fontSize: '0.85rem' }}>{sc.label}</span>
                {scanMsg && <span className="checkin-status-msg">{scanMsg}</span>}
              </div>

              {/* Camera controls */}
              <div className="checkin-camera-controls">
                {!cameraActive ? (
                  <button className="btn btn-primary btn-block" onClick={startCamera}>
                    <Camera size={16} /> Start Camera
                  </button>
                ) : (
                  <button className="btn btn-ghost btn-block" onClick={stopCamera}>
                    <XCircle size={16} /> Stop Camera
                  </button>
                )}
              </div>

              <div className="checkin-privacy-note">
                <AlertTriangle size={12} />
                <span>Camera feed is processed locally. No images are stored.</span>
              </div>
            </div>

            {/* Right: Manual + Recent */}
            <div className="checkin-right">

              {/* Manual check-in */}
              <div className="card checkin-manual-panel">
                <div className="checkin-manual-header">
                  <Search size={16} />
                  <span>Manual Check-In</span>
                </div>
                <div className="checkin-search-wrap">
                  <Search size={14} className="checkin-search-icon" />
                  <input
                    className="checkin-search-input"
                    placeholder="Search by name, ID, or mobile…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                {searchResults.length > 0 && (
                  <div className="checkin-results">
                    {searchResults.map(c => (
                      <button key={c.id} className="checkin-result-row" onClick={() => manualCheckIn(c)}>
                        <div className="checkin-result-avatar">{c.name?.slice(0,2).toUpperCase()}</div>
                        <div className="checkin-result-info">
                          <div className="checkin-result-name">{c.name}</div>
                          <div className="checkin-result-meta">{c.member_code || c.client_id} · {c.package_type || 'Member'}</div>
                        </div>
                        <span className={`badge badge-${c.status}`}>{c.status}</span>
                      </button>
                    ))}
                  </div>
                )}
                {manualChecking && (
                  <div className="checkin-checking-msg">
                    <Loader2 size={14} className="spin" /> Checking in…
                  </div>
                )}
              </div>

              {/* Recent check-ins */}
              <div className="card" style={{ marginTop: '1rem' }}>
                <div className="card-header-row">
                  <span className="card-title"><Clock size={15} /> Recent Check-ins</span>
                  {checkIns.length > 0 && (
                    <button className="btn-link" onClick={() => saveCheckIns([])}>Clear</button>
                  )}
                </div>
                <div className="checkin-history">
                  {checkIns.length === 0 ? (
                    <div className="checkin-empty">No check-ins recorded yet today</div>
                  ) : (
                    checkIns.map(r => (
                      <div key={r.id} className="checkin-history-row">
                        <div className="checkin-history-avatar">{r.name.slice(0,2).toUpperCase()}</div>
                        <div className="checkin-history-info">
                          <div className="checkin-history-name">{r.name}</div>
                          <div className="checkin-history-time">{r.time}</div>
                        </div>
                        <span className={`checkin-badge-${r.status}`}>
                          {r.status === 'success' ? <CheckCircle2 size={14} /> : <User size={14} />}
                          {r.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
