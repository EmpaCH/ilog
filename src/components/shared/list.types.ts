import openbis from '@openbis/openbis.esm';

export interface Column {
  key: string;
  name: string;
  sorting: boolean;
  align: "start" | "end";
};

export interface TypeRow {
  permId: openbis.EntityTypePermId;
  code: string;
  prefix: string;
  description: string;
};

export interface ObjectRow {
  permId: openbis.SamplePermId;
  name: string;
  type: string;
};

export type Row = TypeRow | ObjectRow;
