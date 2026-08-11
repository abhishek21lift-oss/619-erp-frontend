# ─── Stage 1: Install ALL dependencies (including devDeps for build) ─
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Install ALL deps (devDeps needed for TypeScript + Next.js build)
# --legacy-peer-deps: face-api.js / TensorFlow have peer-dep conflicts with React 18
RUN npm ci --legacy-peer-deps

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

RUN npm run build

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
