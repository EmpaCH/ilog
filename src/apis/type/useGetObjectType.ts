import { useMutation, useQuery } from '@tanstack/react-query';
import {getObjectType } from './typeAPI.ts';
import { useContext } from 'react';
import { AuthContext } from '../../context/auth/authContext';

export const useGetObjectType = (permId: string) => {
    const { apiFacade } = useContext(AuthContext);
    return useQuery({
    queryKey: [permId],
    queryFn: async () => {
      return getObjectType(apiFacade, permId);
    },
  });
}