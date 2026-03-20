import { useContext } from 'react'
import { useMutation } from '@tanstack/react-query'
import { AuthContext } from '../../context/auth/authContext'
import { DataSetRow, DatasetFileListingMode } from './commonDataset'
import { downloadDataSetFile } from './datasetAPI'

const DOWNLOAD_DATA_SET_FILE_MUTATION_KEY = 'DOWNLOAD_DATA_SET_FILE'

export const useDownloadDataSetFile = (fileListingMode: DatasetFileListingMode = 'dss') => {
  const { apiFacade } = useContext(AuthContext)

  return useMutation({
    mutationKey: [DOWNLOAD_DATA_SET_FILE_MUTATION_KEY, fileListingMode],
    mutationFn: (row: DataSetRow) => downloadDataSetFile(apiFacade, row, fileListingMode),
  })
}