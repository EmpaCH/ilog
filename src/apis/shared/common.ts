import openbis from "@openbis/openbis.esm";
import { ObjectSchema, ObjectTypeDefinition } from "../type/commonType";
import { Vocabulary } from "../vocabulary/commonVocabulary";

export const iLogID = "ILOG";
export const instrumentTypeID = "Instrument";
export const labID = "205";
export const collectionID = "EQUIPMENT";
export const elnSettings = "$ELN_SETTINGS";
export const generalElnSettings = "/ELN_SETTINGS/GENERAL_ELN_SETTINGS";
export const iLogBaseTypesPropertyCode = "ILOG_TYPE_BASE";
export const iLogBaseTypes = ["INSTRUMENT", "COMPONENT"] as const;
export const iLogBaseTypesVocabularyID = "ILOG_BASE_TYPES";

export const COMPONENT_SCHEMA: ObjectSchema = {
  "General Info": [
    { code: "$NAME", type: "reference" },
    { code: iLogID, type: "reference" },
    { code: iLogBaseTypesPropertyCode, type: "reference" },
    {
      code: "Serialnumber",
      label: "Serial number",
      description: "Serial number",
      dataType: "VARCHAR",
      type: "local",
      multivalued: false,
    },
    {
      code: "EmpaID",
      dataType: "VARCHAR",
      label: "Empa ID",
      description: "Empa ID",
      type: "local",
      multivalued: false,
    },
  ],
  Location: [{ code: "$LOCATION", type: "reference" }],
};

export const INSTRUMENT_SCHEMA = {
  ...COMPONENT_SCHEMA,
  Components: [{ code: "COMPONENT", type: "reference" }],
};

export const INSTRUMENT_TYPE_DEFINITION: ObjectTypeDefinition = {
  code: instrumentTypeID,
  propertyAssignments: INSTRUMENT_SCHEMA,
  prefix: "INSTRUMENT",
};

export const COMPONENT_TYPE_DEFINITION: ObjectTypeDefinition = {
  code: "COMPONENT",
  propertyAssignments: COMPONENT_SCHEMA,
  prefix: "COMPONENT",
};


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

// ELN Settings definition for Samples (Objects)
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

export interface ElnSettings {
  sampleTypeDefinitionsExtension: SampleTypeDefinitionExtensionRecords;
}
