# 619 ERP Frontend — Deployment Guide

> Issue #18 FIX — Config / environment documentation.

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | No (dev) / Yes (prod) | `http://localhost:5000` | Full URL of the 619 backend API. Must be HTTPS in production. |
| `AI_SERVICE_URL` | **No — leave unset in production** | — (empty) | Build-time target for the *alternative* `/ai/*` rewrite (Client AI panel). With the standard vhost, nginx owns `/ai/*` and this must stay unset — see "The AI service (mps-ai)" below and `.env.example` (`docker-compose.snippet.yml` in the mps-ai repo carries the same rule). |
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

Both names resolve to the same VPS address.

**The request path has three shapes, and the difference matters:**

```
API calls    browser → nginx → frontend container → Next rewrite → backend
WebSocket    browser → nginx ──────────────────────────────────→ backend
Client AI    browser → nginx → mps-ai container, 127.0.0.1:4100
```

Ordinary calls use relative URLs and are forwarded by the Next.js rewrite in
`next.config.js`. That hop is an HTTP proxy and does **not** carry a WebSocket
Upgrade, which is why realtime traffic addresses `api.myptstudio.com` directly
via `wsBase()`.

The Ask AI panel's calls are shaped differently again: `/ai/*` terminates in
nginx itself (a `location /ai/` block proxying to the mps-ai container), so it
never enters this container. Auth still works because the browser keeps talking
to `myptstudio.com` — same origin, so the httpOnly `token` cookie (`sameSite:
strict`) is sent, and `src/lib/client-ai.ts` forwards it with
`credentials: 'include'`.

The nginx configuration is version-controlled in the **backend** repo under
`infra/nginx/` — including the WebSocket block, which nginx needs explicitly,
and the `/ai/` block. See that repo's `infra/nginx/README.md` for the
client-agent route rules. The one that touches this repo: while the `/ai/`
location is on the box, `AI_SERVICE_URL` must stay unset, or this container's
rewrite becomes a second route for the same path (see the Environment
Variables table at the top).

## The AI service (mps-ai) — what this repo owns

The client-agent is a separate Node service (repo `mps-ai`, port 4100). This
repo owns only the browser half:

- `src/lib/client-ai.ts` — the one transport module. Same-origin `/ai/*` path,
  cookie auth, SSE consumption. `aiBase()` deliberately returns `''` (not the
  `apiBase()` barrel, which targets the ERP only).
- `next.config.js` — the *alternative* build-time rewrite for `/ai/*`
  (`AI_SERVICE_URL`), used only where the nginx block cannot be adopted.
- Error envelope — failures surface as typed codes (`NO_TOKEN`, `RATE_LIMITED`,
  `ORIGIN_NOT_ALLOWED`, `QUOTA_EXCEEDED`, `MODEL_FAILED`, …) rendered in the
  Ask AI panel.

### Troubleshooting the Ask AI panel

| Symptom | Most likely cause | Where to look |
|---|---|---|
| 404 on every `/ai/*` call | Neither route exists on the box: no nginx `location /ai/`, and `AI_SERVICE_URL` unset | backend repo `infra/nginx/myptstudio.conf` (is the block there?) — or set `AI_SERVICE_URL` as a build arg for the rewrite route |
| 401 `NO_TOKEN` | Browser got to mps-ai without the cookie | ask in the same browser tab logged into myptstudio.com; check the fetch used `credentials: 'include'` |
| 403 `ORIGIN_NOT_ALLOWED` | `AI_ALLOWED_ORIGINS` on mps-ai does not include `https://myptstudio.com` | mps-ai env (box `.env`) |
| 429 `RATE_LIMITED` | Client-agent rate limit (`AI_RATE_LIMIT_MAX`, default 30/min per user), not the ERP's limiter | wait or raise the box env |
| 503/502 `MODEL_FAILED` | OpenRouter outage or drift on `AI_PRIMARY_MODEL` / `AI_FALLBACK_MODEL` | mps-ai logs; provider status page |
| 504 after ~60s | The box still has an old vhost without the `/ai/` 300s treatment | backend `infra/nginx/README.md` — diff the live vhost |
| Works logged in as staff, wrong/cross data when impersonating | **known gap** — the `/ai` hop carries only the operator's cookie (Phase 3 remediation in flight) | `src/lib/client-ai.ts` |


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
