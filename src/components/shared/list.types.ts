import openbis from '@openbis/openbis.esm';

export interface Column {
  key: string;
  name: string;
  sorting: boolean;
  align: "start" | "end";
  filterable?: boolean;
};

export interface Row {
  [key: string]: any;
}

export interface TypeRow {
  permId: openbis.EntityTypePermId;
  code: string;
  prefix: string;
  baseType: string;
};

export interface ObjectRow {
  permId: openbis.SamplePermId;
  preview: string | null | undefined;
  code: string;
  name: string;
  type: string;
  baseType: string;
};

export interface LogbookEntryRow {
  permId: openbis.SamplePermId;
  code: string;
  name: string;
  responsible: string;
  type: string;
  validFrom: string;
  color?: string;
  enableModification?: boolean;
};
