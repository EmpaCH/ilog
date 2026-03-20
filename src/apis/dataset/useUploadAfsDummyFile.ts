import { useContext } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AuthContext } from '../../context/auth/authContext'
import { UploadAfsDummyFileInput } from './commonDataset'
import { uploadAfsDummyFile } from './datasetAPI'
import { GET_AFS_ENTRIES_QUERY_PREFIX } from './useGetAfsEntries'

const UPLOAD_AFS_DUMMY_FILE_MUTATION_KEY = 'UPLOAD_AFS_DUMMY_FILE'

export const useUploadAfsDummyFile = () => {
  const { apiFacade } = useContext(AuthContext)
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: [UPLOAD_AFS_DUMMY_FILE_MUTATION_KEY],
    mutationFn: (input: UploadAfsDummyFileInput) => uploadAfsDummyFile(apiFacade, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GET_AFS_ENTRIES_QUERY_PREFIX] })
    },
  })
}