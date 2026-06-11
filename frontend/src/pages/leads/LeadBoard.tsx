import type { DragEvent } from "react";
import { CircleAvatar } from "@/components/CircleAvatar";
import { DangerTriangleIcon } from "@/components/DangerTriangleIcon";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";
import type { LeadDeal, LeadStage } from "@/types";
import type { LeadColumn } from "./leadTypes";
import { contactName, hasLeadDealProblem, leadProblemLabel } from "./leadUtils";

type LeadBoardProps = {
  columns: LeadColumn[];
  draggedDealId: string | null;
  dragOverStage: LeadStage | null;
  isSidebarMinimized: boolean;
  movingDealIds: string[];
  loadingMoreStage: LeadStage | null;
  canMoveDeal: (deal: LeadDeal) => boolean;
  onCardClick: (deal: LeadDeal) => void;
  onCardDragEnd: () => void;
  onCardDragStart: (event: DragEvent<HTMLButtonElement>, deal: LeadDeal) => void;
  onColumnDragLeave: (event: DragEvent<HTMLDivElement>, stage: LeadStage) => void;
  onColumnDragOver: (event: DragEvent<HTMLDivElement>, stage: LeadStage) => void;
  onDrop: (event: DragEvent<HTMLDivElement>, stage: LeadStage) => void;
  onLoadMore: (stage: LeadStage) => void;
};

export function LeadBoard({
  columns,
  draggedDealId,
  dragOverStage,
  isSidebarMinimized,
  movingDealIds,
  loadingMoreStage,
  canMoveDeal,
  onCardClick,
  onCardDragEnd,
  onCardDragStart,
  onColumnDragLeave,
  onColumnDragOver,
  onDrop,
  onLoadMore,
}: LeadBoardProps) {
  return (
    <div
      className={cn(
        "grid grid-flow-col gap-2 overflow-x-auto pb-2 xl:grid-flow-row xl:grid-cols-9",
        isSidebarMinimized ? "auto-cols-[11rem] xl:overflow-visible" : "auto-cols-[10rem] xl:overflow-x-auto",
      )}
    >
      {columns.map((column) => (
        <div
          key={column.stage}
          className={cn(
            "min-h-56 min-w-0 rounded-lg border border-transparent p-1 transition-colors",
            dragOverStage === column.stage && "border-primary/40 bg-primary/5",
          )}
          onDragOver={(event) => onColumnDragOver(event, column.stage)}
          onDragLeave={(event) => onColumnDragLeave(event, column.stage)}
          onDrop={(event) => onDrop(event, column.stage)}
        >
          <div className={cn("mb-2 flex items-start gap-2", isSidebarMinimized && "min-h-10")}>
            <h2 className={cn("min-w-0 flex-1 text-sm font-semibold leading-tight", isSidebarMinimized ? "whitespace-normal break-words" : "truncate")} title={column.stage}>
              {column.stage}
            </h2>
            <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs text-muted-foreground" aria-label={`${column.stage} deal count`}>
              {column.total > column.deals.length ? `${column.deals.length}/${column.total}` : column.deals.length}
            </span>
          </div>
          <div className="grid min-h-32 content-start gap-3">
            {column.deals.map((deal) => {
              const contact = deal.contact;
              const listing = deal.listing;
              const assignee = deal.user;
              const displayName = contact ? contactName(contact) : "Unassigned contact";
              const isMovable = canMoveDeal(deal);
              const isDragging = draggedDealId === deal.id;
              const isMoving = movingDealIds.includes(deal.id);
              const hasProblem = hasLeadDealProblem(deal);
              const problemLabel = leadProblemLabel(deal);

              return (
                <button
                  key={deal.id}
                  type="button"
                  draggable={isMovable && !isMoving}
                  className={cn(
                    "min-w-0 text-left focus:outline-none focus:ring-2 focus:ring-ring",
                    isMovable && "cursor-grab active:cursor-grabbing",
                    isDragging && "opacity-60",
                    isMoving && "cursor-wait opacity-70",
                  )}
                  onClick={() => onCardClick(deal)}
                  onDragStart={(event) => onCardDragStart(event, deal)}
                  onDragEnd={onCardDragEnd}
                  aria-label={`${displayName} lead card${hasProblem ? `. ${problemLabel}.` : ""}${isMovable ? " Drag to move between stages." : ""}`}
                >
                  <Card className={cn("relative min-w-0 overflow-hidden shadow-sm transition hover:border-primary/40 hover:shadow-md", hasProblem && "border-destructive/40")}>
                    {hasProblem ? (
                      <span className="absolute right-2 top-2 rounded-sm bg-white/95" title={problemLabel}>
                        <DangerTriangleIcon title={problemLabel} />
                      </span>
                    ) : null}
                    <CardContent className="min-w-0 p-3">
                      <p className={cn("truncate text-sm font-semibold text-slate-900", hasProblem && "pr-5")}>{displayName}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{listing?.title ?? "Unassigned listing"}</p>
                      <div className="mt-2 flex min-h-7 items-end justify-between gap-2">
                        <p className="min-w-0 truncate text-sm font-semibold">{formatCurrency(deal.value)}</p>
                        {assignee ? <CircleAvatar name={assignee.name} initials={assignee.avatarInitials} size="sm" aria-label={`Assigned to ${assignee.name}`} /> : null}
                      </div>
                    </CardContent>
                  </Card>
                </button>
              );
            })}
            {column.page < column.pageCount ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                isLoading={loadingMoreStage === column.stage}
                loadingLabel="Loading cards"
                onClick={() => onLoadMore(column.stage)}
              >
                Load more
              </Button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
