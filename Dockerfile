# syntax=docker/dockerfile:1
FROM node:24.19.0-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencies
COPY package.json package-lock.json ./
# Optional CA for managed build proxies; never retained in an image layer.
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    npm ci --no-audit --no-fund

FROM base AS builder
COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json package-lock.json next.config.ts tsconfig.json postcss.config.mjs ./
COPY src ./src
COPY public ./public
# NEXT_PUBLIC_* values are compiled in; changing ads requires rebuilding.
ARG NEXT_PUBLIC_ADS_ENABLED=false
ENV NEXT_PUBLIC_ADS_ENABLED=${NEXT_PUBLIC_ADS_ENABLED} \
    NODE_OPTIONS=--max-old-space-size=1024
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    NODE_OPTIONS=--max-old-space-size=256
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
COPY --chown=node:node scripts/healthcheck.mjs ./healthcheck.mjs
COPY LICENSE ./LICENSE
RUN mkdir -p .next/cache && chown node:node .next/cache
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD ["node", "/app/healthcheck.mjs"]
CMD ["node", "server.js"]
