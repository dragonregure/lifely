import type { ApiEnvelope, BackendDashboard } from "@/services/backendTypes";
import { apiRequest } from "@/services/httpClient";
import type { DashboardSummary } from "@/types";

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const response = await apiRequest<ApiEnvelope<BackendDashboard>>("/dashboard");

  return {
    newLeads: response.data.new_leads,
    pendingTasks: response.data.pending_tasks,
    pipelineValue: response.data.pipeline_value,
    winRate: response.data.win_rate,
    leadHealth: response.data.lead_health,
    pipelinePerformance: response.data.pipeline_by_stage.map((item) => ({
      label: item.stage,
      value: item.value,
    })),
  };
}
