import { useContext } from 'react'
import { useMutation } from '@tanstack/react-query'
import { AuthContext } from '../../context/auth/authContext'
import { DownloadAfsEntryInput } from './commonDataset'
import { downloadAfsEntry } from './datasetAPI'

const DOWNLOAD_AFS_ENTRY_MUTATION_KEY = 'DOWNLOAD_AFS_ENTRY'

export const useDownloadAfsEntry = () => {
  const { apiFacade } = useContext(AuthContext)

  return useMutation({
    mutationKey: [DOWNLOAD_AFS_ENTRY_MUTATION_KEY],
    mutationFn: (input: DownloadAfsEntryInput) => downloadAfsEntry(apiFacade, input),
  })
}