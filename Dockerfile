# Perfila — imagen de producción (Next.js standalone). No necesita base de datos ni servicios externos.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3200
ARG NEXT_PUBLIC_ORBITA_URL=http://127.0.0.1:3000
ARG NEXT_PUBLIC_ZENTRIKA_URL=http://127.0.0.1:3100
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL NEXT_PUBLIC_ORBITA_URL=$NEXT_PUBLIC_ORBITA_URL NEXT_PUBLIC_ZENTRIKA_URL=$NEXT_PUBLIC_ZENTRIKA_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3200 HOSTNAME=0.0.0.0
RUN addgroup -S web && adduser -S web -G web
COPY --from=build --chown=web:web /app/.next/standalone ./
COPY --from=build --chown=web:web /app/.next/static ./.next/static
COPY --from=build --chown=web:web /app/public ./public
USER web
EXPOSE 3200
CMD ["node", "server.js"]
