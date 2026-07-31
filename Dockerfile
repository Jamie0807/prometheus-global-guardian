FROM node:20-slim
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --production

COPY server.js ./server.js
COPY hazards-source.js ./hazards-source.js
COPY dist ./dist

EXPOSE 8080
CMD ["node", "server.js"]