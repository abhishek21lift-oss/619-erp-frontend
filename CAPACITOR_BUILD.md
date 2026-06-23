# 619 Fitness ERP — Capacitor Android & iOS Build Guide

## Architecture

**Remote-shell pattern**: The Capacitor WebView loads the live Vercel deployment
(`https://619-erp-frontend.vercel.app`) instead of a static bundle.  
This preserves all Next.js SSR features while adding native capabilities.

```
[ Android/iOS App (Capacitor) ]
         │ WebView
         ▼
[ Vercel (Next.js 16 SSR) ]
         │ /api/* server-side rewrite
         ▼
[ Render (Node.js backend) ]
         │
         ▼
[ Supabase PostgreSQL ]
```

---

## Prerequisites

### Android
- **Java 21** (OpenJDK or Android Studio)
- **Android Studio** (latest stable) — includes SDK + Gradle
- **Android SDK** API level 34 (target), 23 (min)
- **Node.js** >= 20.9.0

### iOS (macOS only)
- **macOS** with Xcode 15+
- **CocoaPods** (`sudo gem install cocoapods`)
- **Apple Developer account** (for signing and TestFlight)

---

## Environment Setup

```bash
# 1. Clone and install dependencies
git clone https://github.com/abhishek21lift-oss/619-erp-frontend.git
cd 619-erp-frontend
npm install

# 2. Set required environment variables
cp .env.example .env.local
# Edit .env.local — set NEXT_PUBLIC_API_URL for local dev

# 3. Build the web fallback page (already checked in to www/)
# The www/index.html is a static fallback shown when Vercel is unreachable.
# The app primarily loads content from server.url in capacitor.config.ts.
```

---

## Android Build

### 1. Sync web assets

```bash
npm run cap:sync
# or: npx cap sync android
```

### 2. Open in Android Studio

```bash
npm run cap:open:android
# or: npx cap open android
```

Android Studio will open the `android/` project automatically.

### 3. Debug APK (unsigned)

```bash
# Via npm script:
npm run cap:build:android

# Or directly with Gradle:
cd android
./gradlew assembleDebug

# Output: android/app/build/outputs/apk/debug/app-debug.apk
```

### 4. Release APK (signed)

#### a. Generate a keystore (one-time)

```bash
keytool -genkeypair \
  -v \
  -keystore 619fitness-release.keystore \
  -alias 619fitness \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

#### b. Configure signing in `android/app/build.gradle`

Add to the `android { }` block:

```groovy
signingConfigs {
    release {
        storeFile file(System.getenv("ANDROID_KEYSTORE_PATH") ?: "619fitness-release.keystore")
        storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
        keyAlias System.getenv("ANDROID_KEYSTORE_ALIAS") ?: "619fitness"
        keyPassword System.getenv("ANDROID_KEY_PASSWORD")
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

#### c. Build signed release AAB (for Play Store)

```bash
# Set env vars first:
export ANDROID_KEYSTORE_PATH=/path/to/619fitness-release.keystore
export ANDROID_KEYSTORE_PASSWORD=yourpassword
export ANDROID_KEYSTORE_ALIAS=619fitness
export ANDROID_KEY_PASSWORD=yourkeypassword

npm run cap:build:android:release
# or: cd android && ./gradlew bundleRelease

# Output: android/app/build/outputs/bundle/release/app-release.aab
```

#### d. Build signed release APK (for direct distribution)

```bash
cd android && ./gradlew assembleRelease
# Output: android/app/build/outputs/apk/release/app-release.apk
```

---

## iOS Build (macOS only)

### 1. Add iOS platform (first time only)

```bash
npx cap add ios

# Merge ios-config/Info.plist.additions.xml entries into ios/App/App/Info.plist
# (See ios-config/Info.plist.additions.xml for required keys)
```

### 2. Sync

```bash
npm run cap:sync
# or: npx cap sync ios
```

### 3. Open in Xcode

```bash
npm run cap:open:ios
# or: npx cap open ios
```

### 4. Xcode setup

1. Select the **App** target → **Signing & Capabilities**
2. Set your **Team** (Apple Developer account)
3. Enable **Push Notifications** capability
4. Enable **Background Modes** → check "Remote notifications"
5. Set **Bundle Identifier** to `com.fitness619.erp`

### 5. Build for device

- Connect iOS device → Select device in Xcode toolbar → **Product → Run**
- Or **Product → Archive** for distribution (TestFlight / App Store)

---

## Deep Linking

### Custom URL scheme: `619fitness://`
- Android: Intent filter configured in `android/app/src/main/AndroidManifest.xml`
- iOS: CFBundleURLTypes configured in `ios-config/Info.plist.additions.xml`

### App Links (HTTPS): `https://619-erp-frontend.vercel.app`
- Android: Intent filter with `android:autoVerify="true"` configured
- iOS: Add `apple-app-site-association` file to Vercel deployment (see below)

### Vercel AASA file for iOS Universal Links

Create `public/.well-known/apple-app-site-association` (no extension, JSON):

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAMID.com.fitness619.erp",
        "paths": ["*"]
      }
    ]
  }
}
```

Replace `TEAMID` with your Apple Developer Team ID.

---

## Push Notifications

### Android (FCM)
1. Create a Firebase project at console.firebase.google.com
2. Add Android app with package `com.fitness619.erp`
3. Download `google-services.json` → place in `android/app/google-services.json`
4. In Capacitor config, the FCM plugin is already registered

### iOS (APNs)
1. In Apple Developer portal: create an APNs auth key (.p8)
2. Upload the .p8 key to Firebase (if using FCM) or use APNs directly
3. In Xcode: enable Push Notifications capability (step 4 above)

### Backend device registration endpoint
The app calls `POST /api/v1/notifications/register-device` after receiving the FCM/APNs token.
Backend must store `{ userId, token, platform: 'android' | 'ios' }` and use it to send notifications.

---

## Capacitor Remote URL

The app is configured to always load from:
```
https://619-erp-frontend.vercel.app
```

To change this for staging or local dev, set the env var before opening:
```bash
CAPACITOR_LIVE_URL=https://your-preview.vercel.app npx cap sync
```

Or edit `capacitor.config.ts` directly and re-sync.

---

## App IDs

| Platform | App ID / Bundle ID |
|----------|--------------------|
| Android  | `com.fitness619.erp` |
| iOS      | `com.fitness619.erp` |
| Deep link scheme | `619fitness://` |

---

## Troubleshooting

### WebView shows blank screen
- Ensure the Vercel deployment is live and accessible
- Check `server.url` in `capacitor.config.ts`
- Enable `webContentsDebuggingEnabled: true` in Android config for dev builds

### Camera not working
- Verify `CAMERA` permission in AndroidManifest.xml (already configured)
- On iOS: verify `NSCameraUsageDescription` in Info.plist
- Check `@capacitor/camera` plugin is listed in `npx cap sync` output

### Biometric login not appearing
- Device must have biometrics enrolled (fingerprint/Face ID)
- `capacitor-native-biometric` plugin handles keychain/keystore storage

### Push notifications not received
- Verify `google-services.json` is present for Android
- Verify APNs/FCM configuration
- Check that `POST /api/v1/notifications/register-device` succeeds after login
