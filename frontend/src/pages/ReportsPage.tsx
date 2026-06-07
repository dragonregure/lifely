import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, Download, DollarSign, FileText, LineChart, TrendingUp, UsersRound } from "lucide-react";
import { DataTable, type DataTableColumn, type DataTableQueryContext, type DataTableQueryState } from "@/components/data-table";
import { LoadingInline, LoadingState } from "@/components/Loading";
import { MetricCard } from "@/components/MetricCard";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CONTACT_SOURCE_OPTIONS, CONTACT_STATUS_OPTIONS } from "@/pages/contacts/contactConstants";
import { LEAD_STAGES } from "@/pages/leads/leadConstants";
import { exportReportCsv, getMembers, getReportingOverview, getReportRows, type ReportFilters } from "@/services/api";
import { isAbortError } from "@/services/httpClient";
import { formatCurrency } from "@/lib/utils";
import type { ReportDefinition, ReportRow, ReportingOverview, User } from "@/types";

const DEFAULT_REPORT = "client-summary";

function formatMetric(value: number | null | undefined, formatter?: (value: number) => string) {
  if (value === null || value === undefined) return "N/A";

  return formatter ? formatter(value) : String(value);
}

function formatCellValue(value: ReportRow[string], type: string) {
  if (Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1">
        {value.length > 0 ? value.map((item) => <Badge key={item} variant="secondary">{item}</Badge>) : <span className="text-muted-foreground">-</span>}
      </div>
    );
  }

  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground">-</span>;
  }

  if (type === "currency") {
    return formatCurrency(Number(value));
  }

  if (type === "datetime") {
    return new Date(String(value)).toLocaleString();
  }

  if (type === "date") {
    return new Date(`${String(value)}T00:00:00`).toLocaleDateString();
  }

  return String(value);
}

