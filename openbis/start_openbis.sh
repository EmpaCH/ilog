#!/bin/sh
set -euo pipefail

OPENBIS_HOME=${OPENBIS_HOME:-/openbis}
OPENBIS_DATA=${OPENBIS_DATA:-/data}
OPENBIS_LOG=${OPENBIS_LOG:-${OPENBIS_HOME}/servers/openBIS-server/jetty/logs}
HOSTNAME=${HOSTNAME:-localhost}
AS_PORT=${AS_PORT:-8080}
DSS_PORT=${DSS_PORT:-8081}
DOWNLOAD_URL=${DOWNLOAD_URL:-"https://${OPENBIS_FQDN}:${AS_PORT}"}
ENABLED_PLUGINS=${ENABLED_PLUGINS:-"monitoring-support, dropbox-monitor, dataset-uploader, dataset-file-search, xls-import, openbis-sync, admin, eln-lims"}
set_property() {
  local file="$1"
  local key="$2"
  local value="$3"

  if grep -q "^${key}[[:space:]]*=" "$file"; then
    sed -i "s|^${key}[[:space:]]*=.*|${key} = ${value}|" "$file"
  else
    echo "${key} = ${value}" >> "$file"
  fi
}

wait_for_postgres() {
  local tries=10
  local count=0
  echo "⏳ Waiting for PostgreSQL..."
  until PGPASSWORD="${OPENBIS_DB_ADMIN_PASS}" psql -h "${OPENBIS_DB_HOST}" -U "${OPENBIS_DB_ADMIN_USER}" -c '\q' &>/dev/null || [ $count -ge $tries ]; do
    echo "  ❌ PostgreSQL not ready yet..."
    sleep 2
    count=$((count + 1))
  done
  [ $count -ge $tries ] && { echo "❌ PostgreSQL unavailable after $tries attempts."; exit 1; }
  echo "✅ PostgreSQL is ready."
}

wait_for_http() {
  local url=$1
  local tries=15
  local count=0
  echo "⏳ Waiting for $url..."
  until curl -sSf "$url" > /dev/null || [ $count -ge $tries ]; do
    echo "  ❌ $url not ready..."
    sleep 2
    count=$((count + 1))
  done
  [ $count -ge $tries ] && { echo "❌ $url not reachable after $tries attempts."; exit 1; }
  echo "✅ $url is reachable."
}


# Set default values for environment variables
OPENBIS_FQDN=${OPENBIS_FQDN:-openbis.local}
OPENBIS_DB_HOST=${OPENBIS_DB_HOST:-postgres}
OPENBIS_DB_APP_USER=${OPENBIS_DB_APP_USER:-openbis_app}
OPENBIS_DB_APP_PASS=${OPENBIS_DB_APP_PASS:-openbis_app_pass}
OPENBIS_DB_ADMIN_USER=${OPENBIS_DB_ADMIN_USER:-openbis_admin}
OPENBIS_DB_ADMIN_PASS=${OPENBIS_DB_ADMIN_PASS:-openbis_admin_pass}
OPENBIS_ADMIN_PASS=${OPENBIS_ADMIN_PASS:-openbis_admin_pass}
AFS_OPENBIS_URL=${AFS_OPENBIS_URL:-"http://${OPENBIS_FQDN}:${AS_PORT}"}
AFS_STORAGE_UUID=${AFS_STORAGE_UUID:-"00000000-0000-0000-0000-000000000000"}
OPENBIS_UID=${OPENBIS_UID:-1000}


#Show configuration
echo "🔧 openBIS Configuration:"
echo "  FQDN: ${OPENBIS_FQDN}"
echo "  DB Host: ${OPENBIS_DB_HOST}"
echo "  DB App User: ${OPENBIS_DB_APP_USER}"    
echo "  DB App Password: ${OPENBIS_DB_APP_PASS}"
echo "  DB Admin User: ${OPENBIS_DB_ADMIN_USER}"
echo "  DB Admin Password: ${OPENBIS_DB_ADMIN_PASS}"
echo "  Admin Password: ${OPENBIS_ADMIN_PASS}"
echo "  openBIS Home: ${OPENBIS_HOME}"
echo "  openBIS Data: ${OPENBIS_DATA}"
echo "  openBIS Log: ${OPENBIS_LOG}"
echo "  Hostname: ${HOSTNAME}"
echo "  Application Server Port: ${AS_PORT}"
echo "  Data Store Server Port: ${DSS_PORT}"
echo "  openBIS UID: ${OPENBIS_UID}"
echo "  Download URL: ${DOWNLOAD_URL}"
echo "  AFS openBIS URL: ${AFS_OPENBIS_URL}"
echo "  AFS Storage UUID: ${AFS_STORAGE_UUID}"
echo "  Enabled Plugins: ${ENABLED_PLUGINS}"




echo "🔧 Configuring AS: 🖥️"

## Application Server (AS)
AS_PROPS="${OPENBIS_HOME}/servers/openBIS-server/jetty/etc/service.properties"
set_property "$AS_PROPS" "database.url-host-part" "${OPENBIS_DB_HOST}"
set_property "$AS_PROPS" "database.owner" "${OPENBIS_DB_APP_USER}"
set_property "$AS_PROPS" "database.owner-password" "${OPENBIS_DB_APP_PASS}"
set_property "$AS_PROPS" "database.admin-user" "${OPENBIS_DB_ADMIN_USER}"
set_property "$AS_PROPS" "database.admin-password" "${OPENBIS_DB_ADMIN_PASS}"
set_property "$AS_PROPS" "download-url" ${DOWNLOAD_URL}
set_property "$AS_PROPS" "server-public-information.afs-server.url" "https://${OPENBIS_FQDN}/afs-server"
set_property "$AS_PROPS" "trusted-cross-origin-domains" "https://${OPENBIS_FQDN}"
set_property "$AS_PROPS" "api.v3.operation-execution.cache.directory" "${OPENBIS_DATA}/api-workspace"
set_property "$AS_PROPS" "root-dir" "${OPENBIS_DATA}"
set_property "$AS_PROPS" "file-server.repository-path" "${OPENBIS_DATA}/raw-store"
set_property "$AS_PROPS" "eln-lims.as.miscellaneous.file-service.file-server.repository-path" "${OPENBIS_DATA}/raw-store"
set_property "$AS_PROPS" "session-workspace-root-dir" "${OPENBIS_DATA}/session-workspace"

