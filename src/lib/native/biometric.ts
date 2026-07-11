'use client';
/**
 * biometric.ts — Biometric authentication (fingerprint / Face ID)
 *
 * On native: uses capacitor-native-biometric (Touch ID, Face ID, Android fingerprint).
 * On web: falls back to WebAuthn / passkeys (handled separately in the auth flow).
 *
 * Usage:
 *   const ok = await authenticateWithBiometric('Confirm identity');
 */

import { isNative, isIOS } from './platform';

export type BiometricType = 'fingerprint' | 'face' | 'none';

/** Returns the type of biometric available, or 'none'. */
export async function getAvailableBiometric(): Promise<BiometricType> {
  if (!isNative()) return 'none';
  try {
    const { NativeBiometric } = await import('capacitor-native-biometric');
    const result = await NativeBiometric.isAvailable();
    if (!result.isAvailable) return 'none';
    if (result.biometryType === 2 /* FACE_ID */ || result.biometryType === 6 /* FACE_AUTHENTICATION */) return 'face';
    return 'fingerprint';
  } catch {
    return 'none';
  }
}

/** Prompt the user for biometric authentication. Returns true on success. */
export async function authenticateWithBiometric(reason?: string): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const { NativeBiometric } = await import('capacitor-native-biometric');
    await NativeBiometric.verifyIdentity({
      reason: reason ?? 'Confirm your identity',
      title: 'Coach Abhishek',
      subtitle: isIOS() ? undefined : 'Use biometric to sign in',
      description: 'Touch the sensor or look at the camera',
      negativeButtonText: 'Use password instead',
      maxAttempts: 3,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Store credentials securely in the device keychain/keystore.
 * Call this after a successful password login to enable biometric next time.
 */
export async function storeCredentials(username: string, password: string): Promise<void> {
  if (!isNative()) return;
  try {
    const { NativeBiometric } = await import('capacitor-native-biometric');
    await NativeBiometric.setCredentials({
      username,
      password,
      server: 'com.619fitness.erp',
    });
  } catch (err) {
    console.warn('[biometric] storeCredentials failed:', err);
  }
}

/** Retrieve stored credentials from keychain/keystore. */
export async function getStoredCredentials(): Promise<{ username: string; password: string } | null> {
  if (!isNative()) return null;
  try {
    const { NativeBiometric } = await import('capacitor-native-biometric');
    const creds = await NativeBiometric.getCredentials({ server: 'com.619fitness.erp' });
    return creds;
  } catch {
    return null;
  }
}

/** Delete stored credentials (on logout or credential change). */
export async function deleteStoredCredentials(): Promise<void> {
  if (!isNative()) return;
  try {
    const { NativeBiometric } = await import('capacitor-native-biometric');
    await NativeBiometric.deleteCredentials({ server: 'com.619fitness.erp' });
  } catch { /* noop */ }
}
