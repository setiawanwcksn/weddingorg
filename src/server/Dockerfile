# ---------- Build ----------
FROM node:20-alpine AS builder
WORKDIR /repo

# pakai lockfile root (workspaces)
COPY package.json package-lock.json ./
COPY src/server/package.json src/server/package.json
RUN npm ci --no-audit --no-fund

# salin source
COPY src/server/ src/server/
COPY src/shared/ src/shared/

# build server via workspace
RUN npm run build -w src/server

# ---------- Runtime ----------
FROM node:20-alpine AS runner
WORKDIR /repo/src/server
RUN adduser -D appuser && apk add --no-cache curl

ENV NODE_ENV=production
ENV PORT=8787
ENV NODE_OPTIONS=--enable-source-maps

# install prod deps via lockfile root
COPY package.json package-lock.json /repo/
COPY src/server/package.json ./package.json
RUN cd /repo && npm ci --omit=dev --no-audit --no-fund

# hasil build
COPY --from=builder /repo/src/server/dist ./dist

EXPOSE 8787
USER appuser
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://localhost:${PORT}/health || exit 1

CMD ["node", "dist/server/server.js"]
