import { useQuery } from "@tanstack/react-query";
import { useGetProject } from "./useGetProject";

export const useGetProjectPermId = (space: string, project: string) => {
  const {
    data: projectResult,
    isSuccess,
    ...rest
  } = useGetProject(space, project);
  const permId = isSuccess ? projectResult?.getPermId() : undefined;

  return { permId, isSuccess, ...rest };
};
