import { useContext } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createLogbookEntry } from './LogbookEntryAPI';
import { AuthContext } from '../../context/auth/authContext';
import { useGetSpace } from "../space/useGetSpace";
import { useGetProject } from "../project/useGetProject";
import { useGetCollection } from "../collection/useGetCollection";
import { iLogID, labID, logbookCollectionID } from "../shared/common";

export const useCreateLogbookEntry = () => {
  const { apiFacade } = useContext(AuthContext);

  const space = useGetSpace(labID);
  const project = useGetProject(labID, iLogID);
  const collection = useGetCollection(labID, iLogID, logbookCollectionID);

  return useMutation({
    mutationFn: ({
      type,
      code,
      properties,
    }: {
      type: string;
      code: string;
      properties: object;
    }) => {
      if (!space.data || !project.data || !collection.data) {
        console.error('Error: Missing required data for space, project, or collection.');
        return Promise.reject(new Error('Missing required space, project, or collection.'));
      }

      return createLogbookEntry(
        apiFacade,
        type,
        code,
        properties,
        space.data.getPermId(),
        project.data.getPermId(),
        collection.data.getPermId(),
      );
    },
  });
};
