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

**Vercel:**
1. Project → Settings → Environment Variables
2. Add `NEXT_PUBLIC_API_URL` = your backend URL (e.g. `https://api.619fitness.in`)
3. Scope to Production / Preview as needed

**Docker:**
```bash
docker build --build-arg NEXT_PUBLIC_API_URL=https://api.619fitness.in -t 619-erp .
docker run -p 3000:3000 619-erp
```

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

## Vercel Deployment

1. Connect GitHub repo to Vercel
2. Set `NEXT_PUBLIC_API_URL` in Vercel dashboard
3. Deploy — Next.js standalone output is NOT needed on Vercel (Vercel handles this)
4. Verify: visit `https://your-domain.vercel.app/api/health`

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
