import type { Dispatch, ReactNode, SetStateAction } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ALL_FILTER_VALUE } from "./constants";
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
        <div className="grid min-w-0 gap-2 lg:flex-1">
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
        <div className="flex flex-wrap gap-3">
          {filters.map((filter) => (
            <div key={filter.id} className="grid min-w-44 gap-2">
              <Label htmlFor={`data-table-filter-${filter.id}`}>{filter.label}</Label>
              <select
                id={`data-table-filter-${filter.id}`}
                className="h-10 rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                value={filterValues[filter.id] ?? filter.defaultValue ?? ALL_FILTER_VALUE}
                onChange={(event) => setFilterValues((current) => ({ ...current, [filter.id]: event.target.value }))}
              >
                <option value={ALL_FILTER_VALUE}>All</option>
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
          {toolbarEnd}
        </div>
      )}
    </div>
  );
}
