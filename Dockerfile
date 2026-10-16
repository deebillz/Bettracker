# Optional: lets the app run on any Docker host (Railway, Fly.io, a VPS).
# Render's free tier doesn't need this; it builds with render.yaml instead.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/migrations ./migrations
COPY package.json ./
EXPOSE 5000
CMD ["node", "dist/index.cjs"]
