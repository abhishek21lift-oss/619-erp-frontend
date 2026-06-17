'use client';
/**
 * useFaceDetection — @vladmandic/face-api wrapper
 *
 * Protection layers:
 *  1. 'use client' — never evaluated on the server
 *  2. getFaceApi() guards with typeof window before any dynamic import
 *  3. CheckInClient wraps CheckInContent in next/dynamic with ssr:false,
 *     excluding this entire module tree from the SSR bundle
 *  4. next.config.js marks @vladmandic/face-api + tfjs as webpack server externals
 *     (defense-in-depth for the RSC bundle pass)
 */
import { useRef, useState, useCallback, useEffect } from 'react';
import type { FaceDescriptorEntry, DetectionResult } from '@/types/checkin';

type FaceApiModule = typeof import('@vladmandic/face-api');

type FaceDetection = {
  detection: { box: { x: number; y: number; width: number; height: number } };
  landmarks?: { positions?: Array<{ x: number; y: number }> };
  descriptor?: Float32Array;
};

// Local public/ directory first, then the npm package CDN as fallback.
const MODEL_SOURCES = [
  '/models',
  'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model',
];

const RECOGNITION_THRESHOLD = 0.50;
const MIN_FACE_SIZE_PX = 60;

// Mobile gets a slower interval and smaller input to keep UI responsive
const isMobileDevice = () =>
  typeof window !== 'undefined' &&
  (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.innerWidth <= 768);

const DETECTION_INTERVAL_MS = isMobileDevice() ? 220 : 150;
const TINY_INPUT_SIZE       = isMobileDevice() ? 160 : 320;

// Generous timeouts — face_recognition_model.bin is 6 MB
const TIMEOUT_TF_INIT_MS   = 12_000;
const TIMEOUT_MODEL_MS     = 45_000;
const TIMEOUT_SSD_MS       = 30_000;

type ModelStatus = 'idle' | 'loading' | 'ready' | 'error';

