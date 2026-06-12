# Galaxy Watch 7 Ultra → Ops Dashboard capture recipe

The watch can't run the PWA. Instead it triggers your **paired Galaxy S24 Ultra**,
which makes one authenticated HTTPS call to `POST /api/capture`. The server
triages the text with Claude, writes the task/journal to Supabase under your user,
and **Supabase Realtime fans it out to every signed-in device within ~2s.**

> Standalone-LTE limitation: this path needs the phone reachable (Bluetooth/Wi‑Fi
> or same network). There is no PWA or Tailscale on Wear OS, so a fully
> phone-less watch capture isn't possible with this free stack.

---

## 0. Verify the endpoint first (from any computer)

Replace `APP` with your Vercel domain and `SECRET` with `OPS_API_SECRET`:

```bash
curl -sS -X POST "https://APP.vercel.app/api/capture" \
  -H "Authorization: Bearer SECRET" \
  -H "Content-Type: application/json" \
  -d '{"raw":"buy milk tomorrow 5pm","tzOffsetMinutes":'"$(date +%z | awk '{o=substr($0,1,1);h=substr($0,2,2);m=substr($0,4,2);print (o=="-"?1:-1)*(h*60+m)}')"'}'
```

Expected: `{"ok":true,"result":{...},"record":{...},"kind":"task"}`. Open the app on
your phone/tablet — the task "buy milk" appears live, dated tomorrow 5pm.

- `tzOffsetMinutes` is the JS `new Date().getTimezoneOffset()` value (e.g. `300`
  for US Eastern). It makes "5pm" land at 5pm **local**. Omit it and times are
  interpreted as UTC.
- A `401` means the secret is wrong; `{"ok":false,"reason":"persist-failed"}`
  means the Supabase secret key / user isn't configured on the server.

---

## Option 1 — Google Assistant routine (simplest, no apps)

Best when you just want "Hey Google, log …" and don't need exact field control.

1. On the phone: **Google app → Profile → Settings → Google Assistant → Routines → +**.
2. **Starter:** "When I say" → `log to dashboard`.
3. **Action:** Assistant routines can't POST raw JSON directly, so add a
   **"Try adding your own" → app action** only if you have Tasker installed
   (Assistant can launch a Tasker task). If you don't want Tasker, Assistant alone
   can't reach the webhook — use Option 2.
4. With Tasker present: Assistant action → run Tasker task `OpsCapture` (below),
   passing the spoken text.

If Assistant can't capture free-form spoken text into a variable on your device,
fall back to Option 2, which is the reliable path.

---

## Option 2 — Tasker + a Wear OS tile (reliable, recommended)

This gives you a **one-tap watch tile → speak → task created**.

### A. Phone: create the Tasker task `OpsCapture`

1. Install **Tasker** (and optionally **AutoWear** or the built-in **Wear Tile**).
2. **Tasker → Tasks → +** → name `OpsCapture`.
3. Add actions in order:
   1. **Input → Get Voice** → Title "Capture", Language your locale. (Stores the
      spoken text in `%VOICE`.)
   2. **Variables → Variable Set**: Name `%TZ`, To `%TIMES`… simplest: skip and
      omit tz, or set `%TZ` to your offset in minutes (e.g. `300`).
   3. **Net → HTTP Request**:
      - **Method:** `POST`
      - **URL:** `https://APP.vercel.app/api/capture`
      - **Headers:**
        - `Authorization: Bearer SECRET`
        - `Content-Type: application/json`
      - **Body:**
        ```json
        {"raw":"%VOICE","tzOffsetMinutes":300}
        ```
        (Use your real offset, or drop `tzOffsetMinutes` entirely.)
   4. *(optional)* **Alert → Flash** `%HTTPD` to see the response.

### B. Watch: add the trigger

- **Built-in Tile:** Tasker → Preferences → enable the Wear companion, then add the
  **Tasker tile** on the watch and bind it to `OpsCapture`; **or**
- **AutoWear:** create a watch button/screen that sends a command the phone's
  AutoWear profile maps to running `OpsCapture`.

### C. Use it

On the watch: open the tile → tap → speak ("buy milk tomorrow 5pm") → done. Within
~2s it's on the phone and tablet dashboards.

---

## HTTP Shortcuts alternative (instead of Tasker)

If you prefer **HTTP Shortcuts** (simpler than Tasker for the request part):

1. New shortcut → **Method** POST, **URL** `https://APP.vercel.app/api/capture`.
2. **Headers:** `Authorization: Bearer SECRET`, `Content-Type: application/json`.
3. **Body (JSON):** `{"raw":"{{voice}}","tzOffsetMinutes":300}` and add a
   **"Ask for input / voice"** variable named `voice`.
4. Add the shortcut to the home screen; trigger it from the watch via the paired
   app or an Assistant routine that launches the shortcut.

---

## Field reference

| Field | Required | Notes |
|-------|----------|-------|
| `raw` | yes | The spoken/typed text. Triaged + cleaned by Claude. |
| `tzOffsetMinutes` | no | `new Date().getTimezoneOffset()` (e.g. 300 = UTC‑5). Makes relative times local. |
| `Authorization` | yes | `Bearer <OPS_API_SECRET>`. |

Server env required for persistence: `OPS_API_SECRET`, `SUPABASE_SECRET_KEY`,
`NEXT_PUBLIC_SUPABASE_URL`, and a created user (or `OPS_USER_ID`). `ANTHROPIC_API_KEY`
enables smart triage; without it the text becomes a plain task.
