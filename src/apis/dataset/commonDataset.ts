export type DatasetFileListingMode = 'dss' | 'afs'

export type DatasetTypeItem = {
  key: string
  code: string
}

export type DataStoreInfo = {
  code: string
  downloadUrl?: string
  remoteUrl?: string
}

export type DataStoresResult = {
  totalCount: number
  codes: string[]
  stores: DataStoreInfo[]
}

export type DataSetRow = {
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

export type DataSetsPage = {
  rows: DataSetRow[]
  totalCount: number
}

export type DataSetSearchParams = {
  page: number
  rowsPerPage: number
  dataStoreCodesText: string
  dataSetCodesText: string
  dataSetTypeCodesText: string
  sampleFilterIdentifiersText: string
}

export type DownloadedFileResult = {
  fileName: string
}

export type DssUploadDataSetInput = {
  experimentIdentifier: string
  sampleIdentifier: string
  dataSetTypeCode: string
  files?: FileList | File[] | null
}

export type AfsListParams = {
  owner: string
  source: string
  recursively: boolean
}

export type AfsListEntry = {
  path: string
  name: string
  directory: boolean
  size?: number
  lastModified?: number
}

export type AfsChunk = {
  owner: string
  source: string
  offset: number
  limit?: number
  data?: Uint8Array
}

export type DownloadAfsEntryInput = {
  owner: string
  entry: AfsListEntry
}

export type UploadAfsDataSetInput = {
  experimentIdentifier: string
  sampleIdentifier: string
  samplePermId: string
  afsOwnerText: string
  file?: File | null
}

export type UploadAfsDataSetResult = {
  afsPath: string
}