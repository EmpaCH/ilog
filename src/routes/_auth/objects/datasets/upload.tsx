import { createFileRoute } from '@tanstack/react-router'
import { useContext, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Autocomplete,
  AutocompleteItem,
  Button,
  Input,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from '@heroui/react'
import DownloadIcon from '@mui/icons-material/Download'
import openbis from '@openbis/openbis.esm'
import { AuthContext } from '../../../../context/auth/authContext'
import { useGetObjects } from '../../../../apis/object/useGetObjects'

export const Route = createFileRoute('/_auth/objects/datasets/upload' as any)({
  component: DatasetUploadPage,
})

type DataSetRow = {
  code: string
  permId?: string
  type?: string
  dataStore?: string
  registrationDate?: number
  modificationDate?: number
  kind?: string
  experiment?: string
  sample?: string
  registrator?: string
  modifier?: string
  size?: number
  location?: string
  shareId?: string
  archivingStatus?: string
}

type DataSetsPage = {
  rows: DataSetRow[]
  totalCount: number
}

type DataStoreInfo = {
  code: string
  downloadUrl?: string
  remoteUrl?: string
}

type ErrorInfo = {
  summary: string
  details?: string
}

function splitCsvLike(value: string): string[] {
  return value
    .split(/[\n,\s]+/g)
    .map((v) => v.trim())
    .filter(Boolean)
}

function toErrorInfo(error: unknown): ErrorInfo {
  if (error == null) return { summary: 'Unknown error' }

  const anyErr = error as any
  const name = typeof anyErr?.name === 'string' ? anyErr.name : 'Error'
  const message =
    typeof anyErr?.message === 'string'
      ? anyErr.message
      : typeof anyErr?.getMessage === 'function'
        ? String(anyErr.getMessage())
        : String(error)

  const summary = message && message !== '[object Object]' ? message : `${name}`

  const safePick = (obj: any) => {
    if (!obj || typeof obj !== 'object') return obj
    const picked: Record<string, unknown> = {}
    for (const key of ['name', 'message', 'stack', 'cause', 'code', 'status', 'statusText']) {
      if (key in obj) picked[key] = obj[key]
    }
    // Some libs put nested response data here
    if ('response' in obj) picked.response = obj.response
    if ('data' in obj) picked.data = obj.data
    return picked
  }

  let details: string | undefined
  try {
    details = JSON.stringify(safePick(anyErr), null, 2)
  } catch {
    details = anyErr?.stack ? String(anyErr.stack) : undefined
  }

  return details ? { summary, details } : { summary }
}

function DatasetUploadPage() {
  const { apiFacade } = useContext(AuthContext)
  const queryClient = useQueryClient()

  const allObjectsQuery = useGetObjects()

  const [page, setPage] = useState(1)
  const rowsPerPage = 20

  const [dataStoreCodesText, setDataStoreCodesText] = useState('')
  const [dataSetCodesText, setDataSetCodesText] = useState('')

  const [downloadStatus, setDownloadStatus] = useState<
    | { kind: 'idle' }
    | { kind: 'working'; code: string }
    | { kind: 'error'; message: string; details?: string }
    | { kind: 'ok'; fileName: string }
  >({ kind: 'idle' })

  const [experimentIdentifier, setExperimentIdentifier] = useState('')
  const [sampleIdentifier, setSampleIdentifier] = useState('')
  const [dataSetTypeCode, setDataSetTypeCode] = useState('ELN_PREVIEW')
  const [uploadDataStoreCode, setUploadDataStoreCode] = useState('')
  const [uploadStatus, setUploadStatus] = useState<
    | { kind: 'idle' }
    | { kind: 'working' }
    | { kind: 'ok'; dataSetPermId: string }
    | { kind: 'error'; message: string; details?: string }
  >({ kind: 'idle' })

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const sampleItems = useMemo(() => {
    const objects = allObjectsQuery.data ?? []

    const safe = <T,>(fn: () => T): T | undefined => {
      try {
        return fn()
      } catch {
        return undefined
      }
    }

    return objects
      .map((obj: any) => {
        const identifierObj = safe(() => obj.getIdentifier?.())
        const identifier = identifierObj != null ? String(identifierObj) : ''
        if (!identifier) return null

        const codeObj = safe(() => obj.getCode?.())
        const code = codeObj != null ? String(codeObj) : ''

        const nameRaw = safe(() => obj.getProperty?.('NAME'))
        const name = nameRaw != null && String(nameRaw).trim() ? String(nameRaw) : code

        const typeObj = safe(() => obj.getType?.())
        const type = typeObj && typeof typeObj.getCode === 'function' ? String(typeObj.getCode()) : ''

        const expObj = safe(() => obj.getExperiment?.())
        const experiment = expObj && typeof (expObj as any).getIdentifier === 'function' ? String((expObj as any).getIdentifier()) : ''

        const label = name && code && name !== code ? `${name} (${code})` : name || code || identifier

        return {
          key: identifier,
          identifier,
          code,
          name,
          type,
          experiment,
          label,
        }
      })
      .filter(Boolean)
      .sort((a: any, b: any) => String(a.label).localeCompare(String(b.label), undefined, { numeric: true }))
  }, [allObjectsQuery.data])

  const formatDateTime = (ts?: number) => {
    if (!ts) return ''
    try {
      const d = new Date(ts)
      if (Number.isNaN(d.getTime())) return ''
      return d.toISOString().replace('T', ' ').slice(0, 19)
    } catch {
      return ''
    }
  }

  const downloadBlobFile = (fileName: string, blob: Blob) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const onDownloadFileList = async (row: DataSetRow) => {
    setDownloadStatus({ kind: 'working', code: row.code })
    try {
      const directDssJsonUrl = '/datastore_server/rmi-data-store-server-v3.json'

      const dssPreferred = row.dataStore
        ? apiFacade.getDataStoreFacade([row.dataStore])
        : apiFacade.getDataStoreFacade()
      const dssAll = apiFacade.getDataStoreFacade()

      let forceDirectDss = false

      const buildCriteria = () => {
        const criteria = new openbis.DataSetFileSearchCriteria()
        const dsCriteria: any = criteria.withDataSet()
        if (row.permId) {
          // Some installations are picky about code vs permId here; permId is the safest identifier.
          dsCriteria.withPermId().thatEquals(row.permId)
        } else {
          dsCriteria.withCode().thatEquals(row.code)
        }
        return criteria
      }

      // openBIS DSS (6.8) does not support pagination for searchFiles; passing from/count throws.
      const buildFetchOptions = () => new openbis.DataSetFileFetchOptions()

      const searchOnceViaFacade = async (dssFacade: any, criteria: any, fo: any) => {
        return dssFacade.searchFiles(criteria, fo)
      }

      const searchOnceDirect = async (criteria: any, fo: any) => {
        const priv = (apiFacade as any)?._private
        if (!priv?.ajaxRequest || !priv?.sessionToken) {
          throw new Error('openBIS client cannot access internal ajaxRequest/sessionToken for direct DSS call')
        }
        return priv.ajaxRequest({
          url: directDssJsonUrl,
          data: {
            method: 'searchFiles',
            params: [priv.sessionToken, criteria, fo],
          },
          returnType: 'SearchResult',
        })
      }

      const criteria = buildCriteria()
      const fo = buildFetchOptions()
      let result: any

      try {
        result = forceDirectDss
          ? await searchOnceDirect(criteria, fo)
          : await searchOnceViaFacade(dssPreferred, criteria, fo)
      } catch (e) {
        const info = toErrorInfo(e)
        const isNoDataStores = /No data stores found/i.test(info.summary)

        // If a dataset is registered at a specific DSS but the DSS selection is wrong (or missing),
        // retry once across all available data stores.
        if (!forceDirectDss && row.dataStore && !isNoDataStores) {
          try {
            result = await searchOnceViaFacade(dssAll, criteria, fo)
          } catch (e2) {
            const info2 = toErrorInfo(e2)
            const isNoDataStores2 = /No data stores found/i.test(info2.summary)
            if (isNoDataStores2) {
              forceDirectDss = true
              result = await searchOnceDirect(criteria, fo)
            } else {
              throw e2
            }
          }
        } else if (!forceDirectDss && isNoDataStores) {
          // openBIS client couldn't discover DSS via AS; try the direct DSS JSON endpoint.
          forceDirectDss = true
          result = await searchOnceDirect(criteria, fo)
        } else {
          throw e
        }
      }

      const allFiles: openbis.DataSetFile[] = result.getObjects()

      const candidates = allFiles.filter((f) => !f.isDirectory() && !!f.getPath())
      if (candidates.length === 0) {
        throw new Error('No downloadable files found in this dataset')
      }

      const preferredPath = 'original/ai_alu.png'
      const pick =
        candidates.find((f) => f.getPath() === preferredPath) ||
        candidates.find((f) => String(f.getPath()).startsWith('original/') && String(f.getPath()).toLowerCase().endsWith('.png')) ||
        candidates.find((f) => String(f.getPath()).toLowerCase().endsWith('.png')) ||
        candidates[0]

      const filePath = String(pick.getPath())

      // DSS dataset download servlet expects the dataset identifier in the URL path.
      // In practice, the dataset permId works reliably (matches the openBIS UI links).
      const datasetId = row.permId ?? row.code
      if (!datasetId) throw new Error('Dataset identifier (permId/code) is missing')

      const sessionToken = (apiFacade as any)?._private?.sessionToken
      if (!sessionToken) throw new Error('Missing openBIS session token')

      // Mounted at /datastore_server/<DATA_SET_ID>/<URL_ENCODED_PATH>
      // Note: the file path must be URL-encoded as a single segment (so '/' becomes '%2F')
      // e.g. /datastore_server/<permId>/original%2Fai_alu.png?sessionID=...
      const encodedDs = encodeURIComponent(datasetId)
      const encodedPath = encodeURIComponent(filePath.replace(/^\/+/, ''))

      const downloadUrl = `/datastore_server/${encodedDs}/${encodedPath}?sessionID=${encodeURIComponent(sessionToken)}`
      const resp = await fetch(downloadUrl, { method: 'GET' })
      if (!resp.ok) {
        throw new Error(`Download failed: HTTP ${resp.status} ${resp.statusText}`)
      }

      const contentType = resp.headers.get('content-type') ?? ''
      if (/text\/html/i.test(contentType)) {
        // Often indicates session/auth problems or a directory listing.
        const body = await resp.text()
        throw new Error(`Download returned HTML instead of a file (content-type: ${contentType}). Response starts with: ${body.slice(0, 200)}`)
      }

      const blob = await resp.blob()
      const baseName = filePath.split('/').filter(Boolean).pop() || 'download'
      const safeDatasetPrefix = String(datasetId)
      const fileName = `${safeDatasetPrefix}_${baseName}`
      downloadBlobFile(fileName, blob)
      setDownloadStatus({ kind: 'ok', fileName })
    } catch (e) {
      const info = toErrorInfo(e)
      const resolvedDataStore = row.dataStore
        ? (dataStoresQuery.data?.stores ?? []).find((s) => s.code === row.dataStore) ?? null
        : null
      const asDataStoresSnapshot = {
        totalCount: dataStoresQuery.data?.totalCount ?? null,
        codes: dataStoresQuery.data?.codes ?? null,
      }
      const context = {
        dataSetCode: row.code,
        dataSetPermId: row.permId,
        dataStore: row.dataStore,
        resolvedDataStore,
        asDataStoresSnapshot,
        selectedDataStoresInput: splitCsvLike(dataStoreCodesText),
        directDssJsonUrl: '/datastore_server/rmi-data-store-server-v3.json',
      }
      const details = [info.details, '--- context ---', JSON.stringify(context, null, 2)]
        .filter(Boolean)
        .join('\n')

      console.error('Dataset download failed', { error: e, context })
      setDownloadStatus({ kind: 'error', message: info.summary, details })
    }
  }

  const dataSetsQuery = useQuery({
    queryKey: ['as', 'searchDataSets', { page, rowsPerPage, dataStoreCodesText, dataSetCodesText }],
    queryFn: async (): Promise<DataSetsPage> => {
      const sc = new openbis.DataSetSearchCriteria()
      const fo = new openbis.DataSetFetchOptions()

      // Server-side paging.
      fo.from((page - 1) * rowsPerPage)
      fo.count(rowsPerPage)

      // Fetch commonly useful relations for display.
      fo.withType()
      fo.withDataStore()
      fo.withExperiment()
      fo.withSample()
      fo.withRegistrator()
      fo.withModifier()
      fo.withPhysicalData()

      const root = sc.withAndOperator()

      const dataStoreCodes = splitCsvLike(dataStoreCodesText)
      if (dataStoreCodes.length > 0) {
        // (dataStore.code == DSS1 OR dataStore.code == DSS2 ...)
        const storesOr: any = root.withSubcriteria().withOrOperator()
        for (const code of dataStoreCodes) {
          storesOr.withDataStore().withCode().thatEquals(code)
        }
      }

      const requestedCodes = splitCsvLike(dataSetCodesText)
      if (requestedCodes.length > 0) {
        // (code == A OR code == B ...)
        const codesOr: any = root.withSubcriteria().withOrOperator()
        for (const code of requestedCodes) {
          codesOr.withCode().thatEquals(code)
        }
      }
      const result = await apiFacade.searchDataSets(sc, fo)
      const objects = result.getObjects()

      const safe = <T,>(fn: () => T): T | undefined => {
        try {
          return fn()
        } catch {
          return undefined
        }
      }

      const rows: DataSetRow[] = objects.map((ds: any) => {
        const code = typeof ds?.getCode === 'function' ? String(ds.getCode()) : String(ds?.code ?? '')

        const permIdObj = typeof ds?.getPermId === 'function' ? ds.getPermId() : ds?.permId
        const permId =
          typeof permIdObj?.getPermId === 'function'
            ? String(permIdObj.getPermId())
            : permIdObj
              ? String(permIdObj)
              : undefined

        const typeObj = typeof ds?.getType === 'function' ? ds.getType() : ds?.type
        const type =
          typeof typeObj?.getCode === 'function' ? String(typeObj.getCode()) : typeObj?.code ? String(typeObj.code) : undefined

        const dataStoreObj = typeof ds?.getDataStore === 'function' ? ds.getDataStore() : ds?.dataStore
        const dataStore =
          typeof dataStoreObj?.getCode === 'function'
            ? String(dataStoreObj.getCode())
            : dataStoreObj?.code
              ? String(dataStoreObj.code)
              : undefined

        const registrationDate = safe(() => ds.getRegistrationDate?.())
        const modificationDate = safe(() => ds.getModificationDate?.())
        const kindObj = safe(() => ds.getKind?.())
        const kind = kindObj ? String(kindObj) : undefined

        const expObj = safe(() => ds.getExperiment?.())
        const experiment =
          expObj && typeof (expObj as any).getIdentifier === 'function' ? String((expObj as any).getIdentifier()) : undefined

        const sampleObj = safe(() => ds.getSample?.())
        const sample =
          sampleObj && typeof (sampleObj as any).getIdentifier === 'function' ? String((sampleObj as any).getIdentifier()) : undefined

        const registratorObj = safe(() => ds.getRegistrator?.())
        const registrator =
          registratorObj && typeof (registratorObj as any).getUserId === 'function'
            ? String((registratorObj as any).getUserId())
            : undefined

        const modifierObj = safe(() => ds.getModifier?.())
        const modifier =
          modifierObj && typeof (modifierObj as any).getUserId === 'function' ? String((modifierObj as any).getUserId()) : undefined

        const physicalObj = safe(() => ds.getPhysicalData?.())
        const size = physicalObj && typeof (physicalObj as any).getSize === 'function' ? Number((physicalObj as any).getSize()) : undefined
        const location =
          physicalObj && typeof (physicalObj as any).getLocation === 'function' ? String((physicalObj as any).getLocation()) : undefined
        const shareId =
          physicalObj && typeof (physicalObj as any).getShareId === 'function' ? String((physicalObj as any).getShareId()) : undefined
        const archivingStatusObj = physicalObj && typeof (physicalObj as any).getStatus === 'function' ? (physicalObj as any).getStatus() : undefined
        const archivingStatus = archivingStatusObj != null ? String(archivingStatusObj) : undefined

        return {
          code,
          permId,
          type,
          dataStore,
          registrationDate: typeof registrationDate === 'number' ? registrationDate : undefined,
          modificationDate: typeof modificationDate === 'number' ? modificationDate : undefined,
          kind,
          experiment,
          sample,
          registrator,
          modifier,
          size: Number.isFinite(size as any) ? size : undefined,
          location,
          shareId,
          archivingStatus,
        }
      })

      rows.sort((a, b) => a.code.localeCompare(b.code))
      return { totalCount: result.getTotalCount(), rows }
    },
    staleTime: 30_000,
  })

  const dataStoresQuery = useQuery({
    queryKey: ['as', 'searchDataStores'],
    queryFn: async () => {
      const sc = new openbis.DataStoreSearchCriteria()
      const fo = new openbis.DataStoreFetchOptions()
      // keep it cheap
      fo.from(0)
      fo.count(50)
      const result = await apiFacade.searchDataStores(sc, fo)
      const stores = result.getObjects()

      const safe = <T,>(fn: () => T): T | undefined => {
        try {
          return fn()
        } catch {
          return undefined
        }
      }

      const storeInfos: DataStoreInfo[] = stores
        .map((s: any) => {
          const code = typeof s?.getCode === 'function' ? String(s.getCode()) : String(s?.code ?? '')
          if (!code) return null

          const downloadUrl = safe(() => (typeof s?.getDownloadUrl === 'function' ? String(s.getDownloadUrl()) : undefined))
          const remoteUrl = safe(() => (typeof s?.getRemoteUrl === 'function' ? String(s.getRemoteUrl()) : undefined))

          return { code, downloadUrl, remoteUrl }
        })
        .filter(Boolean) as DataStoreInfo[]

      const codes = storeInfos.map((s) => s.code)
      return { totalCount: result.getTotalCount(), codes, stores: storeInfos }
    },
    staleTime: 60_000,
  })

  const pageData = dataSetsQuery.data
  const pageRows = pageData?.rows ?? []
  const totalCount = pageData?.totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / rowsPerPage))

  const onUpload = async () => {
    setUploadStatus({ kind: 'working' })

    try {
      const input = fileInputRef.current
      const files = input?.files
      if (!files || files.length === 0) {
        setUploadStatus({ kind: 'error', message: 'Please choose a file to upload.' })
        return
      }
      const expId = experimentIdentifier.trim()
      const sampId = sampleIdentifier.trim()
      if (!expId && !sampId) {
        setUploadStatus({
          kind: 'error',
          message: 'Please set an experiment and/or sample identifier.',
        })
        return
      }

      const sessionToken = (apiFacade as any)?._private?.sessionToken
      if (!sessionToken) {
        throw new Error('Missing openBIS session token (please log in again)')
      }

      const directDssJsonUrl = '/datastore_server/rmi-data-store-server-v3.json'

      const generateUploadId = () => {
        const d = new Date()
        const pad = (n: number, w: number) => String(n).padStart(w, '0')
        const ts =
          d.getFullYear() +
          pad(d.getMonth() + 1, 2) +
          pad(d.getDate(), 2) +
          pad(d.getHours(), 2) +
          pad(d.getMinutes(), 2) +
          pad(d.getSeconds(), 2)
        const rand = pad(Math.round(Math.random() * 100000), 5)
        return `upload-${ts}-${rand}`
      }

      const uploadFileToSessionWorkspace = async (uploadId: string, file: File) => {
        // Use relative URL so Vite proxy (or same-origin reverse proxy) can route to DSS.
        const chunkSize = 1024 * 1024
        const relativeName = file.webkitRelativePath || file.name
        const filenameParam = encodeURIComponent(`${uploadId}/${relativeName}`)
        const size = file.size

        for (let startByte = 0; startByte < size; startByte += chunkSize) {
          const endByte = Math.min(startByte + chunkSize, size)
          const url =
            `/datastore_server/session_workspace_file_upload` +
            `?sessionID=${encodeURIComponent(sessionToken)}` +
            `&filename=${filenameParam}` +
            `&id=1` +
            `&startByte=${startByte}` +
            `&endByte=${endByte}` +
            `&size=${size}` +
            `&emptyFolder=false`

          const resp = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/octet-stream',
            },
            body: file.slice(startByte, endByte),
          })
          if (!resp.ok) {
            const body = await resp.text().catch(() => '')
            throw new Error(`DSS upload failed (${relativeName}): HTTP ${resp.status} ${resp.statusText}. ${body}`)
          }
        }
      }

      const uploadFilesToSessionWorkspace = async (uploadId: string, list: FileList) => {
        // Upload sequentially to keep it simple/reliable.
        for (const file of Array.from(list)) {
          await uploadFileToSessionWorkspace(uploadId, file)
        }
      }

      const createUploadedDataSetDirect = async (creation: openbis.UploadedDataSetCreation) => {
        const priv = (apiFacade as any)?._private
        if (!priv?.ajaxRequest) {
          throw new Error('openBIS client cannot access internal ajaxRequest for direct DSS call')
        }

        return priv.ajaxRequest({
          url: directDssJsonUrl,
          data: {
            method: 'createUploadedDataSet',
            params: [sessionToken, creation],
          },
          returnType: { name: 'DataSetPermId' },
        })
      }

      // The openBIS JS client uses the DSS downloadUrl returned by AS (often absolute), which can
      // lead to browser CORS/TLS failures when the app is served from a different origin.
      // Use same-origin DSS endpoints instead (proxied in dev under `/datastore_server/`).
      const uploadId = generateUploadId()
      await uploadFilesToSessionWorkspace(uploadId, files)

      const creation = new openbis.UploadedDataSetCreation()
      creation.setUploadId(uploadId)
      if (expId) {
        creation.setExperimentId(new openbis.ExperimentIdentifier(expId))
      }
      if (sampId) {
        creation.setSampleId(new openbis.SampleIdentifier(sampId))
      }
      creation.setTypeId(new openbis.EntityTypePermId(dataSetTypeCode.trim(), openbis.EntityKind.DATA_SET))

      const createdPermId = await createUploadedDataSetDirect(creation)
      const createdPermIdStr =
        typeof (createdPermId as any)?.getPermId === 'function'
          ? String((createdPermId as any).getPermId())
          : String(createdPermId)

      setUploadStatus({ kind: 'ok', dataSetPermId: createdPermIdStr })
      await queryClient.invalidateQueries({ queryKey: ['as', 'searchDataSets'] })
    } catch (e: any) {
      const info = toErrorInfo(e)
      const resolvedDataStore = uploadDataStoreCode.trim()
        ? (dataStoresQuery.data?.stores ?? []).find((s) => s.code === uploadDataStoreCode.trim()) ?? null
        : dataStoresQuery.data?.codes?.[0]
          ? (dataStoresQuery.data?.stores ?? []).find((s) => s.code === dataStoresQuery.data?.codes?.[0]) ?? null
          : null
      const context = {
        experimentIdentifier: experimentIdentifier.trim() || null,
        sampleIdentifier: sampleIdentifier.trim() || null,
        dataSetTypeCode: dataSetTypeCode.trim(),
        uploadDataStoreCode: uploadDataStoreCode.trim() || null,
        autoPickedDataStore: dataStoresQuery.data?.codes?.[0] ?? null,
        resolvedDataStore,
      }
      const details = [info.details, '--- context ---', JSON.stringify(context, null, 2)]
        .filter(Boolean)
        .join('\n')

      console.error('Dataset upload failed', { error: e, context })
      setUploadStatus({ kind: 'error', message: info.summary || 'Upload failed.', details })
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2>Datasets</h2>
          <div className="text-default-500 text-small">
            Showing datasets from openBIS (AS)
          </div>
        </div>
        <Button
          color="primary"
          variant="bordered"
          isLoading={dataSetsQuery.isFetching}
          onPress={() => {
            dataStoresQuery.refetch()
            dataSetsQuery.refetch()
          }}
        >
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Dataset codes (optional)"
          placeholder="MY_DATA_SET_CODE_1, MY_DATA_SET_CODE_2"
          value={dataSetCodesText}
          onValueChange={(v) => {
            setDataSetCodesText(v)
            setPage(1)
          }}
          description="If set, uses OR criteria like the openBIS examples"
        />
        <Input
          label="Data stores (optional)"
          placeholder="DSS1, DSS2"
          value={dataStoreCodesText}
          onValueChange={(v) => {
            setDataStoreCodesText(v)
            setPage(1)
          }}
          description="Leave empty to search across all data stores"
        />
      </div>

      <div className="text-small text-default-500">
        Data stores (AS):{' '}
        {dataStoresQuery.isLoading
          ? 'loading…'
          : dataStoresQuery.isError
            ? `error: ${toErrorInfo(dataStoresQuery.error).summary}`
            : `${dataStoresQuery.data?.totalCount ?? 0}${
                (dataStoresQuery.data?.codes?.length ?? 0) > 0
                  ? ` (${dataStoresQuery.data?.codes?.join(', ')})`
                  : ''
              }`}
      </div>

      {downloadStatus.kind === 'error' && (
        <div className="flex flex-col gap-2">
          <div className="text-small text-danger">Download failed: {downloadStatus.message}</div>
          <pre className="text-xs text-default-600 whitespace-pre-wrap break-words">{String(downloadStatus.details ?? '')}</pre>
        </div>
      )}
      {downloadStatus.kind === 'ok' && (
        <div className="text-small text-success">Downloaded: {downloadStatus.fileName}</div>
      )}

      {dataSetsQuery.isError && (
        <div className="flex flex-col gap-2">
          <div className="text-small text-danger">{toErrorInfo(dataSetsQuery.error).summary}</div>
          <pre className="text-xs text-default-600 whitespace-pre-wrap break-words">
            {String(toErrorInfo(dataSetsQuery.error).details ?? '')}
          </pre>
        </div>
      )}

      <Table
        aria-label="Datasets"
        isHeaderSticky
        bottomContent={
          <div className="py-2 px-2 flex justify-between items-center">
            <span className="text-default-400 text-small">Total {totalCount} datasets</span>
            <Pagination
              isCompact
              showControls
              showShadow
              color="primary"
              page={page}
              total={totalPages}
              onChange={setPage}
            />
          </div>
        }
        bottomContentPlacement="outside"
        classNames={{ wrapper: 'max-h-[520px]' }}
        style={{ border: '1px solid #E0E0E0', borderRadius: '8px' }}
      >
        <TableHeader>
          <TableColumn key="actions" align="end">
            Download
          </TableColumn>
          <TableColumn key="code">Code</TableColumn>
          <TableColumn key="permId">PermId</TableColumn>
          <TableColumn key="type">Type</TableColumn>
          <TableColumn key="ds">Data store</TableColumn>
          <TableColumn key="kind">Kind</TableColumn>
          <TableColumn key="reg">Registered</TableColumn>
          <TableColumn key="mod">Modified</TableColumn>
          <TableColumn key="exp">Experiment</TableColumn>
          <TableColumn key="sample">Sample</TableColumn>
          <TableColumn key="size" align="end">
            Size
          </TableColumn>
          <TableColumn key="share">Share</TableColumn>
          <TableColumn key="loc">Location</TableColumn>
          <TableColumn key="arch">Archive</TableColumn>
          <TableColumn key="regBy">Registrator</TableColumn>
          <TableColumn key="modBy">Modifier</TableColumn>
        </TableHeader>
        <TableBody
          emptyContent={dataSetsQuery.isLoading ? 'Loading…' : dataSetsQuery.isError ? 'Failed to load.' : 'No datasets found'}
        >
          {pageRows.map((row) => (
            <TableRow key={row.permId ?? row.code}>
              <TableCell style={{ textAlign: 'right' }}>
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  aria-label={`download a dataset file for ${row.code}`}
                  isLoading={downloadStatus.kind === 'working' && downloadStatus.code === row.code}
                  onPress={() => onDownloadFileList(row)}
                >
                  <DownloadIcon className="text-default-500" />
                </Button>
              </TableCell>
              <TableCell>{row.code}</TableCell>
              <TableCell>{row.permId ?? ''}</TableCell>
              <TableCell>{row.type ?? ''}</TableCell>
              <TableCell>{row.dataStore ?? ''}</TableCell>
              <TableCell>{row.kind ?? ''}</TableCell>
              <TableCell>{formatDateTime(row.registrationDate)}</TableCell>
              <TableCell>{formatDateTime(row.modificationDate)}</TableCell>
              <TableCell>{row.experiment ?? ''}</TableCell>
              <TableCell>{row.sample ?? ''}</TableCell>
              <TableCell style={{ textAlign: 'right' }}>{row.size ?? ''}</TableCell>
              <TableCell>{row.shareId ?? ''}</TableCell>
              <TableCell>{row.location ?? ''}</TableCell>
              <TableCell>{row.archivingStatus ?? ''}</TableCell>
              <TableCell>{row.registrator ?? ''}</TableCell>
              <TableCell>{row.modifier ?? ''}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex flex-col gap-4">
        <h3>Upload image as dataset</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Experiment"
            placeholder="/SPACE/PROJECT/EXPERIMENT"
            value={experimentIdentifier}
            onValueChange={setExperimentIdentifier}
            description="Optional (set either Experiment or Sample)"
          />
          <Autocomplete
            label="Sample (Object)"
            placeholder={allObjectsQuery.isLoading ? 'Loading objects…' : 'Select an object'}
            items={sampleItems}
            selectedKey={sampleIdentifier || null}
            onSelectionChange={(key) => {
              const nextIdentifier = key == null ? '' : String(key)
              setSampleIdentifier(nextIdentifier)

              if (!nextIdentifier) return
              const selected = sampleItems.find((it: any) => it.identifier === nextIdentifier)
              if (selected?.experiment) {
                setExperimentIdentifier(String(selected.experiment))
              }
            }}
            isDisabled={allObjectsQuery.isLoading || allObjectsQuery.isError}
            allowsCustomValue={false}
            description={
              allObjectsQuery.isError
                ? 'Failed to load objects'
                : 'Selecting an object will auto-fill its experiment'
            }
          >
            {(item: any) => (
              <AutocompleteItem key={item.key} textValue={item.label}>
                <div className="flex flex-col">
                  <div className="text-small">{item.label}</div>
                  <div className="text-tiny text-default-500">{[item.type, item.experiment].filter(Boolean).join(' • ')}</div>
                </div>
              </AutocompleteItem>
            )}
          </Autocomplete>
          <Input
            label="Dataset type"
            placeholder="ELN_PREVIEW"
            value={dataSetTypeCode}
            onValueChange={setDataSetTypeCode}
            description="Type code used for the uploaded dataset"
          />
        </div>

        <Input
          label="Upload data store (optional)"
          placeholder={dataStoresQuery.data?.codes?.[0] ? `e.g. ${dataStoresQuery.data?.codes?.[0]}` : 'e.g. DSS1'}
          value={uploadDataStoreCode}
          onValueChange={setUploadDataStoreCode}
          description={
            uploadDataStoreCode.trim()
              ? 'Uses this data store for upload'
              : dataStoresQuery.data?.codes?.[0]
                ? `Auto-picks ${dataStoresQuery.data?.codes?.[0]} for upload when empty`
                : 'Auto-picks the first data store when empty'
          }
        />

        <div className="flex flex-col gap-2">
          <div className="text-small text-default-600">File</div>
          <input ref={fileInputRef} type="file" accept="image/*" />
        </div>

        <div className="flex items-center gap-3">
          <Button color="primary" isLoading={uploadStatus.kind === 'working'} onPress={onUpload}>
            Upload
          </Button>
          {uploadStatus.kind === 'ok' && (
            <div className="text-small text-success">Created dataset: {uploadStatus.dataSetPermId}</div>
          )}
          {uploadStatus.kind === 'error' && (
            <div className="flex flex-col gap-2">
              <div className="text-small text-danger">{uploadStatus.message}</div>
              <pre className="text-xs text-default-600 whitespace-pre-wrap break-words">{String(uploadStatus.details ?? '')}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
