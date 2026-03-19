#!/usr/bin/env bash

## Set variables
OPENBIS_ADMIN_PASS="${OPENBIS_ADMIN_PASS:=123456789}"
OPENBIS_DATA=/data/openbis
OPENBIS_DB_ADMIN_PASS_ENV=$(env | grep ^database.admin-password= |cut -d = -f 2)
OPENBIS_DB_ADMIN_PASS="${OPENBIS_DB_ADMIN_PASS:=${OPENBIS_DB_ADMIN_PASS_ENV}}"
OPENBIS_DB_ADMIN_USER_ENV=$(env | grep ^database.admin-user= |cut -d = -f 2)
OPENBIS_DB_ADMIN_USER="${OPENBIS_DB_ADMIN_USER:=${OPENBIS_DB_ADMIN_USER_ENV}}"
OPENBIS_DB_APP_PASS_ENV=$(env | grep ^database.owner-password= |cut -d = -f 2)
OPENBIS_DB_APP_PASS="${OPENBIS_DB_APP_PASS:=${OPENBIS_DB_APP_PASS_ENV}}"
OPENBIS_DB_APP_USER_ENV=$(env | grep ^database.owner= |cut -d = -f 2)
OPENBIS_DB_APP_USER="${OPENBIS_DB_APP_USER:=${OPENBIS_DB_APP_USER_ENV}}"
OPENBIS_DB_HOST_ENV=$(env | grep ^database.url-host-part= |cut -d = -f 2)
OPENBIS_DB_HOST="${OPENBIS_DB_HOST:=${OPENBIS_DB_HOST_ENV}}"
OPENBIS_ETC=/etc/openbis
if [[ -z "${OPENBIS_FQDN}" ]]; then
  OPENBIS_FQDN_ENV=$(env | grep ^download-url= |cut -d = -f 2 |sed -e 's/https\:\/\///' |sed -e 's/http\:\/\///')
  OPENBIS_FQDN="${OPENBIS_FQDN_ENV:=${HOSTNAME}}"
fi
OPENBIS_UID="${OPENBIS_UID:=1001}"
OPENBIS_GID="${OPENBIS_GID:=1001}"
OPENBIS_HOME=/home/openbis
OPENBIS_LOG=/var/log/openbis

## Write variables to files
echo ${OPENBIS_HOME} > /tmp/OPENBIS_HOME
echo ${OPENBIS_LOG} > /tmp/OPENBIS_LOG
echo ${OPENBIS_ETC} > /tmp/OPENBIS_ETC
echo ${OPENBIS_DATA} > /tmp/OPENBIS_DATA
echo ${OPENBIS_DB_HOST} > /tmp/OPENBIS_DB_HOST
echo ${OPENBIS_DB_ADMIN_USER} > /tmp/OPENBIS_DB_ADMIN_USER
echo ${OPENBIS_DB_ADMIN_PASS} > /tmp/OPENBIS_DB_ADMIN_PASS
echo ${OPENBIS_DB_APP_USER} > /tmp/OPENBIS_DB_APP_USER
echo ${OPENBIS_DB_APP_PASS} > /tmp/OPENBIS_DB_APP_PASS
echo ${OPENBIS_FQDN} > /tmp/OPENBIS_FQDN

## User and group identification
if [ `id -u openbis` -ne ${OPENBIS_UID} ]; then
  usermod -u ${OPENBIS_UID} openbis
fi
if [ `id -g openbis` -ne ${OPENBIS_GID} ]; then
  groupmod -g ${OPENBIS_GID} openbis
fi

## Dir tree for logs
if [ ! -d ${OPENBIS_LOG} ]; then
  mkdir -p ${OPENBIS_LOG}
fi
if [ 1`stat -c "%u" ${OPENBIS_LOG} 2>/dev/null` -ne 1${OPENBIS_UID} ]; then
  chown -fR openbis:openbis ${OPENBIS_LOG}
fi
if [ -d ${OPENBIS_HOME}/servers/openBIS-server/jetty ]; then
  rm -rf ${OPENBIS_HOME}/servers/openBIS-server/jetty/logs
  ln -s ${OPENBIS_LOG} ${OPENBIS_HOME}/servers/openBIS-server/jetty/logs
