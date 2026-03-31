import openbis from "@openbis/openbis.esm";
import { iLogID } from "../shared/common";
import {
  createObjectTypeSettingsDefinition,
  deleteObjectTypeSettingsDefinition,
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
 * Get all object types with the iLog base type property and apply filtering by code if search field is provided.
 * @param api - The OpenBIS JavaScript facade instance.
 * @param search - The search string to filter types by code.
 * @returns A promise that resolves to an array of SampleType objects.
 */
export async function getObjectTypes(
  api: openbis.OpenBISJavaScriptFacade,
  search: string = ""
): Promise<openbis.SampleType[]> {
  const sc = new openbis.SampleTypeSearchCriteria();

  if (search && search.trim()) {
    sc.withCode().thatStartsWith(search.toUpperCase());
  }

  sc.withPropertyAssignments().withPropertyType().withCode().thatEquals(iLogID);
  const fo = createObjectTypeFetchOptions();
  
  const result = await api.searchSampleTypes(sc, fo);
  return result.getObjects();
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

/**
 * Create a new object type and automatically enable it in ELN settings.
 * @param api - The OpenBIS JavaScript facade instance.
 * @param otd - The object type definition.
 */
export async function createObjectType(
  api: openbis.OpenBISJavaScriptFacade,
  otd: ObjectTypeDefinition
): Promise<void> {
  const existingPropertyTypes = await getPropertyTypes(api);
  const existingObjectTypes = await getObjectTypes(api);
  const creations = convertObjectTypeDefinitionToOperations(otd);

  const filteredPropertyTypeCreations = creations.propertyTypeCreations?.filter(
    (creation) => {
      // Check if there is no element in existingPropertyTypes with the same code as the current creation
      return !existingPropertyTypes.some((type) => type.code === creation.getCode());
    }
  );
  const filteredObjectTypeCreations = creations.objectTypeCreations?.filter(
    (creation) => {
      // Check if there is no element in existingObjectTypes with the same code as the current creation
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
  await createObjectTypeSettingsDefinition(api, otd.code);
}

/**
 * Update an existing object type and automatically update its settings in ELN.
 * @param api - The OpenBIS JavaScript facade instance.
 * @param otd - The object type definition.
 * @param typeId - The ID of the type to update.
 */
export async function updateObjectType(
  api: openbis.OpenBISJavaScriptFacade,
  otd: ObjectTypeDefinition
): Promise<void> {
  const existingPropertyTypes = await getPropertyTypes(api);
  const existingObjectTypes = await getObjectTypes(api);
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
  await createObjectTypeSettingsDefinition(api, otd.code);
}

/**
 * Delete an object type and automatically disable the type in ELN settings.
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
  await deleteObjectTypeSettingsDefinition(api, typeId.getPermId());
}
