import { useMutation, useQuery } from '@tanstack/react-query';
import { createObject, getObject } from './objectAPI';
import { useContext } from 'react';
import { AuthContext } from '../../context/auth/authContext';

export const useGetObject = (permId: string) => {
  const { apiFacade } = useContext(AuthContext);

  return useQuery({
    queryKey: [permId],
    queryFn: () => {
      return getObject(apiFacade, permId);
    },
  });

};
