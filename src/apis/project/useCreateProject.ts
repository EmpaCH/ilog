import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";
import openbis from "@openbis/openbis.esm";
import {
  GET_ALL_PROJECTS_QUERY_PREFIX,
  useGetProjects,
} from "./useGetProjects";

export const useCreateProject = (
  space: string,
  code: string,
  description: string
) => {
  const { apiFacade } = useContext(AuthContext);
  const existingProjectsResult = useGetProjects();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (existingProjectsResult.isSuccess) {
        const creation = new openbis.ProjectCreation();
        creation.setCode(code);
        creation.setSpaceId(new openbis.SpacePermId(space));
        creation.setDescription(description);
        if (
          !existingProjectsResult.data.some((project) => project.getCode() === code)
        ) {
          await apiFacade.createProjects([creation]);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [GET_ALL_PROJECTS_QUERY_PREFIX],
      });
    },
  });
};
