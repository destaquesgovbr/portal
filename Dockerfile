# Multi-stage build for Next.js 15 on Cloud Run

# Stage 1: Install dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable
RUN pnpm install --frozen-lockfile

# Stage 2: Build the application
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments for environment variables
ARG NEXT_PUBLIC_TYPESENSE_HOST
ARG NEXT_PUBLIC_TYPESENSE_PORT
ARG NEXT_PUBLIC_TYPESENSE_PROTOCOL
ARG NEXT_PUBLIC_TYPESENSE_SEARCH_ONLY_API_KEY
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_CLARITY_PROJECT_ID
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ARG NEXT_PUBLIC_PUSH_WORKER_URL

# Convert ARGs to ENVs so Next.js can access them during build
ENV NEXT_PUBLIC_TYPESENSE_HOST=$NEXT_PUBLIC_TYPESENSE_HOST
ENV NEXT_PUBLIC_TYPESENSE_PORT=$NEXT_PUBLIC_TYPESENSE_PORT
ENV NEXT_PUBLIC_TYPESENSE_PROTOCOL=$NEXT_PUBLIC_TYPESENSE_PROTOCOL
ENV NEXT_PUBLIC_TYPESENSE_SEARCH_ONLY_API_KEY=$NEXT_PUBLIC_TYPESENSE_SEARCH_ONLY_API_KEY
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_CLARITY_PROJECT_ID=$NEXT_PUBLIC_CLARITY_PROJECT_ID
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY
ENV NEXT_PUBLIC_PUSH_WORKER_URL=$NEXT_PUBLIC_PUSH_WORKER_URL

# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

# Build Next.js standalone output
RUN corepack enable
RUN pnpm run build

# Stage 3: Production image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create nextjs user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Set correct permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000

CMD ["node", "server.js"]
