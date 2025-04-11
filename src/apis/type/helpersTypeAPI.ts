import openbis from "@openbis/openbis.esm";
import {
  parseElnSettingsProperties,
  updateElnSettings,
  newTypeSettings,
} from "../shared/common";
import {
  PropertyTypesSchema,
  ObjectTypeDefinition,
  StructuredCreations,
} from "./commonType";
import {
  convertPropertyTypeToCreation,
  convertPropertyTypeToUpdate,
  LocalPropertyType,
  PropertyAssignment,
  PropertyType,
} from "../propertyType/commonPropertyType";
import { getPropertyTypeId } from "../propertyType/commonPropertyType";

export function flattenObjectSchema(schema: PropertyTypesSchema) {
  return Object.values(schema).flat();
}

/**
 * Update ELN settings to automatically enable an object type upon creation.
 * @param api - The OpenBIS JavaScript facade instance.
 * @param typeName - The name of the object type to enable.
 */
export async function createObjectTypeSettingsDefinition(
  api: openbis.OpenBISJavaScriptFacade,
  typeName: string
): Promise<void> {
  // Parse existing ELN settings properties
  var properties = await parseElnSettingsProperties(api);
  // Expand the settings with the appropriate properties for enabling the new type
    properties.sampleTypeDefinitionsExtension = {
      ...properties.sampleTypeDefinitionsExtension,
      [typeName]: newTypeSettings,
    };
  // Update the ELN settings with the new properties
  await updateElnSettings(api, properties);
}

/**
 * Delete object type from ELN settings upon its deletion.
 * @param api - The OpenBIS JavaScript facade instance.
 * @param typeName - The name of the object type to disable.
 */
export async function deleteObjectTypeSettingsDefinition(
  api: openbis.OpenBISJavaScriptFacade,
  typeName: string
): Promise<void> {
  // Parse existing ELN settings properties
  var properties = await parseElnSettingsProperties(api);
  // Remove the specified object type from the settings
  delete properties.sampleTypeDefinitionsExtension[typeName];
  // Update the ELN settings with the modified properties
  await updateElnSettings(api, properties);
}

/**
 * Convert an object schema to property creations.
 * @param schema - The object schema to convert.
 * @returns An array of PropertyTypeCreation objects.
 */
function convertPropertyTypesSchemaToPropertyCreations(
  schema: PropertyTypesSchema
): openbis.PropertyTypeCreation[] {
  // Convert each property in the schema to a PropertyTypeCreation
  const creations = Object.entries(schema)
    .flatMap(([group, properties]) => {
      return properties.map((prop) =>
        prop ? convertPropertyTypeToCreation(prop) : null
      );
    })
    .flatMap((el) => (el ? [el] : []));
  return creations ?? [];
}

/**
 * Convert an object schema to property updates.
 * @param schema - The object schema to convert.
 * @returns An array of PropertyTypeUpdate objects.
 */
function convertPropertyTypeSchemaToPropertyUpdates(
  schema: PropertyTypesSchema
) {
  const updates = Object.entries(schema)
    .flatMap(([group, properties]) => {
      return properties.map((prop) =>
        prop ? convertPropertyTypeToUpdate(prop) : null
      );
    })
    .flatMap((el) => (el ? [el] : []));
  return updates ?? [];
}

/**
 * Convert an object schema to assignment creations.
 * @param schema - The object schema to convert.
 * @returns An array of PropertyAssignmentCreation objects.
 */
function convertPropertyTypesSchemaToAssignmentCreations(
  schema: PropertyTypesSchema
): openbis.PropertyAssignmentCreation[] {
  // Convert each property in the schema to a PropertyAssignmentCreation
  const creations = Object.entries(schema)
    .flatMap(([section, properties], index) => {
      return properties.map((prop) => {
        const creation = new openbis.PropertyAssignmentCreation();
        creation.setSection(section);
        creation.setPropertyTypeId(getPropertyTypeId(prop));
        creation.setOrdinal(index + 1);
        return creation;
      });
    })
    .filter((el) => el.getPropertyTypeId() !== null);
  return creations;
}

