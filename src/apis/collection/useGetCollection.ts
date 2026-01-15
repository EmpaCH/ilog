import { useQuery } from "@tanstack/react-query";
import { useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";
import openbis from "@openbis/openbis.esm";

const QUERY_PREFIX = "GET_COLLECTION";
export const useGetCollection = (space: string, project: string, code: string) => {
  const { apiFacade } = useContext(AuthContext);

  return useQuery({
    queryKey: [QUERY_PREFIX, space, project, code],
    queryFn: async () => {
      const sc = new openbis.ExperimentSearchCriteria();
      sc.withCode().thatEquals(code.toUpperCase());
      sc.withProject().withCode().thatEquals(project);
      sc.withProject().withSpace().withCode().thatEquals(space);
      const collection = await apiFacade.searchExperiments(
        sc,
        new openbis.ExperimentFetchOptions()
      );
      return collection.getTotalCount() >0 ? collection.getObjects()[0] : null;
    },
  });
};
