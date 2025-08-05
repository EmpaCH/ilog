import { useMutation, useQuery } from '@tanstack/react-query';
import {getLogbookEntryType } from './typeAPI.ts';
import { useContext } from 'react';
import { AuthContext } from '../../context/auth/authContext';

export const useGetLogbookEntryType = (permId: string) => {
    const { apiFacade } = useContext(AuthContext);
    return useQuery({
    queryKey: [permId],
    queryFn: async () => {
      const res = await getLogbookEntryType(apiFacade, permId);
      if(res === null || res === undefined) {
        throw new Error("Object type not found");
      }
      else {
        return res;
      }
  
    },
  });
}