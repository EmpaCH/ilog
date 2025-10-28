import openbis from '@openbis/openbis.esm';

export interface Column {
  key: string;
  name: string;
  sorting: boolean;
  align: "start" | "end";
  filterable?: boolean;
};

export interface TypeRow {
  permId: openbis.EntityTypePermId;
  code: string;
  prefix: string;
  collectionType: string;
};

export interface ObjectRow {
  permId: openbis.SamplePermId;
  name: string;
  code: string;
  type: string;
};

export interface Row {
  [key: string]: any;
}


export interface LogbookEntryRow {
  permId: openbis.SamplePermId;
  name: string;
  responsible: string;
  description: string;
  componentCode: string;
  type: string;
  validFrom: string;
  color?: string;
  enableModification?: boolean;
};