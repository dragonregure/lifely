import type { Dispatch, ReactNode, SetStateAction } from "react";

export type DataTableColumn<TData extends object> = {
  id: string;
  header: ReactNode;
  accessor?: keyof TData | ((row: TData) => ReactNode);
  cell?: (row: TData) => ReactNode;
  className?: string;
  headerClassName?: string;
  searchValue?: (row: TData) => string;
};

export type DataTableFilterOption = {
  label: string;
  value: string;
};

export type DataTableFilter<TData extends object> = {
  id: string;
  label: string;
  options: DataTableFilterOption[];
  defaultValue?: string;
  predicate: (row: TData, selectedValue: string) => boolean;
};

export type DataTableSearch<TData extends object> = {
  enabled?: boolean;
  placeholder?: string;
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
  initialPageSize?: number;
  pageSizeOptions?: number[];
  rowKey?: keyof TData | ((row: TData, index: number) => string | number);
  search?: boolean | DataTableSearch<TData>;
  toolbarEnd?: ReactNode;
};

export type FilterValues = Record<string, string>;

export type FilterValueSetter = Dispatch<SetStateAction<FilterValues>>;
