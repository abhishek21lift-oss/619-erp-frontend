# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

619 Fitness ERP frontend — Next.js 16 (App Router, webpack — not Turbopack) + React 19 + TypeScript, serving the studio/staff, member/client, and platform-super-admin portals for the 619 ERP product. Talks to the sibling `619-erp-backend` Express API; there is no direct database access and no `@supabase/supabase-js` dependency from this app (the lone file under `supabase/migrations/` is vestigial, not an active schema source — the backend repo owns migrations).

## Commands

```bash
npm run dev                 # next dev --webpack — local dev server
npm run build                # next build --webpack
npm start                    # next start (serves a production build)

npm run typecheck             # tsc --noEmit
npm run lint                  # eslint . (CI allows up to 230 warnings — a frozen ratchet, see below)
npm run knip                  # unused-exports/files check

npm test                      # vitest run — fast unit tests, no DB/browser required
npm run test:watch            # vitest (watch mode)
npx vitest run path/to/file.test.tsx        # single test file
npx vitest run -t "test name substring"     # single test by name

npm run e2e                   # playwright test — full stack: real Postgres + real backend + real browser
npm run e2e:api               # playwright test --project=api — API-only isolation tests, no browser
```

E2E tests are **not** part of `npm test` on purpose — Vitest is the fast inner loop and must run without any backend/database. E2E needs the backend repo's `npm run e2e:setup` (see that repo) to provision Postgres, plus both the frontend (`E2E_APP_URL`, default `127.0.0.1:3100`) and backend (`E2E_API_URL`, default `127.0.0.1:5100`) running. `*.ui.spec.ts` files drive a real browser against the app; `*.api.spec.ts` files hit the backend directly (bypassing the UI) because tenant-isolation has to be proven impossible at the source, not merely unrendered.

## Architecture

### Routing

`src/app/` uses the Next.js App Router. Top-level segments correspond to portals/areas: `admin/`, `member/`, `client/`, `trainer/`, `platform/` (super-admin), `pt-os/`, plus feature areas (`attendance/`, `finance/`, `insights/`, `operations/`, `sales/`, `reports/`, `engagement/`, `training/`, `checkin/`, `subscription/`, `support/`, `ai/`, `ai-coach/`). `src/app/api/` holds a small number of actual Next.js route handlers (e.g. `/api/health`, `/api/settings/gym`) — this is distinct from the backend's `/api/*`, which is reached via rewrite (see below), not via these route handlers.

`next.config.js` defines permanent redirects for renamed routes (e.g. `/pt-os` → `/`, `/admin` → `/admin/dashboard`) — check there before assuming a URL is dead.

### Reaching the backend

In production, `next.config.js`'s `rewrites()` proxies `/api/:path*` and `/uploads/:path*` to `NEXT_PUBLIC_API_URL` (build-time env, required in prod — build fails loudly if unset). In development there are no rewrites; `apiBase()` in `src/lib/http.ts` resolves the backend URL directly (lazily, at call time, to avoid SSR crashes when the env var is absent). WebSocket/realtime traffic (Command Center stream) cannot go through the HTTP rewrite (no Upgrade support), so it addresses the backend origin directly via `wsBase()`, which is derived from the same `NEXT_PUBLIC_API_URL` by swapping the scheme to `wss`/`ws` — this is why that single env var must stay the one source of truth for both.

All backend calls go through `src/lib/http.ts` (a hardened fetch wrapper: typed `ApiError`, in-flight dedup, in-memory GET cache with TTL, `AbortSignal` support, small exponential backoff on GET, and a global 401 handler that fires a `session-expired` event rather than a hard redirect) and the typed endpoint modules under `src/lib/api/endpoints/` (`auth.ts`, `people.ts`, `money.ts`, `training.ts`, `ptOs.ts`, `insights.ts`, `engagement.ts`, `platform.ts`, `studio.ts`, `progress.ts`), re-exported via `src/lib/api/index.ts`. Add new backend calls there rather than calling `fetch` ad hoc in components.

### Auth

