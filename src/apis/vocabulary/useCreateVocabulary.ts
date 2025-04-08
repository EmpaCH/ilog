import { useContext } from "react";
import { Vocabulary, convertVocabularyToOperations } from "./commonVocabulary";
import { AuthContext } from "../../context/auth/authContext";
import { useMutation } from "@tanstack/react-query";
import { useGetVocabulary } from "./useGetVocabulary";
import openbis from "@openbis/openbis.esm";

export const useCreateVocabulary = (voc: Vocabulary) => {
  const { apiFacade } = useContext(AuthContext);
  const existingVoc = useGetVocabulary(voc.code);
  return useMutation({
    mutationFn: async () => {
      if (existingVoc.isSuccess && existingVoc.data === null) {
        const ops = convertVocabularyToOperations(voc);

        const opts = new openbis.SynchronousOperationExecutionOptions();
        opts.setExecuteInOrder(true);
        await apiFacade.executeOperations(ops, opts);
      }
    },
    onError: (error) => {
      console.error("Error creating vocabulary", error);
    },
  });
};
