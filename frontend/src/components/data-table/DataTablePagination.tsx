import type { Dispatch, SetStateAction } from "react";
import { PaginationControls } from "@/components/query/PaginationControls";
import { clampPageSize } from "./utils";

type DataTablePaginationProps = {
  currentPage: number;
  hasPagination: boolean;
  normalizedPageSizeOptions: number[];
  pageCount: number;
  pageSize: number;
  rangeEnd: number;
  rangeStart: number;
  setPage: Dispatch<SetStateAction<number>>;
  setPageSize: Dispatch<SetStateAction<number>>;
  totalRows: number;
};

export function DataTablePagination({
  currentPage,
  normalizedPageSizeOptions,
  pageCount,
  pageSize,
  rangeEnd,
  rangeStart,
  setPage,
  setPageSize,
  totalRows,
}: DataTablePaginationProps) {
  return (
    <PaginationControls
      itemLabel="Rows"
      page={currentPage}
      pageCount={pageCount}
      pageSize={pageSize}
      pageSizeOptions={normalizedPageSizeOptions}
      rangeEnd={rangeEnd}
      rangeStart={rangeStart}
      totalRows={totalRows}
      onPageChange={(nextPage) => setPage(nextPage)}
      onPageSizeChange={(nextPageSize) => setPageSize(clampPageSize(nextPageSize))}
    />
  );
}
