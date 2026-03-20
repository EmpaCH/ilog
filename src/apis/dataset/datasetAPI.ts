/* eslint-disable @typescript-eslint/no-explicit-any */

import openbis from '@openbis/openbis.esm'
import {
  AfsChunk,
  AfsListEntry,
  AfsListParams,
  DataSetRow,
  DataSetsPage,
  DataSetSearchParams,
  DataStoresResult,
  DataStoreInfo,
  DatasetFileListingMode,
  DatasetTypeItem,
  DownloadAfsEntryInput,
  DownloadedFileResult,
  DssUploadDataSetInput,
  UploadAfsDataSetInput,
  UploadAfsDataSetResult,
  UploadAfsDummyFileInput,
} from './commonDataset'
import {
  decodeAfsChunksFromBytes,
  downloadBlobFile,
  encodeAfsChunksAsBytes,
  generateUploadId,
  parseAfsApiResponse,
  parseAfsListOctetStream,
  safeGet,
  splitCsvLike,
} from './helpersDatasetAPI'

const AFS_API_PATH = '/afs-server/api'
const DSS_JSON_API_PATH = '/datastore_server/rmi-data-store-server-v3.json'
const DSS_UPLOAD_CHUNK_SIZE = 1024 * 1024
const DEFAULT_DOWNLOAD_LIMIT = 50 * 1024 * 1024

function getSessionToken(apiFacade: any): string {
  const sessionToken = apiFacade?._private?.sessionToken
  if (!sessionToken) {
    throw new Error('Missing openBIS session token (please log in again)')
  }
  return sessionToken
}

function getAjaxRequest(apiFacade: any) {
  const ajaxRequest = apiFacade?._private?.ajaxRequest
  if (!ajaxRequest) {
    throw new Error('openBIS client cannot access internal ajaxRequest for direct DSS call')
  }
  return ajaxRequest
}

function mapDataSetTypeItem(type: any): DatasetTypeItem | null {
  const code = typeof type?.getCode === 'function' ? String(type.getCode()) : String(type?.code ?? '')
  return code ? { key: code, code } : null
}

function mapDataStoreInfo(store: any): DataStoreInfo | null {
  const code = typeof store?.getCode === 'function' ? String(store.getCode()) : String(store?.code ?? '')
  if (!code) return null

  return {
    code,
    downloadUrl: safeGet(() => (typeof store?.getDownloadUrl === 'function' ? String(store.getDownloadUrl()) : undefined)),
    remoteUrl: safeGet(() => (typeof store?.getRemoteUrl === 'function' ? String(store.getRemoteUrl()) : undefined)),
  }
}

function mapDataSetRow(dataSet: any): DataSetRow {
  const permIdValue = typeof dataSet?.getPermId === 'function' ? dataSet.getPermId() : dataSet?.permId
  const typeValue = typeof dataSet?.getType === 'function' ? dataSet.getType() : dataSet?.type
  const dataStoreValue = typeof dataSet?.getDataStore === 'function' ? dataSet.getDataStore() : dataSet?.dataStore
  const physicalData = safeGet(() => dataSet.getPhysicalData?.())
  const metaData = safeGet(() => dataSet.getMetaData?.())
  const size = physicalData && typeof physicalData?.getSize === 'function' ? Number(physicalData.getSize()) : undefined

  return {
    code: typeof dataSet?.getCode === 'function' ? String(dataSet.getCode()) : String(dataSet?.code ?? ''),
    permId:
      typeof permIdValue?.getPermId === 'function'
        ? String(permIdValue.getPermId())
        : permIdValue
          ? String(permIdValue)
          : undefined,
    type:
      typeof typeValue?.getCode === 'function'
        ? String(typeValue.getCode())
        : typeValue?.code
          ? String(typeValue.code)
          : undefined,
    dataStore:
      typeof dataStoreValue?.getCode === 'function'
        ? String(dataStoreValue.getCode())
        : dataStoreValue?.code
          ? String(dataStoreValue.code)
          : undefined,
    registrationDate: safeGet(() => dataSet.getRegistrationDate?.()),
    modificationDate: safeGet(() => dataSet.getModificationDate?.()),
    kind: safeGet(() => {
      const kind = dataSet.getKind?.()
      return kind != null ? String(kind) : undefined
    }),
    experiment: safeGet(() => {
      const experiment = dataSet.getExperiment?.()
      return experiment && typeof experiment.getIdentifier === 'function' ? String(experiment.getIdentifier()) : undefined
    }),
    sample: safeGet(() => {
      const sample = dataSet.getSample?.()
      return sample && typeof sample.getIdentifier === 'function' ? String(sample.getIdentifier()) : undefined
    }),
    registrator: safeGet(() => {
      const registrator = dataSet.getRegistrator?.()
      return registrator && typeof registrator.getUserId === 'function' ? String(registrator.getUserId()) : undefined
    }),
    modifier: safeGet(() => {
      const modifier = dataSet.getModifier?.()
      return modifier && typeof modifier.getUserId === 'function' ? String(modifier.getUserId()) : undefined
    }),
    size: Number.isFinite(size as number) ? size : undefined,
    location: physicalData && typeof physicalData?.getLocation === 'function' ? String(physicalData.getLocation()) : undefined,
    shareId: physicalData && typeof physicalData?.getShareId === 'function' ? String(physicalData.getShareId()) : undefined,
    archivingStatus:
      physicalData && typeof physicalData?.getStatus === 'function' ? String(physicalData.getStatus()) : undefined,
    metaData: metaData && typeof metaData === 'object' && !Array.isArray(metaData) ? (metaData as Record<string, string>) : undefined,
  }
}

