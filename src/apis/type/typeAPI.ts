import openbis from "@openbis/openbis.esm";
import {
  convertObjectTypeDefinitionToOperations,
  convertCreationsToOperations,
  convertPropertyTypesSchemaToUpdateOperations,
  convertObjectTypeDefinitionToUpdateOperations
} from "./helpersTypeAPI";
import {
  ObjectTypeDefinition,
  PropertyTypesSchema,
} from "./commonType";
import { getPropertyTypes } from "../propertyType/propertyTypeAPI";
import {
  categoryMetadataKey,
  getTypeCategory,
  legacyCategoryMetadataKey,
} from "../shared/category";

export function createObjectTypeFetchOptions(): openbis.SampleTypeFetchOptions {
  const fo = new openbis.SampleTypeFetchOptions();
  const ao = new openbis.PropertyAssignmentFetchOptions();
  const po = new openbis.PropertyTypeFetchOptions();
  po.withSampleType();
  po.withVocabulary();

  ao.withEntityType();
  ao.withPropertyTypeUsing(po);
  fo.withPropertyAssignmentsUsing(ao);

  // If you need to access validation plugins or other metadata
  fo.withValidationPlugin();
  return fo;
}

/**
 * Get all object types and apply filtering by code if search field is provided.
 * @param api - The OpenBIS JavaScript facade instance.
 * @param search - The search string to filter types by code.
 * @returns A promise that resolves to an array of SampleType objects.
 */
export async function getAllObjectTypes(
  api: openbis.OpenBISJavaScriptFacade,
  search: string = ""
): Promise<openbis.SampleType[]> {
  const sc = new openbis.SampleTypeSearchCriteria();
  if (search && search.trim()) {
    sc.withCode().thatStartsWith(search.toUpperCase());
  }
  const fo = createObjectTypeFetchOptions();
  const result = await api.searchSampleTypes(sc, fo);
  return result.getObjects();
}


/**
 * Get all iLog object types (instrument, component and logbook entry types) and apply filtering by code if search field is provided.
 * @param api - The OpenBIS JavaScript facade instance.
 * @param search - The search string to filter types by code.
 * @returns A promise that resolves to an array of SampleType objects.
 */
export async function getIlogObjectTypes(
  api: openbis.OpenBISJavaScriptFacade,
  search: string = ""
): Promise<openbis.SampleType[]> {
  const allTypes = await getAllObjectTypes(api, search);
  return allTypes.filter((type) => getTypeCategory(type) !== "");
}

/**
 * Get a specific object type with requested permId.
 * @param api - The OpenBIS JavaScript facade instance.
 * @param permId - The permId to search for.
 * @returns A promise that resolves to a SampleType object.
 */
export async function getObjectType(
  api: openbis.OpenBISJavaScriptFacade,
  permId: string,
): Promise<openbis.SampleType | undefined> {
  const sc = new openbis.SampleTypeSearchCriteria();
  sc.withCode().thatEquals(permId);
  const fo = createObjectTypeFetchOptions();
  const result = await api.searchSampleTypes(sc, fo);
  return result.getObjects()[0];
}

// /**
//  * Create a new object type and automatically enable it in ELN settings.
//  * @param api - The OpenBIS JavaScript facade instance.
//  * @param otd - The object type definition.
//  */
// export async function createObjectType(
//   api: openbis.OpenBISJavaScriptFacade,
//   otd: ObjectTypeDefinition
// ): Promise<void> {
//   const existingPropertyTypes = await getPropertyTypes(api);
//   const existingObjectTypes = await getAllObjectTypes(api);
//   const creations = convertObjectTypeDefinitionToOperations(otd);

//   const filteredPropertyTypeCreations = creations.propertyTypeCreations?.filter(
//     (creation) => {
//       // Check if there is no element in existingPropertyTypes with the same code as the current creation
//       return !existingPropertyTypes.some((type) => type.code === creation.getCode());
//     }
//   );
//   const filteredObjectTypeCreations = creations.objectTypeCreations?.filter(
//     (creation) => {
//       // Check if there is no element in existingObjectTypes with the same code as the current creation
//       return !existingObjectTypes.some((type) => type.getCode() === creation.getCode());
//     }
//   );

//   const ops = convertCreationsToOperations({
//     propertyTypeCreations: filteredPropertyTypeCreations,
//     objectTypeCreations: filteredObjectTypeCreations,
//   });
//   const props = new openbis.SynchronousOperationExecutionOptions();
//   props.setExecuteInOrder(true);
//   await api.executeOperations(ops, props);
// }

/**
 * Update an existing object type, creating property types it uses that do not exist yet.
 * @param api - The OpenBIS JavaScript facade instance.
 * @param otd - The object type definition.
 * @param typeId - The ID of the type to update.
 */
