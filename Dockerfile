# One image: Express API + built React app (web/dist), served on $PORT. Build from the repo root: docker build .
# Same image runs the app (CMD) and the migrate/seed job (see docker-compose.yml, later the Cloud Run job).

# Stage 1: build web + server (prisma generate + tsc) with all dev dependencies.
FROM node:22-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY web/package.json web/
RUN npm ci
COPY server server
COPY web web
RUN npm run build

# Stage 2: slim runtime, server production deps only (prisma + tsx are deps: the migrate/seed job needs them).
FROM node:22-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY web/package.json web/
RUN npm ci --omit=dev -w server && npm cache clean --force
COPY --from=build /app/node_modules/.prisma node_modules/.prisma
COPY --from=build /app/server/dist server/dist
COPY --from=build /app/web/dist web/dist
COPY server/prisma server/prisma
COPY server/docker-entrypoint.sh server/
ENV NODE_ENV=production PORT=8080
EXPOSE 8080
USER node
WORKDIR /app/server
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
