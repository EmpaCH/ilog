/* eslint-disable @typescript-eslint/no-explicit-any */

import openbis from '@openbis/openbis.esm'
import {
  DataSetRow,
  DataSetsPage,
  DataSetSearchParams,
  DataStoresResult,
  DataStoreInfo,
  DatasetFileListingMode,
  DatasetTypeItem,
  DownloadedFileResult,
  DssUploadDataSetInput,
} from './commonDataset'
import {
  downloadBlobFile,
  generateUploadId,
  safeGet,
  splitCsvLike,
} from './helpersDatasetAPI'
import {
  listAfsEntries,
  readAfsFileBlob,
  pickPreferredAfsEntry,
} from './afsDatasetAPI'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DSS_JSON_API_PATH = '/datastore_server/rmi-data-store-server-v3.json'
const DSS_UPLOAD_CHUNK_SIZE = 1024 * 1024
const DEFAULT_DOWNLOAD_LIMIT = 50 * 1024 * 1024

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Extract session token from the openBIS facade. */
function getSessionToken(apiFacade: any): string {
  const sessionToken = apiFacade?._private?.sessionToken
  if (!sessionToken) {
    throw new Error('Missing openBIS session token (please log in again)')
  }
  return sessionToken
}

/** Get the internal ajaxRequest function from the facade (used for direct DSS JSON-RPC calls). */
function getAjaxRequest(apiFacade: any) {
  const ajaxRequest = apiFacade?._private?.ajaxRequest
  if (!ajaxRequest) {
    throw new Error('openBIS client cannot access internal ajaxRequest for direct DSS call')
  }
  return ajaxRequest
}

/** Map an openBIS DataSetType object to a plain {key, code} item. */
function mapDataSetTypeItem(type: any): DatasetTypeItem | null {
  const code = typeof type?.getCode === 'function' ? String(type.getCode()) : String(type?.code ?? '')
  return code ? { key: code, code } : null
}

/** Map an openBIS DataStore object to a plain DataStoreInfo. */
function mapDataStoreInfo(store: any): DataStoreInfo | null {
  const code = typeof store?.getCode === 'function' ? String(store.getCode()) : String(store?.code ?? '')
  if (!code) return null

  return {
    code,
    downloadUrl: safeGet(() => (typeof store?.getDownloadUrl === 'function' ? String(store.getDownloadUrl()) : undefined)),
    remoteUrl: safeGet(() => (typeof store?.getRemoteUrl === 'function' ? String(store.getRemoteUrl()) : undefined)),
  }
}

/** Map an openBIS DataSet object to a flat DataSetRow for display. */
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

/** Build search criteria from user-supplied filter strings. */
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

/** Build paginated fetch options with all relevant sub-fetches enabled. */
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

/** Pick the best file from a DSS file listing (prefers original/*.png). */
function pickPreferredDataSetFile(files: any[]) {
  return (
    files.find((file) => String(file.getPath()).startsWith('original/') && String(file.getPath()).toLowerCase().endsWith('.png')) ||
    files.find((file) => String(file.getPath()).toLowerCase().endsWith('.png')) ||
    files[0]
  )
}

/** List files inside a dataset via the DSS searchFiles JSON-RPC endpoint. */
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

/** Upload one or more files to the DSS session workspace in chunks. */
async function uploadFilesToDssWorkspace(apiFacade: any, uploadId: string, files: File[]) {
  const sessionToken = getSessionToken(apiFacade)

  for (const file of files) {
    const relativeName = file.webkitRelativePath || file.name
    const encodedFileName = encodeURIComponent(uploadId + '/' + relativeName)

    for (let startByte = 0; startByte < file.size; startByte += DSS_UPLOAD_CHUNK_SIZE) {
      const endByte = Math.min(startByte + DSS_UPLOAD_CHUNK_SIZE, file.size)
      const uploadUrl =
        '/datastore_server/session_workspace_file_upload' +
        '?sessionID=' + encodeURIComponent(sessionToken) +
        '&filename=' + encodedFileName +
        '&id=1' +
        '&startByte=' + startByte +
        '&endByte=' + endByte +
        '&size=' + file.size +
        '&emptyFolder=false'

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: file.slice(startByte, endByte),
      })

      if (!response.ok) {
        const bodyText = await response.text().catch(() => '')
        throw new Error('DSS upload failed (' + relativeName + '): HTTP ' + response.status + ' ' + response.statusText + '. ' + bodyText)
      }
    }
  }
}

