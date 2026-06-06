import type { Dispatch, ReactNode, SetStateAction } from "react";
import { SearchInput } from "@/components/query/SearchInput";
import { DataTableFilterMenu } from "./DataTableFilterMenu";
import type { DataTableFilter, DataTableSearch, FilterValues } from "./types";

type DataTableToolbarProps<TData extends object> = {
  filters: DataTableFilter<TData>[];
  filterValues: FilterValues;
  query: string;
  searchConfig: DataTableSearch<TData>;
  searchEnabled: boolean;
  setFilterValues: Dispatch<SetStateAction<FilterValues>>;
  setQuery: Dispatch<SetStateAction<string>>;
  toolbarEnd?: ReactNode;
};

export function DataTableToolbar<TData extends object>({
  filters,
  filterValues,
  query,
  searchConfig,
  searchEnabled,
  setFilterValues,
  setQuery,
  toolbarEnd,
}: DataTableToolbarProps<TData>) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      {searchEnabled && (
        <SearchInput
          id="data-table-search"
          label="Search"
          placeholder={searchConfig.placeholder ?? "Search records"}
          value={query}
          onChange={setQuery}
        />
      )}

      {(filters.length > 0 || toolbarEnd) && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <DataTableFilterMenu filters={filters} filterValues={filterValues} setFilterValues={setFilterValues} />
          {toolbarEnd}
        </div>
      )}
    </div>
  );
}
