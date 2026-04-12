# iskrib_mobile_app

Standalone npm-workspaces monorepo for the Iskrib React Native app.

## Workspace layout

```text
iskrib_mobile_app/
  apps/
    mobile/      # React Native app
  packages/      # optional shared packages/config
```

## Requirements

- Node.js `>=22.11.0`
- Android Studio (for Android builds)
- Xcode (for iOS builds on macOS)

## Install

```bash
npm install
```

## Run

```bash
npm run dev:mobile
```

## Build/launch

```bash
npm run android
npm run ios
```

## Quality checks

```bash
npm run typecheck
npm run lint
npm run test
```