/** Try to find the image filename inside a dataset via the DSS listFilesForDataSet endpoint. */
async function getImageFilenameViaAPI(
  api: openbis.OpenBISJavaScriptFacade,
  datasetPermId: string,
): Promise<string | null> {
  try {
    const priv = (api as any)?._private
    if (!priv?.ajaxRequest || !priv?.sessionToken) {
      return null
    }

    let result: any
    try {
      result = await priv.ajaxRequest({
        url: '/datastore_server/rmi-dss-api-v1.json',
        data: {
          method: 'listFilesForDataSet',
          params: [priv.sessionToken, datasetPermId, '/', true],
        },
      })
    } catch {
      const response = await fetch('/datastore_server/rmi-dss-api-v1.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'listFilesForDataSet',
          params: [priv.sessionToken, datasetPermId, '/', true],
          id: '1',
          jsonrpc: '2.0',
        }),
      })

      if (!response.ok) {
        throw new Error('DSS API failed: ' + response.status)
      }

      const json = await response.json()
      result = json.result
    }

    if (!result || !Array.isArray(result)) return null

    const imageFile = result.find((file: any) => {
      const isDir = typeof file.isDirectory === 'function' ? file.isDirectory() : file.isDirectory
      if (isDir) return false
      const path = file.pathInDataSet || file.pathInListing || ''
      return /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(path)
    })

    if (imageFile) {
      const filename = imageFile.pathInDataSet || imageFile.pathInListing
      const lastSlash = filename.lastIndexOf('/')
      return lastSlash >= 0 ? filename.substring(lastSlash + 1) : filename
    }
    return null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Exported DSS functions
// ---------------------------------------------------------------------------

/** Upload a file as an ELN_PREVIEW dataset attached to a sample (replaces existing previews). */
export async function uploadFileAsDataset(
  api: openbis.OpenBISJavaScriptFacade,
  samplePermId: string,
  file: File,
  datasetTypeCode: string = 'ELN_PREVIEW',
): Promise<string> {
  try {
    if (datasetTypeCode !== 'ELN_PREVIEW') {
      datasetTypeCode = 'ELN_PREVIEW'
    }

    const existingDatasets = await getSampleDatasets(api, samplePermId)
    const existingPreviews = existingDatasets.filter((ds) => ds.getType()?.getCode() === 'ELN_PREVIEW')

    if (existingPreviews.length > 0) {
      for (const dataset of existingPreviews) {
        try {
          await deleteDataset(api, dataset.getPermId().getPermId())
        } catch (deleteError) {
          console.warn('Failed to delete dataset ' + dataset.getPermId().getPermId() + ':', deleteError)
        }
      }
    }

    const sessionToken = (api as any)?._private?.sessionToken
    if (!sessionToken) {
      throw new Error('No session token available')
    }

    const makeUploadId = () => {
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
      return 'upload-' + ts + '-' + rand
    }

    const uploadFileToSessionWorkspace = async (uploadId: string, file: File) => {
      const chunkSize = 1024 * 1024
      const relativeName = file.webkitRelativePath || file.name
      const filenameParam = encodeURIComponent(uploadId + '/' + relativeName)
      const size = file.size

      for (let startByte = 0; startByte < size; startByte += chunkSize) {
        const endByte = Math.min(startByte + chunkSize, size)
        const url =
          '/datastore_server/session_workspace_file_upload' +
          '?sessionID=' + encodeURIComponent(sessionToken) +
          '&filename=' + filenameParam +
          '&id=1' +
          '&startByte=' + startByte +
          '&endByte=' + endByte +
          '&size=' + size +
          '&emptyFolder=false'

        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: file.slice(startByte, endByte),
        })

        if (!resp.ok) {
          const body = await resp.text().catch(() => '')
          throw new Error('DSS upload failed (' + relativeName + '): HTTP ' + resp.status + ' ' + resp.statusText + '. ' + body)
        }
      }
    }

    const createUploadedDataSetDirect = async (creation: openbis.UploadedDataSetCreation) => {
      const priv = (api as any)?._private
      if (!priv?.ajaxRequest) {
        throw new Error('openBIS client cannot access internal ajaxRequest for direct DSS call')
      }

      return priv.ajaxRequest({
        url: '/datastore_server/rmi-data-store-server-v3.json',
        data: {
          method: 'createUploadedDataSet',
          params: [sessionToken, creation],
        },
        returnType: { name: 'DataSetPermId' },
      })
    }

    const uploadId = makeUploadId()
    await uploadFileToSessionWorkspace(uploadId, file)

    const datasetCreation = new openbis.UploadedDataSetCreation()
    datasetCreation.setUploadId(uploadId)
    datasetCreation.setTypeId(new openbis.EntityTypePermId(datasetTypeCode.trim(), openbis.EntityKind.DATA_SET))
    datasetCreation.setSampleId(new openbis.SamplePermId(samplePermId))

    const createdPermId = await createUploadedDataSetDirect(datasetCreation)
    return typeof (createdPermId as any)?.getPermId === 'function'
      ? String((createdPermId as any).getPermId())
      : String(createdPermId)
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    if (error && typeof error === 'object' && 'message' in error) {
      console.error('openBIS error details:', error)
    }
    throw new Error('Dataset upload failed: ' + (error instanceof Error ? error.message : String(error)))
  }
}

