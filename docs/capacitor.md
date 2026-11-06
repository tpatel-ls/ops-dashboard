# Capacitor Android wrapper (M8)

The web app builds to a static export that Capacitor wraps. Only run this once
M7 polish has settled.

## One time setup

```
cd apps/web
pnpm add -D @capacitor/cli
pnpm add @capacitor/core @capacitor/android @capacitor/local-notifications @capacitor/filesystem @capacitor/preferences
pnpm exec cap init ops-dashboard com.opsdashboard.app --web-dir out
pnpm exec cap add android
```

`capacitor.config.ts` already lives in this folder so `cap init` will pick it
up rather than overwriting.

## Build the wrapper

The original plan was a static export (`webDir: 'out'` in
`capacitor.config.ts`). That build does not work today:

- `apps/web/next.config.ts` never sets `output: 'export'`, and nothing reads a
  `NEXT_OUTPUT` variable, so a normal build writes `.next/` and no `out/`.
- The app needs a server. It has route handlers under `src/app/api/` and
  `src/app/auth/`, a server action in `src/app/login/actions.ts`, and the
  auth proxy in `src/proxy.ts`. A static export supports none of these.

Use a hybrid wrapper instead: point Capacitor's `server.url` at the deployed
app (see `docs/ops-dashboard/deploy.md`). `cap copy` still expects the
`webDir` folder to exist. Then:

```
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

- The service worker is not used inside Capacitor. Notifications flow through
  the native plugin instead.
