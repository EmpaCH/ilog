import { useContext } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AuthContext } from '../../context/auth/authContext'
import { UploadAfsDataSetInput } from './commonDataset'
import { uploadAfsDataSet } from './datasetAPI'
import { GET_AFS_ENTRIES_QUERY_PREFIX } from './useGetAfsEntries'

const UPLOAD_AFS_DATA_SET_MUTATION_KEY = 'UPLOAD_AFS_DATA_SET'

export const useUploadAfsDataSet = () => {
  const { apiFacade } = useContext(AuthContext)
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: [UPLOAD_AFS_DATA_SET_MUTATION_KEY],
    mutationFn: (input: UploadAfsDataSetInput) => uploadAfsDataSet(apiFacade, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GET_AFS_ENTRIES_QUERY_PREFIX] })
    },
  })
}