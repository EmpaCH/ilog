import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateObject } from './objectAPI';
import { useContext } from 'react';
import { AuthContext } from '../../context/auth/authContext';
import { GET_ALL_ILOG_OBJECTS_QUERY_PREFIX } from './useGetIlogObjects';
import { GET_ALL_OBJECTS_QUERY_PREFIX } from './useGetAllObjects';
import { GET_ALL_OBJECTS_OF_TYPE_QUERY_PREFIX } from './useGetObjectsOfType';
import openbis from "@openbis/openbis.esm";

const UPDATE_OBJECT_WITH_COMPONENTS_MUTATION_KEY = "UPDATE_OBJECT_WITH_COMPONENTS_MUTATION_KEY";

interface UpdateObjectWithComponentLocationsParams {
  sampleId: openbis.ISampleId;
  properties: { [key: string]: any };
  objectCode: string;
  previousProperties?: { [key: string]: any };
}

export const useUpdateObjectWithComponentLocations = () => {
  const { apiFacade } = useContext(AuthContext);
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [UPDATE_OBJECT_WITH_COMPONENTS_MUTATION_KEY],
    mutationFn: async ({
      sampleId,
      properties,
      objectCode,
      previousProperties = {},
    }: UpdateObjectWithComponentLocationsParams) => {
      // First, update the main object
      const mainObjectResult = await updateObject(apiFacade, sampleId, properties);
      // Find component list properties that have changed
      const componentUpdates: Array<{ componentPermId: string; shouldSetLocation: boolean }> = [];

      for (const [propertyKey, newValue] of Object.entries(properties)) {
        const oldValue = previousProperties[propertyKey];

        // Check if this is a component list property (contains permIds)
        if (isComponentListProperty(newValue) || isComponentListProperty(oldValue)) {
          const oldComponents = normalizeToArray(oldValue);
          const newComponents = normalizeToArray(newValue);

          // Find added components (should set location)
          const addedComponents = newComponents.filter(comp => !oldComponents.includes(comp));
          addedComponents.forEach(permId => {
            componentUpdates.push({ componentPermId: permId, shouldSetLocation: true });
          });

          // Find removed components (should clear location)
          const removedComponents = oldComponents.filter(comp => !newComponents.includes(comp));
          removedComponents.forEach(permId => {
            componentUpdates.push({ componentPermId: permId, shouldSetLocation: false });
          });
        }
      }

      // Update component locations (don't let component update failures affect main object update)
      try {
        const componentUpdatePromises = componentUpdates.map(async ({ componentPermId, shouldSetLocation }) => {
          try {
            // Create a sample ID from the permId
            const componentSampleId = new openbis.SamplePermId(componentPermId);
            // Update the component's LOCATION property
            const locationValue = shouldSetLocation ? objectCode : undefined;
            await updateObject(apiFacade, componentSampleId, {
              LOCATION: locationValue,
            });
          } catch (error) {
            console.warn(`Failed to update location for component ${componentPermId}:`, error);
            // Don't rethrow - continue with other components
          }
        });
        // Wait for all component updates to complete
        await Promise.all(componentUpdatePromises);
      } catch (error) {
        console.warn('Error during component updates:', error);
        // Don't rethrow - main object update should still succeed
      }
      return mainObjectResult;
    },
    onSuccess: async (_data, variables) => {
      // Force refetch the specific object query
      await queryClient.refetchQueries({ queryKey: [variables.objectCode] });
      // Invalidate all object queries to refresh data
      queryClient.invalidateQueries({ queryKey: [GET_ALL_ILOG_OBJECTS_QUERY_PREFIX] });
      await queryClient.refetchQueries({ queryKey: [GET_ALL_ILOG_OBJECTS_QUERY_PREFIX] });
      queryClient.invalidateQueries({ queryKey: [GET_ALL_OBJECTS_QUERY_PREFIX] });
      queryClient.invalidateQueries({ queryKey: [GET_ALL_OBJECTS_OF_TYPE_QUERY_PREFIX] });
    }
  });
};

// Helper functions
function isComponentListProperty(value: any): boolean {
  if (!value) return false;
  
  // Single permId - should be a string with a specific format (timestamp-number)
  if (typeof value === 'string') {
    // Check if it looks like a permId (has timestamp format followed by dash and number)
    // PermIds typically look like: 20251028024642022-252
    const permIdPattern = /^\d{17}-\d+$/;
    return permIdPattern.test(value);
  }
  
  // Array of permIds
  if (Array.isArray(value) && value.length > 0) {
    return value.every(item => {
      if (typeof item !== 'string') return false;
      const permIdPattern = /^\d{17}-\d+$/;
      return permIdPattern.test(item);
    });
  }
  
  return false;
}

function normalizeToArray(value: any): string[] {
  if (!value) return [];
  if (typeof value === 'string') {
    // Only include if it looks like a permId
    const permIdPattern = /^\d{17}-\d+$/;
    return permIdPattern.test(value) ? [value] : [];
  }
  if (Array.isArray(value)) {
    return value.filter(item => {
      if (typeof item !== 'string') return false;
      const permIdPattern = /^\d{17}-\d+$/;
      return permIdPattern.test(item);
    });
  }
  return [];
}