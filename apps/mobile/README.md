# Iskrib Mobile (React Native CLI, no Expo)

Native mobile app workspace for Iskrib.

## Implemented foundation

- React Native CLI app scaffold (`ios/`, `android/`).
- Navigation shell with auth stack + main tabs + detail stacks.
- Auth/session provider using Supabase + AsyncStorage persistence.
- Typed API client with retry/timeout behavior.
- Initial screens:
  - Login / SignUp
  - Home Feed
  - Post Detail
  - Explore
  - Stories shell
  - Notifications
  - Profile
  - Journal editor (native rich editor)
  - Canvas / Freedom Wall / Universe route shells
- Quality gates:
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`

## Environment variables

Create `apps/mobile/.env` from the template and fill in your values:

```sh
# macOS/Linux
cp .env.example .env

# PowerShell
Copy-Item .env.example .env
```

Required keys for real auth/backend integration:

- `ISK_MOBILE_API_BASE_URL` (example: `http://10.0.2.2:3000/api`)
- `ISK_MOBILE_SUPABASE_URL`
- `ISK_MOBILE_SUPABASE_ANON_KEY`

Current code falls back to `http://10.0.2.2:3000/api` if API base URL is unset.
Template Supabase values from `.env.example` are treated as "not configured" and auth flows stay disabled until real values are provided.
If you change `.env`, restart Metro so the new values are picked up.

## Run

```sh
npm install
npm start
```

In another terminal:

```sh
npm run android
# or
npm run ios
```

## Test

```sh
npm run typecheck
npm run lint
npm test
```

## Android release for Play Store

The Android project is configured to build an `.aab` bundle for Play Store upload.

1. Generate an upload keystore once and keep it safe:

```sh
cd apps/mobile/android/app
keytool -genkeypair -v -storetype PKCS12 -keystore upload-keystore.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
```

2. Copy `apps/mobile/android/keystore.properties.example` to `apps/mobile/android/keystore.properties` and fill in the real passwords.

3. Optional but recommended before your first upload: set your final package id and version values.

```powershell
$env:ISKRIB_ANDROID_APPLICATION_ID="com.iskrib.mobile"
$env:ISKRIB_ANDROID_VERSION_CODE="1"
$env:ISKRIB_ANDROID_VERSION_NAME="1.0.0"
```

4. Build the Play Store bundle:

```sh
npm run build:playstore
```

The output bundle is written to:

```text
apps/mobile/android/app/build/outputs/bundle/release/app-release.aab
```

Notes:

- If `keystore.properties` is missing, the release build falls back to the debug keystore for local smoke testing only. Do not upload that bundle to Play Console.
- The default package id is `com.iskrib.mobile`; change `ISKRIB_ANDROID_APPLICATION_ID` before your first Play Console upload if you need a different id.
