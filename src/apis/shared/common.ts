import openbis from "@openbis/openbis.esm";
import { ObjectSchema, ObjectTypeDefinition } from "../type/commonType";
import { Vocabulary } from "../vocabulary/commonVocabulary";
import { PropertyType } from "../propertyType/commonPropertyType";

// env creation settings
// inventory space creation settings
export const customServiceCode = 'as-eln-lims-api';
export const createSpaceMethod = 'createSpace';
// sample type settings
export const propertyElnSettings = '$ELN_SETTINGS';
export const iLogID = "ILOG";
export const instrumentTypeID = "Instrument";
export const labID = "205";
export const collectionID = "EQUIPMENT";
export const elnSettings = "$ELN_SETTINGS";
export const generalElnSettings = "/ELN_SETTINGS/GENERAL_ELN_SETTINGS";
export const iLogBaseTypesPropertyCode = "ILOG_TYPE_BASE";
export const iLogBaseTypes = ["INSTRUMENT", "COMPONENT"] as const;
export const iLogBaseTypesVocabularyID = "ILOG_BASE_TYPES";
export const iLogGeneralInfoGroup = "General Info";
export const iLogLocationGroup = "Location";
export const iLogManufacturerGroup = "Manufacturer";

const iLogBaseSchema: ObjectSchema = {
  [iLogGeneralInfoGroup]: [
    { code: "$NAME", type: "reference" },
    { code: iLogID, type: "reference" },
    { code: iLogBaseTypesPropertyCode, type: "reference" },
    {
      code: "RESPONSIBLE",
      type: "local",
      multivalued: true,
      dataType: "VARCHAR",
      label: "Responsible",
      description: "Responsible",
    },
    {
      code: "SERIALNUMBER",
      label: "Serial number",
      description: "Serial number",
      dataType: "VARCHAR",
      type: "local",
      multivalued: false,
    },
    {
      code: "EMPAID",
      dataType: "VARCHAR",
      label: "Empa ID",
      description: "Empa ID",
      type: "local",
      multivalued: false,
    },
  ],
  [iLogLocationGroup]: [
    {
      code: "LOCATION",
      dataType: "VARCHAR",
      label: "Location",
      description: "Location",
      type: "local",
      multivalued: false,
    },
  ],
  [iLogManufacturerGroup]: [
    {
      code: "MANUFACTURER",
      label: "Manufacturer",
      description: "Manufacturer",
      dataType: "VARCHAR",
      type: "local",
      multivalued: false,
    },
    {
      code: "MANUFACTURERID",
      label: "Manufacturer ID",
      description: "Manufacturer ID",
      dataType: "VARCHAR",
      type: "local",
      multivalued: false,
    },
  ],
};

export const COMPONENT_SCHEMA: ObjectSchema = iLogBaseSchema;

export const INSTRUMENT_SCHEMA: ObjectSchema = {
  ...iLogBaseSchema,
  Components: [
    {
      code: "COMPONENT",
      type: "local",
      dataType: "OBJECT",
      objectType: "COMPONENT",
      multivalued: true,
      description: "Components",
      label: "Components",
    },
  ],
};

export const INSTRUMENT_TYPE_DEFINITION: ObjectTypeDefinition = {
  code: instrumentTypeID,
  propertyAssignments: INSTRUMENT_SCHEMA,
  prefix: "INSTRUMENT",
  description: "Component",
};

export const COMPONENT_TYPE_DEFINITION: ObjectTypeDefinition = {
  code: "COMPONENT",
  propertyAssignments: COMPONENT_SCHEMA,
  prefix: "COMPONENT",
  description: "Component",
};

export type iLogBaseTypesType = (typeof iLogBaseTypes)[number];

export const ILOG_BASE_TYPES_VOCABULARY: Vocabulary = {
  code: iLogBaseTypesVocabularyID,
  terms: [
    { code: iLogBaseTypes[0], description: "Instrument", label: "Instrument" },
    { code: iLogBaseTypes[1], description: "Component", label: "Component" },
  ],
};

