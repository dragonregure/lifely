import type { Dispatch, SetStateAction } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import type { DataTableFilter, FilterValues } from "./types";

type DataTableFilterMenuProps<TData extends object> = {
  filters: DataTableFilter<TData>[];
  filterValues: FilterValues;
  setFilterValues: Dispatch<SetStateAction<FilterValues>>;
};

function defaultFilterValue<TData extends object>(filter: DataTableFilter<TData>) {
  return filter.defaultValue ?? filter.options[0]?.value ?? "";
}

export function DataTableFilterMenu<TData extends object>({
  filters,
  filterValues,
  setFilterValues,
}: DataTableFilterMenuProps<TData>) {
  if (filters.length === 0) {
    return null;
  }

  const activeFilterCount = filters.filter((filter) => {
    const selectedValue = filterValues[filter.id] ?? defaultFilterValue(filter);
    return selectedValue !== defaultFilterValue(filter);
  }).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" aria-label="Open table filters">
          <SlidersHorizontal className="h-4 w-4" />
          Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-3">
        <div className="grid gap-3">
          {filters.map((filter) => (
            <div key={filter.id} className="grid gap-1.5">
              <Label htmlFor={`data-table-filter-${filter.id}`}>{filter.label}</Label>
              <select
                id={`data-table-filter-${filter.id}`}
                className="h-10 rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                value={filterValues[filter.id] ?? defaultFilterValue(filter)}
                onChange={(event) => setFilterValues((current) => ({ ...current, [filter.id]: event.target.value }))}
              >
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
