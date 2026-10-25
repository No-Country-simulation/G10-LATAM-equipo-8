FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.ts ./
COPY tsconfig*.json ./
COPY src ./src
COPY public ./public
RUN VITE_API_URL=/api/v1 npm run build

FROM caddy:2.10-alpine
COPY --from=build /app/dist /srv
COPY deploy/Caddyfile /etc/caddy/Caddyfile
EXPOSE 80 443
