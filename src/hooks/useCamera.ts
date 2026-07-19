'use client';
import { useRef, useState, useCallback, useEffect } from 'react';

export type CameraStatus = 'idle' | 'starting' | 'active' | 'denied' | 'error';
export type FacingMode = 'user' | 'environment';

interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  status: CameraStatus;
  error: string;
  start: (facing?: FacingMode) => Promise<boolean>;
  stop: () => void;
  dimensions: { width: number; height: number };
  isMobile: boolean;
  facingMode: FacingMode;
}

function detectMobile() {
  if (typeof window === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    || window.innerWidth <= 768;
}

export function useCamera(): UseCameraReturn {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);
  const currentFacingRef = useRef<FacingMode>('user');
  const [status, setStatus]   = useState<CameraStatus>('idle');
  const [error,  setError]    = useState('');
  const [dimensions, setDimensions] = useState({ width: 640, height: 480 });
  const [isMobile, setIsMobile] = useState(false);
  const [facingMode, setFacingMode] = useState<FacingMode>('user');

  useEffect(() => { setIsMobile(detectMobile()); }, []);

  const stop = useCallback(() => {
    try { streamRef.current?.getTracks().forEach(t => t.stop()); } catch {}
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.load();
    }
    setStatus('idle');
    setError('');
  }, []);

  const startStream = useCallback(async (constraints: MediaStreamConstraints): Promise<MediaStream> => {
    return navigator.mediaDevices.getUserMedia(constraints);
  }, []);

  const start = useCallback(async (facing: FacingMode = 'user'): Promise<boolean> => {
    if (status === 'active' && currentFacingRef.current === facing) return true;
    setStatus('starting');
    setError('');

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Camera not supported. Use Chrome, Safari 14+, or Samsung Internet.');
      setStatus('error');
      return false;
    }

    try {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;

      const mobile = detectMobile();

      // Progressive constraint fallback:
      // 1. Ideal resolution + requested camera (front for face scan, rear for QR)
      // 2. Just the requested camera (no resolution hints — avoids OverconstrainedError on many Androids)
      // 3. Any video (last resort for old devices / desktops with one camera)
      const constraintOptions: MediaStreamConstraints[] = [
        {
          video: {
            facingMode: facing,
            width:  { ideal: mobile ? 480 : 640 },
            height: { ideal: mobile ? 640 : 480 },
            frameRate: { ideal: mobile ? 15 : 24, max: mobile ? 20 : 30 },
          },
          audio: false,
        },
        { video: { facingMode: facing }, audio: false },
        { video: true, audio: false },
      ];

      let stream: MediaStream | null = null;
      let lastErr: unknown = null;

      for (const c of constraintOptions) {
        try { stream = await startStream(c); break; }
        catch (e) { lastErr = e; }
      }

      if (!stream) throw lastErr ?? new Error('Could not access camera');
      streamRef.current = stream;

      if (!videoRef.current) {
        stream.getTracks().forEach(t => t.stop());
        setStatus('error');
        setError('Video element not ready.');
        return false;
      }

      const video = videoRef.current;
      video.srcObject = stream;

      await new Promise<void>((resolve, reject) => {
        let settled = false;
        // iOS/Android can be slow to warm up — give 12s
        const timer = window.setTimeout(() => {
          if (!settled) { settled = true; reject(new Error('Camera stream timed out')); }
        }, 12_000);

        video.onloadedmetadata = () => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          setDimensions({ width: video.videoWidth || 640, height: video.videoHeight || 480 });
          resolve();
        };

        video.onerror = () => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          reject(new Error('Video element error'));
        };
      });

      // Safari sometimes rejects play() on muted video — safe to ignore
      try { await video.play(); } catch (e: any) {
        console.warn('[camera] play() suppressed (Safari):', e?.name);
      }

      currentFacingRef.current = facing;
      setFacingMode(facing);
      setStatus('active');
      return true;
    } catch (err: any) {
      const name = err?.name ?? '';
      const msg =
        name === 'NotAllowedError' || name === 'PermissionDeniedError'
          ? 'Camera permission denied. Tap the lock icon in your browser address bar to allow camera access.'
          : name === 'NotFoundError' || name === 'DevicesNotFoundError'
          ? 'No camera found. Make sure a camera is connected and not covered.'
          : name === 'NotReadableError' || name === 'TrackStartError'
          ? 'Camera is busy. Close other apps using the camera and try again.'
          : name === 'OverconstrainedError'
          ? 'Camera setup failed. Try reloading the page.'
          : (err?.message || 'Could not start camera. Try reloading the page.');
      setError(msg);
      setStatus(name === 'NotAllowedError' || name === 'PermissionDeniedError' ? 'denied' : 'error');
      return false;
    }
  }, [status, startStream]);

  // Restart camera on orientation change (phone rotation)
  useEffect(() => {
    const handler = () => {
      if (status !== 'active') return;
      // Brief delay for the browser to finish rotating
      setTimeout(() => {
        if (videoRef.current && streamRef.current) {
          const track = streamRef.current.getVideoTracks()[0];
          if (track) {
            const settings = track.getSettings();
            setDimensions({
              width: settings.width || videoRef.current.videoWidth || 640,
              height: settings.height || videoRef.current.videoHeight || 480,
            });
          }
        }
      }, 400);
    };
    window.addEventListener('orientationchange', handler);
    return () => window.removeEventListener('orientationchange', handler);
  }, [status]);

  return { videoRef, status, error, start, stop, dimensions, isMobile, facingMode };
}
