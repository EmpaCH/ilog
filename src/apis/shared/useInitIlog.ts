import {
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useCreateIlogTypeProperty, useCreateIlogLogbookProperty } from "./useCreateIlogTypeProperty";
import { useCreateSpace } from "../space/useCreateSpace";
import { useCreateProject } from "../project/useCreateProject";
import {
  ILOG_BASE_TYPES_VOCABULARY,
  LOGBOOK_ENTRY_TYPE_DEFINITION,
  LOGBOOK_ENTRY_TYPES,
  iLogID,
  componentCollectionID,
  componentCollectionName,
  instrumentCollectionID,
  instrumentCollectionName,
  logbookCollectionID,
  logbookCollectionName,
} from "./common";
import { getCurrentLabID, setIsInitializing, getIsInitializing } from "./environment";
import { useCreateCollection } from "../collection/useCreateCollection";
import { fetchElnSettings } from "../eln/useGetElnSettings";
import { useUpdateElnSettings } from "../eln/useUpdateElnSettings";
import { useCreateObjectType } from "../type/useCreateObjectType";
import { useCreateVocabulary } from "../vocabulary/useCreateVocabulary";
import { useState } from "react";
import { ALL_OBJECT_TYPES_QUERY_PREFIX } from "../type/useGetAllObjectTypes";
import { useGetObjectType } from "../type/useGetObjectType";
import { useGetInit } from "./useGetInit";
import { useContext } from "react";
import { AuthContext } from "../../context/auth/authContext";

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
  const { apiFacade } = useContext(AuthContext);
  const labID = getCurrentLabID();
  const InitAlreadyDone = useGetInit();
  const iLogPropertyCreation = useCreateIlogTypeProperty();
  const iLogLogbookPropertyCreation = useCreateIlogLogbookProperty();
  const spaceCreation = useCreateSpace(labID, "ilog Space");
  const projectCreation = useCreateProject(labID, iLogID, "iLog Project");
  const collectionComponentCreation = useCreateCollection(
    labID,
    iLogID,
    componentCollectionID,
    componentCollectionName,
    "COLLECTION"
  );
  const collectionInstrumentCreation = useCreateCollection(
    labID,
    iLogID,
    instrumentCollectionID,
    instrumentCollectionName, 
    "COLLECTION"
  );
  const collectionLogbookCreation = useCreateCollection(
    labID,
    iLogID,
    logbookCollectionID,
    logbookCollectionName,
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

  const objectTypeChecks = new Map(
    [
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
      // Set initialization flag to allow ELN settings modifications
      setIsInitializing(true);

      if (!InitAlreadyDone.isSuccess || !InitAlreadyDone.data.init ) {
        //By using await and mutateAsync,  we force the order of execution

        emitMessage("Initializing inventory space...", spaceCreation.status);
        await spaceCreation.mutateAsync();
        
        // Fetch fresh ELN settings after space creation and add to inventory if initializing
        const freshSettings = await fetchElnSettings(apiFacade);
        if (freshSettings && getIsInitializing()) {
          // Only update ELN settings during initialization
          const currentInventorySpaces = freshSettings.inventorySpaces ?? [];
          if (!currentInventorySpaces.includes(labID)) {
            freshSettings.inventorySpaces = [
              ...currentInventorySpaces,
              labID,
            ];
            console.log("Adding space to inventorySpaces:", labID);
            await updateElnSettings.mutateAsync({ newSettings: freshSettings });
          } else {
            console.log("Space already in inventorySpaces:", labID);
          }
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

        // for (const [objectTypeDefinition, requestResult] of objectTypeChecks) {
        //   if (await requestResult.refetch().then(res => res.data) === undefined) {
        //     await createObjects.mutateAsync({ definition: objectTypeDefinition });
        //     emitMessage(`${objectTypeDefinition.code} type initialized.`, createObjects.status);
        //   }
        // }
      }
    },
    onSuccess: () => {
      console.log("iLog initialization completed.");
      emitMessage("iLog initialization completed.", "success");
      setProgress();
      setIsInitializing(false); // Clear initialization flag
      queryClient.invalidateQueries({
        queryKey: [
          ALL_OBJECT_TYPES_QUERY_PREFIX
        ],
      });
    },
    onError: (error) => {
      console.error(error);
      emitMessage(error.message, "error");
      setIsInitializing(false); // Clear initialization flag on error
    },
  });
  return {
    ...mut,
    progress,
    message,
  };
};
