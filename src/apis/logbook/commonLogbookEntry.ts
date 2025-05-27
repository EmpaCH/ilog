import openbis from "@openbis/openbis.esm";
import { ZonedDateTime } from "@internationalized/date";
import { PropertyTypesSchema } from "../type/commonType";

export interface LogbookEntryDefinition {
  id: openbis.SampleIdentifier | null;
  type: string;
  code: string;
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
  [key: string]: LogbookEntryDefinition;
}
