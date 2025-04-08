import { useQuery } from "@tanstack/react-query";
import { useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";
import openbis from "@openbis/openbis.esm";

export const GET_ALL_SPACES_QUERY_PREFIX = "GET_ALL_SPACES";
export const useGetSpaces = () => {
  const { apiFacade } = useContext(AuthContext);
  return useQuery({
    queryKey: [GET_ALL_SPACES_QUERY_PREFIX],
    queryFn: async () => {
      const sc = new openbis.SpaceSearchCriteria();
      const spaces = await apiFacade.searchSpaces(
        sc,
        new openbis.SpaceFetchOptions()
      );
      return spaces.getObjects();
    },
  });
};
