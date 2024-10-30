import openbis from '@openbis/openbis.esm';

export interface Column {
  key: string;
  name: string;
  sorting: boolean;
  align: "start" | "end";
};

export interface TypeRow {
  permId: openbis.IEntityTypeId;
  code: string;
  prefix: string;
  description: string;
};

export interface ObjectRow {
  permId: openbis.ISampleId;
  name: string;
  type: string;
};

export type Row = TypeRow | ObjectRow;
