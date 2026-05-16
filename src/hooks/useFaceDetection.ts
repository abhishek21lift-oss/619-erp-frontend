'use client';
/**
 * useFaceDetection — loads face-api.js models lazily and runs the
 * detection loop using requestAnimationFrame.
 */
import { useRef, useState, useCallback, useEffect } from 'react';
import type { FaceDescriptorEntry, DetectionResult } from '@/types/checkin';

const LOCAL_MODEL_URL = '/models';
const MODEL_SOURCES = [
  LOCAL_MODEL_URL,
  'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js-models@master',
  'https://rawcdn.githack.com/justadudewhohacks/face-api.js-models/master',
];
const RECOGNITION_THRESHOLD = 0.50;
const DETECTION_INTERVAL_MS = 80;
const MIN_FACE_SIZE = 80;

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
  const faceApiRef = useRef<any>(null);
  const rafRef = useRef<number>(0);
  const lastRunRef = useRef<number>(0);
  const processingRef = useRef(false);
  const loadedSourceRef = useRef<string>('');

  const getFaceApi = useCallback(async () => {
    if (faceApiRef.current) return faceApiRef.current;
    const faceapi = await import('face-api.js');
    faceApiRef.current = faceapi;
    return faceapi;
  }, []);

  const loadFromSource = useCallback(async (faceapi: any, base: string) => {
    const url = base.replace(/\/$/, '');
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(url),
      faceapi.nets.faceLandmark68Net.loadFromUri(url),
      faceapi.nets.faceRecognitionNet.loadFromUri(url),
    ]);
    loadedSourceRef.current = url;
  }, []);

  const loadModels = useCallback(async (): Promise<boolean> => {
    if (modelStatus === 'ready') return true;
    setModelStatus('loading');
    setModelError('');

    try {
      const faceapi = await getFaceApi();
      let lastError: any = null;

      for (const source of MODEL_SOURCES) {
        try {
          await loadFromSource(faceapi, source);
          setModelStatus('ready');
          return true;
        } catch (err) {
          lastError = err;
        }
      }

      throw lastError || new Error('Unable to load face-api models');
    } catch (err: any) {
      const msg = 'Could not load face recognition models. Please redeploy frontend and retry.';
      setModelError(msg);
      setModelStatus('error');
      console.error('[FaceDetection] Model load error:', err);
      return false;
    }
  }, [modelStatus, getFaceApi, loadFromSource]);

  const stopDetectionLoop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    processingRef.current = false;
  }, []);

  const startDetectionLoop = useCallback((videoEl: HTMLVideoElement, canvasEl: HTMLCanvasElement, onDetection: (result: DetectionResult) => void) => {
    if (!faceApiRef.current) return;
    const faceapi = faceApiRef.current;
    canvasEl.width = videoEl.videoWidth || 640;
    canvasEl.height = videoEl.videoHeight || 480;
    const ctx = canvasEl.getContext('2d');

    const loop = async (timestamp: number) => {
      rafRef.current = requestAnimationFrame(loop);
      if (timestamp - lastRunRef.current < DETECTION_INTERVAL_MS) return;
      if (processingRef.current) return;
      if (videoEl.readyState < 2) return;
      lastRunRef.current = timestamp;
      processingRef.current = true;

      try {
        ctx?.clearRect(0, 0, canvasEl.width, canvasEl.height);
        const detectorOptions = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
        const detections = await faceapi.detectAllFaces(videoEl, detectorOptions).withFaceLandmarks().withFaceDescriptors();

        if (!detections || detections.length === 0) {
          onDetection({ detected: false, multipleFaces: false });
          processingRef.current = false;
          return;
        }
        if (detections.length > 1) {
          if (ctx) {
            const scaleX = canvasEl.width / (videoEl.videoWidth || 640);
            const scaleY = canvasEl.height / (videoEl.videoHeight || 480);
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            detections.forEach((d: any) => {
              const b = d.detection.box;
              ctx.strokeRect(b.x * scaleX, b.y * scaleY, b.width * scaleX, b.height * scaleY);
            });
          }
          onDetection({ detected: true, multipleFaces: true });
          processingRef.current = false;
          return;
        }

        const det = detections[0];
        const box = det.detection.box;
        if (box.width < MIN_FACE_SIZE) {
          onDetection({ detected: false, multipleFaces: false });
          processingRef.current = false;
          return;
        }

        const scaleX = canvasEl.width / (videoEl.videoWidth || 640);
        const scaleY = canvasEl.height / (videoEl.videoHeight || 480);
        const scaledBox = { x: box.x * scaleX, y: box.y * scaleY, width: box.width * scaleX, height: box.height * scaleY };

        if (ctx) {
          ctx.strokeStyle = '#6366f1';
          ctx.lineWidth = 2;
          ctx.strokeRect(scaledBox.x, scaledBox.y, scaledBox.width, scaledBox.height);
          ctx.fillStyle = 'rgba(99,102,241,0.06)';
          ctx.fillRect(scaledBox.x, scaledBox.y, scaledBox.width, scaledBox.height);
        }

        const landmarks = det.landmarks.positions.map((p: any) => ({ x: p.x, y: p.y }));
        onDetection({ detected: true, multipleFaces: false, box: scaledBox, descriptor: det.descriptor, landmarks });
      } catch (err) {
      } finally {
        processingRef.current = false;
      }
    };

    rafRef.current = requestAnimationFrame(loop);
  }, []);

  const matchDescriptor = useCallback((descriptor: Float32Array, storedDescriptors: FaceDescriptorEntry[]) => {
    if (!faceApiRef.current || storedDescriptors.length === 0) return { matched: false, distance: Infinity };
    let bestDistance = Infinity;
    let bestEntry: FaceDescriptorEntry | undefined;
    for (const entry of storedDescriptors) {
      const stored = new Float32Array(entry.descriptor);
      const dist = faceApiRef.current.euclideanDistance(descriptor, stored);
      if (dist < bestDistance) {
        bestDistance = dist;
        bestEntry = entry;
      }
    }
    return { matched: bestDistance < RECOGNITION_THRESHOLD, entry: bestEntry, distance: bestDistance };
  }, []);

  useEffect(() => {
    return () => { stopDetectionLoop(); };
  }, [stopDetectionLoop]);

  return { modelStatus, modelError, loadModels, startDetectionLoop, stopDetectionLoop, matchDescriptor };
}
