import type { CapacitorConfig } from '@capacitor/cli';

/**
 * 619 Fitness ERP — Capacitor Configuration
 *
 * Architecture: Remote-shell pattern.
 * The Capacitor WebView loads the live Vercel deployment (server.url).
 * This preserves all Next.js SSR / server-side features while adding
 * native capabilities via Capacitor plugins.
 *
 * For local development: set CAPACITOR_LIVE_URL env var or change server.url below.
 * For production: set server.url to your Vercel production URL.
 */

const LIVE_URL = process.env.CAPACITOR_LIVE_URL || 'https://619-erp-frontend.vercel.app';

const config: CapacitorConfig = {
  appId: 'com.fitness619.erp',
  appName: '619 Fitness',
  webDir: 'www',

  // ── Remote server URL ──────────────────────────────────────────────
  // In dev you can comment this out to use the local www/ build.
  server: {
    url: LIVE_URL,
    cleartext: false,
    androidScheme: 'https',
    // Allow navigation within the Vercel domain
    allowNavigation: [
      '619-erp-frontend.vercel.app',
      '*.vercel.app',
    ],
  },

  // ── Android ───────────────────────────────────────────────────────
  android: {
    backgroundColor: '#0f0c29',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false, // set true only during dev
    appendUserAgent: '619FitnessApp/3.0 Android',
    overrideUserAgent: undefined,
    buildOptions: {
      keystorePath: process.env.ANDROID_KEYSTORE_PATH,
      keystoreAlias: process.env.ANDROID_KEYSTORE_ALIAS,
      releaseType: 'AAB',
    },
  },

  // ── iOS ───────────────────────────────────────────────────────────
  ios: {
    backgroundColor: '#0f0c29',
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scrollEnabled: true,
    appendUserAgent: '619FitnessApp/3.0 iOS',
  },

  // ── Plugin configuration ───────────────────────────────────────────
  plugins: {
    // ── SplashScreen ──────────────────────────────────────────────
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0f0c29',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      iosSpinnerStyle: 'small',
      spinnerColor: '#7c3aed',
    },

    // ── StatusBar ─────────────────────────────────────────────────
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#0f0c29',
      overlaysWebView: false,
    },

    // ── Camera ────────────────────────────────────────────────────
    Camera: {
      // iOS: NSCameraUsageDescription is set in Info.plist
      // Android: CAMERA permission is in AndroidManifest.xml
    },

    // ── PushNotifications ─────────────────────────────────────────
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },

    // ── LocalNotifications ────────────────────────────────────────
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#7c3aed',
      sound: 'beep.wav',
    },

    // ── Keyboard ──────────────────────────────────────────────────
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },

    // ── App (deep linking) ────────────────────────────────────────
    App: {
      // URL scheme: 619fitness://
      // Universal Link / App Link: https://619-erp-frontend.vercel.app
    },
  },
};

export default config;
