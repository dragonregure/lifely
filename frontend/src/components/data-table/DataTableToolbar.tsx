import type { Dispatch, ReactNode, SetStateAction } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
        <div className="min-w-0 lg:flex-1">
          <Label htmlFor="data-table-search" className="sr-only">
            Search
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="data-table-search"
              className="pl-9"
              placeholder={searchConfig.placeholder ?? "Search records"}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
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
