# ---- build stage ----
FROM node:22-alpine AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy manifests first for layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile

COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

RUN pnpm --filter @blueflutes/shared build
RUN pnpm --filter @blueflutes/api build

# Prune dev dependencies
RUN pnpm --filter @blueflutes/api --prod deploy /app/api-deploy

# Copy compiled shared dist so workspace symlink resolves at runtime
RUN cp -r /app/packages/shared/dist /app/api-deploy/node_modules/@blueflutes/shared/dist

# ---- runtime stage ----
FROM node:22-alpine AS runtime
WORKDIR /app

# sharp requires native libs
RUN apk add --no-cache vips-dev

COPY --from=build /app/api-deploy ./
COPY --from=build /app/apps/api/dist ./dist

EXPOSE 3001

CMD ["node", "dist/index.js"]