/** Fetch all datasets attached to a sample. */
export async function getSampleDatasets(
  api: openbis.OpenBISJavaScriptFacade,
  samplePermId: string,
): Promise<openbis.DataSet[]> {
  const sc = new openbis.DataSetSearchCriteria()
  const fo = new openbis.DataSetFetchOptions()
  sc.withSample().withPermId().thatEquals(samplePermId)
  fo.withType()
  fo.withSample()

  const result = await api.searchDataSets(sc, fo)
  return result.getObjects()
}

/** Get the image filename from an ELN_PREVIEW dataset (tries DSS API, then physical metadata). */
export async function getDatasetImageFilenameFromObject(
  dataset: openbis.DataSet,
  api?: openbis.OpenBISJavaScriptFacade,
): Promise<string | null> {
  try {
    const datasetPermId = dataset.getPermId().getPermId()

    if (api) {
      const apiFilename = await getImageFilenameViaAPI(api, datasetPermId)
      if (apiFilename) return apiFilename
    }

    try {
      const physicalData = dataset.getPhysicalData?.()
      if (physicalData) {
        const files = physicalData.getFiles?.()
        if (files && files.length > 0) {
          const imageFile = files.find((file: any) => {
            const path = file.getRelativePath?.() || file.getPath?.()
            return path && /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(path)
          })
          if (imageFile) {
            return imageFile.getRelativePath?.() || imageFile.getPath?.()
          }
        }
      }
    } catch (innerError) {
      console.log('Could not access physical data:', (innerError as Error).message)
    }
    return null
  } catch {
    return null
  }
}

/** Build a download URL for a dataset file from the DSS file store. */
export async function getDatasetFileDownloadUrl(
  api: openbis.OpenBISJavaScriptFacade,
  datasetPermId: string,
  _filePath?: string,
): Promise<string> {
  const baseUrl = (api as any)._private?.url || ''
  return baseUrl +
    '/datastore_server/store_share_file_download?sessionID=' +
    (api as any)._private?.sessionToken +
    '&method=getDataSetFilesFromStore&dataSetCode=' + datasetPermId
}

/** Delete a dataset by permId. */
export async function deleteDataset(
  api: openbis.OpenBISJavaScriptFacade,
  datasetPermId: string,
): Promise<void> {
  const deletionOptions = new openbis.DataSetDeletionOptions()
  deletionOptions.setReason('Image removed by user')
  await api.deleteDataSets([new openbis.DataSetPermId(datasetPermId)], deletionOptions)
}

/** Fetch all available dataset types, sorted by code. */
export async function getDataSetTypes(apiFacade: any): Promise<DatasetTypeItem[]> {
  const searchCriteria = new openbis.DataSetTypeSearchCriteria()
  const fetchOptions = new openbis.DataSetTypeFetchOptions()
  fetchOptions.from(0)
  fetchOptions.count(200)

  const result = await apiFacade.searchDataSetTypes(searchCriteria, fetchOptions)
  return result
    .getObjects()
    .map(mapDataSetTypeItem)
    .filter((item: DatasetTypeItem | null): item is DatasetTypeItem => item != null)
    .sort((left: DatasetTypeItem, right: DatasetTypeItem) => left.code.localeCompare(right.code, undefined, { numeric: true }))
}

/** Fetch all available data stores. */
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

/** Search datasets with pagination and filters, returning a page of flat rows. */
export async function searchDataSets(apiFacade: any, filters: DataSetSearchParams): Promise<DataSetsPage> {
  const result = await apiFacade.searchDataSets(buildDataSetSearchCriteria(filters), buildDataSetFetchOptions(filters))
  const rows = result
    .getObjects()
    .map(mapDataSetRow)
    .sort((left: DataSetRow, right: DataSetRow) => left.code.localeCompare(right.code))

  return { rows, totalCount: result.getTotalCount() }
}

/** Upload files to DSS via session workspace and register as a new dataset. */
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

/**
 * Download a file from a dataset. Dispatches to AFS or DSS based on fileListingMode.
 * For AFS-backed datasets it reads afs.owner / afs.path from metaData.
 * For DSS it uses the standard file download endpoint.
 */
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
    const fileName = String(row.permId ?? row.code) + '_' + (picked.path.split('/').filter(Boolean).pop() || 'download')
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
    '/datastore_server/' +
      encodeURIComponent(datasetId) +
      '/' +
      encodeURIComponent(filePath.replace(/^\/+/, '')) +
      '?sessionID=' +
      encodeURIComponent(sessionToken),
    { method: 'GET' },
  )

  if (!response.ok) {
    throw new Error('Download failed: HTTP ' + response.status + ' ' + response.statusText)
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (/text\/html/i.test(contentType)) {
    const body = await response.text()
    throw new Error(
      'Download returned HTML instead of a file (content-type: ' + contentType + '). Response starts with: ' + body.slice(0, 200),
    )
  }

  const fileName = String(datasetId) + '_' + (filePath.split('/').filter(Boolean).pop() || 'download')
  downloadBlobFile(fileName, await response.blob())
  return { fileName }
}
