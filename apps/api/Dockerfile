# ── Stage 1: Dependencies ────────────────────
FROM node:24-alpine AS deps

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/design/package.json apps/design/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile --prefer-offline

# ── Stage 2: Build ───────────────────────────
FROM oven/bun:1-alpine AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY apps/api/ apps/api/
COPY packages/shared/ packages/shared/

RUN bun build apps/api/src/index.ts --outdir=apps/api/dist --target=bun

# ── Stage 3: Production ─────────────────────
FROM oven/bun:1-alpine AS runtime

WORKDIR /app

COPY --from=build /app/apps/api/dist ./dist

ENV NODE_ENV=production

EXPOSE 3000

CMD ["bun", "dist/index.js"]
