import {
  UseMutationResult,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useCreateIlogTypeProperty } from "./useCreateIlogTypeProperty";
import { useCreateSpace } from "../space/useCreateSpace";
import { useCreateProject } from "../project/useCreateProject";
import { labID, iLogID, collectionID } from "./environment";
import { useCreateCollection } from "../collection/useCreateCollection";
import { useGetElnSettings } from "../eln/useGetElnSettings";
import { useUpdateElnSettings } from "../eln/useUpdateElnSettings";
import {
  COMPONENT_TYPE_DEFINITION,
  ILOG_BASE_TYPES_PROPERTY,
  ILOG_BASE_TYPES_VOCABULARY,
  INSTRUMENT_TYPE_DEFINITION,
} from "./common";
import { useCreateObjectType } from "../type/useCreateObjectType";
import { useCreateVocabulary } from "../vocabulary/useCreateVocabulary";
import { useCreatePropertyType } from "../propertyType/useCreatePropertyType";
import { useState } from "react";
import {
  ALL_OBJECT_TYPES_QUERY_PREFIX,
  useGetAllObjectTypes,
} from "../type/useGetAllObjectTypes";
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
  const spaceCreation = useCreateSpace(labID, "ilog Space");
  const elnSettings = useGetElnSettings();
  const projectCreation = useCreateProject(labID, iLogID, "iLog Project");
  const collectionCreation = useCreateCollection(
    labID,
    iLogID,
    collectionID,
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
  const componentExists = useGetObjectType(COMPONENT_TYPE_DEFINITION.code);
  const instrumentExists = useGetObjectType(INSTRUMENT_TYPE_DEFINITION.code);
  const { count: progress, increment: setProgress } = useCounter();
  const [message, setMessage] = useState<ILogProgress>({} as ILogProgress);
  const queryClient = useQueryClient();
  const mut = useMutation({
    mutationKey: [INIT_ILOG_KEY],
    mutationFn: async () => {
      if (InitAlreadyDone.isSuccess && !InitAlreadyDone.data.init ) {
        //By using await and mutateAsync,  we force the order of execution

        await spaceCreation.mutateAsync();
        emitMessage("Initializing inventory space...", spaceCreation.status);
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

        emitMessage("Initializing collection...", collectionCreation.status);
        await collectionCreation.mutateAsync();

        console.log("Inventory space, project and collection initialized.");
        emitMessage(
          "Initializing iLog property type...",
          iLogPropertyCreation.status
        );
        const res = await iLogPropertyCreation.mutateAsync();
        console.log("iLog property type", res);
        console.log("iLog property type initialized.");
        emitMessage(
          "Initializing iLog vocabulary...",
          iLogPropertyCreation.status
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
        if (componentExists.data === undefined) {
          await createObjects.mutateAsync({
            definition: COMPONENT_TYPE_DEFINITION,
          });
        }
        if (instrumentExists.data === undefined) {
          await createObjects.mutateAsync({
            definition: INSTRUMENT_TYPE_DEFINITION,
          });
        }
        emitMessage("Component type initialized.", createObjects.status);

        emitMessage("Instrument type initialized.", createObjects.status);
      }
    },
    onSuccess: () => {
      console.log("iLog initialization completed.");
      emitMessage("iLog initialization completed.", "success");
      setProgress();
      queryClient.invalidateQueries([ALL_OBJECT_TYPES_QUERY_PREFIX]);
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
