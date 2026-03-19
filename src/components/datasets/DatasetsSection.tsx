import { useContext, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
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
import { AuthContext } from '../../context/auth/authContext'
import { splitCsvLike, toErrorInfo } from './datasetHelpers'

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
  metaData?: Record<string, string>
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

/**
 * Dataset list/table shared by multiple pages.
 *
 * It always queries datasets from the AS (`searchDataSets`). The only thing
 * that varies is how the "Download" button works:
 * - `fileListingMode='dss'` (default): use DSS `searchFiles` and download servlet
 * - `fileListingMode='afs'`: use AFS facade `list()` and `read()` based on dataset metaData
 */
export function DatasetsSection({ fileListingMode = 'dss' }: { fileListingMode?: 'dss' | 'afs' }) {
  const { apiFacade } = useContext(AuthContext)
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const rowsPerPage = 20

  const [dataStoreCodesText, setDataStoreCodesText] = useState('')
  const [dataSetCodesText, setDataSetCodesText] = useState('')
  const [dataSetTypeCodesText, setDataSetTypeCodesText] = useState('')
  const [sampleFilterIdentifiersText, setSampleFilterIdentifiersText] = useState('')

  const [downloadStatus, setDownloadStatus] = useState<
    | { kind: 'idle' }
    | { kind: 'working'; code: string }
    | { kind: 'error'; message: string; details?: string }
    | { kind: 'ok'; fileName: string }
  >({ kind: 'idle' })

  /** Formats openBIS timestamps as a short ISO-ish string for the table. */
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

  /**
   * Triggers a browser download for a blob.
   *
   * This is used by both AFS and DSS download flows.
   */
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

  const dataStoresQuery = useQuery({
    queryKey: ['as', 'searchDataStores'],
    queryFn: async () => {
      const sc = new openbis.DataStoreSearchCriteria()
      const fo = new openbis.DataStoreFetchOptions()
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

  /**
   * Downloads a representative file for a given dataset.
   *
   * "Representative" here means: prefer `original/*.png`, otherwise any png,
   * otherwise just the first regular file.
   */
  const onDownloadFileList = async (row: DataSetRow) => {
    setDownloadStatus({ kind: 'working', code: row.code })
    try {
      const downloadViaAfs = async () => {
        const meta = row.metaData ?? {}
        const owner = meta['afs.owner']
        const afsPath = meta['afs.path']

        if (!owner || !afsPath) {
          throw new Error('This dataset does not appear to be AFS-backed (missing metaData afs.owner/afs.path)')
        }

        const afsFacade = (apiFacade as any)?.getAfsServerFacade?.()
        if (!afsFacade || typeof (afsFacade as any).list !== 'function') {
          throw new Error('AFS facade is not available (getAfsServerFacade().list missing)')
        }
        if (typeof (afsFacade as any).read !== 'function') {
          throw new Error('AFS facade is missing read(owner, source, offset, limit)')
        }

        // `afs.path` points to a file. We list the parent directory to find siblings.
        const dirSource = String(afsPath).includes('/') ? String(afsPath).split('/').slice(0, -1).join('/') : ''
        const listSource = dirSource || String(afsPath)

        const files: any[] = await (afsFacade as any).list(owner, listSource, true)
        const candidates = (files ?? []).filter((f: any) => {
          const isDir = typeof f?.getDirectory === 'function' ? Boolean(f.getDirectory()) : Boolean(f?.directory)
          const p = typeof f?.getPath === 'function' ? String(f.getPath()) : String(f?.path ?? '')
          return !isDir && !!p
        })

        if (candidates.length === 0) {
          throw new Error('No files found in AFS for this dataset')
        }

        const pick =
          candidates.find((f: any) => {
            const p = typeof f?.getPath === 'function' ? String(f.getPath()) : String(f?.path ?? '')
            return p.startsWith('original/') && p.toLowerCase().endsWith('.png')
          }) ||
          candidates.find((f: any) => {
            const p = typeof f?.getPath === 'function' ? String(f.getPath()) : String(f?.path ?? '')
            return p.toLowerCase().endsWith('.png')
          }) ||
          candidates[0]

        const filePath = typeof pick?.getPath === 'function' ? String(pick.getPath()) : String(pick?.path ?? '')
        if (!filePath) throw new Error('Selected AFS file has no path')

        // If the server reports size, request exactly that many bytes.
        // Otherwise, request a reasonable limit.
        const fileSize = typeof pick?.getSize === 'function' ? Number(pick.getSize()) : Number(pick?.size ?? 0)
        const limit = Number.isFinite(fileSize) && fileSize > 0 ? fileSize : 50 * 1024 * 1024

        const blob: Blob = await (afsFacade as any).read(owner, filePath, 0, limit)

        const baseName = filePath.split('/').filter(Boolean).pop() || 'download'
        const datasetId = row.permId ?? row.code
        const safeDatasetPrefix = String(datasetId)
        const fileName = `${safeDatasetPrefix}_${baseName}`

        downloadBlobFile(fileName, blob)
        setDownloadStatus({ kind: 'ok', fileName })
      }

      const downloadViaDss = async () => {
        const directDssJsonUrl = '/datastore_server/rmi-data-store-server-v3.json'

        const dssPreferred = row.dataStore ? apiFacade.getDataStoreFacade([row.dataStore]) : apiFacade.getDataStoreFacade()
        const dssAll = apiFacade.getDataStoreFacade()

        let forceDirectDss = false

        /** Builds DSS file search criteria for a single dataset. */
        const buildCriteria = () => {
        const criteria = new openbis.DataSetFileSearchCriteria()
        const dsCriteria: any = criteria.withDataSet()
        if (row.permId) {
          dsCriteria.withPermId().thatEquals(row.permId)
        } else {
          dsCriteria.withCode().thatEquals(row.code)
        }
        return criteria
        }

        /** Fetch options for DSS file search (kept minimal). */
        const buildFetchOptions = () => new openbis.DataSetFileFetchOptions()

        /** Primary path: call DSS facade `searchFiles`. */
        const searchOnceViaFacade = async (dssFacade: any, criteria: any, fo: any) => {
          return dssFacade.searchFiles(criteria, fo)
        }

        /** Fallback path: direct JSON call to DSS (same-origin) to bypass facade quirks. */
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

        const pick =
          candidates.find(
            (f) => String(f.getPath()).startsWith('original/') && String(f.getPath()).toLowerCase().endsWith('.png')
          ) ||
          candidates.find((f) => String(f.getPath()).toLowerCase().endsWith('.png')) ||
          candidates[0]

        const filePath = String(pick.getPath())

        const datasetId = row.permId ?? row.code
        if (!datasetId) throw new Error('Dataset identifier (permId/code) is missing')

        const sessionToken = (apiFacade as any)?._private?.sessionToken
        if (!sessionToken) throw new Error('Missing openBIS session token')

        const encodedDs = encodeURIComponent(datasetId)
        const encodedPath = encodeURIComponent(filePath.replace(/^\/+/, ''))

        const downloadUrl = `/datastore_server/${encodedDs}/${encodedPath}?sessionID=${encodeURIComponent(sessionToken)}`
        const resp = await fetch(downloadUrl, { method: 'GET' })
        if (!resp.ok) {
          throw new Error(`Download failed: HTTP ${resp.status} ${resp.statusText}`)
        }

        const contentType = resp.headers.get('content-type') ?? ''
        if (/text\/html/i.test(contentType)) {
          const body = await resp.text()
          throw new Error(
            `Download returned HTML instead of a file (content-type: ${contentType}). Response starts with: ${body.slice(0, 200)}`
          )
        }

        const blob = await resp.blob()
        const baseName = filePath.split('/').filter(Boolean).pop() || 'download'
        const safeDatasetPrefix = String(datasetId)
        const fileName = `${safeDatasetPrefix}_${baseName}`
        downloadBlobFile(fileName, blob)
        setDownloadStatus({ kind: 'ok', fileName })
      }

      if (fileListingMode === 'afs') {
        await downloadViaAfs()
      } else {
        await downloadViaDss()
      }
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
    queryKey: [
      'as',
      'searchDataSets',
      {
        page,
        rowsPerPage,
        dataStoreCodesText,
        dataSetCodesText,
        dataSetTypeCodesText,
        sampleFilterIdentifiersText,
      },
    ],
    queryFn: async (): Promise<DataSetsPage> => {
      const sc = new openbis.DataSetSearchCriteria()
      const fo = new openbis.DataSetFetchOptions()

      fo.from((page - 1) * rowsPerPage)
      fo.count(rowsPerPage)

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
        const storesOr: any = root.withSubcriteria().withOrOperator()
        for (const code of dataStoreCodes) {
          storesOr.withDataStore().withCode().thatEquals(code)
        }
      }

      const requestedCodes = splitCsvLike(dataSetCodesText)
      if (requestedCodes.length > 0) {
        const codesOr: any = root.withSubcriteria().withOrOperator()
        for (const code of requestedCodes) {
          codesOr.withCode().thatEquals(code)
        }
      }

      const requestedTypeCodes = splitCsvLike(dataSetTypeCodesText)
      if (requestedTypeCodes.length > 0) {
        const typesOr: any = root.withSubcriteria().withOrOperator()
        for (const code of requestedTypeCodes) {
          typesOr.withType().withCode().thatEquals(code)
        }
      }

      const requestedSampleIdentifiers = splitCsvLike(sampleFilterIdentifiersText)
      if (requestedSampleIdentifiers.length > 0) {
        const samplesOr: any = root.withSubcriteria().withOrOperator()
        for (const identifier of requestedSampleIdentifiers) {
          samplesOr.withSample().withIdentifier().thatEquals(identifier)
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

        const metaDataRaw = safe(() => ds.getMetaData?.())
        const metaData =
          metaDataRaw && typeof metaDataRaw === 'object' && !Array.isArray(metaDataRaw)
            ? (metaDataRaw as Record<string, string>)
            : undefined

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
        const archivingStatusObj =
          physicalObj && typeof (physicalObj as any).getStatus === 'function' ? (physicalObj as any).getStatus() : undefined
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
          metaData,
        }
      })

      rows.sort((a, b) => a.code.localeCompare(b.code))
      return { totalCount: result.getTotalCount(), rows }
    },
    staleTime: 30_000,
  })

  const pageData = dataSetsQuery.data
  const pageRows = pageData?.rows ?? []
  const totalCount = pageData?.totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / rowsPerPage))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2>Datasets</h2>
          <div className="text-default-500 text-small">Showing datasets from openBIS (AS)</div>
        </div>
        <Button
          color="primary"
          variant="bordered"
          isLoading={dataSetsQuery.isFetching}
          onPress={() => {
            dataStoresQuery.refetch()
            dataSetsQuery.refetch()
            queryClient.invalidateQueries({ queryKey: ['as', 'searchDataSets'] })
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
          label="Dataset types (optional)"
          placeholder="ELN_PREVIEW, MY_TYPE"
          value={dataSetTypeCodesText}
          onValueChange={(v) => {
            setDataSetTypeCodesText(v)
            setPage(1)
          }}
          description="Filters by dataset type code"
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
        <Input
          label="Sample identifiers (optional)"
          placeholder="/SPACE/PROJECT/SAMPLE"
          value={sampleFilterIdentifiersText}
          onValueChange={(v) => {
            setSampleFilterIdentifiersText(v)
            setPage(1)
          }}
          description="Filters by linked sample identifier(s)"
        />
      </div>

      <div className="text-small text-default-500">
        Data stores (AS):{' '}
        {dataStoresQuery.isLoading
          ? 'loading…'
          : dataStoresQuery.isError
            ? `error: ${toErrorInfo(dataStoresQuery.error).summary}`
            : `${dataStoresQuery.data?.totalCount ?? 0}${
                (dataStoresQuery.data?.codes?.length ?? 0) > 0 ? ` (${dataStoresQuery.data?.codes?.join(', ')})` : ''
              }`}
      </div>

      {downloadStatus.kind === 'error' && (
        <div className="flex flex-col gap-2">
          <div className="text-small text-danger">Download failed: {downloadStatus.message}</div>
          <pre className="text-xs text-default-600 whitespace-pre-wrap break-words">{String(downloadStatus.details ?? '')}</pre>
        </div>
      )}
      {downloadStatus.kind === 'ok' && <div className="text-small text-success">Downloaded: {downloadStatus.fileName}</div>}

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
            <Pagination isCompact showControls showShadow color="primary" page={page} total={totalPages} onChange={setPage} />
          </div>
        }
        bottomContentPlacement="outside"
        classNames={{ wrapper: 'max-h-[520px]' }}
        style={{ border: '1px solid #E0E0E0', borderRadius: '8px' }}
      >
        <TableHeader>
          <TableColumn key="actions" align="end">Download</TableColumn>
          <TableColumn key="code">Code</TableColumn>
          <TableColumn key="permId">PermId</TableColumn>
          <TableColumn key="type">Type</TableColumn>
          <TableColumn key="ds">Data store</TableColumn>
          <TableColumn key="kind">Kind</TableColumn>
          <TableColumn key="reg">Registered</TableColumn>
          <TableColumn key="mod">Modified</TableColumn>
          <TableColumn key="exp">Experiment</TableColumn>
          <TableColumn key="sample">Sample</TableColumn>
          <TableColumn key="size" align="end">Size</TableColumn>
          <TableColumn key="share">Share</TableColumn>
          <TableColumn key="loc">Location</TableColumn>
          <TableColumn key="arch">Archive</TableColumn>
          <TableColumn key="regBy">Registrator</TableColumn>
          <TableColumn key="modBy">Modifier</TableColumn>
        </TableHeader>
        <TableBody emptyContent={dataSetsQuery.isLoading ? 'Loading…' : dataSetsQuery.isError ? 'Failed to load.' : 'No datasets found'}>
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
    </div>
  )
}
