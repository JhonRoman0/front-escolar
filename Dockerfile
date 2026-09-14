# 1. Dependencias
FROM node:20-slim AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml .npmrc ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# 2. Builder
FROM node:20-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Desactivar telemetría durante el build
ENV NEXT_TELEMETRY_DISABLED 1

# Vars públicas pasadas como build args (next build las incrusta en el bundle)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_USAR_MOCK
ENV NEXT_PUBLIC_USAR_MOCK=$NEXT_PUBLIC_USAR_MOCK

RUN npm install -g pnpm && pnpm run build

# 3. Runner (Imagen final ligera)
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Copiar archivos generados por el modo standalone
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]