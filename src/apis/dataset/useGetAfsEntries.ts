import { useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AuthContext } from '../../context/auth/authContext'
import { AfsListParams } from './commonDataset'
import { listAfsEntries } from './datasetAPI'

export const GET_AFS_ENTRIES_QUERY_PREFIX = 'GET_AFS_ENTRIES'

export const useGetAfsEntries = (params: AfsListParams | null) => {
  const { apiFacade } = useContext(AuthContext)

  return useQuery({
    queryKey: [GET_AFS_ENTRIES_QUERY_PREFIX, params],
    queryFn: () => (params ? listAfsEntries(apiFacade, params) : []),
    enabled: Boolean(params?.owner.trim()),
    staleTime: 0,
  })
}