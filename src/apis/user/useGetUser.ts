import { useQuery } from "@tanstack/react-query";
import { useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";
import openbis from "@openbis/openbis.esm";

export const USER_QUERY_PREFIX = "GET_USER";
export const useGetUser = (user: string) => {
  const { apiFacade, isAuthenticated } = useContext(AuthContext);  
  return useQuery({
    queryKey: [USER_QUERY_PREFIX, user],
    staleTime: 0,
    queryFn: async () => {
      if (!user || !isAuthenticated || !apiFacade) {
        throw new Error("User not authenticated or no user provided");
      }
      const fo = new openbis.PersonFetchOptions();
      const sc = new openbis.PersonSearchCriteria();
      sc.withUserId().thatEquals(user);
      fo.withSpace();
      fo.withRoleAssignments().withSpace();
      const queryResult = await apiFacade.searchPersons(sc, fo);
      return queryResult.getObjects();
    },
    enabled: isAuthenticated && !!user && !!apiFacade,
  });
};
