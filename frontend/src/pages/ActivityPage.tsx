import { useCallback, useState } from "react";
import { DataTable, type DataTableColumn, type DataTableQueryContext, type DataTableQueryState } from "@/components/data-table";
import { LoadingInline } from "@/components/Loading";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { getActivityLogsPage } from "@/services/api";
import { isAbortError } from "@/services/httpClient";
import type { ActivityLog } from "@/types";

function formatChangeValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "empty";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function ActivityChanges({ log }: { log: ActivityLog }) {
  const changes = log.properties?.changes;
  const entries = changes ? Object.entries(changes) : [];

  if (entries.length === 0) {
    return <span className="text-muted-foreground">-</span>;
  }

  return (
    <div className="grid gap-1 text-xs">
      {entries.map(([field, change]) => (
        <div key={field} className="rounded-md bg-slate-50 px-2 py-1">
          <span className="font-medium text-slate-800">{field}</span>
          <span className="text-muted-foreground">: {formatChangeValue(change.old)} {"->"} </span>
          <span className="text-slate-900">{formatChangeValue(change.new)}</span>
        </div>
      ))}
    </div>
  );
}

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
    id: "changes",
    header: "Changes",
    cell: (log) => <ActivityChanges log={log} />,
    className: "min-w-72",
  },
  {
    id: "user",
    header: "User",
    cell: (log) => log.userName || "System",
    searchValue: (log) => log.userName || "System",
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
