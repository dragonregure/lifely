import { DataTableContent } from "./DataTableContent";
import { DataTablePagination } from "./DataTablePagination";
import { DataTableToolbar } from "./DataTableToolbar";
import type { DataTableProps } from "./types";
import { useDataTable } from "./useDataTable";

export function DataTable<TData extends object>({
  actions,
  actionsHeader = "Actions",
  columns,
  data,
  emptyMessage = "No records found.",
  filters = [],
  initialSort,
  initialPageSize = 10,
  pageSizeOptions,
  rowKey,
  search = false,
  toolbarEnd,
}: DataTableProps<TData>) {
  const table = useDataTable({
    actions,
    actionsHeader,
    columns,
    data,
    filters,
    initialPageSize,
    initialSort,
    pageSizeOptions,
    search,
    toolbarEnd,
  });

  return (
    <div className="grid gap-3">
      {table.hasToolbar && (
        <DataTableToolbar
          filters={filters}
          filterValues={table.filterValues}
          query={table.query}
          searchConfig={table.searchConfig}
          searchEnabled={table.searchEnabled}
          setFilterValues={table.setFilterValues}
          setQuery={table.setQuery}
          toolbarEnd={toolbarEnd}
        />
      )}

      <DataTableContent
        actionConfig={table.actionConfig}
        actionsHeader={actionsHeader}
        columns={columns}
        emptyMessage={emptyMessage}
        onSort={table.handleSort}
        paginatedData={table.paginatedData}
        rowKey={rowKey}
        sortState={table.sortState}
      />

      <DataTablePagination
        currentPage={table.currentPage}
        hasPagination={table.hasPagination}
        normalizedPageSizeOptions={table.normalizedPageSizeOptions}
        pageCount={table.pageCount}
        pageSize={table.pageSize}
        rangeEnd={table.rangeEnd}
        rangeStart={table.rangeStart}
        setPage={table.setPage}
        setPageSize={table.setPageSize}
        totalRows={table.filteredData.length}
      />
    </div>
  );
}
