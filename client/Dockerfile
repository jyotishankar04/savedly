# ============================================================================
# Build stage. NEXT_PUBLIC_API_URL defaults to the relative "/api/v1": the
# browser talks only to this app, and app/api/v1/[...path]/route.ts forwards
# to the API container named by API_INTERNAL_URL at runtime — so one image
# works on any domain.
# ============================================================================
FROM node:22-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@11

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

ARG NEXT_PUBLIC_API_URL=/api/v1
# NEXT_PUBLIC_SELF_HOSTED: this image is the self-hosted one, so it is built
# without the marketing site (see lib/instance.ts and proxy.ts).
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SELF_HOSTED=true \
    NEXT_OUTPUT=standalone \
    NEXT_TELEMETRY_DISABLED=1

RUN pnpm build

# ============================================================================
# Runtime stage: Next's standalone server, no node_modules install needed.
# ============================================================================
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
