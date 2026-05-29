import type { ReactNode } from "react";
import type { DataTableColumn, DataTableProps } from "./types";

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
