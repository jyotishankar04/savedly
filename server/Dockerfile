# ============================================================================
# Build stage: typecheck, then bundle src/ into dist/ with esbuild
# (node_modules stay external). Bundling sidesteps Node ESM's requirement for
# explicit ".js" import extensions, which tsc's output doesn't add.
# ============================================================================
FROM node:22-alpine AS builder

WORKDIR /app

RUN npm install --global pnpm@11.24.0

COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# ============================================================================
# Runtime stage: minimal image with prod deps only
# ============================================================================
FROM node:22-alpine

WORKDIR /app

# postgresql18-client: pg_dump for Admin's "Download backup". It must be at
# least as new as the database (pgvector/pgvector:pg18 in docker-compose.yml);
# raise the two together.
RUN npm install --global pnpm@11.24.0 && \
    apk add --no-cache postgresql18-client && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/dist ./dist
COPY drizzle ./drizzle
COPY docker-entrypoint.sh ./docker-entrypoint.sh

# Self-hosted installs keep generated secrets and local-disk uploads here —
# both are named volumes in the root docker-compose.yml. Created up front so
# the volumes inherit the nodejs user's ownership.
RUN mkdir -p /data/secrets /data/files && chown -R nodejs:nodejs /data && chmod +x ./docker-entrypoint.sh

ENV NODE_ENV=production \
    SECRETS_DIR=/data/secrets \
    FILES_DIR=/data/files \
    MIGRATIONS_DIR=/app/drizzle

USER nodejs

EXPOSE 4000

# The check exits as soon as it has the status: left to end by itself, the
# idle keep-alive socket holds the process open until the timeout and the
# container is reported unhealthy while serving 200s. The start period covers
# the first boot, when migrations run before the server listens.
HEALTHCHECK --interval=30s --timeout=5s --start-period=180s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/api/v1/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

ENTRYPOINT ["./docker-entrypoint.sh"]
