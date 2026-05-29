import { useCallback, useEffect, useState } from "react";
import { DataTable, type DataTableColumn, type DataTableQueryState } from "@/components/data-table";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { getActivityLogsPage } from "@/services/api";
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
  const [query, setQuery] = useState<DataTableQueryState>({
    page: 1,
    pageSize: 10,
    search: "",
    filters: {},
    sort: null,
  });
  const [totalRows, setTotalRows] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const handleQueryChange = useCallback((nextQuery: DataTableQueryState) => {
    setQuery(nextQuery);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    getActivityLogsPage(query)
      .then((result) => {
        setLogs(result.data);
        setTotalRows(result.total);
        setPageCount(result.pageCount);
      })
      .finally(() => setIsLoading(false));
  }, [query]);

  return (
    <div>
      <PageHeader
        eyebrow="Audit"
        title="Activity logs"
        description="System-wide tracking for accountability and historical context."
      />

      <DataTable
        columns={activityColumns}
        data={logs}
        emptyMessage="No activity logs found."
        initialPageSize={10}
        onQueryChange={handleQueryChange}
        rowKey="id"
        search={{ enabled: true, placeholder: "Search action, description, user, or time" }}
        serverPageCount={pageCount}
        serverSide
        serverTotalRows={totalRows}
        toolbarEnd={isLoading ? <span className="text-sm text-muted-foreground">Loading...</span> : null}
      />
    </div>
  );
}
