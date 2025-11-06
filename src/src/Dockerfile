# syntax=docker/dockerfile:1.5
FROM node:20-alpine AS builder
WORKDIR /app

ENV NPM_CONFIG_FUND=false NPM_CONFIG_AUDIT=false npm_config_progress=false

COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# kalau pakai proxy ke backend & SPA fallback, tambahkan:
COPY nginx.conf /etc/nginx/conf.d/default.conf 
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
