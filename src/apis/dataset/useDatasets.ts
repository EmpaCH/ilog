import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useContext } from 'react'
import { AuthContext } from '../../context/auth/authContext'
import {
  AfsListParams,
  DataSetSearchParams,
  DatasetFileListingMode,
  DataSetRow,
  DownloadAfsEntryInput,
  DssUploadDataSetInput,
  UploadAfsDataSetInput,
} from './commonDataset'
import {
  uploadFileAsDataset,
  getSampleDatasets,
  getDatasetFileDownloadUrl,
  deleteDataset,
  getDataSetTypes,
  getDataStores,
  searchDataSets,
  downloadDataSetFile,
  listAfsEntries,
  downloadAfsEntry,
  uploadDssDataSet,
  uploadAfsDataSet,
} from './datasetAPI'

export const DATASET_QUERY_PREFIX = 'DATASET'
export const SEARCH_DATA_SETS_QUERY_PREFIX = 'SEARCH_DATA_SETS'
export const GET_AFS_ENTRIES_QUERY_PREFIX = 'GET_AFS_ENTRIES'
export const GET_DATA_SET_TYPES_QUERY_PREFIX = 'GET_DATA_SET_TYPES'
export const GET_DATA_STORES_QUERY_PREFIX = 'GET_DATA_STORES'

// ---------------------------------------------------------------------------
// Existing DSS / preview hooks
// ---------------------------------------------------------------------------

export const useUploadDataset = () => {
  const { apiFacade } = useContext(AuthContext)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      samplePermId,
      file,
      datasetTypeCode,
    }: {
      samplePermId: string
      file: File
      datasetTypeCode?: string
    }) => {
      return uploadFileAsDataset(apiFacade, samplePermId, file, datasetTypeCode)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [DATASET_QUERY_PREFIX, 'sample', variables.samplePermId],
      })
    },
  })
}

export const useSampleDatasets = (samplePermId: string) => {
  const { apiFacade } = useContext(AuthContext)

  return useQuery({
    queryKey: [DATASET_QUERY_PREFIX, 'sample', samplePermId],
    queryFn: () => getSampleDatasets(apiFacade, samplePermId),
    enabled: !!samplePermId,
  })
}

export const useDeleteDataset = () => {
  const { apiFacade } = useContext(AuthContext)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ datasetPermId }: { datasetPermId: string }) => {
      return deleteDataset(apiFacade, datasetPermId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [DATASET_QUERY_PREFIX],
      })
    },
  })
}

export const useDatasetFileDownloadUrl = () => {
  const { apiFacade } = useContext(AuthContext)

  return useMutation({
    mutationFn: async ({
      datasetPermId,
      filePath,
    }: {
      datasetPermId: string
      filePath?: string
    }) => {
      return getDatasetFileDownloadUrl(apiFacade, datasetPermId, filePath)
    },
  })
}

// ---------------------------------------------------------------------------
// AFS & advanced dataset hooks
// ---------------------------------------------------------------------------

export const useGetDataSetTypes = () => {
  const { apiFacade } = useContext(AuthContext)

  return useQuery({
    queryKey: [GET_DATA_SET_TYPES_QUERY_PREFIX],
    queryFn: () => getDataSetTypes(apiFacade),
    staleTime: 60_000,
  })
}

export const useGetDataStores = () => {
  const { apiFacade } = useContext(AuthContext)

  return useQuery({
    queryKey: [GET_DATA_STORES_QUERY_PREFIX],
    queryFn: () => getDataStores(apiFacade),
    staleTime: 60_000,
  })
}

export const useSearchDataSets = (filters: DataSetSearchParams) => {
  const { apiFacade } = useContext(AuthContext)

  return useQuery({
    queryKey: [SEARCH_DATA_SETS_QUERY_PREFIX, filters],
    queryFn: () => searchDataSets(apiFacade, filters),
    staleTime: 30_000,
  })
}

export const useGetAfsEntries = (params: AfsListParams | null) => {
  const { apiFacade } = useContext(AuthContext)

  return useQuery({
    queryKey: [GET_AFS_ENTRIES_QUERY_PREFIX, params],
    queryFn: () => (params ? listAfsEntries(apiFacade, params) : []),
    enabled: Boolean(params?.owner.trim()),
    staleTime: 0,
  })
}

export const useDownloadAfsEntry = () => {
  const { apiFacade } = useContext(AuthContext)

  return useMutation({
    mutationFn: (input: DownloadAfsEntryInput) => downloadAfsEntry(apiFacade, input),
  })
}

export const useDownloadDataSetFile = (fileListingMode: DatasetFileListingMode = 'dss') => {
  const { apiFacade } = useContext(AuthContext)

  return useMutation({
    mutationFn: (row: DataSetRow) => downloadDataSetFile(apiFacade, row, fileListingMode),
  })
}

export const useUploadDssDataSet = () => {
  const { apiFacade } = useContext(AuthContext)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: DssUploadDataSetInput) => uploadDssDataSet(apiFacade, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SEARCH_DATA_SETS_QUERY_PREFIX] })
    },
  })
}

export const useUploadAfsDataSet = () => {
  const { apiFacade } = useContext(AuthContext)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UploadAfsDataSetInput) => uploadAfsDataSet(apiFacade, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GET_AFS_ENTRIES_QUERY_PREFIX] })
    },
  })
}

