import { useEffect, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { getActivityLogs } from "@/services/api";
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

  useEffect(() => {
    getActivityLogs().then(setLogs);
  }, []);

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
        rowKey="id"
        search={{ enabled: true, placeholder: "Search action, description, user, or time" }}
      />
    </div>
  );
}
