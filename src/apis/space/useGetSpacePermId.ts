import { useQuery } from "@tanstack/react-query";
import { useGetSpace } from "./useGetSpace";

export const useGetSpacePermId = (code: string) => {
  const { data: space, isSuccess, ...rest } = useGetSpace(code);
  const permId = isSuccess ? space?.getPermId() : undefined;

  return { permId, isSuccess, ...rest };
};
