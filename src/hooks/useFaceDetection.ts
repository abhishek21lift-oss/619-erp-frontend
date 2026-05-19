'use client';
/**
 * useFaceDetection — face-api.js wrapper
 *
 * Protection layers:
 *  1. 'use client' — never evaluated on the server
 *  2. getFaceApi() guards with typeof window before any dynamic import
 *  3. CheckInClient wraps CheckInContent in next/dynamic with ssr:false,
 *     excluding this entire module tree from the SSR bundle
 *  4. next.config.js marks face-api.js + tfjs as webpack server externals
 *     (defense-in-depth for the RSC bundle pass)
 *
 * faceApiRef is typed as the resolved module type, imported lazily so
 * the static import never reaches the server bundler.
 */
import { useRef, useState, useCallback, useEffect } from 'react';
import type { FaceDescriptorEntry, DetectionResult } from '@/types/checkin';

// Lazy type — only used at runtime after the dynamic import resolves.
// We use `typeof import('face-api.js')` so TypeScript can check call sites
// without actually bundling face-api.js at static analysis time.
type FaceApiModule = typeof import('face-api.js');

// Concrete shape we extract from each detection result.
// Defined here once so the loop body stays readable.
type FaceDetection = {
  detection: { box: { x: number; y: number; width: number; height: number } };
  landmarks?: { positions?: Array<{ x: number; y: number }> };
  descriptor?: Float32Array;
};

const MODEL_SOURCES = [
  '/models',
  '/face-models',
  'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model',
];

const RECOGNITION_THRESHOLD = 0.50;
const DETECTION_INTERVAL_MS = 150;
const MIN_FACE_SIZE_PX = 60;

type ModelStatus = 'idle' | 'loading' | 'ready' | 'error';

interface UseFaceDetectionReturn {
  modelStatus: ModelStatus;
  modelError: string;
  loadModels: () => Promise<boolean>;
  startDetectionLoop: (
    videoEl: HTMLVideoElement,
    canvasEl: HTMLCanvasElement,
    onDetection: (result: DetectionResult) => void
  ) => void;
  stopDetectionLoop: () => void;
  matchDescriptor: (
    descriptor: Float32Array,
    storedDescriptors: FaceDescriptorEntry[]
  ) => { matched: boolean; entry?: FaceDescriptorEntry; distance: number };
}

