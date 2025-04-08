import { useQuery } from "@tanstack/react-query";
import { useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";
import openbis from "@openbis/openbis.esm";

export const GET_ALL_COLLECTIONS_QUERY_PREFIX = "GET_ALL_COLLECTIONS";
export const useGetCollections = () => {
  const { apiFacade } = useContext(AuthContext);

  return useQuery({
    queryKey: [GET_ALL_COLLECTIONS_QUERY_PREFIX],
    queryFn: async () => {
      const sc = new openbis.ExperimentSearchCriteria();
      const experiments = await apiFacade.searchExperiments(
        sc,
        new openbis.ExperimentFetchOptions()
      );
      return experiments.getObjects();
    },
  });
};
