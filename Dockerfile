FROM node:24-alpine AS base
WORKDIR /app

COPY *.json /app
COPY *.js /app
COPY *.ts /app
COPY *.html /app


FROM base AS env
# Install exactly the versions in package-lock.json, so a new release of a dependency can't break the build
COPY package.json package-lock.json /app/
RUN npm ci

COPY src /app/src
COPY public /app/public 
CMD ["npm", "run", "dev"]

FROM env AS build

RUN npm run build --verbose

FROM caddy AS serve
ENV CADDY_LOG_LEVEL=INFO

COPY --from=build /app/dist /var/www/html
COPY Caddyfile /etc/caddy/
RUN caddy validate --config /etc/caddy/Caddyfile
EXPOSE 80