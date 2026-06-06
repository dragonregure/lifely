import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type PaginationControlsProps = {
  itemLabel: string;
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

export function PaginationControls({
  itemLabel,
  page,
  pageCount,
  pageSize,
  pageSizeOptions,
  rangeEnd,
  rangeStart,
  totalRows,
  onPageChange,
  onPageSizeChange,
}: PaginationControlsProps) {
  const hasPagination = totalRows > pageSize;

  return (
    <div className="flex flex-col gap-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
      <div>
        Showing {rangeStart}-{rangeEnd} of {totalRows}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Label htmlFor={`${itemLabel.toLowerCase()}-page-size`} className="text-sm text-muted-foreground">
            {itemLabel}
          </Label>
          <Select
            id={`${itemLabel.toLowerCase()}-page-size`}
            className="h-9 px-2 py-1"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("min-w-24 text-center", !hasPagination && "text-muted-foreground")}>
            Page {page} of {pageCount}
          </span>
          <Button type="button" variant="outline" size="icon" aria-label="Previous page" disabled={page === 1} onClick={() => onPageChange(Math.max(1, page - 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Next page"
            disabled={page === pageCount}
            onClick={() => onPageChange(Math.min(pageCount, page + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