fi
if [ -d ${OPENBIS_HOME}/servers/datastore_server ]; then
  rm -rf ${OPENBIS_HOME}/servers/datastore_server/log
  ln -s ${OPENBIS_LOG} ${OPENBIS_HOME}/servers/datastore_server/log
fi
if [ -d ${OPENBIS_HOME}/servers/afs-server ]; then
  rm -rf ${OPENBIS_HOME}/servers/afs-server/log
  ln -s ${OPENBIS_LOG} ${OPENBIS_HOME}/servers/afs-server/log
fi
if [ -d ${OPENBIS_HOME}/servers/server-ro-crate ]; then
  rm -rf ${OPENBIS_HOME}/servers/server-ro-crate/log
  ln -s ${OPENBIS_LOG} ${OPENBIS_HOME}/servers/server-ro-crate/log
fi

## Dir tree for openBIS
if [ ! -d ${OPENBIS_ETC}/as ]; then
  mkdir -p ${OPENBIS_ETC}/as
fi
if [ 1`stat -c "%u" ${OPENBIS_ETC}/as 2>/dev/null` -ne 1${OPENBIS_UID} ]; then
  chown -fR openbis:openbis ${OPENBIS_ETC}/as 2>/dev/null
fi
if [ ! -d ${OPENBIS_ETC}/dss ]; then
  mkdir -p ${OPENBIS_ETC}/dss
fi
if [ 1`stat -c "%u" ${OPENBIS_ETC}/dss 2>/dev/null` -ne 1${OPENBIS_UID} ]; then
  chown -fR openbis:openbis ${OPENBIS_ETC}/dss
fi
if [ ! -d ${OPENBIS_ETC}/afs ]; then
  mkdir -p ${OPENBIS_ETC}/afs
fi
if [ 1`stat -c "%u" ${OPENBIS_ETC}/afs 2>/dev/null` -ne 1${OPENBIS_UID} ]; then
  chown -fR openbis:openbis ${OPENBIS_ETC}/afs 2>/dev/null
fi
if [ ! -d ${OPENBIS_ETC}/ro-crate ]; then
  mkdir -p ${OPENBIS_ETC}/ro-crate
fi
if [ 1`stat -c "%u" ${OPENBIS_ETC}/ro-crate 2>/dev/null` -ne 1${OPENBIS_UID} ]; then
  chown -fR openbis:openbis ${OPENBIS_ETC}/ro-crate 2>/dev/null
fi

if [ ! -d ${OPENBIS_DATA} ]; then
  mkdir -p ${OPENBIS_DATA}
fi
if [ 1`stat -c "%u" ${OPENBIS_DATA} 2>/dev/null` -ne 1${OPENBIS_UID} ]; then
  chown -fR openbis:openbis ${OPENBIS_DATA}
fi
if [ ! -d ${OPENBIS_DATA}/store ]; then
  mkdir -p ${OPENBIS_DATA}/store
fi
if [ 1`stat -c "%u" ${OPENBIS_DATA}/store 2>/dev/null` -ne 1${OPENBIS_UID} ]; then
  chown -fR openbis:openbis ${OPENBIS_DATA}
fi
if [ ! -d ${OPENBIS_DATA}/cache-workspace ]; then
  mkdir -p ${OPENBIS_DATA}/cache-workspace
fi
if [ 1`stat -c "%u" ${OPENBIS_DATA}/cache-workspace 2>/dev/null` -ne 1${OPENBIS_UID} ]; then
  chown -fR openbis:openbis ${OPENBIS_DATA}
fi
if [ ! -d ${OPENBIS_DATA}/session-workspace ]; then
  mkdir -p ${OPENBIS_DATA}/session-workspace
fi
if [ 1`stat -c "%u" ${OPENBIS_DATA}/session-workspace 2>/dev/null` -ne 1${OPENBIS_UID} ]; then
  chown -fR openbis:openbis ${OPENBIS_DATA}
fi
if [ ! -d ${OPENBIS_DATA}/api-workspace ]; then
  mkdir -p ${OPENBIS_DATA}/api-workspace
fi
if [ 1`stat -c "%u" ${OPENBIS_DATA}/api-workspace 2>/dev/null` -ne 1${OPENBIS_UID} ]; then
  chown -fR openbis:openbis ${OPENBIS_DATA}
