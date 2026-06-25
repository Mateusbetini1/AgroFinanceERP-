# ================================================================
# Stage 1: Base
# ================================================================
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# ================================================================
# Stage 2: Dependencies
# Copiamos apenas os package.json para aproveitar cache de layers
# ================================================================
FROM base AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json ./packages/config/

RUN pnpm install --frozen-lockfile

# ================================================================
# Stage 3: Builder
# ================================================================
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Compilar pacotes na ordem de dependência
RUN pnpm --filter @agrofinance/shared build
RUN pnpm --filter @agrofinance/database build

# Build da API
RUN pnpm --filter api build

# ================================================================
# Stage 4: Runner (produção)
# ================================================================
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 apiuser

# Código compilado da API
COPY --from=builder --chown=apiuser:nodejs /app/apps/api/dist ./dist

# Node modules completo — inclui .prisma/client gerado, @prisma/client e
# os symlinks do pnpm para os pacotes workspace
COPY --from=builder --chown=apiuser:nodejs /app/node_modules ./node_modules

# Dist dos pacotes workspace (alvos dos symlinks node_modules/@agrofinance/*)
COPY --from=builder --chown=apiuser:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=apiuser:nodejs /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder --chown=apiuser:nodejs /app/packages/database/dist ./packages/database/dist
COPY --from=builder --chown=apiuser:nodejs /app/packages/database/package.json ./packages/database/package.json

# Schema e migrations (necessários para prisma migrate deploy)
COPY --from=builder --chown=apiuser:nodejs /app/packages/database/prisma ./prisma

USER apiuser
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

# Executa migrations pendentes antes de iniciar o servidor
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy --schema=./prisma/schema.prisma && node dist/server.js"]
