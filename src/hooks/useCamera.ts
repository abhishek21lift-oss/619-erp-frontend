'use client';
/**
 * useCamera — manages webcam lifecycle with fixes for:
 * - Safari autoPlay policy (play() wrapped in catch)
 * - onloadedmetadata timeout rejecting with undefined
 * - Front camera selection on all devices
 * - Stream cleanup on stop
 */
import { useRef, useState, useCallback } from 'react';

export type CameraStatus = 'idle' | 'starting' | 'active' | 'denied' | 'error';

interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  status: CameraStatus;
  error: string;
  start: () => Promise<boolean>;
  stop: () => void;
  dimensions: { width: number; height: number };
}

export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [error, setError] = useState('');
  const [dimensions, setDimensions] = useState({ width: 640, height: 480 });

  const stop = useCallback(() => {
    try {
      streamRef.current?.getTracks().forEach(t => t.stop());
    } catch {}
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.load(); // force reset on Safari
    }
    setStatus('idle');
    setError('');
  }, []);

  const start = useCallback(async (): Promise<boolean> => {
    if (status === 'active') return true;
    setStatus('starting');
    setError('');

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Your browser does not support camera access. Use Chrome or Safari 14+.');
      setStatus('error');
      return false;
    }

    try {
      // Stop any existing stream first
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'user',
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 24, max: 30 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (!videoRef.current) {
        stream.getTracks().forEach(t => t.stop());
        setStatus('error');
        setError('Video element not available.');
        return false;
      }

      const video = videoRef.current;
      video.srcObject = stream;

      // FIX: properly typed timeout rejection
      await new Promise<void>((resolve, reject) => {
        let settled = false;
        const timer = window.setTimeout(() => {
          if (!settled) { settled = true; reject(new Error('Camera stream timed out')); }
        }, 8000);

        video.onloadedmetadata = () => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          setDimensions({
            width: video.videoWidth || 640,
            height: video.videoHeight || 480,
          });
          resolve();
        };

        video.onerror = (e) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          reject(new Error('Video element error'));
        };
      });

      // FIX: Safari autoplay — play() may throw NotAllowedError, catch and ignore
      try { await video.play(); } catch (playErr: any) {
        // Safari sometimes rejects play() even on muted video — the stream still works
        console.warn('[camera] play() failed (often benign on Safari):', playErr?.name);
      }

      setStatus('active');
      return true;
    } catch (err: any) {
      const name = err?.name ?? '';
      const msg = name === 'NotAllowedError' || name === 'PermissionDeniedError'
        ? 'Camera permission denied. Please allow camera access in your browser settings.'
        : name === 'NotFoundError' || name === 'DevicesNotFoundError'
        ? 'No camera found on this device.'
        : name === 'NotReadableError' || name === 'TrackStartError'
        ? 'Camera is in use by another application. Close it and try again.'
        : name === 'OverconstrainedError'
        ? 'Camera does not meet requirements. Try a different browser.'
        : (err?.message || 'Could not start camera. Please check your device.');
      setError(msg);
      setStatus(name === 'NotAllowedError' || name === 'PermissionDeniedError' ? 'denied' : 'error');
      return false;
    }
  }, [status, stop]);

  return { videoRef, status, error, start, stop, dimensions };
}