echo "🔧 Configuring DSS: 💽"

## Data Store Server (DSS)
DSS_PROPS="${OPENBIS_HOME}/servers/datastore_server/etc/service.properties"
if [ -f "$DSS_PROPS" ]; then
  set_property "$DSS_PROPS" "path-info-db.urlHostPart" "${OPENBIS_DB_HOST}"
  set_property "$DSS_PROPS" "path-info-db.owner" "${OPENBIS_DB_APP_USER}"
  set_property "$DSS_PROPS" "path-info-db.password" "${OPENBIS_DB_APP_PASS}"
  set_property "$DSS_PROPS" "path-info-db.adminUser" "${OPENBIS_DB_ADMIN_USER}"
  set_property "$DSS_PROPS" "path-info-db.adminPassword" "${OPENBIS_DB_ADMIN_PASS}"
  set_property "$DSS_PROPS" "host-address" "http://${HOSTNAME}"
  set_property "$DSS_PROPS" "port" "${DSS_PORT}"
  set_property "$DSS_PROPS" "use-ssl" "false"
  set_property "$DSS_PROPS" "server-url" "http://${HOSTNAME}:8080"
  set_property "$DSS_PROPS" "download-url" ${DOWNLOAD_URL}
  set_property "$DSS_PROPS" "cache-workspace-folder" "${OPENBIS_DATA}/cache-workspace"
  set_property "$DSS_PROPS" "session-workspace-root-dir" "${OPENBIS_DATA}/session-workspace"
  set_property "$DSS_PROPS" "commandqueue-dir" "${OPENBIS_DATA}/commandqueue"
fi

echo "🔧 Configuring AFS 💽"

## AFS
AFS_PROPS="${OPENBIS_HOME}/servers/afs-server/etc/service.properties"
if [ -f "$AFS_PROPS" ]; then
  set_property "$AFS_PROPS" "openBISUrl" ${AFS_OPENBIS_URL}
  set_property "$AFS_PROPS" "storageUuid" ${AFS_STORAGE_UUID:-"00000000-0000-0000-0000-000000000000"}
fi


echo "Configuring openBIS plugins: ${ENABLED_PLUGINS}"
## Configure plugins
PLUGINS_PROPS="${OPENBIS_HOME}/servers/core-plugins/plugins.properties"
if [ -f "$PLUGINS_PROPS" ]; then
  set_property "$PLUGINS_PROPS" "enabled-plugins" "${ENABLED_PLUGINS}"
fi
## Fix startup logs for containers
sed -i "s|^STARTUPLOG=.*|STARTUPLOG=log/dss_startup.out|" "${OPENBIS_HOME}/servers/datastore_server/datastore_server.sh" || true
sed -i "s|^STARTUP_LOG=.*|STARTUP_LOG=\$LOG_FOLDER/afs_startup.out|" "${OPENBIS_HOME}/servers/afs-server/bin/afs_server.sh" || true

## Update DB password
echo "🔐 Setting database password for ${OPENBIS_DB_APP_USER}..."
PGPASSWORD=${OPENBIS_DB_ADMIN_PASS} psql -h ${OPENBIS_DB_HOST} -U ${OPENBIS_DB_ADMIN_USER} \
  -c "ALTER USER ${OPENBIS_DB_APP_USER} PASSWORD '${OPENBIS_DB_APP_PASS}';" || true

##Link logs
echo "🔗 Linking logs..."
rm -rf ${OPENBIS_HOME}/servers/openBIS-server/jetty/logs
ln -s ${OPENBIS_LOG} ${OPENBIS_HOME}/servers/openBIS-server/jetty/logs
rm -rf ${OPENBIS_HOME}/servers/datastore_server/log
ln -s ${OPENBIS_LOG} ${OPENBIS_HOME}/servers/datastore_server/log
rm -rf ${OPENBIS_HOME}/servers/afs-server/log
ln -s ${OPENBIS_LOG} ${OPENBIS_HOME}/servers/afs-server/log


## Start services
echo "🚀 Starting PostgreSQL..."
wait_for_postgres

echo "🚀 Starting Application Server (AS)..."
bash ${OPENBIS_HOME}/bin/bisup.sh 
#wait_for_http "http://${OPENBIS_FQDN}:8080"

echo "🚀 Starting Data Store Server (DSS)..."
bash ${OPENBIS_HOME}/bin/dssup.sh
#wait_for_http "http://${OPENBIS_FQDN}:8081"

echo "🚀 Starting AFS Server..."
${OPENBIS_HOME}/servers/afs-server/bin/afs_server.sh start
#sleep 3

#Change admin password
echo "🔐 Setting admin password for openBIS..."
${OPENBIS_HOME}/servers/openBIS-server/jetty/bin/passwd.sh change admin -p ${OPENBIS_ADMIN_PASS}



echo "✅ All openBIS components started successfully."
exec tail -F ${OPENBIS_LOG}/*.out ${OPENBIS_LOG}/*.txt
