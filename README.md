## Configuration

Do not forget to add a `.env` file in the root folder, with the following information:

```
OPENBIS_ADMIN_PASS=
OPENBIS_DB_ADMIN_PASS=
OPENBIS_DB_ADMIN_USER=
OPENBIS_DB_APP_PASS=
OPENBIS_DB_APP_USER=
OPENBIS_DB_HOST=
OPENBIS_FQDN=
file-server.repository-path=
OPENBIS_DSS_PORT=
OPENBIS_AS_PORT=
OPENBIS_URL=
OPENBIS_DSS_URL=
```

`OPENBIS_DSS_URL` should point to the DSS base URL that serves `/datastore_server/*` (e.g. `http://localhost:8083`).

## Execution

`task dev`
