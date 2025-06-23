import { useQuery } from "@tanstack/react-query";
import { useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";
import openbis from "@openbis/openbis.esm";

export const GET_ALL_DATASETS_QUERY_PREFIX = "GET_ALL_DATASETS";
export const useGetDataSets = () => {
  const { apiFacade } = useContext(AuthContext);

  return useQuery({
    queryKey: [GET_ALL_DATASETS_QUERY_PREFIX],
    queryFn: async () => {
      const sc = new openbis.DataSetSearchCriteria();
      const dataSets = await apiFacade.searchDataSets(
        sc,
        new openbis.DataSetFetchOptions()
      );
      return dataSets.getObjects();
    },
  });
};
