import { useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AuthContext } from '../../context/auth/authContext'
import { DataSetSearchParams } from './commonDataset'
import { searchDataSets } from './datasetAPI'

export const SEARCH_DATA_SETS_QUERY_PREFIX = 'SEARCH_DATA_SETS'

export const useSearchDataSets = (filters: DataSetSearchParams) => {
  const { apiFacade } = useContext(AuthContext)

  return useQuery({
    queryKey: [SEARCH_DATA_SETS_QUERY_PREFIX, filters],
    queryFn: () => searchDataSets(apiFacade, filters),
    staleTime: 30_000,
  })
}