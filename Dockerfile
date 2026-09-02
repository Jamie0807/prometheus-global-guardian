FROM node:20.19-slim AS build
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install --global pnpm@10.15.1 && pnpm install --frozen-lockfile

COPY . .

ARG VITE_MAPBOX_TOKEN
ARG VITE_PYTHON_API_URL=http://localhost:8001
ARG VITE_3D_TILES_URL
ARG VITE_CESIUM_ION_TOKEN

ENV VITE_MAPBOX_TOKEN=$VITE_MAPBOX_TOKEN
ENV VITE_PYTHON_API_URL=$VITE_PYTHON_API_URL
ENV VITE_3D_TILES_URL=$VITE_3D_TILES_URL
ENV VITE_CESIUM_ION_TOKEN=$VITE_CESIUM_ION_TOKEN

RUN pnpm run build

FROM node:20.19-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY package.json pnpm-lock.yaml ./
RUN npm install --global pnpm@10.15.1 && pnpm install --prod --frozen-lockfile --ignore-scripts

COPY --from=build /app/dist-server ./dist-server
COPY --from=build /app/dist ./dist

EXPOSE 8080
CMD ["node", "dist-server/server.js"]
