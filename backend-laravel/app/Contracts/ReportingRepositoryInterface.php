<?php

namespace App\Contracts;

use App\Support\DataTables\DataTableQuery;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

interface ReportingRepositoryInterface
{
    /**
     * @param  array<string, string>  $filters
     */
    public function closedWonLeadValue(string $tenantId, array $filters = []): float;

    /**
     * @param  array<string, string>  $filters
     */
    public function closedWonLeadCount(string $tenantId, array $filters = []): int;

    /**
     * @param  array<string, string>  $filters
     */
    public function closedLostLeadCount(string $tenantId, array $filters = []): int;

    /**
     * @param  array<string, string>  $filters
     */
    public function openPipelineValue(string $tenantId, array $filters = []): float;

    public function contactStatusCounts(string $tenantId): Collection;

    public function pendingTaskCount(string $tenantId): int;

    public function totalLeadValue(string $tenantId): float;

    public function leadValueByStage(string $tenantId): Collection;

    public function activeClientCount(string $tenantId): int;

    /**
     * @param  array<string, string>  $filters
     */
    public function newClientCount(string $tenantId, array $filters = []): int;

    /**
     * @param  array<string, string>  $filters
     */
    public function reportRows(string $tenantId, string $reportKey, DataTableQuery $dataTable, array $filters = []): LengthAwarePaginator;
}
