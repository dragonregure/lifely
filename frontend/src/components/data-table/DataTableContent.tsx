import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { DEFAULT_ACTION_COLUMN_CLASS } from "./constants";
import type { DataTableActions, DataTableColumn, DataTableProps } from "./types";
import { getAccessorValue, getRowKey } from "./utils";

type DataTableContentProps<TData extends object> = {
  actionConfig: DataTableActions<TData> | null;
  actionsHeader: DataTableProps<TData>["actionsHeader"];
  columns: DataTableColumn<TData>[];
  emptyMessage: string;
  paginatedData: TData[];
  rowKey: DataTableProps<TData>["rowKey"];
};

export function DataTableContent<TData extends object>({
  actionConfig,
  actionsHeader,
  columns,
  emptyMessage,
  paginatedData,
  rowKey,
}: DataTableContentProps<TData>) {
  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.id} className={column.headerClassName}>
                {column.header}
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
          {paginatedData.length > 0 ? (
            paginatedData.map((row, index) => (
              <TableRow key={getRowKey(row, index, rowKey)} className="group">
                {columns.map((column) => (
                  <TableCell key={column.id} className={column.className}>
                    {column.cell ? column.cell(row) : getAccessorValue(row, column.accessor)}
                  </TableCell>
                ))}
                {actionConfig && (
                  <TableCell className={cn(DEFAULT_ACTION_COLUMN_CLASS, "transition-colors group-hover:bg-muted/50", actionConfig.className)}>
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