function buildDataSetSearchCriteria(filters: DataSetSearchParams) {
  const criteria = new openbis.DataSetSearchCriteria()
  const root = criteria.withAndOperator()
  const dataStoreCodes = splitCsvLike(filters.dataStoreCodesText)
  const dataSetCodes = splitCsvLike(filters.dataSetCodesText)
  const dataSetTypeCodes = splitCsvLike(filters.dataSetTypeCodesText)
  const sampleIdentifiers = splitCsvLike(filters.sampleFilterIdentifiersText)

  if (dataStoreCodes.length > 0) {
    const storesOr: any = root.withSubcriteria().withOrOperator()
    for (const code of dataStoreCodes) {
      storesOr.withDataStore().withCode().thatEquals(code)
    }
  }

  if (dataSetCodes.length > 0) {
    const codesOr: any = root.withSubcriteria().withOrOperator()
    for (const code of dataSetCodes) {
      codesOr.withCode().thatEquals(code)
    }
  }

  if (dataSetTypeCodes.length > 0) {
    const typesOr: any = root.withSubcriteria().withOrOperator()
    for (const code of dataSetTypeCodes) {
      typesOr.withType().withCode().thatEquals(code)
    }
  }

  if (sampleIdentifiers.length > 0) {
    const samplesOr: any = root.withSubcriteria().withOrOperator()
    for (const identifier of sampleIdentifiers) {
      samplesOr.withSample().withIdentifier().thatEquals(identifier)
    }
  }

  return criteria
}

function buildDataSetFetchOptions(filters: DataSetSearchParams) {
  const fetchOptions = new openbis.DataSetFetchOptions()
  fetchOptions.from((filters.page - 1) * filters.rowsPerPage)
  fetchOptions.count(filters.rowsPerPage)
  fetchOptions.withType()
  fetchOptions.withDataStore()
  fetchOptions.withExperiment()
  fetchOptions.withSample()
  fetchOptions.withRegistrator()
  fetchOptions.withModifier()
  fetchOptions.withPhysicalData()
  return fetchOptions
}

function pickPreferredAfsEntry(entries: AfsListEntry[]): AfsListEntry {
  return (
    entries.find((entry) => entry.path.startsWith('original/') && entry.path.toLowerCase().endsWith('.png')) ||
    entries.find((entry) => entry.path.toLowerCase().endsWith('.png')) ||
    entries[0]
  )
}

function pickPreferredDataSetFile(files: any[]) {
  return (
    files.find((file) => String(file.getPath()).startsWith('original/') && String(file.getPath()).toLowerCase().endsWith('.png')) ||
    files.find((file) => String(file.getPath()).toLowerCase().endsWith('.png')) ||
    files[0]
  )
}

function resolveAfsOwner(input: Pick<UploadAfsDummyFileInput, 'experimentIdentifier' | 'sampleIdentifier' | 'samplePermId' | 'afsOwnerText'>) {
  return input.afsOwnerText.trim() || input.samplePermId.trim() || input.experimentIdentifier.trim() || input.sampleIdentifier.trim()
}

async function searchDataSetFilesDirect(apiFacade: any, row: DataSetRow) {
  const ajaxRequest = getAjaxRequest(apiFacade)
  const sessionToken = getSessionToken(apiFacade)

  const criteria = new openbis.DataSetFileSearchCriteria()
  const dataSetCriteria: any = criteria.withDataSet()
  if (row.permId) {
    dataSetCriteria.withPermId().thatEquals(row.permId)
  } else {
    dataSetCriteria.withCode().thatEquals(row.code)
  }

  const fetchOptions = new openbis.DataSetFileFetchOptions()
  const result = await ajaxRequest({
    url: DSS_JSON_API_PATH,
    data: {
      method: 'searchFiles',
      params: [sessionToken, criteria, fetchOptions],
    },
    returnType: 'SearchResult',
  })

  return result.getObjects()
}

