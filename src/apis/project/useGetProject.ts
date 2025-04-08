import { useQuery } from "@tanstack/react-query";
import { useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";
import openbis from "@openbis/openbis.esm";

const QUERY_PREFIX = "GET_PROJECT";
export const useGetProject = (space: string, code: string) => {
  const { apiFacade } = useContext(AuthContext);

  return useQuery({
    queryKey: [QUERY_PREFIX, space, code],
    queryFn: async () => {
      const sc = new openbis.ProjectSearchCriteria();
      sc.withCode().thatEquals(code);
      sc.withSpace().withCode().thatEquals(space);

      const spaces = await apiFacade.searchProjects(
        sc,
        new openbis.ProjectFetchOptions()
      );
      return spaces.getTotalCount() >0 ? spaces.getObjects()[0] : null;
    },
  });
};
