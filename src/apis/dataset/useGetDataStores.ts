import { useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AuthContext } from '../../context/auth/authContext'
import { getDataStores } from './datasetAPI'

export const GET_DATA_STORES_QUERY_PREFIX = 'GET_DATA_STORES'

export const useGetDataStores = () => {
  const { apiFacade } = useContext(AuthContext)

  return useQuery({
    queryKey: [GET_DATA_STORES_QUERY_PREFIX],
    queryFn: () => getDataStores(apiFacade),
    staleTime: 60_000,
  })
}