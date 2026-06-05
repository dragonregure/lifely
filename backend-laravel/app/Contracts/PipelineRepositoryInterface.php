<?php

namespace App\Contracts;

use App\Models\Pipeline;
use App\Support\DataTables\DataTableQuery;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

interface PipelineRepositoryInterface
{
    public function all(string $tenantId): Collection;

    public function paginate(string $tenantId, DataTableQuery $dataTable): LengthAwarePaginator;

    public function find(string $tenantId, string $pipelineId): ?Pipeline;

    public function create(string $tenantId, array $data): Pipeline;

    public function update(string $tenantId, string $pipelineId, array $data): ?Pipeline;

    public function updateStage(string $tenantId, string $pipelineId, int $stage): ?Pipeline;

    public function pendingTaskCount(string $tenantId): int;

    public function totalValue(string $tenantId): float;

    public function valueByStage(string $tenantId): Collection;
}
