import { useContext } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AuthContext } from '../../context/auth/authContext'
import { DssUploadDataSetInput } from './commonDataset'
import { uploadDssDataSet } from './datasetAPI'
import { SEARCH_DATA_SETS_QUERY_PREFIX } from './useSearchDataSets'

const UPLOAD_DSS_DATA_SET_MUTATION_KEY = 'UPLOAD_DSS_DATA_SET'

export const useUploadDssDataSet = () => {
  const { apiFacade } = useContext(AuthContext)
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: [UPLOAD_DSS_DATA_SET_MUTATION_KEY],
    mutationFn: (input: DssUploadDataSetInput) => uploadDssDataSet(apiFacade, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SEARCH_DATA_SETS_QUERY_PREFIX] })
    },
  })
}