fi
if [ ! -d ${OPENBIS_DATA}/commandqueue ]; then
  mkdir -p ${OPENBIS_DATA}/commandqueue
fi
if [ 1`stat -c "%u" ${OPENBIS_DATA}/commandqueue 2>/dev/null` -ne 1${OPENBIS_UID} ]; then
  chown -fR openbis:openbis ${OPENBIS_DATA}
fi
if [ ! -d ${OPENBIS_DATA}/raw-store ]; then
  mkdir -p ${OPENBIS_DATA}/raw-store
fi
if [ 1`stat -c "%u" ${OPENBIS_DATA}/raw-store 2>/dev/null` -ne 1${OPENBIS_UID} ]; then
  chown -fR openbis:openbis ${OPENBIS_DATA}
fi

## Default configuration
if [ -d ${OPENBIS_HOME}/servers/openBIS-server/jetty/etc ]; then
  mv ${OPENBIS_HOME}/servers/openBIS-server/jetty/etc ${OPENBIS_HOME}/servers/openBIS-server/jetty/etc.default
  ln -s ${OPENBIS_ETC}/as ${OPENBIS_HOME}/servers/openBIS-server/jetty/etc
fi
if [ -d ${OPENBIS_HOME}/servers/datastore_server/etc ]; then
  mv ${OPENBIS_HOME}/servers/datastore_server/etc ${OPENBIS_HOME}/servers/datastore_server/etc.default
  ln -s ${OPENBIS_ETC}/dss ${OPENBIS_HOME}/servers/datastore_server/etc
fi
if [ -d ${OPENBIS_HOME}/servers/afs-server/etc ]; then
  mv ${OPENBIS_HOME}/servers/afs-server/etc ${OPENBIS_HOME}/servers/afs-server/etc.default
  ln -s ${OPENBIS_ETC}/afs ${OPENBIS_HOME}/servers/afs-server/etc
fi
if [ -d ${OPENBIS_HOME}/servers/server-ro-crate/etc ]; then
  mv ${OPENBIS_HOME}/servers/server-ro-crate/etc ${OPENBIS_HOME}/servers/server-ro-crate/etc.default
  ln -s ${OPENBIS_ETC}/ro-crate ${OPENBIS_HOME}/servers/server-ro-crate/etc
fi

## Copy default AS configuration files to current configuration directory if the file does not exist at the destination
if [ -d ${OPENBIS_HOME}/servers/openBIS-server/jetty/etc.default ]; then
  for FILE in $(/usr/bin/find ${OPENBIS_HOME}/servers/openBIS-server/jetty/etc.default/ -type f); do
    FILE_NAME=`basename ${FILE}`
    if [ ! -e ${OPENBIS_HOME}/servers/openBIS-server/jetty/etc/${FILE_NAME} ]; then
      cp -a ${OPENBIS_HOME}/servers/openBIS-server/jetty/etc.default/${FILE_NAME} ${OPENBIS_HOME}/servers/openBIS-server/jetty/etc/${FILE_NAME}
    fi
  done
fi

## Copy default DSS configuration files to current configuration directory if the file does not exist at the destination
if [ -d ${OPENBIS_HOME}/servers/datastore_server/etc.default ]; then
  for FILE in $(/usr/bin/find ${OPENBIS_HOME}/servers/datastore_server/etc.default/ -type f); do
    FILE_NAME=`basename ${FILE}`
    if [ ! -e ${OPENBIS_HOME}/servers/datastore_server/etc/${FILE_NAME} ]; then
      cp -a ${OPENBIS_HOME}/servers/datastore_server/etc.default/${FILE_NAME} ${OPENBIS_HOME}/servers/datastore_server/etc/${FILE_NAME}
    fi
  done
fi

## Copy default AFS configuration files to current configuration directory if the file does not exist at the destination
if [ -d ${OPENBIS_HOME}/servers/afs-server/etc.default ]; then
  for FILE in $(/usr/bin/find ${OPENBIS_HOME}/servers/afs-server/etc.default/ -type f); do
    FILE_NAME=`basename ${FILE}`
    if [ ! -e ${OPENBIS_HOME}/servers/afs-server/etc/${FILE_NAME} ]; then
      cp -a ${OPENBIS_HOME}/servers/afs-server/etc.default/${FILE_NAME} ${OPENBIS_HOME}/servers/afs-server/etc/${FILE_NAME}
    fi
  done
