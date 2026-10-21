# RM CHAT - Android Packaging & Deployment Guide

This guide details how to build and package **RM CHAT** (`com.rmchat.app`) for Android using **Capacitor** and **Android Studio**.

---

## 1. Prerequisites
- Node.js 18+ and npm installed
- Android Studio Ladybug / Iguana or newer with Android SDK Build-Tools (API 34+)
- Java JDK 17+ configured in `JAVA_HOME`

---

## 2. Capacitor Android Setup

1. Install Capacitor dependencies:
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/camera @capacitor/push-notifications @capacitor/status-bar @capacitor/splash-screen
```

2. Build the production web bundle:
```bash
npm run build
```

3. Initialize the Android platform:
```bash
npx cap add android
```

4. Synchronize assets and plugins:
```bash
npx cap sync android
```

---

## 3. Native Android Permissions (`AndroidManifest.xml`)

Open `android/app/src/main/AndroidManifest.xml` and ensure the following permissions are present inside `<manifest>`:

```xml
<!-- Network & WebRTC -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />

<!-- Camera & Voice Calling -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
<uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />
<uses-feature android:name="android.hardware.microphone" android:required="false" />

<!-- Push Notifications (Android 13+) -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
```

---

## 4. Firebase Android Setup (`google-services.json`)

1. Open your Firebase Console: https://console.firebase.google.com/
2. Go to **Project Settings** > **General** > **Add App** > **Android**.
3. Set Android package name: `com.rmchat.app`.
4. Register the app and download `google-services.json`.
5. Place `google-services.json` in:
   ```
   android/app/google-services.json
   ```
6. Generate your SHA-1 and SHA-256 fingerprints:
   ```bash
   cd android && ./gradlew signingReport
   ```
7. Add the SHA-1 and SHA-256 fingerprints to your Android App in Firebase Console (required for Google Sign-In and App Check).

---

## 5. Building Signed APK and Android App Bundle (AAB)

### In Android Studio:
1. Open the android project:
   ```bash
   npx cap open android
   ```
2. In Android Studio, go to **Build** > **Generate Signed Bundle / APK**.
3. Choose:
   - **Android App Bundle** (AAB) for Google Play Store publishing.
   - **APK** for direct sideloading and testing on Android devices.
4. Select or create your Release Keystore (`rmchat-release.keystore`).
5. Select `release` build variant and click **Finish**.
6. The output file will be in `android/app/release/`.

---

## 6. Deep Linking into Conversations
In `AndroidManifest.xml` under `<activity android:name=".MainActivity">`, register intent filters:

```xml
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="rmchat" android:host="chat" />
</intent-filter>
```
Users clicking `rmchat://chat/{conversationId}` or push notifications will directly open that conversation.
