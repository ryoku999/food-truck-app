export const productionCodes = ["KITCHEN", "BAR", "NONE"] as const;
export const tableStatuses = ["AVAILABLE", "OCCUPIED", "DISABLED"] as const;
export type TableStatus = (typeof tableStatuses)[number];
export type ProductionFields = {
  name: string;
  code: (typeof productionCodes)[number];
};
export type DiningFields = {
  name: string;
  description: string | null;
  sortOrder: number;
};
export type TableFields = {
  diningAreaId: string;
  number: number;
  name: string | null;
  capacity: number | null;
  sortOrder: number;
  active: boolean;
};
export type ProductionArea = ProductionFields & {
  id: string;
  active: boolean;
  counts: { categories: number; products: number; printers: number };
};
export type DiningArea = DiningFields & {
  id: string;
  active: boolean;
  tableCount: number;
  activeTableCount: number;
};
export type TableArea = { id: string; name: string };
export type LocalTable = Omit<TableFields, "diningAreaId"> & {
  id: string;
  diningArea: TableArea;
  status: TableStatus;
};
export type OpenOrder = {
  id: string;
  number: number;
  status: string;
  total: string;
  openedAt: string;
  joinedTables: {
    id: string;
    number: number;
    name: string | null;
    diningArea: TableArea;
  }[];
};
export type TableMap = {
  areas: (TableArea & {
    active: boolean;
    sortOrder: number;
    tables: (Omit<LocalTable, "diningArea"> & {
      openOrder: OpenOrder | null;
    })[];
  })[];
};