function filterPropertyTypeSchema(
  schema: PropertyTypesSchema,
  filter: (property: PropertyType) => boolean
) {
  const filtered = Object.entries(schema)
    .map(([group, properties]) => {
      const filteredProps = properties.filter(filter);
      return filteredProps.length > 0 ? [group, filteredProps] : [];
    })
    .filter((el) => el.length > 0);
  return filtered.length > 0
    ? (Object.fromEntries(filtered) as PropertyTypesSchema)
    : {};
}

/**
 * Convert an object type definition to creations / updates.
 * @param objectDefinition - The object type definition to convert.
 * @returns A StructuredCreations object containing property and object type creations and updates.
 */
export function convertObjectTypeDefinitionToOperations(
  objectDefinition: ObjectTypeDefinition,
  existingPropertyTypes: LocalPropertyType[],
  existingObjectTypes: ObjectTypeDefinition[],
  existingPropertyAssignments: PropertyAssignment[]
): StructuredCreations {
  //const propertyTypes = flattenObjectSchema(objectDefinition.propertyTypes);
  // Filter the property types that do not exist
  const schemaToCreate = filterPropertyTypeSchema(
    objectDefinition.propertyTypes,
    (type) => {
      return !existingPropertyTypes.some(
        (existingType) => existingType.code === type.code
      );
    }
  );
  // Extract the property types to update
  // We want to update only the property types that are assigned to the object
  // but not to other objects
  const schemaToUpdate = filterPropertyTypeSchema(
    objectDefinition.propertyTypes,
    (type) => {
      const isAssignedToCurrentObject = existingPropertyAssignments.some(
        (assignment) =>
          assignment.propertyTypeCode === type.code &&
          assignment.objectTypeCode === objectDefinition.code
      );
  
      // Check if the property type is assigned to any other object type
      const isAssignedToOtherObjects = existingPropertyAssignments.some(
        (assignment) =>
          assignment.propertyTypeCode === type.code &&
          assignment.objectTypeCode !== objectDefinition.code
      );
      return isAssignedToCurrentObject && !isAssignedToOtherObjects;
  }
  );
  // Prepare all creations of new property types
  const propertyTypeCreations = convertPropertyTypesSchemaToPropertyCreations(
    schemaToCreate ?? {}
  );
  // Update existing property types
  const propertyTypeUpdates = convertPropertyTypeSchemaToPropertyUpdates(
    schemaToUpdate ?? {}
  );
  // Prepare all assignments of property types
  const assignmentCreations = convertPropertyTypesSchemaToAssignmentCreations(
    objectDefinition.propertyTypes
  );
  // Create the object type
  let sampleTypeCreation = null;
  let sampleTypeUpdate = null;
  if (
    !existingObjectTypes.some((type) => type.code === objectDefinition.code)
  ) {
    sampleTypeCreation = new openbis.SampleTypeCreation();
    sampleTypeCreation.setCode(objectDefinition.code.toUpperCase());
    sampleTypeCreation.setAutoGeneratedCode(true);
    sampleTypeCreation.setGeneratedCodePrefix(
      objectDefinition.generatedCodePrefix.length > 0
        ? objectDefinition.generatedCodePrefix
        : objectDefinition.code.slice(0, 10)
    );
    sampleTypeCreation.setPropertyAssignments(assignmentCreations);
    sampleTypeCreation.setDescription(objectDefinition.description);
    sampleTypeCreation.setListable(true);
    sampleTypeCreation.setMetaData({type: objectDefinition.code, baseType: objectDefinition.baseType})
  } else {
    sampleTypeUpdate = new openbis.SampleTypeUpdate();
    sampleTypeUpdate.setTypeId(new openbis.EntityTypePermId(objectDefinition.code.toUpperCase()));
    sampleTypeUpdate.setDescription(objectDefinition.description);
    sampleTypeUpdate.setAutoGeneratedCode(true);
    sampleTypeUpdate.setGeneratedCodePrefix(
      objectDefinition.generatedCodePrefix.length > 0
        ? objectDefinition.generatedCodePrefix
        : objectDefinition.code.slice(0, 5)
    );
    sampleTypeUpdate.setListable(true);
    const assigmentsOps = new openbis.PropertyAssignmentListUpdateValue();
    assigmentsOps.set(assignmentCreations);
    sampleTypeUpdate.setPropertyAssignmentActions(assigmentsOps.getActions());
  }

  // Return the structured creations
  const all = {
    propertyTypeCreations: propertyTypeCreations,
    propertyTypeUpdates: propertyTypeUpdates,
    objectTypeCreations: sampleTypeCreation ? [sampleTypeCreation] : [],
    objectTypeUpdates: sampleTypeUpdate ? [sampleTypeUpdate] : [],
  };
  return all;
}

