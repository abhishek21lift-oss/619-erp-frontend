# This image is built ON the VPS, over the VPS's network, on every deploy.
#
# That network is the least reliable thing in the pipeline, and the build has
# three separate dependencies on it:
#
#   1. Docker Hub          the `node:20-alpine` base image
#   2. registry.npmjs.org  `npm ci` below
#   3. Google Fonts        `next/font/google` in src/app/layout.tsx, fetched
#                          during `npm run build`
#
# All three have to succeed or the deploy fails, and two of them have already
# failed in consecutive attempts on the same commit:
#
#   attempt 1  DeadlineExceeded  loading metadata for node:20-alpine
#   attempt 2  EIDLETIMEOUT      registry.npmjs.org:443, after 464 seconds
#
# Neither is caused by anything in the application. What the Dockerfile CAN do
# is stop starting from zero every time, and stop giving up so readily — which
# is what the cache mounts and retry settings below are for.
#
# Deliberately NO `# syntax=docker/dockerfile:1` directive. That would make
# every build pull the dockerfile frontend image from Docker Hub first, which
# is precisely what timed out in attempt 1. `RUN --mount` is supported by
# BuildKit's built-in frontend, so the directive buys nothing here and adds a
# fourth network dependency.

# ─── Stage 1: Install ALL dependencies (including devDeps for build) ─
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./

# Install ALL deps (devDeps needed for TypeScript + Next.js build)
# --legacy-peer-deps: face-api.js / TensorFlow have peer-dep conflicts with React 18
#
# The cache mount is the important part. Without it every deploy re-downloads
# the entire dependency tree, so a network that drops one connection in a
# hundred gets a hundred chances to fail. With it, a retried build only fetches
# what the previous attempt did not already have. `sharing=locked` because two
# concurrent deploys would otherwise write the same cache directory —
# deploy.yml has no concurrency group, so that is possible today.
#
# The flags, in order of what they address:
#   --prefer-offline   use the cache above before asking the network at all
#   --no-audit         skips a separate POST to the registry's audit endpoint
#   --no-fund          skips another round trip that prints a donation notice
#   --fetch-retries    2 by default; EIDLETIMEOUT is exactly what retries exist
#                      for, and 5 attempts over a slow link is still cheaper
#                      than a failed deploy
#   --fetch-timeout    300000ms by default. Attempt 2 died at 464s having burnt
#                      its retries; 10 minutes gives a slow-but-working link
#                      room to finish rather than being cut off mid-transfer.
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci --legacy-peer-deps \
      --prefer-offline \
      --no-audit \
      --no-fund \
      --fetch-retries=5 \
      --fetch-retry-mintimeout=20000 \
      --fetch-retry-maxtimeout=120000 \
      --fetch-timeout=600000

# ─── Stage 2: Build ────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Where the AI service (repo: mps-ai) lives on the compose network. Read by
# next.config.js's rewrites(), which Next.js evaluates at BUILD time and bakes
# into routes-manifest.json — so this has to be an ARG, not a runtime env var.
# Optional: unset means /ai/* is simply not routed, and the build still
# succeeds, which is what lets a deploy without the AI service keep working.
ARG AI_SERVICE_URL
ENV AI_SERVICE_URL=$AI_SERVICE_URL

# `.next/cache` cached across builds for the third network dependency above:
# next/font/google downloads Inter and JetBrains Mono from Google at BUILD
# time, and Next has no retry setting for it. A warm cache means a rebuild does
# not re-fetch them, so the one build-time fetch that cannot be made resilient
# is instead usually not made at all.
#
# It also carries Next's compilation cache, which is why a rebuild after a
# failed deploy is much faster than the first.
RUN --mount=type=cache,target=/app/.next/cache,sharing=locked \
    npm run build

# ─── Stage 3: Production runner (minimal image) ────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Issue #10 — Standalone deployment requires these three COPY lines:
#   1. public/          — static assets (robots.txt, logo, face models, etc.)
#   2. .next/standalone — generated Node server + all dependencies inlined
#   3. .next/static     — hashed JS/CSS chunks served by Next.js
#
# Without line 3, _next/static/* returns 404 in production.
# Without line 1, public/* (models, robots.txt) returns 404.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Runtime package.json (readable version at /api/health)
COPY --from=builder /app/package.json ./package.json

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Docker HEALTHCHECK.
#
# 127.0.0.1 rather than localhost: on Alpine, localhost resolves to ::1
# first, and the standalone server binds HOSTNAME=0.0.0.0 which is IPv4
# only. wget then fails to connect and the container sits permanently
# unhealthy while serving traffic perfectly well.
#
# This was fixed on the VPS and never made it back here, so every pull
# conflicted on this line. Adopting the box's working version ends that.
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ || exit 1

CMD ["node", "server.js"]
