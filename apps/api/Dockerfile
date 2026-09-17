FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
COPY apps/web/package.json apps/web/package.json
RUN if [ -f package-lock.json ]; then npm ci --ignore-scripts; else npm install --ignore-scripts; fi
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production HOST=0.0.0.0
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/infra ./infra
COPY --from=build /app/data ./data
COPY --from=build /app/skills ./skills
RUN mkdir -p .data && chown node:node .data
USER node
EXPOSE 3001
CMD ["node","apps/api/dist/apps/api/src/main.js"]
