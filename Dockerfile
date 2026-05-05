FROM node:18-slim AS build

WORKDIR /app

# Build client
COPY client/package.json client/package-lock.json ./client/
RUN cd client && npm ci
COPY client/ ./client/
RUN cd client && npm run build

# Build server (skip lockfile — macOS lockfile triggers npm bug on linux)
COPY server/package.json ./server/
RUN cd server && npm install
COPY server/ ./server/
RUN cd server && npm run build

# Production image
FROM node:18-slim
WORKDIR /app
COPY server/package.json ./server/
RUN cd server && npm install --omit=dev
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/client/dist ./client/dist

EXPOSE 3001
CMD ["node", "server/dist/index.js"]
