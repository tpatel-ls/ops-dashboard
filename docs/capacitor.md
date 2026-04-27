# Capacitor Android wrapper (M8)

The web app builds to a static export that Capacitor wraps. Only run this once
M7 polish has settled.

## One time setup

```
cd apps/web
pnpm add -D @capacitor/cli
pnpm add @capacitor/core @capacitor/android @capacitor/local-notifications @capacitor/filesystem @capacitor/preferences
pnpm exec cap init drift com.drift.app --web-dir out
pnpm exec cap add android
```

`capacitor.config.ts` already lives in this folder so `cap init` will pick it
up rather than overwriting.

## Build the wrapper

```
NEXT_OUTPUT=export pnpm --filter @drift/web build
pnpm exec cap copy android
pnpm exec cap open android
```

## Local notifications on the wrapper

Inside Capacitor, swap `lib/notifications.ts` to use
`@capacitor/local-notifications`. The contract stays the same: schedule,
cancel, fire on due. The runtime detects the wrapper via
`Capacitor.isNativePlatform()`.

## S-Pen verification

The Pointer Events API works as is on Android Chrome and inside the
Capacitor WebView. Run the whiteboard on a real S24 Ultra and S10 Ultra. Look
for: pressure varies, palm rejection holds, side button maps to eraser.

## Notes

- Static export limits: server actions are not used in M0 to M7, so export
  works. If a server route is added later, switch to a hybrid wrapper
  (Capacitor + remote URL) instead.
- The service worker is not used inside Capacitor. Notifications flow through
  the native plugin instead.
