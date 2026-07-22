# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

## Why SDK 54 and not the latest

This project is deliberately pinned to **SDK 54**, not the newest SDK.

Expo Go on the **iOS App Store is stuck at 54.0.2** (released 2025-09-23) because Apple's
review queue is backed up — see
<https://expo.dev/changelog/expo-go-and-app-store-may-2026>. Every newer SDK requires
either `npx eas-cli go` (TestFlight) or a development build, both of which need a **paid
Apple Developer Program membership**. SDK 54 is the last version that runs on a physical
iPhone for free.

Android is unaffected — Expo Go sideloads any SDK version — but the project stays on 54 so
one codebase runs on both.

**Do not run `npx expo install --check` / `--fix` and accept an SDK bump** unless the iOS
Expo Go situation has changed or the project has moved to development builds. The SDK 57
version of this app is preserved at the `sdk-57` git tag.

### SDK 54 gotchas already hit

- `expo-status-bar` and `expo-image` ship **no config plugin** in SDK 54 — listing them in
  `app.json` `plugins` throws `PluginError: Unable to resolve a valid config plugin`.
- `expo-router/js-tabs` does not exist. Import `Tabs` from `expo-router` and
  `BottomTabBarProps` from `@react-navigation/bottom-tabs`.
- `newArchEnabled` and `android.edgeToEdgeEnabled` **are** valid in SDK 54 app.json
  (they were removed in 57).
