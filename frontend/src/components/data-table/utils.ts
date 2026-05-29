import type { ReactNode } from "react";
import type { DataTableColumn, DataTableProps, DataTableSortDirection, DataTableSortValue } from "./types";

export function clampPageSize(value: number) {
  return Math.min(100, Math.max(1, Math.floor(value)));
}

export function toSearchText(value: ReactNode) {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "";
}

export function getAccessorValue<TData extends object>(row: TData, accessor: DataTableColumn<TData>["accessor"]) {
  if (!accessor) return "";
  return typeof accessor === "function" ? accessor(row) : (row[accessor] as ReactNode);
}

export function getRowKey<TData extends object>(row: TData, index: number, rowKey: DataTableProps<TData>["rowKey"]) {
  if (typeof rowKey === "function") return rowKey(row, index);
  if (rowKey) return String(row[rowKey]);
  return index;
}

export function isColumnSortable<TData extends object>(column: DataTableColumn<TData>) {
  return column.sortable ?? Boolean(column.sortValue || column.searchValue || column.accessor);
}

export function getColumnSortValue<TData extends object>(row: TData, column: DataTableColumn<TData>): DataTableSortValue {
  if (typeof column.sortValue === "function") {
    return column.sortValue(row);
  }

  if (column.sortValue) {
    const value = row[column.sortValue];
    return value instanceof Date || ["string", "number", "boolean"].includes(typeof value) ? (value as DataTableSortValue) : toSearchText(value as ReactNode);
  }

  if (column.searchValue) {
    return column.searchValue(row);
  }

  return toSearchText(getAccessorValue(row, column.accessor));
}

export function compareSortValues(a: DataTableSortValue, b: DataTableSortValue, direction: DataTableSortDirection) {
  const aEmpty = a === null || a === undefined || a === "";
  const bEmpty = b === null || b === undefined || b === "";

  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;

  const normalizedA = a instanceof Date ? a.getTime() : a;
  const normalizedB = b instanceof Date ? b.getTime() : b;

  const result =
    typeof normalizedA === "number" && typeof normalizedB === "number"
      ? normalizedA - normalizedB
      : String(normalizedA).localeCompare(String(normalizedB), undefined, { numeric: true, sensitivity: "base" });

  return direction === "asc" ? result : -result;
}
