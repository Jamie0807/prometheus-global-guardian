FROM node:20.19-slim AS build
WORKDIR /app

RUN apt-get -o Acquire::Retries=5 update \
    && apt-get -o Acquire::Retries=5 install -y --no-install-recommends \
        g++ \
        make \
        openssl \
        python3 \
    && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
ENV DATABASE_URL=postgresql://generate:generate@127.0.0.1:5432/generate
RUN npm install --global pnpm@10.15.1 && pnpm install --frozen-lockfile

COPY . .

ARG VITE_MAPBOX_TOKEN
ARG VITE_3D_TILES_URL
ARG VITE_CESIUM_ION_TOKEN
ARG VITE_LOG_LEVEL

ENV VITE_MAPBOX_TOKEN=$VITE_MAPBOX_TOKEN
ENV VITE_3D_TILES_URL=$VITE_3D_TILES_URL
ENV VITE_CESIUM_ION_TOKEN=$VITE_CESIUM_ION_TOKEN
ENV VITE_LOG_LEVEL=$VITE_LOG_LEVEL

RUN pnpm run build

FROM node:20.19-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

RUN apt-get -o Acquire::Retries=5 update \
    && apt-get -o Acquire::Retries=5 install -y --no-install-recommends \
        g++ \
        make \
        openssl \
        python3 \
    && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true
RUN node -e "const fs=require('fs'); const pkg=JSON.parse(fs.readFileSync('package.json','utf8')); if (pkg.scripts) delete pkg.scripts.prepare; fs.writeFileSync('package.json', JSON.stringify(pkg));" \
    && npm install --global pnpm@10.15.1 \
    && pnpm install --prod --frozen-lockfile

COPY --from=build /app/dist-server ./dist-server
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/.nvmrc ./.nvmrc
COPY --from=build /app/scripts/with-node-version.sh ./scripts/with-node-version.sh

EXPOSE 8080
CMD ["node", "dist-server/server.js"]
