# syntax=docker/dockerfile:1.7

FROM node:24-alpine AS base
RUN npm install -g npm@11.9.0

FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM deps AS build
WORKDIR /app
COPY . .
RUN npm run build

FROM base AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8787
ENV AI_PROXY_PORT=8787
ENV SERVE_WEB_APP=1

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/.env.server.example ./.env.server.example

EXPOSE 8787

CMD ["node", "server/index.mjs"]
