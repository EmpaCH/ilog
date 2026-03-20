import { useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AuthContext } from '../../context/auth/authContext'
import { getDataSetTypes } from './datasetAPI'

export const GET_DATA_SET_TYPES_QUERY_PREFIX = 'GET_DATA_SET_TYPES'

export const useGetDataSetTypes = () => {
  const { apiFacade } = useContext(AuthContext)

  return useQuery({
    queryKey: [GET_DATA_SET_TYPES_QUERY_PREFIX],
    queryFn: () => getDataSetTypes(apiFacade),
    staleTime: 60_000,
  })
}