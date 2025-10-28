import { useQuery } from '@tanstack/react-query';
import { getObject } from './objectAPI';
import { useContext } from 'react';
import { AuthContext } from '../../context/auth/authContext';

export const useGetObject = (code: string) => {
  const { apiFacade } = useContext(AuthContext);

  return useQuery({
    queryKey: [code],
    queryFn: () => {
      return getObject(apiFacade, code);
    },
    enabled: !!code && code !== '',
  });
};