export function useFaceDetection(): UseFaceDetectionReturn {
  const [modelStatus, setModelStatus] = useState<ModelStatus>('idle');
  const [modelError, setModelError] = useState('');

  const modelStatusRef = useRef<ModelStatus>('idle');
  const setModelStatusSync = (s: ModelStatus) => {
    modelStatusRef.current = s;
    setModelStatus(s);
  };

  // Typed as FaceApiModule | null — eliminates all `any` usage below
  const faceApiRef = useRef<FaceApiModule | null>(null);
  const rafRef = useRef<number>(0);
  const lastRunRef = useRef<number>(0);
  const processingRef = useRef(false);
  const detectorRef = useRef<'ssd' | 'tiny'>('tiny');

  const getFaceApi = useCallback(async (): Promise<FaceApiModule> => {
    if (faceApiRef.current) return faceApiRef.current;
    // Safety guard — should never reach here on server due to ssr:false wrapper
    if (typeof window === 'undefined') throw new Error('Browser only');

    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua) || isIOS;

    const tf = await import('@tensorflow/tfjs');

    try {
      if (isIOS || isSafari) {
        await tf.setBackend('cpu');
      } else {
        try {
          await tf.setBackend('webgl');
          await tf.ready();
          const test = tf.tensor1d([1, 2, 3]);
          test.dispose();
        } catch {
          await tf.setBackend('cpu');
        }
      }
      await tf.ready();
      console.info('[face] tf backend:', tf.getBackend());
    } catch {
      try { await tf.setBackend('cpu'); await tf.ready(); } catch { /* ignore */ }
    }

    const faceapi = await import('face-api.js');
    faceApiRef.current = faceapi;
    return faceapi;
  }, []);

  const loadOne = useCallback(async (faceapi: FaceApiModule, base: string) => {
    const url = base.replace(/\/$/, '');
    console.info('[face] trying model source:', url);

    const withTimeout = <T>(p: Promise<T>, label: string, ms = 15000): Promise<T> =>
      Promise.race([
        p,
        new Promise<T>((_, r) =>
          setTimeout(() => r(new Error(`timeout:${label}`)), ms)
        ),
      ]);

    await withTimeout(faceapi.nets.tinyFaceDetector.loadFromUri(url), 'tinyFaceDetector');
    await withTimeout(faceapi.nets.faceLandmark68Net.loadFromUri(url), 'faceLandmark68Net');
    await withTimeout(faceapi.nets.faceRecognitionNet.loadFromUri(url), 'faceRecognitionNet');

    try {
      await withTimeout(faceapi.nets.ssdMobilenetv1.loadFromUri(url), 'ssdMobilenetv1', 20000);
      detectorRef.current = 'ssd';
      console.info('[face] SSD loaded — using SSD detector');
    } catch {
      detectorRef.current = 'tiny';
      console.warn('[face] SSD unavailable, using TinyFaceDetector only');
    }

    console.info('[face] models ready from', url, '| detector:', detectorRef.current);
  }, []);

  const loadModels = useCallback(async (): Promise<boolean> => {
    if (modelStatusRef.current === 'ready') return true;
    if (modelStatusRef.current === 'loading') {
      return new Promise((resolve) => {
        const check = setInterval(() => {
          if (modelStatusRef.current === 'ready') { clearInterval(check); resolve(true); }
          if (modelStatusRef.current === 'error') { clearInterval(check); resolve(false); }
        }, 100);
      });
    }

    setModelStatusSync('loading');
    setModelError('');

    try {
      const faceapi = await getFaceApi();
      let lastErr: unknown = null;
      for (const source of MODEL_SOURCES) {
        try {
          await loadOne(faceapi, source);
          setModelStatusSync('ready');
          return true;
        } catch (e) {
          lastErr = e;
          console.warn('[face] source failed:', source, e);
        }
      }
      throw lastErr ?? new Error('All model sources failed');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not load face recognition models';
      setModelError(msg);
      setModelStatusSync('error');
      console.error('[face] model load failed:', err);
      return false;
    }
  }, [getFaceApi, loadOne]);

  const stopDetectionLoop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    processingRef.current = false;
  }, []);

  const startDetectionLoop = useCallback((
    videoEl: HTMLVideoElement,
    canvasEl: HTMLCanvasElement,
    onDetection: (result: DetectionResult) => void
  ) => {
    if (!faceApiRef.current) {
      console.error('[face] startDetectionLoop called before models loaded');
      return;
    }
    cancelAnimationFrame(rafRef.current);
    processingRef.current = false;

    const faceapi = faceApiRef.current;

    const loop = async (timestamp: number) => {
      rafRef.current = requestAnimationFrame(loop);

      if (timestamp - lastRunRef.current < DETECTION_INTERVAL_MS) return;
      if (processingRef.current) return;
      if (!videoEl || videoEl.readyState < 2) return;
      if (videoEl.paused || videoEl.ended) return;

      lastRunRef.current = timestamp;
      processingRef.current = true;

      try {
        const vw = videoEl.videoWidth;
        const vh = videoEl.videoHeight;
        if (vw > 0 && vh > 0) {
          if (canvasEl.width !== vw) canvasEl.width = vw;
          if (canvasEl.height !== vh) canvasEl.height = vh;
        }

        const ctx = canvasEl.getContext('2d');
        ctx?.clearRect(0, 0, canvasEl.width, canvasEl.height);

        // Collect all detections into a typed array.
        // Try SSD first (more accurate); fall back to TinyFaceDetector.
        // Both detector paths return the same shape via withFaceDescriptors().
        let dArr: FaceDetection[] = [];

        if (detectorRef.current === 'ssd') {
          try {
            dArr = (await faceapi
              .detectAllFaces(videoEl, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.40 }))
              .withFaceLandmarks()
              .withFaceDescriptors()) as FaceDetection[];
          } catch (e) {
            console.warn('[face] SSD failed, switching to tiny:', e);
            detectorRef.current = 'tiny';
          }
        }

        if (dArr.length === 0) {
          dArr = (await faceapi
            .detectAllFaces(videoEl, new faceapi.TinyFaceDetectorOptions({
              inputSize: 320,
              scoreThreshold: 0.40,
            }))
            .withFaceLandmarks()
            .withFaceDescriptors()) as FaceDetection[];
        }

        if (dArr.length === 0) {
          onDetection({ detected: false, multipleFaces: false });
          processingRef.current = false;
          return;
        }

        if (dArr.length > 1) {
          if (ctx) {
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.setLineDash([]);
            dArr.forEach((d) => {
              const b = d.detection.box;
              ctx.strokeRect(b.x, b.y, b.width, b.height);
            });
          }
          onDetection({ detected: true, multipleFaces: true });
          processingRef.current = false;
          return;
        }

        const det = dArr[0];
        const box = det.detection.box;

        if (box.width < MIN_FACE_SIZE_PX) {
          onDetection({ detected: false, multipleFaces: false });
          processingRef.current = false;
          return;
        }

        if (ctx) {
          ctx.strokeStyle = '#6366f1';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([6, 3]);
          ctx.strokeRect(box.x, box.y, box.width, box.height);
          ctx.setLineDash([]);
          ctx.fillStyle = 'rgba(99,102,241,0.07)';
          ctx.fillRect(box.x, box.y, box.width, box.height);

          const cl = 14;
          ctx.strokeStyle = '#818cf8';
          ctx.lineWidth = 3;
          ctx.setLineDash([]);
          ([[box.x, box.y], [box.x + box.width, box.y],
            [box.x, box.y + box.height], [box.x + box.width, box.y + box.height]
          ] as [number, number][]).forEach(([cx, cy], i) => {
            ctx.beginPath();
            ctx.moveTo(cx + (i % 2 === 0 ? cl : -cl), cy);
            ctx.lineTo(cx, cy);
            ctx.lineTo(cx, cy + (i < 2 ? cl : -cl));
            ctx.stroke();
          });
        }

        const landmarks =
          det.landmarks?.positions?.map?.((p) => ({ x: p.x, y: p.y })) ?? [];

        onDetection({
          detected: true,
          multipleFaces: false,
          box: { x: box.x, y: box.y, width: box.width, height: box.height },
          descriptor: det.descriptor,
          landmarks,
        });
      } catch (err) {
        console.error('[face] detect loop error:', err);
      } finally {
        processingRef.current = false;
      }
    };

    rafRef.current = requestAnimationFrame(loop);
  }, []);

  const matchDescriptor = useCallback((
    descriptor: Float32Array,
    storedDescriptors: FaceDescriptorEntry[]
  ) => {
    if (!faceApiRef.current || storedDescriptors.length === 0)
      return { matched: false, distance: Infinity };

    let bestDistance = Infinity;
    let bestEntry: FaceDescriptorEntry | undefined;

    for (const entry of storedDescriptors) {
      const stored = new Float32Array(entry.descriptor);
      const dist: number = faceApiRef.current.euclideanDistance(descriptor, stored);
      if (dist < bestDistance) { bestDistance = dist; bestEntry = entry; }
    }

    return {
      matched: bestDistance < RECOGNITION_THRESHOLD,
      entry: bestEntry,
      distance: bestDistance,
    };
  }, []);

  useEffect(() => () => { stopDetectionLoop(); }, [stopDetectionLoop]);

  return {
    modelStatus,
    modelError,
    loadModels,
    startDetectionLoop,
    stopDetectionLoop,
    matchDescriptor,
  };
}
