import { useQuery } from "@tanstack/react-query";
import { getObject } from "./objectAPI";
import { useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";
import openbis from "@openbis/openbis.esm";

export const GET_OBJECT_QUERY_PREFIX = "GET_OBJECT";

export const useGetObjectInCollection = (
  space: string,
  project: string,
  collection: string,
  code: string
) => {
  const { apiFacade } = useContext(AuthContext);

  return useQuery({
    queryKey: [GET_OBJECT_QUERY_PREFIX, space, project, collection, code],
    queryFn: async () => {
      const sc = new openbis.SampleSearchCriteria();
      sc.withCode().thatEquals(code);
      sc.withSpace().withCode().thatEquals(code);
      sc.withProject().withCode().thatEquals(code);
      sc.withExperiment().withCode().thatEquals(code);
      fo = new ope
      return;
    },
  });
};