async function readAfsFileBlob(apiFacade: any, owner: string, source: string, offset: number, limit: number): Promise<Blob> {
  const sessionToken = getSessionToken(apiFacade)
  const url = new URL(AFS_API_PATH, window.location.origin)
  url.search = new URLSearchParams({ method: 'read', sessionToken }).toString()

  const requestBytes = encodeAfsChunksAsBytes([
    { owner, source, offset, limit, data: new Uint8Array() },
  ])

  const requestBody = requestBytes.buffer.slice(
    requestBytes.byteOffset,
    requestBytes.byteOffset + requestBytes.byteLength,
  ) as ArrayBuffer

  const response = await fetch(url.toString(), { method: 'POST', body: requestBody })
  if (!response.ok) {
    const bodyText = await response.text().catch(() => '')
    throw new Error(`AFS download failed (HTTP ${response.status}): ${bodyText.slice(0, 500) || response.statusText}`)
  }

  const chunks = decodeAfsChunksFromBytes(new Uint8Array(await response.arrayBuffer()))
  const parts = chunks
    .map((chunk) => chunk.data)
    .filter((chunkData): chunkData is Uint8Array => chunkData instanceof Uint8Array)
    .map((chunkData) =>
      chunkData.buffer.slice(chunkData.byteOffset, chunkData.byteOffset + chunkData.byteLength) as ArrayBuffer,
    )

  return new Blob(parts)
}

async function writeAfsFile(apiFacade: any, chunk: AfsChunk) {
  const sessionToken = getSessionToken(apiFacade)
  const url = new URL(AFS_API_PATH, window.location.origin)
  url.search = new URLSearchParams({ method: 'write', sessionToken }).toString()

  const bodyBytes = encodeAfsChunksAsBytes([chunk])
  const body = bodyBytes.buffer.slice(bodyBytes.byteOffset, bodyBytes.byteOffset + bodyBytes.byteLength) as ArrayBuffer
  const response = await fetch(url.toString(), { method: 'POST', body })

  if ((await parseAfsApiResponse(response)) !== true) {
    throw new Error('AFS write returned a non-true result')
  }
}

async function moveAfsFile(apiFacade: any, owner: string, source: string, target: string) {
  const sessionToken = getSessionToken(apiFacade)
  const response = await fetch(new URL(AFS_API_PATH, window.location.origin).toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: new URLSearchParams({
      method: 'move',
      sourceOwner: owner,
      source,
      targetOwner: owner,
      target,
      sessionToken,
    }).toString(),
  })

  if ((await parseAfsApiResponse(response)) !== true) {
    throw new Error('AFS move returned a non-true result')
  }
}

async function uploadFilesToDssWorkspace(apiFacade: any, uploadId: string, files: File[]) {
  const sessionToken = getSessionToken(apiFacade)

  for (const file of files) {
    const relativeName = file.webkitRelativePath || file.name
    const encodedFileName = encodeURIComponent(`${uploadId}/${relativeName}`)

    for (let startByte = 0; startByte < file.size; startByte += DSS_UPLOAD_CHUNK_SIZE) {
      const endByte = Math.min(startByte + DSS_UPLOAD_CHUNK_SIZE, file.size)
      const uploadUrl =
        `/datastore_server/session_workspace_file_upload` +
        `?sessionID=${encodeURIComponent(sessionToken)}` +
        `&filename=${encodedFileName}` +
        `&id=1` +
        `&startByte=${startByte}` +
        `&endByte=${endByte}` +
        `&size=${file.size}` +
        `&emptyFolder=false`

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: file.slice(startByte, endByte),
      })

      if (!response.ok) {
        const bodyText = await response.text().catch(() => '')
        throw new Error(`DSS upload failed (${relativeName}): HTTP ${response.status} ${response.statusText}. ${bodyText}`)
      }
    }
  }
}

export async function getDataSetTypes(apiFacade: any): Promise<DatasetTypeItem[]> {
  const searchCriteria = new openbis.DataSetTypeSearchCriteria()
  const fetchOptions = new openbis.DataSetTypeFetchOptions()
  fetchOptions.from(0)
  fetchOptions.count(200)

  const result = await apiFacade.searchDataSetTypes(searchCriteria, fetchOptions)
  return result.getObjects()
    .map(mapDataSetTypeItem)
    .filter((item): item is DatasetTypeItem => item != null)
    .sort((left, right) => left.code.localeCompare(right.code, undefined, { numeric: true }))
}