function buildColumns(report: ReportDefinition | null): DataTableColumn<ReportRow>[] {
  return (report?.columns ?? []).map((column) => ({
    id: column.key,
    header: column.label,
    cell: (row) => formatCellValue(row[column.key], column.type),
    sortable: column.sortable,
    sortValue: (row) => {
      const value = row[column.key];
      return Array.isArray(value) ? value.join(" ") : value;
    },
    className: column.type === "currency" || column.type === "number" ? "whitespace-nowrap" : "min-w-36",
  }));
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

export function ReportsPage() {
  const [overview, setOverview] = useState<ReportingOverview | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [selectedReportKey, setSelectedReportKey] = useState(DEFAULT_REPORT);
  const [filters, setFilters] = useState<ReportFilters>({ riskThresholdDays: "30" });
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [lastQuery, setLastQuery] = useState<DataTableQueryState | undefined>();
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);
  const [isLoadingRows, setIsLoadingRows] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let isMounted = true;

    setIsLoadingOverview(true);
    getReportingOverview(filters)
      .then((nextOverview) => {
        if (!isMounted) return;
        setOverview(nextOverview);
        if (!nextOverview.reports.some((report) => report.key === selectedReportKey)) {
          setSelectedReportKey(nextOverview.reports[0]?.key ?? DEFAULT_REPORT);
        }
      })
      .catch((caught) => {
        if (isMounted) setLoadError(caught instanceof Error ? caught.message : "Unable to load reporting overview.");
      })
      .finally(() => {
        if (isMounted) setIsLoadingOverview(false);
      });

    return () => {
      isMounted = false;
    };
  }, [filters, selectedReportKey]);

  useEffect(() => {
    getMembers().then(setMembers).catch(() => setMembers([]));
  }, []);

  const selectedReport = useMemo(
    () => overview?.reports.find((report) => report.key === selectedReportKey) ?? overview?.reports[0] ?? null,
    [overview?.reports, selectedReportKey],
  );
  const reportColumns = useMemo(() => buildColumns(selectedReport), [selectedReport]);

  const handleQueryChange = useCallback((nextQuery: DataTableQueryState, context: DataTableQueryContext) => {
    if (!selectedReport) return;

    setLastQuery(nextQuery);
    setLoadError("");
    setIsLoadingRows(true);

    getReportRows(selectedReport.key, nextQuery, filters, { signal: context.signal })
      .then((result) => {
        if (context.signal.aborted) return;
        setRows(result.data);
        setTotalRows(result.total);
        setPageCount(result.pageCount);
      })
      .catch((caught) => {
        if (!isAbortError(caught)) {
          setLoadError(caught instanceof Error ? caught.message : "Unable to load report rows.");
        }
      })
      .finally(() => {
        if (!context.signal.aborted) {
          setIsLoadingRows(false);
        }
      });
  }, [filters, selectedReport]);

  const handleExport = async () => {
    if (!selectedReport) return;

    setIsExporting(true);
    setLoadError("");

    try {
      const blob = await exportReportCsv(selectedReport.key, lastQuery, filters);
      downloadBlob(blob, `${selectedReport.key}.csv`);
    } catch (caught) {
      setLoadError(caught instanceof Error ? caught.message : "Unable to export report.");
    } finally {
      setIsExporting(false);
    }
  };

  const dashboard = overview?.dashboard;
  const executive = dashboard?.executive;

  return (
    <div>
      <PageHeader
        eyebrow="Reporting"
        title="Operational reports"
        description="CRM-backed visibility for clients, team activity, operations, and revenue while clinical modules are still being built."
      />

      {loadError && <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{loadError}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Active clients" value={formatMetric(executive?.totalActiveClients)} note="Active CRM contacts" icon={UsersRound} isLoading={isLoadingOverview} />
        <MetricCard label="New clients" value={formatMetric(executive?.newClients)} note="Created in selected range" icon={TrendingUp} isLoading={isLoadingOverview} />
        <MetricCard label="Revenue" value={formatMetric(executive?.revenue, formatCurrency)} note="Closed-won listing value" icon={DollarSign} isLoading={isLoadingOverview} />
        <MetricCard label="Pipeline" value={formatMetric(executive?.pipelineValue, formatCurrency)} note="Open lead value" icon={LineChart} isLoading={isLoadingOverview} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Global filters</CardTitle>
            <CardDescription>Date, owner, source, stage, and status filters apply to available CRM-backed reports.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="report-date-from">From</Label>
              <Input id="report-date-from" type="date" value={filters.dateFrom ?? ""} onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="report-date-to">To</Label>
              <Input id="report-date-to" type="date" value={filters.dateTo ?? ""} onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="report-owner">Team member</Label>
              <Select id="report-owner" value={filters.ownerId ?? "all"} onChange={(event) => setFilters((current) => ({ ...current, ownerId: event.target.value }))}>
                <option value="all">All team members</option>
                {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="report-source">Source</Label>
              <Select id="report-source" value={filters.source ?? "all"} onChange={(event) => setFilters((current) => ({ ...current, source: event.target.value }))}>
                <option value="all">All sources</option>
                {CONTACT_SOURCE_OPTIONS.map((source) => <option key={source.value} value={source.value}>{source.label}</option>)}
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="report-stage">Stage</Label>
              <Select id="report-stage" value={filters.stage ?? "all"} onChange={(event) => setFilters((current) => ({ ...current, stage: event.target.value }))}>
                <option value="all">All stages</option>
                {LEAD_STAGES.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="report-status">Client status</Label>
              <Select id="report-status" value={filters.status ?? "all"} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
                {CONTACT_STATUS_OPTIONS.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Known gaps</CardTitle>
            <CardDescription>Requirements that need future modules are tracked as product debt.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {(dashboard?.moduleDebt ?? []).map((item) => (
              <div key={item} className="flex gap-3 rounded-md border bg-amber-50 p-3 text-sm text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedReportKey} onValueChange={setSelectedReportKey} className="mt-4">
        <div className="overflow-x-auto">
          <TabsList className="h-auto flex-wrap justify-start">
            {(overview?.reports ?? []).map((report) => (
              <TabsTrigger key={report.key} value={report.key}>{report.name.replace(" Report", "")}</TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value={selectedReportKey}>
          <Card>
            <CardHeader className="gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle>{selectedReport?.name ?? "Report"}</CardTitle>
                <CardDescription>{selectedReport?.description}</CardDescription>
              </div>
              <Button onClick={handleExport} isLoading={isExporting} loadingLabel="Exporting" disabled={!selectedReport || isLoadingRows}>
                <Download className="h-4 w-4" />
                CSV
              </Button>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="table">
                <TabsList>
                  <TabsTrigger value="table"><FileText className="mr-2 h-4 w-4" />Table</TabsTrigger>
                  <TabsTrigger value="chart"><LineChart className="mr-2 h-4 w-4" />Chart</TabsTrigger>
                </TabsList>
                <TabsContent value="table">
                  <DataTable
                    columns={reportColumns}
                    data={rows}
                    emptyMessage="No report rows found."
                    initialPageSize={10}
                    isLoading={isLoadingRows}
                    onQueryChange={handleQueryChange}
                    rowKey={(row, index) => {
                      const id = row.id;
                      return typeof id === "string" || typeof id === "number" ? id : index;
                    }}
                    search={{ enabled: true, placeholder: "Search this report" }}
                    serverPageCount={pageCount}
                    serverSide
                    serverTotalRows={totalRows}
                    toolbarEnd={isLoadingRows ? <LoadingInline label="Loading" /> : null}
                  />
                </TabsContent>
                <TabsContent value="chart">
                  <div className="h-80">
                    {isLoadingOverview ? (
                      <LoadingState className="h-full" label="Loading chart" />
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dashboard?.leadPerformance ?? []} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                          <XAxis dataKey="label" tickLine={false} axisLine={false} />
                          <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `$${Number(value) / 1000}k`} />
                          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                          <Bar dataKey="value" fill="#0EA5E9" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
