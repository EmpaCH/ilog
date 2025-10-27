import { useQuery } from "@tanstack/react-query";
import { useGetCollection } from "../collection/useGetCollection";
import { useGetObject } from "../object/useGetObject";
import { useGetProject } from "../project/useGetProject";
import { useGetSpace } from "../space/useGetSpace";
import { useGetObjectType } from "../type/useGetObjectType";
import { iLogID, labID, componentCollectionID, instrumentCollectionID, logbookCollectionID } from "./environment";
import {
  COMPONENT_TYPE_DEFINITION,
  INSTRUMENT_TYPE_DEFINITION,
  LOGBOOK_ENTRY_TYPE_DEFINITION,
  LOGBOOK_ENTRY_TYPES,
  iLogBaseTypesVocabularyID,
} from "./types";

export const useGetInit = () => {
  const typeDefinitions = [
    { key: "instrumentExists", code: INSTRUMENT_TYPE_DEFINITION.code },
    { key: "componentExists", code: COMPONENT_TYPE_DEFINITION.code },
    { key: "logbookExists", code: LOGBOOK_ENTRY_TYPE_DEFINITION.code },
  ];

  const logbookEntryTypeDefinitions = Object.entries(LOGBOOK_ENTRY_TYPES).map(([key, definition]) => ({
    key,
    code: definition.code,
  }));

  const typeChecks = [
    ...typeDefinitions.map((typeDef) => {
      const result = useGetObjectType(typeDef.code);
      return {
        key: typeDef.key,
        data: result.data,
        isLoading: result.isLoading,
        isError: result.isError,
      };
    }),
    ...logbookEntryTypeDefinitions.map((typeDef) => {
      const result = useGetObjectType(typeDef.code);
      return {
        key: typeDef.key,
        data: result.data,
        isLoading: result.isLoading,
        isError: result.isError,
      };
    }),
  ];

  const spaceResult = useGetSpace(labID);
  const projectResult = useGetProject(labID, iLogID);
  const collectionComponentResult = useGetCollection(labID, iLogID, componentCollectionID);
  const collectionInstrumentResult = useGetCollection(labID, iLogID, instrumentCollectionID);
  const collectionLogbookResult = useGetCollection(labID, iLogID, logbookCollectionID);
  const vocabularyResult = useGetObject(iLogBaseTypesVocabularyID);

  // Check if any dependency is still loading
  const isLoading = 
    typeChecks.some(check => check.isLoading) ||
    spaceResult.isLoading ||
    projectResult.isLoading ||
    collectionComponentResult.isLoading ||
    collectionInstrumentResult.isLoading ||
    collectionLogbookResult.isLoading ||
    vocabularyResult.isLoading;

  return useQuery({
    queryKey: ["INIT_ILOG"],
    queryFn: async () => {
      console.log("Checking if iLog is initialized...");

      const typeCheckResults = typeChecks.every((typeCheck) => typeCheck.data !== undefined);
      const isDone =
        typeCheckResults &&
        spaceResult.data != null &&
        projectResult.data != null &&
        collectionComponentResult.data != null &&
        collectionInstrumentResult.data != null &&
        collectionLogbookResult.data != null &&
        vocabularyResult.data != null;

      console.log(
        "iLog is initialized:",
        isDone,
        ...typeChecks.map((typeCheck) => ({ [typeCheck.key]: typeCheck.data })),
        { 
          spaceExists: spaceResult.data !== null, 
          projectExists: projectResult.data !== null, 
          collectionComponentExist: collectionComponentResult.data !== null,
          collectionInstrumentExist: collectionInstrumentResult.data !== null, 
          collectionLogbookExist: collectionLogbookResult.data !== null, 
          vocabularyExists: vocabularyResult.data !== null 
        }
      );

      return {
        init: isDone,
        ...typeChecks.reduce((acc, typeCheck) => {
          acc[typeCheck.key] = typeCheck.data !== null;
          return acc;
        }, {} as Record<string, boolean>),
        spaceExists: spaceResult.data !== null,
        projectExists: projectResult.data !== null,
        collectionComponentExist: collectionComponentResult.data !== null,
        collectionInstrumentExist: collectionInstrumentResult.data !== null,
        collectionLogbookExist: collectionLogbookResult.data !== null,
        vocabularyExists: vocabularyResult.data !== null,
      };
    },
    enabled: !isLoading, // Only run query when all dependencies are loaded
  });
};
