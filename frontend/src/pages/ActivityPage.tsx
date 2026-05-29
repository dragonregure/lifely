import { useCallback, useState } from "react";
import { DataTable, type DataTableColumn, type DataTableQueryContext, type DataTableQueryState } from "@/components/data-table";
import { LoadingInline } from "@/components/Loading";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { getActivityLogsPage } from "@/services/api";
import { isAbortError } from "@/services/httpClient";
import type { ActivityLog } from "@/types";

const activityColumns: DataTableColumn<ActivityLog>[] = [
  {
    id: "action",
    header: "Action",
    cell: (log) => <Badge variant="secondary">{log.actionType}</Badge>,
    searchValue: (log) => log.actionType,
  },
  {
    id: "description",
    header: "Description",
    accessor: "description",
    className: "min-w-72",
  },
  {
    id: "user",
    header: "User",
    cell: (log) => log.userId || "System",
    searchValue: (log) => log.userId || "System",
  },
  {
    id: "time",
    header: "Time",
    cell: (log) => new Date(log.createdAt).toLocaleString(),
    searchValue: (log) => new Date(log.createdAt).toLocaleString(),
  },
];

export function ActivityPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const handleQueryChange = useCallback((nextQuery: DataTableQueryState, context: DataTableQueryContext) => {
    setLoadError("");
    setIsLoading(true);

    getActivityLogsPage(nextQuery, { signal: context.signal })
      .then((result) => {
        if (context.signal.aborted) return;

        setLogs(result.data);
        setTotalRows(result.total);
        setPageCount(result.pageCount);
      })
      .catch((caught) => {
        if (!isAbortError(caught)) {
          setLoadError(caught instanceof Error ? caught.message : "Unable to load activity logs.");
        }
      })
      .finally(() => {
        if (!context.signal.aborted) {
          setIsLoading(false);
        }
      });
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Audit"
        title="Activity logs"
        description="System-wide tracking for accountability and historical context."
      />

      {loadError && <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{loadError}</div>}

      <DataTable
        columns={activityColumns}
        data={logs}
        emptyMessage="No activity logs found."
        initialPageSize={10}
        isLoading={isLoading}
        onQueryChange={handleQueryChange}
        rowKey="id"
        search={{ enabled: true, placeholder: "Search action, description, user, or time" }}
        serverPageCount={pageCount}
        serverSide
        serverTotalRows={totalRows}
        toolbarEnd={isLoading ? <LoadingInline label="Loading" /> : null}
      />
    </div>
  );
}
