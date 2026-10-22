# 619 ERP Frontend — Deployment Guide

> Issue #18 FIX — Config / environment documentation.

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | No (dev) / Yes (prod) | `http://localhost:5000` | Full URL of the 619 backend API. Must be HTTPS in production. |
| `NODE_ENV` | Auto-set | — | Set to `production` by Next.js / Docker. |
| `NEXT_TELEMETRY_DISABLED` | Recommended | `1` | Disable Next.js anonymous telemetry. |
| `PORT` | No | `3000` | HTTP port the server listens on. |
| `HOSTNAME` | No | `0.0.0.0` | Hostname to bind. Use `0.0.0.0` in Docker. |

### Setting variables

**Local dev:** Copy `.env.local.example` → `.env.local` and fill in values.

**Production (the VPS):** set as a build arg in `/opt/myptstudio/docker-compose.yml`
on the box. It is a `NEXT_PUBLIC_*` variable, so it is baked in at BUILD time —
changing it needs a rebuild, not just a restart.

```bash
docker build --build-arg NEXT_PUBLIC_API_URL=https://api.myptstudio.com -t 619-erp .
docker run -p 3000:3000 619-erp
```

`NEXT_PUBLIC_API_URL` is the single source of truth for both the API origin and
the WebSocket origin — `wsBase()` in `src/lib/http.ts` swaps the scheme
(`https` → `wss`), so a domain change is one edit and the two cannot disagree.

## Authentication — Cookie Migration (Issue #2)

The frontend now uses httpOnly cookies for JWT storage instead of localStorage.
Your backend **must** set the following header on `POST /api/auth/login`:

```
Set-Cookie: token=<jwt>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400
```

For a Node/Express backend:
```js
res.cookie('token', jwt, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 86400 * 1000, // 24 hours
});
```

The frontend reads the cookie automatically via `credentials: 'include'` on all
fetch calls. **No code changes needed on the frontend once the backend is updated.**

Backward compatibility: If the backend still returns `{ token: "..." }` in the
response body, the frontend keeps the token in memory as a bearer fallback.
This is a transitional mode — the goal is to fully migrate to cookie-only auth.

## Docker Verification

```bash
# Build
docker build -t 619-erp .

# Run
docker run -d -p 3000:3000 --name 619-erp 619-erp

# Health check
curl http://localhost:3000/api/health
# Expected: {"status":"ok", ...}

# View logs
docker logs 619-erp
```

## How this actually deploys

**Not Vercel.** There is no Vercel project in the request path, and there is no
`vercel.json` — it was removed because it described a deployment that does not
happen and had already misled a reader into thinking Vercel proxied the API.

Push to `main` → `.github/workflows/deploy.yml` → SSH to the VPS →
`docker compose build frontend && docker compose up -d frontend`. The container
serves Next.js standalone on port 3000, bound to localhost; nginx on the host
terminates TLS and routes by Host header:

| Host | nginx sends it to |
|---|---|
| `myptstudio.com`, `www.myptstudio.com` | frontend container, `127.0.0.1:3000` |
| `api.myptstudio.com` | backend container, `127.0.0.1:5000` |

All three names resolve to the same VPS address.

**The request path has two shapes:**

```
API calls    browser → nginx → frontend container → Next rewrite → backend
WebSocket    browser → nginx ──────────────────────────────────→ backend
```

Ordinary calls use relative URLs and are forwarded by the Next.js rewrite in
`next.config.js`. That hop is an HTTP proxy and does **not** carry a WebSocket
Upgrade, which is why realtime traffic addresses `api.myptstudio.com` directly
via `wsBase()`.

The Client Assistant is an ordinary API call now: `POST
/api/ai/client-agent/chat/stream` on this origin, forwarded to the backend like
everything else. There is no `/ai/*` rewrite and no separate AI container.
Auth is the same httpOnly `token` cookie (`sameSite: strict`), and
`src/lib/client-ai.ts` adds `tenantAuthHeaders()` for impersonation.

The nginx configuration is version-controlled in the **backend** repo under
`infra/nginx/`. **Both** the frontend and API vhosts need the `/api/ai/` block
with a 300s read timeout and buffering off: the browser hits the frontend
vhost, and the Next rewrite makes a second request through the API vhost. The
production order and rollback commands are in the backend's
`docs/AI-CLIENT-ASSISTANT-CUTOVER.md`.

### Troubleshooting the Ask AI panel

| Symptom | Most likely cause | Where to look |
|---|---|---|
| 404 `CLIENT_NOT_FOUND` | The client is not in the caller's studio (or was deleted) | the client list; check the studio, not the AI |
| 401 `NO_TOKEN` | No/expired session cookie | sign in again; the panel maps this to "session expired" |
| 403 `AI_NOT_ENABLED` | The studio's plan does not include `ai_suite` | studio plan/feature flags |
| 429 | AI rate limit or monthly quota | the error code distinguishes `RATE_LIMITED` / `QUOTA_EXCEEDED` |
| 503 `ALL_MODELS_FAILED` / `MODEL_FAILED` | OpenRouter outage or model config drift | backend logs `client_agent_model_failed`; provider status page |
| 504 after ~60s | The vhost is missing the `/api/ai/` 300s treatment | backend `infra/nginx/README.md` — diff the live vhost |
| Answer cut off mid-sentence | Upstream stream ended without `done` | the panel marks it incomplete; backend logs the request id |


## Content Security Policy — /checkin route

The `/checkin` route has a relaxed CSP (`unsafe-eval` added) because TensorFlow.js
WebGL backend uses `Function()` constructors. All other routes use the strict CSP.

This is **intentional** and scoped. Do NOT remove the per-route configuration in
`next.config.js`.

## Face Model Assets

Face recognition models live in `public/models/`.
They are served with `Cache-Control: immutable` (1 year). The hook falls back
to the jsdelivr CDN if local models 404.

## Sitemap & robots.txt

- `public/robots.txt` — disallows API and auth routes from crawlers
- `public/sitemap.xml` — lists only public pages. Update `<lastmod>` on release.
  For dynamic sitemaps, replace with `app/sitemap.ts`.