export async function updateObjectType(
  api: openbis.OpenBISJavaScriptFacade,
  otd: ObjectTypeDefinition
): Promise<void> {
  const existingPropertyTypes = await getPropertyTypes(api);
  const existingObjectTypes = await getAllObjectTypes(api);
  const creations = convertObjectTypeDefinitionToOperations(otd);

  // First Create non existing property types and object types
  const filteredPropertyTypeCreations = creations.propertyTypeCreations?.filter(
    (creation) => {
      // Check if there is an element in existingPropertyTypes with the same code as the current creation
      return !existingPropertyTypes.some((type) => type.code === creation.getCode());
    }
  );
  const filteredObjectTypeCreations = creations.objectTypeCreations?.filter(
    (creation) => {
      // Check if there is an element in existingObjectTypes with the same code as the current creation
      return !existingObjectTypes.some((type) => type.getCode() === creation.getCode());
    }
  );

  const ops = convertCreationsToOperations({
    propertyTypeCreations: filteredPropertyTypeCreations,
    objectTypeCreations: filteredObjectTypeCreations,
  });
  const props = new openbis.SynchronousOperationExecutionOptions();
  props.setExecuteInOrder(true);
  await api.executeOperations(ops, props);

  // Then update the existing property types 
  const updatePropOps = convertPropertyTypesSchemaToUpdateOperations(
    otd.propertyTypes as PropertyTypesSchema, existingPropertyTypes);
  if (updatePropOps.length > 0) {
    const propertyUpdateOperation = new openbis.UpdatePropertyTypesOperation(updatePropOps);
    await api.executeOperations([propertyUpdateOperation], props);
  }

  // Finally update the object type
  const updateOps = convertObjectTypeDefinitionToUpdateOperations(
    otd, existingObjectTypes);
  if (updateOps.length > 0) {
    const sampleTypeUpdateOperation = new openbis.UpdateSampleTypesOperation(updateOps);
    await api.executeOperations([sampleTypeUpdateOperation], props);
  }
}

/**
 * Delete an object type.
 * @param api - The OpenBIS JavaScript facade instance.
 * @param typeId - The ID of the type to delete.
 */
export async function deleteObjectType(
  api: openbis.OpenBISJavaScriptFacade,
  typeId: openbis.EntityTypePermId
): Promise<void> {
  const stdo = new openbis.SampleTypeDeletionOptions();
  stdo.setReason("Type no longer needed.");
  await api.deleteSampleTypes([typeId], stdo);
}

/**
 * Update an existing object type's metadata to automatically include it in iLog.
 * @param api - The OpenBIS JavaScript facade instance.
 * @param permId - The ID of the type to update.
 */
// export async function importObjectTypeToIlog(
//   api: openbis.OpenBISJavaScriptFacade,
//   permId: string,
// ): Promise<void> {
//   const sc = new openbis.SampleTypeSearchCriteria();
//   sc.withCode().thatEquals(permId);
//   const fo = createObjectTypeFetchOptions();
//   const result = await api.searchSampleTypes(sc, fo);
//   const sampleType = result.getObjects()[0];
//   if (!sampleType) return;

//   const existingMetadata: Record<string, string> = sampleType.getMetaData() ?? {};
//   const update = new openbis.SampleTypeUpdate();
//   update.setTypeId(sampleType.getPermId());
//   update.getMetaData().set([{ ...existingMetadata, ilog: "true" }]);

//   const props = new openbis.SynchronousOperationExecutionOptions();
//   props.setExecuteInOrder(true);
//   await api.executeOperations([new openbis.UpdateSampleTypesOperation([update])], props);
// }

/**
 * Remove an existing object type from iLog by removing the category keys from its metadata.
 * @param api - The OpenBIS JavaScript facade instance.
 * @param permId - The ID of the type to update.
 */
export async function removeObjectTypeFromIlog(
  api: openbis.OpenBISJavaScriptFacade,
  permId: string,
): Promise<void> {
  const sc = new openbis.SampleTypeSearchCriteria();
  sc.withCode().thatEquals(permId);
  const fo = createObjectTypeFetchOptions();
  const result = await api.searchSampleTypes(sc, fo);
  const sampleType = result.getObjects()[0];
  if (!sampleType) return;

  const existingMetadata: Record<string, string> = { ...(sampleType.getMetaData() ?? {}) };
  delete existingMetadata[categoryMetadataKey];
  delete existingMetadata[legacyCategoryMetadataKey];

  const update = new openbis.SampleTypeUpdate();
  update.setTypeId(sampleType.getPermId());
  update.getMetaData().set([existingMetadata]);

  const props = new openbis.SynchronousOperationExecutionOptions();
  props.setExecuteInOrder(true);
  await api.executeOperations([new openbis.UpdateSampleTypesOperation([update])], props);
}

/**
 * Set the iLog category of an object type.
 * @param api - The OpenBIS JavaScript facade instance.
 * @param permId - The code/permId of the type to update.
 * @param category - The category to set (e.g. "INSTRUMENT").
 */
export async function setObjectTypeCategory(
  api: openbis.OpenBISJavaScriptFacade,
  permId: string,
  category: string,
): Promise<void> {
  const sc = new openbis.SampleTypeSearchCriteria();
  sc.withCode().thatEquals(permId);
  const fo = createObjectTypeFetchOptions();
  const result = await api.searchSampleTypes(sc, fo);
  const sampleType = result.getObjects()[0];
  if (!sampleType) return;

  const existingMetadata: Record<string, string> = { ...(sampleType.getMetaData() ?? {}) };
  delete existingMetadata[legacyCategoryMetadataKey];
  const update = new openbis.SampleTypeUpdate();
  update.setTypeId(sampleType.getPermId());
  update.getMetaData().set([{ ...existingMetadata, [categoryMetadataKey]: category }]);

  const props = new openbis.SynchronousOperationExecutionOptions();
  props.setExecuteInOrder(true);
  await api.executeOperations([new openbis.UpdateSampleTypesOperation([update])], props);
}
