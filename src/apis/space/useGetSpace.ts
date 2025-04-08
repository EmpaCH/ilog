import { useQuery } from "@tanstack/react-query";
import { useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";
import openbis from "@openbis/openbis.esm";

const QUERY_PREFIX = "GET_SPACE";
export const useGetSpace = (code: string) => {
  const { apiFacade } = useContext(AuthContext);

  return useQuery({
    queryKey: [QUERY_PREFIX, code],
    queryFn: async () => {
      const sc = new openbis.SpaceSearchCriteria();
      sc.withCode().thatEquals(code);
      const spaces = await apiFacade.searchSpaces(
        sc,
        new openbis.SpaceFetchOptions()
      );
      return spaces.getTotalCount() >0 ? spaces.getObjects()[0] : null;
    },
  });
};
