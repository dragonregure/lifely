import { API_BASE_URL } from "@/config/env";
import type { ApiEnvelope, ApiPaginatedEnvelope, BackendDashboard, BackendReportingOverview } from "@/services/backendTypes";
import type { PaginatedResult, ServerDataTableParams } from "@/services/dataTableParams";
import { toQueryString } from "@/services/dataTableParams";
import { apiRequest } from "@/services/httpClient";
import { getAccessToken } from "@/services/tokenStorage";
import type { DashboardSummary, ReportRow, ReportingOverview } from "@/types";

export type ReportFilters = {
  dateFrom?: string;
  dateTo?: string;
  ownerId?: string;
  source?: string;
  stage?: string;
  status?: string;
  riskThresholdDays?: string;
};

function appendReportFilters(query: URLSearchParams, filters: ReportFilters = {}) {
  const mappedFilters = {
    date_from: filters.dateFrom,
    date_to: filters.dateTo,
    owner_id: filters.ownerId,
    source: filters.source,
    stage: filters.stage,
    status: filters.status,
    risk_threshold_days: filters.riskThresholdDays,
  };

  Object.entries(mappedFilters).forEach(([key, value]) => {
    if (value && value !== "all") {
      query.set(`filter[${key}]`, value);
    }
  });
}

function mapDashboardSummary(payload: BackendDashboard): DashboardSummary {
  return {
    newLeads: payload.new_leads,
    pendingTasks: payload.pending_tasks,
    leadValue: payload.lead_value,
    winRate: payload.win_rate,
    leadHealth: payload.lead_health,
    leadPerformance: payload.lead_by_stage.map((item) => ({
      label: item.stage,
      value: item.value,
    })),
    executive: payload.executive
      ? {
          totalActiveClients: payload.executive.total_active_clients,
          newClients: payload.executive.new_clients,
          totalVisits: payload.executive.total_visits,
          completedVisits: payload.executive.completed_visits,
          missedVisits: payload.executive.missed_visits,
          cancelledVisits: payload.executive.cancelled_visits,
          activeCaregivers: payload.executive.active_caregivers,
          caregiverUtilization: payload.executive.caregiver_utilization,
          revenue: payload.executive.revenue,
          outstandingPayments: payload.executive.outstanding_payments,
          pipelineValue: payload.executive.pipeline_value,
          clientSatisfactionScore: payload.executive.client_satisfaction_score,
        }
      : undefined,
    moduleDebt: payload.module_debt ?? [],
  };
}

export async function getDashboardSummary(filters: ReportFilters = {}): Promise<DashboardSummary> {
  const query = new URLSearchParams();
  appendReportFilters(query, filters);
  const response = await apiRequest<ApiEnvelope<BackendDashboard>>(`/dashboard${query.size > 0 ? `?${query.toString()}` : ""}`);

  return mapDashboardSummary(response.data);
}

export async function getReportingOverview(filters: ReportFilters = {}): Promise<ReportingOverview> {
  const query = new URLSearchParams();
  appendReportFilters(query, filters);
  const response = await apiRequest<ApiEnvelope<BackendReportingOverview>>(`/reports${query.size > 0 ? `?${query.toString()}` : ""}`);

  return {
    dashboard: mapDashboardSummary(response.data.dashboard),
    reports: response.data.reports,
    exportFormats: response.data.export_formats.map((format) => ({
      key: format.key,
      label: format.label,
      implemented: format.implemented,
    })),
  };
}

export async function getReportRows(
  reportKey: string,
  params?: ServerDataTableParams,
  filters: ReportFilters = {},
  options: Pick<RequestInit, "signal"> = {},
): Promise<PaginatedResult<ReportRow>> {
  const query = new URLSearchParams(toQueryString(params));
  appendReportFilters(query, filters);
  const response = await apiRequest<ApiPaginatedEnvelope<ReportRow>>(`/reports/${reportKey}/rows?${query.toString()}`, options);

  return {
    data: response.data,
    page: response.meta.current_page,
    pageSize: response.meta.per_page,
    pageCount: response.meta.last_page,
    total: response.meta.total,
  };
}

export async function exportReportCsv(reportKey: string, params?: ServerDataTableParams, filters: ReportFilters = {}) {
  const query = new URLSearchParams(toQueryString(params));
  query.set("format", "csv");
  appendReportFilters(query, filters);

  const headers = new Headers({ Accept: "text/csv" });
  const accessToken = getAccessToken();
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_BASE_URL}/reports/${reportKey}/export?${query.toString()}`, {
    headers,
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(error?.message ?? `Export failed with status ${response.status}`);
  }

  return response.blob();
}
