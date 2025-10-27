import openbis from "@openbis/openbis.esm";
import { ZonedDateTime } from "@internationalized/date";
import { PropertyTypesSchema } from "../../apis/type/commonType";

export interface ObjectDefinition {
  id: openbis.SampleIdentifier | null;
  collection: string;
  type: string;
  validFrom: ZonedDateTime;
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