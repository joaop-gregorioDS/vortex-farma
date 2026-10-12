FROM node:24-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
ARG NEXT_PUBLIC_SWAGGER_URL=""
ENV NEXT_PUBLIC_SWAGGER_URL=$NEXT_PUBLIC_SWAGGER_URL
ENV NEXT_TELEMETRY_DISABLED=1 API_INTERNAL_URL=http://api:8080 BUILD_STANDALONE=1
RUN npm run build
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
