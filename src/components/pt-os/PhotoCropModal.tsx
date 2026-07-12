'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { UploadCloud, Camera, RotateCcw, Check, X, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui';
import { useCamera } from '@/hooks/useCamera';
import { cropAndCompressImage } from '@/lib/image';
import { useToast } from '@/lib/toast';

type Mode = 'select' | 'camera' | 'crop';

interface PhotoCropModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (dataUrl: string) => void;
  /** Skip straight to crop mode with this image (e.g. a file dropped on the page-level dropzone). */
  initialImageSrc?: string | null;
  /** Dialog title — defaults to "Profile Photo" for the existing round-avatar use. */
  title?: string;
  /** Crop mask shape. Defaults to 'round' (unchanged behavior for existing callers). */
  cropShape?: 'round' | 'rect';
  /** Crop aspect ratio (width/height). Defaults to 1 (unchanged behavior for existing callers). */
  aspect?: number;
  /** Max output dimension in px, passed through to cropAndCompressImage. Defaults to 800. */
  maxDim?: number;
}

export default function PhotoCropModal({
  open, onClose, onConfirm, initialImageSrc,
  title = 'Profile Photo', cropShape = 'round', aspect = 1, maxDim = 800,
}: PhotoCropModalProps) {
  const { toast } = useToast();
  const camera = useCamera();
  const fileRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<Mode>('select');
  const [dragOver, setDragOver] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = useCallback(() => {
    camera.stop();
    setMode('select');
    setRawImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setSaving(false);
    if (fileRef.current) fileRef.current.value = '';
  }, [camera]);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  // Skip straight to crop mode when a page-level drop already supplied an image.
  useEffect(() => {
    if (open && initialImageSrc) {
      setRawImageSrc(initialImageSrc);
      setMode('crop');
    }
  }, [open, initialImageSrc]);

  const loadFile = useCallback((file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setRawImageSrc(String(reader.result));
      setMode('crop');
    };
    reader.onerror = () => toast.error('Could not read that file.');
    reader.readAsDataURL(file);
  }, [toast]);

  const startCamera = useCallback(async () => {
    setMode('camera');
    const ok = await camera.start();
    if (!ok) {
      // Keep mode at 'camera' so the hook's own error state renders — user can Retake/Cancel.
    }
  }, [camera]);

  const capturePhoto = useCallback(() => {
    if (!camera.videoRef.current) return;
    const video = camera.videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = camera.dimensions.width;
    canvas.height = camera.dimensions.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    camera.stop();
    setRawImageSrc(canvas.toDataURL('image/jpeg', 0.92));
    setMode('crop');
  }, [camera]);

  const handleCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!rawImageSrc || !croppedAreaPixels) return;
    setSaving(true);
    try {
      const dataUrl = await cropAndCompressImage(rawImageSrc, croppedAreaPixels, cropShape, maxDim, 0.8);
      onConfirm(dataUrl);
      reset();
      onClose();
    } catch {
      toast.error('Could not process that photo. Please try again.');
      setSaving(false);
    }
  }, [rawImageSrc, croppedAreaPixels, onConfirm, reset, onClose, toast, cropShape, maxDim]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {mode === 'select' && 'Upload a photo or use your camera.'}
            {mode === 'camera' && 'Center your face and capture.'}
            {mode === 'crop' && 'Drag to reposition, scroll or use the slider to zoom.'}
          </DialogDescription>
        </DialogHeader>

        {mode === 'select' && (
          <div className="flex flex-col gap-3">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); loadFile(e.dataTransfer.files?.[0]); }}
              onClick={() => fileRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors"
              style={{
                borderColor: dragOver ? 'var(--gold, #F59E0B)' : 'var(--border-2)',
                background: dragOver ? 'color-mix(in srgb, var(--gold, #F59E0B) 6%, transparent)' : 'var(--bg-subtle)',
              }}
            >
              <UploadCloud size={30} style={{ color: dragOver ? 'var(--gold, #F59E0B)' : 'var(--text-muted)' }} />
              <p className="text-[13.5px] font-semibold text-[var(--text-secondary)]">
                {dragOver ? 'Drop here' : 'Tap to choose a photo, or drag & drop'}
              </p>
              <p className="text-[11px] text-[var(--text-disabled)]">JPG or PNG</p>
            </div>
            <input
              ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => loadFile(e.target.files?.[0])}
            />
            <Button type="button" variant="outline" iconLeft={<Camera size={15} />} onClick={startCamera}>
              Use Camera
            </Button>
          </div>
        )}

        {mode === 'camera' && (
          <div className="flex flex-col gap-3">
            <div className="relative overflow-hidden rounded-2xl bg-black" style={{ aspectRatio: '4 / 3' }}>
              <video
                ref={camera.videoRef}
                autoPlay playsInline muted
                className="h-full w-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
              {camera.status === 'starting' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 size={24} className="animate-spin text-white" />
                </div>
              )}
              {(camera.status === 'denied' || camera.status === 'error') && (
                <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-[12.5px] text-white">
                  {camera.error || 'Camera unavailable.'}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" fullWidth onClick={() => { camera.stop(); setMode('select'); }}>
                Cancel
              </Button>
              <Button
                type="button" fullWidth disabled={camera.status !== 'active'}
                iconLeft={<Camera size={15} />}
                onClick={capturePhoto}
                style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff' }}
              >
                Capture
              </Button>
            </div>
          </div>
        )}

        {mode === 'crop' && rawImageSrc && (
          <div className="flex flex-col gap-3">
            <div className="relative overflow-hidden rounded-2xl bg-[var(--bg-subtle)]" style={{ height: aspect < 1 ? 380 : 280 }}>
              <Cropper
                image={rawImageSrc}
                crop={crop}
                zoom={zoom}
                aspect={aspect}
                cropShape={cropShape}
                showGrid={cropShape === 'rect'}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={handleCropComplete}
              />
            </div>
            <div className="flex items-center gap-3 px-1">
              <span className="text-[11px] font-medium text-[var(--text-muted)]">Zoom</span>
              <input
                type="range" min={1} max={3} step={0.05} value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 accent-[#F59E0B]"
                aria-label="Zoom"
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" iconLeft={<RotateCcw size={14} />}
                onClick={() => { setRawImageSrc(null); setMode('select'); }}>
                Retake
              </Button>
              <Button type="button" variant="outline" iconLeft={<X size={14} />} onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="button" fullWidth loading={saving} iconLeft={!saving ? <Check size={15} /> : undefined}
                onClick={handleConfirm}
                style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff' }}
              >
                {saving ? 'Saving...' : 'Use Photo'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
