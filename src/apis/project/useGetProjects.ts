import { useQuery } from "@tanstack/react-query";
import { useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";
import openbis from "@openbis/openbis.esm";

export const GET_ALL_PROJECTS_QUERY_PREFIX = "GET_ALL_PROJECTS";
export const useGetProjects = () => {
  const { apiFacade } = useContext(AuthContext);

  return useQuery({
    queryKey: [GET_ALL_PROJECTS_QUERY_PREFIX],
    queryFn: async () => {
      const sc = new openbis.ProjectSearchCriteria();
      const spaces = await apiFacade.searchProjects(
        sc,
        new openbis.ProjectFetchOptions()
      );
      return spaces.getObjects();
    },
  });
};
