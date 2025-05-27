import { useQuery } from "@tanstack/react-query";
import { useGetCollection } from "../collection/useGetCollection";
import { useGetObject } from "../object/useGetObject";
import { useGetProject } from "../project/useGetProject";
import { useGetSpace } from "../space/useGetSpace";
import { useGetObjectType } from "../type/useGetObjectType";
import { iLogID, labID, iLogLogbookID, collectionID, logbookCollectionID } from "./environment";
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
    ...typeDefinitions.map((typeDef) => ({
      key: typeDef.key,
      data: useGetObjectType(typeDef.code).data,
    })),
    ...logbookEntryTypeDefinitions.map((typeDef) => ({
      key: typeDef.key,
      data: useGetObjectType(typeDef.code).data,
    })),
  ];



  const spaceExists = useGetSpace(labID).data;
  const projectExists = useGetProject(labID, iLogID).data;
  const collectionEquipmentExist = useGetCollection(labID, iLogID, collectionID).data;
  const collectionLogbookExist = useGetCollection(labID, iLogID, logbookCollectionID).data;
  const vocabularyExists = useGetObject(iLogBaseTypesVocabularyID).data;

  return useQuery({
    queryKey: ["INIT_ILOG"],
    queryFn: async () => {
      console.log("Checking if iLog is initialized...");

      const typeCheckResults = typeChecks.every((typeCheck) => typeCheck.data !== undefined);
      const isDone =
        typeCheckResults &&
        spaceExists !== undefined &&
        projectExists !== undefined &&
        collectionEquipmentExist !== undefined &&
        collectionLogbookExist !== undefined &&
        vocabularyExists !== undefined;

      console.log(
        "iLog is initialized:",
        isDone,
        ...typeChecks.map((typeCheck) => ({ [typeCheck.key]: typeCheck.data })),
        { spaceExists, projectExists, collectionEquipmentExist, collectionLogbookExist, vocabularyExists }
      );

      return {
        init: isDone,
        ...typeChecks.reduce((acc, typeCheck) => {
          acc[typeCheck.key] = typeCheck.data !== undefined;
          return acc;
        }, {} as Record<string, boolean>),
        spaceExists: spaceExists !== undefined,
        projectExists: projectExists !== undefined,
        collectionExist: collectionEquipmentExist !== undefined,
        collectionLogbookExist: collectionLogbookExist !== undefined,
        vocabularyExists: vocabularyExists !== undefined,
      };
    },
  });
};