fi

## Copy default RO-CRATE configuration files to current configuration directory if the file does not exist at the destination
if [ -d ${OPENBIS_HOME}/servers/server-ro-crate/etc.default ]; then
  for FILE in $(/usr/bin/find ${OPENBIS_HOME}/servers/server-ro-crate/etc.default/ -type f); do
    FILE_NAME=`basename ${FILE}`
    if [ ! -e ${OPENBIS_HOME}/servers/server-ro-crate/etc/${FILE_NAME} ]; then
      cp -a ${OPENBIS_HOME}/servers/server-ro-crate/etc.default/${FILE_NAME} ${OPENBIS_HOME}/servers/server-ro-crate/etc/${FILE_NAME}
    fi
  done
fi

## Ensure configuration copied as root is writable by the openbis runtime user.
## (cp -a preserves ownership; some files like the AS 'passwd' file must be writable.)
chown -fR openbis:openbis "${OPENBIS_ETC}/as" "${OPENBIS_ETC}/dss" "${OPENBIS_ETC}/afs" "${OPENBIS_ETC}/ro-crate" 2>/dev/null || true

## Configure openBIS AS from runtime variables
sed -i "s|# database.url-host-part =.*|database.url-host-part = ${OPENBIS_DB_HOST}|g" ${OPENBIS_HOME}/servers/openBIS-server/jetty/etc/service.properties
sed -i "s|database.owner =.*|database.owner = ${OPENBIS_DB_APP_USER}|g" ${OPENBIS_HOME}/servers/openBIS-server/jetty/etc/service.properties
sed -i "s|database.owner-password =.*|database.owner-password = ${OPENBIS_DB_APP_PASS}|g" ${OPENBIS_HOME}/servers/openBIS-server/jetty/etc/service.properties
sed -i "s|database.admin-user =.*|database.admin-user = ${OPENBIS_DB_ADMIN_USER}|g" ${OPENBIS_HOME}/servers/openBIS-server/jetty/etc/service.properties
sed -i "s|database.admin-password =.*|database.admin-password = ${OPENBIS_DB_ADMIN_PASS}|g" ${OPENBIS_HOME}/servers/openBIS-server/jetty/etc/service.properties
sed -i "s|# messages-database.url-host-part =.*|messages-database.url-host-part = ${OPENBIS_DB_HOST}|g" ${OPENBIS_HOME}/servers/openBIS-server/jetty/etc/service.properties
sed -i "s|messages-database.owner =.*|messages-database.owner = ${OPENBIS_DB_APP_USER}|g" ${OPENBIS_HOME}/servers/openBIS-server/jetty/etc/service.properties
sed -i "s|messages-database.owner-password =.*|messages-database.owner-password = ${OPENBIS_DB_APP_PASS}|g" ${OPENBIS_HOME}/servers/openBIS-server/jetty/etc/service.properties
sed -i "s|messages-database.admin-user =.*|messages-database.admin-user = ${OPENBIS_DB_ADMIN_USER}|g" ${OPENBIS_HOME}/servers/openBIS-server/jetty/etc/service.properties
sed -i "s|messages-database.admin-password =.*|messages-database.admin-password = ${OPENBIS_DB_ADMIN_PASS}|g" ${OPENBIS_HOME}/servers/openBIS-server/jetty/etc/service.properties
sed -i "s|^download-url.*|download-url = https:\/\/${OPENBIS_FQDN}|g" ${OPENBIS_HOME}/servers/openBIS-server/jetty/etc/service.properties
sed -i "s|^server-public-information.afs-server.url.*|server-public-information.afs-server.url = https:\/\/${OPENBIS_FQDN}/afs-server|g" ${OPENBIS_HOME}/servers/openBIS-server/jetty/etc/service.properties
sed -i "s|#trusted-cross-origin-domains=.*|trusted-cross-origin-domains=https:\/\/${OPENBIS_FQDN}|g" ${OPENBIS_HOME}/servers/openBIS-server/jetty/etc/service.properties
sed -i "s|^api.v3.operation-execution.cache.directory.*|api.v3.operation-execution.cache.directory = ${OPENBIS_DATA}/api-workspace|g" ${OPENBIS_HOME}/servers/openBIS-server/jetty/etc/service.properties
grep -q "^root-dir" ${OPENBIS_HOME}/servers/openBIS-server/jetty/etc/service.properties && sed -i "s|^root-dir.*|root-dir = ${OPENBIS_DATA}|g" ${OPENBIS_HOME}/servers/openBIS-server/jetty/etc/service.properties || printf "\nroot-dir = ${OPENBIS_DATA}\n" >> ${OPENBIS_HOME}/servers/openBIS-server/jetty/etc/service.properties
grep -q "^file-server.repository-path" ${OPENBIS_HOME}/servers/openBIS-server/jetty/etc/service.properties && sed -i "s|^file-server.repository-path.*|file-server.repository-path = ${OPENBIS_DATA}/raw-store|g" ${OPENBIS_HOME}/servers/openBIS-server/jetty/etc/service.properties || printf "\nfile-server.repository-path = ${OPENBIS_DATA}/raw-store\n" >> ${OPENBIS_HOME}/servers/openBIS-server/jetty/etc/service.properties
grep -q "^eln-lims.as.miscellaneous.file-service.file-server.repository-path" ${OPENBIS_HOME}/servers/openBIS-server/jetty/etc/service.properties && sed -i "s|^eln-lims.as.miscellaneous.file-service.file-server.repository-path.*|eln-lims.as.miscellaneous.file-service.file-server.repository-path = ${OPENBIS_DATA}/raw-store|g" ${OPENBIS_HOME}/servers/openBIS-server/jetty/etc/service.properties || printf "\neln-lims.as.miscellaneous.file-service.file-server.repository-path = ${OPENBIS_DATA}/raw-store\n" >> ${OPENBIS_HOME}/servers/openBIS-server/jetty/etc/service.properties
grep -q "^session-workspace-root-dir" ${OPENBIS_HOME}/servers/openBIS-server/jetty/etc/service.properties && sed -i "s|^session-workspace-root-dir.*|session-workspace-root-dir = ${OPENBIS_DATA}/session-workspace|g" ${OPENBIS_HOME}/servers/openBIS-server/jetty/etc/service.properties || printf "\nsession-workspace-root-dir = ${OPENBIS_DATA}/session-workspace\n" >> ${OPENBIS_HOME}/servers/openBIS-server/jetty/etc/service.properties
grep -q "^personal-access-tokens-file-path" ${OPENBIS_HOME}/servers/openBIS-server/jetty/etc/service.properties && sed -i "s|^personal-access-tokens-file-path.*|personal-access-tokens-file-path = ${OPENBIS_HOME}/servers/openBIS-server/jetty/etc/personal-access-tokens.json|g" ${OPENBIS_HOME}/servers/openBIS-server/jetty/etc/service.properties || printf "\npersonal-access-tokens-file-path = ${OPENBIS_HOME}/servers/openBIS-server/jetty/etc/personal-access-tokens.json\n" >> ${OPENBIS_HOME}/servers/openBIS-server/jetty/etc/service.properties

