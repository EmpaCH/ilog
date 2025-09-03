FROM node:alpine AS base
WORKDIR /app

COPY *.json /app
COPY *.js /app
COPY *.ts /app
COPY *.html /app


FROM base AS env
COPY package.json /app
RUN npm install --verbose

COPY src /app/src
COPY public /app/public 
ENV VITE_APP_OPENBIS_URL=
CMD ["npm", "run", "dev"]

FROM env AS build

RUN npm run build --verbose

FROM caddy AS serve

COPY --from=build /app/dist /var/www/html
COPY Caddyfile /etc/caddy/