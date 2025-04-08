import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";
import openbis from "@openbis/openbis.esm";
import {
  GET_ALL_COLLECTIONS_QUERY_PREFIX,
  useGetCollections,
} from "./useGetCollections";
import { useGetProjects } from "../project/useGetProjects";

export const useCreateCollection = (
  space: string,
  project: string,
  code: string,
  description: string,
  type: string
) => {
  const { apiFacade } = useContext(AuthContext);
  const existingCollectionResult = useGetCollections();
  const existingProjectsResult = useGetProjects();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      console.log(code, space, project, description, type);
      if (
        existingCollectionResult.isSuccess &&
        existingProjectsResult.isSuccess
      ) {
        const foundProject = existingProjectsResult.data.find(
          (currentProject) =>
            currentProject.getIdentifier().getIdentifier() === `/${space}/${project}`
        );
        console.log("Existing projects", existingProjectsResult.data);
        console.log("Start creating collection");
        console.log("foundProject", foundProject, "or", `/${space}/${project}`);
        const creation = new openbis.ExperimentCreation();
        creation.setCode(code);
        creation.setProjectId(
          foundProject?.getIdentifier() ||
            new openbis.ProjectIdentifier(`/${space}/${project}`)
        );
        creation.setTypeId(new openbis.EntityTypePermId(type));
        if (
          !existingCollectionResult.data.some(
            (collection) => collection.getCode() === code
          )
        ) {
          await apiFacade.createExperiments([creation]);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [GET_ALL_COLLECTIONS_QUERY_PREFIX],
      });
    },
  });
};