## Configure openBIS DSS from runtime variables
if [ -r "${OPENBIS_HOME}/servers/datastore_server/etc/service.properties" ]; then
  sed -i "s|# path-info-db.urlHostPart =.*|path-info-db.urlHostPart = ${OPENBIS_DB_HOST}|g" ${OPENBIS_HOME}/servers/datastore_server/etc/service.properties
  sed -i "s|# path-info-db.owner =.*|path-info-db.owner = ${OPENBIS_DB_APP_USER}|g" ${OPENBIS_HOME}/servers/datastore_server/etc/service.properties
  sed -i "s|# path-info-db.password =.*|path-info-db.password = ${OPENBIS_DB_APP_PASS}|g" ${OPENBIS_HOME}/servers/datastore_server/etc/service.properties
  sed -i "s|# path-info-db.adminUser =.*|path-info-db.adminUser = ${OPENBIS_DB_ADMIN_USER}|g" ${OPENBIS_HOME}/servers/datastore_server/etc/service.properties
  sed -i "s|# path-info-db.adminPassword =.*|path-info-db.adminPassword = ${OPENBIS_DB_ADMIN_PASS}|g" ${OPENBIS_HOME}/servers/datastore_server/etc/service.properties
  sed -i "s|^host-address.*|host-address = http:\/\/${HOSTNAME}|g" ${OPENBIS_HOME}/servers/datastore_server/etc/service.properties
  sed -i "s|^port = 8444|port = 8081|g" ${OPENBIS_HOME}/servers/datastore_server/etc/service.properties
  sed -i "s|^use-ssl = true|use-ssl = false|g" ${OPENBIS_HOME}/servers/datastore_server/etc/service.properties
  sed -i "s|^server-url.*|server-url = http:\/\/${HOSTNAME}:8080|g" ${OPENBIS_HOME}/servers/datastore_server/etc/service.properties
  sed -i "s|^download-url.*|download-url = https:\/\/${OPENBIS_FQDN}|g" ${OPENBIS_HOME}/servers/datastore_server/etc/service.properties
  sed -i "s|^cache-workspace-folder.*|cache-workspace-folder = ${OPENBIS_DATA}/cache-workspace|g" ${OPENBIS_HOME}/servers/datastore_server/etc/service.properties
  sed -i "s|^session-workspace-root-dir.*|session-workspace-root-dir = ${OPENBIS_DATA}/session-workspace|g" ${OPENBIS_HOME}/servers/datastore_server/etc/service.properties
  sed -i "s|^commandqueue-dir.*|commandqueue-dir = ${OPENBIS_DATA}/commandqueue|g" ${OPENBIS_HOME}/servers/datastore_server/etc/service.properties
