'use client';
/**
 * useFaceDetection — face-api.js wrapper
 *
 * @tensorflow/tfjs and face-api.js are MASSIVE (~4-8 MB each).
 * They must NEVER be statically bundled. We use webpackIgnore magic
 * comments so Turbopack/Webpack skip static analysis entirely —
 * the imports only execute at runtime in the browser, on demand.
 *
 * Fixes:
 * 1. modelStatus stale closure → replaced with ref
 * 2. Canvas size set before video metadata ready → resized each loop tick
 * 3. MIN_FACE_SIZE applied to raw (un-scaled) box.width
 * 4. TF backend selection hardened for Safari/iOS
 * 5. CDN fallback for face-api models (jsDelivr)
 * 6. TF + face-api excluded from SSR/static bundle via webpackIgnore
 */
import { useRef, useState, useCallback, useEffect } from 'react';
import type { FaceDescriptorEntry, DetectionResult } from '@/types/checkin';

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

  const faceApiRef = useRef<any>(null);
  const rafRef = useRef<number>(0);
  const lastRunRef = useRef<number>(0);
  const processingRef = useRef(false);
  const detectorRef = useRef<'ssd' | 'tiny'>('tiny');

  /**
   * Lazily imports TF + face-api ONLY in the browser, at runtime.
   *
   * The /* webpackIgnore: true *\/ comments tell both Webpack and Turbopack
   * to skip static analysis of these imports — they are never bundled,
   * never SSR'd, and never affect LCP. They load as separate network
   * requests the first time the checkin page is actually used.
   */
  const getFaceApi = useCallback(async () => {
    if (faceApiRef.current) return faceApiRef.current;
    if (typeof window === 'undefined') throw new Error('Browser only');

    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua) || isIOS;

    // webpackIgnore keeps these OUT of the bundle — loaded at runtime only
    const tf = await import(/* webpackIgnore: true */ '@tensorflow/tfjs' as string);

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
      try { await tf.setBackend('cpu'); await tf.ready(); } catch {}
    }

    const faceapi = await import(/* webpackIgnore: true */ 'face-api.js' as string);
    faceApiRef.current = faceapi;
    return faceapi;
  }, []);

  const loadOne = useCallback(async (faceapi: any, base: string) => {
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
      let lastErr: any = null;
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
    } catch (err: any) {
      const msg = err?.message ?? 'Could not load face recognition models';
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

        let detections: any[] = [];

        if (detectorRef.current === 'ssd') {
          try {
            detections = await faceapi
              .detectAllFaces(videoEl, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.40 }))
              .withFaceLandmarks()
              .withFaceDescriptors();
          } catch (e) {
            console.warn('[face] SSD failed, switching to tiny:', e);
            detectorRef.current = 'tiny';
          }
        }

        if (!detections || detections.length === 0) {
          detections = await faceapi
            .detectAllFaces(videoEl, new faceapi.TinyFaceDetectorOptions({
              inputSize: 320,
              scoreThreshold: 0.40,
            }))
            .withFaceLandmarks()
            .withFaceDescriptors();
        }

        if (!detections || detections.length === 0) {
          onDetection({ detected: false, multipleFaces: false });
          processingRef.current = false;
          return;
        }

        if (detections.length > 1) {
          if (ctx) {
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.setLineDash([]);
            detections.forEach((d: any) => {
              const b = d.detection.box;
              ctx.strokeRect(b.x, b.y, b.width, b.height);
            });
          }
          onDetection({ detected: true, multipleFaces: true });
          processingRef.current = false;
          return;
        }

        const det = detections[0];
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
          [[box.x, box.y], [box.x + box.width, box.y],
           [box.x, box.y + box.height], [box.x + box.width, box.y + box.height]
          ].forEach(([cx, cy]: number[], i: number) => {
            ctx.beginPath();
            ctx.moveTo(cx + (i % 2 === 0 ? cl : -cl), cy);
            ctx.lineTo(cx, cy);
            ctx.lineTo(cx, cy + (i < 2 ? cl : -cl));
            ctx.stroke();
          });
        }

        const landmarks =
          det.landmarks?.positions?.map?.((p: any) => ({ x: p.x, y: p.y })) ?? [];

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
