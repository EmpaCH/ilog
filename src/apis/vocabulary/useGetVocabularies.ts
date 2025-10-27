import { useQuery } from "@tanstack/react-query";
import { useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";
import openbis from "@openbis/openbis.esm";

const QUERY_PREFIX = "GET_ALL_VOCABULARIES";
export const useGetVocabularies = () => {
  const { apiFacade } = useContext(AuthContext);

  return useQuery({
    queryKey: [QUERY_PREFIX],
    queryFn: async () => {
      const so = new openbis.VocabularySearchCriteria();
      const fo = new openbis.VocabularyFetchOptions();
      return (await apiFacade.searchVocabularies(so, fo)).getObjects();
    },
  });
};
