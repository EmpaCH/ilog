export interface OpenBISInstance {
  label: string;
  hostname: string;
}

export const OPENBIS_INSTANCES: OpenBISInstance[] = [
  { label: "Lab 205", hostname: "openbis-empa-lab205.ethz.ch" },
  { label: "Dev 205", hostname: "openbis-empa-dev205.ethz.ch" },
];
