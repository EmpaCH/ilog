FROM node:alpine AS base
WORKDIR /app

COPY *.json /app
COPY *.js /app
COPY *.ts /app
COPY *.html /app

FROM base AS env
COPY package.json /app
RUN npm install --verbose
FROM env AS build
COPY src /app/src
COPY public /app/public 
RUN npm run build --verbose

FROM caddy AS serve

COPY --from=build /app/dist /var/www/html
COPY Caddyfile /etc/caddy/