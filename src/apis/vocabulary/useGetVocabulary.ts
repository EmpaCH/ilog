import { useQuery } from "@tanstack/react-query";
import { useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";
import { getVocabulary } from "./vocabularyAPI";

const QUERY_PREFIX = "GET_VOCABULARY";
export const useGetVocabulary = (code: string) => {
  const { apiFacade } = useContext(AuthContext);

  return useQuery({
    queryKey: [QUERY_PREFIX, code],
    queryFn: () => {
      return getVocabulary(apiFacade, code);
    },
  });
};
