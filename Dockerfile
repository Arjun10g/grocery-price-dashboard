# syntax=docker/dockerfile:1.7
#
# Hugging Face Spaces deployment image for the Next.js dashboard.
# Builds standalone (per next.config.ts) and runs on port 7860 to
# match Spaces' default container port.
#
# Build-time env: NEXT_PUBLIC_* values are baked into the client
# bundle at `next build`, so they MUST be present at build time.
# Pass them via Spaces "Variables and secrets" — they're public by
# design (the anon key is RLS-gated; supabase URL is public).

# ---------- deps ----------
FROM node:22-alpine AS deps
WORKDIR /app

# Reproducible install from the lockfile only.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---------- builder ----------
FROM node:22-alpine AS builder
WORKDIR /app

ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------- runtime ----------
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=7860
ENV HOSTNAME=0.0.0.0

# Standalone bundle includes only what's needed at runtime.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 7860

# Run as the unprivileged HF Spaces user.
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    chown -R nextjs:nodejs /app
USER nextjs

CMD ["node", "server.js"]
