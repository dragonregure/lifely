import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ServerMultiSelect, type ServerMultiSelectLoadParams } from "@/components/ui/server-multi-select";
import type { DataTableFilter, DataTableFilterOption, FilterValues } from "./types";

type DataTableFilterMenuProps<TData extends object> = {
  filters: DataTableFilter<TData>[];
  filterValues: FilterValues;
  setFilterValues: Dispatch<SetStateAction<FilterValues>>;
};

function defaultFilterValue<TData extends object>(filter: DataTableFilter<TData>) {
  return filter.defaultValue ?? filter.options?.[0]?.value ?? "";
}

export function DataTableFilterMenu<TData extends object>({
  filters,
  filterValues,
  setFilterValues,
}: DataTableFilterMenuProps<TData>) {
  const [selectedOptionsByFilter, setSelectedOptionsByFilter] = useState<Record<string, DataTableFilterOption[]>>({});
  const activeFilterCount = filters.filter((filter) => {
    const selectedValue = filterValues[filter.id] ?? defaultFilterValue(filter);
    return selectedValue !== defaultFilterValue(filter);
  }).length;
  const staticLoaders = useMemo(
    () =>
      Object.fromEntries(
        filters.map((filter) => [
          filter.id,
          async ({ search, page, pageSize }: ServerMultiSelectLoadParams) => {
            const normalizedSearch = search.trim().toLowerCase();
            const options = (filter.options ?? []).filter((option) => {
              if (option.value === defaultFilterValue(filter)) return false;
              if (!normalizedSearch) return true;

              return `${option.label} ${option.description ?? ""}`.toLowerCase().includes(normalizedSearch);
            });
            const start = (page - 1) * pageSize;

            return {
              options: options.slice(start, start + pageSize),
              hasMore: start + pageSize < options.length,
            };
          },
        ]),
      ),
    [filters],
  );

  const selectedFilterOptions = (filter: DataTableFilter<TData>) => {
    const selectedValues = (filterValues[filter.id] ?? defaultFilterValue(filter))
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value && value !== defaultFilterValue(filter));
    const cachedOptions = selectedOptionsByFilter[filter.id] ?? [];

    return selectedValues.map((value) => cachedOptions.find((option) => option.value === value) ?? filter.options?.find((option) => option.value === value) ?? { value, label: value });
  };

  if (filters.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" aria-label="Open table filters">
          <SlidersHorizontal className="h-4 w-4" />
          Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-3">
        <div className="grid gap-3">
          {filters.map((filter) => (
            <div key={filter.id} className="grid gap-1.5">
              <Label htmlFor={`data-table-filter-${filter.id}`}>{filter.label}</Label>
              {filter.type === "multi-select" ? (
                <ServerMultiSelect<DataTableFilterOption>
                  id={`data-table-filter-${filter.id}`}
                  value={selectedFilterOptions(filter)}
                  onChange={(selectedOptions) => {
                    setSelectedOptionsByFilter((current) => ({ ...current, [filter.id]: selectedOptions }));
                    setFilterValues((current) => ({
                      ...current,
                      [filter.id]: selectedOptions.length === 0 ? defaultFilterValue(filter) : selectedOptions.map((option) => option.value).join(","),
                    }));
                  }}
                  loadOptions={filter.loadOptions ?? staticLoaders[filter.id]}
                  placeholder={`Select ${filter.label.toLowerCase()}`}
                  searchPlaceholder={`Search ${filter.label.toLowerCase()}...`}
                  emptyLabel={`No ${filter.label.toLowerCase()} found.`}
                />
              ) : (
                <Select
                  id={`data-table-filter-${filter.id}`}
                  value={filterValues[filter.id] ?? defaultFilterValue(filter)}
                  onChange={(event) => setFilterValues((current) => ({ ...current, [filter.id]: event.target.value }))}
                >
                  {(filter.options ?? []).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              )}
            </div>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
