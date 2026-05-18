# 619 ERP Frontend — Deployment Guide

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | ✅ Production | URL of the 619 backend API (e.g. `https://api.619fitness.com`) |

> In development, this defaults to `http://localhost:5000` if unset.

---

## Vercel (Recommended)

1. Connect the GitHub repo to a new Vercel project
2. Set `NEXT_PUBLIC_API_URL` in **Project Settings → Environment Variables**
   - Also set the Vercel secret: `vercel env add 619_api_url`
3. Push to `main` — Vercel auto-deploys

### Health check
```
GET https://your-vercel-url.vercel.app/api/health
```

---

## Docker (VPS / Railway / Render)

```bash
# Build
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://your-api.com \
  -t 619-erp-frontend .

# Run
docker run -d \
  -p 3000:3000 \
  --name 619-erp \
  619-erp-frontend
```

The container exposes port `3000` and runs a HEALTHCHECK against `/api/health`.

---

## Local Development

```bash
cp .env.local.example .env.local
# Edit .env.local — set NEXT_PUBLIC_API_URL to your local backend
npm ci --legacy-peer-deps
npm run dev
```

---

## CI/CD (GitHub Actions)

The `.github/workflows/ci.yml` runs on every push to `main` / `staging` and every PR:

1. **ESLint** (parallel)
2. **TypeScript type-check** (parallel)
3. **Production build** (after lint + typecheck pass)

Build artifacts are uploaded for 3 days.

---

## Known Issues & Notes

### face-api.js / TensorFlow peer dependency conflicts
`face-api.js@0.22.2` has peer deps on TensorFlow < 4.x but we use `^4.22.0`.
This is safe at runtime — the newer TF is backward compatible — but `npm ci`
needs the `--legacy-peer-deps` flag (already set in `vercel.json` installCommand
and CI workflow).

### Auth token storage
Auth tokens are stored in `localStorage` for simplicity. This is XSS-accessible.
For a higher-security deployment, migrate to `httpOnly` cookies via a backend
session endpoint. The `AuthProvider` in `src/lib/auth-context.tsx` is the only
place to change.

### face-api.js SSR exclusion
`face-api.js` and `@tensorflow/tfjs` are excluded from the server bundle in
`next.config.js` (webpack externals). The check-in page is additionally wrapped
with `next/dynamic + ssr:false`. Both guards must remain in place.
