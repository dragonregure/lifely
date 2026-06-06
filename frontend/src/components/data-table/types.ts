import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { ServerMultiSelectLoadParams, ServerMultiSelectLoadResult } from "@/components/ui/server-multi-select";

export type DataTableSortDirection = "asc" | "desc";

export type DataTableSortValue = string | number | boolean | Date | null | undefined;

export type DataTableSortState = {
  columnId: string;
  direction: DataTableSortDirection;
};

export type DataTableQueryState = {
  page: number;
  pageSize: number;
  search: string;
  filters: FilterValues;
  sort: DataTableSortState | null;
};

export type DataTableQueryContext = {
  signal: AbortSignal;
};

export type DataTableColumn<TData extends object> = {
  id: string;
  header: ReactNode;
  accessor?: keyof TData | ((row: TData) => ReactNode);
  cell?: (row: TData) => ReactNode;
  className?: string;
  headerClassName?: string;
  searchValue?: (row: TData) => string;
  sortable?: boolean;
  sortValue?: keyof TData | ((row: TData) => DataTableSortValue);
};

export type DataTableFilterOption = {
  label: string;
  value: string;
  description?: string;
};

export type DataTableFilter<TData extends object> = {
  id: string;
  label: string;
  type?: "select" | "multi-select";
  options?: DataTableFilterOption[];
  loadOptions?: (params: ServerMultiSelectLoadParams) => Promise<ServerMultiSelectLoadResult<DataTableFilterOption>>;
  defaultValue?: string;
  predicate: (row: TData, selectedValue: string) => boolean;
};

export type DataTableSearch<TData extends object> = {
  enabled?: boolean;
  placeholder?: string;
  debounceMs?: number;
  searchValue?: (row: TData) => string;
};

export type DataTableActions<TData extends object> = {
  cell: (row: TData) => ReactNode;
  className?: string;
  header?: ReactNode;
  headerClassName?: string;
  wrapperClassName?: string;
};

export type DataTableProps<TData extends object> = {
  actions?: ((row: TData) => ReactNode) | DataTableActions<TData>;
  actionsHeader?: ReactNode;
  columns: DataTableColumn<TData>[];
  data: TData[];
  emptyMessage?: string;
  filters?: DataTableFilter<TData>[];
  initialSort?: DataTableSortState;
  isLoading?: boolean;
  initialPageSize?: number;
  pageSizeOptions?: number[];
  refreshKey?: number;
  rowKey?: keyof TData | ((row: TData, index: number) => string | number);
  rowClassName?: string | ((row: TData, index: number) => string);
  search?: boolean | DataTableSearch<TData>;
  serverSide?: boolean;
  serverTotalRows?: number;
  serverPageCount?: number;
  onQueryChange?: (state: DataTableQueryState, context: DataTableQueryContext) => void;
  toolbarEnd?: ReactNode;
};

export type FilterValues = Record<string, string>;

export type FilterValueSetter = Dispatch<SetStateAction<FilterValues>>;