/**
 * Convert structured creations to operations.
 * @param creations - The structured creations to convert.
 * @returns An array of IOperation objects.
 */
export function convertCreationsToOperations(
  creations: StructuredCreations
): openbis.IOperation[] {
  return [
    new openbis.CreatePropertyTypesOperation(
      creations.propertyTypeCreations ?? ([] as openbis.PropertyTypeCreation[])
    ),
    new openbis.UpdatePropertyTypesOperation(
      creations.propertyTypeUpdates ?? ([] as openbis.PropertyTypeUpdate[])
    ),
    new openbis.UpdateSampleTypesOperation(
      creations.objectTypeUpdates ?? ([] as openbis.SampleTypeUpdate[])
    ),
    new openbis.CreateSampleTypesOperation(
      creations.objectTypeCreations ?? ([] as openbis.SampleTypeCreation[])
    ),
  ];
}

/**
 * Convert an object schema to assignment updates.
 * @param schema - The object schema to convert.
 * @param existingPropertyTypes - The existing property assignments to compare against.
 * @returns An array of PropertyAssignmentUpdate objects.
 */
export function convertPropertyTypesSchemaToUpdateOperations(
  schema: PropertyTypesSchema,
  existingPropertyTypes: LocalPropertyType[]
) {
  // Convert each property in the schema to a PropertyAssignmentUpdate
  const updates = Object.entries(schema)
    .flatMap(([section, properties]) => {
      return properties.map((prop: any, index) => {
        // Compare with existing property
        const existingPropertyType = existingPropertyTypes.find(
          (assignment) => assignment.code == getPropertyTypeId(prop)
        );

        if (
          !existingPropertyType ||
          (existingPropertyType.label === prop.label &&
            existingPropertyType.description === prop.description &&
            existingPropertyType.dataType === prop.dataType)
        ) {
          // No changes, skip update
          return null;
        }

        const update = new openbis.PropertyTypeUpdate();
        // update.setSchema(section);
        update.setTypeId(getPropertyTypeId(prop));
        // update.setOrdinal(index + 1);
        update.setLabel(prop.label);
        update.setDescription(prop.description);
        update.convertToDataType(prop.dataType);
        return update;
      });
    })
    .flatMap((it) => (it ? [it] : []));

  return updates;
}

/**
 * Convert an object type definition to update operations.
 * @param objectDefinition - The object type definition to convert.
 * @param existingObjectTypes - The existing object types to compare against.
 * @returns An array of IOperation objects.
 */
export function convertObjectTypeDefinitionToUpdateOperations(
  objectDefinition: ObjectTypeDefinition,
  existingObjectTypes: openbis.SampleType[]
) {
  const existingObjectType = existingObjectTypes.find(
    (type) => type.getCode() === objectDefinition.code
  );

  if (!existingObjectType) {
    // If the object type does not exist, return an empty array
    return [];
  }

  const update = new openbis.SampleTypeUpdate();
  update.setTypeId(existingObjectType.getPermId());
  update.setDescription(objectDefinition.description);
  update.setAutoGeneratedCode(true);
  update.setGeneratedCodePrefix(
    objectDefinition.generatedCodePrefix.length > 0
      ? objectDefinition.generatedCodePrefix
      : objectDefinition.code.slice(0, 10)
  );
  update.setListable(true);

  const assignmentUpdates = new openbis.PropertyAssignmentListUpdateValue();
  assignmentUpdates.set(
    convertPropertyTypesSchemaToAssignmentCreations(
      objectDefinition.propertyTypes
    )
  );
  update.setPropertyAssignmentActions(assignmentUpdates.getActions());

  return update ? [update] : [];
}
