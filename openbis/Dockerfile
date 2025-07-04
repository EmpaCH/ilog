ARG OPENBIS_VERSION=6.7.0
FROM openbis/openbis-app:${OPENBIS_VERSION} AS base

RUN rm -rf /home/openbis/servers/core-plugins/eln-lims/bin/blast \
    && rm -rf /home/openbis/servers/openBIS-server/jetty/webapps/openbis/WEB-INF/deploy/ch.systemsx.cisd.openbis.OpenBIS/symbolMaps \
    && rm -rf /home/openbis/servers/core-plugins/eln-lims/[1-9]/ \
    && rm -rf /home/openbis/servers/core-plugins/screening \
    && rm -rf /home/openbis/servers/core-plugins/flow \
    && rm -rf /home/openbis/servers/core-plugins/screening-optional \
    && rm -rf /home/openbis/servers/core-plugins/openbis-sync \
    && rm -rf /home/openbis/.cache 

FROM eclipse-temurin:17-alpine AS runtime

COPY --from=base --chown=openbis:openbis /home/openbis /home/openbis

RUN addgroup -g 1000 openbis && adduser -G openbis -u 1000 openbis -D


# Define envs that will also be used at runtime
ENV OPENBIS_HOME=/home/openbis \
    OPENBIS_DATA=/home/openbis/data \
    OPENBIS_LOG=/home/openbis/log \
    OPENBIS_ETC=/home/openbis/etc \
    OPENBIS_UID=1000


# Create necessary directories
RUN mkdir -p ${OPENBIS_HOME}/data \
    && mkdir -p ${OPENBIS_HOME}/log \
    && mkdir -p ${OPENBIS_HOME}/etc/as \
    && mkdir -p ${OPENBIS_HOME}/etc/dss \
    && mkdir -p ${OPENBIS_HOME}/etc/afs \
    && mkdir -p ${OPENBIS_HOME}/etc/core-plugins \
    && mkdir -p /data/openbis \
    && chown -R openbis:openbis /data/openbis \
    && chown -R openbis:openbis ${OPENBIS_HOME}


# Add psql
RUN apk add --no-cache postgresql-client bash curl
# Copy entrypoint script 
COPY start_openbis.sh /home/openbis/start_openbis.sh
RUN chmod +x /home/openbis/start_openbis.sh 

#Use bash as default shell
SHELL ["/bin/bash", "-c"]

USER openbis
WORKDIR /home/openbis
ENTRYPOINT ["/home/openbis/start_openbis.sh"]