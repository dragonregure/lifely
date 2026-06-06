import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { LoadingState } from "@/components/Loading";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { DEFAULT_ACTION_COLUMN_CLASS } from "./constants";
import type { DataTableActions, DataTableColumn, DataTableProps, DataTableSortState } from "./types";
import { getAccessorValue, getRowKey, isColumnSortable, toSearchText } from "./utils";

type DataTableContentProps<TData extends object> = {
  actionConfig: DataTableActions<TData> | null;
  actionsHeader: DataTableProps<TData>["actionsHeader"];
  columns: DataTableColumn<TData>[];
  emptyMessage: string;
  isLoading: boolean;
  onSort: (column: DataTableColumn<TData>) => void;
  paginatedData: TData[];
  rowClassName?: DataTableProps<TData>["rowClassName"];
  rowKey: DataTableProps<TData>["rowKey"];
  sortState: DataTableSortState | null;
};

export function DataTableContent<TData extends object>({
  actionConfig,
  actionsHeader,
  columns,
  emptyMessage,
  isLoading,
  onSort,
  paginatedData,
  rowClassName,
  rowKey,
  sortState,
}: DataTableContentProps<TData>) {
  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead
                key={column.id}
                aria-sort={
                  sortState?.columnId === column.id ? (sortState.direction === "asc" ? "ascending" : "descending") : undefined
                }
                className={column.headerClassName}
              >
                {isColumnSortable(column) ? (
                  <button
                    type="button"
                    className="-mx-2 inline-flex h-8 max-w-full items-center gap-1.5 rounded-md px-2 text-left transition-colors hover:bg-secondary hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-ring"
                    onClick={() => onSort(column)}
                    aria-label={`Sort by ${toSearchText(column.header) || column.id}`}
                  >
                    <span className="truncate">{column.header}</span>
                    {sortState?.columnId === column.id ? (
                      sortState.direction === "asc" ? (
                        <ArrowUp className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5 shrink-0" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    )}
                  </button>
                ) : (
                  column.header
                )}
              </TableHead>
            ))}
            {actionConfig && (
              <TableHead className={cn(DEFAULT_ACTION_COLUMN_CLASS, actionConfig.headerClassName)}>
                {actionConfig.header ?? actionsHeader}
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={columns.length + (actionConfig ? 1 : 0)}>
                <LoadingState label="Loading data" />
              </TableCell>
            </TableRow>
          ) : paginatedData.length > 0 ? (
            paginatedData.map((row, index) => (
              <TableRow
                key={getRowKey(row, index, rowKey)}
                className={cn("group", typeof rowClassName === "function" ? rowClassName(row, index) : rowClassName)}
              >
                {columns.map((column) => (
                  <TableCell key={column.id} className={column.className}>
                    {column.cell ? column.cell(row) : getAccessorValue(row, column.accessor)}
                  </TableCell>
                ))}
                {actionConfig && (
                  <TableCell className={cn(DEFAULT_ACTION_COLUMN_CLASS, "bg-inherit transition-colors group-hover:bg-inherit", actionConfig.className)}>
                    <div className={cn("flex justify-end gap-1", actionConfig.wrapperClassName)}>{actionConfig.cell(row)}</div>
                  </TableCell>
                )}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length + (actionConfig ? 1 : 0)} className="h-24 text-center text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
