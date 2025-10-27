import {
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useCreateIlogTypeProperty, useCreateIlogLogbookProperty } from "./useCreateIlogTypeProperty";
import { useCreateSpace } from "../space/useCreateSpace";
import { useCreateProject } from "../project/useCreateProject";
import { labID, iLogID, componentCollectionID, instrumentCollectionID } from "./environment";
import { useCreateCollection } from "../collection/useCreateCollection";
import { useGetElnSettings } from "../eln/useGetElnSettings";
import { useUpdateElnSettings } from "../eln/useUpdateElnSettings";
import {
  COMPONENT_TYPE_DEFINITION,
  ILOG_BASE_TYPES_PROPERTY,
  ILOG_BASE_TYPES_VOCABULARY,
  INSTRUMENT_TYPE_DEFINITION,
  LOGBOOK_ENTRY_TYPE_DEFINITION,
  LOGBOOK_ENTRY_TYPES,
  logbookCollectionID,
} from "./common";
import { useCreateObjectType } from "../type/useCreateObjectType";
import { useCreateVocabulary } from "../vocabulary/useCreateVocabulary";
import { useCreatePropertyType } from "../propertyType/useCreatePropertyType";
import { useState } from "react";
import { ALL_OBJECT_TYPES_QUERY_PREFIX } from "../type/useGetAllObjectTypes";
import { useGetObjectType } from "../type/useGetObjectType";
import { useGetInit } from "./useGetInit";

export interface ILogProgress {
  message: string;
  type: "idle" | "pending" | "success" | "error";
  counter: number;
}

const useCounter = () => {
  const [count, setCount] = useState(0);
  const increment = () => setCount((c) => c + 1);
  return { count, increment };
};

export const INIT_ILOG_KEY = "INIT_ILOG";

export const useInitIlog = () => {
  const InitAlreadyDone = useGetInit();
  const iLogPropertyCreation = useCreateIlogTypeProperty();
  const iLogLogbookPropertyCreation = useCreateIlogLogbookProperty();
  const spaceCreation = useCreateSpace(labID, "ilog Space");
  const elnSettings = useGetElnSettings();
  const projectCreation = useCreateProject(labID, iLogID, "iLog Project");
  const collectionComponentCreation = useCreateCollection(
    labID,
    iLogID,
    componentCollectionID,
    "COLLECTION",
    "COLLECTION"
  );
  const collectionInstrumentCreation = useCreateCollection(
    labID,
    iLogID,
    instrumentCollectionID,
    "COLLECTION",
    "COLLECTION"
  );
  const collectionLogbookCreation = useCreateCollection(
    labID,
    iLogID,
    logbookCollectionID,
    "COLLECTION",
    "COLLECTION"
  );

  const emitMessage = (
    message: string,
    type: "idle" | "pending" | "success" | "error"
  ) => {
    setProgress();
    setMessage({ message, type, counter: progress });
  };

  const updateElnSettings = useUpdateElnSettings();
  const createObjects = useCreateObjectType();
  const createVoc = useCreateVocabulary(ILOG_BASE_TYPES_VOCABULARY);
  const iLogVariantPropertyTypeCreation = useCreatePropertyType(
    ILOG_BASE_TYPES_PROPERTY
  );

  const objectTypeChecks = new Map(
    [
      COMPONENT_TYPE_DEFINITION,
      INSTRUMENT_TYPE_DEFINITION,
      LOGBOOK_ENTRY_TYPE_DEFINITION,
      ...Object.values(LOGBOOK_ENTRY_TYPES),
    ].map((definition) => [definition, useGetObjectType(definition.code)])
  );

  const { count: progress, increment: setProgress } = useCounter();
  const [message, setMessage] = useState<ILogProgress>({} as ILogProgress);
  const queryClient = useQueryClient();
  const mut = useMutation({
    // mutationKey: [INIT_ILOG_KEY],
    mutationFn: async () => {

      if (!InitAlreadyDone.isSuccess || !InitAlreadyDone.data.init ) {
        //By using await and mutateAsync,  we force the order of execution

        emitMessage("Initializing inventory space...", spaceCreation.status);
        await spaceCreation.mutateAsync();
        if (elnSettings.isSuccess) {
          const newSettings = elnSettings.data;
          console.log("newSettings", newSettings);

          newSettings.inventorySpaces = [
            ...(newSettings.inventorySpaces ?? []),
            labID,
          ];
          await updateElnSettings.mutateAsync({ newSettings: newSettings });
        }
        emitMessage("Initializing project...", projectCreation.status);
        await projectCreation.mutateAsync();

        emitMessage("Initializing component collection...", collectionComponentCreation.status);
        await collectionComponentCreation.mutateAsync();
        emitMessage("Initializing instrument collection...", collectionInstrumentCreation.status);
        await collectionInstrumentCreation.mutateAsync();
        emitMessage("Initializing logbook collection...", collectionLogbookCreation.status);
        await collectionLogbookCreation.mutateAsync();
        console.log("Inventory space, project and collection initialized.");


        emitMessage(
          "Initializing iLog property type...",
          iLogPropertyCreation.status
        );
        await iLogPropertyCreation.mutateAsync();
        console.log("iLog property type initialized.");
        
        emitMessage(
          "Initializing iLog logbook property type...",
          iLogLogbookPropertyCreation.status
        );
        await iLogLogbookPropertyCreation.mutateAsync();
        console.log("iLog logbook property type initialized.");

        emitMessage(
          "Initializing iLog vocabulary...",
          createVoc.status
        );
        await createVoc.mutateAsync();
        console.log("iLog vocabulary initialized.");

        emitMessage(
          "Initializing iLog variant property type...",
          createVoc.status
        );
        await iLogVariantPropertyTypeCreation.mutateAsync();

        console.log("iLog variant property type initialized.");
        emitMessage(
          "Initializing component and instrument types...",
          iLogVariantPropertyTypeCreation.status
        );

        for (const [objectTypeDefinition, requestResult] of objectTypeChecks) {
          if (await requestResult.refetch().then(res => res.data) === undefined) {
            await createObjects.mutateAsync({ definition: objectTypeDefinition });
            emitMessage(`${objectTypeDefinition.code} type initialized.`, createObjects.status);
          }
        }

      }
    },
    onSuccess: () => {
      console.log("iLog initialization completed.");
      emitMessage("iLog initialization completed.", "success");
      setProgress();
      queryClient.invalidateQueries({
        queryKey: [
          ALL_OBJECT_TYPES_QUERY_PREFIX
        ],
      });
    },
    onError: (error) => {
      console.error(error);
      emitMessage(error.message, "error");
    },
  });
  return {
    ...mut,
    progress,
    message,
  };
};