export async function getDataStores(apiFacade: any): Promise<DataStoresResult> {
  const searchCriteria = new openbis.DataStoreSearchCriteria()
  const fetchOptions = new openbis.DataStoreFetchOptions()
  fetchOptions.from(0)
  fetchOptions.count(50)

  const result = await apiFacade.searchDataStores(searchCriteria, fetchOptions)
  const stores = result.getObjects().map(mapDataStoreInfo).filter(Boolean) as DataStoreInfo[]

  return {
    totalCount: result.getTotalCount(),
    codes: stores.map((store) => store.code),
    stores,
  }
}

export async function searchDataSets(apiFacade: any, filters: DataSetSearchParams): Promise<DataSetsPage> {
  const result = await apiFacade.searchDataSets(buildDataSetSearchCriteria(filters), buildDataSetFetchOptions(filters))
  const rows = result.getObjects().map(mapDataSetRow).sort((left: DataSetRow, right: DataSetRow) => left.code.localeCompare(right.code))

  return { rows, totalCount: result.getTotalCount() }
}

export async function downloadDataSetFile(
  apiFacade: any,
  row: DataSetRow,
  fileListingMode: DatasetFileListingMode,
): Promise<DownloadedFileResult> {
  if (fileListingMode === 'afs') {
    const owner = row.metaData?.['afs.owner']
    const afsPath = row.metaData?.['afs.path']
    if (!owner || !afsPath) {
      throw new Error('This dataset does not appear to be AFS-backed (missing metaData afs.owner/afs.path)')
    }

    const listSource = afsPath.includes('/') ? afsPath.split('/').slice(0, -1).join('/') || afsPath : afsPath
    const files = await listAfsEntries(apiFacade, { owner, source: listSource, recursively: true })
    const candidates = files.filter((entry) => !entry.directory)
    if (candidates.length === 0) {
      throw new Error('No files found in AFS for this dataset')
    }

    const picked = pickPreferredAfsEntry(candidates)
    const limit = Number.isFinite(picked.size) && Number(picked.size) > 0 ? Number(picked.size) : DEFAULT_DOWNLOAD_LIMIT
    const blob = await readAfsFileBlob(apiFacade, owner, picked.path, 0, limit)
    const fileName = `${String(row.permId ?? row.code)}_${picked.path.split('/').filter(Boolean).pop() || 'download'}`
    downloadBlobFile(fileName, blob)
    return { fileName }
  }

  const files = (await searchDataSetFilesDirect(apiFacade, row)).filter((file: any) => !file.isDirectory() && !!file.getPath())
  if (files.length === 0) {
    throw new Error('No downloadable files found in this dataset')
  }

  const picked = pickPreferredDataSetFile(files)
  const filePath = String(picked.getPath())
  const datasetId = row.permId ?? row.code
  if (!datasetId) {
    throw new Error('Dataset identifier (permId/code) is missing')
  }

  const sessionToken = getSessionToken(apiFacade)
  const response = await fetch(
    `/datastore_server/${encodeURIComponent(datasetId)}/${encodeURIComponent(filePath.replace(/^\/+/, ''))}?sessionID=${encodeURIComponent(sessionToken)}`,
    { method: 'GET' },
  )

  if (!response.ok) {
    throw new Error(`Download failed: HTTP ${response.status} ${response.statusText}`)
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (/text\/html/i.test(contentType)) {
    const body = await response.text()
    throw new Error(`Download returned HTML instead of a file (content-type: ${contentType}). Response starts with: ${body.slice(0, 200)}`)
  }

  const fileName = `${String(datasetId)}_${filePath.split('/').filter(Boolean).pop() || 'download'}`
  downloadBlobFile(fileName, await response.blob())
  return { fileName }
}

export async function listAfsEntries(apiFacade: any, params: AfsListParams): Promise<AfsListEntry[]> {
  if (!params.owner.trim()) return []

  const sessionToken = getSessionToken(apiFacade)
  const url = new URL(AFS_API_PATH, window.location.origin)
  url.search = new URLSearchParams({
    method: 'list',
    owner: params.owner.trim(),
    source: params.source,
    recursively: String(Boolean(params.recursively)),
    sessionToken,
  }).toString()

  const response = await fetch(url.toString(), { method: 'GET', cache: 'no-store' })
  const bodyText = await response.text().catch(() => '')
  if (!response.ok) {
    throw new Error(`AFS list failed (HTTP ${response.status}): ${bodyText.slice(0, 500)}`)
  }

  return parseAfsListOctetStream(bodyText)
}

export async function downloadAfsEntry(apiFacade: any, input: DownloadAfsEntryInput): Promise<DownloadedFileResult> {
  if (input.entry.directory) {
    throw new Error('Directories cannot be downloaded from the AFS file list')
  }

  if (!input.owner.trim()) {
    throw new Error('Missing AFS owner for download. Please list the folder again.')
  }

  const limit = Number.isFinite(input.entry.size) && Number(input.entry.size) > 0 ? Number(input.entry.size) : DEFAULT_DOWNLOAD_LIMIT
  const blob = await readAfsFileBlob(apiFacade, input.owner.trim(), input.entry.path, 0, limit)
  const fileName = input.entry.name || input.entry.path.split('/').filter(Boolean).pop() || 'download'
  downloadBlobFile(fileName, blob)
  return { fileName }
}

export async function uploadDssDataSet(apiFacade: any, input: DssUploadDataSetInput): Promise<string> {
  const files = Array.from(input.files ?? [])
  if (files.length === 0) {
    throw new Error('Please choose a file to upload.')
  }

  const experimentIdentifier = input.experimentIdentifier.trim()
  const sampleIdentifier = input.sampleIdentifier.trim()
  const dataSetTypeCode = input.dataSetTypeCode.trim()
  if (!experimentIdentifier && !sampleIdentifier) {
    throw new Error('Please set an experiment and/or sample identifier.')
  }
  if (!dataSetTypeCode) {
    throw new Error('Please set a dataset type code.')
  }

  const uploadId = generateUploadId('upload')
  await uploadFilesToDssWorkspace(apiFacade, uploadId, files)

  const sessionToken = getSessionToken(apiFacade)
  const ajaxRequest = getAjaxRequest(apiFacade)
  const creation = new openbis.UploadedDataSetCreation()
  creation.setUploadId(uploadId)
  if (experimentIdentifier) {
    creation.setExperimentId(new openbis.ExperimentIdentifier(experimentIdentifier))
  }
  if (sampleIdentifier) {
    creation.setSampleId(new openbis.SampleIdentifier(sampleIdentifier))
  }
  creation.setTypeId(new openbis.EntityTypePermId(dataSetTypeCode, openbis.EntityKind.DATA_SET))

  const createdPermId = await ajaxRequest({
    url: DSS_JSON_API_PATH,
    data: {
      method: 'createUploadedDataSet',
      params: [sessionToken, creation],
    },
    returnType: { name: 'DataSetPermId' },
  })

  return typeof createdPermId?.getPermId === 'function' ? String(createdPermId.getPermId()) : String(createdPermId)
}

export async function uploadAfsDummyFile(apiFacade: any, input: UploadAfsDummyFileInput): Promise<{ afsPath: string }> {
  const owner = resolveAfsOwner(input)
  if (!owner) {
    throw new Error('Dummy upload requires an Experiment or Sample to use as the AFS owner.')
  }

  const now = new Date()
  const afsPath = `/${`dummy-${now.toISOString().replace(/[:.]/g, '-')}.txt`}`
  const partPath = `${afsPath}.part`
  const bytes = new TextEncoder().encode(`dummy\n${now.toISOString()}\n`)

  await writeAfsFile(apiFacade, {
    owner,
    source: partPath,
    offset: 0,
    limit: bytes.length,
    data: bytes,
  })
  await moveAfsFile(apiFacade, owner, partPath, afsPath)

  return { afsPath }
}

export async function uploadAfsDataSet(apiFacade: any, input: UploadAfsDataSetInput): Promise<UploadAfsDataSetResult> {
  if (!input.file) {
    throw new Error('Please choose a file to upload.')
  }

  const owner = resolveAfsOwner(input)
  if (!owner) {
    throw new Error('AFS upload requires an Experiment, Sample, or explicit AFS owner.')
  }

  const relativeName = input.file.webkitRelativePath || input.file.name
  const afsPath = `/${generateUploadId('upload')}-${String(relativeName).split('/').filter(Boolean).join('_')}`
  const partPath = `${afsPath}.part`
  const fileBytes = new Uint8Array(await input.file.arrayBuffer())

  await writeAfsFile(apiFacade, {
    owner,
    source: partPath,
    offset: 0,
    limit: fileBytes.length,
    data: fileBytes,
  })
  await moveAfsFile(apiFacade, owner, partPath, afsPath)

  return { afsPath }
}