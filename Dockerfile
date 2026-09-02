FROM node:20.19-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_MAPBOX_TOKEN
ARG VITE_PYTHON_API_URL=http://localhost:8001

ENV VITE_MAPBOX_TOKEN=$VITE_MAPBOX_TOKEN
ENV VITE_PYTHON_API_URL=$VITE_PYTHON_API_URL

RUN npm run build

FROM node:20.19-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist-server ./dist-server
COPY --from=build /app/dist ./dist

EXPOSE 8080
CMD ["npm", "start"]
