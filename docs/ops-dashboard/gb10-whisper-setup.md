# GB10 Whisper Server — self-hosted, key-auth, reachable everywhere

**Paste this entire file as the prompt in a fresh Claude Code session running ON
the GB10.** It is a complete, standalone execution brief. Work autonomously and
end-to-end; verify each step before moving on. You have the actual box in front of
you — adapt commands to what this machine really is (arm64 + CUDA), don't assume.

---

## Mission

Stand up a **self-hosted Whisper speech-to-text server** on this GB10 that is:

1. **OpenAI-compatible** — exposes `POST /v1/audio/transcriptions` (multipart
   `file` + `model`) so any app that allows a custom OpenAI base URL works
   (dictation apps, the user's "Ops Dashboard" PWA, scripts).
2. **GPU-accelerated** — runs Whisper **large-v3** (or **large-v3-turbo**) on the
   GB10 GPU. Free, open weights.
3. **Key-protected** — requires `Authorization: Bearer <API_KEY>`. Generate a
   strong key; unauthenticated requests get 401.
4. **Reachable from anywhere** — exposed publicly over HTTPS via **Tailscale
   Funnel** (the user already uses Tailscale + Funnel on another node), so phones,
   tablets, a Vercel app, and laptops can all reach it with the key.
5. **Always-on** — survives reboots (Docker `restart: unless-stopped` + Funnel
   persisted; optional systemd unit).

**Acceptance:** from a machine that is NOT on the tailnet,
`curl -F file=@sample.wav -F model=whisper-1 -H "Authorization: Bearer <KEY>"
https://<node>.<tailnet>.ts.net/v1/audio/transcriptions` returns the correct
transcript JSON, and the same call WITHOUT the key returns 401.

---

## Target hardware (verify, don't assume)

- **GB10 = NVIDIA Grace‑Blackwell (DGX Spark‑class)** — **arm64 (aarch64) + CUDA**,
  large unified memory, DGX OS / Ubuntu 24.04. NVIDIA Container Toolkit is
  typically preinstalled. **This is NOT x86** — many prebuilt CUDA Docker images
  are x86-only, so verify image arch or build/run a path that supports arm64+CUDA.

Run first and record results:
```bash
uname -m                      # expect aarch64
nvidia-smi                    # GPU present + driver/CUDA version
docker --version && docker info | grep -i runtime   # nvidia runtime?
docker run --rm --gpus all nvcr.io/nvidia/cuda:12.6.2-base-ubuntu24.04 nvidia-smi  # GPU in containers
tailscale status              # logged in? which tailnet?
tailscale funnel status       # is Funnel available on this tailnet/node?
```
If GPU-in-Docker fails, install/repair the **NVIDIA Container Toolkit** before
continuing. If Tailscale isn't logged in, have the user run `sudo tailscale up`.

---

## Locked decisions (don't re-litigate)

- OpenAI-compatible `/v1/audio/transcriptions`. Default model id the clients send:
  **`whisper-1`** (map it to large-v3-turbo internally).
- Auth = static bearer key (one shared key is fine; single user). Put the key in
  front via a tiny reverse proxy or the server's own auth — never bake it into a
  public image layer.
- Public exposure = **Tailscale Funnel** (handles HTTPS + a real cert). Do NOT
  open raw ports to the internet.
- Keep it on the GPU. Confirm GPU utilization during a test transcription.

---

## Recommended stack (pick what installs cleanly on arm64+CUDA)

Try in this order; each is fine. The wrapper (key proxy + Funnel) is identical.

### Engine — choose ONE
- **A. `speaches`** (faster-whisper / CTranslate2), OpenAI-compatible out of the
  box. Simplest IF an arm64+CUDA image/build runs here:
  ```bash
  docker run -d --name whisper --gpus all -p 127.0.0.1:8000:8000 \
    -e WHISPER__MODEL=Systran/faster-whisper-large-v3 \
    --restart unless-stopped ghcr.io/speaches-ai/speaches:latest-cuda
  ```
  Verify the image is arm64 (`docker image inspect ... | grep -i arch`). If
  CTranslate2 has no aarch64+CUDA wheel and it falls back to CPU or won't start,
  use B.
- **B. vLLM transcription (most DGX‑Spark‑native).** vLLM serves Whisper with an
  OpenAI-compatible transcription endpoint and has arm64+CUDA support NVIDIA ships
  for Spark:
  ```bash
  # via NVIDIA's vLLM container or pip in a CUDA base; then:
  vllm serve openai/whisper-large-v3 --task transcription \
    --host 127.0.0.1 --port 8000
  ```
  This exposes `/v1/audio/transcriptions` directly.
- **C. `whisper.cpp` + tiny shim (last resort, always builds on arm64+CUDA).**
  Build with `GGML_CUDA=1`, run `whisper-server`, and put a ~30-line FastAPI shim
  in front that accepts OpenAI multipart `/v1/audio/transcriptions` and calls
  whisper.cpp's `/inference`. Only do this if A and B both fail.

**Confirm GPU use:** during a transcription, `nvidia-smi` must show the process and
GPU memory in use. If it's on CPU, fix it (wrong image/build) — CPU large-v3 is too
slow for "all the time" dictation.

### Auth + public URL (common to all engines)
Generate the key and front the engine with **Caddy** (clean header check), then
Funnel the Caddy port:

```bash
mkdir -p ~/whisper && cd ~/whisper
KEY="sk-whisper-$(openssl rand -hex 24)"; echo "$KEY" > KEY.txt; chmod 600 KEY.txt
cat > Caddyfile <<EOF
:8080 {
  @unauth not header Authorization "Bearer ${KEY}"
  respond @unauth "Unauthorized" 401
  reverse_proxy 127.0.0.1:8000
}
EOF
docker run -d --name whisper-auth --network host --restart unless-stopped \
  -v "$PWD/Caddyfile:/etc/caddy/Caddyfile" caddy:2
# expose publicly over HTTPS (Funnel forwards 443 -> localhost:8080)
sudo tailscale funnel --bg 8080
tailscale funnel status      # note the https://<node>.<tailnet>.ts.net URL
```
> If you prefer one tool for both auth + routing, run **LiteLLM** instead of Caddy
> with `master_key: <KEY>` and a `model_list` entry mapping `whisper-1` ->
> `openai/<engine-model>` at `api_base: http://127.0.0.1:8000/v1`, then Funnel
> LiteLLM's port. (The user already runs LiteLLM elsewhere, so this matches.)

---

## Execution plan (verify at each step)

1. **Env check** — run the hardware/Tailscale commands above; fix GPU-in-Docker and
   Tailscale login before proceeding.
2. **Engine up** — start engine A/B/C; pull/warm **large-v3-turbo** (or large-v3);
   confirm it listens on `127.0.0.1:8000` and uses the **GPU**.
3. **Local transcription test** — make a real clip and transcribe it locally
   (bypassing auth, hitting :8000):
   ```bash
   # generate speech without internet: espeak-ng or a bundled sample
   espeak-ng -w sample.wav "buy milk tomorrow at five pm" 2>/dev/null || \
     (sudo apt-get install -y espeak-ng && espeak-ng -w sample.wav "buy milk tomorrow at five pm")
   curl -s -F file=@sample.wav -F model=whisper-1 http://127.0.0.1:8000/v1/audio/transcriptions
   ```
   Expect text ≈ "buy milk tomorrow at five pm". Note the latency.
4. **Auth + Funnel** — start Caddy (or LiteLLM) with the generated key; enable
   Funnel; capture the public URL.
5. **Public acceptance test** — from off the tailnet (ask the user to run it from
   their phone on cellular, or use a non-tailnet shell):
   ```bash
   curl -F file=@sample.wav -F model=whisper-1 \
     -H "Authorization: Bearer <KEY>" https://<node>.<tailnet>.ts.net/v1/audio/transcriptions   # 200 + transcript
   curl -o /dev/null -w "%{http_code}\n" -X POST https://<node>.<tailnet>.ts.net/v1/audio/transcriptions   # 401
   ```
6. **Make permanent** — Docker `restart: unless-stopped` (done above) keeps the
   engine + auth alive; `tailscale funnel --bg` persists across reboots. Optionally
   write a `docker-compose.yml` + a `systemd` unit so it auto-starts. Confirm by
   `sudo reboot` and re-running the public test (optional but recommended).

---

## Output — print this block at the end (the user pastes it back to me)

```
WHISPER_BASE_URL = https://<node>.<tailnet>.ts.net      # ends WITHOUT /v1
WHISPER_ENDPOINT = https://<node>.<tailnet>.ts.net/v1/audio/transcriptions
WHISPER_API_KEY  = sk-whisper-...                        # from KEY.txt
WHISPER_MODEL    = whisper-1                             # what clients send
ENGINE           = speaches | vllm | whisper.cpp (which one ran)
LATENCY          = ~Xs for a 3s clip on GPU
```

Also include: the exact working `curl`, and confirmation that the no-key call
returns 401.

---

## Using it everywhere (Whisper-Flow-style dictation, "just a key")

This server is a standard OpenAI transcription endpoint, so it drops into any app
that lets you set a **custom OpenAI base URL + API key + model**:

- **macOS / Windows dictation apps** that support custom OpenAI endpoints — e.g.
  **superwhisper**, **MacWhisper**, **VoiceInk**, **Whispering** (open source).
  Set: Base URL `https://<node>.<tailnet>.ts.net/v1`, API key `<KEY>`, model
  `whisper-1`. (Wispr Flow itself is cloud-only and may not accept custom
  endpoints; the open ones above give the same press-to-dictate-anywhere feel.)
- **Phone:** any app/shortcut that POSTs an audio file to the endpoint with the
  bearer key (HTTP Shortcuts / Tasker record → upload), or a keyboard that allows a
  custom STT endpoint.
- **The Ops Dashboard:** hand me `WHISPER_BASE_URL`, `WHISPER_MODEL`, and the key,
  and I'll wire `/api/transcribe` (records audio on the phone/tablet → this server →
  text → AI triage), with on-device Web Speech as the offline fallback.

---

## Security & guardrails

- The Funnel URL is **public** — the bearer key is the only thing protecting it.
  Use a long random key (done), keep `KEY.txt` `chmod 600`, rotate if leaked.
- Consider a basic rate limit (Caddy `rate_limit`, or LiteLLM limits) so a leaked
  key can't be abused to pin your GPU.
- Don't log audio/transcripts to disk unless you want them retained.
- Keep the engine bound to `127.0.0.1` (only Caddy/Funnel is exposed).

## Definition of done
- `nvidia-smi` shows Whisper on the **GPU**; large-v3(-turbo) loaded.
- Public HTTPS endpoint transcribes correctly **with** the key, returns **401**
  without it, from **off the tailnet**.
- Survives a reboot (engine + auth + Funnel come back automatically).
- The output block above is printed for the user to bring back to the Ops Dashboard.
```
