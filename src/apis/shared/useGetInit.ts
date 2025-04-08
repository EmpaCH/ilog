import { useQuery } from "@tanstack/react-query";
import { useGetCollection } from "../collection/useGetCollection";
import { useGetObject } from "../object/useGetObject";
import { useGetProject } from "../project/useGetProject";
import { useGetSpace } from "../space/useGetSpace";
import { useGetObjectType } from "../type/useGetObjectType";
import { iLogID, labID } from "./environment";
import {
  COMPONENT_TYPE_DEFINITION,
  INSTRUMENT_TYPE_DEFINITION,
  iLogBaseTypesVocabularyID,
} from "./types";

export const useGetInit = () => {
  const instrumentExists = useGetObjectType(INSTRUMENT_TYPE_DEFINITION.code);
  const componentExists = useGetObjectType(COMPONENT_TYPE_DEFINITION.code);
  const spaceExists = useGetSpace(labID);
  const projectExists = useGetProject(labID, iLogID);
  const collectionExist = useGetCollection(labID, iLogID, iLogID);
  const vocabularyExists = useGetObject(iLogBaseTypesVocabularyID);
  return useQuery({
    queryKey: ["INIT_ILOG"],
    queryFn: async () => {
      console.log("Checking if iLog is initialized...");
      const done =
        instrumentExists.data !== undefined &&
        componentExists.data !== undefined &&
        spaceExists.data !== undefined &&
        projectExists.data !== undefined &&
        collectionExist.data !== undefined &&
        vocabularyExists.data !== undefined;
      console.log(
        "iLog is initialized:",
        done,
        instrumentExists.data,
        componentExists.data,
        spaceExists.data,
        projectExists.data,
        collectionExist.data,
        vocabularyExists.data
      );
      return {
        init: done,
        instrumentExists: instrumentExists.data !== undefined,
        componentExists: componentExists.data !== undefined,
        spaceExists: spaceExists.data !== undefined,
        projectExists: projectExists.data !== undefined,
        collectionExist: collectionExist.data !== undefined,
        vocabularyExists: vocabularyExists.data !== undefined,
      };
    },
  });
};
