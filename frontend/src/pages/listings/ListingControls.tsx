import { SearchInput } from "@/components/query/SearchInput";
import { PaginationControls } from "@/components/query/PaginationControls";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { ListingOption } from "./listingTypes";

type ListingFiltersProps = {
  searchInput: string;
  statusFilter: string;
  statusOptions: ListingOption[];
  typeFilter: string;
  typeOptions: ListingOption[];
  onSearchInputChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onTypeFilterChange: (value: string) => void;
};

export function ListingFilters({
  searchInput,
  statusFilter,
  statusOptions,
  typeFilter,
  typeOptions,
  onSearchInputChange,
  onStatusFilterChange,
  onTypeFilterChange,
}: ListingFiltersProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-lg border bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
      <SearchInput id="listing-search" label="Search listings" placeholder="Search title, address, status, or type" value={searchInput} onChange={onSearchInputChange} />

      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor="listing-status-filter" className="sr-only">
          Status
        </Label>
        <Select id="listing-status-filter" value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value)}>
          <option value="all">All statuses</option>
          {statusOptions.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </Select>

        <Label htmlFor="listing-type-filter" className="sr-only">
          Type
        </Label>
        <Select id="listing-type-filter" value={typeFilter} onChange={(event) => onTypeFilterChange(event.target.value)}>
          <option value="all">All types</option>
          {typeOptions.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}

type ListingPaginationProps = {
  page: number;
  pageCount: number;
  pageSize: number;
  pageSizeOptions: number[];
  rangeEnd: number;
  rangeStart: number;
  totalRows: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

export function ListingPagination(props: ListingPaginationProps) {
  return (
    <div className="mt-4 rounded-lg border bg-white p-4">
      <PaginationControls itemLabel="Cards" {...props} />
    </div>
  );
}
