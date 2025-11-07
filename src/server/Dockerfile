# ---------- Build stage ----------
FROM node:20-alpine AS builder
WORKDIR /app

# hanya ambil manifest BE agar cache build efisien
COPY src/server/package*.json src/server/

# install deps BE
WORKDIR /app/src/server
RUN if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi

# copy source BE + shared (karena ts build biasanya import dari shared)
WORKDIR /app
COPY src/server/ src/server/
COPY src/shared/ src/shared/

# build BE
WORKDIR /app/src/server
RUN npm run build

# ---------- Runtime stage ----------
FROM node:20-alpine AS runner
WORKDIR /app/src/server
RUN adduser -D appuser && apk add --no-cache curl

ENV NODE_ENV=production
ENV PORT=8787

# prod deps
COPY src/server/package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev --no-audit --no-fund; else npm install --omit=dev --no-audit --no-fund; fi

# hasil build
COPY --from=builder /app/src/server/dist ./dist

USER appuser
EXPOSE 8787
CMD ["node", "dist/server/server.js"]
