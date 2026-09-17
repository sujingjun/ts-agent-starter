FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
COPY apps/web/package.json apps/web/package.json
RUN if [ -f package-lock.json ]; then npm ci --ignore-scripts; else npm install --ignore-scripts; fi
COPY apps/web apps/web
RUN npm run build:web
FROM node:22-bookworm-slim
ENV HOST=0.0.0.0 PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /app/apps/web/.output ./.output
USER node
EXPOSE 3000
CMD ["node",".output/server/index.mjs"]