JWT is stored in an httpOnly cookie set by the backend (`POST /api/auth/login`), not localStorage — requests use `credentials: 'include'`. A minimal, non-sensitive user projection is cached in `sessionStorage` (cleared on tab close) via `src/lib/session-cache.ts`; the full user object (including email) is kept in memory only, inside `src/lib/auth-context.tsx` (`AuthProvider`). If the backend falls back to returning `{ token }` in the response body, the frontend keeps that token in memory as a bearer fallback — a transitional path, not the primary mechanism. `src/lib/roles.ts` and `src/lib/permissions-context.tsx` / `src/lib/features-context.tsx` gate UI by role and by backend feature flags respectively.

### Security headers & CSP

Single source of truth is `src/lib/security-headers.js`, applied in `next.config.js`'s `headers()` — deliberately **not** duplicated in middleware (`src/proxy.ts`), because a middleware `headers.set()` silently overrides the `next.config.js` value and the two had drifted apart before. `next.config.js`'s header rule applies to every path including the `/api/:path*` rewrite target, which a middleware matcher cannot express. The `/checkin` route carries a deliberately relaxed CSP (`unsafe-eval`) because the TensorFlow.js WebGL backend needs `Function()` constructors — this is intentional and scoped, do not remove it or widen it elsewhere.

### Components & styling

Tailwind CSS (`tailwind.config.ts`) with a shared component library under `src/components/ui/` (`Button`, `Card`, `KpiCard`, `GlassTable`, `DonutChart`, `PageHeader`, `PageHero`, `Skeleton`, etc.) — prefer these over one-off markup for common patterns (cards, tables, stat tiles, page headers). Feature-area components live under `src/components/<area>/` (`pt-os/`, `fitness/`, `payments/`, `revenue/`, `platform/`, `dashboards/`, `ai/`, `search/`, `sidebar/`, `profile/`). Path alias `@/*` maps to `src/*` (see `tsconfig.json`).

### Testing

Vitest + Testing Library + jsdom for unit/component tests (`src/__tests__/`, `environment: 'jsdom'`, setup in `src/__tests__/setup.ts`). Playwright for E2E (`e2e/`), split into `api` (no browser) and `chromium` (real browser) projects — see Commands above. CI (`.github/workflows/ci.yml`) runs lint, typecheck, Vitest, and the E2E job in parallel; the E2E job checks out the backend repo alongside this one (isolation is a property of the pair) and currently runs with `continue-on-error: true` pending a cross-repo CI token, so it does not yet block deploys.

### Deployment

**Not Vercel** — there is no `vercel.json`. Push to `main` → `.github/workflows/deploy.yml` (gated on a successful CI run, same `workflow_run` pattern as the backend) → SSH to the same Hostinger VPS the backend deploys to → `docker compose build frontend && docker compose up -d frontend`. The container runs `next start` in standalone mode on port 3000, bound to localhost; nginx (version-controlled in the **backend** repo, `infra/nginx/`) terminates TLS and routes by Host header (`myptstudio.com`/`www` → frontend, `api.myptstudio.com` → backend). `NEXT_PUBLIC_API_URL` is a build-time Docker build-arg, not a runtime env var — changing it requires a rebuild, not just a container restart. See `DEPLOYMENT.md` for the full request-path diagram and the cookie-auth contract the backend must satisfy.

### Notable root docs

- `DEPLOYMENT.md` — env vars, the cookie-based auth contract with the backend, the actual (non-Vercel) deploy topology, CSP exception for `/checkin`, face-model asset caching.
- `AUDIT-REPORT.md`, `DASHBOARD-AUDIT.md`, `FULLSTACK-AUDIT.md`, `BACKEND-FRONTEND-AUDIT.md` — historical audit findings; useful for understanding why certain patterns exist (e.g. the E2E suite, the security-headers consolidation) but not living specs.

## Code style

- ESLint (`eslint.config.mjs`): Next.js recommended + core-web-vitals rules, `react-hooks/rules-of-hooks` as an error, `@typescript-eslint/no-explicit-any` and `react-hooks/exhaustive-deps` as warnings. The CI warning ceiling (`--max-warnings=230`) is a ratchet against the current backlog — it should only go down as warnings are cleaned up, never be raised to accommodate new ones.
- `strict: true` in `tsconfig.json`. `src/__tests__` is excluded from the main TS project (tests are still type-checked via Vitest's own toolchain).
- No `pages/` directory — App Router only.