fi

## Configure openBIS AFS from runtime variables
if [ -r "${OPENBIS_HOME}/servers/afs-server/etc/service.properties" ]; then
  # AFS needs to call the AS to validate session tokens.
  # Using the public HTTPS URL inside the container can fail (DNS/TLS), so point directly to the local AS HTTP endpoint.
  # This matches the official AFS configuration recommendation (openBISUrl should ideally point to the AS on localhost).
  sed -i "s|^openBISUrl.*|openBISUrl=http:\/\/localhost:8080|g" ${OPENBIS_HOME}/servers/afs-server/etc/service.properties
fi

set_afs_storage_uuid() {
  if [ ! -r "${OPENBIS_HOME}/servers/afs-server/etc/service.properties" ]; then
    return 0
  fi

  export PGPASSWORD="${OPENBIS_DB_ADMIN_PASS}"
  STORAGEUUID=$(psql -h "${OPENBIS_DB_HOST}" -U "${OPENBIS_DB_ADMIN_USER}" -d openbis_prod -t -c 'select uuid from data_stores;' 2>/dev/null | sed -e 's/^\s*//' -e '/^$/d' | head -n 1)

  if [ -n "${STORAGEUUID}" ]; then
    sed -i "s|^storageUuid=.*|storageUuid=${STORAGEUUID}|g" "${OPENBIS_HOME}/servers/afs-server/etc/service.properties"
  fi
}

## Configure openBIS RoCrate from runtime variables
if [ -r "${OPENBIS_HOME}/servers/server-ro-crate/etc/service.properties" ]; then
  sed -i "s|^openBISUrl.*|openBISUrl=http:\/\/localhost:8080|g" ${OPENBIS_HOME}/servers/server-ro-crate/etc/service.properties
  sed -i "s|^sessionWorkSpace=.*|sessionWorkSpace=${OPENBIS_DATA}/session-workspace|g" ${OPENBIS_HOME}/servers/server-ro-crate/etc/service.properties
fi

## Standarization patches for containarized environment
if [ -r "${OPENBIS_HOME}/servers/datastore_server/datastore_server.sh" ]; then
  sed -i "s|^STARTUPLOG=.*|STARTUPLOG=log/dss_startup.out|g" ${OPENBIS_HOME}/servers/datastore_server/datastore_server.sh
fi

if [ -r "${OPENBIS_HOME}/servers/afs-server/bin/afs_server.sh" ]; then
  sed -i "s|^STARTUP_LOG=.*|STARTUP_LOG=\$LOG_FOLDER/afs_startup.out|g" ${OPENBIS_HOME}/servers/afs-server/bin/afs_server.sh
