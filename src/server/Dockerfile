# ---------- Build stage ----------
FROM node:20-alpine AS builder
WORKDIR /app

# Install git (dibutuhkan jika ada deps dari GitHub)
RUN apk add --no-cache git

# only BE manifest (cache friendly)
COPY src/server/package*.json ./src/server/

# install deps BE
WORKDIR /app/src/server
RUN if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi

# copy source BE + shared
WORKDIR /app
COPY src/server/ src/server/
COPY src/shared/ src/shared/

# build BE
WORKDIR /app/src/server
RUN npm run build

# buang devDependencies → node_modules jadi prod-only
RUN npm prune --omit=dev

# ---------- Runtime stage ----------
FROM node:20-alpine AS runner
WORKDIR /app/src/server

# satu user saja (non-root)
RUN adduser -D appuser

# siapkan folder auth yang bisa ditulis
# NOTE: path auth akan /app/auth (bukan relative)
RUN mkdir -p /app/auth && chown -R appuser:appuser /app

ENV NODE_ENV=production
ENV PORT=8787
RUN apk add --no-cache tzdata ca-certificates \
 && update-ca-certificates
ENV TZ=Asia/Jakarta

# copy prod node_modules & dist dari builder
COPY --from=builder /app/src/server/node_modules ./node_modules
COPY --from=builder /app/src/server/dist ./dist
COPY --from=builder /app/src/server/package*.json ./

USER appuser
EXPOSE 8787
CMD ["node", "dist/server/server.js"]
