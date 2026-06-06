<?php

namespace App\Contracts;

use App\Models\Lead;
use App\Support\DataTables\DataTableQuery;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

interface LeadRepositoryInterface
{
    public function all(string $tenantId): Collection;

    public function paginate(string $tenantId, DataTableQuery $dataTable, array $includes = []): LengthAwarePaginator;

    public function find(string $tenantId, string $leadId): ?Lead;

    public function create(string $tenantId, array $data): Lead;

    public function update(string $tenantId, string $leadId, array $data): ?Lead;

    public function updateStage(string $tenantId, string $leadId, int $stage): ?Lead;

    public function pendingTaskCount(string $tenantId): int;

    public function totalValue(string $tenantId): float;

    public function valueByStage(string $tenantId): Collection;
}
