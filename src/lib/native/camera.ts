'use client';
/**
 * camera.ts — Unified camera helper with Capacitor ↔ Web fallback
 *
 * On native (Android/iOS): uses @capacitor/camera for the best native UX.
 * On web: falls back to the browser MediaStream API (used by useFaceDetection).
 *
 * Usage:
 *   const { dataUrl } = await takePicture();     // selfie / front camera
 *   const { dataUrl } = await takeBackPicture(); // back camera
 */

import { isNative } from './platform';

export type PictureResult = {
  dataUrl: string;  // data:image/jpeg;base64,...
  format: 'jpeg' | 'png';
};

/** Take a photo from the front (selfie) camera. */
export async function takeSelfie(): Promise<PictureResult> {
  if (!isNative()) {
    throw new Error('takeSelfie() is only available on native. Use MediaStream on web.');
  }
  const { Camera, CameraResultType, CameraSource, CameraDirection } = await import('@capacitor/camera');
  const photo = await Camera.getPhoto({
    resultType: CameraResultType.DataUrl,
    source: CameraSource.Camera,
    direction: CameraDirection.Front,
    quality: 85,
    allowEditing: false,
    correctOrientation: true,
    width: 640,
    height: 640,
    presentationStyle: 'popover',
    saveToGallery: false,
    promptLabelHeader: 'Face scan',
    promptLabelCancel: 'Cancel',
    promptLabelPhoto: 'From gallery',
    promptLabelPicture: 'Take photo',
  });
  return {
    dataUrl: photo.dataUrl ?? '',
    format: photo.format === 'png' ? 'png' : 'jpeg',
  };
}

/** Take a photo from the rear camera. */
export async function takeBackPhoto(): Promise<PictureResult> {
  if (!isNative()) {
    throw new Error('takeBackPhoto() is only available on native.');
  }
  const { Camera, CameraResultType, CameraSource, CameraDirection } = await import('@capacitor/camera');
  const photo = await Camera.getPhoto({
    resultType: CameraResultType.DataUrl,
    source: CameraSource.Camera,
    direction: CameraDirection.Rear,
    quality: 90,
    allowEditing: false,
    correctOrientation: true,
    saveToGallery: false,
  });
  return {
    dataUrl: photo.dataUrl ?? '',
    format: photo.format === 'png' ? 'png' : 'jpeg',
  };
}

/** Request camera permission; returns true if granted. */
export async function requestCameraPermission(): Promise<boolean> {
  if (!isNative()) return true; // browser handles this via getUserMedia prompt
  const { Camera } = await import('@capacitor/camera');
  const status = await Camera.requestPermissions({ permissions: ['camera'] });
  return status.camera === 'granted';
}

/** Check current camera permission state without prompting. */
export async function checkCameraPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  if (!isNative()) return 'prompt';
  const { Camera } = await import('@capacitor/camera');
  const status = await Camera.checkPermissions();
  return status.camera as 'granted' | 'denied' | 'prompt';
}
