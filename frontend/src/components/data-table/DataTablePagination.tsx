import type { Dispatch, SetStateAction } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
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
  hasPagination,
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
    <div className="flex flex-col gap-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
      <div>
        Showing {rangeStart}-{rangeEnd} of {totalRows}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Label htmlFor="data-table-page-size" className="text-sm text-muted-foreground">
            Rows
          </Label>
          <select
            id="data-table-page-size"
            className="h-9 rounded-md border border-input bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={pageSize}
            onChange={(event) => setPageSize(clampPageSize(Number(event.target.value)))}
          >
            {normalizedPageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("min-w-24 text-center", !hasPagination && "text-muted-foreground")}>
            Page {currentPage} of {pageCount}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Previous page"
            disabled={currentPage === 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Next page"
            disabled={currentPage === pageCount}
            onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
