# Build from the repository root; send only this app's declared build inputs.
FROM node:22-alpine AS build
WORKDIR /app
COPY apps/awesome-web/package.json apps/awesome-web/package-lock.json ./
RUN npm ci
COPY apps/awesome-web/ ./
RUN npm run build

FROM caddy:2-alpine
ENV PORT=3500
COPY apps/awesome-web/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
RUN AWESOME_API_ORIGIN=http://127.0.0.1:3510 caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
RUN chown -R 10001:10001 /config /data
USER 10001:10001
EXPOSE 3500
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
