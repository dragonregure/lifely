<?php

namespace App\Services;

use App\Contracts\ContactRepositoryInterface;
use App\Contracts\LeadRepositoryInterface;
use App\Contracts\ReportingServiceInterface;
use App\Models\ActivityLog;
use App\Models\Contact;
use App\Models\Lead;
use App\Models\User;
use App\Support\DataTables\DataTableQuery;
use App\Support\DataTables\EloquentDataTable;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Database\Query\JoinClause;
use Illuminate\Pagination\LengthAwarePaginator as Paginator;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class ReportingService implements ReportingServiceInterface
{
    private const CLIENT_SUMMARY = 'client-summary';
    private const CLIENT_ACTIVITY = 'client-activity';
    private const HIGH_RISK_CLIENTS = 'high-risk-clients';
    private const WORKFORCE_PERFORMANCE = 'workforce-performance';
    private const OPERATIONS_SERVICE_VOLUME = 'operations-service-volume';
    private const FINANCIAL_REVENUE = 'financial-revenue';

    public function __construct(
        private readonly ContactRepositoryInterface $contacts,
        private readonly LeadRepositoryInterface $leads,
    ) {
    }

    public function dashboard(string $tenantId, array $filters = []): array
    {
        $contactsByStatus = $this->contacts->countByStatus($tenantId);
        $closedWonValue = $this->sumDistinctListingValues($this->closedWonLeadQuery($tenantId, $filters));
        $closedWonCount = $this->closedWonLeadQuery($tenantId, $filters)->count();
        $closedLostCount = $this->dateScopedLeadQuery($tenantId, $filters)
            ->where('leads.stage', Lead::STAGE_CLOSED_LOST)
            ->count();
        $closedTotal = $closedWonCount + $closedLostCount;
        $winRate = $closedTotal > 0 ? round(($closedWonCount / $closedTotal) * 100, 1) : 0;
        $openPipelineQuery = $this->dateScopedLeadQuery($tenantId, $filters)
            ->join('listings', function (JoinClause $join) use ($tenantId): void {
                $join->on('listings.id', '=', 'leads.listing_id')
                    ->where('listings.tenant_id', '=', $tenantId);
            })
            ->whereNotIn('leads.stage', Lead::closedStageValues());
        $openPipelineValue = $this->sumDistinctListingValues($openPipelineQuery);

        return [
            'new_leads' => (int) ($contactsByStatus['Active'] ?? 0),
            'pending_tasks' => $this->leads->pendingTaskCount($tenantId),
            'lead_value' => $this->leads->totalValue($tenantId),
            'win_rate' => $winRate,
            'lead_health' => $contactsByStatus
                ->map(fn ($total, $status) => ['label' => $status, 'value' => (int) $total])
                ->values()
                ->all(),
            'lead_by_stage' => $this->leads
                ->valueByStage($tenantId)
                ->map(fn ($row) => [
                    'stage' => Lead::stageLabel((int) $row->stage),
                    'deals' => (int) $row->deals,
                    'value' => (float) $row->value,
                ])
                ->values()
                ->all(),
            'executive' => [
                'total_active_clients' => $this->contactQuery($tenantId)->where('contacts.status', true)->count(),
                'new_clients' => $this->dateScopedContactQuery($tenantId, $filters)->count(),
                'total_visits' => null,
                'completed_visits' => null,
                'missed_visits' => null,
                'cancelled_visits' => null,
                'active_caregivers' => null,
                'caregiver_utilization' => null,
                'revenue' => (float) $closedWonValue,
                'outstanding_payments' => null,
                'pipeline_value' => (float) $openPipelineValue,
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
        return match ($reportKey) {
            self::CLIENT_SUMMARY => $this->clientSummary($tenantId, $dataTable, $filters),
            self::CLIENT_ACTIVITY => $this->clientActivity($tenantId, $dataTable, $filters),
            self::HIGH_RISK_CLIENTS => $this->highRiskClients($tenantId, $dataTable, $filters),
            self::WORKFORCE_PERFORMANCE => $this->workforcePerformance($tenantId, $dataTable, $filters),
            self::OPERATIONS_SERVICE_VOLUME => $this->operationsServiceVolume($tenantId, $dataTable, $filters),
            self::FINANCIAL_REVENUE => $this->financialRevenue($tenantId, $dataTable, $filters),
            default => throw new InvalidArgumentException('Unsupported report.'),
        };
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

    /**
     * @param  array<string, string>  $filters
     */
    private function clientSummary(string $tenantId, DataTableQuery $dataTable, array $filters): LengthAwarePaginator
    {
        $query = Contact::query()
            ->selectRaw('contacts.id, contacts.first_name, contacts.last_name, contacts.email, contacts.status, contacts.source, contacts.last_contacted_at, contacts.created_at, owners.name as owner_name')
            ->selectRaw('SUM(CASE WHEN leads.id IS NOT NULL AND leads.stage NOT IN (?, ?) THEN 1 ELSE 0 END) as open_leads', Lead::closedStageValues())
            ->selectRaw('SUM(CASE WHEN leads.stage = ? THEN 1 ELSE 0 END) as won_leads', [Lead::STAGE_CLOSED_WON])
            ->selectRaw('COALESCE(contact_pipeline_values.pipeline_value, 0) as pipeline_value')
            ->leftJoin('users as owners', function (JoinClause $join) use ($tenantId): void {
                $join->on('owners.id', '=', 'contacts.owner_id')
                    ->where('owners.tenant_id', '=', $tenantId);
            })
            ->leftJoin('leads', function (JoinClause $join) use ($tenantId): void {
                $join->on('leads.contact_id', '=', 'contacts.id')
                    ->where('leads.tenant_id', '=', $tenantId);
            })
            ->leftJoinSub($this->contactPipelineValueTotals($tenantId), 'contact_pipeline_values', function (JoinClause $join): void {
                $join->on('contact_pipeline_values.contact_id', '=', 'contacts.id');
            })
            ->where('contacts.tenant_id', $tenantId)
            ->groupBy('contacts.id', 'contacts.first_name', 'contacts.last_name', 'contacts.email', 'contacts.status', 'contacts.source', 'contacts.last_contacted_at', 'contacts.created_at', 'owners.name', 'contact_pipeline_values.pipeline_value');

        $this->applyDateRange($query, 'contacts.created_at', $filters);

        return $this->mapPaginator(EloquentDataTable::paginate(
            $query,
            $dataTable,
            ['contacts.first_name', 'contacts.last_name', 'contacts.email', 'owners.name'],
            ['status' => 'contacts.status', 'source' => 'contacts.source', 'owner_id' => 'contacts.owner_id'],
            [
                'client' => 'contacts.first_name',
                'status' => 'contacts.status',
                'owner' => 'owners.name',
                'source' => 'contacts.source',
                'open_leads' => 'open_leads',
                'won_leads' => 'won_leads',
                'pipeline_value' => 'pipeline_value',
                'last_contacted_at' => 'contacts.last_contacted_at',
                'created_at' => 'contacts.created_at',
            ],
            'contacts.created_at'
        ), fn ($row): array => [
            'id' => (string) $row->id,
            'client' => trim($row->first_name.' '.$row->last_name),
            'email' => (string) $row->email,
            'status' => (bool) $row->status ? 'Active' : 'Inactive',
            'owner' => $row->owner_name ?? 'Unassigned',
            'source' => Contact::sourceLabel($row->source === null ? null : (int) $row->source) ?? 'Unknown',
            'open_leads' => (int) $row->open_leads,
            'won_leads' => (int) $row->won_leads,
            'pipeline_value' => (float) $row->pipeline_value,
            'last_contacted_at' => $this->dateString($row->last_contacted_at),
            'created_at' => $this->dateString($row->created_at),
        ]);
    }

    /**
     * @param  array<string, string>  $filters
     */
    private function clientActivity(string $tenantId, DataTableQuery $dataTable, array $filters): LengthAwarePaginator
    {
        $query = ActivityLog::query()
            ->selectRaw('activity_logs.id, activity_logs.action_type, activity_logs.description, activity_logs.created_at, users.name as user_name')
            ->leftJoin('users', function (JoinClause $join) use ($tenantId): void {
                $join->on('users.id', '=', 'activity_logs.user_id')
                    ->where('users.tenant_id', '=', $tenantId);
            })
            ->where('activity_logs.tenant_id', $tenantId)
            ->where('activity_logs.action_type', 'like', 'contact.%');

        $this->applyDateRange($query, 'activity_logs.created_at', $filters);

        return $this->mapPaginator(EloquentDataTable::paginate(
            $query,
            $dataTable,
            ['activity_logs.action_type', 'activity_logs.description', 'users.name'],
            ['user_id' => 'activity_logs.user_id'],
            [
                'action' => 'activity_logs.action_type',
                'description' => 'activity_logs.description',
                'user' => 'users.name',
                'created_at' => 'activity_logs.created_at',
            ],
            'activity_logs.created_at'
        ), fn ($row): array => [
            'id' => (string) $row->id,
            'action' => (string) $row->action_type,
            'description' => (string) $row->description,
            'user' => $row->user_name ?? 'System',
            'created_at' => $this->dateTimeString($row->created_at),
        ]);
    }

    /**
     * @param  array<string, string>  $filters
     */
    private function highRiskClients(string $tenantId, DataTableQuery $dataTable, array $filters): LengthAwarePaginator
    {
        $thresholdDays = max(1, min(365, (int) ($filters['risk_threshold_days'] ?? 30)));
        $thresholdDate = now()->subDays($thresholdDays);

        $query = Contact::query()
            ->selectRaw('contacts.id, contacts.first_name, contacts.last_name, contacts.email, contacts.status, contacts.source, contacts.last_contacted_at, contacts.created_at, owners.name as owner_name')
            ->selectRaw('SUM(CASE WHEN leads.id IS NOT NULL AND leads.stage NOT IN (?, ?) THEN 1 ELSE 0 END) as open_leads', Lead::closedStageValues())
            ->leftJoin('users as owners', function (JoinClause $join) use ($tenantId): void {
                $join->on('owners.id', '=', 'contacts.owner_id')
                    ->where('owners.tenant_id', '=', $tenantId);
            })
            ->leftJoin('leads', function (JoinClause $join) use ($tenantId): void {
                $join->on('leads.contact_id', '=', 'contacts.id')
                    ->where('leads.tenant_id', '=', $tenantId);
            })
            ->where('contacts.tenant_id', $tenantId)
            ->where(function (Builder $query) use ($thresholdDate, $tenantId): void {
                $query->where('contacts.status', false)
                    ->orWhereNull('contacts.last_contacted_at')
                    ->orWhere('contacts.last_contacted_at', '<=', $thresholdDate)
                    ->orWhereExists(function (QueryBuilder $query) use ($tenantId): void {
                        $query->selectRaw('1')
                            ->from('leads as overdue_leads')
                            ->whereColumn('overdue_leads.contact_id', 'contacts.id')
                            ->where('overdue_leads.tenant_id', $tenantId)
                            ->whereNotIn('overdue_leads.stage', Lead::closedStageValues())
                            ->whereNotNull('overdue_leads.due_at')
                            ->where('overdue_leads.due_at', '<', now());
                    });
            })
            ->groupBy('contacts.id', 'contacts.first_name', 'contacts.last_name', 'contacts.email', 'contacts.status', 'contacts.source', 'contacts.last_contacted_at', 'contacts.created_at', 'owners.name');

        $this->applyDateRange($query, 'contacts.created_at', $filters);

        return $this->mapPaginator(EloquentDataTable::paginate(
            $query,
            $dataTable,
            ['contacts.first_name', 'contacts.last_name', 'contacts.email', 'owners.name'],
            ['status' => 'contacts.status', 'source' => 'contacts.source', 'owner_id' => 'contacts.owner_id'],
            [
                'client' => 'contacts.first_name',
                'owner' => 'owners.name',
                'status' => 'contacts.status',
                'open_leads' => 'open_leads',
                'last_contacted_at' => 'contacts.last_contacted_at',
                'created_at' => 'contacts.created_at',
            ],
            'contacts.last_contacted_at',
            'asc'
        ), fn ($row): array => [
            'id' => (string) $row->id,
            'client' => trim($row->first_name.' '.$row->last_name),
            'email' => (string) $row->email,
            'owner' => $row->owner_name ?? 'Unassigned',
            'status' => (bool) $row->status ? 'Active' : 'Inactive',
            'risk_reasons' => $this->riskReasons($row, $thresholdDate),
            'open_leads' => (int) $row->open_leads,
            'last_contacted_at' => $this->dateString($row->last_contacted_at),
        ]);
    }

    /**
     * @param  array<string, string>  $filters
     */
    private function workforcePerformance(string $tenantId, DataTableQuery $dataTable, array $filters): LengthAwarePaginator
    {
        $query = User::query()
            ->select('users.id', 'users.name', 'users.email', 'users.role', 'users.created_at')
            ->selectRaw('COALESCE(user_pipeline_values.pipeline_value, 0) as pipeline_value')
            ->leftJoinSub($this->userPipelineValueTotals($tenantId, $filters), 'user_pipeline_values', function (JoinClause $join): void {
                $join->on('user_pipeline_values.user_id', '=', 'users.id');
            })
            ->where('users.tenant_id', $tenantId);

        $this->addLeadCountSubquery($query, $tenantId, $filters, 'assigned_leads');
        $this->addLeadCountSubquery($query, $tenantId, $filters, 'active_leads', fn (QueryBuilder $query) => $query->where('leads.is_active', true));
        $this->addLeadCountSubquery($query, $tenantId, $filters, 'won_leads', fn (QueryBuilder $query) => $query->where('leads.stage', Lead::STAGE_CLOSED_WON));
        $this->addActivityCountSubquery($query, $tenantId, $filters);

        return $this->mapPaginator(EloquentDataTable::paginate(
            $query,
            $dataTable,
            ['users.name', 'users.email', 'users.role'],
            [],
            [
                'member' => 'users.name',
                'role' => 'users.role',
                'assigned_leads' => 'assigned_leads',
                'active_leads' => 'active_leads',
                'won_leads' => 'won_leads',
                'activity_count' => 'activity_count',
                'pipeline_value' => 'pipeline_value',
                'created_at' => 'users.created_at',
            ],
            'users.name',
            'asc'
        ), fn ($row): array => [
            'id' => (string) $row->id,
            'member' => (string) $row->name,
            'email' => (string) $row->email,
            'role' => (string) $row->role,
            'assigned_leads' => (int) $row->assigned_leads,
            'active_leads' => (int) $row->active_leads,
            'won_leads' => (int) $row->won_leads,
            'activity_count' => (int) $row->activity_count,
            'pipeline_value' => (float) $row->pipeline_value,
        ]);
    }

    /**
     * @param  array<string, string>  $filters
     */
    private function operationsServiceVolume(string $tenantId, DataTableQuery $dataTable, array $filters): LengthAwarePaginator
    {
        $listingValues = Lead::query()
            ->selectRaw('leads.stage, leads.source, listings.id as listing_id, count(*) as total_leads')
            ->selectRaw('SUM(CASE WHEN leads.is_active = 1 THEN 1 ELSE 0 END) as active_leads')
            ->selectRaw('SUM(CASE WHEN leads.stage = ? THEN 1 ELSE 0 END) as closed_won', [Lead::STAGE_CLOSED_WON])
            ->selectRaw('MAX(CASE WHEN leads.stage NOT IN (?, ?) THEN listings.price ELSE 0 END) as pipeline_value', Lead::closedStageValues())
            ->join('listings', function (JoinClause $join) use ($tenantId): void {
                $join->on('listings.id', '=', 'leads.listing_id')
                    ->where('listings.tenant_id', '=', $tenantId);
            })
            ->where('leads.tenant_id', $tenantId)
            ->groupBy('leads.stage', 'leads.source', 'listings.id');

        $this->applyLeadFilters($listingValues, $filters);

        $summary = DB::query()
            ->fromSub($listingValues, 'lead_volume_listing_values')
            ->selectRaw('stage, source, SUM(total_leads) as total_leads')
            ->selectRaw('SUM(active_leads) as active_leads')
            ->selectRaw('SUM(closed_won) as closed_won')
            ->selectRaw('SUM(pipeline_value) as pipeline_value')
            ->groupBy('stage', 'source');

        $sortColumns = [
            'stage' => 'stage',
            'source' => 'source',
            'total_leads' => 'total_leads',
            'active_leads' => 'active_leads',
            'closed_won' => 'closed_won',
            'pipeline_value' => 'pipeline_value',
        ];
        $hasRequestedSort = $dataTable->sort !== null && array_key_exists($dataTable->sort, $sortColumns);
        $sortColumn = $hasRequestedSort ? $sortColumns[$dataTable->sort] : 'total_leads';
        $sortDirection = $hasRequestedSort ? $dataTable->direction : 'desc';
        $total = DB::query()
            ->fromSub(clone $summary, 'operation_report_rows')
            ->count();
        $rows = (clone $summary)
            ->orderBy($sortColumn, $sortDirection)
            ->forPage($dataTable->page, $dataTable->perPage)
            ->get();

        return $this->mapPaginator(new Paginator($rows, $total, $dataTable->perPage, $dataTable->page), fn ($row): array => [
            'id' => ((string) $row->stage).'-'.((string) $row->source),
            'stage' => Lead::stageLabel((int) $row->stage),
            'source' => Lead::sourceLabel((int) $row->source),
            'total_leads' => (int) $row->total_leads,
            'active_leads' => (int) $row->active_leads,
            'closed_won' => (int) $row->closed_won,
            'pipeline_value' => (float) $row->pipeline_value,
        ]);
    }

    /**
     * @param  array<string, string>  $filters
     */
    private function financialRevenue(string $tenantId, DataTableQuery $dataTable, array $filters): LengthAwarePaginator
    {
        $query = Lead::query()
            ->selectRaw('leads.id, leads.stage, leads.created_at, listings.title as listing_title, listings.price, contacts.first_name, contacts.last_name, users.name as owner_name')
            ->join('listings', function (JoinClause $join) use ($tenantId): void {
                $join->on('listings.id', '=', 'leads.listing_id')
                    ->where('listings.tenant_id', '=', $tenantId);
            })
            ->join('contacts', function (JoinClause $join) use ($tenantId): void {
                $join->on('contacts.id', '=', 'leads.contact_id')
                    ->where('contacts.tenant_id', '=', $tenantId);
            })
            ->leftJoin('users', function (JoinClause $join) use ($tenantId): void {
                $join->on('users.id', '=', 'leads.user_id')
                    ->where('users.tenant_id', '=', $tenantId);
            })
            ->where('leads.tenant_id', $tenantId);

        $this->applyLeadFilters($query, $filters);

        return $this->mapPaginator(EloquentDataTable::paginate(
            $query,
            $dataTable,
            ['contacts.first_name', 'contacts.last_name', 'listings.title', 'users.name'],
            ['owner_id' => 'leads.user_id'],
            [
                'client' => 'contacts.first_name',
                'listing' => 'listings.title',
                'owner' => 'users.name',
                'stage' => 'leads.stage',
                'amount' => 'listings.price',
                'recognition_status' => 'leads.stage',
                'created_at' => 'leads.created_at',
            ],
            'leads.created_at'
        ), fn ($row): array => [
            'id' => (string) $row->id,
            'client' => trim($row->first_name.' '.$row->last_name),
            'listing' => (string) $row->listing_title,
            'owner' => $row->owner_name ?? 'Unassigned',
            'stage' => Lead::stageLabel((int) $row->stage),
            'amount' => (float) $row->price,
            'recognition_status' => (int) $row->stage === Lead::STAGE_CLOSED_WON ? 'Recognized Revenue' : 'Open Pipeline',
            'created_at' => $this->dateString($row->created_at),
        ]);
    }

    /**
     * @param  Builder<*>  $query
     * @param  array<string, string>  $filters
     */
    private function applyDateRange(Builder $query, string $column, array $filters): void
    {
        $from = $this->dateFrom($filters['date_from'] ?? null);
        $to = $this->dateTo($filters['date_to'] ?? null);

        if ($from !== null) {
            $query->where($column, '>=', $from);
        }

        if ($to !== null) {
            $query->where($column, '<=', $to);
        }
    }

    /**
     * @param  Builder<*>  $query
     * @param  array<string, string>  $filters
     */
    private function applyLeadFilters(Builder $query, array $filters): void
    {
        $this->applyDateRange($query, 'leads.created_at', $filters);

        $stage = Lead::stageFromInput($filters['stage'] ?? null);
        if ($stage !== null) {
            $query->where('leads.stage', $stage);
        }

        $source = Lead::sourceFromInput($filters['source'] ?? null);
        if ($source !== null) {
            $query->where('leads.source', $source);
        }

        if (($filters['owner_id'] ?? '') !== '') {
            $query->where('leads.user_id', $filters['owner_id']);
        }
    }

    /**
     * @return Builder<Contact>
     */
    private function contactQuery(string $tenantId): Builder
    {
        return Contact::query()
            ->where('contacts.tenant_id', $tenantId);
    }

    /**
     * @param  array<string, string>  $filters
     * @return Builder<Contact>
     */
    private function dateScopedContactQuery(string $tenantId, array $filters): Builder
    {
        $query = $this->contactQuery($tenantId);
        $this->applyDateRange($query, 'contacts.created_at', $filters);

        return $query;
    }

    /**
     * @param  array<string, string>  $filters
     * @return Builder<Lead>
     */
    private function dateScopedLeadQuery(string $tenantId, array $filters): Builder
    {
        $query = Lead::query()
            ->where('leads.tenant_id', $tenantId);

        $this->applyDateRange($query, 'leads.created_at', $filters);

        return $query;
    }

    /**
     * @param  array<string, string>  $filters
     * @return Builder<Lead>
     */
    private function closedWonLeadQuery(string $tenantId, array $filters): Builder
    {
        return $this->dateScopedLeadQuery($tenantId, $filters)
            ->join('listings', function (JoinClause $join) use ($tenantId): void {
                $join->on('listings.id', '=', 'leads.listing_id')
                    ->where('listings.tenant_id', '=', $tenantId);
            })
            ->where('leads.stage', Lead::STAGE_CLOSED_WON);
    }

    /**
     * @param  Builder<Lead>  $leadQuery
     */
    private function sumDistinctListingValues(Builder $leadQuery): float
    {
        $listingValues = (clone $leadQuery)
            ->selectRaw('listings.id as listing_id, MAX(listings.price) as value')
            ->groupBy('listings.id');

        return (float) DB::query()
            ->fromSub($listingValues, 'distinct_listing_values')
            ->sum('value');
    }

    private function contactPipelineValueTotals(string $tenantId): QueryBuilder
    {
        $listingValues = Lead::query()
            ->join('listings', function (JoinClause $join) use ($tenantId): void {
                $join->on('listings.id', '=', 'leads.listing_id')
                    ->where('listings.tenant_id', '=', $tenantId);
            })
            ->where('leads.tenant_id', $tenantId)
            ->whereNotIn('leads.stage', Lead::closedStageValues())
            ->selectRaw('leads.contact_id, listings.id as listing_id, MAX(listings.price) as listing_value')
            ->groupBy('leads.contact_id', 'listings.id');

        return DB::query()
            ->fromSub($listingValues, 'contact_pipeline_listing_values')
            ->selectRaw('contact_id, SUM(listing_value) as pipeline_value')
            ->groupBy('contact_id');
    }

    /**
     * @param  array<string, string>  $filters
     */
    private function userPipelineValueTotals(string $tenantId, array $filters): QueryBuilder
    {
        $listingValues = Lead::query()
            ->join('listings', function (JoinClause $join) use ($tenantId): void {
                $join->on('listings.id', '=', 'leads.listing_id')
                    ->where('listings.tenant_id', '=', $tenantId);
            })
            ->where('leads.tenant_id', $tenantId)
            ->whereNotIn('leads.stage', Lead::closedStageValues())
            ->selectRaw('leads.user_id, listings.id as listing_id, MAX(listings.price) as listing_value')
            ->groupBy('leads.user_id', 'listings.id');

        $this->applyDateRange($listingValues, 'leads.created_at', $filters);

        return DB::query()
            ->fromSub($listingValues, 'user_pipeline_listing_values')
            ->selectRaw('user_id, SUM(listing_value) as pipeline_value')
            ->groupBy('user_id');
    }

    /**
     * @param  Builder<User>  $query
     * @param  array<string, string>  $filters
     */
    private function addLeadCountSubquery(Builder $query, string $tenantId, array $filters, string $alias, ?callable $scope = null): void
    {
        $query->selectSub(function (QueryBuilder $subquery) use ($tenantId, $filters, $scope): void {
            $subquery->from('leads')
                ->selectRaw('count(*)')
                ->whereColumn('leads.user_id', 'users.id')
                ->where('leads.tenant_id', $tenantId);

            $this->applySubqueryDateRange($subquery, 'leads.created_at', $filters);

            if ($scope !== null) {
                $scope($subquery);
            }
        }, $alias);
    }

    /**
     * @param  Builder<User>  $query
     * @param  array<string, string>  $filters
     */
    private function addActivityCountSubquery(Builder $query, string $tenantId, array $filters): void
    {
        $query->selectSub(function (QueryBuilder $subquery) use ($tenantId, $filters): void {
            $subquery->from('activity_logs')
                ->selectRaw('count(*)')
                ->whereColumn('activity_logs.user_id', 'users.id')
                ->where('activity_logs.tenant_id', $tenantId);

            $this->applySubqueryDateRange($subquery, 'activity_logs.created_at', $filters);
        }, 'activity_count');
    }

    /**
     * @param  array<string, string>  $filters
     */
    private function applySubqueryDateRange(QueryBuilder $query, string $column, array $filters): void
    {
        $from = $this->dateFrom($filters['date_from'] ?? null);
        $to = $this->dateTo($filters['date_to'] ?? null);

        if ($from !== null) {
            $query->where($column, '>=', $from);
        }

        if ($to !== null) {
            $query->where($column, '<=', $to);
        }
    }

    private function mapPaginator(Paginator $paginator, callable $map): Paginator
    {
        $paginator->setCollection($paginator->getCollection()->map($map));

        return $paginator;
    }

    /**
     * @return array<int, string>
     */
    private function riskReasons(mixed $row, Carbon $thresholdDate): array
    {
        $reasons = [];

        if (! (bool) $row->status) {
            $reasons[] = 'Inactive client';
        }

        if ($row->last_contacted_at === null) {
            $reasons[] = 'No recorded contact';
        } elseif (Carbon::parse($row->last_contacted_at)->lte($thresholdDate)) {
            $reasons[] = 'No recent contact';
        }

        if ((int) $row->open_leads > 0) {
            $reasons[] = 'Open service pipeline';
        }

        return $reasons;
    }

    private function dateFrom(?string $value): ?Carbon
    {
        return $value === null || trim($value) === '' ? null : Carbon::parse($value)->startOfDay();
    }

    private function dateTo(?string $value): ?Carbon
    {
        return $value === null || trim($value) === '' ? null : Carbon::parse($value)->endOfDay();
    }

    private function dateString(mixed $value): ?string
    {
        return $value === null ? null : Carbon::parse($value)->toDateString();
    }

    private function dateTimeString(mixed $value): ?string
    {
        return $value === null ? null : Carbon::parse($value)->toISOString();
    }
}
