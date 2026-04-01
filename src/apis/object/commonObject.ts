import openbis from "@openbis/openbis.esm";
import { PropertyTypesSchema } from "../../apis/type/commonType";

export interface ObjectDefinition {
  id: openbis.SampleIdentifier | null;
  collection: string;
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