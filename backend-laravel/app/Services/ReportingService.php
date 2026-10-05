<?php

namespace App\Services;

use App\Contracts\ReportingRepositoryInterface;
use App\Contracts\ReportingServiceInterface;
use App\Models\Lead;
use App\Support\DataTables\DataTableQuery;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class ReportingService implements ReportingServiceInterface
{
    private const CLIENT_SUMMARY = 'client-summary';
    private const CLIENT_ACTIVITY = 'client-activity';
    private const HIGH_RISK_CLIENTS = 'high-risk-clients';
    private const WORKFORCE_PERFORMANCE = 'workforce-performance';
    private const OPERATIONS_SERVICE_VOLUME = 'operations-service-volume';
    private const FINANCIAL_REVENUE = 'financial-revenue';

    public function __construct(private readonly ReportingRepositoryInterface $reports)
    {
    }

    public function dashboard(string $tenantId, array $filters = []): array
    {
        $contactsByStatus = $this->reports->contactStatusCounts($tenantId);
        $closedWonCount = $this->reports->closedWonLeadCount($tenantId, $filters);
        $closedLostCount = $this->reports->closedLostLeadCount($tenantId, $filters);
        $closedTotal = $closedWonCount + $closedLostCount;
        $winRate = $closedTotal > 0 ? round(($closedWonCount / $closedTotal) * 100, 1) : 0;

        return [
            'new_leads' => (int) ($contactsByStatus['Active'] ?? 0),
            'pending_tasks' => $this->reports->pendingTaskCount($tenantId),
            'lead_value' => $this->reports->totalLeadValue($tenantId),
            'win_rate' => $winRate,
            'lead_health' => $contactsByStatus
                ->map(fn ($total, $status) => ['label' => $status, 'value' => (int) $total])
                ->values()
                ->all(),
            'lead_by_stage' => $this->reports->leadValueByStage($tenantId)
                ->map(fn ($row) => [
                    'stage' => Lead::stageLabel((int) $row->stage),
                    'deals' => (int) $row->deals,
                    'value' => (float) $row->value,
                ])
                ->values()
                ->all(),
            'executive' => [
                'total_active_clients' => $this->reports->activeClientCount($tenantId),
                'new_clients' => $this->reports->newClientCount($tenantId, $filters),
                'total_visits' => null,
                'completed_visits' => null,
                'missed_visits' => null,
                'cancelled_visits' => null,
                'active_caregivers' => null,
                'caregiver_utilization' => null,
                'revenue' => $this->reports->closedWonLeadValue($tenantId, $filters),
                'outstanding_payments' => null,
                'pipeline_value' => $this->reports->openPipelineValue($tenantId, $filters),
                'client_satisfaction_score' => null,
            ],
            'available_filters' => ['date_range', 'client', 'caregiver', 'service_type'],
            'future_filters' => ['branch', 'region'],
            'module_debt' => [
                'Visits, incidents, assessments, certifications, invoices, payments, satisfaction scores, branches, regions, saved report views, Excel export, and PDF export require backing modules before reporting can compute them truthfully.',
            ],
        ];
    }

    public function reportDefinitions(): array
    {
        return [
            $this->definition(self::CLIENT_SUMMARY, 'Client Reports', 'Client Summary Report', 'Client/contact status, ownership, lead count, won work, and open pipeline value.', [
                ['key' => 'client', 'label' => 'Client', 'type' => 'text', 'sortable' => true],
                ['key' => 'status', 'label' => 'Status', 'type' => 'text', 'sortable' => true],
                ['key' => 'owner', 'label' => 'Owner', 'type' => 'text', 'sortable' => true],
                ['key' => 'source', 'label' => 'Source', 'type' => 'text', 'sortable' => true],
                ['key' => 'open_leads', 'label' => 'Open Leads', 'type' => 'number', 'sortable' => true],
                ['key' => 'won_leads', 'label' => 'Won Leads', 'type' => 'number', 'sortable' => true],
                ['key' => 'pipeline_value', 'label' => 'Pipeline Value', 'type' => 'currency', 'sortable' => true],
                ['key' => 'last_contacted_at', 'label' => 'Last Contact', 'type' => 'date', 'sortable' => true],
            ]),
            $this->definition(self::CLIENT_ACTIVITY, 'Client Reports', 'Client Activity Report', 'Contact-related audit activity for the selected period.', [
                ['key' => 'action', 'label' => 'Action', 'type' => 'text', 'sortable' => true],
                ['key' => 'description', 'label' => 'Description', 'type' => 'text', 'sortable' => true],
                ['key' => 'user', 'label' => 'User', 'type' => 'text', 'sortable' => true],
                ['key' => 'created_at', 'label' => 'Time', 'type' => 'datetime', 'sortable' => true],
            ]),
            $this->definition(self::HIGH_RISK_CLIENTS, 'Client Reports', 'High-Risk Client Report', 'Clients with stale contact, inactive status, or overdue CRM tasks.', [
                ['key' => 'client', 'label' => 'Client', 'type' => 'text', 'sortable' => true],
                ['key' => 'owner', 'label' => 'Owner', 'type' => 'text', 'sortable' => true],
                ['key' => 'status', 'label' => 'Status', 'type' => 'text', 'sortable' => true],
                ['key' => 'risk_reasons', 'label' => 'Risk Reasons', 'type' => 'list', 'sortable' => false],
                ['key' => 'open_leads', 'label' => 'Open Leads', 'type' => 'number', 'sortable' => true],
                ['key' => 'last_contacted_at', 'label' => 'Last Contact', 'type' => 'date', 'sortable' => true],
            ]),
            $this->definition(self::WORKFORCE_PERFORMANCE, 'Caregiver Reports', 'Team Performance Report', 'Current team member lead ownership, won work, CRM activity, and pipeline value.', [
                ['key' => 'member', 'label' => 'Team Member', 'type' => 'text', 'sortable' => true],
                ['key' => 'role', 'label' => 'Role', 'type' => 'text', 'sortable' => true],
                ['key' => 'assigned_leads', 'label' => 'Assigned Leads', 'type' => 'number', 'sortable' => true],
                ['key' => 'active_leads', 'label' => 'Active Leads', 'type' => 'number', 'sortable' => true],
                ['key' => 'won_leads', 'label' => 'Won Leads', 'type' => 'number', 'sortable' => true],
                ['key' => 'activity_count', 'label' => 'Activity Count', 'type' => 'number', 'sortable' => true],
                ['key' => 'pipeline_value', 'label' => 'Pipeline Value', 'type' => 'currency', 'sortable' => true],
            ]),
            $this->definition(self::OPERATIONS_SERVICE_VOLUME, 'Operations Reports', 'Service Volume Report', 'Current lead volume by source and stage as the available operations proxy.', [
                ['key' => 'stage', 'label' => 'Stage', 'type' => 'text', 'sortable' => true],
                ['key' => 'source', 'label' => 'Source', 'type' => 'text', 'sortable' => true],
                ['key' => 'total_leads', 'label' => 'Total Leads', 'type' => 'number', 'sortable' => true],
                ['key' => 'active_leads', 'label' => 'Active Leads', 'type' => 'number', 'sortable' => true],
                ['key' => 'closed_won', 'label' => 'Closed Won', 'type' => 'number', 'sortable' => true],
                ['key' => 'pipeline_value', 'label' => 'Pipeline Value', 'type' => 'currency', 'sortable' => true],
            ]),
            $this->definition(self::FINANCIAL_REVENUE, 'Financial Reports', 'Revenue Report', 'Closed-won revenue and open pipeline values from leads and listings.', [
                ['key' => 'client', 'label' => 'Client', 'type' => 'text', 'sortable' => true],
                ['key' => 'listing', 'label' => 'Listing', 'type' => 'text', 'sortable' => true],
                ['key' => 'owner', 'label' => 'Owner', 'type' => 'text', 'sortable' => true],
                ['key' => 'stage', 'label' => 'Stage', 'type' => 'text', 'sortable' => true],
                ['key' => 'amount', 'label' => 'Amount', 'type' => 'currency', 'sortable' => true],
                ['key' => 'recognition_status', 'label' => 'Recognition', 'type' => 'text', 'sortable' => true],
                ['key' => 'created_at', 'label' => 'Created', 'type' => 'date', 'sortable' => true],
            ]),
        ];
    }

    public function reportDefinition(string $reportKey): ?array
    {
        return collect($this->reportDefinitions())->firstWhere('key', $reportKey);
    }

    public function reportRows(string $tenantId, string $reportKey, DataTableQuery $dataTable, array $filters = []): LengthAwarePaginator
    {
        return $this->reports->reportRows($tenantId, $reportKey, $dataTable, $filters);
    }

    public function exportRows(string $tenantId, string $reportKey, DataTableQuery $dataTable, array $filters = []): Collection
    {
        $exportQuery = new DataTableQuery(
            page: 1,
            perPage: 1000,
            search: $dataTable->search,
            sort: $dataTable->sort,
            direction: $dataTable->direction,
            filters: $dataTable->filters,
        );

        return collect($this->reportRows($tenantId, $reportKey, $exportQuery, $filters)->items());
    }

    /**
     * @param  array<int, array<string, mixed>>  $columns
     * @return array<string, mixed>
     */
    private function definition(string $key, string $category, string $name, string $description, array $columns): array
    {
        return compact('key', 'category', 'name', 'description') + [
            'implemented' => true,
            'columns' => $columns,
        ];
    }
}