fi

## Patch missing messages-database.url-host-part
if [ -r "${OPENBIS_HOME}/servers/openBIS-server/jetty/etc/service.properties" ]; then
  sed -i "29s|.*|messages-database.url-host-part = ${OPENBIS_DB_HOST}|g" ${OPENBIS_HOME}/servers/openBIS-server/jetty/etc/service.properties
fi

## Patch missing storageUuid
if [ -r "${OPENBIS_HOME}/servers/afs-server/etc/service.properties" ]; then
  set_afs_storage_uuid
fi

## Set password for database
export PGPASSWORD=${OPENBIS_DB_ADMIN_PASS}; psql -h ${OPENBIS_DB_HOST} -U ${OPENBIS_DB_ADMIN_USER} -c "ALTER USER ${OPENBIS_DB_APP_USER} PASSWORD '${OPENBIS_DB_APP_PASS}';" 1>/tmp/PG_OK 2>/tmp/PG_ERR

## Timestamp latest execution of this entrypoint
su openbis -c "date > ${OPENBIS_LOG}/activation_date.out" &>/dev/null

## Start openBIS AS (change to until loop here?)
if [ -s /tmp/PG_ERR ]; then
  ## Initial start
  su openbis -c "bash ${OPENBIS_HOME}/bin/bisup.sh" &>/dev/null
  sleep 2
  su openbis -c "bash ${OPENBIS_HOME}/bin/bisdown.sh" &>/dev/null
  export PGPASSWORD=${OPENBIS_DB_ADMIN_PASS}; psql -h ${OPENBIS_DB_HOST} -U ${OPENBIS_DB_ADMIN_USER} -c "ALTER USER ${OPENBIS_DB_APP_USER} PASSWORD '${OPENBIS_DB_APP_PASS}';" 1>/tmp/PG_OK 2>/tmp/PG_ERR
  su openbis -c "bash ${OPENBIS_HOME}/bin/bisup.sh" &>/dev/null
  sleep 2
else
  ## Regular start
  su openbis -c "bash ${OPENBIS_HOME}/bin/bisup.sh" &>/dev/null
  sleep 2
fi

## Start openBIS DSS
if [ -r "${OPENBIS_HOME}/bin/dssup.sh" ]; then
  su openbis -c "bash ${OPENBIS_HOME}/bin/dssup.sh" &>/dev/null
  sleep 2
fi

## Start openBIS AFS
if [ -r "${OPENBIS_HOME}/bin/afsup.sh" ]; then
  set_afs_storage_uuid
  su openbis -c "bash ${OPENBIS_HOME}/bin/afsup.sh" &>/dev/null
  sleep 2
fi

## Start openBIS RoCrate
if [ -r "${OPENBIS_HOME}/bin/rocsup.sh" ]; then
  su openbis -c "bash ${OPENBIS_HOME}/bin/rocsup.sh" &>/dev/null
  sleep 2
fi

## Get openBIS release version
su openbis -c "bash ${OPENBIS_HOME}/servers/openBIS-server/jetty/bin/version.sh > /tmp/OPENBIS_VERSION" &>/dev/null
su openbis -c "bash ${OPENBIS_HOME}/servers/openBIS-server/jetty/bin/version.sh > ${OPENBIS_LOG}/version.txt" &>/dev/null

## Set openBIS admin password from environment variable
OPENBIS_ADMIN_PASS_FAILED=`echo ${OPENBIS_ADMIN_PASS} | ${OPENBIS_HOME}/servers/openBIS-server/jetty/bin/passwd.sh test admin | /usr/bin/grep -c failed`
if [ ${OPENBIS_ADMIN_PASS_FAILED} = 1 ]; then
  ${OPENBIS_HOME}/servers/openBIS-server/jetty/bin/passwd.sh change admin -p ${OPENBIS_ADMIN_PASS}
fi

## Follow logs created by processes from the 1st line
tail -n +1 -F ${OPENBIS_LOG}/*.out ${OPENBIS_LOG}/*.txt ${OPENBIS_LOG}/*.log &

## Keep the container running with never ending process
exec tail -f /dev/null
