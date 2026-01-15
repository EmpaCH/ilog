import { useQuery } from '@tanstack/react-query';
import { getObjectByPermId } from './objectAPI';
import { useContext } from 'react';
import { AuthContext } from '../../context/auth/authContext';

export const useGetObjectByPermId = (permId: string | undefined) => {
  const { apiFacade } = useContext(AuthContext);

  return useQuery({
    queryKey: ['getObjectByPermId', permId],
    queryFn: () => {
      if (!permId || !apiFacade) return null;
      return getObjectByPermId(apiFacade, permId);
    },
    enabled: !!permId && permId !== '' && !!apiFacade,
  });
};