interface UseFaceDetectionReturn {
  modelStatus: ModelStatus;
  modelError: string;
  loadingModel: string;
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

function withTimeout<T>(p: Promise<T>, label: string, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timed out loading ${label} after ${ms / 1000}s`)), ms)
    ),
  ]);
}

export function useFaceDetection(): UseFaceDetectionReturn {
  const [modelStatus, setModelStatus] = useState<ModelStatus>('idle');
  const [modelError, setModelError]   = useState('');
  const [loadingModel, setLoadingModel] = useState('');

  const modelStatusRef  = useRef<ModelStatus>('idle');
  const faceApiRef      = useRef<FaceApiModule | null>(null);
  const rafRef          = useRef<number>(0);
  const lastRunRef      = useRef<number>(0);
  const processingRef   = useRef(false);
  const detectorRef     = useRef<'ssd' | 'tiny'>('tiny');

  const setStatus = (s: ModelStatus) => {
    modelStatusRef.current = s;
    setModelStatus(s);
  };

  // Reset everything — called on error so next loadModels() starts fresh
  const resetState = useCallback(() => {
    faceApiRef.current = null;  // force re-import + TF re-init on retry
    setStatus('idle');
    setModelError('');
    setLoadingModel('');
  }, []);

  const getFaceApi = useCallback(async (): Promise<FaceApiModule> => {
    if (faceApiRef.current) return faceApiRef.current;
    if (typeof window === 'undefined') throw new Error('Browser only');

    const faceapi = await import('@vladmandic/face-api');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tf = faceapi.tf as any;

    // tf.ready() can hang forever in some environments — always race with a timeout.
    try {
      await withTimeout(
        (async () => { await tf.setBackend('webgl'); await tf.ready(); })(),
        'TF WebGL backend',
        TIMEOUT_TF_INIT_MS
      );
      console.info('[face] TF backend: webgl');
    } catch {
      try {
        await withTimeout(
          (async () => { await tf.setBackend('cpu'); await tf.ready(); })(),
          'TF CPU backend',
          TIMEOUT_TF_INIT_MS
        );
        console.info('[face] TF backend: cpu');
      } catch (e) {
        // Last resort — try whatever TF.js defaults to
        try {
          await withTimeout(tf.ready(), 'TF default backend', TIMEOUT_TF_INIT_MS);
          console.info('[face] TF backend: default');
        } catch {
          throw new Error(`TensorFlow.js failed to initialize. Try a different browser. (${e instanceof Error ? e.message : e})`);
        }
      }
    }

    faceApiRef.current = faceapi;
    return faceapi;
  }, []);

  const loadOne = useCallback(async (faceapi: FaceApiModule, base: string) => {
    const url = base.replace(/\/$/, '');
    console.info('[face] trying model source:', url);

    // Skip models already loaded — avoids conflicts on remount / StrictMode double-fire
    const nets = faceapi.nets;

    if (!nets.tinyFaceDetector.isLoaded) {
      setLoadingModel('Tiny face detector');
      await withTimeout(nets.tinyFaceDetector.loadFromUri(url), 'tinyFaceDetector', TIMEOUT_MODEL_MS);
    }

    if (!nets.faceLandmark68Net.isLoaded) {
      setLoadingModel('Face landmarks');
      await withTimeout(nets.faceLandmark68Net.loadFromUri(url), 'faceLandmark68Net', TIMEOUT_MODEL_MS);
    }

    if (!nets.faceRecognitionNet.isLoaded) {
      setLoadingModel('Face recognition (6 MB)');
      await withTimeout(nets.faceRecognitionNet.loadFromUri(url), 'faceRecognitionNet', TIMEOUT_MODEL_MS);
    }

    // SSD is optional — improves accuracy but not required
    if (!nets.ssdMobilenetv1.isLoaded) {
      try {
        setLoadingModel('SSD detector (optional)');
        await withTimeout(nets.ssdMobilenetv1.loadFromUri(url), 'ssdMobilenetv1', TIMEOUT_SSD_MS);
        detectorRef.current = 'ssd';
        console.info('[face] SSD loaded — using SSD detector');
      } catch {
        detectorRef.current = 'tiny';
        console.warn('[face] SSD unavailable, using TinyFaceDetector only');
      }
    } else {
      detectorRef.current = 'ssd';
    }

    console.info('[face] models ready from', url, '| detector:', detectorRef.current);
  }, []);

  const loadModels = useCallback(async (): Promise<boolean> => {
    // Already ready — nothing to do
    if (modelStatusRef.current === 'ready') return true;

    // Another call is already in progress — wait for it
    if (modelStatusRef.current === 'loading') {
      return new Promise((resolve) => {
        const check = setInterval(() => {
          if (modelStatusRef.current === 'ready') { clearInterval(check); resolve(true); }
          if (modelStatusRef.current === 'error' || modelStatusRef.current === 'idle') {
            clearInterval(check); resolve(false);
          }
        }, 200);
      });
    }

    setStatus('loading');
    setModelError('');
    setLoadingModel('Initializing…');

    try {
      const faceapi = await getFaceApi();
      let lastErr: unknown = null;

      for (const source of MODEL_SOURCES) {
        try {
          await loadOne(faceapi, source);
          setLoadingModel('');
          setStatus('ready');
          return true;
        } catch (e) {
          lastErr = e;
          console.warn('[face] source failed:', source, e);
          // On source failure, clear loaded nets so the next source starts fresh
          try {
            faceapi.nets.tinyFaceDetector.dispose();
            faceapi.nets.faceLandmark68Net.dispose();
            faceapi.nets.faceRecognitionNet.dispose();
          } catch { /* ignore */ }
        }
      }

      throw lastErr ?? new Error('All model sources failed');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not load face recognition models. Check your internet connection and try again.';
      setModelError(msg);
      setLoadingModel('');
      // Reset so the user can retry from a clean state
      faceApiRef.current = null;
      setStatus('error');
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
              inputSize: TINY_INPUT_SIZE,
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
    loadingModel,
    loadModels,
    startDetectionLoop,
    stopDetectionLoop,
    matchDescriptor,
  };
}
