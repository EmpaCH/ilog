import { useQuery } from '@tanstack/react-query';
import { getObjectByPermId } from './objectAPI';
import { useContext } from 'react';
import { AuthContext } from '../../context/auth/authContext';

export const useGetObjectsByPermIds = (componentPermIds: string[]) => {
  const { apiFacade } = useContext(AuthContext);

  return useQuery({
    queryKey: ["getObjectsByPermIds", componentPermIds.join(",")],
    queryFn: async () => {
      if (!componentPermIds || componentPermIds.length === 0) return {} as Record<string, string>;
      const map: Record<string, string> = {};
      await Promise.all(componentPermIds.map(async (permId) => {
        try {
          const obj = await getObjectByPermId(apiFacade, permId);
          if (obj) {
            map[permId] = obj.getProperty("NAME") || obj.getCode();
          }
        } catch (e) {
          // ignore
        }
      }));
      return map;
    },
    enabled: componentPermIds && componentPermIds.length > 0 && !!apiFacade,
  });
};
