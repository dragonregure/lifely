import { useCallback, useMemo, useState } from "react";
import { Eye } from "lucide-react";
import { DataTable, type DataTableColumn, type DataTableFilter, type DataTableQueryContext, type DataTableQueryState } from "@/components/data-table";
import { DangerTriangleIcon } from "@/components/DangerTriangleIcon";
import { LoadingInline } from "@/components/Loading";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { getLeadDealsPage } from "@/services/api";
import { isAbortError } from "@/services/httpClient";
import { cn } from "@/lib/utils";
import type { ServerMultiSelectLoadParams, ServerMultiSelectLoadResult } from "@/components/ui/server-multi-select";
import type { LeadDeal } from "@/types";
import { LEAD_BOARD_INCLUDES, LEAD_SOURCES, LEAD_STAGES, LEAD_STATUS_OPTIONS } from "./leadConstants";
import type { AssigneeOption } from "./leadTypes";
import { contactName, hasLeadDealProblem, leadProblemLabel } from "./leadUtils";

type LeadAllTableProps = {
  refreshKey: number;
  loadAssigneeOptions: (params: ServerMultiSelectLoadParams) => Promise<ServerMultiSelectLoadResult<AssigneeOption>>;
  onOpenOverview: (deal: LeadDeal) => void;
};

export function LeadAllTable({ refreshKey, loadAssigneeOptions, onOpenOverview }: LeadAllTableProps) {
  const [deals, setDeals] = useState<LeadDeal[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const handleQueryChange = useCallback((nextQuery: DataTableQueryState, context: DataTableQueryContext) => {
    setLoadError("");
    setIsLoading(true);

    getLeadDealsPage(nextQuery, { include: LEAD_BOARD_INCLUDES, signal: context.signal })
      .then((result) => {
        if (context.signal.aborted) return;

        setDeals(result.data);
        setTotalRows(result.total);
        setPageCount(result.pageCount);
      })
      .catch((caught) => {
        if (!isAbortError(caught)) {
          setLoadError(caught instanceof Error ? caught.message : "Unable to load leads.");
        }
      })
      .finally(() => {
        if (!context.signal.aborted) {
          setIsLoading(false);
        }
      });
  }, []);

  const columns = useMemo<DataTableColumn<LeadDeal>[]>(
    () => [
      {
        id: "contact",
        header: "Contact",
        sortable: false,
        cell: (deal) => {
          const contact = deal.contact;

          return contact ? (
            <>
              <p className="font-medium">{contactName(contact)}</p>
              <p className="text-xs text-muted-foreground">{contact.email}</p>
            </>
          ) : (
            <span className="text-muted-foreground">Unassigned contact</span>
          );
        },
        searchValue: (deal) => (deal.contact ? contactName(deal.contact) : ""),
      },
      {
        id: "listing",
        header: "Listing",
        sortable: false,
        cell: (deal) => deal.listing?.title ?? <span className="text-muted-foreground">Unassigned listing</span>,
        searchValue: (deal) => deal.listing?.title ?? "",
      },
      {
        id: "assignee",
        header: "Assignee",
        sortable: false,
        cell: (deal) => deal.user?.name ?? <span className="text-muted-foreground">Unassigned</span>,
        searchValue: (deal) => deal.user?.name ?? "",
      },
      {
        id: "source",
        header: "Source",
        accessor: "source",
        sortable: false,
      },
      {
        id: "stage",
        header: "Stage",
        sortable: false,
        cell: (deal) => <StatusBadge status={deal.stage} />,
        searchValue: (deal) => deal.stage,
      },
      {
        id: "is_active",
        header: "Status",
        sortable: false,
        cell: (deal) => <StatusBadge status={deal.isActive ? "Active" : "Inactive"} />,
        searchValue: (deal) => (deal.isActive ? "Active" : "Inactive"),
      },
    ],
    [],
  );

  const filters = useMemo<DataTableFilter<LeadDeal>[]>(
    () => [
      {
        id: "user_id",
        label: "Assignee",
        type: "multi-select",
        defaultValue: "all",
        loadOptions: async (params) => {
          const result = await loadAssigneeOptions(params);

          return {
            options: result.options.map(({ value, label, description }) => ({ value, label, description })),
            hasMore: result.hasMore,
          };
        },
        predicate: (deal, selectedValue) => selectedValue.split(",").some((userId) => userId === deal.userId),
      },
      {
        id: "source",
        label: "Source",
        type: "multi-select",
        defaultValue: "all",
        options: LEAD_SOURCES.map((source) => ({ label: source, value: source })),
        predicate: (deal, selectedValue) => selectedValue.split(",").some((source) => source === deal.source),
      },
      {
        id: "stage",
        label: "Stage",
        defaultValue: "all",
        options: [{ label: "All stages", value: "all" }, ...LEAD_STAGES.map((stage) => ({ label: stage, value: stage }))],
        predicate: (deal, selectedValue) => selectedValue === "all" || deal.stage === selectedValue,
      },
      {
        id: "is_active",
        label: "Status",
        defaultValue: "all",
        options: [{ label: "All statuses", value: "all" }, ...LEAD_STATUS_OPTIONS],
        predicate: (deal, selectedValue) => selectedValue === "all" || (selectedValue === "active" ? deal.isActive : !deal.isActive),
      },
    ],
    [loadAssigneeOptions],
  );

  return (
    <>
      {loadError ? <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{loadError}</div> : null}

      <DataTable
        actions={{
          cell: (deal) => {
            const hasProblem = hasLeadDealProblem(deal);
            const problemLabel = leadProblemLabel(deal);

            return (
              <>
                {hasProblem ? (
                  <span className="inline-flex h-9 w-9 items-center justify-center" title={problemLabel}>
                    <DangerTriangleIcon title={problemLabel} />
                  </span>
                ) : null}
                <Button variant="outline" size="icon" title="View lead overview" aria-label="View lead overview" onClick={() => onOpenOverview(deal)}>
                  <Eye className="h-4 w-4" />
                </Button>
              </>
            );
          },
          wrapperClassName: "items-center",
        }}
        columns={columns}
        data={deals}
        emptyMessage={isLoading ? "Loading leads..." : "No leads found."}
        filters={filters}
        initialPageSize={10}
        initialSort={{ columnId: "created_at", direction: "desc" }}
        isLoading={isLoading}
        onQueryChange={handleQueryChange}
        refreshKey={refreshKey}
        rowClassName={(deal) => cn(hasLeadDealProblem(deal) && "bg-red-50/70 hover:bg-red-50")}
        rowKey="id"
        search={{ enabled: true, placeholder: "Search contact, listing, or assignee" }}
        serverPageCount={pageCount}
        serverSide
        serverTotalRows={totalRows}
        toolbarEnd={isLoading ? <LoadingInline label="Loading" /> : null}
      />
    </>
  );
}