export const ILOG_BASE_TYPES_PROPERTY = {
  code: iLogBaseTypesPropertyCode,
  description: "iLog base type property",
  label: "iLog base type property",
  type: "local",
  dataType: "CONTROLLEDVOCABULARY",
  vocabulary: iLogBaseTypesVocabularyID,
  multivalued: false,
};

// Environment definition
// Space (lab) > Project (iLog) > Collection (i.e. Equipment)
class Env {
  collection: openbis.Experiment | null;
  project: openbis.Project | null;
  space: openbis.Space | null;

  constructor(collection = null, project = null, space = null) {
    this.collection = collection;
    this.project = project;
    this.space = space;
  }

  setEnv(
    collection: openbis.Experiment,
    project: openbis.Project,
    space: openbis.Space
  ) {
    this.collection = collection;
    this.project = project;
    this.space = space;
  }

  isDefined(): boolean {
    return (
      this.collection != null && this.project != null && this.space != null
    );
  }
}

export const env = new Env();

// ELN Settings definitions
export interface SampleTypeDefinitionExtension {
  ENABLE_STORAGE: boolean;
  SAMPLE_CHILDREN_ANY_TYPE_DISABLED: boolean;
  SAMPLE_CHILDREN_DISABLED: boolean;
  SAMPLE_PARENTS_ANY_TYPE_DISABLED: boolean;
  SAMPLE_PARENTS_DISABLED: boolean;
  SHOW: boolean;
  SHOW_ON_NAV: boolean;
  USE_AS_PROTOCOL: boolean;
}

interface SampleTypeDefinitionExtensionRecords {
  [key: string]: SampleTypeDefinitionExtension;
}

export interface ElnSettingsProperties {
  inventorySpaces: string[],
  sampleTypeDefinitionsExtension: SampleTypeDefinitionExtensionRecords
}

export const getDefaultPropertyAssignments = (baseType: iLogBaseTypesType) => {
  switch (baseType) {
    case "INSTRUMENT":
      return INSTRUMENT_TYPE_DEFINITION.propertyAssignments;
    case "COMPONENT":
      return COMPONENT_TYPE_DEFINITION.propertyAssignments;
  }
};

export const getDefaultPropertyTypeDefintion = (
  baseType: iLogBaseTypesType
) => {
  switch (baseType) {
    case "INSTRUMENT":
      return INSTRUMENT_TYPE_DEFINITION;
    case "COMPONENT":
      return COMPONENT_TYPE_DEFINITION;
  }
};

// ELN settings and property extraction functions
export async function getElnSettings(
  api: openbis.OpenBISJavaScriptFacade,
): Promise<{[index: string]: openbis.Sample}> {
  const fo = new openbis.SampleFetchOptions();
  fo.withProperties();
  const id = new openbis.SampleIdentifier(generalElnSettings);
  return await api.getSamples([id], fo);
}

export async function parseElnSettingsProperties(
  api: openbis.OpenBISJavaScriptFacade,
): Promise<ElnSettingsProperties> {
  const res = await getElnSettings(api);
  return JSON.parse(res[generalElnSettings].getProperty(propertyElnSettings)) as ElnSettingsProperties;
}

export async function updateElnSettings(
  api: openbis.OpenBISJavaScriptFacade,
  newProperties: ElnSettingsProperties,
): Promise<void> {
  const su = new openbis.SampleUpdate();
  su.setProperty(propertyElnSettings, JSON.stringify(newProperties));
  su.setSampleId(new openbis.SampleIdentifier(generalElnSettings));
  await api.updateSamples([su]);
}

// New type default settings
export const newTypeSettings: SampleTypeDefinitionExtension = {
  ENABLE_STORAGE: false,
  SAMPLE_CHILDREN_ANY_TYPE_DISABLED: false,
  SAMPLE_CHILDREN_DISABLED: false,
  SAMPLE_PARENTS_ANY_TYPE_DISABLED: false,
  SAMPLE_PARENTS_DISABLED: false,
  SHOW: true,
  SHOW_ON_NAV: true,
  USE_AS_PROTOCOL: false,
};
