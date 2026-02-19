import { useCallback } from "react";
import openbis from "@openbis/openbis.esm";
import {
  componentCollectionID,
  instrumentCollectionID,
  labID,
  iLogID,
} from "../shared/environment";
import { fetchElnSettings } from "../eln/useGetElnSettings";
import { useUpdateElnSettings } from "../eln/useUpdateElnSettings";

interface UseExportImportObjectsProps {
  apiFacade: any;
}

export const useExportImportObjects = ({
  apiFacade,
}: UseExportImportObjectsProps) => {
  const updateElnSettings = useUpdateElnSettings();

  const exportObjects = useCallback(async () => {
    try {
      const sc = new openbis.SampleSearchCriteria();
      const fo = new openbis.SampleFetchOptions();
      fo.withProperties();
      fo.withType();
      fo.withExperiment();

      const result = await apiFacade.searchSamples(sc, fo);
      const allObjects = result.getObjects();

      // Filter objects to only include those from Components and Instruments collections
      const filteredObjects = allObjects.filter((obj: any) => {
        const experimentCode = obj.getExperiment()?.getCode();
        return (
          experimentCode === componentCollectionID ||
          experimentCode === instrumentCollectionID
        );
      });

      const exportData = {
        objects: filteredObjects.map((obj: any) => ({
          code: obj.getCode(),
          permId: obj.getPermId().getPermId(),
          type: obj.getType().getCode(),
          properties: obj.getProperties(),
          experimentIdentifier: obj.getExperiment()?.getIdentifier()?.getIdentifier() || null,
        })),
      };

      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `objects-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error exporting objects:", err);
      throw err;
    }
  }, [apiFacade]);

  const exportAdministrativeData = useCallback(async () => {
    try {
      const adminSpace = "LAB205_ADMINISTRATIVE";
      let allObjects: any[] = [];

      try {
        const sc = new openbis.SampleSearchCriteria();
        const fo = new openbis.SampleFetchOptions();

        sc.withSpace().withCode().thatEquals(adminSpace);
        fo.withExperiment();
        fo.withProperties();
        fo.withType();

        const result = await apiFacade.searchSamples(sc, fo);
        allObjects = result.getObjects();

      } catch (err) {
        console.warn(`Warning: Could not fetch from ${adminSpace}:`, err);
      }

      const exportData = {
        administrative: allObjects.map((obj: any) => ({
          code: obj.getCode(),
          type: obj.getType().getCode(),
          properties: {
            ...obj.getProperties(),
            permId: obj.getPermId().getPermId(),
          },
          experimentIdentifier: obj.getExperiment()?.getIdentifier()?.getIdentifier() || null,
        })),
      };

      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `administrative-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error exporting administrative data:", err);
      throw err;
    }
  }, [apiFacade]);

  // Helper function to extract unknown permIds from error messages
  const extractUnknownPermIds = (errorMessage: string): string[] => {
    const unknownPermIds: string[] = [];
    
    // Look for "Unknown sample: PERMID" pattern
    const unknownSamplePattern = /Unknown sample: (\d{14}-\d+)/g;
    let match;
    while ((match = unknownSamplePattern.exec(errorMessage)) !== null) {
      unknownPermIds.push(match[1]);
    }
    
    // Also look for general permId patterns in error messages
    const permIdPattern = /\b(\d{14}-\d+)\b/g;
    while ((match = permIdPattern.exec(errorMessage)) !== null) {
      if (!unknownPermIds.includes(match[1])) {
        unknownPermIds.push(match[1]);
      }
    }
    
    return unknownPermIds;
  };

  // Helper to update permId references in strings
  const updatePermIdReferences = (value: string, permIdMapping: { [key: string]: string }) => {
    let result = value;
    const notFoundPermIds: string[] = [];
    
    // Find all permId patterns in the value
    const permIdPattern = /\b\d{14}-\d+\b/g;
    const matches = value.match(permIdPattern);
    
    if (matches) {
      for (const match of matches) {
        if (permIdMapping[match]) {
          const escapedPermId = match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          result = result.replace(new RegExp(escapedPermId, 'g'), permIdMapping[match]);
        } else {
          notFoundPermIds.push(match);
        }
      }
      
      // Log missing permIds for debugging
      if (notFoundPermIds.length > 0) {
        console.log(`Warning: Could not map permIds: ${notFoundPermIds.join(', ')} in value: ${value}`);
      }
    }
    
    return result;
  };

  // Get administrative permId mapping from session storage (built during administrative import)
  const getAdministrativePermIdMapping = async (onProgress: (msg: string) => void): Promise<{ [oldPermId: string]: string }> => {
    onProgress('Getting administrative permId mapping...');
    
    try {
      // Try to get the mapping from session storage first (from recent administrative import)
      const storedMapping = sessionStorage.getItem('administrativePermIdMapping');
      if (storedMapping) {
        const mapping = JSON.parse(storedMapping);
        onProgress(`Found ${Object.keys(mapping).length} administrative permId mappings from recent import`);
        return mapping;
      }
      
      onProgress('No administrative mapping found. Import administrative data first.');
      return {};
      
    } catch (error) {
      onProgress(`Error getting administrative permId mapping: ${error}`);
      return {};
    }
  };

  // Build permId mapping from existing objects
  const buildPermIdMapping = async (objects: any[], onProgress: (msg: string) => void) => {
    const oldPermIdToNewPermId: { [oldPermId: string]: string } = {};
    
    for (const objData of objects) {
      try {
        const sc = new openbis.SampleSearchCriteria();
        sc.withCode().thatEquals(objData.code);
        const fo = new openbis.SampleFetchOptions();
        const result = await apiFacade.searchSamples(sc, fo);

        if (result.getTotalCount() > 0) {
          const existingObject = result.getObjects()[0];
          const currentPermId = existingObject.getPermId().getPermId();
          const oldPermId = objData.properties?.permId || objData.permId;
          
          if (oldPermId && oldPermId !== currentPermId) {
            oldPermIdToNewPermId[oldPermId] = currentPermId;
          }
        }
      } catch (err) {
        // Ignore errors, object probably doesn't exist yet
      }
    }
    
    return oldPermIdToNewPermId;
  };

  // Create sample with properties, updating permId references
  const createSampleWithProperties = async (
    objData: any, 
    spacePermId: openbis.SpacePermId, 
    experimentPermId?: openbis.ExperimentPermId,
    projectPermId?: openbis.ProjectPermId,
    permIdMapping: { [key: string]: string } = {}
  ) => {
    const creation = new openbis.SampleCreation();
    creation.setTypeId(new openbis.EntityTypePermId(objData.type, "SAMPLE"));
    creation.setCode(objData.code);
    creation.setSpaceId(spacePermId);
    
    if (experimentPermId) {
      creation.setExperimentId(experimentPermId);
    }
    if (projectPermId) {
      creation.setProperty("ILOG", true);
      creation.setProjectId(projectPermId);
    }

    // Set properties with permId mapping
    if (objData.properties && typeof objData.properties === "object") {
      for (const [key, value] of Object.entries(objData.properties)) {
        // Skip permId property entirely - we handle this via in-memory mapping
        if (key === "permId") {
          continue;
        }
        
        const updatedValue = updatePermIdReferences(String(value), permIdMapping);
        creation.setProperty(key, updatedValue);
      }
    }

    return apiFacade.createSamples([creation]);
  };

  // Build in-memory mapping of old permIds to new permIds during administrative import
  const buildAdministrativePermIdMapping = (importedObjects: any[]): { [oldPermId: string]: string } => {
    const mapping: { [oldPermId: string]: string } = {};
    
    for (const obj of importedObjects) {
      if (obj.properties?.permId && obj.newPermId) {
        mapping[obj.properties.permId] = obj.newPermId;
      }
    }
    
    console.log(`Built administrative mapping for ${Object.keys(mapping).length} permIds`);
    return mapping;
  };

  const processErrorMessage = (error: any): { type: 'exists' | 'unknown_sample' | 'other', message: string, unknownPermId?: string } => {
    const errorMsg = error?.data?.message || String(error);
    
    if (errorMsg.includes("already exists")) {
      return { type: 'exists', message: errorMsg };
    }
    
    if (errorMsg.includes("Unknown sample:")) {
      const permIdMatch = errorMsg.match(/Unknown sample: ([\d\-,]+)/);
      if (permIdMatch) {
        const unknownPermIds = permIdMatch[1];
        console.log(`Debug: Unknown sample error for permIds: ${unknownPermIds}`);
        return { 
          type: 'unknown_sample', 
          message: errorMsg.split('.')[0],
          unknownPermId: unknownPermIds
        };
      }
    }
    
    return { type: 'other', message: errorMsg.split(/[.!?]/)[0] };
  };

  const importObjects = useCallback(
    async (
      file: File,
      onProgress: (message: string) => void
    ): Promise<{ success: number; skipped: number; failed: number }> => {
      const stats = { success: 0, skipped: 0, failed: 0 };

      try {
        const fileContent = await file.text();
        const importedFile = JSON.parse(fileContent);

        if (!importedFile.objects || !Array.isArray(importedFile.objects)) {
          throw new Error("Invalid file format: expected an object with 'objects' array");
        }

        const importedObjects = importedFile.objects;
        onProgress(`Found ${importedObjects.length} objects to import...`);

        // Get infrastructure IDs
        onProgress("Setting up infrastructure...");
        const getCollectionPermId = async (collectionCode: string): Promise<openbis.ExperimentPermId> => {
          const sc = new openbis.ExperimentSearchCriteria();
          sc.withCode().thatEquals(collectionCode);
          sc.withProject().withCode().thatEquals(iLogID);
          sc.withProject().withSpace().withCode().thatEquals(labID);
          const fo = new openbis.ExperimentFetchOptions();
          const result = await apiFacade.searchExperiments(sc, fo);

          if (result.getTotalCount() === 0) {
            throw new Error(`Collection ${collectionCode} not found`);
          }
          return result.getObjects()[0].getPermId();
        };

        const [componentPermId, instrumentPermId, spacePermId, projectPermId] = await Promise.all([
          getCollectionPermId(componentCollectionID),
          getCollectionPermId(instrumentCollectionID),
          apiFacade.searchSpaces((() => {
            const sc = new openbis.SpaceSearchCriteria();
            sc.withCode().thatEquals(labID);
            return sc;
          })(), new openbis.SpaceFetchOptions()).then((r: any) => r.getObjects()[0].getPermId()),
          apiFacade.searchProjects((() => {
            const sc = new openbis.ProjectSearchCriteria();
            sc.withCode().thatEquals(iLogID);
            sc.withSpace().withCode().thatEquals(labID);
            return sc;
          })(), new openbis.ProjectFetchOptions()).then((r: any) => r.getObjects()[0].getPermId())
        ]);

        // Separate objects by type
        const componentObjects = importedObjects.filter((obj: any) => !obj.type.startsWith("INSTRUMENT."));
        const instrumentObjects = importedObjects.filter((obj: any) => obj.type.startsWith("INSTRUMENT."));
        
        onProgress(`Processing ${componentObjects.length} components and ${instrumentObjects.length} instruments...`);

        // Get administrative permId mapping and build object mapping
        const adminPermIdMapping = await getAdministrativePermIdMapping(onProgress);
        const objectPermIdMapping = await buildPermIdMapping(importedObjects, onProgress);
        
        // Combine both mappings for property updates
        const combinedMapping = { ...adminPermIdMapping, ...objectPermIdMapping };
        
        onProgress(`Using ${Object.keys(combinedMapping).length} total permId mappings`);

        // Process components first
        for (const objData of componentObjects) {
          try {
            const collectionPermId = objData.experimentIdentifier?.includes(instrumentCollectionID) 
              ? instrumentPermId : componentPermId;
              
            await createSampleWithProperties(objData, spacePermId, collectionPermId, projectPermId, combinedMapping);
            onProgress(`Created ${objData.code}`);
            stats.success++;
            
            // Update mapping with new object
            const newPermId = await apiFacade.searchSamples((() => {
              const sc = new openbis.SampleSearchCriteria();
              sc.withCode().thatEquals(objData.code);
              return sc;
            })(), new openbis.SampleFetchOptions()).then((r: any) => 
              r.getTotalCount() > 0 ? r.getObjects()[0].getPermId().getPermId() : null
            );
            if (newPermId && objData.permId) {
              combinedMapping[objData.permId] = newPermId;
            }
          } catch (error) {
            const { type, message } = processErrorMessage(error);
            if (type === 'exists') {
              onProgress(`Skipped ${objData.code} (already exists)`);
              stats.success++;
            } else {
              onProgress(`Failed ${objData.code}: ${message}`);
              stats.failed++;
            }
          }
        }

        // Process instruments (with updated mapping)
        for (const objData of instrumentObjects) {
          try {
            await createSampleWithProperties(objData, spacePermId, instrumentPermId, projectPermId, combinedMapping);
            onProgress(`Created ${objData.code}`);
            stats.success++;
          } catch (error) {
            const { type, message } = processErrorMessage(error);
            if (type === 'exists') {
              onProgress(`Skipped ${objData.code} (already exists)`);
              stats.success++;
            } else {
              onProgress(`Failed ${objData.code}: ${message}`);
              stats.failed++;
            }
          }
        }

        onProgress(`Import complete! Successfully created ${stats.success} objects (${stats.failed} failed)`);
      } catch (err) {
        console.error("Error importing objects:", err);
        throw err;
      }
      return stats;
    },
    [apiFacade]
  );

  const importAdministrativeData = useCallback(
    async (
      file: File,
      onProgress: (message: string) => void
    ): Promise<{ success: number; skipped: number; failed: number }> => {
      const stats = { success: 0, skipped: 0, failed: 0 };

      try {
        const fileContent = await file.text();
        const importedFile = JSON.parse(fileContent);

        if (!importedFile.administrative || !Array.isArray(importedFile.administrative)) {
          throw new Error("Invalid file format: expected an object with 'administrative' array");
        }

        const adminObjects = importedFile.administrative;
        onProgress(`Found ${adminObjects.length} administrative objects to import...`);

        // Infrastructure management with caching
        const infrastructure = {
          spaces: new Map<string, openbis.SpacePermId>(),
          projects: new Map<string, openbis.ProjectPermId>(),
          experiments: new Map<string, openbis.ExperimentPermId>()
        };

        const getOrCreateInfrastructure = async (experimentIdentifier: string) => {
          const parts = experimentIdentifier.split("/").filter(p => p.length > 0);
          if (parts.length !== 3) {
            throw new Error(`Invalid experiment identifier: ${experimentIdentifier}`);
          }
          const [spaceCode, projectCode, experimentCode] = parts;

          // Get/create space
          if (!infrastructure.spaces.has(spaceCode)) {
            try {
              const result = await apiFacade.searchSpaces((() => {
                const sc = new openbis.SpaceSearchCriteria();
                sc.withCode().thatEquals(spaceCode);
                return sc;
              })(), new openbis.SpaceFetchOptions());
              
              if (result.getTotalCount() > 0) {
                infrastructure.spaces.set(spaceCode, result.getObjects()[0].getPermId());
              } else {
                onProgress(`Creating space: ${spaceCode}`);
                const permId = (await apiFacade.createSpaces([(() => {
                  const creation = new openbis.SpaceCreation();
                  creation.setCode(spaceCode);
                  return creation;
                })()]))[0];
                infrastructure.spaces.set(spaceCode, permId);

                // Update ELN settings
                const freshSettings = await fetchElnSettings(apiFacade);
                if (freshSettings) {
                  const currentInventorySpaces = freshSettings.inventorySpaces ?? [];
                  if (!currentInventorySpaces.includes(spaceCode)) {
                    freshSettings.inventorySpaces = [...currentInventorySpaces, spaceCode];
                    await updateElnSettings.mutateAsync({ newSettings: freshSettings });
                  }
                }
              }
            } catch (err) {
              throw new Error(`Failed to create space ${spaceCode}: ${err}`);
            }
          }

          // Get/create project
          const projectKey = `${spaceCode}/${projectCode}`;
          if (!infrastructure.projects.has(projectKey)) {
            const result = await apiFacade.searchProjects((() => {
              const sc = new openbis.ProjectSearchCriteria();
              sc.withCode().thatEquals(projectCode);
              sc.withSpace().withCode().thatEquals(spaceCode);
              return sc;
            })(), new openbis.ProjectFetchOptions());
            
            if (result.getTotalCount() > 0) {
              infrastructure.projects.set(projectKey, result.getObjects()[0].getPermId());
            } else {
              onProgress(`Creating project: ${projectCode}`);
              const permId = (await apiFacade.createProjects([(() => {
                const creation = new openbis.ProjectCreation();
                creation.setCode(projectCode);
                creation.setSpaceId(infrastructure.spaces.get(spaceCode)!);
                return creation;
              })()]))[0];
              infrastructure.projects.set(projectKey, permId);
            }
          }

          // Get/create experiment
          if (!infrastructure.experiments.has(experimentIdentifier)) {
            const result = await apiFacade.searchExperiments((() => {
              const sc = new openbis.ExperimentSearchCriteria();
              sc.withIdentifier().thatEquals(experimentIdentifier);
              return sc;
            })(), new openbis.ExperimentFetchOptions());
            
            if (result.getTotalCount() > 0) {
              infrastructure.experiments.set(experimentIdentifier, result.getObjects()[0].getPermId());
            } else {
              onProgress(`Creating experiment: ${experimentCode}`);
              const permId = (await apiFacade.createExperiments([(() => {
                const creation = new openbis.ExperimentCreation();
                creation.setCode(experimentCode);
                creation.setTypeId(new openbis.EntityTypePermId("COLLECTION", "EXPERIMENT"));
                creation.setProjectId(infrastructure.projects.get(projectKey)!);
                return creation;
              })()]))[0];
              infrastructure.experiments.set(experimentIdentifier, permId);
            }
          }

          return {
            spacePermId: infrastructure.spaces.get(spaceCode)!,
            experimentPermId: infrastructure.experiments.get(experimentIdentifier)!
          };
        };

        // Sort by dependencies and process in multiple passes
        const sortedObjects = adminObjects.sort((a, b) => {
          const aRefs = Object.values(a.properties || {}).filter(v => 
            typeof v === 'string' && v !== a.properties?.permId && /^\d{14}-\d+$/.test(v)
          ).length;
          const bRefs = Object.values(b.properties || {}).filter(v => 
            typeof v === 'string' && v !== b.properties?.permId && /^\d{14}-\d+$/.test(v)
          ).length;
          return aRefs - bRefs;
        });

        let remainingObjects = [...sortedObjects];

        // Build initial mapping and prepare for multi-pass processing
        let permIdMapping = await buildPermIdMapping(adminObjects, onProgress);
        
        onProgress(`Processing objects with dependency resolution...`);

        // Multi-pass processing for dependencies
        for (let pass = 1; pass <= 5 && remainingObjects.length > 0; pass++) {
          onProgress(`Pass ${pass}: Processing ${remainingObjects.length} objects...`);
          const deferredObjects: any[] = [];

          for (const objData of remainingObjects) {
            try {
              const { spacePermId, experimentPermId } = await getOrCreateInfrastructure(objData.experimentIdentifier);
              
              const result = await createSampleWithProperties(objData, spacePermId, experimentPermId, undefined, permIdMapping);
              
              // Store the new permId for mapping if this object had an old permId and creation was successful
              if (objData.properties?.permId && result && result.length > 0) {
                try {
                  // Get the permId from the created sample
                  const createdSample = result[0];
                  let newPermId: string;
                  
                  // Try different ways to get the permId depending on the OpenBIS API structure
                  if (typeof createdSample.getPermId === 'function') {
                    const permIdObj = createdSample.getPermId();
                    if (typeof permIdObj.getPermId === 'function') {
                      newPermId = permIdObj.getPermId();
                    } else if (typeof permIdObj === 'string') {
                      newPermId = permIdObj;
                    } else {
                      newPermId = String(permIdObj);
                    }
                  } else {
                    // Fallback: search for the created sample to get its permId
                    const searchResult = await apiFacade.searchSamples((() => {
                      const sc = new openbis.SampleSearchCriteria();
                      sc.withCode().thatEquals(objData.code);
                      return sc;
                    })(), new openbis.SampleFetchOptions());
                    
                    if (searchResult.getTotalCount() > 0) {
                      newPermId = searchResult.getObjects()[0].getPermId().getPermId();
                    }
                  }
                  
                  if (newPermId) {
                    objData.newPermId = newPermId;
                  }
                } catch (permIdError) {
                  console.warn(`Could not extract permId for ${objData.code}:`, permIdError);
                }
              }
              
              onProgress(`Created ${objData.code} in ${objData.experimentIdentifier}`);
              stats.success++;

              // Update mapping with newly created object
              const newPermId = await apiFacade.searchSamples((() => {
                const sc = new openbis.SampleSearchCriteria();
                sc.withCode().thatEquals(objData.code);
                return sc;
              })(), new openbis.SampleFetchOptions()).then((r: any) => 
                r.getTotalCount() > 0 ? r.getObjects()[0].getPermId().getPermId() : null
              );
              if (newPermId && objData.properties?.permId) {
                permIdMapping[objData.properties.permId] = newPermId;
              }
            } catch (error) {
              const { type, message, unknownPermId } = processErrorMessage(error);
              if (type === 'exists') {
                onProgress(`Skipped ${objData.code} (already exists)`);
                
                // For existing objects, we still need to get their current permId for mapping
                if (objData.properties?.permId) {
                  try {
                    const searchResult = await apiFacade.searchSamples((() => {
                      const sc = new openbis.SampleSearchCriteria();
                      sc.withCode().thatEquals(objData.code);
                      return sc;
                    })(), new openbis.SampleFetchOptions());
                    
                    if (searchResult.getTotalCount() > 0) {
                      const existingPermId = searchResult.getObjects()[0].getPermId().getPermId();
                      objData.newPermId = existingPermId;
                      console.log(`Mapped existing object ${objData.code}: ${objData.properties.permId} -> ${existingPermId}`);
                    }
                  } catch (searchError) {
                    console.warn(`Could not find existing object ${objData.code} for mapping:`, searchError);
                  }
                }
                
                stats.success++;
              } else if (type === 'unknown_sample' && pass < 5) {
                deferredObjects.push(objData);
                onProgress(`Deferring ${objData.code} (pass ${pass}) - ${message}`);
              } else {
                onProgress(`Failed ${objData.code}: ${message}`);
                // Log more details for debugging
                console.error(`Administrative import error for ${objData.code}:`, error);
                
                // Extract unknown permIds from error message and try to find them
                const unknownPermIds = extractUnknownPermIds(error.message || String(error));
                if (unknownPermIds.length > 0) {
                  console.log(`Attempting to find missing permIds for ${objData.code}:`, unknownPermIds);
                  
                  for (const missingPermId of unknownPermIds) {
                    try {
                      // Search by permId
                      const searchCriteria = new openbis.SampleSearchCriteria();
                      searchCriteria.withPermId().thatEquals(missingPermId);
                      const fetchOptions = new openbis.SampleFetchOptions();
                      const searchResult = await apiFacade.searchSamples(searchCriteria, fetchOptions);
                      
                      if (searchResult.getTotalCount() > 0) {
                        const foundObject = searchResult.getObjects()[0];
                        const currentPermId = foundObject.getPermId().getPermId();
                        console.log(`Found object with permId ${missingPermId} -> current permId: ${currentPermId}`);
                        // We found it but it has the same permId, so the issue is elsewhere
                      } else {
                        console.log(`No object found with permId: ${missingPermId}`);
                        
                        // Try searching by identifier pattern if we can extract it from error
                        const errorStr = error.message || String(error);
                        const identifierMatch = errorStr.match(/identifier.*?"([^"]*)/);
                        if (identifierMatch) {
                          const identifier = identifierMatch[1];
                          console.log(`Searching for object with identifier: ${identifier}`);
                          
                          const identifierSearch = new openbis.SampleSearchCriteria();
                          identifierSearch.withIdentifier().thatEquals(identifier);
                          const identifierResult = await apiFacade.searchSamples(identifierSearch, fetchOptions);
                          
                          if (identifierResult.getTotalCount() > 0) {
                            const foundObject = identifierResult.getObjects()[0];
                            const currentPermId = foundObject.getPermId().getPermId();
                            console.log(`Found object by identifier ${identifier} with current permId: ${currentPermId} (was looking for ${missingPermId})`);
                          } else {
                            console.log(`No object found with identifier: ${identifier}`);
                          }
                        }
                      }
                    } catch (searchError) {
                      console.error(`Error searching for permId ${missingPermId}:`, searchError);
                    }
                  }
                }
                
                stats.failed++;
              }
            }
          }

          remainingObjects = deferredObjects;
        }

        // Build administrative permId mapping after import
        const administrativeMapping = buildAdministrativePermIdMapping(adminObjects);
        
        onProgress(`Import complete! Successfully created ${stats.success} administrative objects (${stats.failed} failed)`);
        onProgress(`Built mapping for ${Object.keys(administrativeMapping).length} administrative permIds`);
        
        // Store the mapping for use in object import
        sessionStorage.setItem('administrativePermIdMapping', JSON.stringify(administrativeMapping));
        
      } catch (err) {
        console.error("Error importing administrative data:", err);
        throw err;
      }
      return stats;
    },
    [apiFacade, updateElnSettings]
  );

  // Enhanced import that can use administrative mapping file
  const importObjectsWithAdminFile = useCallback(
    async (
      objectFile: File,
      adminFile: File,
      onProgress: (message: string) => void
    ): Promise<{ success: number; skipped: number; failed: number }> => {
      // First, build admin mapping from the file
      onProgress("Building administrative permId mapping from file...");
      
      const adminContent = await adminFile.text();
      const adminData = JSON.parse(adminContent);
      
      if (!adminData.administrative || !Array.isArray(adminData.administrative)) {
        throw new Error("Invalid administrative file format");
      }
      
      // Create mapping: old permId -> object code (we'll resolve to current permIds later)
      const oldPermIdToCode: { [oldPermId: string]: string } = {};
      const oldPermIdToIdentifier: { [oldPermId: string]: string } = {};
      
      for (const obj of adminData.administrative) {
        const oldPermId = obj.properties?.permId;
        if (oldPermId && obj.code && obj.experimentIdentifier) {
          oldPermIdToCode[oldPermId] = obj.code;
          oldPermIdToIdentifier[oldPermId] = obj.experimentIdentifier;
        }
      }
      
      onProgress(`Found ${Object.keys(oldPermIdToCode).length} administrative objects in file`);
      
      // Now resolve to current permIds by searching for existing objects
      const adminMapping: { [oldPermId: string]: string } = {};
      
      for (const [oldPermId, code] of Object.entries(oldPermIdToCode)) {
        try {
          const identifier = oldPermIdToIdentifier[oldPermId];
          const sc = new openbis.SampleSearchCriteria();
          sc.withCode().thatEquals(code);
          sc.withExperiment().withIdentifier().thatEquals(identifier);
          
          const fo = new openbis.SampleFetchOptions();
          const result = await apiFacade.searchSamples(sc, fo);
          
          if (result.getTotalCount() > 0) {
            const currentPermId = result.getObjects()[0].getPermId().getPermId();
            adminMapping[oldPermId] = currentPermId;
          }
        } catch (err) {
          // Ignore, object probably doesn't exist yet
        }
      }
      
      onProgress(`Resolved ${Object.keys(adminMapping).length} administrative mappings`);
      
      // Now import objects with this mapping
      return importObjectsWithMapping(objectFile, adminMapping, onProgress);
    },
    [apiFacade]
  );

  // Helper function to import objects with a given mapping
  const importObjectsWithMapping = useCallback(
    async (
      objectFile: File,
      adminMapping: { [key: string]: string },
      onProgress: (message: string) => void
    ): Promise<{ success: number; skipped: number; failed: number }> => {
      const stats = { success: 0, skipped: 0, failed: 0 };

      try {
        const fileContent = await objectFile.text();
        const importedFile = JSON.parse(fileContent);

        if (!importedFile.objects || !Array.isArray(importedFile.objects)) {
          throw new Error("Invalid file format: expected an object with 'objects' array");
        }

        const importedObjects = importedFile.objects;
        onProgress(`Found ${importedObjects.length} objects to import...`);

        // Get infrastructure IDs (same as before)
        onProgress("Setting up infrastructure...");
        const getCollectionPermId = async (collectionCode: string): Promise<openbis.ExperimentPermId> => {
          const sc = new openbis.ExperimentSearchCriteria();
          sc.withCode().thatEquals(collectionCode);
          sc.withProject().withCode().thatEquals(iLogID);
          sc.withProject().withSpace().withCode().thatEquals(labID);
          const fo = new openbis.ExperimentFetchOptions();
          const result = await apiFacade.searchExperiments(sc, fo);

          if (result.getTotalCount() === 0) {
            throw new Error(`Collection ${collectionCode} not found`);
          }
          return result.getObjects()[0].getPermId();
        };

        const [componentPermId, instrumentPermId, spacePermId, projectPermId] = await Promise.all([
          getCollectionPermId(componentCollectionID),
          getCollectionPermId(instrumentCollectionID),
          apiFacade.searchSpaces((() => {
            const sc = new openbis.SpaceSearchCriteria();
            sc.withCode().thatEquals(labID);
            return sc;
          })(), new openbis.SpaceFetchOptions()).then((r: any) => r.getObjects()[0].getPermId()),
          apiFacade.searchProjects((() => {
            const sc = new openbis.ProjectSearchCriteria();
            sc.withCode().thatEquals(iLogID);
            sc.withSpace().withCode().thatEquals(labID);
            return sc;
          })(), new openbis.ProjectFetchOptions()).then((r: any) => r.getObjects()[0].getPermId())
        ]);

        // Separate objects by type
        const componentObjects = importedObjects.filter((obj: any) => !obj.type.startsWith("INSTRUMENT."));
        const instrumentObjects = importedObjects.filter((obj: any) => obj.type.startsWith("INSTRUMENT."));
        
        onProgress(`Processing ${componentObjects.length} components and ${instrumentObjects.length} instruments...`);

        // Get administrative permId mapping and build object mapping
        const adminPermIdMapping = await getAdministrativePermIdMapping(onProgress);
        const objectPermIdMapping = await buildPermIdMapping(importedObjects, onProgress);
        
        // Combine both mappings for property updates
        const combinedMapping = { ...adminPermIdMapping, ...objectPermIdMapping };
        
        onProgress(`Using ${Object.keys(combinedMapping).length} total permId mappings`);

        // Process components first
        for (const objData of componentObjects) {
          try {
            const collectionPermId = objData.experimentIdentifier?.includes(instrumentCollectionID) 
              ? instrumentPermId : componentPermId;
              
            await createSampleWithProperties(objData, spacePermId, collectionPermId, projectPermId, combinedMapping);
            onProgress(`Created ${objData.code}`);
            stats.success++;
            
            // Update mapping with new object
            const newPermId = await apiFacade.searchSamples((() => {
              const sc = new openbis.SampleSearchCriteria();
              sc.withCode().thatEquals(objData.code);
              return sc;
            })(), new openbis.SampleFetchOptions()).then((r: any) => 
              r.getTotalCount() > 0 ? r.getObjects()[0].getPermId().getPermId() : null
            );
            if (newPermId && objData.permId) {
              combinedMapping[objData.permId] = newPermId;
            }
          } catch (error) {
            const { type, message } = processErrorMessage(error);
            if (type === 'exists') {
              onProgress(`Skipped ${objData.code} (already exists)`);
              stats.success++;
            } else {
              onProgress(`Failed ${objData.code}: ${message}`);
              stats.failed++;
            }
          }
        }

        // Process instruments (with updated mapping)
        for (const objData of instrumentObjects) {
          try {
            await createSampleWithProperties(objData, spacePermId, instrumentPermId, projectPermId, combinedMapping);
            onProgress(`Created ${objData.code}`);
            stats.success++;
          } catch (error) {
            const { type, message } = processErrorMessage(error);
            if (type === 'exists') {
              onProgress(`Skipped ${objData.code} (already exists)`);
              stats.success++;
            } else {
              onProgress(`Failed ${objData.code}: ${message}`);
              stats.failed++;
            }
          }
        }

        onProgress(`Import complete! Successfully created ${stats.success} objects (${stats.failed} failed)`);
      } catch (err) {
        console.error("Error importing objects:", err);
        throw err;
      }
      return stats;
    },
    [apiFacade]
  );

  return { 
    exportObjects, 
    exportAdministrativeData, 
    importObjects, 
    importAdministrativeData,
    importObjectsWithAdminFile
  };
};