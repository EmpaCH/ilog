import openbis from "@openbis/openbis.esm";
import { PropertyTypesSchema } from "../../apis/type/commonType";

export interface ObjectDefinition {
  id: openbis.SampleIdentifier | null;
  // iLog category of the object's type (INSTRUMENT_COLLECTION or COMPONENT_COLLECTION)
  collection: string;
  // Identifier of the openBIS collection the object is stored in, e.g. "/SPACE/PROJECT/COLLECTION"
  collectionIdentifier: string;
  type: string;
  propertiesSchema: PropertyTypesSchema;
  propertyValues: {
    [key: string]: any,
  };
};

export interface ReconstructedHistory {
  [key: string]: openbis.PropertyHistoryEntry[];
}

export interface GroupedHistory {
  [key: string]: ObjectDefinition;
}
export interface MultiObjectGroupedHistory {
  [uniqueId: string]: GroupedHistory;
}