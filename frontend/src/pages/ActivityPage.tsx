import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getActivityLogs } from "@/services/api";
import type { ActivityLog } from "@/types";

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

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <Badge variant="secondary">{log.actionType}</Badge>
                  </TableCell>
                  <TableCell className="min-w-72">{log.description}</TableCell>
                  <TableCell>{log.userId || "System"}</TableCell>
                  <TableCell>{new Date(log.createdAt).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
