# ============================================================
# Stage 1: deps — Install semua dependencies di Linux Alpine
# ============================================================
FROM node:20-alpine AS deps

RUN apk add --no-cache libc6-compat openssl python3 make g++
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma

# Install ALL dependencies (termasuk devDeps untuk prisma & build)
RUN npm ci --legacy-peer-deps --ignore-scripts

# ============================================================
# Stage 2: builder — Generate Prisma + Build Next.js
# ============================================================
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl
WORKDIR /app

# Copy node_modules dari deps stage
COPY --from=deps /app/node_modules ./node_modules

# Build-time env variables (required oleh Next.js saat build)
ARG DATABASE_URL
ARG DIRECT_URL
ARG AUTH_SECRET
ARG GOOGLE_CLIENT_ID
ARG GOOGLE_CLIENT_SECRET
ARG NEXTAUTH_URL
ARG BASE_URL
ARG MIDTRANS_SERVER_KEY
ARG MIDTRANS_CLIENT_KEY
ARG MIDTRANS_ENV
ARG NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

ENV DATABASE_URL=$DATABASE_URL
ENV DIRECT_URL=$DIRECT_URL
ENV AUTH_SECRET=$AUTH_SECRET
ENV GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID
ENV GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET
ENV NEXTAUTH_URL=$NEXTAUTH_URL
ENV BASE_URL=$BASE_URL
ENV MIDTRANS_SERVER_KEY=$MIDTRANS_SERVER_KEY
ENV MIDTRANS_CLIENT_KEY=$MIDTRANS_CLIENT_KEY
ENV MIDTRANS_ENV=$MIDTRANS_ENV
ENV NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=$NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=1

# Copy seluruh source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js (output: standalone)
RUN npm run build

# ============================================================
# Stage 3: runner — Image final production, sekecil mungkin
# ============================================================
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Buat non-root user untuk keamanan
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# ── Next.js standalone output ──────────────────────────────
COPY --from=builder /app/public                                 ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static     ./.next/static

# ── Prisma (untuk migrate deploy saat startup) ─────────────
COPY --from=builder --chown=nextjs:nodejs /app/prisma            ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/package.json      ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/package-lock.json ./package-lock.json

# ── Copy node_modules (untuk prisma CLI) lalu prune ────────
COPY --from=deps /app/node_modules ./node_modules

# ── Copy Prisma generated client dari builder ──────────────
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# ── Entrypoint ─────────────────────────────────────────────
COPY --from=builder /app/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Fix ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["./entrypoint.sh"]
